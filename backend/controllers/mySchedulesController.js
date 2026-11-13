'use strict';
const db = require('../db');
const { getMilitarFromUser, formatDateToISO, normalizeRank } = require('../utils/helpers');

const mySchedulesController = {};

/**
 * GET /my-schedules
 */
mySchedulesController.getMySchedules = async (req, res, next) => {
  try {
    const militar = await getMilitarFromUser(req.user);
    if (!militar) {
      return res.json({
        success: true,
        military: null,
        summary: {
          total_futuras: 0,
          total_mes_atual: 0,
          total_realizadas_mes: 0,
          proxima_escala: null,
          total_geral: 0
        },
        schedules: []
      });
    }

    const { startDate, endDate, month, year, situacao, search, ciclo_id } = req.query;

    // 1.0 Obter ciclo de referência (ciclo ativo por padrão ou filtrado)
    let cicloRef = null;
    if (ciclo_id && ciclo_id !== 'all') {
      cicloRef = await db.get(`
        SELECT id_ciclo, data_inicio, data_fim, status,
               TO_CHAR(data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(data_fim, 'DD/MM/YYYY') as periodo_ciclo
        FROM CICLOS WHERE id_ciclo = $1
      `, [parseInt(ciclo_id, 10)]);
    }
    if (!cicloRef) {
      cicloRef = await db.get(`
        SELECT id_ciclo, data_inicio, data_fim, status,
               TO_CHAR(data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(data_fim, 'DD/MM/YYYY') as periodo_ciclo
        FROM CICLOS
        WHERE status = 'Aberto' OR (CURRENT_DATE BETWEEN data_inicio AND data_fim)
        ORDER BY ativo DESC, data_inicio DESC
        LIMIT 1
      `);
    }

    // 1.1 Cálculo dos Indicadores Resumidos (sempre sobre o total do militar autenticado)
    const summaryRow = await db.get(`
      SELECT
        COUNT(CASE WHEN ep.data_servico >= CURRENT_DATE THEN 1 END) as total_futuras,
        COUNT(CASE WHEN ep.id_ciclo = $2 THEN 1 END) as total_escalas_ciclo,
        COUNT(CASE WHEN ep.id_ciclo = $2 AND (ep.data_servico < CURRENT_DATE OR se.id_execucao IS NOT NULL) THEN 1 END) as total_executadas_ciclo_ep,
        COUNT(CASE WHEN EXTRACT(MONTH FROM ep.data_servico) = EXTRACT(MONTH FROM CURRENT_DATE) 
                    AND EXTRACT(YEAR FROM ep.data_servico) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as total_mes_atual,
        COUNT(CASE WHEN EXTRACT(MONTH FROM ep.data_servico) = EXTRACT(MONTH FROM CURRENT_DATE) 
                    AND EXTRACT(YEAR FROM ep.data_servico) = EXTRACT(YEAR FROM CURRENT_DATE)
                    AND (ep.data_servico < CURRENT_DATE OR se.id_execucao IS NOT NULL) THEN 1 END) as total_realizadas_mes,
        COUNT(*) as total_geral
      FROM ESCALA_PLANEJAMENTO ep
      LEFT JOIN ESCALA_EFETIVO_SERVICO ees ON ep.id_escala = ees.id_escala
      LEFT JOIN SERVICOS_EXECUTADOS se ON ees.id_execucao = se.id_execucao
      WHERE ep.id_militar = $1
        AND (ep.publicado IS NULL OR ep.publicado = TRUE)
    `, [militar.id_militar, cicloRef?.id_ciclo || 0]);

    const servicosExecutadosRow = await db.get(`
      SELECT COUNT(DISTINCT se.id_execucao) as total_se
      FROM SERVICOS_EXECUTADOS se
      WHERE se.id_militar = $1 AND se.id_ciclo = $2
    `, [militar.id_militar, cicloRef?.id_ciclo || 0]);

    const totalExecutadasCiclo = Math.max(
      parseInt(summaryRow?.total_executadas_ciclo_ep || 0, 10),
      parseInt(servicosExecutadosRow?.total_se || 0, 10)
    );

    // 1.2 Próxima escala programada
    const proximaEscala = await db.get(`
      SELECT 
        ep.id_escala,
        ep.id_guarnicao,
        ep.data_servico,
        TO_CHAR(ep.data_servico, 'YYYY-MM-DD') as data_iso,
        TO_CHAR(ep.data_servico, 'DD/MM/YYYY') as data_formatada,
        EXTRACT(DOW FROM ep.data_servico)::int as dia_semana_num,
        ep.horario_servico,
        ep.horario_embarque,
        ep.nome_recurso,
        ep.funcao,
        ep.observacoes,
        ts.descricao as tipo_servico,
        ts.carga_horaria,
        ts.valor_remuneracao,
        c.id_ciclo,
        o.sigla as opm_sigla
      FROM ESCALA_PLANEJAMENTO ep
      JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
      LEFT JOIN OPM o ON c.id_opm = o.id_opm
      LEFT JOIN TIPOS_SERVICO ts ON ep.id_tipo_servico = ts.id_tipo_servico
      WHERE ep.id_militar = $1
        AND ep.data_servico >= CURRENT_DATE
        AND (ep.publicado IS NULL OR ep.publicado = TRUE)
      ORDER BY ep.data_servico ASC, ep.horario_servico ASC
      LIMIT 1
    `, [militar.id_militar]);

    // Busca equipe/guarnição da próxima escala para exibir no card resumo
    let proximaGuarnicao = [];
    if (proximaEscala) {
      if (proximaEscala.id_guarnicao) {
        const eqRows = await db.all(`
          SELECT 
            ep2.id_escala,
            ep2.funcao,
            e.posto_graduacao,
            e.nome_guerra,
            (ep2.id_militar = $1) as is_current_user
          FROM ESCALA_PLANEJAMENTO ep2
          JOIN EFETIVO e ON ep2.id_militar = e.id_militar
          WHERE ep2.id_guarnicao = $2
            AND (ep2.publicado IS NULL OR ep2.publicado = TRUE)
          ORDER BY 
            CASE ep2.funcao 
              WHEN 'Comandante' THEN 1 
              WHEN 'Motorista' THEN 2 
              WHEN 'Patrulheiro' THEN 3 
              ELSE 4 
            END
        `, [militar.id_militar, proximaEscala.id_guarnicao]);
        proximaGuarnicao = eqRows || [];
      } else {
        const eqRows = await db.all(`
          SELECT 
            ep2.id_escala,
            ep2.funcao,
            e.posto_graduacao,
            e.nome_guerra,
            (ep2.id_militar = $1) as is_current_user
          FROM ESCALA_PLANEJAMENTO ep2
          JOIN EFETIVO e ON ep2.id_militar = e.id_militar
          WHERE ep2.id_ciclo = $2
            AND ep2.data_servico = $3
            AND ep2.nome_recurso = $4
            AND ep2.horario_servico = $5
            AND (ep2.publicado IS NULL OR ep2.publicado = TRUE)
          ORDER BY 
            CASE ep2.funcao 
              WHEN 'Comandante' THEN 1 
              WHEN 'Motorista' THEN 2 
              WHEN 'Patrulheiro' THEN 3 
              ELSE 4 
            END
        `, [militar.id_militar, proximaEscala.id_ciclo, proximaEscala.data_servico, proximaEscala.nome_recurso, proximaEscala.horario_servico]);
        proximaGuarnicao = eqRows || [];
      }
    }

    // 1.3 Construção da consulta filtrada para listagem
    let queryConditions = [
      'ep.id_militar = $1',
      '(ep.publicado IS NULL OR ep.publicado = TRUE)'
    ];
    let queryParams = [militar.id_militar];
    let paramIndex = 2;

    if (startDate) {
      queryConditions.push(`ep.data_servico >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryConditions.push(`ep.data_servico <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    if (month && !isNaN(parseInt(month, 10))) {
      queryConditions.push(`EXTRACT(MONTH FROM ep.data_servico) = $${paramIndex}`);
      queryParams.push(parseInt(month, 10));
      paramIndex++;
    }

    if (year && !isNaN(parseInt(year, 10))) {
      queryConditions.push(`EXTRACT(YEAR FROM ep.data_servico) = $${paramIndex}`);
      queryParams.push(parseInt(year, 10));
      paramIndex++;
    }

    if (ciclo_id && ciclo_id !== 'all') {
      queryConditions.push(`ep.id_ciclo = $${paramIndex}`);
      queryParams.push(parseInt(ciclo_id, 10));
      paramIndex++;
    }

    if (search && search.trim()) {
      queryConditions.push(`(
        LOWER(ep.nome_recurso) LIKE LOWER($${paramIndex}) OR 
        LOWER(ts.descricao) LIKE LOWER($${paramIndex}) OR
        LOWER(ep.funcao) LIKE LOWER($${paramIndex}) OR
        LOWER(ep.horario_servico) LIKE LOWER($${paramIndex})
      )`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (situacao && situacao !== 'todas') {
      if (situacao === 'futuras' || situacao === 'confirmadas') {
        queryConditions.push('ep.data_servico > CURRENT_DATE');
      } else if (situacao === 'hoje') {
        queryConditions.push('ep.data_servico = CURRENT_DATE');
      } else if (situacao === 'realizadas') {
        queryConditions.push('(ep.data_servico < CURRENT_DATE OR se.id_execucao IS NOT NULL)');
      }
    }

    const schedulesSql = `
      SELECT 
        ep.id_escala,
        ep.id_ciclo,
        ep.id_militar,
        ep.id_guarnicao,
        ep.data_servico,
        TO_CHAR(ep.data_servico, 'YYYY-MM-DD') as data_iso,
        TO_CHAR(ep.data_servico, 'DD/MM/YYYY') as data_formatada,
        EXTRACT(DOW FROM ep.data_servico)::int as dia_semana_num,
        ep.horario_servico,
        ep.horario_embarque,
        ep.nome_recurso,
        ep.funcao,
        ep.observacoes,
        ep.publicado,
        ts.id_tipo_servico,
        ts.descricao as tipo_servico,
        ts.carga_horaria,
        ts.valor_remuneracao,
        c.status as status_ciclo,
        TO_CHAR(c.data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(c.data_fim, 'DD/MM/YYYY') as periodo_ciclo,
        o.sigla as opm_sigla,
        ees.status as status_vinculo,
        se.id_execucao,
        se.status_presenca,
        se.valor_remuneracao as valor_executado,
        CASE
          WHEN ep.publicado = FALSE THEN 'Rascunho'
          WHEN se.id_execucao IS NOT NULL THEN 'Realizada'
          WHEN ep.data_servico > CURRENT_DATE THEN 'Confirmada'
          WHEN ep.data_servico = CURRENT_DATE THEN 'Hoje'
          ELSE 'Realizada'
        END as situacao
      FROM ESCALA_PLANEJAMENTO ep
      JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
      LEFT JOIN OPM o ON c.id_opm = o.id_opm
      LEFT JOIN TIPOS_SERVICO ts ON ep.id_tipo_servico = ts.id_tipo_servico
      LEFT JOIN ESCALA_EFETIVO_SERVICO ees ON ep.id_escala = ees.id_escala
      LEFT JOIN SERVICOS_EXECUTADOS se ON ees.id_execucao = se.id_execucao
      WHERE ${queryConditions.join(' AND ')}
      ORDER BY ep.data_servico DESC, ep.horario_servico ASC
    `;

    const { rows: schedules } = await db.query(schedulesSql, queryParams);

    // Mapeamento dos dias da semana em português
    const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const formattedSchedules = schedules.map(item => ({
      ...item,
      dia_semana_extenso: DIAS_SEMANA[item.dia_semana_num] || ''
    }));

    const formattedProxima = proximaEscala ? {
      ...proximaEscala,
      dia_semana_extenso: DIAS_SEMANA[proximaEscala.dia_semana_num] || '',
      guarnicao: proximaGuarnicao
    } : null;

    res.json({
      success: true,
      military: {
        id_militar: militar.id_militar,
        nome_completo: militar.nome_completo,
        nome_guerra: militar.nome_guerra,
        posto_graduacao: militar.posto_graduacao,
        matricula: militar.matricula,
        opm: militar.opm
      },
      summary: {
        total_futuras: parseInt(summaryRow?.total_futuras || 0, 10),
        total_escalas_ciclo: parseInt(summaryRow?.total_escalas_ciclo || 0, 10),
        total_executadas_ciclo: totalExecutadasCiclo,
        periodo_ciclo: cicloRef?.periodo_ciclo || '',
        id_ciclo_atual: cicloRef?.id_ciclo || null,
        total_mes_atual: parseInt(summaryRow?.total_mes_atual || 0, 10),
        total_realizadas_mes: parseInt(summaryRow?.total_realizadas_mes || 0, 10),
        total_geral: parseInt(summaryRow?.total_geral || 0, 10),
        proxima_escala: formattedProxima
      },
      schedules: formattedSchedules
    });
  } catch (e) {
    console.error('[API] Erro ao buscar escalas do usuário:', e);
    res.status(500).json({ success: false, error: { message: e.message } });
  }
};

/**
 * GET /my-schedules/:id
 */
mySchedulesController.getMyScheduleById = async (req, res, next) => {
  try {
    const militar = await getMilitarFromUser(req.user);
    if (!militar) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Vínculo militar não localizado para sua conta de usuário.' }
      });
    }

    const escalaId = parseInt(req.params.id, 10);
    if (isNaN(escalaId)) {
      return res.status(400).json({ success: false, error: { message: 'Identificador de escala inválido.' } });
    }

    // Consulta com validação rígida de propriedade no banco
    const escala = await db.get(`
      SELECT 
        ep.id_escala,
        ep.id_ciclo,
        ep.id_militar,
        ep.id_guarnicao,
        ep.data_servico,
        TO_CHAR(ep.data_servico, 'YYYY-MM-DD') as data_iso,
        TO_CHAR(ep.data_servico, 'DD/MM/YYYY') as data_formatada,
        EXTRACT(DOW FROM ep.data_servico)::int as dia_semana_num,
        ep.horario_servico,
        ep.horario_embarque,
        ep.nome_recurso,
        ep.funcao,
        ep.observacoes,
        ep.publicado,
        ts.id_tipo_servico,
        ts.descricao as tipo_servico,
        ts.carga_horaria,
        ts.valor_remuneracao,
        c.status as status_ciclo,
        TO_CHAR(c.data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(c.data_fim, 'DD/MM/YYYY') as periodo_ciclo,
        o.sigla as opm_sigla,
        o.descricao as opm_descricao,
        ees.status as status_vinculo,
        se.id_execucao,
        se.status_presenca,
        se.carga_horaria as execucao_carga_horaria,
        se.valor_remuneracao as valor_executado,
        CASE
          WHEN ep.publicado = FALSE THEN 'Rascunho'
          WHEN se.id_execucao IS NOT NULL THEN 'Realizada'
          WHEN ep.data_servico > CURRENT_DATE THEN 'Confirmada'
          WHEN ep.data_servico = CURRENT_DATE THEN 'Hoje'
          ELSE 'Realizada'
        END as situacao
      FROM ESCALA_PLANEJAMENTO ep
      JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
      LEFT JOIN OPM o ON c.id_opm = o.id_opm
      LEFT JOIN TIPOS_SERVICO ts ON ep.id_tipo_servico = ts.id_tipo_servico
      LEFT JOIN ESCALA_EFETIVO_SERVICO ees ON ep.id_escala = ees.id_escala
      LEFT JOIN SERVICOS_EXECUTADOS se ON ees.id_execucao = se.id_execucao
      WHERE ep.id_escala = $1 
        AND ep.id_militar = $2
        AND (ep.publicado IS NULL OR ep.publicado = TRUE)
    `, [escalaId, militar.id_militar]);

    if (!escala) {
      // Isolamento: Impede acesso a escalas de outros usuários
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Acesso negado: você não tem permissão para visualizar esta escala ou ela não existe.' }
      });
    }

    const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    escala.dia_semana_extenso = DIAS_SEMANA[escala.dia_semana_num] || '';

    // Busca equipe/guarnição da mesma escala (sem expor dados pessoais sensíveis como CPF ou telefone)
    let equipe = [];
    if (escala.id_guarnicao) {
      const eqRows = await db.all(`
        SELECT 
          ep2.id_escala,
          ep2.funcao,
          e.posto_graduacao,
          e.nome_guerra,
          (ep2.id_militar = $1) as is_current_user
        FROM ESCALA_PLANEJAMENTO ep2
        JOIN EFETIVO e ON ep2.id_militar = e.id_militar
        WHERE ep2.id_guarnicao = $2
          AND (ep2.publicado IS NULL OR ep2.publicado = TRUE)
        ORDER BY 
          CASE ep2.funcao 
            WHEN 'Comandante' THEN 1 
            WHEN 'Motorista' THEN 2 
            WHEN 'Patrulheiro' THEN 3 
            ELSE 4 
          END
      `, [militar.id_militar, escala.id_guarnicao]);
      equipe = eqRows || [];
    } else {
      const eqRows = await db.all(`
        SELECT 
          ep2.id_escala,
          ep2.funcao,
          e.posto_graduacao,
          e.nome_guerra,
          (ep2.id_militar = $1) as is_current_user
        FROM ESCALA_PLANEJAMENTO ep2
        JOIN EFETIVO e ON ep2.id_militar = e.id_militar
        WHERE ep2.id_ciclo = $2
          AND ep2.data_servico = $3
          AND ep2.nome_recurso = $4
          AND ep2.horario_servico = $5
          AND (ep2.publicado IS NULL OR ep2.publicado = TRUE)
        ORDER BY 
          CASE ep2.funcao 
            WHEN 'Comandante' THEN 1 
            WHEN 'Motorista' THEN 2 
            WHEN 'Patrulheiro' THEN 3 
            ELSE 4 
          END
      `, [militar.id_militar, escala.id_ciclo, escala.data_servico, escala.nome_recurso, escala.horario_servico]);
      equipe = eqRows || [];
    }

    res.json({
      success: true,
      data: {
        ...escala,
        equipe
      }
    });
  } catch (e) {
    console.error('[API] Erro ao detalhar escala do usuário:', e);
    res.status(500).json({ success: false, error: { message: e.message } });
  }
};

module.exports = mySchedulesController;
