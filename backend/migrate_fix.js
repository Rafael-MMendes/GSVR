const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'escala_ft',
  port: process.env.DB_PORT || 5432,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'ciclos' AND column_name = 'limite_equipes_diario'
        ) THEN
          ALTER TABLE CICLOS ADD COLUMN limite_equipes_diario INTEGER DEFAULT 6;
          RAISE NOTICE 'Column limite_equipes_diario added to CICLOS';
        ELSE
          RAISE NOTICE 'Column limite_equipes_diario already exists';
        END IF;
      END $$;
    `);
    
    await client.query(`DROP VIEW IF EXISTS vw_detalhes_ciclos CASCADE;`);
    // Need the view definition here or just let setupDB handle it.
    // I'll just run the column addition.
    console.log('Migration finished successfully');
  } catch (e) {
    console.error('Migration failed:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
