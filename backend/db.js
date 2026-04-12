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
        // ---------------------------------------------------------------
        // DIAGNÓSTICO: logar estrutura real da tabela users
        // ---------------------------------------------------------------
        const userColsRes = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          ORDER BY ordinal_position
        `);
        if (userColsRes.rows.length > 0) {
          console.log('[DB] users columns:', userColsRes.rows.map(r => r.column_name).join(', '));
        } else {
          console.log('[DB] users table does not exist yet — will be created fresh.');
        }

        // ---------------------------------------------------------------
        // PRÉ-MIGRATION: dropar tabelas RBAC com schema antigo
        // (seguro: não contém dados de negócio; serão reseedadas abaixo)
        // ---------------------------------------------------------------
        await client.query(`
          DROP TABLE IF EXISTS user_roles CASCADE;
          DROP TABLE IF EXISTS user_permissions CASCADE;
          DROP TABLE IF EXISTS role_permissions CASCADE;
          DROP TABLE IF EXISTS permissions CASCADE;
          DROP TABLE IF EXISTS roles CASCADE;
          DROP TABLE IF EXISTS user_profiles CASCADE;
          DROP TABLE IF EXISTS password_reset_tokens CASCADE;
          DROP TABLE IF EXISTS refresh_tokens CASCADE;
          -- Drop views que possuem dependências de colunas que serão migradas
          DROP VIEW IF EXISTS vw_relatorio_operacional_completo CASCADE;
          DROP VIEW IF EXISTS vw_relatorio_operacional_agregado CASCADE;
        `);
        console.log('[DB] Tabelas RBAC antigas removidas — serão recriadas com schema correto.');

        // ---------------------------------------------------------------
        // PRÉ-MIGRATION: renomear colunas legadas de users se necessário
        // ---------------------------------------------------------------
        await client.query(`
          DO $$
          BEGIN
            -- Renomeia id_usuario → id (schema legado)
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'users' AND column_name = 'id_usuario'
            ) AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'users' AND column_name = 'id'
            ) THEN
              ALTER TABLE users RENAME COLUMN id_usuario TO id;
            END IF;

            -- Garante que password existe
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'users' AND column_name = 'senha'
            ) AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'users' AND column_name = 'password'
            ) THEN
              ALTER TABLE users RENAME COLUMN senha TO password;
            END IF;
          END $$;
        `);

        // Initialize Core Tables
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
              nome_guerra VARCHAR(100),
              posto_graduacao VARCHAR(50) NOT NULL,
              matricula VARCHAR(50),
              numero_ordem VARCHAR(50),
              cpf VARCHAR(14) UNIQUE NOT NULL,
              rgpm VARCHAR(20),
              opm VARCHAR(100),
              telefone VARCHAR(50),
              motorista VARCHAR(10) DEFAULT 'Não',
              status_ativo BOOLEAN DEFAULT TRUE
          );

          -- Migration: Adicionar coluna motorista se não existir
          ALTER TABLE EFETIVO ADD COLUMN IF NOT EXISTS motorista VARCHAR(10) DEFAULT 'Não';

          -- 3. Tabela CICLOS
          CREATE TABLE IF NOT EXISTS CICLOS (
              id_ciclo SERIAL PRIMARY KEY,
              id_opm INTEGER REFERENCES OPM(id_opm),
              data_inicio DATE NOT NULL,
              data_fim DATE NOT NULL,
              status VARCHAR(50) NOT NULL DEFAULT 'Aberto',
              valor_total_previsto DECIMAL(12, 2) DEFAULT 0
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

          -- 5.1 Tabela TIPOS_SERVICO
          CREATE TABLE IF NOT EXISTS TIPOS_SERVICO (
              id_tipo_servico SERIAL PRIMARY KEY,
              descricao VARCHAR(100) NOT NULL,
              carga_horaria INTEGER NOT NULL,
              valor_remuneracao DECIMAL(10, 2) NOT NULL,
              ativo BOOLEAN DEFAULT TRUE
          );

          -- Migração para a nova estrutura de Escala (Unificação de Viatura/Local para Nome do Recurso)
          DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escala_planejamento' AND column_name='local_embarque') THEN
               ALTER TABLE ESCALA_PLANEJAMENTO RENAME COLUMN local_embarque TO nome_recurso;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escala_planejamento' AND column_name='cartao_viatura') THEN
               ALTER TABLE ESCALA_PLANEJAMENTO DROP COLUMN cartao_viatura;
            END IF;
          END $$;

          -- 6. Tabela ESCALA_PLANEJAMENTO (Substitui schedules)
          CREATE TABLE IF NOT EXISTS ESCALA_PLANEJAMENTO (
              id_escala SERIAL PRIMARY KEY,
              id_ciclo INTEGER NOT NULL REFERENCES CICLOS(id_ciclo),
              id_militar INTEGER NOT NULL REFERENCES EFETIVO(id_militar),
              id_disponibilidade INTEGER REFERENCES DISPONIBILIDADE_REQUERIMENTO(id_disponibilidade),
              id_tipo_servico INTEGER REFERENCES TIPOS_SERVICO(id_tipo_servico),
              data_servico DATE NOT NULL,
              horario_servico VARCHAR(50) NOT NULL,
              horario_embarque VARCHAR(50),
              nome_recurso VARCHAR(100),
              funcao VARCHAR(50),
              observacoes TEXT
          );

          -- 7. Tabela SERVICOS_EXECUTADOS
          CREATE TABLE IF NOT EXISTS SERVICOS_EXECUTADOS (
              id_execucao SERIAL PRIMARY KEY,
              id_ciclo INTEGER NOT NULL REFERENCES CICLOS(id_ciclo),
              id_militar INTEGER NOT NULL REFERENCES EFETIVO(id_militar),
              id_tipo_servico INTEGER REFERENCES TIPOS_SERVICO(id_tipo_servico),
              data_execucao DATE NOT NULL,
              dia_semana INTEGER NOT NULL,
              eh_feriado BOOLEAN DEFAULT FALSE,
              carga_horaria INTEGER NOT NULL,
              valor_remuneracao DECIMAL(10, 2) NOT NULL,
              status_presenca VARCHAR(50) NOT NULL,
              cmd VARCHAR(100),
              opm_origem VARCHAR(100),
              modalidade VARCHAR(100),
              guarnicao VARCHAR(100)
          );

          -- Garantir que colunas novas existam (Migration via SQL)
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ciclos' AND column_name='valor_total_previsto') THEN
              ALTER TABLE CICLOS ADD COLUMN valor_total_previsto DECIMAL(12, 2) DEFAULT 0;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escala_planejamento' AND column_name='id_tipo_servico') THEN
              ALTER TABLE ESCALA_PLANEJAMENTO ADD COLUMN id_tipo_servico INTEGER REFERENCES TIPOS_SERVICO(id_tipo_servico);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='servicos_executados' AND column_name='id_tipo_servico') THEN
              ALTER TABLE SERVICOS_EXECUTADOS ADD COLUMN id_tipo_servico INTEGER REFERENCES TIPOS_SERVICO(id_tipo_servico);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='servicos_executados' AND column_name='cmd') THEN
              ALTER TABLE SERVICOS_EXECUTADOS ADD COLUMN cmd VARCHAR(100);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='servicos_executados' AND column_name='opm_origem') THEN
              ALTER TABLE SERVICOS_EXECUTADOS ADD COLUMN opm_origem VARCHAR(100);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='servicos_executados' AND column_name='modalidade') THEN
              ALTER TABLE SERVICOS_EXECUTADOS ADD COLUMN modalidade VARCHAR(100);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='servicos_executados' AND column_name='guarnicao') THEN
              ALTER TABLE SERVICOS_EXECUTADOS ADD COLUMN guarnicao VARCHAR(100);
            END IF;

            -- Migration: remover id_escala de SERVICOS_EXECUTADOS
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='servicos_executados' AND column_name='id_escala') THEN
              ALTER TABLE SERVICOS_EXECUTADOS DROP COLUMN id_escala CASCADE;
            END IF;

            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='servicos_executados' AND column_name='id_ciclo' AND is_nullable='YES') THEN
              ALTER TABLE SERVICOS_EXECUTADOS ALTER COLUMN id_ciclo SET NOT NULL;
            END IF;



            -- 9. Tabela FERIADOS (Para Cálculo de Remuneração de FT)
            CREATE TABLE IF NOT EXISTS FERIADOS (
                id_feriado SERIAL PRIMARY KEY,
                data DATE NOT NULL UNIQUE,
                descricao VARCHAR(255)
            );

            -- 8. Tabela de Relacionamento Ternário com Surrogate Key e Status
            DROP TABLE IF EXISTS ESCALA_EFETIVO_SERVICO CASCADE;
            CREATE TABLE ESCALA_EFETIVO_SERVICO (
                id_vinculo SERIAL PRIMARY KEY,
                id_escala INTEGER REFERENCES ESCALA_PLANEJAMENTO(id_escala) ON DELETE CASCADE,
                id_militar INTEGER NOT NULL REFERENCES EFETIVO(id_militar) ON DELETE CASCADE,
                id_execucao INTEGER REFERENCES SERVICOS_EXECUTADOS(id_execucao) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL,
                data_vinculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                editado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

           -- Migration: Adicionar editado_em se não existir
           ALTER TABLE ESCALA_EFETIVO_SERVICO ADD COLUMN IF NOT EXISTS editado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

            -- Migration: remover tabela schedules legada (substituída por ESCALA_PLANEJAMENTO)
            DROP TABLE IF EXISTS schedules CASCADE;

          END $$;

          -- Populando FERIADOS (Seeds 2025-2026)
          INSERT INTO FERIADOS (data, descricao) VALUES
            -- 2025
            ('2025-01-01', 'Confraternização Universal'),
            ('2025-03-03', 'Carnaval'),
            ('2025-03-04', 'Carnaval'),
            ('2025-04-18', 'Sexta-feira Santa'),
            ('2025-04-21', 'Tiradentes'),
            ('2025-05-01', 'Dia do Trabalho'),
            ('2025-06-19', 'Corpus Christi'),
            ('2025-09-07', 'Independência do Brasil'),
            ('2025-10-12', 'Nossa Sra Aparecida'),
            ('2025-11-02', 'Finados'),
            ('2025-11-15', 'Proclamação da República'),
            ('2025-11-20', 'Consciência Negra'),
            ('2025-12-25', 'Natal'),
            -- 2026
            ('2026-01-01', 'Confraternização Universal'),
            ('2026-02-16', 'Carnaval'),
            ('2026-02-17', 'Carnaval'),
            ('2026-03-03', 'Carnaval'),
            ('2026-04-03', 'Sexta-feira Santa'),
            ('2026-04-21', 'Tiradentes'),
            ('2026-05-01', 'Dia do Trabalho'),
            ('2026-06-04', 'Corpus Christi'),
            ('2026-07-09', 'Independência do Brasil'),
            ('2026-10-12', 'Nossa Sra Aparecida'),
            ('2026-11-02', 'Finados'),
            ('2026-11-15', 'Proclamação da República'),
            ('2026-11-20', 'Consciência Negra'),
            ('2026-12-25', 'Natal')
          ON CONFLICT (data) DO NOTHING;

          -- ============================================================
          -- AUTH & USERS (Schema v2 — RBAC)
          -- ============================================================

          CREATE TABLE IF NOT EXISTS users (
            id             SERIAL PRIMARY KEY,
            numero_ordem   TEXT NOT NULL UNIQUE,
            password       TEXT NOT NULL,             -- legado: CPF texto plano
            password_hash  TEXT,                      -- bcrypt hash (migrado progressivamente)
            is_admin       INTEGER DEFAULT 0,         -- legado: mantido para rollback
            status         VARCHAR(20) NOT NULL DEFAULT 'ativo',
            last_login_at  TIMESTAMP,
            created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          -- Migration: garantir colunas novas em users pré-existente
          DO $$
          BEGIN
            -- Se a tabela users já existia sem a coluna id, precisamos adicioná-la e redefini-la como PK
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id') THEN
              ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
              ALTER TABLE users ADD COLUMN id SERIAL PRIMARY KEY;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
              ALTER TABLE users ADD COLUMN password_hash TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
              ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ativo';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_at') THEN
              ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
              ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
            END IF;
          END $$;



          -- Perfil estendido do usuário (1:1)
          CREATE TABLE IF NOT EXISTS user_profiles (
            id              SERIAL PRIMARY KEY,
            user_id         INTEGER NOT NULL UNIQUE REFERENCES users ON DELETE CASCADE,
            email           VARCHAR(255) UNIQUE,
            telefone        VARCHAR(30),
            avatar_url      TEXT,
            avatar_filename TEXT,
            status_ativo    BOOLEAN NOT NULL DEFAULT TRUE,
            deleted_at      TIMESTAMP,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          -- Tokens para redefinição de senha (12h de validade)
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id              SERIAL PRIMARY KEY,
            user_id         INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
            token_hash      TEXT NOT NULL UNIQUE,
            expires_at      TIMESTAMP NOT NULL,
            used_at         TIMESTAMP,
            ip_solicitante  INET,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          -- Refresh Tokens JWT (7 dias)
          CREATE TABLE IF NOT EXISTS refresh_tokens (
            id          SERIAL PRIMARY KEY,
            user_id     INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
            token_hash  TEXT NOT NULL UNIQUE,
            expires_at  TIMESTAMP NOT NULL,
            revoked_at  TIMESTAMP,
            ip_criacao  INET,
            user_agent  TEXT,
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          -- ============================================================
          -- RBAC — Roles, Permissions, Relacionamentos
          -- ============================================================
          CREATE TABLE IF NOT EXISTS roles (
            id          SERIAL PRIMARY KEY,
            nome        VARCHAR(50) NOT NULL UNIQUE,
            descricao   TEXT,
            is_sistema  BOOLEAN NOT NULL DEFAULT FALSE,
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS permissions (
            id          SERIAL PRIMARY KEY,
            code        VARCHAR(100) NOT NULL UNIQUE,
            descricao   TEXT,
            modulo      VARCHAR(50),
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS role_permissions (
            role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            permission_id INTEGER NOT NULL REFERENCES permissions ON DELETE CASCADE,
            PRIMARY KEY (role_id, permission_id)
          );

          CREATE TABLE IF NOT EXISTS user_roles (
            user_id      INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
            role_id      INTEGER NOT NULL REFERENCES roles ON DELETE CASCADE,
            atribuido_por INTEGER REFERENCES users,
            atribuido_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, role_id)
          );

          -- Permissões diretas por usuário (sobrepõem ou complementam roles)
          CREATE TABLE IF NOT EXISTS user_permissions (
            user_id       INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
            permission_id INTEGER NOT NULL REFERENCES permissions ON DELETE CASCADE,
            permitido     BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE = Adiciona, FALSE = Revoga explicitamente
            atribuido_por INTEGER REFERENCES users,
            atribuido_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, permission_id)
          );

          -- ============================================================
          -- ÍNDICES
          -- ============================================================
          CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id    ON user_profiles(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_profiles_email      ON user_profiles(email) WHERE email IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_prt_token_hash           ON password_reset_tokens(token_hash);
          CREATE INDEX IF NOT EXISTS idx_refresh_token_hash       ON refresh_tokens(token_hash);
          CREATE INDEX IF NOT EXISTS idx_user_roles_user_id       ON user_roles(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_perms_user_id       ON user_permissions(user_id);
          CREATE INDEX IF NOT EXISTS idx_role_perms_role_id       ON role_permissions(role_id);

          -- ============================================================
          -- Triggers logic (Function + Trigger — Escalas)
          -- ============================================================
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

          -- Trigger para validar as datas entre planejamento e execução
          CREATE OR REPLACE FUNCTION fn_valida_vinculo_planejamento_execucao()
          RETURNS TRIGGER AS $$
          DECLARE
              v_data_planejada DATE;
              v_data_executada DATE;
          BEGIN
              SELECT data_servico INTO v_data_planejada FROM ESCALA_PLANEJAMENTO WHERE id_escala = NEW.id_escala;
              SELECT data_execucao INTO v_data_executada FROM SERVICOS_EXECUTADOS WHERE id_execucao = NEW.id_execucao;

              IF v_data_planejada IS NOT NULL AND v_data_executada IS NOT NULL AND v_data_planejada != v_data_executada THEN
                  RAISE EXCEPTION 'Discrepância de Datas: O serviço planejado para % não pode ser vinculado a uma execução de %.', v_data_planejada, v_data_executada;
              END IF;

              RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          -- Limpeza de possíveis triggers residuais em tabelas incorretas
          DROP TRIGGER IF EXISTS trg_valida_vinculo_planejamento_execucao ON OPM;
          DROP TRIGGER IF EXISTS trg_valida_vinculo_planejamento_execucao ON EFETIVO;
          DROP TRIGGER IF EXISTS trg_valida_vinculo_planejamento_execucao ON CICLOS;
          DROP TRIGGER IF EXISTS trg_valida_vinculo_planejamento_execucao ON SERVICOS_EXECUTADOS;

          DROP TRIGGER IF EXISTS trg_valida_vinculo_planejamento_execucao ON ESCALA_EFETIVO_SERVICO;
          CREATE TRIGGER trg_valida_vinculo_planejamento_execucao
          BEFORE INSERT OR UPDATE ON ESCALA_EFETIVO_SERVICO
          FOR EACH ROW EXECUTE FUNCTION fn_valida_vinculo_planejamento_execucao();

          DROP VIEW IF EXISTS vw_detalhes_ciclos;
          CREATE VIEW vw_detalhes_ciclos AS
          SELECT 
              c.id_ciclo,
              c.id_opm,
              o.sigla as opm_sigla,
              o.descricao as opm_descricao,
              TO_CHAR(c.data_inicio, 'MM/YYYY') as referencia_mes_ano,
              c.data_inicio,
          c.data_fim,
          c.status,
          c.valor_total_previsto,
              (SELECT COUNT(*) FROM REQUERIMENTOS r WHERE r.id_ciclo = c.id_ciclo) as total_inscritos,
              (SELECT COUNT(*) FROM ESCALA_PLANEJAMENTO ep WHERE ep.id_ciclo = c.id_ciclo) as total_escalados
          FROM CICLOS c
          LEFT JOIN OPM o ON c.id_opm = o.id_opm;

          DROP VIEW IF EXISTS vw_relatorio_operacional_completo CASCADE;
          CREATE VIEW vw_relatorio_operacional_completo AS
          SELECT 
              ees.id_vinculo,
              ees.status AS vinculo_status,
              e.id_militar, e.matricula, e.nome_completo, e.nome_guerra, e.posto_graduacao,
              TO_CHAR(c.data_inicio, 'MM/YYYY') as referencia_mes_ano,
              ep.data_servico AS planejamento_data, ep.horario_servico AS planejamento_horario, ep.nome_recurso AS planejamento_recurso,
              ts_pl.descricao AS planejamento_tipo_servico_desc,
              se.data_execucao AS execucao_data, se.valor_remuneracao AS execucao_valor, se.carga_horaria AS execucao_carga,
              ts_ex.descricao AS execucao_tipo_servico_desc
          FROM ESCALA_EFETIVO_SERVICO ees
          JOIN EFETIVO e ON ees.id_militar = e.id_militar
          LEFT JOIN ESCALA_PLANEJAMENTO ep ON ees.id_escala = ep.id_escala
          LEFT JOIN TIPOS_SERVICO ts_pl ON ep.id_tipo_servico = ts_pl.id_tipo_servico
          LEFT JOIN SERVICOS_EXECUTADOS se ON ees.id_execucao = se.id_execucao
          LEFT JOIN TIPOS_SERVICO ts_ex ON se.id_tipo_servico = ts_ex.id_tipo_servico
          LEFT JOIN CICLOS c ON (ep.id_ciclo = c.id_ciclo OR se.id_ciclo = c.id_ciclo)
          LEFT JOIN OPM o ON c.id_opm = o.id_opm;

          DROP VIEW IF EXISTS vw_relatorio_operacional_agregado CASCADE;
          CREATE VIEW vw_relatorio_operacional_agregado AS
          SELECT 
              c.id_ciclo, TO_CHAR(c.data_inicio, 'MM/YYYY') as referencia_mes_ano, c.valor_total_previsto AS ciclo_valor_teto, o.sigla AS opm_sigla,
              e.id_militar, e.nome_guerra, e.posto_graduacao,
              COUNT(DISTINCT ep.id_escala) as qtd_escalas,
              COUNT(DISTINCT se.id_execucao) as qtd_servicos_executados,
              COALESCE(SUM(se.carga_horaria), 0) as total_carga_horaria_executada,
              COALESCE(SUM(se.valor_remuneracao), 0) as total_remuneracao
          FROM CICLOS c
          JOIN OPM o ON c.id_opm = o.id_opm
          JOIN EFETIVO e ON 1=1
          LEFT JOIN ESCALA_PLANEJAMENTO ep ON c.id_ciclo = ep.id_ciclo AND e.id_militar = ep.id_militar
          LEFT JOIN SERVICOS_EXECUTADOS se ON c.id_ciclo = se.id_ciclo AND e.id_militar = se.id_militar
          GROUP BY c.id_ciclo, TO_CHAR(c.data_inicio, 'MM/YYYY'), c.valor_total_previsto, o.sigla, e.id_militar, e.nome_guerra, e.posto_graduacao
          HAVING COUNT(DISTINCT ep.id_escala) > 0 OR COUNT(DISTINCT se.id_execucao) > 0;
        `);

        // ============================================================
        // SEEDS — OPM padrão
        // ============================================================
        const opmCheck = await client.query('SELECT count(*) FROM OPM');
        if (parseInt(opmCheck.rows[0].count) === 0) {
          await client.query("INSERT INTO OPM (descricao, sigla) VALUES ('Batalhão de Policia Militar', 'OPM Padrão')");
        }

        // ============================================================
        // SEEDS — Tipos de Serviço Predeterminados
        // ============================================================
        const tiposCheck = await client.query('SELECT count(*) FROM TIPOS_SERVICO');
        if (parseInt(tiposCheck.rows[0].count) === 0) {
          await client.query("INSERT INTO TIPOS_SERVICO (descricao, carga_horaria, valor_remuneracao) VALUES ('Serviço 6h', 6, 192.03)");
          await client.query("INSERT INTO TIPOS_SERVICO (descricao, carga_horaria, valor_remuneracao) VALUES ('Serviço 8h', 8, 250.00)");
        }

        // ============================================================
        // SEEDS — Roles padrão do sistema
        // ============================================================
        await client.query(`
          INSERT INTO roles (nome, descricao, is_sistema) VALUES
            ('ADMIN',   'Administrador — acesso total ao sistema',                   TRUE),
            ('GERENTE', 'Gerente Operacional — ciclos, escalas e efetivo',           TRUE),
            ('MILITAR', 'Militar — acesso básico ao próprio perfil e requerimentos', TRUE)
          ON CONFLICT (nome) DO NOTHING
        `);

        // ============================================================
        // SEEDS — Permissões granulares
        // ============================================================
        await client.query(`
          INSERT INTO permissions (code, descricao, modulo) VALUES
            ('efetivo:read',    'Visualizar efetivo',              'efetivo'),
            ('efetivo:create',  'Cadastrar militar',               'efetivo'),
            ('efetivo:update',  'Editar dados de militar',         'efetivo'),
            ('efetivo:delete',  'Excluir militar do sistema',      'efetivo'),
            ('efetivo:import',  'Importar efetivo via planilha',   'efetivo'),
            ('ciclos:read',     'Visualizar ciclos',               'ciclos'),
            ('ciclos:create',   'Criar ciclo de escala',           'ciclos'),
            ('ciclos:update',   'Editar ciclo',                    'ciclos'),
            ('ciclos:delete',   'Encerrar/excluir ciclo',          'ciclos'),
            ('escalas:read',    'Visualizar escalas',              'escalas'),
            ('escalas:create',  'Criar escala',                    'escalas'),
            ('escalas:update',  'Editar escala',                   'escalas'),
            ('usuarios:read',   'Visualizar usuários',             'usuarios'),
            ('usuarios:admin',  'Gerenciar contas e permissões',   'usuarios'),
            ('financeiro:read', 'Visualizar financeiro',           'financeiro'),
            ('opm:read',        'Visualizar OPMs',                 'opm'),
            ('opm:admin',       'Gerenciar OPMs',                  'opm'),
            ('perfil:read',     'Ver próprio perfil',              'perfil'),
            ('perfil:update',   'Editar próprio perfil',           'perfil')
          ON CONFLICT (code) DO NOTHING
        `);

        // Atribuir TODAS as permissões para ADMIN
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM roles r, permissions p WHERE r.nome = 'ADMIN'
          ON CONFLICT DO NOTHING
        `);

        // Permissões do GERENTE
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM roles r, permissions p
            WHERE r.nome = 'GERENTE'
              AND p.code IN (
                'efetivo:read','efetivo:create','efetivo:update','efetivo:import',
                'ciclos:read','ciclos:create','ciclos:update',
                'escalas:read','escalas:create','escalas:update',
                'financeiro:read','opm:read',
                'usuarios:read',
                'perfil:read','perfil:update'
              )
          ON CONFLICT DO NOTHING
        `);

        // Permissões do MILITAR
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM roles r, permissions p
            WHERE r.nome = 'MILITAR'
              AND p.code IN ('escalas:read','perfil:read','perfil:update')
          ON CONFLICT DO NOTHING
        `);

        // ============================================================
        // Admin mestre — 999999
        // ============================================================
        const adminMatricula = '999999';
        const adminCpf = '00000000000';
        const adminCheck = await client.query('SELECT id FROM users WHERE numero_ordem = $1', [adminMatricula]);

        if (adminCheck.rows.length === 0) {
          await client.query(
            "INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, opm, status_ativo) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (cpf) DO NOTHING",
            ['Administrador do Sistema', 'Administrador', 'Coronel PM', adminMatricula, adminCpf, 'OPM Padrão', true]
          );
          await client.query(
            "INSERT INTO users (numero_ordem, password, is_admin) VALUES ($1, $2, $3)",
            [adminMatricula, adminCpf, 1]
          );
          console.log(`[DB] Admin mestre criado: ${adminMatricula}`);
        }

        // Garantir que o admin mestre tenha role ADMIN
        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, r.id FROM users u, roles r
            WHERE u.numero_ordem = $1 AND r.nome = 'ADMIN'
          ON CONFLICT DO NOTHING
        `, [adminMatricula]);

        // Migrar is_admin=1 existentes para role ADMIN
        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, r.id FROM users u, roles r
            WHERE u.is_admin = 1 AND r.nome = 'ADMIN'
          ON CONFLICT DO NOTHING
        `);

        // Migrar demais (is_admin=0) para role MILITAR
        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, r.id FROM users u, roles r
            WHERE (u.is_admin IS NULL OR u.is_admin = 0) AND r.nome = 'MILITAR'
              AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)
          ON CONFLICT DO NOTHING
        `);

        console.log('[DB] Schema RBAC + Perfil inicializado com sucesso.');

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

      // ============================================================
      // CONFIGURAÇÃO DE TRIGGERS (Automação da Tabela Ternária)
      // ============================================================
      const clientTrg = await pool.connect();
      try {
        await clientTrg.query(`
          -- Trigger para Planejamento: Cria registro inicial
          CREATE OR REPLACE FUNCTION trg_planejamento_ternaria()
          RETURNS TRIGGER AS $$
          BEGIN
              INSERT INTO ESCALA_EFETIVO_SERVICO (id_escala, id_militar, status)
              VALUES (NEW.id_escala, NEW.id_militar, 'Planejado e não executado');
              RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          DROP TRIGGER IF EXISTS trg_planejamento_after_insert ON ESCALA_PLANEJAMENTO;
          CREATE TRIGGER trg_planejamento_after_insert
          AFTER INSERT ON ESCALA_PLANEJAMENTO
          FOR EACH ROW EXECUTE FUNCTION trg_planejamento_ternaria();

          -- Trigger para Execução: Vincula ao planejamento ou cria novo registro
          CREATE OR REPLACE FUNCTION trg_execucao_ternaria()
          RETURNS TRIGGER AS $$
          DECLARE
              v_id_escala INTEGER;
              v_vinculo_id INTEGER;
          BEGIN
              -- 1. Busca se existe planejamento para este militar na mesma data
              SELECT ep.id_escala INTO v_id_escala
              FROM ESCALA_PLANEJAMENTO ep
              WHERE ep.id_militar = NEW.id_militar
                AND ep.data_servico = NEW.data_execucao
              LIMIT 1;

              IF v_id_escala IS NOT NULL THEN
                  -- Localiza o registro na ternária que já tem o planejamento
                  SELECT id_vinculo INTO v_vinculo_id
                  FROM ESCALA_EFETIVO_SERVICO
                  WHERE id_escala = v_id_escala AND id_militar = NEW.id_militar
                  LIMIT 1;

                  IF v_vinculo_id IS NOT NULL THEN
                      UPDATE ESCALA_EFETIVO_SERVICO
                      SET id_execucao = NEW.id_execucao,
                          status = 'Planejado e executado',
                          editado_em = CURRENT_TIMESTAMP
                      WHERE id_vinculo = v_vinculo_id;
                  ELSE
                      -- Fallback caso o registro de planejamento tenha sido perdido na ternária
                      INSERT INTO ESCALA_EFETIVO_SERVICO (id_escala, id_militar, id_execucao, status)
                      VALUES (v_id_escala, NEW.id_militar, NEW.id_execucao, 'Planejado e executado');
                  END IF;
              ELSE
                  -- Sem Planejamento: Cria novo registro de execução avulsa
                  INSERT INTO ESCALA_EFETIVO_SERVICO (id_execucao, id_militar, status)
                  VALUES (NEW.id_execucao, NEW.id_militar, 'Apenas executado');
              END IF;

              RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          DROP TRIGGER IF EXISTS trg_execucao_after_insert ON SERVICOS_EXECUTADOS;
          CREATE TRIGGER trg_execucao_after_insert
          AFTER INSERT ON SERVICOS_EXECUTADOS
          FOR EACH ROW EXECUTE FUNCTION trg_execucao_ternaria();
        `);
        console.log('[DB] Triggers de automação ternária configuradas com sucesso.');
      } finally {
        clientTrg.release();
      }

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
