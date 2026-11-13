'use strict';
const XLSX = require('xlsx');
const db = require('../db');
const { cleanCPF, isValidCPF, formatCPF } = require('../utils/cpf');
const { normalizeRank, padCpf, deepCleanText, normalizeKey, formatPhone, isEmpty, auditLog } = require('../utils/helpers');

const efetivoController = {};

/**
 * GET /efetivo
 */
efetivoController.getEfetivo = async (req, res, next) => {
  try {
    res.json(await db.all('SELECT * FROM EFETIVO ORDER BY nome_completo ASC'));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * GET /efetivo/desenvolvedores
 */
efetivoController.getDesenvolvedores = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT id_militar, posto_graduacao, nome_completo, nome_guerra
      FROM EFETIVO
      WHERE UPPER(nome_completo) LIKE '%RAFAEL MONTEIRO MENDES%'
         OR UPPER(nome_completo) LIKE '%ALAN KLEBER DE MENEZES SOARES%'
      ORDER BY CASE 
        WHEN UPPER(nome_completo) LIKE '%RAFAEL MONTEIRO MENDES%' THEN 1 
        ELSE 2 
      END
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * POST /efetivo
 */
efetivoController.createEfetivo = async (req, res, next) => {
  try {
    const { nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, motorista, status_ativo } = req.body;
    if (!nome_completo || !posto_graduacao || !matricula || !cpf) return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    
    const formattedCpf = padCpf(cpf);
    const normalizedRankVal = normalizeRank(posto_graduacao);

    const r = await db.run(
      'INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, motorista, status_ativo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [nome_completo, nome_guerra || nome_completo.split(' ')[0], normalizedRankVal, matricula, formattedCpf, rgpm || null, opm || null, telefone || null, motorista || 'Não', status_ativo !== false]
    );
    await db.run('INSERT INTO users (numero_ordem, password, is_admin) VALUES ($1, $2, 0) ON CONFLICT (numero_ordem) DO NOTHING', [matricula, formattedCpf]);
    res.status(201).json({ success: true, id_militar: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /efetivo/:id
 */
efetivoController.updateEfetivo = async (req, res, next) => {
  try {
    const { nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, motorista, status_ativo } = req.body;
    const formattedCpf = padCpf(cpf);
    const normalizedRankVal = normalizeRank(posto_graduacao);
    
    await db.run(
      'UPDATE EFETIVO SET nome_completo=$1, nome_guerra=$2, posto_graduacao=$3, matricula=$4, cpf=$5, rgpm=$6, opm=$7, telefone=$8, motorista=$9, status_ativo=$10 WHERE id_militar=$11',
      [nome_completo, nome_guerra, normalizedRankVal, matricula, formattedCpf, rgpm || null, opm || null, telefone || null, motorista || 'Não', status_ativo, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * GET /efetivo/lookup/:matricula
 */
efetivoController.lookupEfetivo = async (req, res, next) => {
  try {
    const cleanMatricula = req.params.matricula.replace(/\D/g, '');
    let militar = await db.get(
      'SELECT nome_completo, nome_guerra, posto_graduacao, telefone FROM EFETIVO WHERE matricula = $1',
      [req.params.matricula]
    );

    // Se não encontrar pela exata, tenta buscar ignorando formatação no banco
    if (!militar) {
      militar = await db.get(
        "SELECT nome_completo, nome_guerra, posto_graduacao, telefone FROM EFETIVO WHERE REPLACE(REPLACE(matricula, '.', ''), '-', '') = $1",
        [cleanMatricula]
      );
    }

    if (!militar) return res.status(404).json({ error: "Militar não encontrado." });
    res.json(militar);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * DELETE /efetivo/:id
 */
efetivoController.deleteEfetivo = async (req, res, next) => {
  try {
    await db.run('DELETE FROM users WHERE numero_ordem = (SELECT matricula FROM EFETIVO WHERE id_militar = $1)', [req.params.id]);
    await db.run('DELETE FROM EFETIVO WHERE id_militar = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /efetivo/import/preview
 */
efetivoController.importEfetivoPreview = (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    const headers = rawRows[0] || [];
    const firstRow = rawRows[1] || [];
    const preview = headers.map((h, i) => ({
      index: i,
      header: h,
      normalizado: normalizeKey(h),
      exemplo: firstRow[i] ?? ''
    }));
    res.json({ sheet: sheetName, total_rows: rawRows.length - 1, colunas: preview });
  } catch (e) {
    res.status(500).json({ error: "Falha ao ler o arquivo: " + e.message });
  }
};

/**
 * POST /efetivo/import
 */
efetivoController.importEfetivo = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ error: "Arquivo vazio ou sem dados reconhecíveis." });
    }

    // --- DETECÇÃO INTELIGENTE DE CABEÇALHO ---
    const targetKeys = ['MATRICULA', 'NOME', 'CPF', 'PG', 'ORDEM', 'NORDEM', 'NRORDEM', 'POSTO', 'GRADUACAO'];
    let bestHeaderIndex = -1;
    let maxMatches = 0;

    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const rowData = rows[i];
      if (!rowData || rowData.length === 0) continue;
      const normalizedRow = rowData.map(cell => normalizeKey(cell));
      const matches = normalizedRow.filter(k => k && targetKeys.includes(k)).length;
      
      let bonus = 0;
      if (normalizedRow.includes('CPF')) bonus += 2;
      if (normalizedRow.includes('MATRICULA')) bonus += 2;
      if (normalizedRow.includes('NORDEM') || normalizedRow.includes('ORDEM')) bonus += 1;
      
      const score = matches + bonus;
      if (score > maxMatches) {
        maxMatches = score;
        bestHeaderIndex = i;
      }
    }

    if (bestHeaderIndex === -1) bestHeaderIndex = 0;
    
    const headers = rows[bestHeaderIndex];
    const dataRows = rows.slice(bestHeaderIndex + 1);

    // Checa se a planilha possui coluna explícita de motorista
    const normalizedHeaders = headers.map(h => normalizeKey(h));
    const hasMotoristaCol = normalizedHeaders.some(k => ['MOTORISTA', 'CONDUTOR', 'MOT', 'COND'].includes(k));

    // Estatísticas da operação
    const stats = {
      total_planilha: 0,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      deactivated: 0,
      errors: 0,
      duplicates_detected: 0
    };

    const errorDetails = [];
    const updatedDetails = [];
    const deactivatedDetails = [];
    const insertedDetails = [];

    // Parse e deduplicação prévia das linhas da planilha
    const parsedMilitaryMap = new Map();

    for (let rIdx = 0; rIdx < dataRows.length; rIdx++) {
      const row = dataRows[rIdx];
      const rowObj = {};
      headers.forEach((h, i) => {
        if (h) rowObj[h] = row[i];
      });
      if (Object.keys(rowObj).length === 0) continue;

      let matricula = '', nrOrdem = '', cpf = '', nome = '', nomeGuerra = '', posto = 'SD PM';
      let rgpm = null, opm = null, telefone = null, motorista = null;

      Object.keys(rowObj).forEach(key => {
        const k = normalizeKey(key);
        const rawVal = rowObj[key];
        if (isEmpty(rawVal)) return;
        const val = String(rawVal).trim();

        if (k === 'MATRICULA' || k.startsWith('MATRICUL')) matricula = val;
        else if (k === 'NORDEM' || k === 'NRORDEM' || k === 'NUMEROORDEM' || k === 'ORDEM' || k === 'NODEORDEM' || k === 'ORD' || k === 'NO') nrOrdem = val;
        else if (k === 'CPF') cpf = padCpf(val);
        else if (k === 'NOMECOMPLETO' || k === 'NOME') nome = deepCleanText(val);
        else if (k.includes('GUERRA')) nomeGuerra = deepCleanText(val);
        else if (k === 'PG' || k === 'POSTOGRAD' || k === 'POSTOGRADUACAO' || k.startsWith('POSTO') || k.startsWith('GRAD')) posto = normalizeRank(val);
        else if (k === 'RGPM' || k === 'RG' || k === 'RGPOLICIAL' || k === 'REGISTROGERAL') rgpm = val;
        else if (k === 'OPM' || k === 'LOTACAO' || k === 'UNIDADE' || k === 'ORGANIZACAO' || k === 'ORGAO') {
          if (!opm || k === 'OPM') opm = val;
        }
        else if (k === 'TELEFONE' || k === 'CELULAR' || k === 'TEL' || k === 'FONE') telefone = formatPhone(val);
        else if (hasMotoristaCol && ['MOTORISTA', 'CONDUTOR', 'MOT', 'COND'].includes(k)) {
          const v = val.toUpperCase();
          motorista = (v === 'SIM' || v === 'S' || v === 'TRUE' || v === '1') ? 'Sim' : 'Não';
        }
      });

      if (!matricula && nrOrdem) matricula = nrOrdem;
      if (!nrOrdem && matricula) nrOrdem = matricula;
      if (!nomeGuerra && nome) nomeGuerra = nome.split(' ')[0];

      // Validação: CPF com 11 dígitos, matrícula e nome obrigatórios
      if (!cpf || cpf.length !== 11 || !matricula || !nome) {
        stats.errors++;
        errorDetails.push({
          linha: rIdx + bestHeaderIndex + 2,
          militar: nome || `Matrícula ${matricula}` || `CPF ${cpf}` || 'Linha incompleta',
          error: `Dados obrigatórios inválidos ou ausentes (CPF: "${cpf}", Matrícula: "${matricula}", Nome: "${nome}")`
        });
        continue;
      }

      stats.total_planilha++;

      // Prevenção de duplicidades no próprio arquivo da planilha
      if (parsedMilitaryMap.has(cpf)) {
        stats.duplicates_detected++;
        const prev = parsedMilitaryMap.get(cpf);
        parsedMilitaryMap.set(cpf, { ...prev, ...Object.fromEntries(Object.entries({ matricula, nrOrdem, nome, nomeGuerra, posto, rgpm, opm, telefone, motorista }).filter(([_, v]) => v != null)) });
      } else {
        parsedMilitaryMap.set(cpf, { matricula, nrOrdem, cpf, nome, nomeGuerra, posto, rgpm, opm, telefone, motorista });
      }
    }

    // --- TRANSAÇÃO ATÔMICA DE BANCO DE DADOS ---
    await db.transaction(async (client) => {
      // 1. Carrega todos os militares atuais do banco
      const dbEfetivoRes = await client.query(`
        SELECT id_militar, nome_completo, nome_guerra, posto_graduacao, 
               matricula, numero_ordem, cpf, rgpm, opm, telefone, motorista, status_ativo
        FROM EFETIVO
      `);
      
      const dbByCpf = new Map();
      const dbByMatricula = new Map();
      for (const m of dbEfetivoRes.rows) {
        if (m.cpf) dbByCpf.set(String(m.cpf).trim(), m);
        if (m.matricula) dbByMatricula.set(String(m.matricula).trim(), m);
      }

      const processedDbIds = new Set();

      // 2. Processa cada militar da planilha
      for (const [cpf, mil] of parsedMilitaryMap.entries()) {
        const existing = dbByCpf.get(cpf) || dbByMatricula.get(mil.matricula);

        if (existing) {
          processedDbIds.add(existing.id_militar);
          // --- MILITAR EXISTENTE NO BANCO E NA PLANILHA ---
          const changes = [];
          
          if (mil.nome && mil.nome !== (existing.nome_completo || '').trim()) {
            changes.push(`Nome: "${existing.nome_completo}" ➔ "${mil.nome}"`);
          }
          if (mil.nomeGuerra && mil.nomeGuerra !== (existing.nome_guerra || '').trim()) {
            changes.push(`Nome Guerra: "${existing.nome_guerra}" ➔ "${mil.nomeGuerra}"`);
          }
          if (mil.posto && mil.posto !== (existing.posto_graduacao || '').trim()) {
            changes.push(`Posto: "${existing.posto_graduacao}" ➔ "${mil.posto}"`);
          }
          if (mil.matricula && mil.matricula !== (existing.matricula || '').trim()) {
            changes.push(`Matrícula: "${existing.matricula}" ➔ "${mil.matricula}"`);
          }
          if (mil.nrOrdem && mil.nrOrdem !== (existing.numero_ordem || '').trim()) {
            changes.push(`Nº Ordem: "${existing.numero_ordem}" ➔ "${mil.nrOrdem}"`);
          }
          if (mil.rgpm && mil.rgpm !== (existing.rgpm || '').trim()) {
            changes.push(`RGPM: "${existing.rgpm}" ➔ "${mil.rgpm}"`);
          }
          if (mil.opm && mil.opm !== (existing.opm || '').trim()) {
            changes.push(`OPM: "${existing.opm}" ➔ "${mil.opm}"`);
          }
          if (mil.telefone && mil.telefone !== (existing.telefone || '').trim()) {
            changes.push(`Telefone: "${existing.telefone}" ➔ "${mil.telefone}"`);
          }
          if (hasMotoristaCol && mil.motorista && mil.motorista !== (existing.motorista || '').trim()) {
            changes.push(`Motorista: "${existing.motorista}" ➔ "${mil.motorista}"`);
          }
          if (existing.status_ativo !== true) {
            changes.push(`Status: Inativo ➔ Ativo`);
          }

          if (changes.length > 0) {
            // Atualiza o banco com o valor da planilha (fonte oficial)
            await client.query(`
              UPDATE EFETIVO SET
                nome_completo = $1,
                nome_guerra = $2,
                posto_graduacao = $3,
                matricula = $4,
                numero_ordem = $5,
                rgpm = COALESCE($6, rgpm),
                opm = COALESCE($7, opm),
                telefone = COALESCE($8, telefone),
                motorista = CASE WHEN $9::text IS NOT NULL THEN $9::text ELSE motorista END,
                status_ativo = TRUE
              WHERE id_militar = $10
            `, [
              mil.nome,
              mil.nomeGuerra,
              mil.posto,
              mil.matricula,
              mil.nrOrdem,
              mil.rgpm,
              mil.opm,
              mil.telefone,
              hasMotoristaCol ? mil.motorista : null,
              existing.id_militar
            ]);

            stats.updated++;
            updatedDetails.push({
              id_militar: existing.id_militar,
              militar: `${mil.posto} ${mil.nomeGuerra || mil.nome}`,
              cpf: mil.cpf,
              matricula: mil.matricula,
              changes
            });
          } else {
            stats.unchanged++;
          }

          // Garante usuário no sistema (users)
          await client.query(`
            INSERT INTO users (numero_ordem, password, is_admin)
            VALUES ($1, $2, 0)
            ON CONFLICT (numero_ordem) DO UPDATE SET password = EXCLUDED.password WHERE users.password IS NULL
          `, [mil.matricula, mil.cpf]);

        } else {
          // --- MILITAR EXISTENTE NA PLANILHA, MAS INEXISTENTE NO BANCO ---
          const insertRes = await client.query(`
            INSERT INTO EFETIVO
              (nome_completo, nome_guerra, posto_graduacao, matricula, numero_ordem, cpf, rgpm, opm, telefone, motorista, status_ativo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
            RETURNING id_militar
          `, [
            mil.nome,
            mil.nomeGuerra,
            mil.posto,
            mil.matricula,
            mil.nrOrdem,
            mil.cpf,
            mil.rgpm,
            mil.opm,
            mil.telefone,
            mil.motorista || 'Não'
          ]);

          stats.inserted++;
          insertedDetails.push({
            id_militar: insertRes.rows[0].id_militar,
            militar: `${mil.posto} ${mil.nomeGuerra || mil.nome}`,
            cpf: mil.cpf,
            matricula: mil.matricula
          });

          // Cria usuário em users
          await client.query(`
            INSERT INTO users (numero_ordem, password, is_admin)
            VALUES ($1, $2, 0)
            ON CONFLICT (numero_ordem) DO NOTHING
          `, [mil.matricula, mil.cpf]);
        }
      }

      // 3. Inativação lógica dos militares existentes no banco, mas ausentes na planilha
      for (const m of dbEfetivoRes.rows) {
        if (!processedDbIds.has(m.id_militar)) {
          if (m.status_ativo) {
            await client.query('UPDATE EFETIVO SET status_ativo = FALSE WHERE id_militar = $1', [m.id_militar]);
          }
          stats.deactivated++;
          deactivatedDetails.push({
            id_militar: m.id_militar,
            militar: `${m.posto_graduacao} ${m.nome_guerra || m.nome_completo}`,
            cpf: m.cpf,
            matricula: m.matricula,
            recem_inativado: !!m.status_ativo
          });
        }
      }
    });

    res.json({
      success: true,
      message: `Sincronização de efetivo concluída com sucesso: ${stats.updated} atualizados, ${stats.inserted} novos, ${stats.unchanged} inalterados, ${stats.deactivated} inativados.`,
      stats,
      details: {
        updated: updatedDetails.slice(0, 100),
        deactivated: deactivatedDetails,
        inserted: insertedDetails,
        errors: errorDetails.slice(0, 50)
      }
    });

  } catch (e) {
    console.error('[IMPORT SYNC FATAL]', e);
    res.status(500).json({ error: "Falha na sincronização do efetivo: " + e.message });
  }
};

module.exports = efetivoController;
