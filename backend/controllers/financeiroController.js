'use strict';
const db = require('../db');
const { formatDateToISO } = require('../utils/helpers');

const financeiroController = {};

/**
 * GET /tipos-servico
 */
financeiroController.getTiposServico = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM TIPOS_SERVICO ORDER BY ativo DESC, carga_horaria ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /tipos-servico
 */
financeiroController.createTipoServico = async (req, res, next) => {
  try {
    const { descricao, carga_horaria, valor_remuneracao, ativo } = req.body;
    const { rows } = await db.query(
      'INSERT INTO TIPOS_SERVICO (descricao, carga_horaria, valor_remuneracao, ativo) VALUES ($1, $2, $3, $4) RETURNING *',
      [descricao, carga_horaria, valor_remuneracao, ativo ?? true]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /tipos-servico/:id
 */
financeiroController.updateTipoServico = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { descricao, carga_horaria, valor_remuneracao, ativo } = req.body;
    const { rows } = await db.query(
      'UPDATE TIPOS_SERVICO SET descricao = $1, carga_horaria = $2, valor_remuneracao = $3, ativo = $4 WHERE id_tipo_servico = $5 RETURNING *',
      [descricao, carga_horaria, valor_remuneracao, ativo, id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * GET /financeiro/resumo
 */
financeiroController.getFinanceiroResumo = async (req, res, next) => {
    try {
      const { id_ciclo } = req.query;

      // Buscar ciclo por ID ou usar o mais recente aberto
      const queryCicloStr = `
        SELECT 
          c.id_ciclo, 
          c.valor_total_previsto, 
          c.data_inicio, 
          c.data_fim,
          o.sigla as sigla_opm,
          TO_CHAR(c.data_inicio, 'MM/YYYY') as desc_referencia 
        FROM CICLOS c
        LEFT JOIN OPM o ON c.id_opm = o.id_opm
        WHERE ${id_ciclo ? 'c.id_ciclo = $1' : "c.status = 'Aberto'"}
        ORDER BY c.data_inicio DESC LIMIT 1
      `;
      
      const ciclo = await db.get(queryCicloStr, id_ciclo ? [id_ciclo] : []);
      
      if (!ciclo) {
        return res.status(404).json({ error: "Nenhum ciclo operacional encontrado para gerar o resumo." });
      }

      if (!ciclo.sigla_opm) {
        return res.status(400).json({ 
          error: "O ciclo selecionado não possui uma OPM (Unidade) vinculada.",
          code: "MISSING_OPM"
        });
      }

      let verba_ciclo = parseFloat(ciclo.valor_total_previsto || 0);

      // Obter dados dos serviços executados filtrados por OPM e Range do Ciclo
      const qGlobal = `
      SELECT
        COUNT(DISTINCT se.id_militar) as militares_unicos,
        COUNT(se.id_execucao) as total_militar_servicos,
        COALESCE(SUM(se.valor_remuneracao), 0) as total_gasto
      FROM SERVICOS_EXECUTADOS se
      WHERE se.id_ciclo = $1
        AND UPPER(TRIM(se.opm_origem)) = UPPER(TRIM($2))
        AND se.data_execucao BETWEEN $3 AND $4
      `;
      const resGlobal = await db.query(qGlobal, [ciclo.id_ciclo, ciclo.sigla_opm, ciclo.data_inicio, ciclo.data_fim]);

      // Obter agrupamento por Tipos de Serviço
      const qTipos = `
      SELECT
        ts.descricao,
        COUNT(se.id_execucao) as qtd_servicos,
        SUM(se.valor_remuneracao) as total_gasto_tipo
      FROM SERVICOS_EXECUTADOS se
      JOIN TIPOS_SERVICO ts ON se.id_tipo_servico = ts.id_tipo_servico
      WHERE se.id_ciclo = $1
        AND UPPER(TRIM(se.opm_origem)) = UPPER(TRIM($2))
        AND se.data_execucao BETWEEN $3 AND $4
      GROUP BY ts.descricao
      `;
      const resTipos = await db.query(qTipos, [ciclo.id_ciclo, ciclo.sigla_opm, ciclo.data_inicio, ciclo.data_fim]);

      const stats = resGlobal.rows[0] || { militares_unicos: 0, total_militar_servicos: 0, total_gasto: 0 };
      const total_gasto = parseFloat(stats.total_gasto || 0);
      const total_militar_servicos = Math.round(parseInt(stats.total_militar_servicos || 0) / 3);

      const detalhes_por_tipo = resTipos.rows.map(tipo => ({
        ...tipo,
        qtd_servicos: Math.round(parseInt(tipo.qtd_servicos || 0) / 3),
        total_gasto_tipo: parseFloat(tipo.total_gasto_tipo || 0)
      }));

      res.json({
        verba_ciclo,
        total_gasto,
        saldo_restante: verba_ciclo - total_gasto,
        percentual_utilizado: verba_ciclo > 0 ? (total_gasto / verba_ciclo) * 100 : 0,
        total_militar_servicos,
        total_militares_unicos: parseInt(stats.militares_unicos),
        detalhes_por_tipo,
        mes_selecionado: ciclo?.desc_referencia || '---'
      });
    } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
  };

/**
 * GET /financeiro/detalhado
 */
financeiroController.getFinanceiroDetalhado = async (req, res, next) => {
    try {
      const { id_ciclo } = req.query;
      
      const queryCicloStr = `
        SELECT c.id_ciclo, c.data_inicio, c.data_fim, o.sigla as sigla_opm
        FROM CICLOS c
        LEFT JOIN OPM o ON c.id_opm = o.id_opm
        WHERE ${id_ciclo ? 'c.id_ciclo = $1' : "c.status = 'Aberto'"}
        ORDER BY c.data_inicio DESC LIMIT 1
      `;
      const ciclo = await db.get(queryCicloStr, id_ciclo ? [id_ciclo] : []);
      
      if (!ciclo || !ciclo.sigla_opm) {
        return res.json({ detalhes_diarios: [], top_militares: [] });
      }

      const qDiario = `
      SELECT TO_CHAR(se.data_execucao, 'DD/MM') as data,
             COUNT(*) as servicos,
             SUM(se.valor_remuneracao) as gasto
      FROM SERVICOS_EXECUTADOS se
      WHERE se.id_ciclo = $1
        AND UPPER(TRIM(se.opm_origem)) = UPPER(TRIM($2))
        AND se.data_execucao BETWEEN $3 AND $4
      GROUP BY se.data_execucao ORDER BY se.data_execucao ASC
    `;
      const resDiario = await db.query(qDiario, [ciclo.id_ciclo, ciclo.sigla_opm, ciclo.data_inicio, ciclo.data_fim]);
      let acumuladoTotal = 0;
      const detalhes_diarios = resDiario.rows.map(row => {
        const gasto = parseFloat(row.gasto);
        acumuladoTotal += gasto;
        return { data: row.data, servicos: Math.round(parseInt(row.servicos || 0) / 3), gasto, acumulado: acumuladoTotal };
      });

      const qTop = `
      SELECT e.matricula as id, e.nome_guerra as name,
             COUNT(*) as servicos,
             SUM(se.valor_remuneracao) as gasto
      FROM SERVICOS_EXECUTADOS se
      JOIN EFETIVO e ON se.id_militar = e.id_militar
      WHERE se.id_ciclo = $1
        AND UPPER(TRIM(se.opm_origem)) = UPPER(TRIM($2))
        AND se.data_execucao BETWEEN $3 AND $4
      GROUP BY e.matricula, e.nome_guerra
      ORDER BY gasto DESC LIMIT 10
    `;
      const resTop = await db.query(qTop, [ciclo.id_ciclo, ciclo.sigla_opm, ciclo.data_inicio, ciclo.data_fim]);
      res.json({
        detalhes_diarios,
        top_militares: resTop.rows.map(r => ({ ...r, servicos: parseInt(r.servicos), gasto: parseFloat(r.gasto) }))
      });
    } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
  };

module.exports = financeiroController;
