const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'escala_ft',
  port: process.env.DB_PORT || 5432,
});

// Helper to convert SQLite '?' to PostgreSQL '$n'
function translateSQL(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

async function setupDB() {
  let retries = 5;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log("Connected to PostgreSQL.");
      
      try {
        // Initialize Core Tables (Old and New for migration support)
        await client.query(`
          -- New Schema based on bd.sql (PostgreSQL optimized)
          
          -- 1. Tabela OPM
          CREATE TABLE IF NOT EXISTS OPM (
              id_opm SERIAL PRIMARY KEY,
              descricao VARCHAR(255) NOT NULL,
              sigla VARCHAR(50) NOT NULL,
              endereco VARCHAR(255),
              telefone VARCHAR(50),
              email VARCHAR(100)
          );

          -- 2. Tabela EFETIVO (Cadastro de Militares - Subsitui military_personnel)
          CREATE TABLE IF NOT EXISTS EFETIVO (
              id_militar SERIAL PRIMARY KEY,
              nome_completo VARCHAR(255) NOT NULL,
              nome_guerra VARCHAR(100), -- Mantido para compatibilidade frontend
              posto_graduacao VARCHAR(50) NOT NULL,
              matricula VARCHAR(50) UNIQUE NOT NULL,
              cpf VARCHAR(14) UNIQUE NOT NULL,
              rgpm VARCHAR(20),
              opm VARCHAR(100),
              telefone VARCHAR(50),
              status_ativo BOOLEAN DEFAULT TRUE
          );

          -- 3. Tabela CICLOS (Substitui months)
          CREATE TABLE IF NOT EXISTS CICLOS (
              id_ciclo SERIAL PRIMARY KEY,
              id_opm INTEGER REFERENCES OPM(id_opm),
              referencia_mes_ano VARCHAR(20) NOT NULL UNIQUE,
              data_inicio DATE NOT NULL,
              data_fim DATE NOT NULL,
              status VARCHAR(50) NOT NULL DEFAULT 'Aberto'
          );

          -- 4. Tabela REQUERIMENTOS (Substitui volunteers - metadados)
          CREATE TABLE IF NOT EXISTS REQUERIMENTOS (
              id_requerimento SERIAL PRIMARY KEY,
              id_militar INTEGER NOT NULL REFERENCES EFETIVO(id_militar),
              id_ciclo INTEGER NOT NULL REFERENCES CICLOS(id_ciclo),
              numero_requerimento VARCHAR(50),
              data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(id_militar, id_ciclo)
          );

          -- 5. Tabela DISPONIBILIDADE_REQUERIMENTO (Substitui volunteers - availability)
          CREATE TABLE IF NOT EXISTS DISPONIBILIDADE_REQUERIMENTO (
              id_disponibilidade SERIAL PRIMARY KEY,
              id_requerimento INTEGER NOT NULL REFERENCES REQUERIMENTOS(id_requerimento) ON DELETE CASCADE,
              dia_mes INTEGER NOT NULL,
              horario_turno VARCHAR(50) NOT NULL,
              marcado_disponivel BOOLEAN DEFAULT FALSE,
              marcado_servico_ordinario BOOLEAN DEFAULT FALSE,
              ativo BOOLEAN DEFAULT TRUE,
              observacoes TEXT
          );

          -- 6. Tabela ESCALA_PLANEJAMENTO (Substitui schedules)
          CREATE TABLE IF NOT EXISTS ESCALA_PLANEJAMENTO (
              id_escala SERIAL PRIMARY KEY,
              id_ciclo INTEGER NOT NULL REFERENCES CICLOS(id_ciclo),
              id_militar INTEGER NOT NULL REFERENCES EFETIVO(id_militar),
              id_disponibilidade INTEGER REFERENCES DISPONIBILIDADE_REQUERIMENTO(id_disponibilidade),
              data_servico DATE NOT NULL,
              horario_servico VARCHAR(50) NOT NULL,
              horario_embarque VARCHAR(50),
              local_embarque VARCHAR(100),
              cartao_viatura VARCHAR(100),
              funcao VARCHAR(50),
              observacoes TEXT
          );

          -- 7. Tabela SERVICOS_EXECUTADOS
          CREATE TABLE IF NOT EXISTS SERVICOS_EXECUTADOS (
              id_execucao SERIAL PRIMARY KEY,
              id_ciclo INTEGER NOT NULL REFERENCES CICLOS(id_ciclo),
              id_militar INTEGER NOT NULL REFERENCES EFETIVO(id_militar),
              id_escala INTEGER REFERENCES ESCALA_PLANEJAMENTO(id_escala) ON DELETE SET NULL,
              data_execucao DATE NOT NULL,
              dia_semana INTEGER NOT NULL,
              eh_feriado BOOLEAN DEFAULT FALSE,
              carga_horaria INTEGER NOT NULL,
              valor_remuneracao DECIMAL(10, 2) NOT NULL,
              status_presenca VARCHAR(50) NOT NULL
          );

          -- Legacy / Auth Tables
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            numero_ordem TEXT NOT NULL UNIQUE, -- Linkado a matricula de EFETIVO
            password TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Migration Support for existing data structure
          CREATE TABLE IF NOT EXISTS months (
            id SERIAL PRIMARY KEY,
            month_key TEXT NOT NULL UNIQUE,
            month_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Triggers logic (Function + Trigger)
          CREATE OR REPLACE FUNCTION fn_valida_escala()
          RETURNS TRIGGER AS $$
          DECLARE
              v_marcado_disponivel BOOLEAN;
              v_ativo BOOLEAN;
          BEGIN
              IF NEW.id_disponibilidade IS NOT NULL THEN
                  SELECT marcado_disponivel, ativo 
                  INTO v_marcado_disponivel, v_ativo
                  FROM DISPONIBILIDADE_REQUERIMENTO
                  WHERE id_disponibilidade = NEW.id_disponibilidade;

                  IF v_marcado_disponivel = FALSE OR v_ativo = FALSE THEN
                      RAISE EXCEPTION 'Erro: O militar não marcou este turno como disponível no requerimento ou a disponibilidade está inativa.';
                  END IF;
              END IF;
              RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          DROP TRIGGER IF EXISTS trg_valida_escala_insert ON ESCALA_PLANEJAMENTO;
          CREATE TRIGGER trg_valida_escala_insert
          BEFORE INSERT ON ESCALA_PLANEJAMENTO
          FOR EACH ROW EXECUTE FUNCTION fn_valida_escala();

          DROP TRIGGER IF EXISTS trg_valida_escala_update ON ESCALA_PLANEJAMENTO;
          CREATE TRIGGER trg_valida_escala_update
          BEFORE UPDATE ON ESCALA_PLANEJAMENTO
          FOR EACH ROW EXECUTE FUNCTION fn_valida_escala();

          DROP VIEW IF EXISTS vw_detalhes_ciclos;
          CREATE VIEW vw_detalhes_ciclos AS
          SELECT 
              c.id_ciclo,
              c.id_opm,
              o.sigla as opm_sigla,
              o.descricao as opm_descricao,
              c.referencia_mes_ano,
              c.data_inicio,
              c.data_fim,
              c.status,
              (SELECT COUNT(*) FROM REQUERIMENTOS r WHERE r.id_ciclo = c.id_ciclo) as total_inscritos,
              (SELECT COUNT(*) FROM ESCALA_PLANEJAMENTO ep WHERE ep.id_ciclo = c.id_ciclo) as total_escalados
          FROM CICLOS c
          LEFT JOIN OPM o ON c.id_opm = o.id_opm;
        `);

        // Check if default OPM exists
        const opmCheck = await client.query('SELECT count(*) FROM OPM');
        if (parseInt(opmCheck.rows[0].count) === 0) {
          await client.query("INSERT INTO OPM (descricao, sigla) VALUES ('Batalhão de Policia Militar', 'OPM Padrão')");
        }

        // --- Create Initial Admin ---
        const adminMatricula = '999999';
        const adminCpf = '00000000000';
        const adminCheck = await client.query('SELECT id FROM users WHERE numero_ordem = $1', [adminMatricula]);
        
        if (adminCheck.rows.length === 0) {
          // Add to EFETIVO first
          await client.query(
            "INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, opm, status_ativo) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (matricula) DO NOTHING",
            ['Administrador do Sistema', 'Administrador', 'Coronel PM', adminMatricula, adminCpf, 'OPM Padrão', true]
          );

          // Add to users
          await client.query(
            "INSERT INTO users (numero_ordem, password, is_admin) VALUES ($1, $2, $3)",
            [adminMatricula, adminCpf, 1]
          );
          console.log(`Initial Admin User created: ${adminMatricula}`);
        }

      } finally {
        client.release();
      }

      // Wrapper methods using the pool
      const dbWrapper = {
        exec: async (sql) => {
          await pool.query(sql);
        },

        get: async (sql, params = []) => {
          const { rows } = await pool.query(translateSQL(sql), params);
          return rows[0];
        },

        all: async (sql, params = []) => {
          const { rows } = await pool.query(translateSQL(sql), params);
          return rows;
        },

        run: async (sql, params = []) => {
          const isInsert = sql.toUpperCase().includes('INSERT');
          const hasReturning = sql.toUpperCase().includes('RETURNING');
          
          let internalSql = sql;
          if (isInsert && !hasReturning) {
            internalSql += ' RETURNING *';
          }
            
          const result = await pool.query(translateSQL(internalSql), params);
          
          // Se for insert, tenta pegar o valor da primeira coluna (geralmente o ID) para simular o lastID do SQLite
          let lastID = null;
          if (isInsert && result.rows.length > 0) {
            const firstRow = result.rows[0];
            lastID = firstRow[Object.keys(firstRow)[0]];
          }

          return { 
            lastID: lastID, 
            changes: result.rowCount 
          };
        },
        
        // Add pool access for complex queries
        query: async (text, params) => {
          return pool.query(text, params);
        }
      };

      console.log("PostgreSQL Database system integrated with bd.sql schema.");
      return dbWrapper;

    } catch (err) {
      console.error(`Database connection failed (${retries} retries left):`, err.message);
      retries -= 1;
      if (retries === 0) throw err;
      await new Promise(res => setTimeout(res, 5000)); // Wait 5s before retry
    }
  }
}

module.exports = { setupDB };
