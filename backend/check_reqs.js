const db = require('./db');

async function analyze() {
  try {
    const allReqs = await db.all(`
      SELECT r.id_militar, e.nome_guerra, r.id_ciclo, c.period_name, count(dr.id_disponibilidade) as count_disp
      FROM REQUERIMENTOS r
      JOIN EFETIVO e ON r.id_militar = e.id_militar
      JOIN CICLOS c ON r.id_ciclo = c.id_ciclo
      LEFT JOIN DISPONIBILIDADE_REQUERIMENTO dr ON r.id_requerimento = dr.id_requerimento
      WHERE dr.marcado_disponivel = TRUE
      GROUP BY r.id_militar, e.nome_guerra, r.id_ciclo, c.period_name
      ORDER BY e.nome_guerra, c.period_name
    `);
    
    console.log("Requirements distribution across cycles:");
    console.table(allReqs);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

analyze();
