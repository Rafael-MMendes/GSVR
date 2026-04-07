-- 1. Tabela OPM
CREATE TABLE OPM (
    id_opm INT PRIMARY KEY AUTO_INCREMENT,
    descricao VARCHAR(255) NOT NULL,
    sigla VARCHAR(50) NOT NULL,
    endereco VARCHAR(255),
    telefone VARCHAR(50),
    email VARCHAR(100)
);

-- 2. Tabela EFETIVO (Cadastro de Militares)
CREATE TABLE EFETIVO (
    id_militar INT PRIMARY KEY AUTO_INCREMENT,
    nome_completo VARCHAR(255) NOT NULL,
    posto_graduacao VARCHAR(50) NOT NULL,
    matricula VARCHAR(50) UNIQUE NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    rgpm VARCHAR(20),
    opm VARCHAR(100),
    telefone VARCHAR(50),
    status_ativo BOOLEAN DEFAULT TRUE
);

-- 3. Tabela CICLOS
CREATE TABLE CICLOS (
    id_ciclo INT PRIMARY KEY AUTO_INCREMENT,
    id_opm INT NOT NULL,
    referencia_mes_ano VARCHAR(20) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    FOREIGN KEY (id_opm) REFERENCES OPM(id_opm)
);

-- 4. Tabela REQUERIMENTOS
CREATE TABLE REQUERIMENTOS (
    id_requerimento INT PRIMARY KEY AUTO_INCREMENT,
    id_militar INT NOT NULL,
    id_ciclo INT NOT NULL,
    numero_requerimento VARCHAR(50),
    data_solicitacao DATETIME NOT NULL,
    FOREIGN KEY (id_militar) REFERENCES EFETIVO(id_militar),
    FOREIGN KEY (id_ciclo) REFERENCES CICLOS(id_ciclo)
);

-- 5. Tabela DISPONIBILIDADE_REQUERIMENTO
CREATE TABLE DISPONIBILIDADE_REQUERIMENTO (
    id_disponibilidade INT PRIMARY KEY AUTO_INCREMENT,
    id_requerimento INT NOT NULL,
    dia_mes INT NOT NULL,
    horario_turno VARCHAR(50) NOT NULL,
    marcado_disponivel BOOLEAN DEFAULT FALSE,
    marcado_servico_ordinario BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    observacoes TEXT,
    FOREIGN KEY (id_requerimento) REFERENCES REQUERIMENTOS(id_requerimento) ON DELETE CASCADE
);

-- 6. Tabela ESCALA_PLANEJAMENTO
CREATE TABLE ESCALA_PLANEJAMENTO (
    id_escala INT PRIMARY KEY AUTO_INCREMENT,
    id_ciclo INT NOT NULL,
    id_militar INT NOT NULL,
    id_disponibilidade INT NOT NULL, -- NOVO VÍNCULO DIRETO
    data_servico DATE NOT NULL,
    horario_servico VARCHAR(50) NOT NULL,
    horario_embarque VARCHAR(50),
    local_embarque VARCHAR(100),
    cartao_viatura VARCHAR(100),
    funcao VARCHAR(50),
    observacoes TEXT,
    FOREIGN KEY (id_ciclo) REFERENCES CICLOS(id_ciclo),
    FOREIGN KEY (id_militar) REFERENCES EFETIVO(id_militar),
    FOREIGN KEY (id_disponibilidade) REFERENCES DISPONIBILIDADE_REQUERIMENTO(id_disponibilidade)
);

-- 7. Tabela SERVICOS_EXECUTADOS
CREATE TABLE SERVICOS_EXECUTADOS (
    id_execucao INT PRIMARY KEY AUTO_INCREMENT,
    id_ciclo INT NOT NULL,
    id_militar INT NOT NULL,
    id_escala INT,
    data_execucao DATE NOT NULL,
    dia_semana INT NOT NULL,
    eh_feriado BOOLEAN DEFAULT FALSE,
    carga_horaria INT NOT NULL,
    valor_remuneracao DECIMAL(10, 2) NOT NULL,
    status_presenca VARCHAR(50) NOT NULL,
    FOREIGN KEY (id_ciclo) REFERENCES CICLOS(id_ciclo),
    FOREIGN KEY (id_militar) REFERENCES EFETIVO(id_militar),
    FOREIGN KEY (id_escala) REFERENCES ESCALA_PLANEJAMENTO(id_escala) ON DELETE SET NULL
);

-- =========================================================================
-- TRIGGERS DE VALIDAÇÃO (Regra de Negócio no Banco)
-- Garante que a disponibilidade vinculada na escala está marcada com 'X' (TRUE) e está Ativa.
-- =========================================================================

DELIMITER //

-- Validação ao Inserir uma Escala
CREATE TRIGGER trg_valida_escala_insert
BEFORE INSERT ON ESCALA_PLANEJAMENTO
FOR EACH ROW
BEGIN
    DECLARE v_marcado_disponivel BOOLEAN;
    DECLARE v_ativo BOOLEAN;

    -- Busca os status exatamente da disponibilidade informada
    SELECT marcado_disponivel, ativo 
    INTO v_marcado_disponivel, v_ativo
    FROM DISPONIBILIDADE_REQUERIMENTO
    WHERE id_disponibilidade = NEW.id_disponibilidade;

    -- Se não estiver marcado ou não estiver ativo, cancela a operação
    IF v_marcado_disponivel = FALSE OR v_ativo = FALSE THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Erro: O militar não marcou este turno como disponível no requerimento ou a disponibilidade está inativa.';
    END IF;
END //

-- Validação ao Atualizar uma Escala (caso alterem a disponibilidade)
CREATE TRIGGER trg_valida_escala_update
BEFORE UPDATE ON ESCALA_PLANEJAMENTO
FOR EACH ROW
BEGIN
    DECLARE v_marcado_disponivel BOOLEAN;
    DECLARE v_ativo BOOLEAN;

    SELECT marcado_disponivel, ativo 
    INTO v_marcado_disponivel, v_ativo
    FROM DISPONIBILIDADE_REQUERIMENTO
    WHERE id_disponibilidade = NEW.id_disponibilidade;

    IF v_marcado_disponivel = FALSE OR v_ativo = FALSE THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Erro: O militar não marcou este turno como disponível no requerimento ou a disponibilidade está inativa.';
    END IF;
END //

DELIMITER ;