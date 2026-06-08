'use strict';

const crypto = require('crypto');
const CycleEngine = require('./CycleEngine');
const { extractFromText } = require('./PdfExtractor');

// ─────────────────────────────────────────────────────────────────────────────
// Códigos e mensagens de erro padronizados
// ─────────────────────────────────────────────────────────────────────────────

const IMPORT_ERRORS = {
  INVALID_FILE_TYPE:        'Arquivo rejeitado: apenas PDFs são aceitos.',
  FILE_TOO_LARGE:           'Arquivo muito grande: o limite é 10MB por PDF.',
  PDF_UNREADABLE:           'PDF ilegível, protegido ou corrompido. Verifique o arquivo.',
  MONTH_NOT_FOUND:          'Mês de referência não identificado no PDF. Verifique o formato do documento.',
  COMPETENCIA_REQUIRED:     'Competência (MM/YYYY) não informada. Selecione o mês e ano de referência no formulário.',
  COMPETENCIA_INVALID:      'Competência inválida. Use o formato MM/YYYY com data real (ex: 06/2026).',
  CICLOS_REQUIRED:          'Selecione ao menos 1 e no máximo 2 ciclos antes de importar.',
  CICLO_NOT_FOUND:          'Um ou mais ciclos selecionados não foram encontrados no banco de dados.',
  MILITARY_ID_NOT_FOUND:    'Matrícula / Nº de Ordem não localizado no PDF.',
  MILITARY_NOT_REGISTERED:  'Militar não cadastrado no sistema. Cadastre o efetivo antes de importar o requerimento.',
  MILITARY_INACTIVE:        'Militar inativo. Reative o cadastro para importar requerimentos.',
  NO_AVAILABILITY_FOUND:    'Nenhuma disponibilidade marcada no PDF. Verifique se o formato está correto.',
  CYCLE_NOT_FOUND_FOR_DATES:'Não existe ciclo cadastrado para as datas do requerimento. Crie os ciclos antes de importar.',
  CYCLE_CLOSED:             'Um ou mais ciclos alvo estão fechados. Os dias do fragmento foram ignorados.',
  DUPLICATE_FILE:           'Este PDF já foi importado anteriormente (hash SHA-256 duplicado).',
  DUPLICATE_REQUIREMENT:    'Requerimento existente para este ciclo será sobrescrito.',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/** Calcula SHA-256 de um buffer */
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Valida e parseia a competência "MM/YYYY" informada pelo formulário.
 * Retorna { refMonth, refYear } ou null se inválida.
 *
 * @param {string} competencia - "MM/YYYY"
 * @returns {{ refMonth: number, refYear: number }|null}
 */
function parseCompetencia(competencia) {
  if (!competencia || typeof competencia !== 'string') return null;

  const match = competencia.match(/^(0[1-9]|1[0-2])\/(20\d{2})$/);
  if (!match) return null;

  const refMonth = parseInt(match[1], 10);
  const refYear  = parseInt(match[2], 10);

  // Valida data real
  const testDate = new Date(refYear, refMonth - 1, 1);
  if (testDate.getFullYear() !== refYear || testDate.getMonth() !== refMonth - 1) return null;

  return { refMonth, refYear };
}

/**
 * Retorna quantos dias tem um determinado mês/ano.
 *
 * @param {number} year
 * @param {number} month - 1-based
 * @returns {number}
 */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Lookup do militar no banco de dados com múltiplos critérios.
 * Retorna { id_militar, posto_graduacao, nome_completo, nome_guerra, telefone, status_ativo }
 * ou null se não encontrado.
 */
async function findMilitar(db, numeroOrdem, cpf) {
  const clean = numeroOrdem.replace(/[.\- ]/g, '').toUpperCase();
  const searchNumeric = clean.replace(/^0+/, '');

  return db.get(
    `SELECT id_militar, posto_graduacao, nome_completo, nome_guerra, telefone, status_ativo
       FROM EFETIVO
      WHERE (
              TRIM(UPPER(numero_ordem)) = $1
           OR TRIM(UPPER(matricula))    = $1
           OR TRIM(UPPER(REPLACE(REPLACE(matricula,   '.', ''), '-', ''))) = $1
           OR TRIM(UPPER(REPLACE(REPLACE(numero_ordem,'.', ''), '-', ''))) = $1
           OR (numero_ordem ~ $3)
           OR (matricula    ~ $3)
           OR (rgpm         ~ $3)
           )
         OR ($2 <> '' AND cpf = $2)`,
    [clean, cpf || '', `^0*${searchNumeric}$`]
  );
}

/**
 * Cria ou atualiza um REQUERIMENTO e insere os turnos do fragmento (idempotente).
 * A chave de data (dateKey) já deve estar no formato ISO "YYYY-MM-DD".
 *
 * @param {object} db
 * @param {number} idMilitar
 * @param {number} idCiclo
 * @param {object} diasMap      - { "YYYY-MM-DD": [{ shift, motorista }], ... }
 * @param {string|null} numeroReq
 * @returns {{ id_requerimento: number, dias_inseridos: number, sobrescreveu: boolean }}
 */
async function upsertRequerimentoFragmento(db, idMilitar, idCiclo, diasMap, numeroReq) {
  const existing = await db.get(
    'SELECT id_requerimento FROM REQUERIMENTOS WHERE id_militar = $1 AND id_ciclo = $2',
    [idMilitar, idCiclo]
  );

  let idReq;
  const sobrescreveu = !!existing;

  if (existing) {
    idReq = existing.id_requerimento;
    // Remove apenas os dias que serão reinseridos (cirúrgico)
    const diasDatas = Object.keys(diasMap);
    if (diasDatas.length > 0) {
      await db.query(
        `DELETE FROM DISPONIBILIDADE_REQUERIMENTO
          WHERE id_requerimento = $1 AND dia_mes = ANY($2::date[])`,
        [idReq, diasDatas]
      );
    }
  } else {
    const r = await db.run(
      'INSERT INTO REQUERIMENTOS (id_militar, id_ciclo, numero_requerimento) VALUES ($1, $2, $3)',
      [idMilitar, idCiclo, numeroReq || null]
    );
    idReq = r.lastID;
  }

  let diasInseridos = 0;
  for (const [diaStr, shifts] of Object.entries(diasMap)) {
    for (const shiftObj of shifts) {
      const turno = shiftObj.shift || shiftObj;
      const isMot = !!shiftObj.motorista;
      await db.run(
        `INSERT INTO DISPONIBILIDADE_REQUERIMENTO
           (id_requerimento, dia_mes, horario_turno, marcado_disponivel, ativo, motorista)
         VALUES ($1, $2, $3, TRUE, TRUE, $4)`,
        [idReq, diaStr, turno, isMot]
      );
      diasInseridos++;
    }
  }

  return { id_requerimento: idReq, dias_inseridos: diasInseridos, sobrescreveu };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fragmentação explícita com ciclos do formulário
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fragmenta o mapa de disponibilidade nos ciclos explicitamente informados pelo usuário.
 *
 * - 1 ciclo: todos os dias válidos → ciclosIds[0]
 * - 2 ciclos: usa CycleEngine (diaInicio) para separar anterior/corrente
 *             dias < diaInicio → ciclosIds[0], dias >= diaInicio → ciclosIds[1]
 *
 * As datas resultantes são construídas com a competência do formulário (não do PDF).
 *
 * @param {object} availability  - { "1": [shifts], "16": [shifts], ... } (chaves = dia DD)
 * @param {number} refYear
 * @param {number} refMonth
 * @param {number[]} ciclosIds   - [id] ou [idAnterior, idCorrente]
 * @param {CycleEngine} engine
 * @returns {{
 *   fragmentos: Array<{ idCiclo: number, diasMap: Object }>,
 *   ignorados: Array<number>,
 *   warnings: string[]
 * }}
 */
function fragmentarComCiclosExplicitos(availability, refYear, refMonth, ciclosIds, engine) {
  const pad = (n) => String(n).padStart(2, '0');
  const maxDias = daysInMonth(refYear, refMonth);

  // Mapas por índice de ciclo
  const mapas = ciclosIds.map(() => ({}));
  const ignorados = [];
  const warnings  = [];

  for (const [diaStr, shifts] of Object.entries(availability)) {
    const dia = parseInt(diaStr, 10);

    if (!dia || dia < 1 || dia > 31) {
      ignorados.push(dia);
      continue;
    }

    // Valida dia vs. competência selecionada
    if (dia > maxDias) {
      ignorados.push(dia);
      warnings.push(
        `Dia ${dia} não existe em ${pad(refMonth)}/${refYear} (mês tem ${maxDias} dias). Dia ignorado.`
      );
      continue;
    }

    const dateKey = `${refYear}-${pad(refMonth)}-${pad(dia)}`;

    if (ciclosIds.length === 1) {
      // Caso simples: 1 ciclo recebe tudo
      mapas[0][dateKey] = shifts;
    } else {
      // 2 ciclos: fragmenta pelo diaInicio do engine
      const segmento = engine.getSegmento(dia); // 'anterior' ou 'corrente'
      const idx = segmento === 'anterior' ? 0 : 1;
      mapas[idx][dateKey] = shifts;
    }
  }

  const fragmentos = ciclosIds.map((idCiclo, i) => ({
    idCiclo,
    diasMap: mapas[i],
  })).filter(f => Object.keys(f.diasMap).length > 0);

  return { fragmentos, ignorados, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processa um arquivo PDF de requerimento SVR através de 7 estágios.
 *
 * @param {object} params
 * @param {Buffer}      params.buffer        - Conteúdo binário do PDF
 * @param {string}      params.originalname  - Nome original do arquivo
 * @param {string}      params.mimetype      - MIME type declarado pelo cliente
 * @param {number}      params.size          - Tamanho em bytes
 * @param {object}      params.db            - Instância do db
 * @param {object}      params.pdfParser     - Instância do pdf-parse
 * @param {number|null} params.idUsuario     - ID do usuário que está importando
 * @param {boolean}     params.dryRun        - Se true, não persiste (preview mode)
 * @param {number[]}    params.ciclosIds     - IDs dos ciclos selecionados (1 ou 2)
 * @param {string}      params.competencia   - Competência "MM/YYYY" do formulário
 *
 * @returns {Promise<{
 *   success: boolean,
 *   preview?: object,
 *   numero_ordem?: string,
 *   name?: string,
 *   ciclos_afetados?: number[],
 *   competencia_usada?: string,
 *   warnings?: string[],
 *   error?: string,
 *   error_code?: string,
 *   stage?: string,
 * }>}
 */
async function processFile({
  buffer,
  originalname,
  mimetype,
  size,
  db,
  pdfParser,
  idUsuario = null,
  dryRun    = false,
  ciclosIds = [],
  competencia = '',
}) {
  const warnings = [];
  let idMilitar    = null;
  let idReqPrimary = null;

  // ── Estágio 1: Validação do arquivo ────────────────────────────────────
  if (!mimetype || !mimetype.includes('pdf')) {
    return _fail('INVALID_FILE_TYPE', 'stage_1_validation');
  }
  if (size > MAX_FILE_SIZE) {
    return _fail('FILE_TOO_LARGE', 'stage_1_validation');
  }

  // ── Estágio 1.5: Validação dos parâmetros do formulário ─────────────────
  if (!Array.isArray(ciclosIds) || ciclosIds.length < 1 || ciclosIds.length > 2) {
    return _fail('CICLOS_REQUIRED', 'stage_1_validation');
  }

  const parsedComp = parseCompetencia(competencia);
  if (!parsedComp) {
    return _fail('COMPETENCIA_INVALID', 'stage_1_validation');
  }
  const { refMonth, refYear } = parsedComp;

  // Hash SHA-256 para deduplicação
  const fileHash = sha256(buffer);

  // ── Estágio 2: Extração do texto PDF ────────────────────────────────────
  let pdfText;
  try {
    const parsed = await pdfParser(buffer);
    pdfText = parsed.text;
    if (!pdfText || pdfText.trim().length < 20) {
      return _fail('PDF_UNREADABLE', 'stage_2_extraction');
    }
  } catch {
    return _fail('PDF_UNREADABLE', 'stage_2_extraction');
  }

  // ── Estágio 3: Parsing dos metadados ─────────────────────────────────────
  // Nota: month_key extraído do PDF é IGNORADO — a competência vem do formulário.
  const extracted = extractFromText(pdfText);
  const { numero_requerimento, numero_ordem, cpf, motorist, availability } = extracted;

  if (!numero_ordem) {
    return _fail('MILITARY_ID_NOT_FOUND', 'stage_3_metadata');
  }

  // ── Estágio 4: Parsing das disponibilidades ──────────────────────────────
  if (Object.keys(availability).length === 0) {
    warnings.push(IMPORT_ERRORS.NO_AVAILABILITY_FOUND);
  }

  // ── Estágio 5: Validações de negócio ────────────────────────────────────
  const militar = await findMilitar(db, numero_ordem, cpf);
  if (!militar) {
    return _fail('MILITARY_NOT_REGISTERED', 'stage_5_validation', { numero_ordem });
  }
  if (!militar.status_ativo) {
    return _fail('MILITARY_INACTIVE', 'stage_5_validation', { numero_ordem, name: militar.nome_guerra });
  }
  idMilitar = militar.id_militar;

  // Verifica duplicata pelo hash do arquivo
  if (!dryRun) {
    const dup = await db.get(
      `SELECT id_log FROM IMPORTACAO_LOG WHERE arquivo_hash = $1 AND id_militar = $2`,
      [fileHash, idMilitar]
    );
    if (dup) warnings.push(IMPORT_ERRORS.DUPLICATE_FILE);
  }

  // Verifica ciclos no banco
  const ciclosNoBanco = [];
  for (const idCiclo of ciclosIds) {
    const ciclo = await db.get(
      'SELECT id_ciclo, status FROM CICLOS WHERE id_ciclo = $1',
      [idCiclo]
    );
    if (!ciclo) {
      return _fail('CICLO_NOT_FOUND', 'stage_5_validation', { numero_ordem });
    }
    ciclosNoBanco.push(ciclo);
  }

  // ── Estágio 6: Fragmentação com competência do formulário ────────────────
  const engine = await CycleEngine.fromDatabase(db);

  const { fragmentos, ignorados, warnings: fragWarnings } = fragmentarComCiclosExplicitos(
    availability,
    refYear,
    refMonth,
    ciclosIds,
    engine
  );

  // Adiciona warnings de dias ignorados
  warnings.push(...fragWarnings);
  if (ignorados.length > 0 && fragWarnings.length === 0) {
    warnings.push(`Dias ignorados (fora do intervalo 1-31): ${ignorados.join(', ')}`);
  }

  // Preview mode — retorna os dados sem persistir
  if (dryRun) {
    return {
      success: true,
      preview: {
        numero_requerimento,
        competencia_usada: competencia,
        numero_ordem,
        name: militar.nome_completo || militar.nome_guerra,
        rank: militar.posto_graduacao,
        motorist,
        fragmentos: fragmentos.map(f => ({
          idCiclo: f.idCiclo,
          dias: Object.keys(f.diasMap),
        })),
        ignorados,
        warnings,
      },
    };
  }

  const ciclosAfetados = [];

  // Processa cada fragmento no ciclo correspondente
  for (const fragmento of fragmentos) {
    const { idCiclo, diasMap } = fragmento;

    // Usa coerção numérica para evitar falha por tipo (string vs number) vindo do banco
    const cicloInfo = ciclosNoBanco.find(c => Number(c.id_ciclo) === Number(idCiclo));

    if (!cicloInfo) {
      warnings.push(`${IMPORT_ERRORS.CICLO_NOT_FOUND} (id: ${idCiclo})`);
      continue;
    }

    // Ciclo FECHADO: emite aviso mas prossegue (usuário selecionou explicitamente)
    if (cicloInfo.status === 'Fechado') {
      warnings.push(`Atenção: ciclo ${idCiclo} está Fechado. Dados importados mesmo assim conforme seleção explícita.`);
    }

    const r = await upsertRequerimentoFragmento(db, idMilitar, idCiclo, diasMap, numero_requerimento);

    if (r.sobrescreveu) {
      warnings.push(`${IMPORT_ERRORS.DUPLICATE_REQUIREMENT} (ciclo ${idCiclo})`);
    }

    ciclosAfetados.push(idCiclo);
    if (!idReqPrimary) idReqPrimary = r.id_requerimento;
  }

  if (ciclosAfetados.length === 0 && Object.keys(availability).length > 0) {
    return _fail('CYCLE_NOT_FOUND_FOR_DATES', 'stage_6_persistence', { warnings });
  }

  // Atualiza flag de motorista no efetivo
  if (motorist === 'Sim') {
    await db.run('UPDATE EFETIVO SET motorista = $1 WHERE id_militar = $2', ['Sim', idMilitar]);
  }

  // ── Estágio 7: Auditoria ─────────────────────────────────────────────────
  await db.run(
    `INSERT INTO IMPORTACAO_LOG
       (id_usuario, arquivo_nome, arquivo_hash, status, id_militar, id_requerimento, ciclos_afetados, detalhes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      idUsuario || null,
      originalname,
      fileHash,
      warnings.length > 0 ? 'parcial' : 'sucesso',
      idMilitar,
      idReqPrimary || null,
      ciclosAfetados,
      JSON.stringify({ warnings, competencia_usada: competencia, numero_requerimento }),
    ]
  );

  return {
    success:           true,
    numero_ordem,
    name:              militar.nome_completo || militar.nome_guerra,
    ciclos_afetados:   ciclosAfetados,
    competencia_usada: competencia,
    warnings:          warnings.length > 0 ? warnings : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper de retorno de erro padronizado
// ─────────────────────────────────────────────────────────────────────────────

function _fail(code, stage, extra = {}) {
  return {
    success:    false,
    error_code: code,
    error:      IMPORT_ERRORS[code] || code,
    stage,
    ...extra,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = { processFile, IMPORT_ERRORS, upsertRequerimentoFragmento };
