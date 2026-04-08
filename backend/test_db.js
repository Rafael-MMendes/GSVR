const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'local_db', // I should check docker-compose.yml for connection
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ft_db',
  user: process.env.POSTGRES_USER || 'ft_user',
  password: process.env.POSTGRES_PASSWORD || 'ft_password',
});

async function test() {
  try {
    const res = await pool.query(`SELECT table_name, column_name, data_type, character_maximum_length 
                                  FROM information_schema.columns 
                                  WHERE table_name = 'users' OR table_name = 'tipos_servico'`);
    console.log("COLUMNS:");
    console.table(res.rows);

    const pkRes = await pool.query(`
      SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type
      FROM   pg_index i
      JOIN   pg_attribute a ON a.attrelid = i.indrelid
                           AND a.attnum = ANY(i.indkey)
      WHERE  i.indrelid = 'users'::regclass
      AND    i.indisprimary;
    `);
    console.log("USERS PK:");
    console.table(pkRes.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();
