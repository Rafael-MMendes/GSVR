-- ==============================================================================
-- CONSULTAS RELACIONAIS - GESTÃO DE FORÇA TAREFA
-- Módulo: Integração Completa OPM -> Ciclo -> Efetivo -> Planejamento -> Execução
-- Dialeto: PostgreSQL
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA CONSOLIDADA (FLAT / JOINS COMPLETOS)
-- Utilidade: Relatórios analíticos no Excel/BI, Gráficos ou listagens planas (Views).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_relatorio_operacional_completo AS
SELECT
    -- Nível 1: OPM
    o.id_opm,
    o.sigla AS opm_sigla,
    o.descricao AS opm_descricao,

    -- Nível 2: CICLO
    c.id_ciclo,
    c.referencia_mes_ano AS ciclo_ref,
    c.data_inicio AS ciclo_inicio,
    c.status AS ciclo_status,

    -- Nível 3: EFETIVO (Militar enriquecido)
    e.id_militar,
    e.nome_completo AS militar_nome_completo,
    e.nome_guerra AS militar_nome_guerra,
    e.posto_graduacao AS militar_posto,
    e.matricula AS militar_matricula,
    e.cpf AS militar_cpf,
    
    -- Status da Inscrição/Requerimento original
    req.numero_requerimento,
    req.data_solicitacao,

    -- Nível 4: PLANEJAMENTO (Escala e Disponibilidade)
    ep.id_escala,
    ep.data_servico AS planejamento_data,
    ep.horario_servico AS planejamento_horario,
    ep.funcao AS planejamento_funcao,
    dr.horario_turno AS turno_disponibilizado,
    -- Validação: O Serviço foi planejado dentro da disponibilidade real?
    (ep.horario_servico = dr.horario_turno) AS planejado_dentro_disponibilidade,

    -- Nível 5: EXECUÇÃO (Serviço Executado)
    se.id_execucao,
    se.data_execucao,
    se.status_presenca,
    se.modalidade,
    se.guarnicao,
    se.carga_horaria,
    se.valor_remuneracao,

    -- CÁLCULOS TOTAIS APLICADOS (Window Functions por Ciclo e por Militar)
    COUNT(se.id_execucao) OVER (PARTITION BY c.id_ciclo, e.id_militar) AS total_servicos_militar,
    SUM(se.carga_horaria) OVER (PARTITION BY c.id_ciclo, e.id_militar) AS carga_horaria_total_militar,
    SUM(se.valor_remuneracao) OVER (PARTITION BY c.id_ciclo, e.id_militar) AS remuneracao_total_militar

FROM CICLOS c
-- Garantindo a hierarquia de cima para baixo
LEFT JOIN OPM o ON c.id_opm = o.id_opm

-- Trazendo o Requerimento (A intenção de participar do ciclo)
LEFT JOIN REQUERIMENTOS req ON c.id_ciclo = req.id_ciclo
-- Trazendo o Militar (Nunca exibir apenas ID)
LEFT JOIN EFETIVO e ON req.id_militar = e.id_militar

-- Trazendo o Planejamento (A Escala montada para o ciclo)
LEFT JOIN ESCALA_PLANEJAMENTO ep ON req.id_ciclo = ep.id_ciclo AND req.id_militar = ep.id_militar
-- Trazendo a Disponibilidade atrelada àquela escala
LEFT JOIN DISPONIBILIDADE_REQUERIMENTO dr ON ep.id_disponibilidade = dr.id_disponibilidade

-- Trazendo a Execução. 
-- Importante: um servico executado idealmente pauta-se no ep.id_escala (FK direta).
-- Como fallback/robustez (regra 6 - consistencia e dados orfaos importados d planilha), garantimos vínculo por datas/militares iguais.
LEFT JOIN SERVICOS_EXECUTADOS se ON 
    se.id_escala = ep.id_escala 
    OR (se.id_escala IS NULL AND se.id_ciclo = c.id_ciclo AND se.id_militar = e.id_militar AND se.data_execucao = ep.data_servico)

-- ORDENAÇÃO (Regra 7: Data Execução → Nome do Militar)
ORDER BY 
    se.data_execucao NULLS LAST,
    ep.data_servico NULLS LAST,
    e.nome_guerra ASC;


-- ------------------------------------------------------------------------------
-- 2. SAÍDA EM JSON HIERÁRQUICO (USO DIRETO NO BACKEND NODE.JS)
-- Utilidade: APIs fluídas onde o frontend React consome o estado de forma coesa (Exclusivo PostgreSQL >9)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_relatorio_operacional_json AS
SELECT jsonb_build_object(
    'opm', jsonb_build_object(
        'id', o.id_opm,
        'sigla', o.sigla,
        'descricao', o.descricao
    ),
    'ciclo', jsonb_build_object(
        'id', c.id_ciclo,
        'referencia', c.referencia_mes_ano,
        'status', c.status,
        -- Totalizadores do ciclo inteiro
        'total_servicos_ciclo', COUNT(se.id_execucao),
        'remuneracao_total_ciclo', COALESCE(SUM(se.valor_remuneracao), 0.0)
    ),
    'militares', jsonb_agg(
        jsonb_build_object(
            'id_militar', e.id_militar,
            'matricula', e.matricula,
            'posto_nome', e.posto_graduacao || ' ' || COALESCE(e.nome_guerra, ''),
            'nome_completo', e.nome_completo,
            
            -- Sub-Nível: Cálculos Independentes do Militar
            'estatisticas', jsonb_build_object(
                'total_servicos', COUNT(se.id_execucao),
                'carga_horaria_total', COALESCE(SUM(se.carga_horaria), 0),
                'remuneracao_total', COALESCE(SUM(se.valor_remuneracao), 0.0)
            ),
            
            -- Sub-Nível: Detalhes dos Serviços Exectuados + Planejados
            'servicos', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'planejamento_data', ep_sub.data_servico,
                        'planejamento_horario', ep_sub.horario_servico,
                        'disponibilidade_base', dr_sub.horario_turno,
                        'execucao', jsonb_build_object(
                            'status', se_sub.status_presenca,
                            'data_execucao', se_sub.data_execucao,
                            'carga', se_sub.carga_horaria,
                            'remuneracao', se_sub.valor_remuneracao
                        )
                    )
                )
                FROM ESCALA_PLANEJAMENTO ep_sub
                LEFT JOIN DISPONIBILIDADE_REQUERIMENTO dr_sub ON ep_sub.id_disponibilidade = dr_sub.id_disponibilidade
                LEFT JOIN SERVICOS_EXECUTADOS se_sub ON se_sub.id_escala = ep_sub.id_escala OR (se_sub.id_militar = e.id_militar AND se_sub.id_ciclo = c.id_ciclo AND se_sub.data_execucao = ep_sub.data_servico)
                WHERE ep_sub.id_militar = e.id_militar AND ep_sub.id_ciclo = c.id_ciclo
            )
        )
    )
) AS documento_relacional_json
FROM CICLOS c
LEFT JOIN OPM o ON c.id_opm = o.id_opm
JOIN REQUERIMENTOS req ON c.id_ciclo = req.id_ciclo
JOIN EFETIVO e ON req.id_militar = e.id_militar
LEFT JOIN ESCALA_PLANEJAMENTO ep ON req.id_ciclo = ep.id_ciclo AND req.id_militar = e.id_militar
LEFT JOIN SERVICOS_EXECUTADOS se ON se.id_escala = ep.id_escala
GROUP BY c.id_ciclo, o.id_opm, o.sigla, o.descricao;

