'use strict';
const db = require('../db');
const { formatDateToISO, auditLog, normalizeRank } = require('../utils/helpers');
const ROLES = ['Comandante', 'Motorista', 'Patrulheiro'];

const scheduleController = {};

/**
 * GET /schedules
 */
scheduleController.getSchedules = async (req, res, next) => {
  try {
    const { date, id_ciclo } = req.query;
    if (!date || !id_ciclo) return res.status(400).json({ error: "Data e Ciclo são obrigatórios." });

    const ciclo = await db.get('SELECT id_ciclo, data_inicio FROM CICLOS WHERE id_ciclo = $1', [id_ciclo]);
    if (!ciclo) return res.json([]);

    let dataServico = date;
    if (!String(date).includes('-')) {
      const baseDate = new Date(ciclo.data_inicio);
      dataServico = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    }

    // Busca todas os registros ESCALA_PLANEJAMENTO do dia com dados do militar
    // LATERAL + LIMIT 1 evita duplicação quando um militar tem múltiplos requerimentos no mesmo ciclo
    const { rows } = await db.query(`
      SELECT
        ep.id_escala,
        ep.id_guarnicao,
        ep.id_militar,
        ep.funcao,
        ep.horario_servico,
        ep.nome_recurso   AS patrol_id,
        ep.nome_recurso   AS patrol_name,
        ep.observacoes      AS patrol_duration,
        ep.publicado,
        e.nome_guerra       AS name,
        e.posto_graduacao   AS rank,
        e.telefone          AS phone,
        e.motorista,
        COALESCE(e.numero_ordem, e.matricula) AS numero_ordem,
        r_lat.id_requerimento AS volunteer_id,
        COALESCE(ts.carga_horaria, 6) AS carga_horaria,
        (
          SELECT COUNT(*)
          FROM SERVICOS_EXECUTADOS se
          WHERE se.id_militar = ep.id_militar
            AND se.id_ciclo   = ep.id_ciclo
        ) AS service_count
      FROM ESCALA_PLANEJAMENTO ep
      JOIN EFETIVO e
        ON ep.id_militar = e.id_militar
      LEFT JOIN LATERAL (
        SELECT r.id_requerimento
        FROM REQUERIMENTOS r
        WHERE r.id_militar = ep.id_militar
          AND r.id_ciclo   = ep.id_ciclo
        LIMIT 1
      ) r_lat ON TRUE
      LEFT JOIN TIPOS_SERVICO ts
        ON ep.id_tipo_servico = ts.id_tipo_servico
      WHERE ep.id_ciclo    = $1
        AND ep.data_servico = $2
      ORDER BY ep.id_guarnicao, ep.id_escala, ep.funcao
    `, [ciclo.id_ciclo, dataServico]);

    if (rows.length === 0) return res.json([]);

    // Reconstrói o array de patrulhas agrupando por id_guarnicao (ou nome + horário) sem sobrescrever slots ocupados
    const patrols = [];
    const seenEscalas = new Set(); // Segurança: deduplica por id_escala

    for (const row of rows) {
      // Proteção contra linhas duplicadas (mesmo id_escala processado 2x)
      if (seenEscalas.has(row.id_escala)) continue;
      seenEscalas.add(row.id_escala);

      const patrolName = row.patrol_name || 'GSVR';
      const roleIndex = PATROL_ROLES.indexOf(row.funcao);
      const slot = roleIndex >= 0 ? roleIndex : 0;
      
      // Localiza guarnição existente que corresponda ao id_guarnicao (ou nome + horário) E que tenha o slot correspondente vago
      let patrol = patrols.find(p => 
        (row.id_guarnicao 
          ? (p.id === row.id_guarnicao || p.baseId === row.id_guarnicao)
          : (p.name === patrolName && p.timeSpan === (row.horario_servico || '')))
        && p.members[slot] === null
      );

      // Se não houver uma guarnição compatível com vaga nesse cargo, cria uma nova instância
      if (!patrol) {
        const rawBaseId = row.id_guarnicao || `${row.patrol_id || 'p'}`;
        const existingCount = patrols.filter(p => p.id === rawBaseId || p.baseId === rawBaseId).length;
        const uniqueId = existingCount === 0 ? rawBaseId : `${rawBaseId}_${existingCount + 1}`;

        patrol = {
          id:       uniqueId,
          baseId:   rawBaseId,
          name:     patrolName,
          duration: row.patrol_duration || '6h',
          timeSpan: row.horario_servico || '',
          publicado: row.publicado !== false,
          members:  [null, null, null]
        };
        patrols.push(patrol);
      }

      patrol.members[slot] = {
        id:            row.volunteer_id || row.id_escala,
        id_militar:    row.id_militar,
        name:          row.name,
        rank:          row.rank,
        phone:         row.phone,
        motorista:     row.motorista,
        numero_ordem:  row.numero_ordem,
        service_count: parseInt(row.service_count) || 0
      };
    }

    res.json([{ id: 1, date, id_ciclo, patrols }]);

  } catch (e) {
    console.error('[API] Error fetching schedules:', e);
    res.status(500).json({ error: e.message });
  }
};

/**
 * POST /schedules
 */
scheduleController.createSchedule = async (req, res, next) => {
    try {
      const { date, id_ciclo, patrols } = req.body;
      const targetCicloId = id_ciclo;
      
      if (!date || !targetCicloId || !patrols) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }

    // Localiza o ciclo para obter datas base se necessário ou apenas validar
    const ciclo = await db.get('SELECT id_ciclo, data_inicio FROM CICLOS WHERE id_ciclo = $1', [targetCicloId]);
    if (!ciclo) return res.status(400).json({ error: `Ciclo ${targetCicloId} não encontrado.` });

    // Constrói data ISO YYYY-MM-DD baseada no dia informado e no mês/ano do data_inicio do ciclo
    let dataServico = date;
    const diaMes = (typeof date === 'string' && date.includes('-')) ? parseInt(date.split('-')[2], 10) : parseInt(date, 10);
    if (!String(date).includes('-')) {
      const baseDate = new Date(ciclo.data_inicio);
      dataServico = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    }

    // Inicia transação para garantir atomicidade (importante para triggers de relacionamento)
    await db.transaction(async (client) => {
      // Remove escalas existentes do dia (substituição completa do planejamento diário)
      await client.query(
        'DELETE FROM ESCALA_PLANEJAMENTO WHERE id_ciclo = $1 AND data_servico = $2',
        [ciclo.id_ciclo, dataServico]
      );

      let inserted = 0;
      const errors = [];
      const usedGuarnicaoIds = new Set();

      for (let pIdx = 0; pIdx < patrols.length; pIdx++) {
        const patrol = patrols[pIdx];
        if (!Array.isArray(patrol.members)) continue;

        const horarioServico = patrol.timeSpan?.trim() || '00:00 às 06:00';

        // Resolve id_tipo_servico pela carga horária da guarnição (ex: '6h' → 6)
        const cargaHoraria = parseInt(patrol.duration) || 6;
        const tipoServicoRes = await client.query(
          'SELECT id_tipo_servico FROM TIPOS_SERVICO WHERE carga_horaria = $1 AND ativo = TRUE LIMIT 1',
          [cargaHoraria]
        );
        const idTipoServico = tipoServicoRes.rows[0]?.id_tipo_servico || null;

        // Garante um id_guarnicao único e uniforme para TODOS os integrantes desta guarnição
        const isTempId = !patrol.id || /^p\d+$/.test(String(patrol.id)) || String(patrol.id).startsWith('p_') || String(patrol.id) === 'NEW';
        let idGuarnicao = String(patrol.id || '');
        if (isTempId || usedGuarnicaoIds.has(idGuarnicao)) {
          idGuarnicao = `g_${Date.now()}_${pIdx}_${Math.random().toString(36).substring(2, 7)}`;
        }
        usedGuarnicaoIds.add(idGuarnicao);

        for (let i = 0; i < patrol.members.length; i++) {
          const member = patrol.members[i];
          if (!member || !member.id_militar) continue;

          const funcao = PATROL_ROLES[i] || 'Patrulheiro';

          // Verifica se o militar está cadastrado no efetivo (FK id_militar)
          const militarOkRes = await client.query(
            'SELECT id_militar FROM EFETIVO WHERE id_militar = $1',
            [member.id_militar]
          );
          if (militarOkRes.rows.length === 0) {
            errors.push(`Militar id=${member.id_militar} não encontrado no efetivo.`);
            continue;
          }

          // Busca se o militar tem disponibilidade exata para este dia e turno
          let reqMilitarRes = await client.query(
            `SELECT dr.id_disponibilidade 
             FROM REQUERIMENTOS r
             JOIN DISPONIBILIDADE_REQUERIMENTO dr ON r.id_requerimento = dr.id_requerimento
             WHERE r.id_militar = $1 
               AND r.id_ciclo = $2 
               AND dr.dia_mes = $3 
               AND LOWER(TRIM(dr.horario_turno)) = LOWER(TRIM($4))
               AND dr.marcado_disponivel = TRUE 
               AND dr.ativo = TRUE 
             LIMIT 1`,
            [member.id_militar, ciclo.id_ciclo, dataServico, horarioServico]
          );

          // Fallback: se o turno não bater perfeitamente devido à nomenclatura, pega a primeira disponibilidade do militar para aquele dia
          if (reqMilitarRes.rows.length === 0) {
            reqMilitarRes = await client.query(
              `SELECT dr.id_disponibilidade 
               FROM REQUERIMENTOS r
               JOIN DISPONIBILIDADE_REQUERIMENTO dr ON r.id_requerimento = dr.id_requerimento
               WHERE r.id_militar = $1 
                 AND r.id_ciclo = $2 
                 AND dr.dia_mes = $3 
                 AND dr.marcado_disponivel = TRUE 
                 AND dr.ativo = TRUE 
               LIMIT 1`,
              [member.id_militar, ciclo.id_ciclo, dataServico]
            );
          }

          const idDisponibilidade = reqMilitarRes.rows.length > 0 ? reqMilitarRes.rows[0].id_disponibilidade : null;
          const publicado = patrol.publicado !== false;

          await client.query(`
            INSERT INTO ESCALA_PLANEJAMENTO
              (id_ciclo, id_militar, id_tipo_servico, id_disponibilidade,
               data_servico, horario_servico, funcao,
               nome_recurso, observacoes, publicado, id_guarnicao)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            parseInt(ciclo.id_ciclo, 10),
            parseInt(member.id_militar, 10),
            idTipoServico ? parseInt(idTipoServico, 10) : null,
            idDisponibilidade ? parseInt(idDisponibilidade, 10) : null, 
            dataServico,
            horarioServico,
            funcao,
            patrol.name || 'GSVR', 
            patrol.duration || '6h',
            publicado,
            idGuarnicao
          ]);

          inserted++;
        }
      }
      res.json({ success: true, inserted });
    });


  } catch (e) {
    console.error('[API] Error saving schedules:', e);
    res.status(500).json({ error: 'Erro na transação de salvamento: ' + e.message });
  }
};

/**
 * DELETE /schedules/patrol
 */
scheduleController.deletePatrol = async (req, res, next) => {
  try {
    const { nome_recurso, data_servico: date, id_ciclo, horario_servico, membros } = req.query;
    console.log(`[API] Tentativa de exclusão: Recurso=${nome_recurso}, Dia=${date}, Ciclo=${id_ciclo}, Horário=${horario_servico || '(todos)'}, Membros=${membros || '(todos)'}`);
    
    if (!nome_recurso || !date || !id_ciclo) {
      return res.status(400).json({ error: "Parâmetros nome_recurso, data_servico e id_ciclo são obrigatórios." });
    }

    // 1. Validar e localizar ciclo
    const ciclo = await db.get('SELECT id_ciclo, data_inicio FROM CICLOS WHERE id_ciclo = $1', [parseInt(id_ciclo)]);
    if (!ciclo) {
      console.warn(`[API] Ciclo ${id_ciclo} não encontrado para exclusão.`);
      return res.status(404).json({ error: `Ciclo ${id_ciclo} não encontrado no banco de dados.`, code: 'NOT_FOUND' });
    }

    // 2. Calcular data ISO correspondente (seguindo mesma lógica de salvamento)
    let dataServicoISO = date;
    if (!String(date).includes('-')) {
      const baseDate = new Date(ciclo.data_inicio);
      dataServicoISO = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    }
    console.log(`[API] Data calculada para exclusão: ${dataServicoISO}`);

    // 3. Construir filtros dinâmicos de forma totalmente parametrizada
    const queryParams = [nome_recurso, dataServicoISO, parseInt(id_ciclo)];
    let horarioFilter = '';

    if (horario_servico && horario_servico.trim() !== '') {
      horarioFilter = ' AND LOWER(TRIM(ep.horario_servico)) = LOWER(TRIM($4))';
      queryParams.push(horario_servico);
    }

    let membrosFilter = '';
    if (membros && membros.trim() !== '') {
      const ids = membros.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        const startIdx = queryParams.length + 1;
        const placeholders = ids.map((_, idx) => `$${startIdx + idx}`).join(',');
        membrosFilter = ` AND ep.id_militar IN (${placeholders})`;
        queryParams.push(...ids);
      }
    }

    // 5. Exclusão atômica via transação
    await db.transaction(async (client) => {
      // 5a. Remover vínculos NÃO executados da tabela ternária antes de apagar a escala
      await client.query(`
        DELETE FROM ESCALA_EFETIVO_SERVICO 
        WHERE id_escala IN (
          SELECT ep.id_escala FROM ESCALA_PLANEJAMENTO ep
          WHERE ep.nome_recurso = $1 
            AND ep.data_servico = $2 
            AND ep.id_ciclo = $3
            ${horarioFilter}
            ${membrosFilter}
        )
        AND id_execucao IS NULL
      `, queryParams);

      // 5b. Exclusão física dos registros de planejamento
      const deleteRes = await client.query(`
        DELETE FROM ESCALA_PLANEJAMENTO 
        WHERE id_escala IN (
          SELECT ep.id_escala FROM ESCALA_PLANEJAMENTO ep
          WHERE ep.nome_recurso = $1 
            AND ep.data_servico = $2 
            AND ep.id_ciclo = $3
            ${horarioFilter}
            ${membrosFilter}
        )
      `, queryParams);

      console.log(`[API] Exclusão realizada: ${deleteRes.rowCount} registros removidos.`);

      res.json({ 
        success: true, 
        message: `Guarnição ${nome_recurso} excluída com sucesso.`,
        count: deleteRes.rowCount 
      });
    });

  } catch (e) {
    console.error('[API] Erro interno ao excluir guarnição:', e);
    res.status(500).json({ error: "Erro interno ao processar exclusão: " + e.message });
  }
};

module.exports = scheduleController;
