/**
 * Utilitário de Auditoria Persistente
 * GSVR - 9º BPM/PMAL
 */

async function logAudit(db, {
  userId = null,
  cpf = null,
  numero_ordem = null,
  action,
  entity = null,
  entityId = null,
  details = null,
  ip = null,
  userAgent = null,
  status = 'SUCCESS'
}) {
  try {
    const detailsJson = details ? JSON.stringify(details) : null;
    
    // Print to console for immediate visibility in docker logs
    console.log(`[AUDIT] [${status}] ${action} | User: ${userId || 'anon'} (${cpf || numero_ordem || 'N/A'}) | IP: ${ip || '-'}`);

    if (!db || !db.query) return;

    await db.query(`
      INSERT INTO audit_logs (
        user_id, cpf, numero_ordem, action, entity, entity_id, details, ip, user_agent, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      userId,
      cpf,
      numero_ordem,
      action,
      entity,
      entityId ? String(entityId) : null,
      detailsJson,
      ip,
      userAgent,
      status
    ]);
  } catch (err) {
    console.error('[AUDIT ERROR] Falha ao persistir log de auditoria:', err.message);
  }
}

module.exports = {
  logAudit
};
