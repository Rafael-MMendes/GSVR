'use strict';
const db = require('../db');
const { formatDateToISO, parseDayToDate, getCurrentMonthKey, getMonthName, auditLog } = require('../utils/helpers');

const volunteerController = {};

/**
 * GET /volunteers
 */
volunteerController.getVolunteers = async (req, res, next) => {
  const { id_ciclo } = req.query;
  // Fallback: busca o ciclo ativo se não informado
  let targetId = id_ciclo;
  if (!targetId) {
    const cycle = await db.get("SELECT id_ciclo FROM CICLOS WHERE status = 'Aberto' ORDER BY data_inicio DESC LIMIT 1");
    targetId = cycle?.id_ciclo;
  }

  if (!targetId) return res.json([]);

  const q = `
     SELECT r.id_requerimento as id, e.id_militar, e.matricula as numero_ordem, e.nome_guerra as name,
            e.nome_completo,
            e.posto_graduacao as rank, e.telefone as phone, e.motorista, r.observacao, TO_CHAR(c.data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(c.data_fim, 'DD/MM/YYYY') as periodo_ciclo,
            c.data_inicio, c.data_fim,
            (SELECT BOOL_OR(motorista) FROM DISPONIBILIDADE_REQUERIMENTO WHERE id_requerimento = r.id_requerimento AND marcado_disponivel = TRUE) OR (e.motorista = 'Sim') as motorista_req,
            (SELECT json_object_agg(TO_CHAR(dia_mes, 'YYYY-MM-DD'), turnos) FROM (
               SELECT dia_mes, json_agg(json_build_object('turno', horario_turno, 'observacoes', observacoes)) as turnos
               FROM DISPONIBILIDADE_REQUERIMENTO
               WHERE id_requerimento = r.id_requerimento AND marcado_disponivel = TRUE AND ativo = TRUE
               GROUP BY dia_mes
             ) d) as availability_json,
            (SELECT json_object_agg(dia_mes_date, turnos_completos) FROM (
               SELECT dia_mes_date, json_agg(json_build_object(
                 'turno', horario_turno, 
                 'ativo', ativo, 
                 'motorista', motorista, 
                 'observacoes', observacoes,
                 'teve_execucao', teve_execucao
               )) as turnos_completos
               FROM (
                 SELECT 
                   dia_mes_date,
                   horario_turno,
                   BOOL_OR(ativo) as ativo,
                   BOOL_OR(motorista) as motorista,
                   MAX(observacoes) as observacoes,
                   BOOL_OR(teve_execucao) as teve_execucao
                 FROM (
                   SELECT 
                     TO_CHAR(dr.dia_mes, 'YYYY-MM-DD') as dia_mes_date,
                     dr.horario_turno, 
                     dr.ativo, 
                     dr.motorista, 
                     dr.observacoes,
                     EXISTS (
                       SELECT 1 FROM SERVICOS_EXECUTADOS se
                       WHERE se.id_militar = r.id_militar
                         AND se.id_ciclo = r.id_ciclo
                         AND se.data_execucao = dr.dia_mes
                     ) as teve_execucao
                   FROM DISPONIBILIDADE_REQUERIMENTO dr
                   WHERE dr.id_requerimento = r.id_requerimento AND dr.marcado_disponivel = TRUE

                   UNION ALL

                   SELECT 
                     TO_CHAR(se.data_execucao, 'YYYY-MM-DD') as dia_mes_date,
                     t.turno as horario_turno,
                     true as ativo,
                     false as motorista,
                     '' as observacoes,
                     true as teve_execucao
                   FROM SERVICOS_EXECUTADOS se
                   CROSS JOIN (
                     SELECT '07:00 ÀS 13:00' as turno
                     UNION ALL SELECT '13:00 ÀS 19:00'
                     UNION ALL SELECT '19:00 ÀS 01:00'
                     UNION ALL SELECT '01:00 ÀS 07:00'
                   ) t
                   WHERE se.id_militar = r.id_militar
                     AND se.id_ciclo = r.id_ciclo
                 ) inner_sub
                 GROUP BY dia_mes_date, horario_turno
               ) outer_sub
               GROUP BY dia_mes_date
             ) d) as availability_completa_json,
            (SELECT COUNT(*) FROM ESCALA_PLANEJAMENTO ep WHERE ep.id_militar = e.id_militar AND ep.id_ciclo = c.id_ciclo) as service_count,
            (SELECT COUNT(*) FROM SERVICOS_EXECUTADOS se WHERE se.id_militar = e.id_militar AND se.id_ciclo = c.id_ciclo) as executed_count,
            COALESCE((SELECT BOOL_OR(ativo) FROM DISPONIBILIDADE_REQUERIMENTO WHERE id_requerimento = r.id_requerimento), TRUE) as ativo
     FROM REQUERIMENTOS r
     JOIN EFETIVO e ON r.id_militar = e.id_militar
     JOIN CICLOS c ON r.id_ciclo = c.id_ciclo
    WHERE c.id_ciclo = $1
    ORDER BY r.data_solicitacao DESC
  `;
  try {
    const { rows } = await db.query(q, [targetId]);
    res.json(rows.map(v => {
      let availability = v.availability_json || {};
      if (typeof availability === 'string') {
        try { availability = JSON.parse(availability); } catch (e) { availability = {}; }
      }
      let availability_completa = v.availability_completa_json || {};
      if (typeof availability_completa === 'string') {
        try { availability_completa = JSON.parse(availability_completa); } catch (e) { availability_completa = {}; }
      }
      return { ...v, availability, availability_completa };
    }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET /months
 */
volunteerController.getMonths = async (req, res, next) => {
  try {
    // Retorna as referências formatadas dos ciclos existentes para compatibilidade com seletores de meses
    const query = `
      SELECT id_ciclo, 
             TO_CHAR(data_inicio, 'MM/YYYY') as month_name, 
             (CASE EXTRACT(MONTH FROM data_inicio)
                WHEN 1 THEN 'Janeiro' WHEN 2 THEN 'Fevereiro' WHEN 3 THEN 'Março' WHEN 4 THEN 'Abril'
                WHEN 5 THEN 'Maio' WHEN 6 THEN 'Junho' WHEN 7 THEN 'Julho' WHEN 8 THEN 'Agosto'
                WHEN 9 THEN 'Setembro' WHEN 10 THEN 'Outubro' WHEN 11 THEN 'Novembro' WHEN 12 THEN 'Dezembro'
              END) || ' / ' ||
             (CASE EXTRACT(MONTH FROM data_fim)
                WHEN 1 THEN 'Janeiro' WHEN 2 THEN 'Fevereiro' WHEN 3 THEN 'Março' WHEN 4 THEN 'Abril'
                WHEN 5 THEN 'Maio' WHEN 6 THEN 'Junho' WHEN 7 THEN 'Julho' WHEN 8 THEN 'Agosto'
                WHEN 9 THEN 'Setembro' WHEN 10 THEN 'Outubro' WHEN 11 THEN 'Novembro' WHEN 12 THEN 'Dezembro'
              END) || ' de ' || TO_CHAR(data_inicio, 'YYYY') as period_name,
             TO_CHAR(data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(data_fim, 'DD/MM/YYYY') as periodo_ciclo
      FROM CICLOS ORDER BY data_inicio DESC
    `;
    const ciclos = await db.all(query);
    res.json(ciclos);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /volunteers
 */
volunteerController.createVolunteer = async (req, res, next) => {
  const { numero_ordem, name, motorista, availability, id_ciclo, observacao } = req.body;
  if (!numero_ordem || !availability) return res.status(400).json({ error: "Required fields missing" });

  try {
    console.log(`[API] POST /api/volunteers - Body:`, JSON.stringify(req.body));
    
    // Atualizar informação de motorista no Efetivo (busca por matricula ou numero_ordem)
    await db.run('UPDATE EFETIVO SET motorista = $1 WHERE matricula = $2 OR numero_ordem = $2', [motorista || 'Não', numero_ordem]);

    const military = await db.get('SELECT id_militar FROM EFETIVO WHERE matricula = $1 OR numero_ordem = $1', [numero_ordem]);
    
    // Prioriza id_ciclo do corpo, fallback para o ciclo ativo hoje
    let targetCycleId = id_ciclo;
    let cycle = null;
    if (targetCycleId) {
      cycle = await db.get('SELECT id_ciclo, data_inicio, data_fim FROM CICLOS WHERE id_ciclo = $1', [targetCycleId]);
    } else {
      cycle = await db.get('SELECT id_ciclo, data_inicio, data_fim FROM CICLOS WHERE CURRENT_DATE BETWEEN data_inicio AND data_fim');
      targetCycleId = cycle?.id_ciclo;
    }

    if (!military) {
      console.warn(`[API] Militar não encontrado para o número de ordem: ${numero_ordem}`);
      return res.status(400).json({ error: "Militar não encontrado no banco de dados." });
    }
    if (!targetCycleId || !cycle) {
      console.warn(`[API] Ciclo não identificado para a data atual.`);
      return res.status(400).json({ error: "Ciclo não encontrado. Verifique se existe um ciclo aberto para a data atual." });
    }

    const creatorId = req.user?.id || null;
    console.log(`[API] Criando requerimento: Militar=${military.id_militar}, Ciclo=${targetCycleId}, Criador=${creatorId}`);

    // Insere o requerimento vinculando o usuário da sessão (req.user.id)
    const reqResult = await db.run(
      'INSERT INTO REQUERIMENTOS (id_militar, id_ciclo, id_usuario_criacao, observacao) VALUES ($1, $2, $3, $4)', 
      [military.id_militar, targetCycleId, creatorId, observacao || null]
    );

    const isMot = (motorista === 'Sim');
    for (const [day, shifts] of Object.entries(availability)) {
      const dateKey = parseDayToDate(day, cycle.data_inicio, cycle.data_fim);
      for (const shiftData of shifts) {
        // Suporta tanto formato legado (string) quanto novo (objeto com observações)
        const shift = typeof shiftData === 'object' ? shiftData.turno : shiftData;
        const obs = (typeof shiftData === 'object' && shiftData.observacoes && shiftData.observacoes.trim() !== '') ? shiftData.observacoes : null;

        await db.run(
          'INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel, motorista, observacoes) VALUES ($1, $2, $3, TRUE, $4, $5)', 
          [reqResult.lastID, dateKey, shift, isMot, obs]
        );
      }
    }
    res.status(201).json({ id: reqResult.lastID });
  } catch (error) {
    console.error('Error in POST /api/volunteers:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /volunteers/:id
 */
volunteerController.deleteVolunteer = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Desvincula com segurança qualquer escala associada às disponibilidades deste requerimento
    await db.run(
      `UPDATE escala_planejamento 
          SET id_disponibilidade = NULL 
        WHERE id_disponibilidade IN (
          SELECT id_disponibilidade FROM DISPONIBILIDADE_REQUERIMENTO WHERE id_requerimento = $1
        )`,
      [id]
    );

    // 2. Desvincula de importacao_log se houver
    await db.run('UPDATE IMPORTACAO_LOG SET id_requerimento = NULL WHERE id_requerimento = $1', [id]);

    // 3. Remove o requerimento (disponibilidades serão removidas via CASCADE)
    await db.run('DELETE FROM REQUERIMENTOS WHERE id_requerimento = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE VOLUNTEER ERROR]', e);
    res.status(500).json({ success: false, error: { message: e.message } });
  }
};

/**
 * PUT /volunteers/:id
 */
volunteerController.updateVolunteer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { numero_ordem, name, rank, phone, motorista, availability, observacao } = req.body;
    
    // Verifica se o requerimento existe
    const requerimento = await db.get(
      'SELECT id_requerimento, id_militar, id_ciclo FROM REQUERIMENTOS WHERE id_requerimento = $1',
      [id]
    );
    
    if (!requerimento) {
      return res.status(404).json({ error: 'Requerimento não encontrado' });
    }

    const cycle = await db.get('SELECT data_inicio, data_fim FROM CICLOS WHERE id_ciclo = $1', [requerimento.id_ciclo]);
    if (!cycle) {
      return res.status(400).json({ error: 'Ciclo associado não encontrado' });
    }

    // Atualizar observação no Requerimento
    await db.run('UPDATE REQUERIMENTOS SET observacao = $1 WHERE id_requerimento = $2', [observacao, id]);
    
    // Atualizar informação de motorista no Efetivo
    if (motorista) {
      await db.run('UPDATE EFETIVO SET motorista = $1 WHERE id_militar = $2', [motorista, requerimento.id_militar]);
    }
    
    // Atualizar telefone no Efetivo se fornecido
    if (phone) {
      await db.run('UPDATE EFETIVO SET telefone = $1 WHERE id_militar = $2', [phone, requerimento.id_militar]);
    }
    
    // Sincronização Inteligente (Soft Sync): 
    // Em vez de deletar tudo (que quebra FKs em escala_planejamento), 
    // desmarcamos a disponibilidade e reativamos via UPSERT.
    
    // 1. Desmarca disponibilidade de todos os turnos atuais deste requerimento
    await db.run('UPDATE DISPONIBILIDADE_REQUERIMENTO SET marcado_disponivel = FALSE WHERE id_requerimento = $1', [id]);
    
    const isMot = (motorista === 'Sim');
    if (availability && typeof availability === 'object') {
      for (const [day, shifts] of Object.entries(availability)) {
        const dateKey = parseDayToDate(day, cycle.data_inicio, cycle.data_fim);
        for (const shiftData of shifts) {
          const shift = typeof shiftData === 'object' ? shiftData.turno : shiftData;
          const obs = (typeof shiftData === 'object' && shiftData.observacoes && shiftData.observacoes.trim() !== '') ? shiftData.observacoes : null;

          // 2. Upsert: Se existe, ativa e marca como disponível. Se não, insere.
          await db.run(`
            INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel, ativo, motorista, observacoes)
            VALUES ($1, $2, $3, TRUE, TRUE, $4, $5)
            ON CONFLICT (id_requerimento, dia_mes, horario_turno) 
            DO UPDATE SET 
              marcado_disponivel = TRUE, 
              ativo = TRUE,
              motorista = EXCLUDED.motorista,
              observacoes = EXCLUDED.observacoes
          `, [id, dateKey, shift, isMot, obs]);
        }
      }
    }
    
    res.json({ success: true, message: 'Requerimento atualizado com sucesso' });
  } catch (error) {
    console.error('Error updating volunteer:', error);
    res.status(500).json({ error: 'Erro ao atualizar requerimento' });
  }
};

/**
 * PUT /volunteers/:id/cancel-availability
 */
volunteerController.cancelAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { availability, observacao } = req.body;
    
    // Verifica se o requerimento existe
    const requerimento = await db.get(
      'SELECT id_requerimento, id_ciclo FROM REQUERIMENTOS WHERE id_requerimento = $1',
      [id]
    );
    
    if (!requerimento) {
      return res.status(404).json({ error: 'Requerimento não encontrado' });
    }

    const cycle = await db.get('SELECT data_inicio, data_fim FROM CICLOS WHERE id_ciclo = $1', [requerimento.id_ciclo]);
    if (!cycle) {
      return res.status(400).json({ error: 'Ciclo associado não encontrado' });
    }

    let canceledCount = 0;

    // Se houver seleção específica de turnos no corpo da requisição
    if (availability && typeof availability === 'object' && Object.keys(availability).length > 0) {
      for (const [day, shifts] of Object.entries(availability)) {
        if (!Array.isArray(shifts)) continue;
        const dateKey = parseDayToDate(day, cycle.data_inicio, cycle.data_fim);
        for (const shift of shifts) {
          const result = await db.run(
            'UPDATE DISPONIBILIDADE_REQUERIMENTO SET ativo = FALSE, observacoes = $1 WHERE id_requerimento = $2 AND dia_mes = $3 AND horario_turno = $4',
            [(observacao && observacao.trim() !== '') ? observacao : null, id, dateKey, shift]
          );
          canceledCount += result.changes;
        }
      }
    } else {
      // Fallback: se não houver seleção, cancela TUDO (legado)
      const result = await db.run(
        'UPDATE DISPONIBILIDADE_REQUERIMENTO SET ativo = FALSE, observacoes = $1 WHERE id_requerimento = $2',
        [(observacao && observacao.trim() !== '') ? observacao : null, id]
      );
      canceledCount = result.changes;
    }
    
    console.log(`Cancelamento Cirúrgico: ${canceledCount} turnos marcados como inativos para requerimento ${id}`);
    res.json({ success: true, message: 'Disponibilidade cancelada com sucesso', canceled_count: canceledCount });
  } catch (error) {
    console.error('Error canceling availability:', error);
    res.status(500).json({ error: 'Erro ao cancelar disponibilidade' });
  }
};

module.exports = volunteerController;
