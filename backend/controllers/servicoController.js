'use strict';
const XLSX = require('xlsx');
const db = require('../db');
const { formatDateToISO, isFeriado, auditLog, normalizeRank, normalizeKey, padCpf } = require('../utils/helpers');
const { recalculateMetas } = require('../services/ScaleOptimizationService');

const servicoController = {};

/**
 * GET /servicos
 * Suporta paginação opcional via ?page=1&limit=50 (retrocompatível: sem page/limit retorna array direto)
 */
servicoController.getServicos = async (req, res, next) => {
  try {
    const { ciclo_id, militar_id, data_inicio, data_fim, page, limit } = req.query;
    const baseFrom = `
      FROM SERVICOS_EXECUTADOS se
      JOIN EFETIVO e ON se.id_militar = e.id_militar
      JOIN CICLOS c ON se.id_ciclo = c.id_ciclo
      WHERE 1=1
    `;
    let where = '';
    const params = [];
    if (ciclo_id) { params.push(ciclo_id); where += ` AND se.id_ciclo = $${params.length}`; }
    if (militar_id) { params.push(militar_id); where += ` AND se.id_militar = $${params.length}`; }
    if (data_inicio) { params.push(data_inicio); where += ` AND se.data_execucao >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); where += ` AND se.data_execucao <= $${params.length}`; }

    const selectCols = `
      SELECT se.*, e.nome_guerra, e.matricula, e.posto_graduacao,
             TO_CHAR(c.data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(c.data_fim, 'DD/MM/YYYY') as periodo_ciclo
    `;

    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      const countRes = await db.get(`SELECT COUNT(*)::int AS total ${baseFrom} ${where}`, params);
      const total = countRes ? countRes.total : 0;

      const dataParams = [...params, limitNum, offset];
      const { rows } = await db.query(
        `${selectCols} ${baseFrom} ${where} ORDER BY se.data_execucao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        dataParams
      );
      return res.json({
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.max(1, Math.ceil(total / limitNum))
        }
      });
    }

    const { rows } = await db.query(`${selectCols} ${baseFrom} ${where} ORDER BY se.data_execucao DESC`, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /servicos
 */
servicoController.createServico = async (req, res, next) => {
  try {
    const { id_ciclo, id_militar, data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca } = req.body;
    if (!id_ciclo || !id_militar || !data_execucao || !status_presenca) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }
    // 1. Verificar Duplicidade (id_militar + data_execucao)
    const exists = await db.get(
      'SELECT 1 FROM SERVICOS_EXECUTADOS WHERE id_militar = $1 AND data_execucao = $2',
      [id_militar, data_execucao]
    );

    if (exists) {
      return res.status(409).json({ error: "Já existe um serviço registrado para este militar nesta data." });
    }

    // Calcular automaticamente baseado no dia da semana e feriados
    const dateObj = new Date(data_execucao);
    const v_diaSemana = dia_semana !== undefined ? dia_semana : dateObj.getDay();
    const v_ehFeriado = eh_feriado !== undefined ? eh_feriado : isFeriado(dateObj);
    const isExtras = (v_diaSemana === 0 || v_diaSemana === 5 || v_diaSemana === 6 || v_ehFeriado);
    const cargaCalc = carga_horaria || (isExtras ? 8 : 6);
    const valorCalc = valor_remuneracao || (isExtras ? 250.00 : 192.03);

    // Obter Tipo correspondente à carga horária
    const resolvedTipo = await db.get('SELECT id_tipo_servico FROM TIPOS_SERVICO WHERE carga_horaria = $1 AND ativo = true LIMIT 1', [cargaCalc])
      || await db.get('SELECT id_tipo_servico FROM TIPOS_SERVICO WHERE carga_horaria = 6 AND ativo = true LIMIT 1')
      || await db.get('SELECT id_tipo_servico FROM TIPOS_SERVICO LIMIT 1');
    const idTipoServico = resolvedTipo ? resolvedTipo.id_tipo_servico : null;

    const r = await db.run(
      'INSERT INTO SERVICOS_EXECUTADOS (id_ciclo, id_militar, data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca, id_tipo_servico) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id_ciclo, id_militar, data_execucao, v_diaSemana, v_ehFeriado, cargaCalc, valorCalc, status_presenca, idTipoServico]
    );

    // Automacao: Recalcular metas dinamicas
    await recalculateMetas(id_ciclo);

    res.status(201).json({ success: true, id_execucao: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /servicos/:id
 */
servicoController.updateServico = async (req, res, next) => {
  try {
    const { data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca } = req.body;
    const dateObj = new Date(data_execucao);
    const diaSemana = dia_semana !== undefined ? dia_semana : dateObj.getDay();
    const ehFeriado = eh_feriado !== undefined ? eh_feriado : isFeriado(dateObj);
    const isExtras = (diaSemana === 0 || diaSemana === 5 || diaSemana === 6 || ehFeriado);
    const cargaCalc = carga_horaria || (isExtras ? 8 : 6);
    const valorCalc = valor_remuneracao || (isExtras ? 250.00 : 192.03);
    
    // Obter Tipo correspondente à carga horária
    const resolvedTipo = await db.get('SELECT id_tipo_servico FROM TIPOS_SERVICO WHERE carga_horaria = $1 AND ativo = true LIMIT 1', [cargaCalc])
      || await db.get('SELECT id_tipo_servico FROM TIPOS_SERVICO WHERE carga_horaria = 6 AND ativo = true LIMIT 1')
      || await db.get('SELECT id_tipo_servico FROM TIPOS_SERVICO LIMIT 1');
    const idTipoServico = resolvedTipo ? resolvedTipo.id_tipo_servico : null;

    await db.run(
      'UPDATE SERVICOS_EXECUTADOS SET data_execucao=$1, dia_semana=$2, eh_feriado=$3, carga_horaria=$4, valor_remuneracao=$5, status_presenca=$6, id_tipo_servico=$7 WHERE id_execucao=$8',
      [data_execucao, diaSemana, ehFeriado, cargaCalc, valorCalc, status_presenca, idTipoServico, req.params.id]
    );

    // Automacao: Recalcular metas dinamicas
    const service = await db.get('SELECT id_ciclo FROM SERVICOS_EXECUTADOS WHERE id_execucao = $1', [req.params.id]);
    if (service) await recalculateMetas(service.id_ciclo);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * DELETE /servicos/:id
 */
servicoController.deleteServico = async (req, res, next) => {
  try {
    const service = await db.get('SELECT id_ciclo FROM SERVICOS_EXECUTADOS WHERE id_execucao = $1', [req.params.id]);
    await db.run('DELETE FROM SERVICOS_EXECUTADOS WHERE id_execucao = $1', [req.params.id]);

    // Automacao: Recalcular metas dinamicas
    if (service) await recalculateMetas(service.id_ciclo);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /servicos/corrigir-cargas
 */
servicoController.corrigirCargas = async (req, res, next) => {
  try {
    const { rows: servicos } = await db.query('SELECT id_execucao, data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao FROM SERVICOS_EXECUTADOS');
    
    let atualizados = 0;
    for (const s of servicos) {
      const dateObj = new Date(s.data_execucao);
      const diaSemana = s.dia_semana !== null ? s.dia_semana : dateObj.getDay();
      const ehFeriado = s.eh_feriado || isFeriado(dateObj);
      const isExtras = (diaSemana === 0 || diaSemana === 5 || diaSemana === 6 || ehFeriado);
      const novaCarga = isExtras ? 8 : 6;
      const novoValor = isExtras ? 250.00 : 192.03;
      
      if (s.carga_horaria !== novaCarga || parseFloat(s.valor_remuneracao) !== novoValor) {
        await db.run(
          'UPDATE SERVICOS_EXECUTADOS SET carga_horaria = $1, valor_remuneracao = $2, eh_feriado = $3, dia_semana = $4 WHERE id_execucao = $5',
          [novaCarga, novoValor, ehFeriado, diaSemana, s.id_execucao]
        );
        atualizados++;
      }
    }
    
    res.json({ success: true, message: `${atualizados} serviços corrigidos.` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * DELETE /servicos/ciclo/:cicloId
 */
servicoController.deleteServicosCiclo = async (req, res, next) => {
  try {
    const cicloId = req.params.cicloId;
    const result = await db.run('DELETE FROM SERVICOS_EXECUTADOS WHERE id_ciclo = $1', [cicloId]);
    res.json({ success: true, message: `${result.changes} serviços removidos do ciclo ${cicloId}.` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /servicos/import/preview
 */
servicoController.importServicosPreview = (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Detecção de arquivos HTML (Web Page) incompletos/wrappers
    if (rows.length < 5 && rows.some(r => r && r.some(c => String(c).includes('&lt;') || String(c).includes('v:fill')))) {
        return res.status(400).json({ 
            error: "O arquivo enviado parece ser uma página web ou atalho incompleto. " +
                   "Para importar, abra este arquivo no Excel e salve-o como 'Pasta de Trabalho do Excel (.xlsx)' antes de enviar." 
        });
    }

    // Lista de colunas esperadas para identificar o cabeçalho real (muito mais abrangente)
    const targetKeys = [
        'PG', 'POSTO', 'GRADUACAO', 'POSTOGRAD', 'POSTOGRADUACAO', 
        'NOME', 'NOMEDEGUERRA', 'NOMEPARAGUERRA', 
        'CPF', 'DATA', 'CMD', 'OPM', 'UNIDADE', 'UNID', 'REPARTICAO', 'SIGLA',
        'MODALIDADE', 'GUARNICAO', 'DESCRICAO'
    ];

    let bestHeaderIndex = -1;
    let maxMatches = 0;

    // Escaneia as primeiras 30 linhas para achar a que mais se parece com o cabeçalho
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const rowData = rows[i];
        if (!rowData || rowData.length === 0) continue;

        const normalizedRow = rowData.map(cell => normalizeKey(cell));
        const matches = normalizedRow.filter(k => k && targetKeys.includes(k)).length;
        
        // Critério de desempate: preferir a linha que tenha "CPF" e "NOME"
        let bonus = 0;
        if (normalizedRow.includes('CPF')) bonus += 2;
        if (normalizedRow.includes('NOME')) bonus += 1;
        
        const score = matches + bonus;

        if (score > maxMatches) {
            maxMatches = score;
            bestHeaderIndex = i;
        }
    }

    // Se não encontrou cabeçalho minimamente válido, tenta a linha 0
    if (bestHeaderIndex === -1) bestHeaderIndex = 0;

    const headers = rows[bestHeaderIndex] || [];
    const firstDataRow = rows[bestHeaderIndex + 1] || [];

    const preview = headers.map((h, i) => {
      const cleanH = String(h || '')
        .replace(/&[a-z0-9#]+;/gi, ' ') // Limpa qualquer entidade HTML
        .trim();

      return {
        index: i,
        header: cleanH || `Coluna ${i}`,
        normalizado: normalizeKey(cleanH),
        exemplo: firstDataRow[i] ?? ''
      };
    });

    res.json({
      sheet: sheetName,
      total_rows: rows.length - (bestHeaderIndex + 1),
      header_row: bestHeaderIndex,
      colunas: preview
    });
  } catch (e) {
    res.status(500).json({ error: "Falha ao ler o arquivo: " + e.message });
  }
};

/**
 * POST /servicos/import
 */
servicoController.importServicos = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rows.length < 2) {
        return res.status(400).json({ error: "O arquivo enviado está vazio ou não contém dados válidos." });
    }

    // Detecção de arquivos HTML (Web Page) incompletos/wrappers
    if (rows.length < 5 && rows.some(r => r && r.some(c => String(c).includes('<') || String(c).includes('v:fill')))) {
        return res.status(400).json({ 
            error: "O arquivo enviado parece ser uma página web ou arquivo HTML disfarçado de Excel. " +
                   "Para importar, abra este arquivo no Excel e salve-o como 'Pasta de Trabalho do Excel (.xlsx ou .xls)' padrão antes de enviar." 
        });
    }

    // Busca cabeçalho
    const targetKeys = [
        'PG', 'POSTO', 'GRADUACAO', 'POSTOGRAD', 'POSTOGRADUACAO', 
        'NOME', 'NOMEDEGUERRA', 'NOMEPARAGUERRA', 
        'CPF', 'DATA', 'CMD', 'OPM', 'UNIDADE', 'UNID', 'REPARTICAO', 'SIGLA',
        'MODALIDADE', 'GUARNICAO', 'DESCRICAO'
    ];
    let headerIndex = -1;
    let maxMatches = 0;

    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        if (!rows[i]) continue;
        const normalizedRow = rows[i].map(cell => normalizeKey(cell));
        const matches = normalizedRow.filter(k => k && targetKeys.includes(k)).length;
        if (matches > maxMatches) {
            maxMatches = matches;
            headerIndex = i;
        }
    }
    if (headerIndex === -1) headerIndex = 0;

    const headers = rows[headerIndex].map(h => normalizeKey(h));
    const dataRows = rows.slice(headerIndex + 1);

    let stats = { imported: 0, skipped: 0, errors: 0, inactive: 0, not_registered: 0 };
    let errorDetails = [];
    const affectedCiclos = new Set();

    for (const row of dataRows) {
      if (!row || row.length === 0 || !row.some(c => c !== '')) continue;

      let cpfRaw = '', dataServico = '', pg = '', nome = '', cmd = '', opm = '', modalidade = '', guarnicao = '', cargaRaw = '', valorRaw = '';

      try {
        headers.forEach((k, i) => {
          let val = row[i];
          if (val === undefined || val === null) return;
          if (!(val instanceof Date)) val = String(val).trim();

          if (k === 'CPF') cpfRaw = val;
          else if (k === 'DATA') dataServico = val;
          else if (['PG', 'POSTO', 'GRADUACAO', 'POSTOGRAD', 'POSTOGRADUACAO'].includes(k)) pg = val;
          else if (['NOME', 'NOMEDEGUERRA', 'NOMEPARAGUERRA'].includes(k)) nome = val;
          else if (k === 'CMD') cmd = val;
          else if (['OPM', 'UNIDADE', 'UNID', 'REPARTICAO', 'SIGLA'].includes(k)) opm = val;
          else if (k === 'MODALIDADE') modalidade = val;
          else if (['GUARNICAO', 'DESCRICAO'].includes(k)) guarnicao = val;
          else if (['CARGA', 'CARGAHORARIA', 'HORAS', 'DURACAO', 'CARGA_HORARIA'].includes(k)) cargaRaw = val;
          else if (['VALOR', 'REMUNERACAO', 'VALOR_REMUNERACAO', 'RECEBIDO'].includes(k)) valorRaw = val;
        });

        const cpf = padCpf(cpfRaw);
        if (!cpf || !dataServico) {
          stats.skipped++;
          continue;
        }

        // 1. Localizar Militar
        const military = await db.get('SELECT id_militar, status_ativo, nome_completo, matricula, opm FROM EFETIVO WHERE cpf = $1', [cpf]);
        if (!military) {
          stats.not_registered++;
          errorDetails.push({
            militar: nome || 'Desconhecido',
            matricula: 'N/A',
            opm: opm || 'N/A',
            data: dataServico,
            error: "Militar não cadastrado no sistema (CPF não encontrado).",
            reason: "not_registered"
          });
          console.warn(`[IMPORT] Militar não cadastrado rejeitado: CPF=${cpf}, Nome=${nome}`);
          continue;
        }

        if (military.status_ativo === false || military.status_ativo === 0) {
          stats.inactive++;
          errorDetails.push({
            militar: military.nome_completo || nome || 'Desconhecido',
            matricula: military.matricula || 'N/A',
            opm: military.opm || opm || 'N/A',
            data: dataServico,
            error: "Militar inativo no sistema.",
            reason: "inactive"
          });
          console.warn(`[IMPORT] Militar inativo rejeitado: CPF=${cpf}, Nome=${military.nome_completo}`);
          continue;
        }

        // 2. Processar Data e Localizar Ciclo
        let dateObj;
        if (dataServico instanceof Date) {
          // Objeto Date do XLSX (UTC ou Local) - Normalizar para Meio-dia para evitar saltos de fuso
          dateObj = new Date(dataServico.getFullYear(), dataServico.getMonth(), dataServico.getDate(), 12, 0, 0);
        } else {
          const dataStr = String(dataServico).trim();
          // Tenta extrair partes usando separadores comuns (/ ou -)
          const parts = dataStr.split(/[/-]/);
          
          if (parts.length === 3) {
            // Formato DD/MM/YYYY ou DD-MM-YYYY
            if (parts[2].length === 4) {
              dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0);
            } 
            // Formato YYYY/MM/DD ou YYYY-MM-DD
            else if (parts[0].length === 4) {
              dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
            }
          }

          // Fallback para o construtor nativo se os formatos conhecidos falharem
          if (!dateObj || isNaN(dateObj.getTime())) {
            dateObj = new Date(dataStr);
            // Ajusta para meio-dia se for uma data válida mas sem hora
            if (!isNaN(dateObj.getTime()) && !dataStr.includes(':')) {
              dateObj.setHours(12, 0, 0, 0);
            }
          }
        }

        if (!dateObj || isNaN(dateObj.getTime())) {
          stats.errors++;
          errorDetails.push({ militar: nome || cpf, error: `Data inválida no arquivo: "${dataServico}"` });
          continue;
        }

        const isoDate = dateObj.toISOString().split('T')[0];
        const qCiclo = `
          SELECT c.id_ciclo, c.valor_total_previsto, c.data_inicio, c.data_fim, o.sigla as sigla_opm
          FROM CICLOS c
          JOIN OPM o ON c.id_opm = o.id_opm
          WHERE $1 BETWEEN c.data_inicio AND c.data_fim
        `;
        const cycle = await db.get(qCiclo, [isoDate]);

        if (!cycle) {
          stats.errors++;
          errorDetails.push({ militar: nome || cpf, error: `Nenhum Ciclo operacional com OPM vinculada encontrado para a data ${isoDate}.` });
          continue;
        }

        const idCiclo = cycle.id_ciclo;

        // Validação: se o militar for de outra OPM e o serviço também for executado em outra OPM, ignorar
        const normalizeOpm = (o) => {
          if (!o) return '';
          return String(o).trim().toUpperCase().replace(/º/g, 'O').replace(/\s/g, '');
        };
        const homeOpmNorm = normalizeOpm(military.opm);
        const execOpmNorm = normalizeOpm(opm);
        const targetOpmNorm = normalizeOpm(cycle.sigla_opm);

        if (homeOpmNorm !== targetOpmNorm && execOpmNorm !== targetOpmNorm) {
          stats.skipped++;
          continue;
        }

        // 3. Verificar Duplicados
        const exists = await db.get(
          'SELECT 1 FROM SERVICOS_EXECUTADOS WHERE id_militar = $1 AND data_execucao = $2',
          [military.id_militar, isoDate]
        );
        if (exists) {
            stats.skipped++;
            continue;
        }

        const diaSemana = dateObj.getDay();
        const feriado = isFeriado(dateObj);
        const isExtras = (diaSemana === 0 || diaSemana === 5 || diaSemana === 6 || feriado);
        
        let cargaHoraria = cargaRaw ? parseInt(String(cargaRaw).replace(/\D/g, '')) : (isExtras ? 8 : 6);
        if (isNaN(cargaHoraria) || cargaHoraria <= 0) {
          cargaHoraria = isExtras ? 8 : 6;
        }

        let valorRemuneracao = valorRaw ? parseFloat(String(valorRaw).replace(/[^0-9,.-]/g, '').replace(',', '.')) : (isExtras ? 250.00 : 192.03);
        if (isNaN(valorRemuneracao) || valorRemuneracao <= 0) {
          valorRemuneracao = isExtras ? 250.00 : 192.03;
        }

        // 4. Obter Tipo correspondente à carga horária real
        const resolvedTipo = await db.get('SELECT id_tipo_servico FROM TIPOS_SERVICO WHERE carga_horaria = $1 AND ativo = true LIMIT 1', [cargaHoraria])
          || await db.get('SELECT id_tipo_servico FROM TIPOS_SERVICO WHERE carga_horaria = 6 AND ativo = true LIMIT 1')
          || await db.get('SELECT id_tipo_servico FROM TIPOS_SERVICO LIMIT 1');

        if (!resolvedTipo) {
          stats.errors++;
          errorDetails.push({ militar: nome || cpf, error: `Nenhum Tipo de Serviço cadastrado.` });
          continue;
        }

        const idTipoServico = resolvedTipo.id_tipo_servico;

        // Validar Orçamento - Apenas para a unidade (OPM) do ciclo
        const { rows: somaRows } = await db.query(
          'SELECT COALESCE(SUM(valor_remuneracao), 0) as total FROM SERVICOS_EXECUTADOS WHERE id_ciclo = $1 AND UPPER(TRIM(opm_origem)) = UPPER(TRIM($2))', 
          [idCiclo, cycle.sigla_opm]
        );
        const currentTotal = parseFloat(somaRows[0].total);
        const teto = parseFloat(cycle.valor_total_previsto || 0);

        if (teto > 0 && (currentTotal + valorRemuneracao) > teto) {
          stats.errors++;
          errorDetails.push({ militar: nome || cpf, error: `Orçamento excedido para o ciclo (Teto: ${teto}).` });
          continue;
        }

        // 5. Inserir
        await db.run(
          `INSERT INTO SERVICOS_EXECUTADOS 
            (id_ciclo, id_militar, data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca, cmd, opm_origem, modalidade, guarnicao, id_tipo_servico)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [idCiclo, military.id_militar, isoDate, diaSemana, feriado, cargaHoraria, valorRemuneracao, 'Presente', cmd, opm, modalidade, guarnicao, idTipoServico]
        );

        affectedCiclos.add(idCiclo);
        stats.imported++;

      } catch (err) {
        console.error('[IMPORT ERROR]', err);
        stats.errors++;
        errorDetails.push({ militar: nome || 'Militar', error: err.message });
      }
    }

    // Automacao: Recalcular metas dinamicas para todos os ciclos afetados
    for (const idC of affectedCiclos) {
      try {
        await recalculateMetas(idC);
      } catch (err) {
        console.error(`[IMPORT] Falha ao recalcular metas para ciclo ${idC}:`, err.message);
      }
    }

    // Automacao: Recalcular metas dinamicas para todos os ciclos afetados
    for (const idC of affectedCiclos) {
      try {
        await recalculateMetas(idC);
      } catch (err) {
        console.error(`[IMPORT] Falha ao recalcular metas para ciclo ${idC}:`, err.message);
      }
    }

    res.json({ success: true, message: "Importação concluída.", stats, errorDetails });
  } catch (e) {
    console.error('[FATAL IMPORT ERROR]', e);
    res.status(500).json({ error: "Falha processar arquivo: " + e.message });
  }
};

/**
 * POST /servicos/conferencia-digital (M16)
 * Registra presença/falta digital diretamente a partir de escalas planejadas.
 * Aceita { id_escala, status_presenca } ou { items: [{ id_escala, status_presenca }] }.
 */
servicoController.conferenciaDigital = async (req, res, next) => {
  try {
    const rawItems = Array.isArray(req.body?.items)
      ? req.body.items
      : (req.body?.id_escala ? [{ id_escala: req.body.id_escala, status_presenca: req.body.status_presenca }] : []);

    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'Informe ao menos uma escala para conferência digital.' });
    }

    const validStatuses = new Set(['Presente', 'Falta', 'Justificada', 'Permuta']);
    const results = [];
    const affectedCiclos = new Set();

    for (const item of rawItems) {
      const idEscala = parseInt(item.id_escala, 10);
      const statusPresenca = validStatuses.has(item.status_presenca) ? item.status_presenca : 'Presente';
      if (!idEscala) continue;

      const escala = await db.get(`
        SELECT ep.id_escala, ep.id_ciclo, ep.id_militar, ep.data_servico, ep.id_tipo_servico,
               ep.nome_recurso, ts.carga_horaria, ts.valor_remuneracao, o.sigla AS opm_sigla
        FROM ESCALA_PLANEJAMENTO ep
        JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
        LEFT JOIN OPM o ON c.id_opm = o.id_opm
        LEFT JOIN TIPOS_SERVICO ts ON ep.id_tipo_servico = ts.id_tipo_servico
        WHERE ep.id_escala = $1
      `, [idEscala]);

      if (!escala) continue;

      const dataStr = formatDateToISO(escala.data_servico);
      const dateObj = new Date(`${dataStr}T12:00:00`);
      const diaSemana = dateObj.getDay();
      const ehFeriado = isFeriado(dateObj);
      const isExtraDay = (diaSemana === 0 || diaSemana === 5 || diaSemana === 6 || ehFeriado);
      const carga = escala.carga_horaria || (isExtraDay ? 8 : 6);
      const valor = statusPresenca === 'Falta'
        ? 0
        : (escala.valor_remuneracao || (isExtraDay ? 250.00 : 192.03));

      const existing = await db.get(
        'SELECT id_execucao FROM SERVICOS_EXECUTADOS WHERE id_militar = $1 AND data_execucao = $2',
        [escala.id_militar, dataStr]
      );

      let idExecucao;
      if (existing) {
        await db.run(
          'UPDATE SERVICOS_EXECUTADOS SET status_presenca = $1, valor_remuneracao = $2, guarnicao = COALESCE(guarnicao, $3) WHERE id_execucao = $4',
          [statusPresenca, valor, escala.nome_recurso, existing.id_execucao]
        );
        idExecucao = existing.id_execucao;
      } else {
        const ins = await db.run(
          `INSERT INTO SERVICOS_EXECUTADOS
            (id_ciclo, id_militar, data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca, id_tipo_servico, opm_origem, guarnicao)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            escala.id_ciclo,
            escala.id_militar,
            dataStr,
            diaSemana,
            ehFeriado,
            carga,
            valor,
            statusPresenca,
            escala.id_tipo_servico || null,
            escala.opm_sigla || null,
            escala.nome_recurso || null
          ]
        );
        idExecucao = ins.lastID;
      }

      affectedCiclos.add(escala.id_ciclo);
      results.push({ id_escala: idEscala, id_execucao: idExecucao, status_presenca: statusPresenca });
    }

    for (const cid of affectedCiclos) {
      await recalculateMetas(cid);
    }

    if (req.user?.id) {
      await auditLog(req.user.id, 'CONFERENCIA_DIGITAL', 'SERVICOS_EXECUTADOS', null, { count: results.length, results });
    }

    res.json({ success: true, processed: results.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = servicoController;
