const db = require('./db');

async function analyze() {
  try {
    const cycle = await db.get("SELECT * FROM CICLOS WHERE status = 'Aberto' ORDER BY data_inicio DESC LIMIT 1");
    if (!cycle) {
      console.log("No active cycle found.");
      return;
    }
    console.log("Active Cycle:", cycle);

    const reqCount = await db.get("SELECT count(*) FROM REQUERIMENTOS WHERE id_ciclo = ?", [cycle.id_ciclo]);
    console.log("Requirements for this cycle:", reqCount.count);

    const dispCount = await db.all("SELECT dia_mes, count(*) FROM DISPONIBILIDADE_REQUERIMENTO dr JOIN REQUERIMENTOS r ON dr.id_requerimento = r.id_requerimento WHERE r.id_ciclo = ? AND dr.marcado_disponivel = TRUE AND dr.ativo = TRUE GROUP BY dia_mes ORDER BY dia_mes", [cycle.id_ciclo]);
    console.log("Availability count per day:");
    console.table(dispCount);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

analyze();
