'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

async function run() {
  const isStatusOnly = process.argv.includes('--status');
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'escala_ft',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const { rows: appliedRows } = await client.query(
      'SELECT filename, checksum, applied_at FROM schema_migrations ORDER BY filename ASC'
    );
    const appliedMap = new Map(appliedRows.map((r) => [r.filename, r]));
    const files = getMigrationFiles();

    if (isStatusOnly) {
      console.log('=== STATUS DAS MIGRAÇÕES DDL ===');
      for (const file of files) {
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        const hash = sha256(sql);
        const applied = appliedMap.get(file);
        if (!applied) {
          console.log(`[PENDENTE]  ${file}`);
        } else if (applied.checksum !== hash) {
          console.log(`[ALTERADA]  ${file} (aplicada em ${applied.applied_at.toISOString()})`);
        } else {
          console.log(`[APLICADA]  ${file} (em ${applied.applied_at.toISOString()})`);
        }
      }
      return;
    }

    let appliedCount = 0;
    for (const file of files) {
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      const hash = sha256(sql);
      const existing = appliedMap.get(file);

      if (existing) {
        if (existing.checksum !== hash) {
          throw new Error(
            `Checksum divergente para migração já aplicada "${file}". Crie uma nova migração incremental em vez de editar uma já aplicada.`
          );
        }
        console.log(`[SKIP] ${file} (já aplicada)`);
        continue;
      }

      console.log(`[APPLY] Executando ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [file, hash]
        );
        await client.query('COMMIT');
        appliedCount++;
        console.log(`[OK] ${file} aplicada com sucesso.`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falha ao aplicar "${file}": ${err.message}`);
      }
    }

    console.log(`\nConcluído. ${appliedCount} nova(s) migração(ões) aplicada(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error('[MIGRATE ERROR]', err.message);
    process.exit(1);
  });
}

module.exports = { getMigrationFiles, sha256 };

