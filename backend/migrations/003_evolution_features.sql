-- ============================================================
-- MIGRAÇÃO 003: ÍNDICES DE EQUIDADE, CIÊNCIA DE ESCALA E PERMUTAS
-- Arquivo: backend/migrations/003_evolution_features.sql
-- ============================================================

-- 1. Índice composto para contagem rápida de cotas por militar/ciclo
CREATE INDEX IF NOT EXISTS idx_servicos_militar_ciclo
  ON SERVICOS_EXECUTADOS(id_militar, id_ciclo);

-- 2. Confirmação de ciência na escala planejada (M14)
ALTER TABLE ESCALA_PLANEJAMENTO
  ADD COLUMN IF NOT EXISTS ciente_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ciente_ip VARCHAR(45);

-- 3. Solicitações digitais de permuta/substituição (M15)
CREATE TABLE IF NOT EXISTS SOLICITACOES_PERMUTA (
  id_permuta              SERIAL PRIMARY KEY,
  id_escala               INTEGER NOT NULL REFERENCES ESCALA_PLANEJAMENTO(id_escala) ON DELETE CASCADE,
  id_ciclo                INTEGER NOT NULL REFERENCES CICLOS(id_ciclo) ON DELETE CASCADE,
  id_militar_solicitante  INTEGER NOT NULL REFERENCES EFETIVO(id_militar) ON DELETE CASCADE,
  id_militar_substituto   INTEGER REFERENCES EFETIVO(id_militar) ON DELETE SET NULL,
  motivo                  TEXT NOT NULL,
  status                  VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
  observacao_aprovador    TEXT,
  aprovado_por            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permutas_ciclo_status
  ON SOLICITACOES_PERMUTA(id_ciclo, status);

-- 4. Permissões RBAC para novas funcionalidades
INSERT INTO permissions (code, descricao, modulo) VALUES
  ('escala:sugerir',      'Gerar sugestão automática de escalas',             'escalas'),
  ('conferencia:executar','Registrar presença digital da guarnição',          'escalas'),
  ('permuta:aprovar',     'Aprovar ou rejeitar permutas de serviço',          'escalas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.nome IN ('SUPERUSER', 'ADMIN', 'GERENTE')
    AND p.code IN ('escala:sugerir', 'conferencia:executar', 'permuta:aprovar')
ON CONFLICT DO NOTHING;

