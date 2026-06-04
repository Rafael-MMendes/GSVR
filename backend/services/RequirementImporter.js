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
  MILITARY_ID_NOT_FOUND:    'Matrícula / Nº de Ordem não localizado no PDF.',
  MILITARY_NOT_REGISTERED:  'Militar não cadastrado no sistema. Cadastre o efetivo antes de importar o requerimento.',
  MILITARY_INACTIVE:        'Militar inativo. Reative o cadastro para importar requerimentos.',
  NO_AVAILABILITY_FOUND:    'Nenhuma disponibilidade marcada no PDF. Verifique se o formato está correto.',
  CYCLE_NOT_FOUND_FOR_DATES:'Não existe ciclo cadastrado para as datas do requerimento. Crie os ciclos antes de importar.',
  CYCLE_CLOSED:             'Um ou mais ciclos alvo estão fechados. Os dias do fragmento foram ignorados.',
  DUPLICATE_FILE:           'Este PDF já foi importado anteriormente (hash SHA-256 duplicado).',
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
 *
 * @param {object} db
 * @param {number} idMilitar
 * @param {number} idCiclo
 * @param {object} diasMap      - { "01": [{ shift, motorista }], ... }
 * @param {string|null} numeroReq
 * @param {string|null} mesRef  - "YYYY-MM"
 * @returns {{ id_requerimento: number, dias_inseridos: number }}
 */
async function upsertRequerimentoFragmento(db, idMilitar, idCiclo, diasMap, numeroReq) {
  const existing = await db.get(
    'SELECT id_requerimento FROM REQUERIMENTOS WHERE id_militar = $1 AND id_ciclo = $2',
    [idMilitar, idCiclo]
  );

  let idReq;

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
      const turno  = shiftObj.shift  || shiftObj;
      const isMot  = !!shiftObj.motorista;
      await db.run(
        `INSERT INTO DISPONIBILIDADE_REQUERIMENTO
           (id_requerimento, dia_mes, horario_turno, marcado_disponivel, ativo, motorista)
         VALUES ($1, $2, $3, TRUE, TRUE, $4)`,
        [idReq, diaStr, turno, isMot]
      );
      diasInseridos++;
    }
  }

  return { id_requerimento: idReq, dias_inseridos: diasInseridos };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processa um arquivo PDF de requerimento SVR através de 7 estágios.
 *
 * @param {object} params
 * @param {Buffer}  params.buffer        - Conteúdo binário do PDF
 * @param {string}  params.originalname  - Nome original do arquivo
 * @param {string}  params.mimetype      - MIME type declarado pelo cliente
 * @param {number}  params.size          - Tamanho em bytes
 * @param {object}  params.db            - Instância do db
 * @param {object}  params.pdfParser     - Instância do pdf-parse
 * @param {number|null} params.idUsuario - ID do usuário que está importando
 * @param {boolean} params.dryRun        - Se true, não persiste (preview mode)
 *
 * @returns {Promise<{
 *   success: boolean,
 *   preview?: object,      // em dryRun=true
 *   numero_ordem?: string,
 *   name?: string,
 *   ciclos_afetados?: number[],
 *   warnings?: string[],
 *   error?: string,
 *   error_code?: string,
 *   stage?: string,
 * }>}
 */
async function processFile({ buffer, originalname, mimetype, size, db, pdfParser, idUsuario = null, dryRun = false }) {
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

  // ── Estágio 3: Parsing dos metadados ────────────────────────────────────
  const extracted = extractFromText(pdfText);
  const { numero_requerimento, month_key, numero_ordem, cpf, motorist, availability } = extracted;

  if (!numero_ordem) {
    return _fail('MILITARY_ID_NOT_FOUND', 'stage_3_metadata');
  }
  if (!month_key) {
    return _fail('MONTH_NOT_FOUND', 'stage_3_metadata');
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

  // Verifica duplicata pelo hash
  if (!dryRun) {
    const dup = await db.get(
      `SELECT id_log FROM IMPORTACAO_LOG WHERE arquivo_hash = $1 AND id_militar = $2`,
      [fileHash, idMilitar]
    );
    if (dup) warnings.push(IMPORT_ERRORS.DUPLICATE_FILE);
  }

  // ── Estágio 6: Fragmentação e persistência ──────────────────────────────
  const [anoStr, mesStr] = month_key.split('-');
  const refYear  = parseInt(anoStr, 10);
  const refMonth = parseInt(mesStr, 10);

  const engine = await CycleEngine.fromDatabase(db);
  const { anterior, corrente, ignorados } = engine.fragmentAvailabilityByCycle(availability, refYear, refMonth);

  if (ignorados.length > 0) {
    warnings.push(`Dias ignorados (inválidos para o mês ${month_key}): ${ignorados.join(', ')}`);
  }

  // Preview mode — retorna os dados sem persistir
  if (dryRun) {
    return {
      success: true,
      preview: {
        numero_requerimento,
        month_key,
        numero_ordem,
        name: militar.nome_completo || militar.nome_guerra,
        rank: militar.posto_graduacao,
        motorist,
        fragmento_anterior: { dias: Object.keys(anterior), ciclo: engine.getCycleBoundsAnterior(refYear, refMonth) },
        fragmento_corrente: { dias: Object.keys(corrente), ciclo: engine.getCycleBoundsCorrente(refYear, refMonth) },
        ignorados,
        warnings,
      },
    };
  }

  const ciclosAfetados = [];

  // Processa fragmento ANTERIOR (dias 1 a diaInicio-1)
  if (Object.keys(anterior).length > 0) {
    const bounds = engine.getCycleBoundsAnterior(refYear, refMonth);
    const cicloAnt = await db.get(
      `SELECT id_ciclo, status FROM CICLOS WHERE $1::date BETWEEN data_inicio AND data_fim LIMIT 1`,
      [bounds.inicio]
    );

    if (!cicloAnt) {
      warnings.push(`${IMPORT_ERRORS.CYCLE_NOT_FOUND_FOR_DATES} (período anterior: ${bounds.inicio}–${bounds.fim})`);
    } else if (cicloAnt.status === 'Fechado') {
      warnings.push(`${IMPORT_ERRORS.CYCLE_CLOSED} (ciclo ${cicloAnt.id_ciclo} — período anterior)`);
    } else {
      const r = await upsertRequerimentoFragmento(db, idMilitar, cicloAnt.id_ciclo, anterior, numero_requerimento);
      ciclosAfetados.push(cicloAnt.id_ciclo);
      if (!idReqPrimary) idReqPrimary = r.id_requerimento;
    }
  }

  // Processa fragmento CORRENTE (dias diaInicio a fim do mês)
  if (Object.keys(corrente).length > 0) {
    const bounds = engine.getCycleBoundsCorrente(refYear, refMonth);
    const cicloAtual = await db.get(
      `SELECT id_ciclo, status FROM CICLOS WHERE $1::date BETWEEN data_inicio AND data_fim LIMIT 1`,
      [bounds.inicio]
    );

    if (!cicloAtual) {
      warnings.push(`${IMPORT_ERRORS.CYCLE_NOT_FOUND_FOR_DATES} (período corrente: ${bounds.inicio}–${bounds.fim})`);
    } else if (cicloAtual.status === 'Fechado') {
      warnings.push(`${IMPORT_ERRORS.CYCLE_CLOSED} (ciclo ${cicloAtual.id_ciclo} — período corrente)`);
    } else {
      const r = await upsertRequerimentoFragmento(db, idMilitar, cicloAtual.id_ciclo, corrente, numero_requerimento);
      ciclosAfetados.push(cicloAtual.id_ciclo);
      if (!idReqPrimary) idReqPrimary = r.id_requerimento;
    }
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
      JSON.stringify({ warnings, month_key, numero_requerimento }),
    ]
  );

  return {
    success: true,
    numero_ordem,
    name: militar.nome_completo || militar.nome_guerra,
    ciclos_afetados: ciclosAfetados,
    warnings: warnings.length > 0 ? warnings : undefined,
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
