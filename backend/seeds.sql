-- Seed SQL para GSVR
-- Instruções: Execute no pgAdmin ou psql conectado ao banco 'escala_ft'

-- 1. Limpeza
TRUNCATE TABLE SERVICOS_EXECUTADOS, ESCALA_PLANEJAMENTO, DISPONIBILIDADE_REQUERIMENTO, REQUERIMENTOS, CICLOS, EFETIVO, OPM, users, months RESTART IDENTITY CASCADE;

-- 2. OPM
INSERT INTO OPM (descricao, sigla, endereco) VALUES ('9º Batalhão de Polícia Militar', '9º BPM', 'Delmiro Gouveia, AL');

-- 3. Militares (Efetivo + Users)
-- Admin
INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, opm, telefone) 
VALUES ('Alan Kleber', 'ALAN', 'CAP', '151197', '5626561463', '9º BPM', '82999999999');
INSERT INTO users (numero_ordem, password, is_admin) VALUES ('151197', '5626561463', 1);

-- Sargento
INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, opm, telefone) 
VALUES ('João Silva', 'SILVA', 'SGT', '97037', '7712466416', '9º BPM', '82888888888');
INSERT INTO users (numero_ordem, password, is_admin) VALUES ('97037', '7712466416', 1);

-- Cabos
INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, opm, telefone) 
VALUES ('Maria Souza', 'SOUZA', 'CB', '140787', '2715243405', '9º BPM', '82777777777');
INSERT INTO users (numero_ordem, password, is_admin) VALUES ('140787', '2715243405', 1);

-- Soldado
INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, opm, telefone) 
VALUES ('José Oliveira', 'OLIVEIRA', 'SD', '142423', '4512828419', '9º BPM', '82666666666');
INSERT INTO users (numero_ordem, password, is_admin) VALUES ('142423', '4512828419', 1);

-- 4. Ciclos (Ajustar anos se necessário)
INSERT INTO CICLOS (id_opm, referencia_mes_ano, data_inicio, data_fim, status) 
VALUES (1, TO_CHAR(CURRENT_DATE, 'YYYY-MM'), DATE_TRUNC('month', CURRENT_DATE), (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'), 'Aberto');

INSERT INTO CICLOS (id_opm, referencia_mes_ano, data_inicio, data_fim, status) 
VALUES (1, TO_CHAR(CURRENT_DATE + INTERVAL '1 month', 'YYYY-MM'), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'), (DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '1 month - 1 day'), 'Aberto');

-- Legado
INSERT INTO months (month_key, month_name) VALUES (TO_CHAR(CURRENT_DATE, 'YYYY-MM'), TO_CHAR(CURRENT_DATE, 'MM-YYYY'));

-- 5. Tipos de Serviço (Obrigatório para o sistema novo)
INSERT INTO TIPOS_SERVICO (descricao, carga_horaria, valor_remuneracao, ativo) VALUES 
('SERVIÇO 06 HORAS', 6, 120.00, TRUE),
('SERVIÇO 12 HORAS', 12, 240.00, TRUE),
('SERVIÇO 24 HORAS', 24, 480.00, TRUE);

-- 6. Requerimentos e Disponibilidades (Cap Alan - ID 1)
INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES (1, 1);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (1, 1, '07:00 ÀS 13:00', TRUE);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (1, 2, '13:00 ÀS 19:00', TRUE);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (1, 3, '19:00 ÀS 01:00', TRUE);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (1, 10, '07:00 ÀS 13:00', TRUE);

-- Sgt Silva (ID 2)
INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES (2, 1);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (2, 1, '07:00 ÀS 13:00', TRUE);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (2, 10, '07:00 ÀS 13:00', TRUE);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (2, 15, '19:00 ÀS 01:00', TRUE);

-- Cb Souza (ID 3)
INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES (3, 1);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (3, 1, '01:00 ÀS 07:00', TRUE);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (3, 5, '07:00 ÀS 13:00', TRUE);

-- Sd Oliveira (ID 4)
INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES (4, 1);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (4, 1, '13:00 ÀS 19:00', TRUE);
INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (4, 10, '07:00 ÀS 13:00', TRUE);

-- 6. Escala de Planejamento (Exemplo Dia 1)
--INSERT INTO ESCALA_PLANEJAMENTO (id_ciclo, id_militar, id_disponibilidade, data_servico, horario_servico, nome_recurso, funcao) 
--VALUES (1, 1, 1, DATE_TRUNC('month', CURRENT_DATE), '07:00 ÀS 13:00 (6h)', 'Guarnição FT 01', 'Comandante');

--INSERT INTO ESCALA_PLANEJAMENTO (id_ciclo, id_militar, id_disponibilidade, data_servico, horario_servico, nome_recurso, funcao) 
--VALUES (1, 2, 7, DATE_TRUNC('month', CURRENT_DATE), '07:00 ÀS 13:00 (6h)', 'Guarnição FT 01', 'Patrulheiro');
