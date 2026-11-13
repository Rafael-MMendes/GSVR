'use strict';
const db = require('../db');
const { formatDateToISO, auditLog } = require('../utils/helpers');
const { recalculateMetas } = require('../services/ScaleOptimizationService');

const cicloController = {};

/**
 * GET /ciclos
 */
cicloController.getCiclos = async (req, res, next) => {
  try { 
    const query = `
      SELECT *, 
             (CASE EXTRACT(MONTH FROM data_inicio)
                WHEN 1 THEN 'Janeiro' WHEN 2 THEN 'Fevereiro' WHEN 3 THEN 'Março' WHEN 4 THEN 'Abril'
                WHEN 5 THEN 'Maio' WHEN 6 THEN 'Junho' WHEN 7 THEN 'Julho' WHEN 8 THEN 'Agosto'
                WHEN 9 THEN 'Setembro' WHEN 10 THEN 'Outubro' WHEN 11 THEN 'Novembro' WHEN 12 THEN 'Dezembro'
              END) || ' / ' ||
             (CASE EXTRACT(MONTH FROM data_fim)
                WHEN 1 THEN 'Janeiro' WHEN 2 THEN 'Fevereiro' WHEN 3 THEN 'Março' WHEN 4 THEN 'Abril'
                WHEN 5 THEN 'Maio' WHEN 6 THEN 'Junho' WHEN 7 THEN 'Julho' WHEN 8 THEN 'Agosto'
                WHEN 9 THEN 'Setembro' WHEN 10 THEN 'Outubro' WHEN 11 THEN 'Novembro' WHEN 12 THEN 'Dezembro'
              END) || ' - ' || TO_CHAR(data_inicio, 'YYYY') as period_name
      FROM vw_detalhes_ciclos 
      ORDER BY data_inicio DESC
    `;
    res.json(await db.all(query)); 
  }
  catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * GET /ciclos/:id
 */
cicloController.getCicloById = async (req, res, next) => {
  try {
    const ciclo = await db.get('SELECT * FROM CICLOS WHERE id_ciclo = $1', [req.params.id]);
    if (!ciclo) return res.status(404).json({ error: 'Ciclo não encontrado' });
    res.json(ciclo);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /ciclos
 */
cicloController.createCiclo = async (req, res, next) => {
  try {
    const { id_opm, data_inicio, data_fim, status, valor_total_previsto, valor_contingencia, limite_equipes_diario } = req.body;
    if (!data_inicio || !data_fim) return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    
    const resolvedStatus = status || 'Aberto';
    if (resolvedStatus === 'Aberto') {
      const active = await db.get("SELECT 1 FROM CICLOS WHERE status = 'Aberto'");
      if (active) return res.status(400).json({ error: "Já existe um ciclo ativo. Feche o ciclo atual antes de criar ou abrir outro." });
    }

    const dataInicioISO = formatDateToISO(data_inicio);
    const dataFimISO = formatDateToISO(data_fim);
    
    const r = await db.run(
      'INSERT INTO CICLOS (id_opm, data_inicio, data_fim, status, valor_total_previsto, valor_contingencia, ativo, limite_equipes_diario) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id_opm || null, dataInicioISO, dataFimISO, resolvedStatus, valor_total_previsto || 0, valor_contingencia || 0, resolvedStatus === 'Aberto', limite_equipes_diario || 6]
    );

    const idCiclo = r.lastID;
    // Automação: Upsert nas metas
    console.log(`[BACKEND] Novo ciclo criado: ${idCiclo}. Iniciando otimização de metas...`);
    await recalculateMetas(idCiclo);

    res.status(201).json({ success: true, id_ciclo: idCiclo });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /ciclos/:id
 */
cicloController.updateCiclo = async (req, res, next) => {
  try {
    const { id_opm, data_inicio, data_fim, status, valor_total_previsto, valor_contingencia, limite_equipes_diario } = req.body;
    if (!data_inicio || !data_fim) return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    
    const resolvedStatus = status || 'Aberto';
    if (resolvedStatus === 'Aberto') {
      const active = await db.get("SELECT 1 FROM CICLOS WHERE status = 'Aberto' AND id_ciclo != $1", [req.params.id]);
      if (active) return res.status(400).json({ error: "Já existe um ciclo ativo. Feche o ciclo atual antes de ativar este." });
    }

    const dataInicioISO = formatDateToISO(data_inicio);
    const dataFimISO = formatDateToISO(data_fim);
    
    const idCiclo = parseInt(req.params.id, 10);
    await db.run(
      'UPDATE CICLOS SET id_opm=$1, data_inicio=$2, data_fim=$3, status=$4, valor_total_previsto=$5, valor_contingencia=$6, ativo=$7, limite_equipes_diario=$8 WHERE id_ciclo=$9',
      [id_opm || null, dataInicioISO, dataFimISO, resolvedStatus, valor_total_previsto || 0, valor_contingencia || 0, resolvedStatus === 'Aberto', limite_equipes_diario || 6, idCiclo]
    );

    // Automação: Upsert nas metas
    console.log(`[BACKEND] Gatilho de otimização disparado para ciclo ${idCiclo} (Status: ${resolvedStatus})`);
    await recalculateMetas(idCiclo);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * DELETE /ciclos/:id
 */
cicloController.deleteCiclo = async (req, res, next) => {
  try {
    const hasReq = await db.get('SELECT 1 FROM REQUERIMENTOS WHERE id_ciclo = $1', [req.params.id]);
    if (hasReq) return res.status(400).json({ error: "Não é possível excluir: Ciclo possui requerimentos ativos." });
    const hasEscala = await db.get('SELECT 1 FROM ESCALA_PLANEJAMENTO WHERE id_ciclo = $1', [req.params.id]);
    if (hasEscala) return res.status(400).json({ error: "Não é possível excluir: Ciclo possui escalas registradas." });
    await db.run('DELETE FROM CICLOS WHERE id_ciclo = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * GET /ciclos/:id/metas
 */
cicloController.getCicloMetas = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM METAS_ALOCACAO WHERE id_ciclo = $1 ORDER BY data ASC', [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /metas/:id
 */
cicloController.updateMeta = async (req, res, next) => {
  try {
    const { qtd_equipes_planejadas, custo_estimado } = req.body;
    await db.run(
      'UPDATE METAS_ALOCACAO SET qtd_equipes_planejadas=$1, custo_estimado=$2 WHERE id_meta=$3',
      [qtd_equipes_planejadas, custo_estimado, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * DELETE /metas/:id
 */
cicloController.deleteMeta = async (req, res, next) => {
  try {
    await db.run('DELETE FROM METAS_ALOCACAO WHERE id_meta = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * GET /ciclos/:id/gastos-matriz
 */
cicloController.getGastosMatriz = async (req, res, next) => {
  try {
    const idCiclo = parseInt(req.params.id, 10);
    const ciclo = await db.get(`
      SELECT c.*, o.sigla as opm_sigla, o.descricao as opm_descricao
      FROM CICLOS c
      LEFT JOIN OPM o ON c.id_opm = o.id_opm
      WHERE c.id_ciclo = $1
    `, [idCiclo]);

    if (!ciclo) return res.status(404).json({ error: "Ciclo não encontrado." });

    const row = await db.get('SELECT * FROM PLANILHA_GASTOS_FT WHERE id_ciclo = $1', [idCiclo]);

    // Retorna a matriz salva se existir
    if (row && row.dados_matriz) {
      return res.json({
        id_ciclo: idCiclo,
        ciclo,
        dados_matriz: row.dados_matriz,
        valor_total_ft: parseFloat(row.valor_total_ft || ciclo.valor_total_previsto || 85000),
        pm_fora_6h: parseInt(row.pm_fora_6h || 0, 10),
        pm_fora_8h: parseInt(row.pm_fora_8h || 0, 10),
        updated_at: row.updated_at
      });
    }

    // Caso não exista ainda, gera a estrutura padrão de datas com base no ciclo
    const start = new Date(ciclo.data_inicio);
    const end = new Date(ciclo.data_fim);
    const columns = [];
    const MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

    let curr = new Date(start);
    let colIdx = 4;
    while (curr <= end) {
      const year = curr.getUTCFullYear();
      const month = curr.getUTCMonth();
      const day = curr.getUTCDate();
      const dataIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      columns.push({
        col_idx: colIdx++,
        mes: MESES[month],
        dia: day,
        data_iso: dataIso
      });
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const defaultShifts = [
      { id: "s1", horario: "14h às 20h", duracao: "6h", valor_diaria: 192.03, row: 14 },
      { id: "s2", horario: "18h às 00h", duracao: "6h", valor_diaria: 192.03, row: 15 },
      { id: "s3", horario: "20h às 02h", duracao: "6h", valor_diaria: 192.03, row: 16 },
      { id: "s4", horario: "14h às 22h", duracao: "8h", valor_diaria: 250.00, row: 17 },
      { id: "s5", horario: "18h às 02h", duracao: "8h", valor_diaria: 250.00, row: 18 }
    ];

    const matrix = {};
    defaultShifts.forEach(s => {
      matrix[s.id] = {};
      columns.forEach(c => {
        matrix[s.id][c.data_iso] = 0;
      });
    });

    res.json({
      id_ciclo: idCiclo,
      ciclo,
      dados_matriz: {
        columns,
        shifts: defaultShifts,
        matrix,
        valor_total_ft: parseFloat(ciclo.valor_total_previsto || 85000),
        pm_fora_6h: 0,
        pm_fora_8h: 0
      },
      valor_total_ft: parseFloat(ciclo.valor_total_previsto || 85000),
      pm_fora_6h: 0,
      pm_fora_8h: 0
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * POST /ciclos/:id/gastos-matriz
 */
cicloController.saveGastosMatriz = async (req, res, next) => {
  try {
    const idCiclo = parseInt(req.params.id, 10);
    const { dados_matriz, valor_total_ft, pm_fora_6h, pm_fora_8h } = req.body;

    if (!dados_matriz) {
      return res.status(400).json({ error: "dados_matriz é obrigatório." });
    }

    await db.run(`
      INSERT INTO PLANILHA_GASTOS_FT (id_ciclo, dados_matriz, valor_total_ft, pm_fora_6h, pm_fora_8h, updated_at)
      VALUES ($1, $2::jsonb, $3, $4, $5, NOW())
      ON CONFLICT (id_ciclo) DO UPDATE SET
        dados_matriz = EXCLUDED.dados_matriz,
        valor_total_ft = EXCLUDED.valor_total_ft,
        pm_fora_6h = EXCLUDED.pm_fora_6h,
        pm_fora_8h = EXCLUDED.pm_fora_8h,
        updated_at = NOW()
    `, [
      idCiclo,
      JSON.stringify(dados_matriz),
      valor_total_ft || 85000.00,
      pm_fora_6h || 0,
      pm_fora_8h || 0
    ]);

    res.json({ success: true, message: "Matriz de gastos salva com sucesso." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET /ciclos/:id/gastos-matriz/sync-escala
 */
cicloController.syncGastosEscala = async (req, res, next) => {
  try {
    const idCiclo = parseInt(req.params.id, 10);
    const { rows } = await db.query(`
      SELECT TO_CHAR(data_servico, 'YYYY-MM-DD') as data_iso,
             horario_servico,
             COUNT(DISTINCT id_guarnicao) as qtd_gu
      FROM ESCALA_PLANEJAMENTO
      WHERE id_ciclo = $1
      GROUP BY data_servico, horario_servico
      ORDER BY data_servico ASC
    `, [idCiclo]);

    res.json({ success: true, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET /ciclo-config
 */
cicloController.getCicloConfig = async (req, res, next) => {
    try {
      const config = await db.get(
        `SELECT * FROM CICLO_CONFIG ORDER BY vigente_desde DESC LIMIT 1`
      );
      res.json(config || { dia_inicio: 16, dia_fim: 15 });
    } catch (e) { res.status(500).json({ error: e.message }); }
  };

/**
 * PUT /ciclo-config
 */
cicloController.updateCicloConfig = async (req, res, next) => {
    try {
      const { dia_inicio, id_opm } = req.body;
      if (!dia_inicio || !Number.isInteger(Number(dia_inicio)) || dia_inicio < 2 || dia_inicio > 28) {
        return res.status(400).json({ error: 'dia_inicio deve ser inteiro entre 2 e 28.' });
      }
      await db.run(
        `INSERT INTO CICLO_CONFIG (dia_inicio, dia_fim, id_opm, vigente_desde)
         VALUES ($1, $2, $3, CURRENT_DATE)`,
        [parseInt(dia_inicio, 10), parseInt(dia_inicio, 10) - 1, id_opm || null]
      );
      res.json({ success: true, dia_inicio });
    } catch (e) { res.status(500).json({ error: e.message }); }
  };

module.exports = cicloController;
