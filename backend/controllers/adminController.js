'use strict';
const db = require('../db');
const { auditLog } = require('../utils/helpers');

const adminController = {};

/**
 * GET /admin/audit-logs
 */
adminController.getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit || '20')));
    const offset = (page - 1) * limit;

    const action = req.query.action ? String(req.query.action).trim() : null;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const status = req.query.status ? String(req.query.status).trim() : null;

    let whereConditions = [];
    let params = [];
    let pIdx = 1;

    if (action) {
      whereConditions.push(`a.action ILIKE $${pIdx++}`);
      params.push(`%${action}%`);
    }
    if (status) {
      whereConditions.push(`a.status = $${pIdx++}`);
      params.push(status);
    }
    if (search) {
      whereConditions.push(`(a.cpf ILIKE $${pIdx} OR a.numero_ordem ILIKE $${pIdx} OR a.ip ILIKE $${pIdx} OR a.action ILIKE $${pIdx} OR e.nome_completo ILIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRes = await db.query(`
      SELECT count(*)
      FROM audit_logs a
      LEFT JOIN EFETIVO e ON a.numero_ordem = e.matricula
      ${whereClause}
    `, params);
    const total = parseInt(countRes.rows[0].count);

    const queryParams = [...params, limit, offset];
    const { rows } = await db.query(`
      SELECT a.id, a.user_id, a.cpf, a.numero_ordem, a.action, a.entity, a.entity_id,
             a.details, a.ip, a.user_agent, a.status, a.created_at,
             COALESCE(e.nome_completo, e.nome_guerra, 'Sistema / Externo') as usuario_nome
      FROM audit_logs a
      LEFT JOIN EFETIVO e ON a.numero_ordem = e.matricula
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `, queryParams);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * GET /admin/diagnostics
 */
adminController.getDiagnostics = async (req, res, next) => {
  try {
    const tStart = Date.now();
    await db.query('SELECT 1');
    const dbLatency = Date.now() - tStart;

    const connRes = await db.query("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'");
    const usersCountRes = await db.query("SELECT count(*) as total, count(*) FILTER (WHERE status = 'ativo') as ativos, count(*) FILTER (WHERE bloqueado = TRUE) as bloqueados, count(*) FILTER (WHERE senha_definida = TRUE) as senhas_definidas, count(*) FILTER (WHERE mfa_enabled = TRUE) as mfa_ativos FROM users");
    const superusersRes = await db.query("SELECT count(*) FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.nome = 'SUPERUSER'");

    const mem = process.memoryUsage();

    res.json({
      success: true,
      diagnostics: {
        timestamp: new Date().toISOString(),
        node_version: process.version,
        uptime_seconds: Math.floor(process.uptime()),
        database: {
          status: 'CONNECTED',
          latency_ms: dbLatency,
          active_connections: parseInt(connRes.rows[0].count)
        },
        users_summary: usersCountRes.rows[0],
        total_superusers: parseInt(superusersRes.rows[0].count),
        memory: {
          rss_mb: Math.round(mem.rss / 1024 / 1024),
          heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * GET /admin/migrate-fix
 */
adminController.runMigrateFix = async (req, res, next) => {
  try {
    console.log('[MIGRATE] Running emergency fix...');
    
    // 1. Garante a coluna limite_equipes_diario e valor_contingencia
    await db.run('ALTER TABLE CICLOS ADD COLUMN IF NOT EXISTS limite_equipes_diario INTEGER DEFAULT 6');
    await db.run('ALTER TABLE CICLOS ADD COLUMN IF NOT EXISTS valor_contingencia DECIMAL(12, 2) DEFAULT 0');
    
    // 2. REPARA CICLOS EXISTENTES (Shift 15->16 se necessário)
    // Muitos ciclos foram criados com erro de fuso horário (15 ao invés de 16)
    await db.run(`
      UPDATE CICLOS 
      SET data_inicio = data_inicio + INTERVAL '1 day'
      WHERE EXTRACT(DAY FROM data_inicio) = 15;
    `);
    await db.run(`
      UPDATE CICLOS 
      SET data_fim = data_fim + INTERVAL '1 day'
      WHERE EXTRACT(DAY FROM data_fim) = 14;
    `);
    
    // 3. REPARA METAS ALOCACAO (Shift 15->16 se necessário)
    await db.run(`
      UPDATE METAS_ALOCACAO
      SET data = data + INTERVAL '1 day'
      WHERE EXTRACT(DAY FROM data) = 15 AND id_meta IN (
        SELECT id_meta FROM METAS_ALOCACAO m 
        JOIN CICLOS c ON m.id_ciclo = c.id_ciclo 
        WHERE EXTRACT(DAY FROM c.data_inicio) = 16
      );
    `);

    // 4. Recria a VIEW com as colunas corretas
    await db.run('DROP VIEW IF EXISTS vw_detalhes_ciclos CASCADE');
    await db.run(`
      CREATE VIEW vw_detalhes_ciclos AS
      SELECT 
          c.id_ciclo,
          c.id_opm,
          o.sigla as opm_sigla,
          o.descricao as opm_descricao,
          TO_CHAR(c.data_inicio, 'DD/MM/YYYY') || ' a ' || TO_CHAR(c.data_fim, 'DD/MM/YYYY') as periodo_ciclo,
          (CASE 
            WHEN EXTRACT(MONTH FROM c.data_inicio) = EXTRACT(MONTH FROM c.data_fim) THEN 
              TO_CHAR(c.data_inicio, 'FMMonth') || ' - ' || TO_CHAR(c.data_inicio, 'YYYY')
            ELSE 
              TO_CHAR(c.data_inicio, 'FMMonth') || ' / ' || TO_CHAR(c.data_fim, 'FMMonth') || ' - ' || TO_CHAR(c.data_inicio, 'YYYY')
          END) as period_name,
          c.data_inicio,
          c.data_fim,
          c.status,
          c.ativo,
          c.valor_total_previsto,
          c.valor_contingencia,
          c.limite_equipes_diario,
          COALESCE((SELECT SUM(valor_remuneracao) FROM SERVICOS_EXECUTADOS se WHERE se.id_ciclo = c.id_ciclo AND UPPER(TRIM(se.opm_origem)) = UPPER(TRIM(o.sigla))), 0) as custo_executado,
          c.valor_total_previsto - c.valor_contingencia - COALESCE((SELECT SUM(valor_remuneracao) FROM SERVICOS_EXECUTADOS se WHERE se.id_ciclo = c.id_ciclo AND UPPER(TRIM(se.opm_origem)) = UPPER(TRIM(o.sigla))), 0) as saldo_restante,
          (SELECT COUNT(*) FROM REQUERIMENTOS r WHERE r.id_ciclo = c.id_ciclo) as total_inscritos,
          (SELECT COUNT(*) FROM ESCALA_PLANEJAMENTO ep WHERE ep.id_ciclo = c.id_ciclo) as total_escalados
      FROM CICLOS c
      LEFT JOIN OPM o ON c.id_opm = o.id_opm
    `);
    
    res.json({ success: true, message: "Migration and Cycle Repair applied successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = adminController;
