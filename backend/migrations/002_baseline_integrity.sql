-- ============================================================
-- MIGRAÇÃO: ÍNDICES DE PERFORMANCE E INTEGRIDADE BASELINE
-- Arquivo: backend/migrations/002_baseline_integrity.sql
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_servicos_ciclo_data
  ON SERVICOS_EXECUTADOS(id_ciclo, data_execucao DESC);

CREATE INDEX IF NOT EXISTS idx_escala_planejamento_ciclo_data
  ON ESCALA_PLANEJAMENTO(id_ciclo, data_servico);

CREATE INDEX IF NOT EXISTS idx_requerimentos_ciclo_militar
  ON REQUERIMENTOS(id_ciclo, id_militar);

