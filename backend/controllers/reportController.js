'use strict';
const db = require('../db');
const { formatDateToISO, normalizeRank } = require('../utils/helpers');

const reportController = {};

/**
 * GET /reports/operacional-detalhado
 */
reportController.getOperacionalDetalhado = async (req, res, next) => {
  try {
    const { ciclo_id } = req.query;
    let whereCiclo = '';
    let params = [];
    
    if (ciclo_id && ciclo_id !== 'all') {
      whereCiclo = 'WHERE f.id_ciclo = $1';
      params.push(ciclo_id);
    }

    const query = `
      WITH Comp AS (
        -- Cruzamento Planejamento x Execução via Tabela Ternária
        SELECT 
          COALESCE(ep.id_militar, se.id_militar) as id_militar,
          COALESCE(ep.id_ciclo, se.id_ciclo) as id_ciclo,
          COALESCE(ep.data_servico, se.data_execucao) as data_ref,
          ep.id_escala,
          se.id_execucao,
          ep.nome_recurso as recurso_planejado,
          se.guarnicao as recurso_executado,
          ep.funcao as funcao_planejada,
          CASE 
            WHEN ep.id_escala IS NOT NULL AND se.id_execucao IS NOT NULL THEN 'Planejado e Executado'
            WHEN ep.id_escala IS NOT NULL AND se.id_execucao IS NULL THEN 
              CASE WHEN ep.data_servico > CURRENT_DATE THEN 'Planejado' ELSE 'Planejado e não Executado' END
            WHEN ep.id_escala IS NULL AND se.id_execucao IS NOT NULL THEN 'Executado e não Planejado'
          END as status_op,
          dr.observacoes
        FROM ESCALA_PLANEJAMENTO ep
        FULL OUTER JOIN ESCALA_EFETIVO_SERVICO ees ON ep.id_escala = ees.id_escala
        FULL OUTER JOIN SERVICOS_EXECUTADOS se ON ees.id_execucao = se.id_execucao
        LEFT JOIN DISPONIBILIDADE_REQUERIMENTO dr ON ep.id_disponibilidade = dr.id_disponibilidade
      ),
      Desistencias AS (
        -- Militares que desistiram do requerimento (ativo=false)
        SELECT 
          r.id_militar,
          r.id_ciclo,
          dr.dia_mes as data_ref,
          NULL::integer as id_escala,
          NULL::integer as id_execucao,
          NULL as recurso_planejado,
          NULL as recurso_executado,
          NULL as funcao_planejada,
          'Desistência de Requerimento' as status_op,
          dr.observacoes
        FROM DISPONIBILIDADE_REQUERIMENTO dr
        JOIN REQUERIMENTOS r ON dr.id_requerimento = r.id_requerimento
        JOIN CICLOS c ON r.id_ciclo = c.id_ciclo
        WHERE dr.ativo = false
      ),
      Final AS (
        SELECT * FROM Comp
        UNION ALL
        SELECT * FROM Desistencias
      )
      SELECT 
        f.*,
        e.matricula,
        e.nome_guerra,
        e.nome_completo,
        e.posto_graduacao,
        TO_CHAR(f.data_ref, 'DD/MM/YYYY') as data_formatada,
        TO_CHAR(c.data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(c.data_fim, 'DD/MM/YYYY') as periodo_ciclo,
        (
          SELECT COUNT(DISTINCT dr2.dia_mes)
          FROM DISPONIBILIDADE_REQUERIMENTO dr2
          JOIN REQUERIMENTOS r2 ON dr2.id_requerimento = r2.id_requerimento
          WHERE r2.id_militar = f.id_militar
            AND r2.id_ciclo   = f.id_ciclo
            AND dr2.marcado_disponivel = true
        ) as dias_disponiveis
      FROM Final f
      JOIN EFETIVO e ON f.id_militar = e.id_militar
      JOIN CICLOS c ON f.id_ciclo = c.id_ciclo
      ${whereCiclo}
      ORDER BY f.data_ref DESC, e.nome_guerra ASC
    `;

    const rows = await db.all(query, params);
    res.json(rows);
  } catch (e) {
    console.error('[API] Erro no relatório operacional:', e);
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET /reports/disponibilidade-grid
 */
reportController.getDisponibilidadeGrid = async (req, res, next) => {
  try {
    const { id_militar, ciclo_id } = req.query;
    if (!id_militar || !ciclo_id) {
      return res.status(400).json({ error: 'id_militar e ciclo_id são obrigatórios.' });
    }

    const rows = await db.all(`
      SELECT 
        dia_mes,
        horario_turno,
        BOOL_OR(marcado_disponivel) as marcado_disponivel,
        BOOL_OR(ativo) as ativo,
        BOOL_OR(marcado_servico_ordinario) as marcado_servico_ordinario,
        BOOL_OR(teve_execucao) as teve_execucao
      FROM (
        SELECT
          TO_CHAR(dr.dia_mes, 'YYYY-MM-DD') as dia_mes,
          dr.horario_turno,
          dr.marcado_disponivel,
          dr.ativo,
          dr.marcado_servico_ordinario,
          EXISTS (
            SELECT 1
            FROM SERVICOS_EXECUTADOS se
            WHERE se.id_militar = r.id_militar
              AND se.id_ciclo   = r.id_ciclo
              AND se.data_execucao = dr.dia_mes
          ) AS teve_execucao
        FROM DISPONIBILIDADE_REQUERIMENTO dr
        JOIN REQUERIMENTOS r ON dr.id_requerimento = r.id_requerimento
        WHERE r.id_militar = $1
          AND r.id_ciclo   = $2

        UNION ALL

        SELECT 
          TO_CHAR(se.data_execucao, 'YYYY-MM-DD') as dia_mes,
          t.turno as horario_turno,
          true as marcado_disponivel,
          true as ativo,
          false as marcado_servico_ordinario,
          true as teve_execucao
        FROM SERVICOS_EXECUTADOS se
        CROSS JOIN (
          SELECT '07:00 ÀS 13:00' as turno
          UNION ALL SELECT '13:00 ÀS 19:00'
          UNION ALL SELECT '19:00 ÀS 01:00'
          UNION ALL SELECT '01:00 ÀS 07:00'
        ) t
        WHERE se.id_militar = $1
          AND se.id_ciclo = $2
      ) sub
      GROUP BY dia_mes, horario_turno
      ORDER BY dia_mes ASC, horario_turno ASC
    `, [id_militar, ciclo_id]);

    res.json(rows);
  } catch (e) {
    console.error('[API] Erro na grade de disponibilidade:', e);
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET /reports/escalas-planejadas
 */
reportController.getEscalasPlanejadas = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        ep.id_escala, 
        ep.id_ciclo,
        TO_CHAR(ep.data_servico, 'DD/MM/YYYY') as data_formatada,
        ep.data_servico,
        ep.horario_servico, 
        ep.nome_recurso, 
        ep.funcao,
        e.matricula, 
        e.posto_graduacao, 
        e.nome_guerra, 
        TO_CHAR(c.data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(c.data_fim, 'DD/MM/YYYY') as ciclo,
        c.status as status_ciclo,
        ts.descricao as tipo_servico,
        ts.carga_horaria,
        ts.valor_remuneracao,
        CASE WHEN ep.id_disponibilidade IS NOT NULL THEN 'Voluntário' ELSE 'Compulsório' END as tipo_escalacao
      FROM ESCALA_PLANEJAMENTO ep
      JOIN EFETIVO e ON ep.id_militar = e.id_militar
      JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
      LEFT JOIN TIPOS_SERVICO ts ON ep.id_tipo_servico = ts.id_tipo_servico
      ORDER BY c.data_inicio DESC, ep.data_servico DESC, ep.nome_recurso ASC, ep.funcao ASC
    `);
    res.json(rows);
  } catch (e) {
    console.error('[API] Erro detalhado escalas:', e);
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET /reports/conferencia
 */
reportController.getConferencia = async (req, res, next) => {
  try {
    const { ciclo_id } = req.query;
    if (!ciclo_id) return res.status(400).json({ error: 'ciclo_id é obrigatório.' });

    const query = `
      WITH planejados AS (
        SELECT
          ep.id_escala,
          ep.id_militar,
          ep.data_servico,
          ep.horario_servico,
          ep.nome_recurso,
          ep.funcao,
          e.nome_guerra,
          e.posto_graduacao,
          e.matricula,
          e.opm
        FROM ESCALA_PLANEJAMENTO ep
        JOIN EFETIVO e ON ep.id_militar = e.id_militar
        WHERE ep.id_ciclo = $1
      ),
      executados AS (
        SELECT
          se.id_execucao,
          se.id_militar,
          se.data_execucao,
          se.carga_horaria,
          se.status_presenca,
          se.guarnicao,
          se.opm_origem,
          e.nome_guerra,
          e.posto_graduacao,
          e.matricula,
          e.opm
        FROM SERVICOS_EXECUTADOS se
        JOIN EFETIVO e ON se.id_militar = e.id_militar
        JOIN CICLOS c ON se.id_ciclo = c.id_ciclo
        LEFT JOIN OPM o ON c.id_opm = o.id_opm
        WHERE se.id_ciclo = $1
          AND (
            o.sigla IS NULL 
            OR UPPER(TRIM(se.opm_origem)) = UPPER(TRIM(o.sigla))
            OR REGEXP_REPLACE(UPPER(TRIM(se.opm_origem)), '[^0-9A-Z]', '', 'g') = REGEXP_REPLACE(UPPER(TRIM(o.sigla)), '[^0-9A-Z]', '', 'g')
          )
      )
      SELECT
        TO_CHAR(COALESCE(p.data_servico, x.data_execucao), 'YYYY-MM-DD') AS data,
        TO_CHAR(COALESCE(p.data_servico, x.data_execucao), 'DD/MM/YYYY') AS data_formatada,
        COALESCE(x.opm_origem, p.opm, x.opm) AS opm,
        p.id_escala,
        p.nome_recurso   AS guarnicao_planejada,
        p.horario_servico,
        p.funcao,
        p.id_militar      AS mil_planejado,
        p.nome_guerra     AS nome_planejado,
        p.posto_graduacao AS grad_planejada,
        p.matricula       AS mat_planejada,
        x.id_execucao,
        x.guarnicao       AS guarnicao_executada,
        x.carga_horaria,
        x.status_presenca,
        x.id_militar      AS mil_executado,
        x.nome_guerra     AS nome_executado,
        x.posto_graduacao AS grad_executada,
        x.matricula       AS mat_executada,
        CASE
          WHEN p.id_escala IS NOT NULL AND x.id_execucao IS NOT NULL THEN 'OK'
          WHEN p.id_escala IS NOT NULL AND x.id_execucao IS NULL THEN
            CASE WHEN p.data_servico > CURRENT_DATE THEN 'Futuro' ELSE 'Falta' END
          WHEN p.id_escala IS NULL AND x.id_execucao IS NOT NULL THEN 'Extra'
        END AS status_conferencia
      FROM planejados p
      FULL OUTER JOIN executados x
        ON p.id_militar = x.id_militar AND p.data_servico = x.data_execucao
      ORDER BY COALESCE(p.data_servico, x.data_execucao) ASC,
               COALESCE(p.nome_recurso, x.guarnicao) ASC,
               p.funcao ASC
    `;

    const { rows } = await db.query(query, [ciclo_id]);

    // Build summary KPIs
    let totalPlanejados = 0, totalExecutados = 0, totalOK = 0, totalFaltas = 0, totalExtras = 0, totalFuturos = 0;
    const porDia = {};
    const porMilitar = {};

    rows.forEach(r => {
      if (r.id_escala) totalPlanejados++;
      if (r.id_execucao) totalExecutados++;

      if (r.status_conferencia === 'OK') totalOK++;
      else if (r.status_conferencia === 'Falta') totalFaltas++;
      else if (r.status_conferencia === 'Extra') totalExtras++;
      else if (r.status_conferencia === 'Futuro') totalFuturos++;

      // Per-day aggregation
      const dia = r.data;
      if (!porDia[dia]) porDia[dia] = { ok: 0, falta: 0, extra: 0, futuro: 0, total: 0 };
      porDia[dia].total++;
      if (r.status_conferencia === 'OK') porDia[dia].ok++;
      else if (r.status_conferencia === 'Falta') porDia[dia].falta++;
      else if (r.status_conferencia === 'Extra') porDia[dia].extra++;
      else if (r.status_conferencia === 'Futuro') porDia[dia].futuro++;

      // Per-military aggregation
      const milId = r.mil_planejado || r.mil_executado;
      const milNome = r.nome_planejado || r.nome_executado;
      const milGrad = r.grad_planejada || r.grad_executada;
      const milMat = r.mat_planejada || r.mat_executada;
      if (milId) {
        if (!porMilitar[milId]) porMilitar[milId] = { id: milId, nome: milNome, grad: milGrad, matricula: milMat, ok: 0, falta: 0, extra: 0, futuro: 0, planejados: 0, executados: 0 };
        if (r.id_escala) porMilitar[milId].planejados++;
        if (r.id_execucao) porMilitar[milId].executados++;
        if (r.status_conferencia === 'OK') porMilitar[milId].ok++;
        else if (r.status_conferencia === 'Falta') porMilitar[milId].falta++;
        else if (r.status_conferencia === 'Extra') porMilitar[milId].extra++;
        else if (r.status_conferencia === 'Futuro') porMilitar[milId].futuro++;
      }
    });

    const relevantes = totalOK + totalFaltas;
    const taxaAderencia = relevantes > 0 ? Math.round((totalOK / relevantes) * 100) : 0;

    res.json({
      registros: rows,
      resumo: {
        totalPlanejados,
        totalExecutados,
        totalOK,
        totalFaltas,
        totalExtras,
        totalFuturos,
        taxaAderencia
      },
      porDia,
      porMilitar: Object.values(porMilitar)
    });
  } catch (e) {
    console.error('[API] Erro na conferência operacional:', e);
    res.status(500).json({ error: e.message });
  }
};

module.exports = reportController;
