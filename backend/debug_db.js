const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'escala_ft',
  port: process.env.DB_PORT || 5432,
});

async function main() {
  try {
    const ts = await pool.query('SELECT * FROM TIPOS_SERVICO');
    console.log('--- TIPOS_SERVICO ---');
    console.table(ts.rows);

    const seCount = await pool.query('SELECT carga_horaria, count(*), sum(valor_remuneracao) FROM SERVICOS_EXECUTADOS GROUP BY carga_horaria');
    console.log('--- SERVICOS_EXECUTADOS BY CARGA_HORARIA ---');
    console.table(seCount.rows);

    const seNullType = await pool.query('SELECT count(*) FROM SERVICOS_EXECUTADOS WHERE id_tipo_servico IS NULL');
    console.log('--- SERVICOS_EXECUTADOS WITH NULL id_tipo_servico ---');
    console.log(seNullType.rows[0]);

    const seSamples = await pool.query('SELECT id_execucao, id_militar, data_execucao, carga_horaria, valor_remuneracao, id_tipo_servico FROM SERVICOS_EXECUTADOS LIMIT 5');
    console.log('--- SERVICOS_EXECUTADOS SAMPLES ---');
    console.table(seSamples.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
