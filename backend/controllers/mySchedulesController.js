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
        ep.ciente_em,
        ep.ciente_ip,
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
        ep.ciente_em,
        ep.ciente_ip,
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

/**
 * POST /my-schedules/:id/ciente (M14)
 * Registra confirmação de ciência do militar na escala planejada.
 */
mySchedulesController.confirmarCiente = async (req, res, next) => {
  try {
    const militar = await getMilitarFromUser(req.user);
    if (!militar) return res.status(403).json({ error: 'Usuário sem vínculo de efetivo.' });

    const escalaId = parseInt(req.params.id, 10);
    if (!escalaId) return res.status(400).json({ error: 'ID de escala inválido.' });

    const escala = await db.get(
      'SELECT id_escala, id_militar, ciente_em FROM ESCALA_PLANEJAMENTO WHERE id_escala = $1 AND id_militar = $2',
      [escalaId, militar.id_militar]
    );
    if (!escala) {
      return res.status(403).json({ error: 'Escala não encontrada ou não pertence ao militar autenticado.' });
    }

    const clientIp = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim().slice(0, 45);
    const { rows } = await db.query(
      `UPDATE ESCALA_PLANEJAMENTO
       SET ciente_em = COALESCE(ciente_em, CURRENT_TIMESTAMP),
           ciente_ip = COALESCE(ciente_ip, $2)
       WHERE id_escala = $1
       RETURNING id_escala, ciente_em, ciente_ip`,
      [escalaId, clientIp || null]
    );

    res.json({ success: true, ...rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /my-schedules/:id/permuta (M15)
 * Solicita substituição/permuta para uma escala futura.
 */
mySchedulesController.solicitarPermuta = async (req, res, next) => {
  try {
    const militar = await getMilitarFromUser(req.user);
    if (!militar) return res.status(403).json({ error: 'Usuário sem vínculo de efetivo.' });

    const escalaId = parseInt(req.params.id, 10);
    const { id_militar_substituto, motivo } = req.body || {};
    if (!escalaId || !motivo || !String(motivo).trim()) {
      return res.status(400).json({ error: 'Escala e motivo da permuta são obrigatórios.' });
    }

    const escala = await db.get(
      'SELECT id_escala, id_ciclo, id_militar FROM ESCALA_PLANEJAMENTO WHERE id_escala = $1 AND id_militar = $2',
      [escalaId, militar.id_militar]
    );
    if (!escala) {
      return res.status(403).json({ error: 'Escala não encontrada ou não pertence ao militar autenticado.' });
    }

    const pendente = await db.get(
      "SELECT id_permuta FROM SOLICITACOES_PERMUTA WHERE id_escala = $1 AND status = 'PENDENTE'",
      [escalaId]
    );
    if (pendente) {
      return res.status(409).json({ error: 'Já existe uma solicitação de permuta pendente para esta escala.' });
    }

    const substId = id_militar_substituto ? parseInt(id_militar_substituto, 10) : null;
    const { rows } = await db.query(
      `INSERT INTO SOLICITACOES_PERMUTA
        (id_escala, id_ciclo, id_militar_solicitante, id_militar_substituto, motivo, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDENTE')
       RETURNING *`,
      [escalaId, escala.id_ciclo, militar.id_militar, substId, String(motivo).trim()]
    );

    res.status(201).json({ success: true, permuta: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * GET /permutas (M15)
 * Lista solicitações de permuta (próprias do militar ou todas para aprovadores).
 */
mySchedulesController.listPermutas = async (req, res, next) => {
  try {
    const { ciclo_id, status, scope } = req.query;
    const militar = await getMilitarFromUser(req.user);
    const isAdminOrApprover = req.user?.roles?.some(r => ['SUPERUSER', 'ADMIN', 'GERENTE'].includes(r))
      || req.user?.permissions?.includes('permuta:aprovar');

    const params = [];
    let where = ' WHERE 1=1';

    if (!(scope === 'all' && isAdminOrApprover)) {
      if (!militar) return res.json([]);
      params.push(militar.id_militar);
      where += ` AND (sp.id_militar_solicitante = $${params.length} OR sp.id_militar_substituto = $${params.length})`;
    }

    if (ciclo_id) {
      params.push(parseInt(ciclo_id, 10));
      where += ` AND sp.id_ciclo = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND sp.status = $${params.length}`;
    }

    const { rows } = await db.query(`
      SELECT sp.*,
             TO_CHAR(ep.data_servico, 'YYYY-MM-DD') AS data_servico,
             ep.nome_recurso, ep.funcao, ep.horario_servico,
             sol.posto_graduacao AS solicitante_posto, sol.nome_guerra AS solicitante_nome, sol.matricula AS solicitante_matricula,
             sub.posto_graduacao AS substituto_posto, sub.nome_guerra AS substituto_nome, sub.matricula AS substituto_matricula
      FROM SOLICITACOES_PERMUTA sp
      JOIN ESCALA_PLANEJAMENTO ep ON sp.id_escala = ep.id_escala
      JOIN EFETIVO sol ON sp.id_militar_solicitante = sol.id_militar
      LEFT JOIN EFETIVO sub ON sp.id_militar_substituto = sub.id_militar
      ${where}
      ORDER BY sp.created_at DESC
    `, params);

    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /permutas/:id/responder (M15)
 * Aprova ou rejeita uma solicitação de permuta e, se aprovada com substituto, atualiza ESCALA_PLANEJAMENTO.
 */
mySchedulesController.responderPermuta = async (req, res, next) => {
  try {
    const idPermuta = parseInt(req.params.id, 10);
    const { status, observacao_aprovador, id_militar_substituto } = req.body || {};
    if (!idPermuta || !['APROVADA', 'REJEITADA'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use APROVADA ou REJEITADA.' });
    }

    const permuta = await db.get('SELECT * FROM SOLICITACOES_PERMUTA WHERE id_permuta = $1', [idPermuta]);
    if (!permuta) return res.status(404).json({ error: 'Solicitação de permuta não encontrada.' });
    if (permuta.status !== 'PENDENTE') {
      return res.status(409).json({ error: 'Esta solicitação já foi processada.' });
    }

    const finalSubstituto = id_militar_substituto ? parseInt(id_militar_substituto, 10) : permuta.id_militar_substituto;
    if (status === 'APROVADA' && !finalSubstituto) {
      return res.status(400).json({ error: 'Informe um militar substituto para aprovar a permuta.' });
    }

    await db.run(
      `UPDATE SOLICITACOES_PERMUTA
       SET status = $1,
           observacao_aprovador = $2,
           id_militar_substituto = $3,
           aprovado_por = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id_permuta = $5`,
      [status, observacao_aprovador || null, finalSubstituto || null, req.user?.id || null, idPermuta]
    );

    if (status === 'APROVADA' && finalSubstituto) {
      await db.run(
        `UPDATE ESCALA_PLANEJAMENTO
         SET id_militar = $1, ciente_em = NULL, ciente_ip = NULL
         WHERE id_escala = $2`,
        [finalSubstituto, permuta.id_escala]
      );
    }

    res.json({ success: true, id_permuta: idPermuta, status, id_militar_substituto: finalSubstituto });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = mySchedulesController;
