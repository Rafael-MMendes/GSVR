const { ScaleOptimizer } = require('./optimize_scale_class'); // I'll extract the class

const config = {
    budget: 85000.00,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    holidays: ['2026-04-03', '2026-04-21'],
    dailyLimit: 6,
    id_ciclo: 1
};

const optimizer = new ScaleOptimizer(config);
const result = optimizer.optimize();

let sql = "DELETE FROM METAS_ALOCACAO WHERE id_ciclo = 1;\n";
result.schedule.forEach(d => {
    const dateStr = d.date.toISOString().split('T')[0];
    sql += `INSERT INTO METAS_ALOCACAO (id_ciclo, data, cenario, qtd_equipes_planejadas, custo_estimado) VALUES (1, '${dateStr}', '${d.scenario}', ${d.teams}, ${d.cost});\n`;
});

console.log(sql);
