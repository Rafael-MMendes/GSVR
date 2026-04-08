-- View para exibição completa com integridade relacional
-- Traz todos os detalhes hierárquicos desde a OPM até os Serviços Executados
DROP VIEW IF EXISTS vw_relatorio_operacional_completo CASCADE;
CREATE VIEW vw_relatorio_operacional_completo AS
SELECT 
    o.id_opm,
    o.sigla AS opm_sigla,
    o.descricao AS opm_descricao,
    c.id_ciclo,
    c.referencia_mes_ano,
    c.status AS ciclo_status,
    e.id_militar,
    e.nome_completo,
    e.nome_guerra,
    e.posto_graduacao,
    e.matricula,
    e.cpf,
    req.id_requerimento,
    req.numero_requerimento,
    dr.id_disponibilidade,
    dr.dia_mes AS disponibilidade_dia,
    dr.horario_turno AS disponibilidade_turno,
    ep.id_escala,
    ep.data_servico AS escala_data,
    ep.horario_servico AS escala_turno,
    ep.funcao AS escala_funcao,
    se.id_execucao,
    se.data_execucao AS execucao_data,
    se.carga_horaria AS execucao_carga_horaria,
    se.valor_remuneracao AS execucao_valor_remuneracao,
    se.status_presenca AS execucao_presenca
FROM EFETIVO e
LEFT JOIN REQUERIMENTOS req ON e.id_militar = req.id_militar
LEFT JOIN DISPONIBILIDADE_REQUERIMENTO dr ON req.id_requerimento = dr.id_requerimento
LEFT JOIN ESCALA_PLANEJAMENTO ep ON e.id_militar = ep.id_militar
    -- Opcionalmente: AND ep.id_disponibilidade = dr.id_disponibilidade Se a escala tiver atrelada à disponibilidade exata
    -- Porém a relação principal é id_militar para garantir que todos retornem,
LEFT JOIN SERVICOS_EXECUTADOS se ON e.id_militar = se.id_militar 
    AND (ep.id_escala = se.id_escala OR se.id_escala IS NULL)
LEFT JOIN CICLOS c ON (ep.id_ciclo = c.id_ciclo OR se.id_ciclo = c.id_ciclo OR req.id_ciclo = c.id_ciclo)
LEFT JOIN OPM o ON c.id_opm = o.id_opm;

-- View agregada para painéis JSON
DROP VIEW IF EXISTS vw_relatorio_operacional_agregado CASCADE;
CREATE VIEW vw_relatorio_operacional_agregado AS
SELECT 
    c.id_ciclo,
    c.referencia_mes_ano,
    o.sigla AS opm_sigla,
    e.id_militar,
    e.nome_guerra,
    e.posto_graduacao,
    COUNT(DISTINCT ep.id_escala) as qtd_escalas,
    COUNT(DISTINCT se.id_execucao) as qtd_servicos_executados,
    COALESCE(SUM(se.carga_horaria), 0) as total_carga_horaria_executada,
    COALESCE(SUM(se.valor_remuneracao), 0) as total_remuneracao
FROM CICLOS c
JOIN OPM o ON c.id_opm = o.id_opm
JOIN EFETIVO e ON 1=1
LEFT JOIN ESCALA_PLANEJAMENTO ep ON c.id_ciclo = ep.id_ciclo AND e.id_militar = ep.id_militar
LEFT JOIN SERVICOS_EXECUTADOS se ON c.id_ciclo = se.id_ciclo AND e.id_militar = se.id_militar
GROUP BY c.id_ciclo, c.referencia_mes_ano, o.sigla, e.id_militar, e.nome_guerra, e.posto_graduacao
HAVING COUNT(DISTINCT ep.id_escala) > 0 OR COUNT(DISTINCT se.id_execucao) > 0;
