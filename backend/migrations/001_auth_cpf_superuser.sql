-- ============================================================
-- MIGRAÇÃO: AUTH POR CPF, PRIMEIRO ACESSO, AUDITORIA E SUPERUSER
-- Arquivo: backend/migrations/001_auth_cpf_superuser.sql
-- ============================================================

-- 1. Limpeza de contas órfãs duplicadas que não existem no EFETIVO
-- (Garante integridade antes da constraint UNIQUE no CPF)
DELETE FROM user_roles WHERE user_id IN (183, 184, 189, 381, 388);
DELETE FROM users WHERE id IN (183, 184, 189, 381, 388);

-- 2. Evolução da tabela USERS
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cpf                     VARCHAR(14),
  ADD COLUMN IF NOT EXISTS senha_definida          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS primeiro_acesso_concluido BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mfa_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mfa_secret              TEXT,
  ADD COLUMN IF NOT EXISTS bloqueado               BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tentativas_falhas       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_ate           TIMESTAMP;

-- 3. Preenchimento de CPF a partir de password ou EFETIVO (apenas dígitos numéricos)
UPDATE users u
SET cpf = regexp_replace(COALESCE(e.cpf, u.password), '[^0-9]', '', 'g')
FROM users u2
LEFT JOIN EFETIVO e ON u2.numero_ordem = e.matricula
WHERE u.id = u2.id AND (u.cpf IS NULL OR u.cpf = '');

-- Caso especial: admin mestre 999999
UPDATE users SET cpf = '00000000000' WHERE numero_ordem = '999999' AND (cpf IS NULL OR cpf = '');

-- 4. Constraint e Índice Único para CPF na tabela USERS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_cpf'
  ) THEN
    -- Garantir que não há duplicatas residuais
    ALTER TABLE users ADD CONSTRAINT uq_users_cpf UNIQUE (cpf);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);

-- 5. Atualizar status de contas que já haviam efetuado login prévio
UPDATE users
SET senha_definida = TRUE,
    primeiro_acesso_concluido = TRUE
WHERE last_login_at IS NOT NULL AND password_hash IS NOT NULL;

-- 6. Tabela de Tokens para Primeiro Acesso
CREATE TABLE IF NOT EXISTS first_access_tokens (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMP NOT NULL,
  used_at         TIMESTAMP,
  ip_solicitante  VARCHAR(45),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fat_token_hash ON first_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_fat_user_id ON first_access_tokens(user_id);

-- 7. Tabela de Logs de Auditoria do Sistema
CREATE TABLE IF NOT EXISTS audit_logs (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  cpf             VARCHAR(14),
  numero_ordem    VARCHAR(50),
  action          VARCHAR(100) NOT NULL,
  entity          VARCHAR(100),
  entity_id       VARCHAR(100),
  details         JSONB,
  ip              VARCHAR(45),
  user_agent      TEXT,
  status          VARCHAR(20) DEFAULT 'SUCCESS',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- 8. Role SUPERUSER e Permissões Administrativas Técnicas
INSERT INTO roles (nome, descricao, is_sistema) VALUES
  ('SUPERUSER', 'Superusuário / Desenvolvedor — administração técnica integral da plataforma', TRUE)
ON CONFLICT (nome) DO UPDATE SET descricao = EXCLUDED.descricao;

INSERT INTO permissions (code, descricao, modulo) VALUES
  ('sistema:admin',       'Acesso a parâmetros técnicos e configurações globais', 'sistema'),
  ('sistema:audit',       'Consulta e exportação de logs técnicos de auditoria',  'sistema'),
  ('sistema:diagnostics', 'Diagnóstico de integridade, banco e métricas técnicas', 'sistema'),
  ('usuarios:superuser',  'Gerenciamento técnico de desenvolvedores e superusuários', 'usuarios'),
  ('usuarios:bloquear',   'Bloqueio e desbloqueio imediato de contas de acesso',  'usuarios'),
  ('usuarios:reset',      'Autorização de redefinição e reset para primeiro acesso', 'usuarios')
ON CONFLICT (code) DO NOTHING;

-- Atribuir todas as permissões para SUPERUSER
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p WHERE r.nome = 'SUPERUSER'
ON CONFLICT DO NOTHING;

-- Garantir que ADMIN também tenha as novas permissões aplicáveis
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p 
  WHERE r.nome = 'ADMIN' AND p.code IN ('sistema:audit', 'usuarios:bloquear', 'usuarios:reset')
ON CONFLICT DO NOTHING;
