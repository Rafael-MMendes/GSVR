--
-- PostgreSQL database cluster dump
--

\restrict LwH3lSdcVoB5ppt8yftlB2lHuizf3z3no54oFXW41qhWT22CcdZwBJn4hzYHKyt

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:tcaIFTz70ChQTlVso/aSNw==$boDzvkP7GCrIC7XiAYOus6iA8Es8ijVSJ5SCX+O1orM=:KtBqyofBcx9ITEGTSxv7SZoePVEDKX3pJFVlHwOsdlE=';

--
-- User Configurations
--








\unrestrict LwH3lSdcVoB5ppt8yftlB2lHuizf3z3no54oFXW41qhWT22CcdZwBJn4hzYHKyt

--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

\restrict hifBQPBsqd6UiZ3FQxy3oazXGzNAklesAuQpXGb2qdcOyZsmIB3xtQGCwWoyvNE

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict hifBQPBsqd6UiZ3FQxy3oazXGzNAklesAuQpXGb2qdcOyZsmIB3xtQGCwWoyvNE

--
-- Database "escala_ft" dump
--

--
-- PostgreSQL database dump
--

\restrict 2FCuoF1iXhU5aoOw1YO01WiYonDOteCDfq4hfLTqTZzvG6mhalxNCkW9Ha9JKvo

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: escala_ft; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE escala_ft WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE escala_ft OWNER TO postgres;

\unrestrict 2FCuoF1iXhU5aoOw1YO01WiYonDOteCDfq4hfLTqTZzvG6mhalxNCkW9Ha9JKvo
\connect escala_ft
\restrict 2FCuoF1iXhU5aoOw1YO01WiYonDOteCDfq4hfLTqTZzvG6mhalxNCkW9Ha9JKvo

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: fn_valida_escala(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_valida_escala() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
          $$;


ALTER FUNCTION public.fn_valida_escala() OWNER TO postgres;

--
-- Name: fn_valida_vinculo_planejamento_execucao(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_valida_vinculo_planejamento_execucao() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
          $$;


ALTER FUNCTION public.fn_valida_vinculo_planejamento_execucao() OWNER TO postgres;

--
-- Name: trg_execucao_ternaria(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_execucao_ternaria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
          $$;


ALTER FUNCTION public.trg_execucao_ternaria() OWNER TO postgres;

--
-- Name: trg_planejamento_ternaria(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_planejamento_ternaria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
          DECLARE
              v_id_execucao INTEGER;
              v_vinculo_id INTEGER;
          BEGIN
              -- 1. Tenta localizar se já existe uma execução (SERVICOS_EXECUTADOS) para este militar nesta data
              SELECT id_execucao INTO v_id_execucao
              FROM SERVICOS_EXECUTADOS
              WHERE id_militar = NEW.id_militar
                AND data_execucao = NEW.data_servico
              LIMIT 1;

              IF v_id_execucao IS NOT NULL THEN
                  -- 2. Se houver execução, verifica se já existe um registro na ternária vinculado a ela
                  SELECT id_vinculo INTO v_vinculo_id
                  FROM ESCALA_EFETIVO_SERVICO
                  WHERE id_execucao = v_id_execucao AND id_militar = NEW.id_militar
                  LIMIT 1;

                  IF v_vinculo_id IS NOT NULL THEN
                      -- 3. Caso o registro exista (criado pela execução), vincula a nova escala planejada e atualiza status
                      UPDATE ESCALA_EFETIVO_SERVICO
                      SET id_escala = NEW.id_escala,
                          status = 'Planejado e executado',
                          editado_em = CURRENT_TIMESTAMP
                      WHERE id_vinculo = v_vinculo_id;
                  ELSE
                      -- 4. Registro de execução existe mas não está na ternária? Cria um novo vinculado
                      INSERT INTO ESCALA_EFETIVO_SERVICO (id_escala, id_militar, id_execucao, status)
                      VALUES (NEW.id_escala, NEW.id_militar, v_id_execucao, 'Planejado e executado');
                  END IF;
                  ELSE
                      -- 5. Sem execução prévia: Comportamento padrão (Cria apenas planejamento)
                      INSERT INTO ESCALA_EFETIVO_SERVICO (id_escala, id_militar, status)
                      VALUES (NEW.id_escala, NEW.id_militar, 
                          CASE 
                            WHEN NEW.data_servico > CURRENT_DATE THEN 'Planejado' 
                            ELSE 'Planejado e não Executado' 
                          END
                      );
                  END IF;

              RETURN NEW;
          END;
          $$;


ALTER FUNCTION public.trg_planejamento_ternaria() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ciclo_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ciclo_config (
    id_config integer NOT NULL,
    dia_inicio integer DEFAULT 16 NOT NULL,
    dia_fim integer DEFAULT 15 NOT NULL,
    id_opm integer,
    vigente_desde date DEFAULT CURRENT_DATE NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ciclo_config OWNER TO postgres;

--
-- Name: ciclo_config_id_config_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ciclo_config_id_config_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ciclo_config_id_config_seq OWNER TO postgres;

--
-- Name: ciclo_config_id_config_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ciclo_config_id_config_seq OWNED BY public.ciclo_config.id_config;


--
-- Name: ciclos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ciclos (
    id_ciclo integer NOT NULL,
    id_opm integer,
    data_inicio date NOT NULL,
    data_fim date NOT NULL,
    status character varying(50) DEFAULT 'Aberto'::character varying NOT NULL,
    valor_total_previsto numeric(12,2) DEFAULT 0,
    ativo boolean DEFAULT true,
    limite_equipes_diario integer DEFAULT 6,
    valor_contingencia numeric(12,2) DEFAULT 0
);


ALTER TABLE public.ciclos OWNER TO postgres;

--
-- Name: ciclos_id_ciclo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ciclos_id_ciclo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ciclos_id_ciclo_seq OWNER TO postgres;

--
-- Name: ciclos_id_ciclo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ciclos_id_ciclo_seq OWNED BY public.ciclos.id_ciclo;


--
-- Name: disponibilidade_requerimento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disponibilidade_requerimento (
    id_disponibilidade integer NOT NULL,
    id_requerimento integer NOT NULL,
    dia_mes integer NOT NULL,
    horario_turno character varying(50) NOT NULL,
    marcado_disponivel boolean DEFAULT false,
    marcado_servico_ordinario boolean DEFAULT false,
    motorista boolean DEFAULT false,
    ativo boolean DEFAULT true,
    observacoes text
);


ALTER TABLE public.disponibilidade_requerimento OWNER TO postgres;

--
-- Name: disponibilidade_requerimento_id_disponibilidade_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.disponibilidade_requerimento_id_disponibilidade_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.disponibilidade_requerimento_id_disponibilidade_seq OWNER TO postgres;

--
-- Name: disponibilidade_requerimento_id_disponibilidade_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.disponibilidade_requerimento_id_disponibilidade_seq OWNED BY public.disponibilidade_requerimento.id_disponibilidade;


--
-- Name: efetivo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.efetivo (
    id_militar integer NOT NULL,
    nome_completo character varying(255) NOT NULL,
    nome_guerra character varying(100),
    posto_graduacao character varying(50) NOT NULL,
    matricula character varying(50),
    numero_ordem character varying(50),
    cpf character varying(14) NOT NULL,
    rgpm character varying(20),
    opm character varying(100),
    telefone character varying(50),
    motorista character varying(10) DEFAULT 'Não'::character varying,
    status_ativo boolean DEFAULT true
);


ALTER TABLE public.efetivo OWNER TO postgres;

--
-- Name: efetivo_id_militar_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.efetivo_id_militar_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.efetivo_id_militar_seq OWNER TO postgres;

--
-- Name: efetivo_id_militar_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.efetivo_id_militar_seq OWNED BY public.efetivo.id_militar;


--
-- Name: escala_efetivo_servico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.escala_efetivo_servico (
    id_vinculo integer NOT NULL,
    id_escala integer,
    id_militar integer NOT NULL,
    id_execucao integer,
    status character varying(50) NOT NULL,
    data_vinculo timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    editado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.escala_efetivo_servico OWNER TO postgres;

--
-- Name: escala_efetivo_servico_id_vinculo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.escala_efetivo_servico_id_vinculo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.escala_efetivo_servico_id_vinculo_seq OWNER TO postgres;

--
-- Name: escala_efetivo_servico_id_vinculo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.escala_efetivo_servico_id_vinculo_seq OWNED BY public.escala_efetivo_servico.id_vinculo;


--
-- Name: escala_planejamento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.escala_planejamento (
    id_escala integer NOT NULL,
    id_ciclo integer NOT NULL,
    id_militar integer NOT NULL,
    id_disponibilidade integer,
    id_tipo_servico integer,
    data_servico date NOT NULL,
    horario_servico character varying(50) NOT NULL,
    horario_embarque character varying(50),
    nome_recurso character varying(100),
    funcao character varying(50),
    observacoes text,
    publicado boolean DEFAULT true
);


ALTER TABLE public.escala_planejamento OWNER TO postgres;

--
-- Name: escala_planejamento_id_escala_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.escala_planejamento_id_escala_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.escala_planejamento_id_escala_seq OWNER TO postgres;

--
-- Name: escala_planejamento_id_escala_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.escala_planejamento_id_escala_seq OWNED BY public.escala_planejamento.id_escala;


--
-- Name: feriados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feriados (
    id_feriado integer NOT NULL,
    data date NOT NULL,
    descricao character varying(255)
);


ALTER TABLE public.feriados OWNER TO postgres;

--
-- Name: feriados_id_feriado_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feriados_id_feriado_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feriados_id_feriado_seq OWNER TO postgres;

--
-- Name: feriados_id_feriado_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feriados_id_feriado_seq OWNED BY public.feriados.id_feriado;


--
-- Name: importacao_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.importacao_log (
    id_log integer NOT NULL,
    id_usuario integer,
    arquivo_nome character varying(255),
    arquivo_hash text,
    status character varying(50) DEFAULT 'sucesso'::character varying,
    id_militar integer,
    id_requerimento integer,
    ciclos_afetados integer[],
    detalhes jsonb,
    importado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.importacao_log OWNER TO postgres;

--
-- Name: importacao_log_id_log_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.importacao_log_id_log_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.importacao_log_id_log_seq OWNER TO postgres;

--
-- Name: importacao_log_id_log_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.importacao_log_id_log_seq OWNED BY public.importacao_log.id_log;


--
-- Name: metas_alocacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metas_alocacao (
    id_meta integer NOT NULL,
    id_ciclo integer NOT NULL,
    data date NOT NULL,
    cenario character(1),
    qtd_equipes_planejadas integer DEFAULT 0,
    custo_estimado numeric(12,2) DEFAULT 0,
    CONSTRAINT metas_alocacao_cenario_check CHECK ((cenario = ANY (ARRAY['A'::bpchar, 'B'::bpchar])))
);


ALTER TABLE public.metas_alocacao OWNER TO postgres;

--
-- Name: metas_alocacao_id_meta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metas_alocacao_id_meta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metas_alocacao_id_meta_seq OWNER TO postgres;

--
-- Name: metas_alocacao_id_meta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metas_alocacao_id_meta_seq OWNED BY public.metas_alocacao.id_meta;


--
-- Name: opm; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opm (
    id_opm integer NOT NULL,
    descricao character varying(255) NOT NULL,
    sigla character varying(50) NOT NULL,
    endereco character varying(255),
    telefone character varying(50),
    email character varying(100)
);


ALTER TABLE public.opm OWNER TO postgres;

--
-- Name: opm_id_opm_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.opm_id_opm_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opm_id_opm_seq OWNER TO postgres;

--
-- Name: opm_id_opm_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.opm_id_opm_seq OWNED BY public.opm.id_opm;


--
-- Name: requerimentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.requerimentos (
    id_requerimento integer NOT NULL,
    id_militar integer NOT NULL,
    id_ciclo integer NOT NULL,
    numero_requerimento character varying(255),
    data_solicitacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    observacao text,
    id_usuario_criacao integer,
    mes_referencia character varying(7)
);


ALTER TABLE public.requerimentos OWNER TO postgres;

--
-- Name: requerimentos_id_requerimento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.requerimentos_id_requerimento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.requerimentos_id_requerimento_seq OWNER TO postgres;

--
-- Name: requerimentos_id_requerimento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.requerimentos_id_requerimento_seq OWNED BY public.requerimentos.id_requerimento;


--
-- Name: servicos_executados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicos_executados (
    id_execucao integer NOT NULL,
    id_ciclo integer NOT NULL,
    id_militar integer NOT NULL,
    id_tipo_servico integer,
    data_execucao date NOT NULL,
    dia_semana integer NOT NULL,
    eh_feriado boolean DEFAULT false,
    carga_horaria integer NOT NULL,
    valor_remuneracao numeric(10,2) NOT NULL,
    status_presenca character varying(50) NOT NULL,
    cmd character varying(100),
    opm_origem character varying(100),
    modalidade character varying(100),
    guarnicao character varying(100)
);


ALTER TABLE public.servicos_executados OWNER TO postgres;

--
-- Name: servicos_executados_id_execucao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.servicos_executados_id_execucao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.servicos_executados_id_execucao_seq OWNER TO postgres;

--
-- Name: servicos_executados_id_execucao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.servicos_executados_id_execucao_seq OWNED BY public.servicos_executados.id_execucao;


--
-- Name: tipos_servico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tipos_servico (
    id_tipo_servico integer NOT NULL,
    descricao character varying(100) NOT NULL,
    carga_horaria integer NOT NULL,
    valor_remuneracao numeric(10,2) NOT NULL,
    ativo boolean DEFAULT true
);


ALTER TABLE public.tipos_servico OWNER TO postgres;

--
-- Name: tipos_servico_id_tipo_servico_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tipos_servico_id_tipo_servico_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tipos_servico_id_tipo_servico_seq OWNER TO postgres;

--
-- Name: tipos_servico_id_tipo_servico_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tipos_servico_id_tipo_servico_seq OWNED BY public.tipos_servico.id_tipo_servico;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    numero_ordem text NOT NULL,
    password text NOT NULL,
    password_hash text,
    is_admin integer DEFAULT 0,
    status character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ciclo_config id_config; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciclo_config ALTER COLUMN id_config SET DEFAULT nextval('public.ciclo_config_id_config_seq'::regclass);


--
-- Name: ciclos id_ciclo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciclos ALTER COLUMN id_ciclo SET DEFAULT nextval('public.ciclos_id_ciclo_seq'::regclass);


--
-- Name: disponibilidade_requerimento id_disponibilidade; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidade_requerimento ALTER COLUMN id_disponibilidade SET DEFAULT nextval('public.disponibilidade_requerimento_id_disponibilidade_seq'::regclass);


--
-- Name: efetivo id_militar; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.efetivo ALTER COLUMN id_militar SET DEFAULT nextval('public.efetivo_id_militar_seq'::regclass);


--
-- Name: escala_efetivo_servico id_vinculo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_efetivo_servico ALTER COLUMN id_vinculo SET DEFAULT nextval('public.escala_efetivo_servico_id_vinculo_seq'::regclass);


--
-- Name: escala_planejamento id_escala; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_planejamento ALTER COLUMN id_escala SET DEFAULT nextval('public.escala_planejamento_id_escala_seq'::regclass);


--
-- Name: feriados id_feriado; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feriados ALTER COLUMN id_feriado SET DEFAULT nextval('public.feriados_id_feriado_seq'::regclass);


--
-- Name: importacao_log id_log; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.importacao_log ALTER COLUMN id_log SET DEFAULT nextval('public.importacao_log_id_log_seq'::regclass);


--
-- Name: metas_alocacao id_meta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_alocacao ALTER COLUMN id_meta SET DEFAULT nextval('public.metas_alocacao_id_meta_seq'::regclass);


--
-- Name: opm id_opm; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opm ALTER COLUMN id_opm SET DEFAULT nextval('public.opm_id_opm_seq'::regclass);


--
-- Name: requerimentos id_requerimento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requerimentos ALTER COLUMN id_requerimento SET DEFAULT nextval('public.requerimentos_id_requerimento_seq'::regclass);


--
-- Name: servicos_executados id_execucao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos_executados ALTER COLUMN id_execucao SET DEFAULT nextval('public.servicos_executados_id_execucao_seq'::regclass);


--
-- Name: tipos_servico id_tipo_servico; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tipos_servico ALTER COLUMN id_tipo_servico SET DEFAULT nextval('public.tipos_servico_id_tipo_servico_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: ciclo_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ciclo_config (id_config, dia_inicio, dia_fim, id_opm, vigente_desde, criado_em) FROM stdin;
1	16	15	\N	2020-01-01	2026-06-03 22:27:22.126058
2	16	15	\N	2020-01-01	2026-06-03 22:28:52.889998
3	16	15	\N	2020-01-01	2026-06-03 22:31:30.302518
\.


--
-- Data for Name: ciclos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ciclos (id_ciclo, id_opm, data_inicio, data_fim, status, valor_total_previsto, ativo, limite_equipes_diario, valor_contingencia) FROM stdin;
3	1	2026-06-16	2026-07-15	Fechado	85000.00	f	5	0.00
4	1	2026-07-16	2026-08-15	Fechado	85000.00	f	5	0.00
1	1	2026-04-16	2026-05-15	Fechado	85000.00	f	5	0.00
2	1	2026-05-16	2026-06-15	Aberto	85000.00	t	5	0.00
\.


--
-- Data for Name: disponibilidade_requerimento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disponibilidade_requerimento (id_disponibilidade, id_requerimento, dia_mes, horario_turno, marcado_disponivel, marcado_servico_ordinario, motorista, ativo, observacoes) FROM stdin;
22606	185	19	13:00 ÀS 19:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22608	185	20	13:00 ÀS 19:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22610	185	21	13:00 ÀS 19:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22612	185	25	13:00 ÀS 19:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22617	185	28	19:00 ÀS 01:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22619	185	29	13:00 ÀS 19:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
37104	233	10	13:00 ÀS 19:00	t	f	t	t	\N
37105	233	10	19:00 ÀS 01:00	t	f	t	t	\N
37106	233	11	13:00 ÀS 19:00	t	f	t	t	\N
37107	233	11	19:00 ÀS 01:00	t	f	t	t	\N
37108	233	12	13:00 ÀS 19:00	t	f	t	t	\N
37109	233	12	19:00 ÀS 01:00	t	f	t	t	\N
37110	233	13	13:00 ÀS 19:00	t	f	t	t	\N
37111	233	13	19:00 ÀS 01:00	t	f	t	t	\N
37112	233	15	13:00 ÀS 19:00	t	f	t	t	\N
37113	233	15	19:00 ÀS 01:00	t	f	t	t	\N
37114	233	1	13:00 ÀS 19:00	t	f	t	t	\N
37115	233	1	19:00 ÀS 01:00	t	f	t	t	\N
37116	233	2	13:00 ÀS 19:00	t	f	t	t	\N
37117	233	2	19:00 ÀS 01:00	t	f	t	t	\N
37118	233	3	13:00 ÀS 19:00	t	f	t	t	\N
37119	233	3	19:00 ÀS 01:00	t	f	t	t	\N
37120	233	4	13:00 ÀS 19:00	t	f	t	t	\N
37121	233	4	19:00 ÀS 01:00	t	f	t	t	\N
37122	233	5	13:00 ÀS 19:00	t	f	t	t	\N
37123	233	5	19:00 ÀS 01:00	t	f	t	t	\N
37124	233	8	13:00 ÀS 19:00	t	f	t	t	\N
37125	233	8	19:00 ÀS 01:00	t	f	t	t	\N
37126	233	9	13:00 ÀS 19:00	t	f	t	t	\N
37127	233	9	19:00 ÀS 01:00	t	f	t	t	\N
37128	189	10	07:00 ÀS 13:00	t	f	t	t	\N
37129	189	10	13:00 ÀS 19:00	t	f	t	t	\N
37130	189	10	19:00 ÀS 01:00	t	f	t	t	\N
37131	189	14	07:00 ÀS 13:00	t	f	t	t	\N
37132	189	14	13:00 ÀS 19:00	t	f	t	t	\N
37133	189	14	19:00 ÀS 01:00	t	f	t	t	\N
37134	189	1	07:00 ÀS 13:00	t	f	t	t	\N
37135	189	1	13:00 ÀS 19:00	t	f	t	t	\N
37136	189	1	19:00 ÀS 01:00	t	f	t	t	\N
37137	189	2	07:00 ÀS 13:00	t	f	t	t	\N
37138	189	2	13:00 ÀS 19:00	t	f	t	t	\N
37139	189	2	19:00 ÀS 01:00	t	f	t	t	\N
37140	189	5	07:00 ÀS 13:00	t	f	t	t	\N
37141	189	5	13:00 ÀS 19:00	t	f	t	t	\N
37142	189	5	19:00 ÀS 01:00	t	f	t	t	\N
37143	189	8	07:00 ÀS 13:00	t	f	t	t	\N
37144	189	8	13:00 ÀS 19:00	t	f	t	t	\N
37145	189	8	19:00 ÀS 01:00	t	f	t	t	\N
37146	189	9	07:00 ÀS 13:00	t	f	t	t	\N
37147	189	9	13:00 ÀS 19:00	t	f	t	t	\N
37148	189	9	19:00 ÀS 01:00	t	f	t	t	\N
37149	148	10	07:00 ÀS 13:00	t	f	t	t	\N
37150	148	10	13:00 ÀS 19:00	t	f	t	t	\N
37151	148	10	19:00 ÀS 01:00	t	f	t	t	\N
37152	148	10	01:00 ÀS 07:00	t	f	t	t	\N
37153	148	2	07:00 ÀS 13:00	t	f	t	t	\N
37154	148	2	13:00 ÀS 19:00	t	f	t	t	\N
37155	148	2	19:00 ÀS 01:00	t	f	t	t	\N
37156	148	2	01:00 ÀS 07:00	t	f	t	t	\N
37157	247	10	13:00 ÀS 19:00	t	f	t	t	\N
37158	247	10	19:00 ÀS 01:00	t	f	t	t	\N
37159	247	11	13:00 ÀS 19:00	t	f	t	t	\N
37160	247	11	19:00 ÀS 01:00	t	f	t	t	\N
37161	247	15	13:00 ÀS 19:00	t	f	t	t	\N
37162	247	15	19:00 ÀS 01:00	t	f	t	t	\N
37163	247	2	13:00 ÀS 19:00	t	f	t	t	\N
37164	247	2	19:00 ÀS 01:00	t	f	t	t	\N
37165	247	3	13:00 ÀS 19:00	t	f	t	t	\N
37166	247	3	19:00 ÀS 01:00	t	f	t	t	\N
37167	247	4	13:00 ÀS 19:00	t	f	t	t	\N
37168	247	4	19:00 ÀS 01:00	t	f	t	t	\N
27874	202	16	07:00 ÀS 13:00	t	f	t	t	\N
27875	202	16	13:00 ÀS 19:00	t	f	t	t	\N
27876	202	16	19:00 ÀS 01:00	t	f	t	t	\N
27877	202	16	01:00 ÀS 07:00	t	f	t	t	\N
27878	202	18	13:00 ÀS 19:00	t	f	t	t	\N
27879	202	18	19:00 ÀS 01:00	t	f	t	t	\N
27880	202	18	01:00 ÀS 07:00	t	f	t	t	\N
37169	247	8	13:00 ÀS 19:00	t	f	t	t	\N
37170	247	8	19:00 ÀS 01:00	t	f	t	t	\N
37171	134	10	07:00 ÀS 13:00	t	f	t	t	\N
37172	134	10	13:00 ÀS 19:00	t	f	t	t	\N
37173	134	10	19:00 ÀS 01:00	t	f	t	t	\N
37174	134	11	07:00 ÀS 13:00	t	f	t	t	\N
27881	202	19	07:00 ÀS 13:00	t	f	t	t	\N
27882	202	19	13:00 ÀS 19:00	t	f	t	t	\N
27883	202	19	19:00 ÀS 01:00	t	f	t	t	\N
27884	202	19	01:00 ÀS 07:00	t	f	t	t	\N
27885	202	20	07:00 ÀS 13:00	t	f	t	t	\N
27886	202	20	13:00 ÀS 19:00	t	f	t	t	\N
27887	202	20	19:00 ÀS 01:00	t	f	t	t	\N
27888	202	20	01:00 ÀS 07:00	t	f	t	t	\N
27889	202	22	13:00 ÀS 19:00	t	f	t	t	\N
27890	202	22	19:00 ÀS 01:00	t	f	t	t	\N
27857	80	11	19:00 ÀS 01:00	t	f	t	t	\N
27858	80	11	01:00 ÀS 07:00	t	f	t	t	\N
27859	80	12	07:00 ÀS 13:00	t	f	t	t	\N
27860	80	12	13:00 ÀS 19:00	t	f	t	t	\N
27861	80	12	19:00 ÀS 01:00	t	f	t	t	\N
27862	80	12	01:00 ÀS 07:00	t	f	t	t	\N
27863	80	14	13:00 ÀS 19:00	t	f	t	t	\N
27864	80	14	19:00 ÀS 01:00	t	f	t	t	\N
27865	80	14	01:00 ÀS 07:00	t	f	t	t	\N
27866	80	15	07:00 ÀS 13:00	t	f	t	t	\N
27867	80	15	13:00 ÀS 19:00	t	f	t	t	\N
27868	80	15	19:00 ÀS 01:00	t	f	t	t	\N
27869	80	15	01:00 ÀS 07:00	t	f	t	t	\N
27870	80	8	07:00 ÀS 13:00	t	f	t	t	\N
27871	80	8	13:00 ÀS 19:00	t	f	t	t	\N
27872	80	8	19:00 ÀS 01:00	t	f	t	t	\N
27873	80	8	01:00 ÀS 07:00	t	f	t	t	\N
27891	202	22	01:00 ÀS 07:00	t	f	t	t	\N
27892	202	23	07:00 ÀS 13:00	t	f	t	t	\N
27943	223	10	07:00 ÀS 13:00	t	f	t	t	\N
37175	134	11	13:00 ÀS 19:00	t	f	t	t	\N
37176	134	11	19:00 ÀS 01:00	t	f	t	t	\N
37177	134	13	13:00 ÀS 19:00	t	f	t	t	\N
37178	134	13	19:00 ÀS 01:00	t	f	t	t	\N
37179	134	14	07:00 ÀS 13:00	t	f	t	t	\N
22017	106	10	07:00 ÀS 13:00	t	f	f	f	EXECUTANDO SERVIÇO DO CB DIEGO MATIAS Req. nº  24084/2026-PESSOAL
22019	106	10	19:00 ÀS 01:00	t	f	f	f	EXECUTANDO SERVIÇO DO CB DIEGO MATIAS Req. nº  24084/2026-PESSOAL
22025	106	14	07:00 ÀS 13:00	t	f	f	f	EXECUTANDO SERVIÇO NA RP NO LUGAR DO SGT ELTON 14/05 Req. nº  23971/2026-PESSOAL
22026	106	14	13:00 ÀS 19:00	t	f	f	f	EXECUTANDO SERVIÇO NA RP NO LUGAR DO SGT ELTON 14/05 Req. nº  23971/2026-PESSOAL
22027	106	14	19:00 ÀS 01:00	t	f	f	f	EXECUTANDO SERVIÇO NA RP NO LUGAR DO SGT ELTON 14/05 Req. nº  23971/2026-PESSOAL
37180	134	14	13:00 ÀS 19:00	t	f	t	t	\N
37181	134	14	19:00 ÀS 01:00	t	f	t	t	\N
37182	134	1	07:00 ÀS 13:00	t	f	t	t	\N
37183	134	1	13:00 ÀS 19:00	t	f	t	t	\N
37184	134	1	19:00 ÀS 01:00	t	f	t	t	\N
37185	134	2	07:00 ÀS 13:00	t	f	t	t	\N
24220	228	3	13:00 ÀS 19:00	t	f	f	t	\N
24221	228	3	19:00 ÀS 01:00	t	f	f	t	\N
24222	228	3	01:00 ÀS 07:00	t	f	f	t	\N
24223	228	7	13:00 ÀS 19:00	t	f	f	t	\N
24224	228	7	19:00 ÀS 01:00	t	f	f	t	\N
24225	228	7	01:00 ÀS 07:00	t	f	f	t	\N
27894	202	23	19:00 ÀS 01:00	t	f	t	t	\N
27895	202	23	01:00 ÀS 07:00	t	f	t	t	\N
27896	202	26	13:00 ÀS 19:00	t	f	t	t	\N
27897	202	26	19:00 ÀS 01:00	t	f	t	t	\N
27898	202	26	01:00 ÀS 07:00	t	f	t	t	\N
27899	202	27	07:00 ÀS 13:00	t	f	t	t	\N
27900	202	27	13:00 ÀS 19:00	t	f	t	t	\N
27901	202	27	19:00 ÀS 01:00	t	f	t	t	\N
27987	224	16	07:00 ÀS 13:00	t	f	t	t	\N
27949	223	11	19:00 ÀS 01:00	t	f	t	t	\N
27988	224	16	13:00 ÀS 19:00	t	f	t	t	\N
27989	224	16	19:00 ÀS 01:00	t	f	t	t	\N
37186	134	2	13:00 ÀS 19:00	t	f	t	t	\N
37187	134	2	19:00 ÀS 01:00	t	f	t	t	\N
37188	134	3	07:00 ÀS 13:00	t	f	t	t	\N
37189	134	3	13:00 ÀS 19:00	t	f	t	t	\N
22919	191	28	13:00 ÀS 19:00	t	f	f	f	PERMUT SERV DIA 28/05 - Req 24892/2026
22921	191	30	07:00 ÀS 13:00	t	f	f	f	EXECUT SERV DIA 30/05 - Req 144/2026
22922	191	30	13:00 ÀS 19:00	t	f	f	f	EXECUT SERV DIA 30/05 - Req 144/2026
37190	134	3	19:00 ÀS 01:00	t	f	t	t	\N
37191	134	6	07:00 ÀS 13:00	t	f	t	t	\N
37192	134	6	13:00 ÀS 19:00	t	f	t	t	\N
37193	134	6	19:00 ÀS 01:00	t	f	t	t	\N
37194	134	5	13:00 ÀS 19:00	t	f	t	t	\N
37195	134	5	19:00 ÀS 01:00	t	f	t	t	\N
37196	134	9	13:00 ÀS 19:00	t	f	t	t	\N
37197	134	9	19:00 ÀS 01:00	t	f	t	t	\N
27990	224	16	01:00 ÀS 07:00	t	f	t	t	\N
27991	224	17	07:00 ÀS 13:00	t	f	t	t	\N
27992	224	17	13:00 ÀS 19:00	t	f	t	t	\N
27993	224	17	19:00 ÀS 01:00	t	f	t	t	\N
27994	224	17	01:00 ÀS 07:00	t	f	t	t	\N
27995	224	19	07:00 ÀS 13:00	t	f	t	t	\N
27996	224	19	13:00 ÀS 19:00	t	f	t	t	\N
27997	224	19	19:00 ÀS 01:00	t	f	t	t	\N
27998	224	19	01:00 ÀS 07:00	t	f	t	t	\N
27999	224	20	07:00 ÀS 13:00	t	f	t	t	\N
28000	224	20	13:00 ÀS 19:00	t	f	t	t	\N
14604	116	16	19:00 ÀS 01:00	t	f	f	t	\N
14605	116	20	13:00 ÀS 19:00	t	f	f	t	\N
14606	116	22	19:00 ÀS 01:00	t	f	f	t	\N
14607	116	23	19:00 ÀS 01:00	t	f	f	t	\N
14608	116	27	19:00 ÀS 01:00	t	f	f	t	\N
14609	116	28	19:00 ÀS 01:00	t	f	f	t	\N
14610	116	30	19:00 ÀS 01:00	t	f	f	t	\N
26392	116	4	07:00 ÀS 13:00	t	f	f	t	\N
26393	116	4	13:00 ÀS 19:00	t	f	f	t	\N
26394	116	4	19:00 ÀS 01:00	t	f	f	t	\N
26395	116	5	07:00 ÀS 13:00	t	f	f	t	\N
26396	116	5	13:00 ÀS 19:00	t	f	f	t	\N
26397	116	5	19:00 ÀS 01:00	t	f	f	t	\N
26398	116	6	07:00 ÀS 13:00	t	f	f	t	\N
22906	191	23	07:00 ÀS 13:00	t	f	f	t	\N
22907	191	23	13:00 ÀS 19:00	t	f	f	t	\N
22908	191	23	19:00 ÀS 01:00	t	f	f	t	\N
22909	191	24	07:00 ÀS 13:00	t	f	f	t	\N
22910	191	24	13:00 ÀS 19:00	t	f	f	t	\N
22911	191	24	19:00 ÀS 01:00	t	f	f	t	\N
22912	191	26	07:00 ÀS 13:00	t	f	f	t	\N
22913	191	26	13:00 ÀS 19:00	t	f	f	t	\N
22914	191	26	19:00 ÀS 01:00	t	f	f	t	\N
22915	191	27	07:00 ÀS 13:00	t	f	f	t	\N
22916	191	27	13:00 ÀS 19:00	t	f	f	t	\N
37198	193	10	13:00 ÀS 19:00	t	f	t	t	\N
22924	191	31	07:00 ÀS 13:00	t	f	f	t	\N
22925	191	31	13:00 ÀS 19:00	t	f	f	t	\N
22926	191	31	19:00 ÀS 01:00	t	f	f	t	\N
22923	191	30	19:00 ÀS 01:00	t	f	f	f	EXECUT SERV DIA 30/05 - Req 144/2026
37199	193	11	13:00 ÀS 19:00	t	f	t	t	\N
26399	116	6	13:00 ÀS 19:00	t	f	f	t	\N
26400	116	6	19:00 ÀS 01:00	t	f	f	t	\N
26401	116	8	07:00 ÀS 13:00	t	f	f	t	\N
26402	116	8	13:00 ÀS 19:00	t	f	f	t	\N
26403	116	8	19:00 ÀS 01:00	t	f	f	t	\N
37200	193	12	13:00 ÀS 19:00	t	f	t	t	\N
37201	193	15	13:00 ÀS 19:00	t	f	t	t	\N
37202	193	1	13:00 ÀS 19:00	t	f	t	t	\N
37203	193	2	13:00 ÀS 19:00	t	f	t	t	\N
37204	193	3	13:00 ÀS 19:00	t	f	t	t	\N
37205	193	5	13:00 ÀS 19:00	t	f	t	t	\N
37206	193	8	13:00 ÀS 19:00	t	f	t	t	\N
37207	193	9	13:00 ÀS 19:00	t	f	t	t	\N
37208	193	6	19:00 ÀS 01:00	t	f	t	t	\N
37209	193	6	01:00 ÀS 07:00	t	f	t	t	\N
37210	193	7	19:00 ÀS 01:00	t	f	t	t	\N
37211	193	7	01:00 ÀS 07:00	t	f	t	t	\N
37212	145	12	07:00 ÀS 13:00	t	f	f	t	\N
37213	145	12	13:00 ÀS 19:00	t	f	f	t	\N
37214	145	12	19:00 ÀS 01:00	t	f	f	t	\N
37215	145	12	01:00 ÀS 07:00	t	f	f	t	\N
28043	97	10	07:00 ÀS 13:00	t	f	t	t	\N
28044	97	10	13:00 ÀS 19:00	t	f	t	t	\N
28045	97	10	19:00 ÀS 01:00	t	f	t	t	\N
28046	97	10	01:00 ÀS 07:00	t	f	t	t	\N
21275	150	16	13:00 ÀS 19:00	t	f	t	t	\N
22307	66	10	01:00 ÀS 07:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22309	66	11	13:00 ÀS 19:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22108	121	5	07:00 ÀS 13:00	t	f	t	f	DESIST - 05/05 Req. nº  23324/2026-PAA
22111	121	5	01:00 ÀS 07:00	t	f	t	f	DESIST - 05/05 Req. nº  23324/2026-PAA
22305	66	10	13:00 ÀS 19:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22310	66	11	19:00 ÀS 01:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22312	66	13	07:00 ÀS 13:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22313	66	13	13:00 ÀS 19:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22314	66	13	19:00 ÀS 01:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
37216	145	4	07:00 ÀS 13:00	t	f	f	t	\N
37217	145	4	13:00 ÀS 19:00	t	f	f	t	\N
37218	145	8	07:00 ÀS 13:00	t	f	f	t	\N
37219	145	8	13:00 ÀS 19:00	t	f	f	t	\N
37220	145	8	19:00 ÀS 01:00	t	f	f	t	\N
37221	145	9	07:00 ÀS 13:00	t	f	f	t	\N
37222	145	9	13:00 ÀS 19:00	t	f	f	t	\N
37223	183	11	07:00 ÀS 13:00	t	f	t	t	\N
37224	183	11	13:00 ÀS 19:00	t	f	t	t	\N
37225	183	11	19:00 ÀS 01:00	t	f	t	t	\N
37226	183	11	01:00 ÀS 07:00	t	f	t	t	\N
37227	183	12	07:00 ÀS 13:00	t	f	t	t	\N
37228	183	12	13:00 ÀS 19:00	t	f	t	t	\N
37229	183	12	19:00 ÀS 01:00	t	f	t	t	\N
37230	183	12	01:00 ÀS 07:00	t	f	t	t	\N
37231	183	14	07:00 ÀS 13:00	t	f	t	t	\N
37232	183	14	13:00 ÀS 19:00	t	f	t	t	\N
37233	183	14	19:00 ÀS 01:00	t	f	t	t	\N
37234	183	14	01:00 ÀS 07:00	t	f	t	t	\N
37235	183	15	07:00 ÀS 13:00	t	f	t	t	\N
37236	183	15	13:00 ÀS 19:00	t	f	t	t	\N
37237	183	15	19:00 ÀS 01:00	t	f	t	t	\N
37238	183	15	01:00 ÀS 07:00	t	f	t	t	\N
37239	183	3	07:00 ÀS 13:00	t	f	t	t	\N
37240	183	3	13:00 ÀS 19:00	t	f	t	t	\N
37241	183	3	19:00 ÀS 01:00	t	f	t	t	\N
37242	183	3	01:00 ÀS 07:00	t	f	t	t	\N
37243	183	4	07:00 ÀS 13:00	t	f	t	t	\N
37244	183	4	13:00 ÀS 19:00	t	f	t	t	\N
37245	183	4	19:00 ÀS 01:00	t	f	t	t	\N
37246	183	4	01:00 ÀS 07:00	t	f	t	t	\N
37247	153	10	13:00 ÀS 19:00	t	f	f	t	\N
37248	153	11	13:00 ÀS 19:00	t	f	f	t	\N
37249	153	15	13:00 ÀS 19:00	t	f	f	t	\N
37250	153	1	13:00 ÀS 19:00	t	f	f	t	\N
37251	153	2	13:00 ÀS 19:00	t	f	f	t	\N
37252	153	3	13:00 ÀS 19:00	t	f	f	t	\N
37253	153	8	13:00 ÀS 19:00	t	f	f	t	\N
37254	153	9	13:00 ÀS 19:00	t	f	f	t	\N
21276	150	16	19:00 ÀS 01:00	t	f	t	t	\N
22315	66	13	01:00 ÀS 07:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22316	66	14	07:00 ÀS 13:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22317	66	14	13:00 ÀS 19:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22318	66	14	19:00 ÀS 01:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22319	66	14	01:00 ÀS 07:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22320	66	15	07:00 ÀS 13:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22321	66	15	13:00 ÀS 19:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22322	66	15	19:00 ÀS 01:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22323	66	15	01:00 ÀS 07:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22478	181	3	07:00 ÀS 13:00	t	f	f	t	\N
22479	181	4	07:00 ÀS 13:00	t	f	f	t	\N
22480	181	4	13:00 ÀS 19:00	t	f	f	t	\N
22481	181	4	19:00 ÀS 01:00	t	f	f	t	\N
22469	181	11	07:00 ÀS 13:00	t	f	f	t	\N
22470	181	11	13:00 ÀS 19:00	t	f	f	t	\N
22471	181	11	19:00 ÀS 01:00	t	f	f	t	\N
22472	181	12	07:00 ÀS 13:00	t	f	f	t	\N
22473	181	12	13:00 ÀS 19:00	t	f	f	t	\N
22474	181	12	19:00 ÀS 01:00	t	f	f	t	\N
37255	220	14	19:00 ÀS 01:00	t	f	t	t	\N
37256	220	14	01:00 ÀS 07:00	t	f	t	t	\N
37257	220	3	19:00 ÀS 01:00	t	f	t	t	\N
37258	220	3	01:00 ÀS 07:00	t	f	t	t	\N
37259	161	11	13:00 ÀS 19:00	t	f	t	t	\N
37260	161	11	19:00 ÀS 01:00	t	f	t	t	\N
37261	161	15	13:00 ÀS 19:00	t	f	t	t	\N
37262	161	15	19:00 ÀS 01:00	t	f	t	t	\N
37263	161	4	07:00 ÀS 13:00	t	f	t	t	\N
37264	161	4	13:00 ÀS 19:00	t	f	t	t	\N
37265	161	4	19:00 ÀS 01:00	t	f	t	t	\N
37266	161	8	07:00 ÀS 13:00	t	f	t	t	\N
37267	161	8	13:00 ÀS 19:00	t	f	t	t	\N
37268	161	8	19:00 ÀS 01:00	t	f	t	t	\N
37269	161	3	13:00 ÀS 19:00	t	f	t	t	\N
37270	161	3	19:00 ÀS 01:00	t	f	t	t	\N
37280	186	4	07:00 ÀS 13:00	t	f	f	t	\N
37281	186	4	13:00 ÀS 19:00	t	f	f	t	\N
37282	186	4	19:00 ÀS 01:00	t	f	f	t	\N
37271	186	10	13:00 ÀS 19:00	t	f	f	t	\N
37272	186	10	19:00 ÀS 01:00	t	f	f	t	\N
37273	186	10	01:00 ÀS 07:00	t	f	f	t	\N
37275	186	11	13:00 ÀS 19:00	t	f	f	t	\N
37276	186	11	19:00 ÀS 01:00	t	f	f	t	\N
37274	186	11	07:00 ÀS 13:00	t	f	f	t	\N
37277	186	15	07:00 ÀS 13:00	t	f	f	t	\N
37278	186	15	13:00 ÀS 19:00	t	f	f	t	\N
37279	186	15	19:00 ÀS 01:00	t	f	f	t	\N
34115	241	22	13:00 ÀS 19:00	t	f	f	t	\N
34116	241	22	19:00 ÀS 01:00	t	f	f	t	\N
34117	241	29	13:00 ÀS 19:00	t	f	f	t	\N
34118	241	29	19:00 ÀS 01:00	t	f	f	t	\N
34119	241	30	13:00 ÀS 19:00	t	f	f	t	\N
34120	241	30	19:00 ÀS 01:00	t	f	f	t	\N
37283	245	11	13:00 ÀS 19:00	t	f	t	t	\N
37284	245	11	19:00 ÀS 01:00	t	f	t	t	\N
37285	245	11	01:00 ÀS 07:00	t	f	t	t	\N
37286	245	12	07:00 ÀS 13:00	t	f	t	t	\N
37287	245	12	13:00 ÀS 19:00	t	f	t	t	\N
37288	245	12	19:00 ÀS 01:00	t	f	t	t	\N
37289	245	12	01:00 ÀS 07:00	t	f	t	t	\N
37290	245	14	13:00 ÀS 19:00	t	f	t	t	\N
37291	245	14	19:00 ÀS 01:00	t	f	t	t	\N
37292	245	14	01:00 ÀS 07:00	t	f	t	t	\N
37293	245	15	07:00 ÀS 13:00	t	f	t	t	\N
37294	245	15	13:00 ÀS 19:00	t	f	t	t	\N
37295	245	15	19:00 ÀS 01:00	t	f	t	t	\N
37296	245	15	01:00 ÀS 07:00	t	f	t	t	\N
37297	245	4	07:00 ÀS 13:00	t	f	t	t	\N
37298	245	4	13:00 ÀS 19:00	t	f	t	t	\N
37299	245	4	19:00 ÀS 01:00	t	f	t	t	\N
37300	245	4	01:00 ÀS 07:00	t	f	t	t	\N
37301	245	8	07:00 ÀS 13:00	t	f	t	t	\N
37302	245	8	13:00 ÀS 19:00	t	f	t	t	\N
37303	245	8	19:00 ÀS 01:00	t	f	t	t	\N
37304	245	8	01:00 ÀS 07:00	t	f	t	t	\N
37305	245	3	13:00 ÀS 19:00	t	f	t	t	\N
37306	245	3	19:00 ÀS 01:00	t	f	t	t	\N
37307	245	3	01:00 ÀS 07:00	t	f	t	t	\N
37308	202	11	13:00 ÀS 19:00	t	f	t	t	\N
37309	202	11	19:00 ÀS 01:00	t	f	t	t	\N
37310	202	11	01:00 ÀS 07:00	t	f	t	t	\N
37311	202	13	13:00 ÀS 19:00	t	f	t	t	\N
37312	202	13	19:00 ÀS 01:00	t	f	t	t	\N
37313	202	15	13:00 ÀS 19:00	t	f	t	t	\N
37314	202	15	19:00 ÀS 01:00	t	f	t	t	\N
37315	202	15	01:00 ÀS 07:00	t	f	t	t	\N
25529	137	12	19:00 ÀS 01:00	t	f	t	f	DESIST 12,13/05 Req - 24290/2026\nDIA 05/05 ESTAVA ESCALADO E PASSOU O SERVIÇO
37316	202	3	13:00 ÀS 19:00	t	f	t	t	\N
37317	202	3	19:00 ÀS 01:00	t	f	t	t	\N
37318	202	3	01:00 ÀS 07:00	t	f	t	t	\N
37319	202	4	13:00 ÀS 19:00	t	f	t	t	\N
37320	202	4	19:00 ÀS 01:00	t	f	t	t	\N
37321	202	4	01:00 ÀS 07:00	t	f	t	t	\N
37322	202	5	13:00 ÀS 19:00	t	f	t	t	\N
37323	202	5	19:00 ÀS 01:00	t	f	t	t	\N
37324	202	5	01:00 ÀS 07:00	t	f	t	t	\N
37325	202	8	13:00 ÀS 19:00	t	f	t	t	\N
37326	202	8	19:00 ÀS 01:00	t	f	t	t	\N
37327	202	8	01:00 ÀS 07:00	t	f	t	t	\N
37328	202	9	13:00 ÀS 19:00	t	f	t	t	\N
37329	202	9	19:00 ÀS 01:00	t	f	t	t	\N
25530	137	12	01:00 ÀS 07:00	t	f	t	f	DESIST 12,13/05 Req - 24290/2026\nDIA 05/05 ESTAVA ESCALADO E PASSOU O SERVIÇO
15349	62	10	07:00 ÀS 13:00	t	f	t	t	\N
25532	137	13	01:00 ÀS 07:00	t	f	t	f	DESIST 12,13/05 Req - 24290/2026\nDIA 05/05 ESTAVA ESCALADO E PASSOU O SERVIÇO
25535	137	5	19:00 ÀS 01:00	t	f	t	f	DESIST 12,13/05 Req - 24290/2026\nDIA 05/05 ESTAVA ESCALADO E PASSOU O SERVIÇO
25536	137	5	01:00 ÀS 07:00	t	f	t	f	DESIST 12,13/05 Req - 24290/2026\nDIA 05/05 ESTAVA ESCALADO E PASSOU O SERVIÇO
22328	66	3	07:00 ÀS 13:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22329	66	3	13:00 ÀS 19:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
15350	62	10	13:00 ÀS 19:00	t	f	t	t	\N
15351	62	2	07:00 ÀS 13:00	t	f	t	t	\N
15352	62	2	13:00 ÀS 19:00	t	f	t	t	\N
15353	62	5	07:00 ÀS 13:00	t	f	t	t	\N
15354	62	5	13:00 ÀS 19:00	t	f	t	t	\N
15355	62	5	19:00 ÀS 01:00	t	f	t	t	\N
15356	62	6	07:00 ÀS 13:00	t	f	t	t	\N
15357	62	6	13:00 ÀS 19:00	t	f	t	t	\N
15358	62	6	19:00 ÀS 01:00	t	f	t	t	\N
15359	62	9	07:00 ÀS 13:00	t	f	t	t	\N
37330	158	14	19:00 ÀS 01:00	t	f	t	t	\N
22330	66	3	19:00 ÀS 01:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22331	66	3	01:00 ÀS 07:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22332	66	9	07:00 ÀS 13:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22333	66	9	13:00 ÀS 19:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22334	66	9	19:00 ÀS 01:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22335	66	9	01:00 ÀS 07:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
37331	158	14	01:00 ÀS 07:00	t	f	t	t	\N
37332	158	1	07:00 ÀS 13:00	t	f	t	t	\N
37333	158	1	13:00 ÀS 19:00	t	f	t	t	\N
37334	158	9	07:00 ÀS 13:00	t	f	t	t	\N
37335	158	9	13:00 ÀS 19:00	t	f	t	t	\N
37336	158	6	19:00 ÀS 01:00	t	f	t	t	\N
37337	158	6	01:00 ÀS 07:00	t	f	t	t	\N
37338	217	10	19:00 ÀS 01:00	t	f	t	t	\N
37339	217	10	01:00 ÀS 07:00	t	f	t	t	\N
37340	217	12	13:00 ÀS 19:00	t	f	t	t	\N
37341	217	12	19:00 ÀS 01:00	t	f	t	t	\N
22918	191	28	07:00 ÀS 13:00	t	f	f	f	PERMUT SERV DIA 28/05 - Req 24892/2026
22920	191	28	19:00 ÀS 01:00	t	f	f	f	PERMUT SERV DIA 28/05 - Req 24892/2026
37342	217	12	01:00 ÀS 07:00	t	f	t	t	\N
37343	217	13	13:00 ÀS 19:00	t	f	t	t	\N
37344	217	13	19:00 ÀS 01:00	t	f	t	t	\N
37345	217	13	01:00 ÀS 07:00	t	f	t	t	\N
37346	217	14	13:00 ÀS 19:00	t	f	t	t	\N
37347	217	14	19:00 ÀS 01:00	t	f	t	t	\N
37348	217	14	01:00 ÀS 07:00	t	f	t	t	\N
37349	217	5	13:00 ÀS 19:00	t	f	t	t	\N
37350	217	5	19:00 ÀS 01:00	t	f	t	t	\N
37351	217	5	01:00 ÀS 07:00	t	f	t	t	\N
37352	217	6	13:00 ÀS 19:00	t	f	t	t	\N
37353	217	6	19:00 ÀS 01:00	t	f	t	t	\N
37354	217	6	01:00 ÀS 07:00	t	f	t	t	\N
37355	217	7	13:00 ÀS 19:00	t	f	t	t	\N
37356	217	7	19:00 ÀS 01:00	t	f	t	t	\N
37357	217	7	01:00 ÀS 07:00	t	f	t	t	\N
37358	217	3	19:00 ÀS 01:00	t	f	t	t	\N
37359	217	3	01:00 ÀS 07:00	t	f	t	t	\N
37360	182	11	13:00 ÀS 19:00	t	f	t	t	\N
37361	182	11	19:00 ÀS 01:00	t	f	t	t	\N
37362	182	15	13:00 ÀS 19:00	t	f	t	t	\N
37363	182	15	19:00 ÀS 01:00	t	f	t	t	\N
37364	182	5	07:00 ÀS 13:00	t	f	t	t	\N
37365	182	5	13:00 ÀS 19:00	t	f	t	t	\N
37366	182	9	07:00 ÀS 13:00	t	f	t	t	\N
37367	182	9	13:00 ÀS 19:00	t	f	t	t	\N
37368	182	9	19:00 ÀS 01:00	t	f	t	t	\N
37369	182	3	13:00 ÀS 19:00	t	f	t	t	\N
37370	182	3	19:00 ÀS 01:00	t	f	t	t	\N
37371	182	8	13:00 ÀS 19:00	t	f	t	t	\N
37372	182	8	19:00 ÀS 01:00	t	f	t	t	\N
27944	223	10	13:00 ÀS 19:00	t	f	t	t	\N
27945	223	10	19:00 ÀS 01:00	t	f	t	t	\N
27946	223	10	01:00 ÀS 07:00	t	f	t	t	\N
27947	223	11	07:00 ÀS 13:00	t	f	t	t	\N
27948	223	11	13:00 ÀS 19:00	t	f	t	t	\N
24216	227	1	07:00 ÀS 13:00	t	f	f	t	\N
24217	227	1	13:00 ÀS 19:00	t	f	f	t	\N
24218	227	1	19:00 ÀS 01:00	t	f	f	t	\N
24219	227	1	01:00 ÀS 07:00	t	f	f	t	\N
33943	240	1	01:00 ÀS 07:00	t	f	f	t	\N
33944	240	2	01:00 ÀS 07:00	t	f	f	t	\N
33945	240	3	01:00 ÀS 07:00	t	f	f	t	\N
33946	240	4	01:00 ÀS 07:00	t	f	f	t	\N
33947	240	5	01:00 ÀS 07:00	t	f	f	t	\N
37392	179	10	07:00 ÀS 13:00	t	f	f	t	\N
37393	179	11	07:00 ÀS 13:00	t	f	f	t	\N
37394	179	13	13:00 ÀS 19:00	t	f	f	t	\N
37395	179	14	07:00 ÀS 13:00	t	f	f	t	\N
37396	179	14	13:00 ÀS 19:00	t	f	f	t	\N
37397	179	15	07:00 ÀS 13:00	t	f	f	t	\N
37398	179	2	07:00 ÀS 13:00	t	f	f	t	\N
37399	179	3	07:00 ÀS 13:00	t	f	f	t	\N
37400	244	13	19:00 ÀS 01:00	t	f	t	t	\N
37401	244	13	01:00 ÀS 07:00	t	f	t	t	\N
37402	244	14	19:00 ÀS 01:00	t	f	t	t	\N
37403	244	14	01:00 ÀS 07:00	t	f	t	t	\N
37404	244	6	13:00 ÀS 19:00	t	f	t	t	\N
37405	244	6	19:00 ÀS 01:00	t	f	t	t	\N
37406	244	7	13:00 ÀS 19:00	t	f	t	t	\N
37407	244	7	19:00 ÀS 01:00	t	f	t	t	\N
37374	149	10	13:00 ÀS 19:00	t	f	f	t	\N
37380	149	15	13:00 ÀS 19:00	t	f	f	t	\N
37381	149	15	19:00 ÀS 01:00	t	f	f	t	\N
37375	149	10	19:00 ÀS 01:00	t	f	f	t	\N
37376	149	11	07:00 ÀS 13:00	t	f	f	t	\N
37377	149	11	13:00 ÀS 19:00	t	f	f	t	\N
37378	149	11	19:00 ÀS 01:00	t	f	f	t	\N
37379	149	15	07:00 ÀS 13:00	t	f	f	t	\N
37382	149	3	07:00 ÀS 13:00	t	f	f	t	\N
37383	149	3	13:00 ÀS 19:00	t	f	f	t	\N
37384	149	3	19:00 ÀS 01:00	t	f	f	t	\N
37385	149	4	07:00 ÀS 13:00	t	f	f	t	\N
37386	149	4	13:00 ÀS 19:00	t	f	f	t	\N
37373	149	10	07:00 ÀS 13:00	t	f	f	t	\N
33975	240	31	01:00 ÀS 07:00	t	f	f	t	\N
28022	224	26	01:00 ÀS 07:00	t	f	t	t	\N
28029	224	28	19:00 ÀS 01:00	t	f	t	t	\N
28030	224	28	01:00 ÀS 07:00	t	f	t	t	\N
28031	224	29	07:00 ÀS 13:00	t	f	t	t	\N
28032	224	29	13:00 ÀS 19:00	t	f	t	t	\N
37408	198	11	07:00 ÀS 13:00	t	f	t	t	\N
37409	198	11	13:00 ÀS 19:00	t	f	t	t	\N
37410	198	11	19:00 ÀS 01:00	t	f	t	t	\N
37411	198	11	01:00 ÀS 07:00	t	f	t	t	\N
37412	198	12	07:00 ÀS 13:00	t	f	t	t	\N
37413	198	12	13:00 ÀS 19:00	t	f	t	t	\N
37414	198	12	19:00 ÀS 01:00	t	f	t	t	\N
37415	198	12	01:00 ÀS 07:00	t	f	t	t	\N
28033	224	29	19:00 ÀS 01:00	t	f	t	t	\N
28034	224	29	01:00 ÀS 07:00	t	f	t	t	\N
28035	224	30	07:00 ÀS 13:00	t	f	t	t	\N
37416	198	13	07:00 ÀS 13:00	t	f	t	t	\N
37417	198	13	13:00 ÀS 19:00	t	f	t	t	\N
37418	198	13	19:00 ÀS 01:00	t	f	t	t	\N
37419	198	13	01:00 ÀS 07:00	t	f	t	t	\N
37420	198	15	07:00 ÀS 13:00	t	f	t	t	\N
37421	198	15	13:00 ÀS 19:00	t	f	t	t	\N
37422	198	15	19:00 ÀS 01:00	t	f	t	t	\N
37423	198	15	01:00 ÀS 07:00	t	f	t	t	\N
37424	198	1	07:00 ÀS 13:00	t	f	t	t	\N
37425	198	1	13:00 ÀS 19:00	t	f	t	t	\N
37426	198	1	19:00 ÀS 01:00	t	f	t	t	\N
37427	198	1	01:00 ÀS 07:00	t	f	t	t	\N
37428	198	3	07:00 ÀS 13:00	t	f	t	t	\N
37429	198	3	13:00 ÀS 19:00	t	f	t	t	\N
37430	198	3	19:00 ÀS 01:00	t	f	t	t	\N
37431	198	3	01:00 ÀS 07:00	t	f	t	t	\N
37432	198	4	07:00 ÀS 13:00	t	f	t	t	\N
37433	198	4	13:00 ÀS 19:00	t	f	t	t	\N
37434	198	4	19:00 ÀS 01:00	t	f	t	t	\N
37435	198	4	01:00 ÀS 07:00	t	f	t	t	\N
37436	198	5	07:00 ÀS 13:00	t	f	t	t	\N
37437	198	5	13:00 ÀS 19:00	t	f	t	t	\N
37438	198	5	19:00 ÀS 01:00	t	f	t	t	\N
37439	198	5	01:00 ÀS 07:00	t	f	t	t	\N
37440	198	7	07:00 ÀS 13:00	t	f	t	t	\N
37441	198	7	13:00 ÀS 19:00	t	f	t	t	\N
37442	198	7	19:00 ÀS 01:00	t	f	t	t	\N
37443	198	7	01:00 ÀS 07:00	t	f	t	t	\N
37444	198	8	07:00 ÀS 13:00	t	f	t	t	\N
37445	198	8	13:00 ÀS 19:00	t	f	t	t	\N
37446	198	8	19:00 ÀS 01:00	t	f	t	t	\N
37447	198	8	01:00 ÀS 07:00	t	f	t	t	\N
37448	198	9	07:00 ÀS 13:00	t	f	t	t	\N
37449	198	9	13:00 ÀS 19:00	t	f	t	t	\N
37450	198	9	19:00 ÀS 01:00	t	f	t	t	\N
37451	198	9	01:00 ÀS 07:00	t	f	t	t	\N
37452	214	15	13:00 ÀS 19:00	t	f	t	t	\N
37453	214	15	19:00 ÀS 01:00	t	f	t	t	\N
37454	214	4	07:00 ÀS 13:00	t	f	t	t	\N
37455	214	4	13:00 ÀS 19:00	t	f	t	t	\N
37456	214	5	07:00 ÀS 13:00	t	f	t	t	\N
37457	214	5	13:00 ÀS 19:00	t	f	t	t	\N
37458	214	8	07:00 ÀS 13:00	t	f	t	t	\N
37459	214	8	13:00 ÀS 19:00	t	f	t	t	\N
37460	214	8	19:00 ÀS 01:00	t	f	t	t	\N
37461	214	9	07:00 ÀS 13:00	t	f	t	t	\N
37462	214	9	13:00 ÀS 19:00	t	f	t	t	\N
37463	174	10	07:00 ÀS 13:00	t	f	t	t	\N
37464	174	10	13:00 ÀS 19:00	t	f	t	t	\N
37465	174	10	19:00 ÀS 01:00	t	f	t	t	\N
37466	174	10	01:00 ÀS 07:00	t	f	t	t	\N
37467	174	12	07:00 ÀS 13:00	t	f	t	t	\N
37468	174	12	13:00 ÀS 19:00	t	f	t	t	\N
37469	174	12	19:00 ÀS 01:00	t	f	t	t	\N
37470	174	12	01:00 ÀS 07:00	t	f	t	t	\N
37471	174	13	07:00 ÀS 13:00	t	f	t	t	\N
37472	174	13	13:00 ÀS 19:00	t	f	t	t	\N
37473	174	13	19:00 ÀS 01:00	t	f	t	t	\N
37474	174	13	01:00 ÀS 07:00	t	f	t	t	\N
37475	174	14	07:00 ÀS 13:00	t	f	t	t	\N
37476	174	14	13:00 ÀS 19:00	t	f	t	t	\N
37477	174	14	19:00 ÀS 01:00	t	f	t	t	\N
37478	174	14	01:00 ÀS 07:00	t	f	t	t	\N
37479	174	1	07:00 ÀS 13:00	t	f	t	t	\N
37480	174	1	13:00 ÀS 19:00	t	f	t	t	\N
28036	224	30	13:00 ÀS 19:00	t	f	t	t	\N
28037	224	30	19:00 ÀS 01:00	t	f	t	t	\N
37481	174	1	19:00 ÀS 01:00	t	f	t	t	\N
37482	174	1	01:00 ÀS 07:00	t	f	t	t	\N
37483	174	2	07:00 ÀS 13:00	t	f	t	t	\N
37484	174	2	13:00 ÀS 19:00	t	f	t	t	\N
37485	174	2	19:00 ÀS 01:00	t	f	t	t	\N
37486	174	2	01:00 ÀS 07:00	t	f	t	t	\N
28038	224	30	01:00 ÀS 07:00	t	f	t	t	\N
37487	174	4	07:00 ÀS 13:00	t	f	t	t	\N
37488	174	4	13:00 ÀS 19:00	t	f	t	t	\N
37489	174	4	19:00 ÀS 01:00	t	f	t	t	\N
37490	174	4	01:00 ÀS 07:00	t	f	t	t	\N
37491	174	5	07:00 ÀS 13:00	t	f	t	t	\N
37492	174	5	13:00 ÀS 19:00	t	f	t	t	\N
37493	174	5	19:00 ÀS 01:00	t	f	t	t	\N
37494	174	5	01:00 ÀS 07:00	t	f	t	t	\N
37495	174	6	07:00 ÀS 13:00	t	f	t	t	\N
37496	174	6	13:00 ÀS 19:00	t	f	t	t	\N
37497	174	6	19:00 ÀS 01:00	t	f	t	t	\N
37498	174	6	01:00 ÀS 07:00	t	f	t	t	\N
37499	174	8	07:00 ÀS 13:00	t	f	t	t	\N
37500	174	8	13:00 ÀS 19:00	t	f	t	t	\N
37501	174	8	19:00 ÀS 01:00	t	f	t	t	\N
37502	174	8	01:00 ÀS 07:00	t	f	t	t	\N
37503	174	9	07:00 ÀS 13:00	t	f	t	t	\N
37504	174	9	13:00 ÀS 19:00	t	f	t	t	\N
37505	174	9	19:00 ÀS 01:00	t	f	t	t	\N
37506	174	9	01:00 ÀS 07:00	t	f	t	t	\N
37507	207	12	13:00 ÀS 19:00	t	f	t	t	\N
37508	207	12	19:00 ÀS 01:00	t	f	t	t	\N
37509	207	12	01:00 ÀS 07:00	t	f	t	t	\N
37510	207	15	13:00 ÀS 19:00	t	f	t	t	\N
37511	207	15	19:00 ÀS 01:00	t	f	t	t	\N
37512	207	15	01:00 ÀS 07:00	t	f	t	t	\N
37513	207	4	13:00 ÀS 19:00	t	f	t	t	\N
37514	207	4	19:00 ÀS 01:00	t	f	t	t	\N
37515	207	4	01:00 ÀS 07:00	t	f	t	t	\N
37516	199	10	07:00 ÀS 13:00	t	f	t	t	\N
37517	199	10	13:00 ÀS 19:00	t	f	t	t	\N
37518	199	10	19:00 ÀS 01:00	t	f	t	t	\N
37519	199	10	01:00 ÀS 07:00	t	f	t	t	\N
37520	199	12	07:00 ÀS 13:00	t	f	t	t	\N
37521	199	12	13:00 ÀS 19:00	t	f	t	t	\N
37522	199	12	19:00 ÀS 01:00	t	f	t	t	\N
37523	199	12	01:00 ÀS 07:00	t	f	t	t	\N
37524	199	13	07:00 ÀS 13:00	t	f	t	t	\N
37525	199	13	13:00 ÀS 19:00	t	f	t	t	\N
37526	199	13	19:00 ÀS 01:00	t	f	t	t	\N
37527	199	13	01:00 ÀS 07:00	t	f	t	t	\N
37528	199	14	07:00 ÀS 13:00	t	f	t	t	\N
37529	199	14	13:00 ÀS 19:00	t	f	t	t	\N
37530	199	14	19:00 ÀS 01:00	t	f	t	t	\N
37531	199	14	01:00 ÀS 07:00	t	f	t	t	\N
37532	199	1	07:00 ÀS 13:00	t	f	t	t	\N
37533	199	1	13:00 ÀS 19:00	t	f	t	t	\N
37534	199	1	19:00 ÀS 01:00	t	f	t	t	\N
21449	125	8	13:00 ÀS 19:00	t	f	t	f	DESIST 08/05
21450	125	8	19:00 ÀS 01:00	t	f	t	f	DESIST 08/05
25531	137	13	19:00 ÀS 01:00	t	f	t	f	DESIST 12,13/05 Req - 24290/2026\nDIA 05/05 ESTAVA ESCALADO E PASSOU O SERVIÇO
33948	240	6	01:00 ÀS 07:00	t	f	f	t	\N
33949	240	7	01:00 ÀS 07:00	t	f	f	t	\N
33950	240	8	01:00 ÀS 07:00	t	f	f	t	\N
33951	240	9	01:00 ÀS 07:00	t	f	f	t	\N
33952	240	10	01:00 ÀS 07:00	t	f	f	t	\N
37535	199	1	01:00 ÀS 07:00	t	f	t	t	\N
37536	199	2	07:00 ÀS 13:00	t	f	t	t	\N
37537	199	2	13:00 ÀS 19:00	t	f	t	t	\N
37538	199	2	19:00 ÀS 01:00	t	f	t	t	\N
37539	199	2	01:00 ÀS 07:00	t	f	t	t	\N
37540	199	4	07:00 ÀS 13:00	t	f	t	t	\N
37541	199	4	13:00 ÀS 19:00	t	f	t	t	\N
37542	199	4	19:00 ÀS 01:00	t	f	t	t	\N
37543	199	4	01:00 ÀS 07:00	t	f	t	t	\N
37544	199	5	07:00 ÀS 13:00	t	f	t	t	\N
37545	199	5	13:00 ÀS 19:00	t	f	t	t	\N
37546	199	5	19:00 ÀS 01:00	t	f	t	t	\N
37547	199	5	01:00 ÀS 07:00	t	f	t	t	\N
37548	199	6	07:00 ÀS 13:00	t	f	t	t	\N
37549	199	6	13:00 ÀS 19:00	t	f	t	t	\N
37550	199	6	19:00 ÀS 01:00	t	f	t	t	\N
37551	199	6	01:00 ÀS 07:00	t	f	t	t	\N
37552	199	8	07:00 ÀS 13:00	t	f	t	t	\N
37553	199	8	13:00 ÀS 19:00	t	f	t	t	\N
33953	240	11	01:00 ÀS 07:00	t	f	f	t	\N
33954	240	12	01:00 ÀS 07:00	t	f	f	t	\N
33955	240	13	01:00 ÀS 07:00	t	f	f	t	\N
37554	199	8	19:00 ÀS 01:00	t	f	t	t	\N
37555	199	8	01:00 ÀS 07:00	t	f	t	t	\N
37556	199	9	07:00 ÀS 13:00	t	f	t	t	\N
37557	199	9	13:00 ÀS 19:00	t	f	t	t	\N
37558	199	9	19:00 ÀS 01:00	t	f	t	t	\N
37559	199	9	01:00 ÀS 07:00	t	f	t	t	\N
37560	132	10	13:00 ÀS 19:00	t	f	t	t	\N
37561	132	10	19:00 ÀS 01:00	t	f	t	t	\N
37562	132	10	01:00 ÀS 07:00	t	f	t	t	\N
37563	132	11	07:00 ÀS 13:00	t	f	t	t	\N
37564	132	11	13:00 ÀS 19:00	t	f	t	t	\N
37565	132	11	19:00 ÀS 01:00	t	f	t	t	\N
37566	132	11	01:00 ÀS 07:00	t	f	t	t	\N
37567	132	12	07:00 ÀS 13:00	t	f	t	t	\N
37568	132	12	13:00 ÀS 19:00	t	f	t	t	\N
37569	132	12	19:00 ÀS 01:00	t	f	t	t	\N
37570	132	15	13:00 ÀS 19:00	t	f	t	t	\N
37571	132	15	19:00 ÀS 01:00	t	f	t	t	\N
37572	132	15	01:00 ÀS 07:00	t	f	t	t	\N
37573	132	3	07:00 ÀS 13:00	t	f	t	t	\N
37574	132	3	13:00 ÀS 19:00	t	f	t	t	\N
37575	132	3	19:00 ÀS 01:00	t	f	t	t	\N
37576	132	3	01:00 ÀS 07:00	t	f	t	t	\N
33956	240	14	01:00 ÀS 07:00	t	f	f	t	\N
33957	240	15	01:00 ÀS 07:00	t	f	f	t	\N
37577	132	4	07:00 ÀS 13:00	t	f	t	t	\N
37578	132	4	13:00 ÀS 19:00	t	f	t	t	\N
37579	132	4	19:00 ÀS 01:00	t	f	t	t	\N
37580	132	4	01:00 ÀS 07:00	t	f	t	t	\N
37581	132	7	07:00 ÀS 13:00	t	f	t	t	\N
37582	132	7	13:00 ÀS 19:00	t	f	t	t	\N
37583	132	7	19:00 ÀS 01:00	t	f	t	t	\N
37584	132	8	07:00 ÀS 13:00	t	f	t	t	\N
37585	132	8	13:00 ÀS 19:00	t	f	t	t	\N
37586	132	8	19:00 ÀS 01:00	t	f	t	t	\N
37587	132	2	13:00 ÀS 19:00	t	f	t	t	\N
37588	132	2	19:00 ÀS 01:00	t	f	t	t	\N
37589	132	2	01:00 ÀS 07:00	t	f	t	t	\N
37590	132	6	13:00 ÀS 19:00	t	f	t	t	\N
37591	132	6	19:00 ÀS 01:00	t	f	t	t	\N
37592	133	10	07:00 ÀS 13:00	t	f	t	t	\N
37593	133	10	13:00 ÀS 19:00	t	f	t	t	\N
37594	133	10	19:00 ÀS 01:00	t	f	t	t	\N
37595	133	10	01:00 ÀS 07:00	t	f	t	t	\N
37596	133	12	07:00 ÀS 13:00	t	f	t	t	\N
37597	133	12	13:00 ÀS 19:00	t	f	t	t	\N
37598	133	12	19:00 ÀS 01:00	t	f	t	t	\N
37599	133	12	01:00 ÀS 07:00	t	f	t	t	\N
37600	133	13	07:00 ÀS 13:00	t	f	t	t	\N
37601	133	13	13:00 ÀS 19:00	t	f	t	t	\N
37602	133	13	19:00 ÀS 01:00	t	f	t	t	\N
37603	133	13	01:00 ÀS 07:00	t	f	t	t	\N
37604	133	14	07:00 ÀS 13:00	t	f	t	t	\N
37605	133	14	13:00 ÀS 19:00	t	f	t	t	\N
37606	133	14	19:00 ÀS 01:00	t	f	t	t	\N
37607	133	14	01:00 ÀS 07:00	t	f	t	t	\N
37608	133	1	07:00 ÀS 13:00	t	f	t	t	\N
37609	133	1	13:00 ÀS 19:00	t	f	t	t	\N
33958	240	16	13:00 ÀS 19:00	t	f	f	t	\N
33959	240	16	19:00 ÀS 01:00	t	f	f	t	\N
33960	240	16	01:00 ÀS 07:00	t	f	f	t	\N
33961	240	17	01:00 ÀS 07:00	t	f	f	t	\N
33962	240	18	01:00 ÀS 07:00	t	f	f	t	\N
37610	133	1	19:00 ÀS 01:00	t	f	t	t	\N
37611	133	1	01:00 ÀS 07:00	t	f	t	t	\N
37612	133	2	07:00 ÀS 13:00	t	f	t	t	\N
37613	133	2	13:00 ÀS 19:00	t	f	t	t	\N
37614	133	2	19:00 ÀS 01:00	t	f	t	t	\N
37615	133	2	01:00 ÀS 07:00	t	f	t	t	\N
37616	133	4	07:00 ÀS 13:00	t	f	t	t	\N
37617	133	4	13:00 ÀS 19:00	t	f	t	t	\N
37618	133	4	19:00 ÀS 01:00	t	f	t	t	\N
37619	133	4	01:00 ÀS 07:00	t	f	t	t	\N
37620	133	5	07:00 ÀS 13:00	t	f	t	t	\N
37621	133	5	13:00 ÀS 19:00	t	f	t	t	\N
37622	133	5	19:00 ÀS 01:00	t	f	t	t	\N
33963	240	19	01:00 ÀS 07:00	t	f	f	t	\N
33964	240	20	01:00 ÀS 07:00	t	f	f	t	\N
33965	240	21	01:00 ÀS 07:00	t	f	f	t	\N
33966	240	22	01:00 ÀS 07:00	t	f	f	t	\N
33967	240	23	01:00 ÀS 07:00	t	f	f	t	\N
33968	240	24	01:00 ÀS 07:00	t	f	f	t	\N
33969	240	25	01:00 ÀS 07:00	t	f	f	t	\N
33970	240	26	01:00 ÀS 07:00	t	f	f	t	\N
33971	240	27	01:00 ÀS 07:00	t	f	f	t	\N
33972	240	28	01:00 ÀS 07:00	t	f	f	t	\N
33973	240	29	01:00 ÀS 07:00	t	f	f	t	\N
33974	240	30	01:00 ÀS 07:00	t	f	f	t	\N
28001	224	20	19:00 ÀS 01:00	t	f	t	t	\N
28002	224	20	01:00 ÀS 07:00	t	f	t	t	\N
28003	224	21	07:00 ÀS 13:00	t	f	t	t	\N
28004	224	21	13:00 ÀS 19:00	t	f	t	t	\N
37623	133	5	01:00 ÀS 07:00	t	f	t	t	\N
37624	133	6	07:00 ÀS 13:00	t	f	t	t	\N
37625	133	6	13:00 ÀS 19:00	t	f	t	t	\N
37626	133	6	19:00 ÀS 01:00	t	f	t	t	\N
37627	133	6	01:00 ÀS 07:00	t	f	t	t	\N
37628	133	8	07:00 ÀS 13:00	t	f	t	t	\N
37629	133	8	13:00 ÀS 19:00	t	f	t	t	\N
37630	133	8	19:00 ÀS 01:00	t	f	t	t	\N
37631	133	8	01:00 ÀS 07:00	t	f	t	t	\N
37632	133	9	07:00 ÀS 13:00	t	f	t	t	\N
37633	133	9	13:00 ÀS 19:00	t	f	t	t	\N
37634	133	9	19:00 ÀS 01:00	t	f	t	t	\N
37635	133	9	01:00 ÀS 07:00	t	f	t	t	\N
28005	224	21	19:00 ÀS 01:00	t	f	t	t	\N
28006	224	21	01:00 ÀS 07:00	t	f	t	t	\N
28007	224	22	07:00 ÀS 13:00	t	f	t	t	\N
28008	224	22	13:00 ÀS 19:00	t	f	t	t	\N
28009	224	22	19:00 ÀS 01:00	t	f	t	t	\N
28010	224	22	01:00 ÀS 07:00	t	f	t	t	\N
28011	224	23	07:00 ÀS 13:00	t	f	t	t	\N
28012	224	23	13:00 ÀS 19:00	t	f	t	t	\N
28013	224	23	19:00 ÀS 01:00	t	f	t	t	\N
28014	224	23	01:00 ÀS 07:00	t	f	t	t	\N
28015	224	25	07:00 ÀS 13:00	t	f	t	t	\N
28016	224	25	13:00 ÀS 19:00	t	f	t	t	\N
28017	224	25	19:00 ÀS 01:00	t	f	t	t	\N
28018	224	25	01:00 ÀS 07:00	t	f	t	t	\N
28019	224	26	07:00 ÀS 13:00	t	f	t	t	\N
28020	224	26	13:00 ÀS 19:00	t	f	t	t	\N
21277	150	17	07:00 ÀS 13:00	t	f	t	t	\N
21278	150	18	07:00 ÀS 13:00	t	f	t	t	\N
28079	226	17	13:00 ÀS 19:00	t	f	t	t	\N
28080	226	17	19:00 ÀS 01:00	t	f	t	t	\N
28081	226	17	01:00 ÀS 07:00	t	f	t	t	\N
22018	106	10	13:00 ÀS 19:00	t	f	f	f	EXECUTANDO SERVIÇO DO CB DIEGO MATIAS Req. nº  24084/2026-PESSOAL
22020	106	10	01:00 ÀS 07:00	t	f	f	f	EXECUTANDO SERVIÇO DO CB DIEGO MATIAS Req. nº  24084/2026-PESSOAL
22028	106	14	01:00 ÀS 07:00	t	f	f	f	EXECUTANDO SERVIÇO NA RP NO LUGAR DO SGT ELTON 14/05 Req. nº  23971/2026-PESSOAL
28082	226	18	07:00 ÀS 13:00	t	f	t	t	\N
28083	226	18	13:00 ÀS 19:00	t	f	t	t	\N
28084	226	18	19:00 ÀS 01:00	t	f	t	t	\N
28085	226	18	01:00 ÀS 07:00	t	f	t	t	\N
28086	226	19	07:00 ÀS 13:00	t	f	t	t	\N
28087	226	19	13:00 ÀS 19:00	t	f	t	t	\N
28088	226	19	19:00 ÀS 01:00	t	f	t	t	\N
28089	226	21	13:00 ÀS 19:00	t	f	t	t	\N
28090	226	21	19:00 ÀS 01:00	t	f	t	t	\N
28091	226	21	01:00 ÀS 07:00	t	f	t	t	\N
28092	226	22	07:00 ÀS 13:00	t	f	t	t	\N
28093	226	22	13:00 ÀS 19:00	t	f	t	t	\N
28094	226	22	19:00 ÀS 01:00	t	f	t	t	\N
28095	226	22	01:00 ÀS 07:00	t	f	t	t	\N
28047	97	11	07:00 ÀS 13:00	t	f	t	t	\N
28048	97	11	13:00 ÀS 19:00	t	f	t	t	\N
28049	97	11	19:00 ÀS 01:00	t	f	t	t	\N
28050	97	13	13:00 ÀS 19:00	t	f	t	t	\N
28051	97	13	19:00 ÀS 01:00	t	f	t	t	\N
28052	97	13	01:00 ÀS 07:00	t	f	t	t	\N
21947	163	26	19:00 ÀS 01:00	t	f	f	t	\N
21934	115	12	13:00 ÀS 19:00	t	f	f	t	\N
21948	163	28	13:00 ÀS 19:00	t	f	f	t	\N
21949	163	28	19:00 ÀS 01:00	t	f	f	t	\N
22021	106	11	07:00 ÀS 13:00	t	f	f	t	\N
21950	163	30	13:00 ÀS 19:00	t	f	f	t	\N
21951	163	30	19:00 ÀS 01:00	t	f	f	t	\N
28356	159	21	07:00 ÀS 13:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
28357	159	21	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
22090	121	11	19:00 ÀS 01:00	t	f	t	f	DESISTENCIA 11,13/05 -Req. nº  24360/2026-PAA
22096	121	13	07:00 ÀS 13:00	t	f	t	f	DESISTENCIA 11,13/05 -Req. nº  24360/2026-PAA
22097	121	13	13:00 ÀS 19:00	t	f	t	f	DESISTENCIA 11,13/05 -Req. nº  24360/2026-PAA
22099	121	13	01:00 ÀS 07:00	t	f	t	f	DESISTENCIA 11,13/05 -Req. nº  24360/2026-PAA
37387	149	6	07:00 ÀS 13:00	t	f	f	t	\N
37388	149	7	07:00 ÀS 13:00	t	f	f	t	\N
37389	149	8	07:00 ÀS 13:00	t	f	f	t	\N
37390	149	8	13:00 ÀS 19:00	t	f	f	t	\N
37391	149	8	19:00 ÀS 01:00	t	f	f	t	\N
37709	248	10	07:00 ÀS 13:00	t	f	f	t	\N
37710	248	10	13:00 ÀS 19:00	t	f	f	t	\N
37711	248	10	19:00 ÀS 01:00	t	f	f	t	\N
37712	248	10	01:00 ÀS 07:00	t	f	f	t	\N
37713	248	11	07:00 ÀS 13:00	t	f	f	t	\N
37714	248	11	13:00 ÀS 19:00	t	f	f	t	\N
37715	248	11	19:00 ÀS 01:00	t	f	f	t	\N
37716	248	11	01:00 ÀS 07:00	t	f	f	t	\N
37717	248	13	07:00 ÀS 13:00	t	f	f	t	\N
37718	248	13	13:00 ÀS 19:00	t	f	f	t	\N
28053	97	14	07:00 ÀS 13:00	t	f	t	t	\N
37719	248	13	19:00 ÀS 01:00	t	f	f	t	\N
37720	248	13	01:00 ÀS 07:00	t	f	f	t	\N
37721	248	15	07:00 ÀS 13:00	t	f	f	t	\N
37722	248	15	13:00 ÀS 19:00	t	f	f	t	\N
37723	248	15	19:00 ÀS 01:00	t	f	f	t	\N
37724	248	15	01:00 ÀS 07:00	t	f	f	t	\N
37725	248	8	07:00 ÀS 13:00	t	f	f	t	\N
28054	97	14	13:00 ÀS 19:00	t	f	t	t	\N
28055	97	14	19:00 ÀS 01:00	t	f	t	t	\N
28056	97	14	01:00 ÀS 07:00	t	f	t	t	\N
28057	97	15	07:00 ÀS 13:00	t	f	t	t	\N
28058	97	15	13:00 ÀS 19:00	t	f	t	t	\N
28059	97	15	19:00 ÀS 01:00	t	f	t	t	\N
37726	248	8	13:00 ÀS 19:00	t	f	f	t	\N
26404	116	10	07:00 ÀS 13:00	t	f	f	t	\N
26405	116	10	13:00 ÀS 19:00	t	f	f	t	\N
37727	248	8	19:00 ÀS 01:00	t	f	f	t	\N
26406	116	10	19:00 ÀS 01:00	t	f	f	t	\N
26407	116	12	07:00 ÀS 13:00	t	f	f	t	\N
26408	116	12	13:00 ÀS 19:00	t	f	f	t	\N
26409	116	12	19:00 ÀS 01:00	t	f	f	t	\N
26410	116	13	07:00 ÀS 13:00	t	f	f	t	\N
26411	116	13	13:00 ÀS 19:00	t	f	f	t	\N
26412	116	13	19:00 ÀS 01:00	t	f	f	t	\N
26413	116	14	07:00 ÀS 13:00	t	f	f	t	\N
37728	248	8	01:00 ÀS 07:00	t	f	f	t	\N
37729	248	9	07:00 ÀS 13:00	t	f	f	t	\N
37730	248	9	13:00 ÀS 19:00	t	f	f	t	\N
37731	248	9	19:00 ÀS 01:00	t	f	f	t	\N
37732	248	9	01:00 ÀS 07:00	t	f	f	t	\N
37733	249	11	07:00 ÀS 13:00	t	f	t	t	\N
37734	249	11	13:00 ÀS 19:00	t	f	t	t	\N
37735	249	11	19:00 ÀS 01:00	t	f	t	t	\N
37736	249	14	07:00 ÀS 13:00	t	f	t	t	\N
37737	249	14	13:00 ÀS 19:00	t	f	t	t	\N
37738	249	14	19:00 ÀS 01:00	t	f	t	t	\N
37739	249	15	07:00 ÀS 13:00	t	f	t	t	\N
37740	249	15	13:00 ÀS 19:00	t	f	t	t	\N
37741	249	15	19:00 ÀS 01:00	t	f	t	t	\N
37742	249	2	07:00 ÀS 13:00	t	f	t	t	\N
37743	249	2	13:00 ÀS 19:00	t	f	t	t	\N
37744	249	2	19:00 ÀS 01:00	t	f	t	t	\N
26414	116	14	13:00 ÀS 19:00	t	f	f	t	\N
26415	116	14	19:00 ÀS 01:00	t	f	f	t	\N
28096	226	23	07:00 ÀS 13:00	t	f	t	t	\N
28097	226	23	13:00 ÀS 19:00	t	f	t	t	\N
28098	226	23	19:00 ÀS 01:00	t	f	t	t	\N
28099	226	25	13:00 ÀS 19:00	t	f	t	t	\N
28100	226	25	19:00 ÀS 01:00	t	f	t	t	\N
27893	202	23	13:00 ÀS 19:00	t	f	t	t	\N
27902	202	27	01:00 ÀS 07:00	t	f	t	t	\N
27903	202	28	07:00 ÀS 13:00	t	f	t	t	\N
27904	202	28	13:00 ÀS 19:00	t	f	t	t	\N
27905	202	28	19:00 ÀS 01:00	t	f	t	t	\N
27906	202	28	01:00 ÀS 07:00	t	f	t	t	\N
27907	202	30	13:00 ÀS 19:00	t	f	t	t	\N
27908	202	30	19:00 ÀS 01:00	t	f	t	t	\N
27909	202	30	01:00 ÀS 07:00	t	f	t	t	\N
27910	202	31	07:00 ÀS 13:00	t	f	t	t	\N
37745	249	3	07:00 ÀS 13:00	t	f	t	t	\N
27911	202	31	13:00 ÀS 19:00	t	f	t	t	\N
27912	202	31	19:00 ÀS 01:00	t	f	t	t	\N
27913	202	31	01:00 ÀS 07:00	t	f	t	t	\N
27950	223	11	01:00 ÀS 07:00	t	f	t	t	\N
28231	141	29	19:00 ÀS 01:00	t	f	t	t	\N
37746	249	3	13:00 ÀS 19:00	t	f	t	t	\N
25734	156	27	07:00 ÀS 13:00	t	f	t	t	\N
37747	249	3	19:00 ÀS 01:00	t	f	t	t	\N
28369	69	10	19:00 ÀS 01:00	t	f	t	t	\N
22092	121	12	07:00 ÀS 13:00	t	f	t	t	\N
37748	249	4	07:00 ÀS 13:00	t	f	t	t	\N
37749	249	4	13:00 ÀS 19:00	t	f	t	t	\N
37750	249	4	19:00 ÀS 01:00	t	f	t	t	\N
37751	249	4	01:00 ÀS 07:00	t	f	t	t	\N
37752	249	8	07:00 ÀS 13:00	t	f	t	t	\N
37753	249	8	13:00 ÀS 19:00	t	f	t	t	\N
37754	249	8	19:00 ÀS 01:00	t	f	t	t	\N
37755	250	10	07:00 ÀS 13:00	t	f	t	t	\N
37756	250	10	13:00 ÀS 19:00	t	f	t	t	\N
37757	250	10	19:00 ÀS 01:00	t	f	t	t	\N
16519	186	31	13:00 ÀS 19:00	f	f	f	f	EXECUT SERV DA CB EDIVANIA - Req. nº  27361/2026-1ª CIA/RP
30131	186	8	13:00 ÀS 19:00	f	f	f	t	\N
30132	186	8	19:00 ÀS 01:00	f	f	f	t	\N
30133	186	8	01:00 ÀS 07:00	f	f	f	t	\N
30134	186	9	07:00 ÀS 13:00	f	f	f	t	\N
30135	186	9	13:00 ÀS 19:00	f	f	f	t	\N
30139	186	7	13:00 ÀS 19:00	f	f	f	t	\N
30140	186	7	19:00 ÀS 01:00	f	f	f	t	\N
30141	186	7	01:00 ÀS 07:00	f	f	f	t	\N
16509	186	24	13:00 ÀS 19:00	t	f	f	t	\N
16510	186	24	19:00 ÀS 01:00	t	f	f	t	\N
16511	186	25	07:00 ÀS 13:00	t	f	f	t	\N
16512	186	25	13:00 ÀS 19:00	t	f	f	t	\N
16513	186	25	19:00 ÀS 01:00	t	f	f	t	\N
16514	186	28	13:00 ÀS 19:00	t	f	f	t	\N
16515	186	28	19:00 ÀS 01:00	t	f	f	t	\N
16516	186	28	01:00 ÀS 07:00	t	f	f	t	\N
16517	186	29	07:00 ÀS 13:00	t	f	f	t	\N
16518	186	29	13:00 ÀS 19:00	t	f	f	t	\N
37758	250	4	07:00 ÀS 13:00	t	f	t	t	\N
37759	250	4	13:00 ÀS 19:00	t	f	t	t	\N
37760	250	4	19:00 ÀS 01:00	t	f	t	t	\N
37761	250	5	07:00 ÀS 13:00	t	f	t	t	\N
37762	250	5	13:00 ÀS 19:00	t	f	t	t	\N
37763	250	5	19:00 ÀS 01:00	t	f	t	t	\N
37764	250	9	07:00 ÀS 13:00	t	f	t	t	\N
37765	250	9	13:00 ÀS 19:00	t	f	t	t	\N
37766	250	9	19:00 ÀS 01:00	t	f	t	t	\N
37767	251	10	01:00 ÀS 07:00	t	f	t	t	\N
37768	251	11	13:00 ÀS 19:00	t	f	t	t	\N
37769	251	11	19:00 ÀS 01:00	t	f	t	t	\N
37770	251	11	01:00 ÀS 07:00	t	f	t	t	\N
37771	251	12	13:00 ÀS 19:00	t	f	t	t	\N
37772	251	12	19:00 ÀS 01:00	t	f	t	t	\N
37773	251	12	01:00 ÀS 07:00	t	f	t	t	\N
37774	251	15	13:00 ÀS 19:00	t	f	t	t	\N
37775	251	15	19:00 ÀS 01:00	t	f	t	t	\N
37776	251	15	01:00 ÀS 07:00	t	f	t	t	\N
37777	251	3	13:00 ÀS 19:00	t	f	t	t	\N
37778	251	3	19:00 ÀS 01:00	t	f	t	t	\N
37779	251	3	01:00 ÀS 07:00	t	f	t	t	\N
37780	251	4	13:00 ÀS 19:00	t	f	t	t	\N
37781	251	4	19:00 ÀS 01:00	t	f	t	t	\N
37782	251	4	01:00 ÀS 07:00	t	f	t	t	\N
37783	251	8	13:00 ÀS 19:00	t	f	t	t	\N
37784	251	8	19:00 ÀS 01:00	t	f	t	t	\N
37785	251	8	01:00 ÀS 07:00	t	f	t	t	\N
37786	251	2	01:00 ÀS 07:00	t	f	t	t	\N
37787	252	10	13:00 ÀS 19:00	t	f	t	t	\N
37788	252	10	19:00 ÀS 01:00	t	f	t	t	\N
37789	252	10	01:00 ÀS 07:00	t	f	t	t	\N
37790	253	10	07:00 ÀS 13:00	t	f	t	t	\N
37791	253	10	13:00 ÀS 19:00	t	f	t	t	\N
37792	253	10	19:00 ÀS 01:00	t	f	t	t	\N
27951	223	12	07:00 ÀS 13:00	t	f	t	t	\N
27952	223	12	13:00 ÀS 19:00	t	f	t	t	\N
24031	86	5	13:00 ÀS 19:00	t	f	t	f	DIA 05/05 EXECUTANDO SERV 02/05 Req. nº  134/2026\nDIA 10/05 EXECUTANDO SERV 10/05 Req. nº  151/2026
37793	253	1	07:00 ÀS 13:00	t	f	t	t	\N
37794	253	1	13:00 ÀS 19:00	t	f	t	t	\N
37795	253	1	19:00 ÀS 01:00	t	f	t	t	\N
37796	253	2	07:00 ÀS 13:00	t	f	t	t	\N
37797	253	2	13:00 ÀS 19:00	t	f	t	t	\N
37798	253	2	19:00 ÀS 01:00	t	f	t	t	\N
37799	253	9	07:00 ÀS 13:00	t	f	t	t	\N
37800	253	9	13:00 ÀS 19:00	t	f	t	t	\N
37801	253	9	19:00 ÀS 01:00	t	f	t	t	\N
37802	254	12	07:00 ÀS 13:00	t	f	t	t	\N
37803	254	12	13:00 ÀS 19:00	t	f	t	t	\N
37804	254	12	19:00 ÀS 01:00	t	f	t	t	\N
37805	254	12	01:00 ÀS 07:00	t	f	t	t	\N
37806	254	15	07:00 ÀS 13:00	t	f	t	t	\N
37807	254	15	13:00 ÀS 19:00	t	f	t	t	\N
37808	254	15	19:00 ÀS 01:00	t	f	t	t	\N
37809	254	15	01:00 ÀS 07:00	t	f	t	t	\N
37810	254	2	07:00 ÀS 13:00	t	f	t	t	\N
37811	254	2	13:00 ÀS 19:00	t	f	t	t	\N
37812	254	2	19:00 ÀS 01:00	t	f	t	t	\N
37813	254	2	01:00 ÀS 07:00	t	f	t	t	\N
37814	254	4	07:00 ÀS 13:00	t	f	t	t	\N
37815	254	4	13:00 ÀS 19:00	t	f	t	t	\N
37816	254	4	19:00 ÀS 01:00	t	f	t	t	\N
37817	254	4	01:00 ÀS 07:00	t	f	t	t	\N
37818	254	8	07:00 ÀS 13:00	t	f	t	t	\N
37819	254	8	13:00 ÀS 19:00	t	f	t	t	\N
37820	254	8	19:00 ÀS 01:00	t	f	t	t	\N
37821	254	8	01:00 ÀS 07:00	t	f	t	t	\N
37822	255	10	07:00 ÀS 13:00	t	f	t	t	\N
37823	255	10	13:00 ÀS 19:00	t	f	t	t	\N
37824	255	10	19:00 ÀS 01:00	t	f	t	t	\N
37825	255	12	13:00 ÀS 19:00	t	f	t	t	\N
37826	255	12	19:00 ÀS 01:00	t	f	t	t	\N
37827	255	13	07:00 ÀS 13:00	t	f	t	t	\N
37828	255	13	13:00 ÀS 19:00	t	f	t	t	\N
37829	255	13	19:00 ÀS 01:00	t	f	t	t	\N
37830	255	14	07:00 ÀS 13:00	t	f	t	t	\N
37831	255	14	13:00 ÀS 19:00	t	f	t	t	\N
37832	255	14	19:00 ÀS 01:00	t	f	t	t	\N
24032	86	5	19:00 ÀS 01:00	t	f	t	f	DIA 05/05 EXECUTANDO SERV 02/05 Req. nº  134/2026\nDIA 10/05 EXECUTANDO SERV 10/05 Req. nº  151/2026
27953	223	12	19:00 ÀS 01:00	t	f	t	t	\N
24030	86	5	07:00 ÀS 13:00	t	f	t	f	DIA 05/05 EXECUTANDO SERV 02/05 Req. nº  134/2026\nDIA 10/05 EXECUTANDO SERV 10/05 Req. nº  151/2026
27954	223	12	01:00 ÀS 07:00	t	f	t	t	\N
27955	223	13	07:00 ÀS 13:00	t	f	t	t	\N
27956	223	13	13:00 ÀS 19:00	t	f	t	t	\N
27957	223	13	19:00 ÀS 01:00	t	f	t	t	\N
27958	223	13	01:00 ÀS 07:00	t	f	t	t	\N
27959	223	14	07:00 ÀS 13:00	t	f	t	t	\N
27960	223	14	13:00 ÀS 19:00	t	f	t	t	\N
22304	66	10	07:00 ÀS 13:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22306	66	10	19:00 ÀS 01:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22308	66	11	07:00 ÀS 13:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
22311	66	11	01:00 ÀS 07:00	t	f	t	f	DESIST 03/05 Req. nº  23057/2026\nATESTADO - ATE DIA 15/05
27961	223	14	19:00 ÀS 01:00	t	f	t	t	\N
27962	223	14	01:00 ÀS 07:00	t	f	t	t	\N
27963	223	15	07:00 ÀS 13:00	t	f	t	t	\N
27964	223	15	13:00 ÀS 19:00	t	f	t	t	\N
27965	223	15	19:00 ÀS 01:00	t	f	t	t	\N
27966	223	15	01:00 ÀS 07:00	t	f	t	t	\N
21287	150	25	07:00 ÀS 13:00	t	f	t	t	\N
22303	79	9	19:00 ÀS 01:00	t	f	t	t	\N
21288	150	25	13:00 ÀS 19:00	t	f	t	t	\N
21306	108	15	13:00 ÀS 19:00	t	f	t	t	\N
21307	108	5	07:00 ÀS 13:00	t	f	t	t	\N
22336	176	17	07:00 ÀS 13:00	t	f	t	t	\N
21308	108	5	13:00 ÀS 19:00	t	f	t	t	\N
21309	108	6	07:00 ÀS 13:00	t	f	t	t	\N
21310	108	6	13:00 ÀS 19:00	t	f	t	t	\N
21311	108	7	07:00 ÀS 13:00	t	f	t	t	\N
22302	79	1	19:00 ÀS 01:00	t	f	t	t	\N
22337	176	17	13:00 ÀS 19:00	t	f	t	t	\N
21299	108	11	07:00 ÀS 13:00	t	f	t	t	\N
21300	108	11	13:00 ÀS 19:00	t	f	t	t	\N
21279	150	18	13:00 ÀS 19:00	t	f	t	t	\N
21280	150	20	13:00 ÀS 19:00	t	f	t	t	\N
21281	150	20	19:00 ÀS 01:00	t	f	t	t	\N
21282	150	21	07:00 ÀS 13:00	t	f	t	t	\N
21283	150	21	13:00 ÀS 19:00	t	f	t	t	\N
21284	150	21	19:00 ÀS 01:00	t	f	t	t	\N
21285	150	22	07:00 ÀS 13:00	t	f	t	t	\N
21286	150	22	13:00 ÀS 19:00	t	f	t	t	\N
21312	108	7	13:00 ÀS 19:00	t	f	t	t	\N
21319	225	22	07:00 ÀS 13:00	t	f	t	t	\N
21320	225	22	13:00 ÀS 19:00	t	f	t	t	\N
21321	225	26	07:00 ÀS 13:00	t	f	t	t	\N
21322	225	26	13:00 ÀS 19:00	t	f	t	t	\N
21323	225	27	07:00 ÀS 13:00	t	f	t	t	\N
21324	225	27	13:00 ÀS 19:00	t	f	t	t	\N
21325	225	29	07:00 ÀS 13:00	t	f	t	t	\N
21301	108	13	07:00 ÀS 13:00	t	f	t	t	\N
21302	108	13	13:00 ÀS 19:00	t	f	t	t	\N
21303	108	14	07:00 ÀS 13:00	t	f	t	t	\N
21304	108	14	13:00 ÀS 19:00	t	f	t	t	\N
21305	108	15	07:00 ÀS 13:00	t	f	t	t	\N
21326	225	29	13:00 ÀS 19:00	t	f	t	t	\N
21327	225	30	07:00 ÀS 13:00	t	f	t	t	\N
21328	225	30	13:00 ÀS 19:00	t	f	t	t	\N
21329	225	31	07:00 ÀS 13:00	t	f	t	t	\N
21330	225	31	13:00 ÀS 19:00	t	f	t	t	\N
28107	226	27	13:00 ÀS 19:00	t	f	t	t	\N
28108	226	27	19:00 ÀS 01:00	t	f	t	t	\N
37833	255	1	07:00 ÀS 13:00	t	f	t	t	\N
37834	255	1	13:00 ÀS 19:00	t	f	t	t	\N
37835	255	1	19:00 ÀS 01:00	t	f	t	t	\N
37836	255	2	07:00 ÀS 13:00	t	f	t	t	\N
37837	255	2	13:00 ÀS 19:00	t	f	t	t	\N
37838	255	2	19:00 ÀS 01:00	t	f	t	t	\N
37839	255	5	07:00 ÀS 13:00	t	f	t	t	\N
37840	255	5	13:00 ÀS 19:00	t	f	t	t	\N
37841	255	5	19:00 ÀS 01:00	t	f	t	t	\N
37842	255	6	07:00 ÀS 13:00	t	f	t	t	\N
37843	255	6	13:00 ÀS 19:00	t	f	t	t	\N
37844	255	6	19:00 ÀS 01:00	t	f	t	t	\N
37845	255	9	07:00 ÀS 13:00	t	f	t	t	\N
37846	255	9	13:00 ÀS 19:00	t	f	t	t	\N
37847	255	9	19:00 ÀS 01:00	t	f	t	t	\N
37848	255	4	13:00 ÀS 19:00	t	f	t	t	\N
37849	255	4	19:00 ÀS 01:00	t	f	t	t	\N
37850	255	8	13:00 ÀS 19:00	t	f	t	t	\N
37851	255	8	19:00 ÀS 01:00	t	f	t	t	\N
37852	256	14	13:00 ÀS 19:00	t	f	t	t	\N
37853	256	14	19:00 ÀS 01:00	t	f	t	t	\N
37854	256	6	13:00 ÀS 19:00	t	f	t	t	\N
37855	257	5	13:00 ÀS 19:00	t	f	t	t	\N
37856	257	5	19:00 ÀS 01:00	t	f	t	t	\N
37857	258	10	07:00 ÀS 13:00	t	f	t	t	\N
37858	258	10	13:00 ÀS 19:00	t	f	t	t	\N
37859	258	10	19:00 ÀS 01:00	t	f	t	t	\N
37860	258	11	07:00 ÀS 13:00	t	f	t	t	\N
37861	258	11	13:00 ÀS 19:00	t	f	t	t	\N
37862	258	11	19:00 ÀS 01:00	t	f	t	t	\N
28109	226	29	13:00 ÀS 19:00	t	f	t	t	\N
28110	226	29	19:00 ÀS 01:00	t	f	t	t	\N
28111	226	29	01:00 ÀS 07:00	t	f	t	t	\N
22338	176	17	19:00 ÀS 01:00	t	f	t	t	\N
22339	176	17	01:00 ÀS 07:00	t	f	t	t	\N
22340	176	18	07:00 ÀS 13:00	t	f	t	t	\N
22477	181	15	19:00 ÀS 01:00	t	f	f	f	DESIST 15/05 Req. nº  23566/2026-1 CIA
28414	171	16	07:00 ÀS 13:00	t	f	f	f	EXECUT SERVIÇO DIA 16/05 Req. nº  24779/2026-2 CIA
28415	171	16	13:00 ÀS 19:00	t	f	f	f	EXECUT SERVIÇO DIA 16/05 Req. nº  24779/2026-2 CIA
28416	171	16	19:00 ÀS 01:00	t	f	f	f	EXECUT SERVIÇO DIA 16/05 Req. nº  24779/2026-2 CIA
28112	226	30	07:00 ÀS 13:00	t	f	t	t	\N
21313	225	18	07:00 ÀS 13:00	t	f	t	t	\N
21314	225	18	13:00 ÀS 19:00	t	f	t	t	\N
21315	225	19	07:00 ÀS 13:00	t	f	t	t	\N
21316	225	19	13:00 ÀS 19:00	t	f	t	t	\N
21317	225	21	07:00 ÀS 13:00	t	f	t	t	\N
28417	171	18	07:00 ÀS 13:00	t	f	f	t	\N
28418	171	18	13:00 ÀS 19:00	t	f	f	t	\N
28419	171	18	19:00 ÀS 01:00	t	f	f	t	\N
37863	258	2	07:00 ÀS 13:00	t	f	t	t	\N
37864	258	2	13:00 ÀS 19:00	t	f	t	t	\N
37865	258	2	19:00 ÀS 01:00	t	f	t	t	\N
37866	258	3	07:00 ÀS 13:00	t	f	t	t	\N
37867	258	3	13:00 ÀS 19:00	t	f	t	t	\N
37868	258	3	19:00 ÀS 01:00	t	f	t	t	\N
37869	258	9	07:00 ÀS 13:00	t	f	t	t	\N
37870	258	9	13:00 ÀS 19:00	t	f	t	t	\N
37871	258	9	19:00 ÀS 01:00	t	f	t	t	\N
37872	259	10	07:00 ÀS 13:00	t	f	t	t	\N
37873	259	10	13:00 ÀS 19:00	t	f	t	t	\N
37874	259	10	19:00 ÀS 01:00	t	f	t	t	\N
37875	259	10	01:00 ÀS 07:00	t	f	t	t	\N
37876	259	12	07:00 ÀS 13:00	t	f	t	t	\N
37877	259	12	13:00 ÀS 19:00	t	f	t	t	\N
37878	259	12	19:00 ÀS 01:00	t	f	t	t	\N
37879	259	12	01:00 ÀS 07:00	t	f	t	t	\N
37880	259	13	07:00 ÀS 13:00	t	f	t	t	\N
37881	259	13	13:00 ÀS 19:00	t	f	t	t	\N
37882	259	13	19:00 ÀS 01:00	t	f	t	t	\N
37883	259	13	01:00 ÀS 07:00	t	f	t	t	\N
37884	259	14	07:00 ÀS 13:00	t	f	t	t	\N
34836	191	12	07:00 ÀS 13:00	t	f	t	t	\N
34837	191	12	13:00 ÀS 19:00	t	f	t	t	\N
34838	191	12	19:00 ÀS 01:00	t	f	t	t	\N
34839	191	13	07:00 ÀS 13:00	t	f	t	t	\N
34840	191	13	13:00 ÀS 19:00	t	f	t	t	\N
34841	191	13	19:00 ÀS 01:00	t	f	t	t	\N
34842	191	15	07:00 ÀS 13:00	t	f	t	t	\N
34843	191	15	13:00 ÀS 19:00	t	f	t	t	\N
34844	191	15	19:00 ÀS 01:00	t	f	t	t	\N
34845	191	1	07:00 ÀS 13:00	t	f	t	t	\N
34846	191	1	13:00 ÀS 19:00	t	f	t	t	\N
34847	191	1	19:00 ÀS 01:00	t	f	t	t	\N
34848	191	3	07:00 ÀS 13:00	t	f	t	t	\N
34849	191	3	13:00 ÀS 19:00	t	f	t	t	\N
34850	191	3	19:00 ÀS 01:00	t	f	t	t	\N
34851	191	5	07:00 ÀS 13:00	t	f	t	t	\N
34852	191	5	13:00 ÀS 19:00	t	f	t	t	\N
21318	225	21	13:00 ÀS 19:00	t	f	t	t	\N
28113	226	30	13:00 ÀS 19:00	t	f	t	t	\N
28114	226	30	19:00 ÀS 01:00	t	f	t	t	\N
28115	226	30	01:00 ÀS 07:00	t	f	t	t	\N
28116	226	31	07:00 ÀS 13:00	t	f	t	t	\N
28117	226	31	13:00 ÀS 19:00	t	f	t	t	\N
28146	135	17	07:00 ÀS 13:00	t	f	t	t	\N
28142	81	10	07:00 ÀS 13:00	t	f	t	t	\N
34853	191	5	19:00 ÀS 01:00	t	f	t	t	\N
34854	191	8	07:00 ÀS 13:00	t	f	t	t	\N
34855	191	8	13:00 ÀS 19:00	t	f	t	t	\N
37885	259	14	13:00 ÀS 19:00	t	f	t	t	\N
28143	81	10	13:00 ÀS 19:00	t	f	t	t	\N
28144	81	9	07:00 ÀS 13:00	t	f	t	t	\N
28420	171	23	07:00 ÀS 13:00	t	f	f	t	\N
28421	171	23	13:00 ÀS 19:00	t	f	f	t	\N
28422	171	23	19:00 ÀS 01:00	t	f	f	t	\N
22589	98	11	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS -  DESIST Req. nº  24008/2026-1° CIA
22591	98	12	07:00 ÀS 13:00	t	f	t	f	DESIST TODOS OS DIAS -  DESIST Req. nº  24008/2026-1° CIA
22593	98	12	19:00 ÀS 01:00	t	f	t	f	DESIST TODOS OS DIAS -  DESIST Req. nº  24008/2026-1° CIA
22595	98	13	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS -  DESIST Req. nº  24008/2026-1° CIA
28145	81	9	13:00 ÀS 19:00	t	f	t	t	\N
28101	226	25	01:00 ÀS 07:00	t	f	t	t	\N
28102	226	26	07:00 ÀS 13:00	t	f	t	t	\N
28103	226	26	13:00 ÀS 19:00	t	f	t	t	\N
28104	226	26	19:00 ÀS 01:00	t	f	t	t	\N
28105	226	26	01:00 ÀS 07:00	t	f	t	t	\N
28106	226	27	07:00 ÀS 13:00	t	f	t	t	\N
28147	135	17	13:00 ÀS 19:00	t	f	t	t	\N
28148	135	25	07:00 ÀS 13:00	t	f	t	t	\N
28149	135	25	13:00 ÀS 19:00	t	f	t	t	\N
15360	62	9	13:00 ÀS 19:00	t	f	t	t	\N
15361	62	4	13:00 ÀS 19:00	t	f	t	t	\N
34856	191	8	19:00 ÀS 01:00	t	f	t	t	\N
34857	191	9	07:00 ÀS 13:00	t	f	t	t	\N
34858	191	9	13:00 ÀS 19:00	t	f	t	t	\N
34859	191	9	19:00 ÀS 01:00	t	f	t	t	\N
15362	62	4	19:00 ÀS 01:00	t	f	t	t	\N
15363	62	8	13:00 ÀS 19:00	t	f	t	t	\N
15364	62	8	19:00 ÀS 01:00	t	f	t	t	\N
28394	160	30	13:00 ÀS 19:00	t	f	t	t	\N
22510	87	10	07:00 ÀS 13:00	t	f	t	t	\N
22493	182	19	07:00 ÀS 13:00	t	f	t	t	\N
22521	87	2	13:00 ÀS 19:00	t	f	t	t	\N
22522	87	2	19:00 ÀS 01:00	t	f	t	t	\N
22523	87	2	01:00 ÀS 07:00	t	f	t	t	\N
22524	87	3	07:00 ÀS 13:00	t	f	t	t	\N
22560	91	11	13:00 ÀS 19:00	t	f	t	t	\N
34917	242	10	13:00 ÀS 19:00	t	f	t	t	\N
34918	242	10	19:00 ÀS 01:00	t	f	t	t	\N
34919	242	10	01:00 ÀS 07:00	t	f	t	t	\N
34920	242	11	13:00 ÀS 19:00	t	f	t	t	\N
34921	242	11	19:00 ÀS 01:00	t	f	t	t	\N
34922	242	11	01:00 ÀS 07:00	t	f	t	t	\N
34923	242	12	13:00 ÀS 19:00	t	f	t	t	\N
34924	242	12	19:00 ÀS 01:00	t	f	t	t	\N
34925	242	12	01:00 ÀS 07:00	t	f	t	t	\N
34926	242	13	07:00 ÀS 13:00	t	f	t	t	\N
34927	242	13	13:00 ÀS 19:00	t	f	t	t	\N
34928	242	13	19:00 ÀS 01:00	t	f	t	t	\N
34929	242	13	01:00 ÀS 07:00	t	f	t	t	\N
34930	242	14	07:00 ÀS 13:00	t	f	t	t	\N
34931	242	14	13:00 ÀS 19:00	t	f	t	t	\N
34932	242	14	19:00 ÀS 01:00	t	f	t	t	\N
34933	242	14	01:00 ÀS 07:00	t	f	t	t	\N
34934	242	15	13:00 ÀS 19:00	t	f	t	t	\N
34935	242	15	19:00 ÀS 01:00	t	f	t	t	\N
15373	149	22	07:00 ÀS 13:00	t	f	f	t	\N
15365	149	18	07:00 ÀS 13:00	t	f	f	t	\N
15366	149	18	13:00 ÀS 19:00	t	f	f	t	\N
15367	149	18	19:00 ÀS 01:00	t	f	f	t	\N
15368	149	20	13:00 ÀS 19:00	t	f	f	t	\N
15369	149	20	19:00 ÀS 01:00	t	f	f	t	\N
15370	149	21	07:00 ÀS 13:00	t	f	f	t	\N
15371	149	21	13:00 ÀS 19:00	t	f	f	t	\N
15372	149	21	19:00 ÀS 01:00	t	f	f	t	\N
34936	242	15	01:00 ÀS 07:00	t	f	t	t	\N
34937	242	6	07:00 ÀS 13:00	t	f	t	t	\N
34938	242	6	13:00 ÀS 19:00	t	f	t	t	\N
34939	242	6	19:00 ÀS 01:00	t	f	t	t	\N
34940	242	6	01:00 ÀS 07:00	t	f	t	t	\N
34941	242	7	07:00 ÀS 13:00	t	f	t	t	\N
34942	242	7	13:00 ÀS 19:00	t	f	t	t	\N
34943	242	7	19:00 ÀS 01:00	t	f	t	t	\N
34944	242	7	01:00 ÀS 07:00	t	f	t	t	\N
34945	242	1	13:00 ÀS 19:00	t	f	t	t	\N
34946	242	1	19:00 ÀS 01:00	t	f	t	t	\N
34947	242	1	01:00 ÀS 07:00	t	f	t	t	\N
34948	242	2	13:00 ÀS 19:00	t	f	t	t	\N
34949	242	2	19:00 ÀS 01:00	t	f	t	t	\N
34950	242	2	01:00 ÀS 07:00	t	f	t	t	\N
34951	242	3	13:00 ÀS 19:00	t	f	t	t	\N
34952	242	3	19:00 ÀS 01:00	t	f	t	t	\N
34953	242	3	01:00 ÀS 07:00	t	f	t	t	\N
22088	121	11	07:00 ÀS 13:00	t	f	t	f	DESISTENCIA 11,13/05 -Req. nº  24360/2026-PAA
22603	98	8	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS -  DESIST Req. nº  24008/2026-1° CIA
22592	98	12	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS -  DESIST Req. nº  24008/2026-1° CIA
22594	98	13	07:00 ÀS 13:00	t	f	t	f	DESIST TODOS OS DIAS -  DESIST Req. nº  24008/2026-1° CIA
22596	98	15	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS -  DESIST Req. nº  24008/2026-1° CIA
22602	98	8	07:00 ÀS 13:00	t	f	t	f	DESIST TODOS OS DIAS -  DESIST Req. nº  24008/2026-1° CIA
22590	98	11	19:00 ÀS 01:00	t	f	t	f	DESIST TODOS OS DIAS -  DESIST Req. nº  24008/2026-1° CIA
34954	242	4	13:00 ÀS 19:00	t	f	t	t	\N
34955	242	4	19:00 ÀS 01:00	t	f	t	t	\N
34956	242	4	01:00 ÀS 07:00	t	f	t	t	\N
34957	242	5	13:00 ÀS 19:00	t	f	t	t	\N
34958	242	5	19:00 ÀS 01:00	t	f	t	t	\N
34959	242	5	01:00 ÀS 07:00	t	f	t	t	\N
34960	242	8	13:00 ÀS 19:00	t	f	t	t	\N
34961	242	8	19:00 ÀS 01:00	t	f	t	t	\N
34962	242	8	01:00 ÀS 07:00	t	f	t	t	\N
34963	242	9	13:00 ÀS 19:00	t	f	t	t	\N
34964	242	9	19:00 ÀS 01:00	t	f	t	t	\N
34965	242	9	01:00 ÀS 07:00	t	f	t	t	\N
34966	200	10	07:00 ÀS 13:00	t	f	t	t	\N
34967	200	10	13:00 ÀS 19:00	t	f	t	t	\N
34968	200	10	19:00 ÀS 01:00	t	f	t	t	\N
34969	200	11	07:00 ÀS 13:00	t	f	t	t	\N
34970	200	11	13:00 ÀS 19:00	t	f	t	t	\N
34971	200	11	19:00 ÀS 01:00	t	f	t	t	\N
34972	200	14	07:00 ÀS 13:00	t	f	t	t	\N
34973	200	14	13:00 ÀS 19:00	t	f	t	t	\N
34974	200	14	19:00 ÀS 01:00	t	f	t	t	\N
34975	200	15	07:00 ÀS 13:00	t	f	t	t	\N
34976	200	15	13:00 ÀS 19:00	t	f	t	t	\N
34977	200	15	19:00 ÀS 01:00	t	f	t	t	\N
34978	200	1	07:00 ÀS 13:00	t	f	t	t	\N
34979	200	1	13:00 ÀS 19:00	t	f	t	t	\N
34980	200	1	19:00 ÀS 01:00	t	f	t	t	\N
34981	200	2	07:00 ÀS 13:00	t	f	t	t	\N
34982	200	2	13:00 ÀS 19:00	t	f	t	t	\N
34983	200	2	19:00 ÀS 01:00	t	f	t	t	\N
34984	200	3	07:00 ÀS 13:00	t	f	t	t	\N
34985	200	3	13:00 ÀS 19:00	t	f	t	t	\N
34986	200	3	19:00 ÀS 01:00	t	f	t	t	\N
34987	200	5	07:00 ÀS 13:00	t	f	t	t	\N
34988	200	5	13:00 ÀS 19:00	t	f	t	t	\N
34989	200	5	19:00 ÀS 01:00	t	f	t	t	\N
34990	200	9	07:00 ÀS 13:00	t	f	t	t	\N
34991	200	9	13:00 ÀS 19:00	t	f	t	t	\N
34992	200	9	19:00 ÀS 01:00	t	f	t	t	\N
15374	149	22	13:00 ÀS 19:00	t	f	f	t	\N
15375	149	25	07:00 ÀS 13:00	t	f	f	t	\N
15376	149	25	13:00 ÀS 19:00	t	f	f	t	\N
15377	149	25	19:00 ÀS 01:00	t	f	f	t	\N
15378	149	26	07:00 ÀS 13:00	t	f	f	t	\N
15379	149	26	13:00 ÀS 19:00	t	f	f	t	\N
15380	149	26	19:00 ÀS 01:00	t	f	f	t	\N
15381	149	28	13:00 ÀS 19:00	t	f	f	t	\N
15382	149	28	19:00 ÀS 01:00	t	f	f	t	\N
15383	149	29	07:00 ÀS 13:00	t	f	f	t	\N
15384	149	29	13:00 ÀS 19:00	t	f	f	t	\N
15385	149	30	07:00 ÀS 13:00	t	f	f	t	\N
15386	149	30	13:00 ÀS 19:00	t	f	f	t	\N
15387	149	30	19:00 ÀS 01:00	t	f	f	t	\N
37886	259	14	19:00 ÀS 01:00	t	f	t	t	\N
37887	259	14	01:00 ÀS 07:00	t	f	t	t	\N
37888	259	1	07:00 ÀS 13:00	t	f	t	t	\N
37889	259	1	13:00 ÀS 19:00	t	f	t	t	\N
37890	259	1	19:00 ÀS 01:00	t	f	t	t	\N
37891	259	1	01:00 ÀS 07:00	t	f	t	t	\N
37892	259	2	07:00 ÀS 13:00	t	f	t	t	\N
37893	259	2	13:00 ÀS 19:00	t	f	t	t	\N
37894	259	2	19:00 ÀS 01:00	t	f	t	t	\N
37895	259	2	01:00 ÀS 07:00	t	f	t	t	\N
37896	259	4	07:00 ÀS 13:00	t	f	t	t	\N
37897	259	4	13:00 ÀS 19:00	t	f	t	t	\N
37898	259	4	19:00 ÀS 01:00	t	f	t	t	\N
37899	259	4	01:00 ÀS 07:00	t	f	t	t	\N
15390	73	11	07:00 ÀS 13:00	t	f	t	t	\N
15391	73	11	13:00 ÀS 19:00	t	f	t	t	\N
15392	73	11	19:00 ÀS 01:00	t	f	t	t	\N
15397	73	15	07:00 ÀS 13:00	t	f	t	t	\N
35021	141	10	07:00 ÀS 13:00	t	f	t	t	\N
15398	73	15	13:00 ÀS 19:00	t	f	t	t	\N
15399	73	15	19:00 ÀS 01:00	t	f	t	t	\N
15400	73	3	07:00 ÀS 13:00	t	f	t	t	\N
15401	73	3	13:00 ÀS 19:00	t	f	t	t	\N
15402	73	3	19:00 ÀS 01:00	t	f	t	t	\N
15405	73	7	07:00 ÀS 13:00	t	f	t	t	\N
15406	73	7	13:00 ÀS 19:00	t	f	t	t	\N
15407	73	7	19:00 ÀS 01:00	t	f	t	t	\N
15418	150	19	07:00 ÀS 13:00	t	f	t	t	\N
15419	150	19	13:00 ÀS 19:00	t	f	t	t	\N
15420	150	19	19:00 ÀS 01:00	t	f	t	t	\N
15425	150	23	07:00 ÀS 13:00	t	f	t	t	\N
35022	141	10	13:00 ÀS 19:00	t	f	t	t	\N
35023	141	10	19:00 ÀS 01:00	t	f	t	t	\N
35024	141	10	01:00 ÀS 07:00	t	f	t	t	\N
35025	141	12	13:00 ÀS 19:00	t	f	t	t	\N
35026	141	14	07:00 ÀS 13:00	t	f	t	t	\N
35027	141	14	13:00 ÀS 19:00	t	f	t	t	\N
35028	141	14	19:00 ÀS 01:00	t	f	t	t	\N
35029	141	14	01:00 ÀS 07:00	t	f	t	t	\N
35030	141	2	07:00 ÀS 13:00	t	f	t	t	\N
35031	141	2	13:00 ÀS 19:00	t	f	t	t	\N
35032	141	2	19:00 ÀS 01:00	t	f	t	t	\N
35033	141	2	01:00 ÀS 07:00	t	f	t	t	\N
15426	150	23	13:00 ÀS 19:00	t	f	t	t	\N
15427	150	23	19:00 ÀS 01:00	t	f	t	t	\N
15428	150	24	07:00 ÀS 13:00	t	f	t	t	\N
15429	150	24	13:00 ÀS 19:00	t	f	t	t	\N
15432	150	27	07:00 ÀS 13:00	t	f	t	t	\N
15433	150	27	13:00 ÀS 19:00	t	f	t	t	\N
35034	141	5	07:00 ÀS 13:00	t	f	t	t	\N
35035	141	5	13:00 ÀS 19:00	t	f	t	t	\N
35036	141	1	13:00 ÀS 19:00	t	f	t	t	\N
35037	141	1	19:00 ÀS 01:00	t	f	t	t	\N
35038	141	1	01:00 ÀS 07:00	t	f	t	t	\N
35039	141	4	13:00 ÀS 19:00	t	f	t	t	\N
35040	141	4	19:00 ÀS 01:00	t	f	t	t	\N
35041	141	4	01:00 ÀS 07:00	t	f	t	t	\N
35042	141	9	13:00 ÀS 19:00	t	f	t	t	\N
35043	141	9	19:00 ÀS 01:00	t	f	t	t	\N
35044	141	9	01:00 ÀS 07:00	t	f	t	t	\N
35045	215	10	13:00 ÀS 19:00	t	f	f	t	\N
35046	215	10	19:00 ÀS 01:00	t	f	f	t	\N
35047	215	11	13:00 ÀS 19:00	t	f	f	t	\N
35048	215	11	19:00 ÀS 01:00	t	f	f	t	\N
35049	215	13	13:00 ÀS 19:00	t	f	f	t	\N
35050	215	13	19:00 ÀS 01:00	t	f	f	t	\N
15434	150	27	19:00 ÀS 01:00	t	f	t	t	\N
35051	215	14	13:00 ÀS 19:00	t	f	f	t	\N
35052	215	14	19:00 ÀS 01:00	t	f	f	t	\N
35053	215	15	13:00 ÀS 19:00	t	f	f	t	\N
35054	215	15	19:00 ÀS 01:00	t	f	f	t	\N
35055	215	1	13:00 ÀS 19:00	t	f	f	t	\N
35056	215	1	19:00 ÀS 01:00	t	f	f	t	\N
35057	215	2	13:00 ÀS 19:00	t	f	f	t	\N
35058	215	2	19:00 ÀS 01:00	t	f	f	t	\N
35059	215	3	13:00 ÀS 19:00	t	f	f	t	\N
35060	215	3	19:00 ÀS 01:00	t	f	f	t	\N
35061	215	5	13:00 ÀS 19:00	t	f	f	t	\N
35062	215	5	19:00 ÀS 01:00	t	f	f	t	\N
35063	215	6	13:00 ÀS 19:00	t	f	f	t	\N
35064	215	6	19:00 ÀS 01:00	t	f	f	t	\N
35065	215	7	13:00 ÀS 19:00	t	f	f	t	\N
35066	215	7	19:00 ÀS 01:00	t	f	f	t	\N
35067	215	9	13:00 ÀS 19:00	t	f	f	t	\N
35068	215	9	19:00 ÀS 01:00	t	f	f	t	\N
21451	136	18	07:00 ÀS 13:00	t	f	t	t	\N
21438	125	12	13:00 ÀS 19:00	t	f	t	t	\N
15439	150	31	07:00 ÀS 13:00	t	f	t	t	\N
15440	150	31	13:00 ÀS 19:00	t	f	t	t	\N
15441	150	31	19:00 ÀS 01:00	t	f	t	t	\N
21453	136	18	19:00 ÀS 01:00	t	f	t	t	\N
28153	138	4	13:00 ÀS 19:00	t	f	t	t	\N
21452	136	18	13:00 ÀS 19:00	t	f	t	t	\N
25534	137	4	01:00 ÀS 07:00	t	f	t	t	\N
28162	139	28	19:00 ÀS 01:00	t	f	t	t	\N
25533	137	4	19:00 ÀS 01:00	t	f	t	t	\N
28159	139	20	01:00 ÀS 07:00	t	f	t	t	\N
28160	139	28	07:00 ÀS 13:00	t	f	t	t	\N
28154	138	8	19:00 ÀS 01:00	t	f	t	t	\N
28155	138	8	01:00 ÀS 07:00	t	f	t	t	\N
28150	138	11	19:00 ÀS 01:00	t	f	t	t	\N
28151	138	11	01:00 ÀS 07:00	t	f	t	t	\N
28152	138	4	07:00 ÀS 13:00	t	f	t	t	\N
28161	139	28	13:00 ÀS 19:00	t	f	t	t	\N
28164	83	13	07:00 ÀS 13:00	t	f	f	t	\N
28163	139	28	01:00 ÀS 07:00	t	f	t	t	\N
28170	83	7	13:00 ÀS 19:00	t	f	f	t	\N
28165	83	13	13:00 ÀS 19:00	t	f	f	t	\N
28156	139	20	07:00 ÀS 13:00	t	f	t	t	\N
35116	208	12	07:00 ÀS 13:00	t	f	t	t	\N
35117	208	12	13:00 ÀS 19:00	t	f	t	t	\N
35118	208	12	19:00 ÀS 01:00	t	f	t	t	\N
28157	139	20	13:00 ÀS 19:00	t	f	t	t	\N
28158	139	20	19:00 ÀS 01:00	t	f	t	t	\N
28171	83	7	19:00 ÀS 01:00	t	f	f	t	\N
28166	83	15	13:00 ÀS 19:00	t	f	f	t	\N
28167	83	15	19:00 ÀS 01:00	t	f	f	t	\N
28168	83	5	07:00 ÀS 13:00	t	f	f	t	\N
28169	83	5	13:00 ÀS 19:00	t	f	f	t	\N
24226	229	3	13:00 ÀS 19:00	t	f	f	t	\N
24227	229	3	19:00 ÀS 01:00	t	f	f	t	\N
24228	229	3	01:00 ÀS 07:00	t	f	f	t	\N
24229	229	6	13:00 ÀS 19:00	t	f	f	t	\N
24230	229	6	19:00 ÀS 01:00	t	f	f	t	\N
24231	229	6	01:00 ÀS 07:00	t	f	f	t	\N
29377	237	15	19:00 ÀS 01:00	t	f	f	t	\N
29378	237	15	01:00 ÀS 07:00	t	f	f	t	\N
27967	223	4	07:00 ÀS 13:00	t	f	t	t	\N
27968	223	4	13:00 ÀS 19:00	t	f	t	t	\N
35119	208	1	07:00 ÀS 13:00	t	f	t	t	\N
35120	208	1	13:00 ÀS 19:00	t	f	t	t	\N
35121	208	1	19:00 ÀS 01:00	t	f	t	t	\N
35122	208	4	07:00 ÀS 13:00	t	f	t	t	\N
35123	208	4	13:00 ÀS 19:00	t	f	t	t	\N
35124	208	4	19:00 ÀS 01:00	t	f	t	t	\N
35125	208	5	07:00 ÀS 13:00	t	f	t	t	\N
35126	208	5	13:00 ÀS 19:00	t	f	t	t	\N
35127	208	5	19:00 ÀS 01:00	t	f	t	t	\N
35128	208	8	07:00 ÀS 13:00	t	f	t	t	\N
35129	208	8	13:00 ÀS 19:00	t	f	t	t	\N
35130	208	8	19:00 ÀS 01:00	t	f	t	t	\N
35131	208	9	07:00 ÀS 13:00	t	f	t	t	\N
35132	208	9	13:00 ÀS 19:00	t	f	t	t	\N
35133	208	9	19:00 ÀS 01:00	t	f	t	t	\N
27969	223	4	19:00 ÀS 01:00	t	f	t	t	\N
27970	223	4	01:00 ÀS 07:00	t	f	t	t	\N
27971	223	6	07:00 ÀS 13:00	t	f	t	t	\N
27972	223	6	13:00 ÀS 19:00	t	f	t	t	\N
27973	223	6	19:00 ÀS 01:00	t	f	t	t	\N
27974	223	6	01:00 ÀS 07:00	t	f	t	t	\N
27975	223	7	07:00 ÀS 13:00	t	f	t	t	\N
27976	223	7	13:00 ÀS 19:00	t	f	t	t	\N
27977	223	7	19:00 ÀS 01:00	t	f	t	t	\N
27978	223	7	01:00 ÀS 07:00	t	f	t	t	\N
27979	223	8	07:00 ÀS 13:00	t	f	t	t	\N
27980	223	8	13:00 ÀS 19:00	t	f	t	t	\N
27981	223	8	19:00 ÀS 01:00	t	f	t	t	\N
27982	223	8	01:00 ÀS 07:00	t	f	t	t	\N
27983	223	9	07:00 ÀS 13:00	t	f	t	t	\N
27984	223	9	13:00 ÀS 19:00	t	f	t	t	\N
27985	223	9	19:00 ÀS 01:00	t	f	t	t	\N
27986	223	9	01:00 ÀS 07:00	t	f	t	t	\N
28021	224	26	19:00 ÀS 01:00	t	f	t	t	\N
28023	224	27	07:00 ÀS 13:00	t	f	t	t	\N
28024	224	27	13:00 ÀS 19:00	t	f	t	t	\N
28025	224	27	19:00 ÀS 01:00	t	f	t	t	\N
22475	181	15	07:00 ÀS 13:00	t	f	f	f	DESIST 15/05 Req. nº  23566/2026-1 CIA
22476	181	15	13:00 ÀS 19:00	t	f	f	f	DESIST 15/05 Req. nº  23566/2026-1 CIA
28241	143	16	07:00 ÀS 13:00	t	f	t	f	\N
28242	143	16	13:00 ÀS 19:00	t	f	t	f	\N
28243	143	16	19:00 ÀS 01:00	t	f	t	f	\N
28244	143	16	01:00 ÀS 07:00	t	f	t	f	\N
22089	121	11	13:00 ÀS 19:00	t	f	t	f	DESISTENCIA 11,13/05 -Req. nº  24360/2026-PAA
22091	121	11	01:00 ÀS 07:00	t	f	t	f	DESISTENCIA 11,13/05 -Req. nº  24360/2026-PAA
22098	121	13	19:00 ÀS 01:00	t	f	t	f	DESISTENCIA 11,13/05 -Req. nº  24360/2026-PAA
22109	121	5	13:00 ÀS 19:00	t	f	t	f	DESIST - 05/05 Req. nº  23324/2026-PAA
22110	121	5	19:00 ÀS 01:00	t	f	t	f	DESIST - 05/05 Req. nº  23324/2026-PAA
28026	224	27	01:00 ÀS 07:00	t	f	t	t	\N
28027	224	28	07:00 ÀS 13:00	t	f	t	t	\N
28028	224	28	13:00 ÀS 19:00	t	f	t	t	\N
28173	140	23	19:00 ÀS 01:00	t	f	f	t	\N
22104	121	4	07:00 ÀS 13:00	t	f	t	t	\N
22105	121	4	13:00 ÀS 19:00	t	f	t	t	\N
22106	121	4	19:00 ÀS 01:00	t	f	t	t	\N
22107	121	4	01:00 ÀS 07:00	t	f	t	t	\N
22112	121	7	07:00 ÀS 13:00	t	f	t	t	\N
22113	121	7	13:00 ÀS 19:00	t	f	t	t	\N
22114	121	7	19:00 ÀS 01:00	t	f	t	t	\N
21454	136	21	07:00 ÀS 13:00	t	f	t	t	\N
28174	140	29	07:00 ÀS 13:00	t	f	f	t	\N
28176	89	11	13:00 ÀS 19:00	t	f	t	t	\N
28177	89	11	19:00 ÀS 01:00	t	f	t	t	\N
28178	89	11	01:00 ÀS 07:00	t	f	t	t	\N
28172	140	23	13:00 ÀS 19:00	t	f	f	t	\N
28175	140	29	13:00 ÀS 19:00	t	f	f	t	\N
28187	89	5	07:00 ÀS 13:00	t	f	t	t	\N
28188	89	5	13:00 ÀS 19:00	t	f	t	t	\N
28189	89	5	19:00 ÀS 01:00	t	f	t	t	\N
28238	84	15	01:00 ÀS 07:00	t	f	t	t	\N
28239	84	7	19:00 ÀS 01:00	t	f	t	t	\N
28240	84	7	01:00 ÀS 07:00	t	f	t	t	\N
28197	141	16	13:00 ÀS 19:00	t	f	t	t	\N
28198	141	16	19:00 ÀS 01:00	t	f	t	t	\N
28199	141	16	01:00 ÀS 07:00	t	f	t	t	\N
28179	89	12	07:00 ÀS 13:00	t	f	t	t	\N
28180	89	12	13:00 ÀS 19:00	t	f	t	t	\N
28181	89	12	19:00 ÀS 01:00	t	f	t	t	\N
28182	89	12	01:00 ÀS 07:00	t	f	t	t	\N
28183	89	13	07:00 ÀS 13:00	t	f	t	t	\N
28184	89	13	13:00 ÀS 19:00	t	f	t	t	\N
28185	89	13	19:00 ÀS 01:00	t	f	t	t	\N
28186	89	13	01:00 ÀS 07:00	t	f	t	t	\N
28245	143	30	13:00 ÀS 19:00	t	f	t	t	\N
28246	143	30	19:00 ÀS 01:00	t	f	t	t	\N
28247	143	30	01:00 ÀS 07:00	t	f	t	t	\N
28200	141	17	07:00 ÀS 13:00	t	f	t	t	\N
28201	141	17	13:00 ÀS 19:00	t	f	t	t	\N
28202	141	17	19:00 ÀS 01:00	t	f	t	t	\N
28203	141	17	01:00 ÀS 07:00	t	f	t	t	\N
28204	141	19	13:00 ÀS 19:00	t	f	t	t	\N
28205	141	19	19:00 ÀS 01:00	t	f	t	t	\N
28206	141	19	01:00 ÀS 07:00	t	f	t	t	\N
28207	141	20	07:00 ÀS 13:00	t	f	t	t	\N
28208	141	20	13:00 ÀS 19:00	t	f	t	t	\N
28209	141	20	19:00 ÀS 01:00	t	f	t	t	\N
28210	141	20	01:00 ÀS 07:00	t	f	t	t	\N
28211	141	21	07:00 ÀS 13:00	t	f	t	t	\N
28212	141	21	13:00 ÀS 19:00	t	f	t	t	\N
28213	141	21	19:00 ÀS 01:00	t	f	t	t	\N
28214	141	21	01:00 ÀS 07:00	t	f	t	t	\N
28215	141	24	13:00 ÀS 19:00	t	f	t	t	\N
28216	141	24	19:00 ÀS 01:00	t	f	t	t	\N
28237	84	15	19:00 ÀS 01:00	t	f	t	t	\N
22115	121	7	01:00 ÀS 07:00	t	f	t	t	\N
22116	121	8	07:00 ÀS 13:00	t	f	t	t	\N
22117	121	8	13:00 ÀS 19:00	t	f	t	t	\N
22118	121	8	19:00 ÀS 01:00	t	f	t	t	\N
35212	192	11	07:00 ÀS 13:00	t	f	t	t	\N
35213	192	11	13:00 ÀS 19:00	t	f	t	t	\N
35214	192	11	19:00 ÀS 01:00	t	f	t	t	\N
35215	192	12	07:00 ÀS 13:00	t	f	t	t	\N
35216	192	12	13:00 ÀS 19:00	t	f	t	t	\N
35217	192	12	19:00 ÀS 01:00	t	f	t	t	\N
35218	192	15	07:00 ÀS 13:00	t	f	t	t	\N
35219	192	15	13:00 ÀS 19:00	t	f	t	t	\N
35220	192	15	19:00 ÀS 01:00	t	f	t	t	\N
35221	192	1	07:00 ÀS 13:00	t	f	t	t	\N
35222	192	1	13:00 ÀS 19:00	t	f	t	t	\N
35223	192	1	19:00 ÀS 01:00	t	f	t	t	\N
35224	192	4	07:00 ÀS 13:00	t	f	t	t	\N
35225	192	4	13:00 ÀS 19:00	t	f	t	t	\N
35226	192	4	19:00 ÀS 01:00	t	f	t	t	\N
35227	192	5	07:00 ÀS 13:00	t	f	t	t	\N
35228	192	5	13:00 ÀS 19:00	t	f	t	t	\N
35229	192	5	19:00 ÀS 01:00	t	f	t	t	\N
35230	192	8	07:00 ÀS 13:00	t	f	t	t	\N
35231	192	8	13:00 ÀS 19:00	t	f	t	t	\N
35232	192	8	19:00 ÀS 01:00	t	f	t	t	\N
35233	192	9	07:00 ÀS 13:00	t	f	t	t	\N
35234	192	9	13:00 ÀS 19:00	t	f	t	t	\N
35235	192	9	19:00 ÀS 01:00	t	f	t	t	\N
35236	209	10	13:00 ÀS 19:00	t	f	t	t	\N
35237	209	13	13:00 ÀS 19:00	t	f	t	t	\N
35238	209	13	19:00 ÀS 01:00	t	f	t	t	\N
35239	209	14	13:00 ÀS 19:00	t	f	t	t	\N
35240	209	14	19:00 ÀS 01:00	t	f	t	t	\N
35241	209	15	01:00 ÀS 07:00	t	f	t	t	\N
35242	209	5	13:00 ÀS 19:00	t	f	t	t	\N
35243	209	5	19:00 ÀS 01:00	t	f	t	t	\N
35244	209	6	13:00 ÀS 19:00	t	f	t	t	\N
35245	209	7	13:00 ÀS 19:00	t	f	t	t	\N
35246	209	9	13:00 ÀS 19:00	t	f	t	t	\N
35247	209	9	01:00 ÀS 07:00	t	f	t	t	\N
35248	209	1	01:00 ÀS 07:00	t	f	t	t	\N
35249	209	2	01:00 ÀS 07:00	t	f	t	t	\N
28427	171	26	19:00 ÀS 01:00	t	f	f	t	\N
28428	171	27	07:00 ÀS 13:00	t	f	f	t	\N
28429	171	27	13:00 ÀS 19:00	t	f	f	t	\N
28424	171	24	13:00 ÀS 19:00	t	f	f	t	\N
28425	171	24	19:00 ÀS 01:00	t	f	f	t	\N
28426	171	26	13:00 ÀS 19:00	t	f	f	t	\N
35250	203	10	07:00 ÀS 13:00	t	f	t	t	\N
35251	203	10	13:00 ÀS 19:00	t	f	t	t	\N
35252	203	10	19:00 ÀS 01:00	t	f	t	t	\N
35253	203	10	01:00 ÀS 07:00	t	f	t	t	\N
35254	203	12	07:00 ÀS 13:00	t	f	t	t	\N
35255	203	12	13:00 ÀS 19:00	t	f	t	t	\N
35256	203	12	19:00 ÀS 01:00	t	f	t	t	\N
35257	203	12	01:00 ÀS 07:00	t	f	t	t	\N
35258	203	13	07:00 ÀS 13:00	t	f	t	t	\N
35259	203	13	13:00 ÀS 19:00	t	f	t	t	\N
35260	203	13	19:00 ÀS 01:00	t	f	t	t	\N
35261	203	13	01:00 ÀS 07:00	t	f	t	t	\N
35262	203	14	07:00 ÀS 13:00	t	f	t	t	\N
35263	203	14	13:00 ÀS 19:00	t	f	t	t	\N
35264	203	14	19:00 ÀS 01:00	t	f	t	t	\N
35265	203	14	01:00 ÀS 07:00	t	f	t	t	\N
35266	203	1	07:00 ÀS 13:00	t	f	t	t	\N
35267	203	1	13:00 ÀS 19:00	t	f	t	t	\N
35268	203	1	19:00 ÀS 01:00	t	f	t	t	\N
35269	203	1	01:00 ÀS 07:00	t	f	t	t	\N
35270	203	2	07:00 ÀS 13:00	t	f	t	t	\N
35271	203	2	13:00 ÀS 19:00	t	f	t	t	\N
35272	203	2	19:00 ÀS 01:00	t	f	t	t	\N
35273	203	2	01:00 ÀS 07:00	t	f	t	t	\N
35274	203	4	07:00 ÀS 13:00	t	f	t	t	\N
35275	203	4	13:00 ÀS 19:00	t	f	t	t	\N
35276	203	4	19:00 ÀS 01:00	t	f	t	t	\N
35277	203	4	01:00 ÀS 07:00	t	f	t	t	\N
35278	203	5	07:00 ÀS 13:00	t	f	t	t	\N
28039	224	31	07:00 ÀS 13:00	t	f	t	t	\N
28040	224	31	13:00 ÀS 19:00	t	f	t	t	\N
28041	224	31	19:00 ÀS 01:00	t	f	t	t	\N
28042	224	31	01:00 ÀS 07:00	t	f	t	t	\N
21249	73	10	07:00 ÀS 13:00	t	f	t	t	\N
21250	73	12	13:00 ÀS 19:00	t	f	t	t	\N
21251	73	12	19:00 ÀS 01:00	t	f	t	t	\N
21252	73	13	07:00 ÀS 13:00	t	f	t	t	\N
35279	203	5	13:00 ÀS 19:00	t	f	t	t	\N
35280	203	5	19:00 ÀS 01:00	t	f	t	t	\N
35281	203	5	01:00 ÀS 07:00	t	f	t	t	\N
35282	203	6	07:00 ÀS 13:00	t	f	t	t	\N
35283	203	6	13:00 ÀS 19:00	t	f	t	t	\N
35284	203	6	19:00 ÀS 01:00	t	f	t	t	\N
35285	203	6	01:00 ÀS 07:00	t	f	t	t	\N
35286	203	8	07:00 ÀS 13:00	t	f	t	t	\N
35287	203	8	13:00 ÀS 19:00	t	f	t	t	\N
35288	203	8	19:00 ÀS 01:00	t	f	t	t	\N
35289	203	8	01:00 ÀS 07:00	t	f	t	t	\N
35290	203	9	07:00 ÀS 13:00	t	f	t	t	\N
35291	203	9	13:00 ÀS 19:00	t	f	t	t	\N
35292	203	9	19:00 ÀS 01:00	t	f	t	t	\N
35293	203	9	01:00 ÀS 07:00	t	f	t	t	\N
21253	73	13	13:00 ÀS 19:00	t	f	t	t	\N
21254	73	13	19:00 ÀS 01:00	t	f	t	t	\N
21255	73	14	07:00 ÀS 13:00	t	f	t	t	\N
21256	73	14	13:00 ÀS 19:00	t	f	t	t	\N
21257	73	1	07:00 ÀS 13:00	t	f	t	t	\N
21258	73	1	13:00 ÀS 19:00	t	f	t	t	\N
21259	73	1	19:00 ÀS 01:00	t	f	t	t	\N
21260	73	2	07:00 ÀS 13:00	t	f	t	t	\N
21261	73	2	13:00 ÀS 19:00	t	f	t	t	\N
21262	73	2	19:00 ÀS 01:00	t	f	t	t	\N
21263	73	5	07:00 ÀS 13:00	t	f	t	t	\N
21264	73	5	13:00 ÀS 19:00	t	f	t	t	\N
21265	73	5	19:00 ÀS 01:00	t	f	t	t	\N
21266	73	6	07:00 ÀS 13:00	t	f	t	t	\N
21267	73	6	13:00 ÀS 19:00	t	f	t	t	\N
21268	73	9	07:00 ÀS 13:00	t	f	t	t	\N
21269	73	9	13:00 ÀS 19:00	t	f	t	t	\N
21270	73	9	19:00 ÀS 01:00	t	f	t	t	\N
21271	73	4	13:00 ÀS 19:00	t	f	t	t	\N
21272	73	4	19:00 ÀS 01:00	t	f	t	t	\N
21273	73	8	13:00 ÀS 19:00	t	f	t	t	\N
21274	73	8	19:00 ÀS 01:00	t	f	t	t	\N
21289	150	25	19:00 ÀS 01:00	t	f	t	t	\N
21290	150	26	07:00 ÀS 13:00	t	f	t	t	\N
21291	150	26	13:00 ÀS 19:00	t	f	t	t	\N
21292	150	28	13:00 ÀS 19:00	t	f	t	t	\N
21293	150	28	19:00 ÀS 01:00	t	f	t	t	\N
21294	150	29	07:00 ÀS 13:00	t	f	t	t	\N
21295	150	29	13:00 ÀS 19:00	t	f	t	t	\N
21296	150	29	19:00 ÀS 01:00	t	f	t	t	\N
21297	150	30	07:00 ÀS 13:00	t	f	t	t	\N
21298	150	30	13:00 ÀS 19:00	t	f	t	t	\N
28060	97	3	07:00 ÀS 13:00	t	f	t	t	\N
28061	97	3	13:00 ÀS 19:00	t	f	t	t	\N
28062	97	3	19:00 ÀS 01:00	t	f	t	t	\N
28063	97	6	07:00 ÀS 13:00	t	f	t	t	\N
28065	97	6	19:00 ÀS 01:00	t	f	t	t	\N
28066	97	6	01:00 ÀS 07:00	t	f	t	t	\N
28067	97	7	07:00 ÀS 13:00	t	f	t	t	\N
28068	97	7	13:00 ÀS 19:00	t	f	t	t	\N
28069	97	7	19:00 ÀS 01:00	t	f	t	t	\N
28070	97	1	13:00 ÀS 19:00	t	f	t	t	\N
21589	145	27	07:00 ÀS 13:00	t	f	f	t	\N
21585	144	3	01:00 ÀS 07:00	t	f	f	t	\N
21587	145	22	19:00 ÀS 01:00	t	f	f	t	\N
21588	145	22	01:00 ÀS 07:00	t	f	f	t	\N
21596	145	31	01:00 ÀS 07:00	t	f	f	t	\N
21590	145	27	13:00 ÀS 19:00	t	f	f	t	\N
21591	145	27	19:00 ÀS 01:00	t	f	f	t	\N
21592	145	27	01:00 ÀS 07:00	t	f	f	t	\N
28318	148	20	07:00 ÀS 13:00	t	f	t	t	\N
21586	145	22	13:00 ÀS 19:00	t	f	f	t	\N
28311	100	12	13:00 ÀS 19:00	t	f	t	t	\N
28312	100	12	19:00 ÀS 01:00	t	f	t	t	\N
28313	100	12	01:00 ÀS 07:00	t	f	t	t	\N
28310	100	12	07:00 ÀS 13:00	t	f	t	t	\N
28315	148	17	13:00 ÀS 19:00	t	f	t	t	\N
37900	259	5	07:00 ÀS 13:00	t	f	t	t	\N
37901	259	5	13:00 ÀS 19:00	t	f	t	t	\N
37902	259	5	19:00 ÀS 01:00	t	f	t	t	\N
37903	259	5	01:00 ÀS 07:00	t	f	t	t	\N
37904	259	6	07:00 ÀS 13:00	t	f	t	t	\N
28316	148	17	19:00 ÀS 01:00	t	f	t	t	\N
28317	148	17	01:00 ÀS 07:00	t	f	t	t	\N
37905	259	6	13:00 ÀS 19:00	t	f	t	t	\N
37906	259	6	19:00 ÀS 01:00	t	f	t	t	\N
37907	259	6	01:00 ÀS 07:00	t	f	t	t	\N
37908	259	9	07:00 ÀS 13:00	t	f	t	t	\N
37909	259	9	13:00 ÀS 19:00	t	f	t	t	\N
37910	259	9	19:00 ÀS 01:00	t	f	t	t	\N
37911	259	9	01:00 ÀS 07:00	t	f	t	t	\N
37912	260	10	13:00 ÀS 19:00	t	f	f	t	\N
37913	260	10	19:00 ÀS 01:00	t	f	f	t	\N
37914	260	10	01:00 ÀS 07:00	t	f	f	t	\N
37915	260	12	01:00 ÀS 07:00	t	f	f	t	\N
37916	260	14	01:00 ÀS 07:00	t	f	f	t	\N
37917	260	15	19:00 ÀS 01:00	t	f	f	t	\N
37918	260	15	01:00 ÀS 07:00	t	f	f	t	\N
37919	260	4	13:00 ÀS 19:00	t	f	f	t	\N
37920	260	4	19:00 ÀS 01:00	t	f	f	t	\N
37921	260	4	01:00 ÀS 07:00	t	f	f	t	\N
37922	260	2	01:00 ÀS 07:00	t	f	f	t	\N
37923	260	8	01:00 ÀS 07:00	t	f	f	t	\N
37924	261	11	07:00 ÀS 13:00	t	f	t	t	\N
37925	261	11	13:00 ÀS 19:00	t	f	t	t	\N
37926	261	11	19:00 ÀS 01:00	t	f	t	t	\N
37927	261	15	07:00 ÀS 13:00	t	f	t	t	\N
37928	261	15	13:00 ÀS 19:00	t	f	t	t	\N
37929	261	15	19:00 ÀS 01:00	t	f	t	t	\N
37930	261	3	07:00 ÀS 13:00	t	f	t	t	\N
37931	261	3	13:00 ÀS 19:00	t	f	t	t	\N
37932	261	3	19:00 ÀS 01:00	t	f	t	t	\N
37933	261	4	07:00 ÀS 13:00	t	f	t	t	\N
37934	261	4	13:00 ÀS 19:00	t	f	t	t	\N
37935	261	8	07:00 ÀS 13:00	t	f	t	t	\N
37936	261	8	13:00 ÀS 19:00	t	f	t	t	\N
37937	262	11	07:00 ÀS 13:00	t	f	f	t	\N
37938	262	11	13:00 ÀS 19:00	t	f	f	t	\N
37939	262	11	19:00 ÀS 01:00	t	f	f	t	\N
37940	262	12	07:00 ÀS 13:00	t	f	f	t	\N
37941	262	12	13:00 ÀS 19:00	t	f	f	t	\N
37942	262	12	19:00 ÀS 01:00	t	f	f	t	\N
37943	262	15	07:00 ÀS 13:00	t	f	f	t	\N
37944	262	15	13:00 ÀS 19:00	t	f	f	t	\N
37945	262	15	19:00 ÀS 01:00	t	f	f	t	\N
37946	262	3	07:00 ÀS 13:00	t	f	f	t	\N
37947	262	3	13:00 ÀS 19:00	t	f	f	t	\N
37948	262	3	19:00 ÀS 01:00	t	f	f	t	\N
37949	262	4	07:00 ÀS 13:00	t	f	f	t	\N
37950	262	4	13:00 ÀS 19:00	t	f	f	t	\N
37951	262	4	19:00 ÀS 01:00	t	f	f	t	\N
37952	262	8	07:00 ÀS 13:00	t	f	f	t	\N
37953	262	8	13:00 ÀS 19:00	t	f	f	t	\N
37954	262	8	19:00 ÀS 01:00	t	f	f	t	\N
37955	263	11	07:00 ÀS 13:00	t	f	f	t	\N
37956	263	11	13:00 ÀS 19:00	t	f	f	t	\N
37957	263	12	07:00 ÀS 13:00	t	f	f	t	\N
37958	263	12	13:00 ÀS 19:00	t	f	f	t	\N
37959	263	13	07:00 ÀS 13:00	t	f	f	t	\N
37960	263	13	13:00 ÀS 19:00	t	f	f	t	\N
37961	263	15	07:00 ÀS 13:00	t	f	f	t	\N
37962	263	15	13:00 ÀS 19:00	t	f	f	t	\N
37963	263	4	07:00 ÀS 13:00	t	f	f	t	\N
37964	263	4	13:00 ÀS 19:00	t	f	f	t	\N
37965	263	5	07:00 ÀS 13:00	t	f	f	t	\N
37966	263	5	13:00 ÀS 19:00	t	f	f	t	\N
37967	263	7	07:00 ÀS 13:00	t	f	f	t	\N
37968	263	7	13:00 ÀS 19:00	t	f	f	t	\N
37969	263	8	07:00 ÀS 13:00	t	f	f	t	\N
37970	263	8	13:00 ÀS 19:00	t	f	f	t	\N
37971	264	11	07:00 ÀS 13:00	t	f	t	t	\N
37972	264	11	13:00 ÀS 19:00	t	f	t	t	\N
37973	264	11	19:00 ÀS 01:00	t	f	t	t	\N
37974	264	6	13:00 ÀS 19:00	t	f	t	t	\N
37975	264	6	19:00 ÀS 01:00	t	f	t	t	\N
37976	264	5	19:00 ÀS 01:00	t	f	t	t	\N
37977	264	5	01:00 ÀS 07:00	t	f	t	t	\N
37978	265	14	19:00 ÀS 01:00	t	f	f	t	\N
37979	265	8	13:00 ÀS 19:00	t	f	f	t	\N
21858	71	11	19:00 ÀS 01:00	t	f	t	f	DESIST 11/05 - Req. nº  24312/2026-1 CIA
21859	71	11	01:00 ÀS 07:00	t	f	t	f	DESIST 11/05 - Req. nº  24312/2026-1 CIA
28322	148	25	07:00 ÀS 13:00	t	f	t	t	\N
28319	148	20	13:00 ÀS 19:00	t	f	t	t	\N
28320	148	20	19:00 ÀS 01:00	t	f	t	t	\N
28321	148	20	01:00 ÀS 07:00	t	f	t	t	\N
21679	151	2	13:00 ÀS 19:00	t	f	f	t	\N
28325	148	25	01:00 ÀS 07:00	t	f	t	t	\N
28314	148	17	07:00 ÀS 13:00	t	f	t	t	\N
21680	151	2	19:00 ÀS 01:00	t	f	f	t	\N
21681	151	8	07:00 ÀS 13:00	t	f	f	t	\N
21685	151	9	07:00 ÀS 13:00	t	f	f	t	\N
21682	151	8	13:00 ÀS 19:00	t	f	f	t	\N
37980	265	8	19:00 ÀS 01:00	t	f	f	t	\N
37981	266	14	07:00 ÀS 13:00	t	f	t	t	\N
37982	266	14	13:00 ÀS 19:00	t	f	t	t	\N
37983	266	14	19:00 ÀS 01:00	t	f	t	t	\N
37984	266	14	01:00 ÀS 07:00	t	f	t	t	\N
37985	266	9	19:00 ÀS 01:00	t	f	t	t	\N
37986	266	9	01:00 ÀS 07:00	t	f	t	t	\N
37987	267	10	13:00 ÀS 19:00	t	f	t	t	\N
37988	267	10	19:00 ÀS 01:00	t	f	t	t	\N
37989	267	11	13:00 ÀS 19:00	t	f	t	t	\N
37990	267	11	19:00 ÀS 01:00	t	f	t	t	\N
37991	267	12	13:00 ÀS 19:00	t	f	t	t	\N
37992	267	12	19:00 ÀS 01:00	t	f	t	t	\N
37993	267	12	01:00 ÀS 07:00	t	f	t	t	\N
37994	267	13	07:00 ÀS 13:00	t	f	t	t	\N
37995	267	14	07:00 ÀS 13:00	t	f	t	t	\N
37996	267	15	13:00 ÀS 19:00	t	f	t	t	\N
37997	267	15	19:00 ÀS 01:00	t	f	t	t	\N
37998	267	6	07:00 ÀS 13:00	t	f	t	t	\N
37999	267	7	07:00 ÀS 13:00	t	f	t	t	\N
38000	267	1	13:00 ÀS 19:00	t	f	t	t	\N
38001	267	1	19:00 ÀS 01:00	t	f	t	t	\N
38002	267	2	13:00 ÀS 19:00	t	f	t	t	\N
38003	267	2	19:00 ÀS 01:00	t	f	t	t	\N
38004	267	3	13:00 ÀS 19:00	t	f	t	t	\N
38005	267	3	19:00 ÀS 01:00	t	f	t	t	\N
38006	267	4	13:00 ÀS 19:00	t	f	t	t	\N
38007	267	4	19:00 ÀS 01:00	t	f	t	t	\N
38008	267	5	13:00 ÀS 19:00	t	f	t	t	\N
38009	267	5	19:00 ÀS 01:00	t	f	t	t	\N
38010	267	5	01:00 ÀS 07:00	t	f	t	t	\N
38011	267	8	13:00 ÀS 19:00	t	f	t	t	\N
38012	267	8	19:00 ÀS 01:00	t	f	t	t	\N
38013	267	9	13:00 ÀS 19:00	t	f	t	t	\N
38014	267	9	19:00 ÀS 01:00	t	f	t	t	\N
38015	268	10	07:00 ÀS 13:00	t	f	f	t	\N
38016	268	10	13:00 ÀS 19:00	t	f	f	t	\N
38017	268	11	07:00 ÀS 13:00	t	f	f	t	\N
38018	268	11	13:00 ÀS 19:00	t	f	f	t	\N
38019	268	15	07:00 ÀS 13:00	t	f	f	t	\N
38020	268	15	13:00 ÀS 19:00	t	f	f	t	\N
38021	268	2	07:00 ÀS 13:00	t	f	f	t	\N
38022	268	2	13:00 ÀS 19:00	t	f	f	t	\N
38023	268	3	07:00 ÀS 13:00	t	f	f	t	\N
38024	268	3	13:00 ÀS 19:00	t	f	f	t	\N
38025	268	1	13:00 ÀS 19:00	t	f	f	t	\N
38026	268	5	13:00 ÀS 19:00	t	f	f	t	\N
38027	268	9	13:00 ÀS 19:00	t	f	f	t	\N
38028	269	11	13:00 ÀS 19:00	t	f	t	t	\N
38029	269	11	19:00 ÀS 01:00	t	f	t	t	\N
38030	269	11	01:00 ÀS 07:00	t	f	t	t	\N
38031	269	3	13:00 ÀS 19:00	t	f	t	t	\N
38032	269	3	19:00 ÀS 01:00	t	f	t	t	\N
38033	269	3	01:00 ÀS 07:00	t	f	t	t	\N
38034	270	10	07:00 ÀS 13:00	t	f	t	t	\N
38035	270	10	13:00 ÀS 19:00	t	f	t	t	\N
38036	270	10	19:00 ÀS 01:00	t	f	t	t	\N
38037	270	10	01:00 ÀS 07:00	t	f	t	t	\N
38038	270	14	07:00 ÀS 13:00	t	f	t	t	\N
38039	270	14	13:00 ÀS 19:00	t	f	t	t	\N
38040	270	14	19:00 ÀS 01:00	t	f	t	t	\N
38041	270	14	01:00 ÀS 07:00	t	f	t	t	\N
38042	270	5	07:00 ÀS 13:00	t	f	t	t	\N
38043	270	5	13:00 ÀS 19:00	t	f	t	t	\N
38044	270	5	19:00 ÀS 01:00	t	f	t	t	\N
38045	270	5	01:00 ÀS 07:00	t	f	t	t	\N
38046	270	8	07:00 ÀS 13:00	t	f	t	t	\N
38047	270	8	13:00 ÀS 19:00	t	f	t	t	\N
21683	151	8	19:00 ÀS 01:00	t	f	f	t	\N
21684	151	8	01:00 ÀS 07:00	t	f	f	t	\N
21686	151	9	13:00 ÀS 19:00	t	f	f	t	\N
21687	151	9	19:00 ÀS 01:00	t	f	f	t	\N
21689	152	23	13:00 ÀS 19:00	t	f	f	t	\N
21678	151	2	07:00 ÀS 13:00	t	f	f	t	\N
21675	151	15	07:00 ÀS 13:00	t	f	f	t	\N
21690	152	23	19:00 ÀS 01:00	t	f	f	t	\N
21691	152	29	07:00 ÀS 13:00	t	f	f	t	\N
21692	152	29	13:00 ÀS 19:00	t	f	f	t	\N
21693	152	29	19:00 ÀS 01:00	t	f	f	t	\N
21688	152	23	07:00 ÀS 13:00	t	f	f	t	\N
28064	97	6	13:00 ÀS 19:00	t	f	t	t	\N
28071	97	1	19:00 ÀS 01:00	t	f	t	t	\N
28072	97	1	01:00 ÀS 07:00	t	f	t	t	\N
28073	97	5	13:00 ÀS 19:00	t	f	t	t	\N
28074	97	5	19:00 ÀS 01:00	t	f	t	t	\N
28075	97	5	01:00 ÀS 07:00	t	f	t	t	\N
28076	97	9	13:00 ÀS 19:00	t	f	t	t	\N
28077	97	9	19:00 ÀS 01:00	t	f	t	t	\N
28078	97	9	01:00 ÀS 07:00	t	f	t	t	\N
28118	226	31	19:00 ÀS 01:00	t	f	t	t	\N
21439	125	12	19:00 ÀS 01:00	t	f	t	t	\N
21440	125	13	13:00 ÀS 19:00	t	f	t	t	\N
21441	125	13	19:00 ÀS 01:00	t	f	t	t	\N
21442	125	14	13:00 ÀS 19:00	t	f	t	t	\N
21443	125	14	19:00 ÀS 01:00	t	f	t	t	\N
21444	125	4	07:00 ÀS 13:00	t	f	t	t	\N
21445	125	4	13:00 ÀS 19:00	t	f	t	t	\N
21446	125	4	19:00 ÀS 01:00	t	f	t	t	\N
38048	270	8	19:00 ÀS 01:00	t	f	t	t	\N
38049	270	8	01:00 ÀS 07:00	t	f	t	t	\N
38050	270	9	07:00 ÀS 13:00	t	f	t	t	\N
38051	270	9	13:00 ÀS 19:00	t	f	t	t	\N
38052	270	9	19:00 ÀS 01:00	t	f	t	t	\N
38053	270	9	01:00 ÀS 07:00	t	f	t	t	\N
38054	271	12	13:00 ÀS 19:00	t	f	t	t	\N
38055	271	12	19:00 ÀS 01:00	t	f	t	t	\N
38056	271	15	13:00 ÀS 19:00	t	f	t	t	\N
38057	271	15	19:00 ÀS 01:00	t	f	t	t	\N
38058	271	4	13:00 ÀS 19:00	t	f	t	t	\N
38059	271	4	19:00 ÀS 01:00	t	f	t	t	\N
38060	272	10	13:00 ÀS 19:00	t	f	t	t	\N
38061	272	10	19:00 ÀS 01:00	t	f	t	t	\N
38062	272	11	07:00 ÀS 13:00	t	f	t	t	\N
38063	272	11	13:00 ÀS 19:00	t	f	t	t	\N
38064	272	11	19:00 ÀS 01:00	t	f	t	t	\N
38065	272	15	07:00 ÀS 13:00	t	f	t	t	\N
38066	272	15	13:00 ÀS 19:00	t	f	t	t	\N
38067	272	15	19:00 ÀS 01:00	t	f	t	t	\N
38068	272	2	13:00 ÀS 19:00	t	f	t	t	\N
38069	272	2	19:00 ÀS 01:00	t	f	t	t	\N
21447	125	6	13:00 ÀS 19:00	t	f	t	t	\N
21448	125	6	19:00 ÀS 01:00	t	f	t	t	\N
21455	136	21	13:00 ÀS 19:00	t	f	t	t	\N
21456	136	21	19:00 ÀS 01:00	t	f	t	t	\N
21457	136	22	07:00 ÀS 13:00	t	f	t	t	\N
21458	136	22	13:00 ÀS 19:00	t	f	t	t	\N
21459	136	22	19:00 ÀS 01:00	t	f	t	t	\N
21460	136	25	07:00 ÀS 13:00	t	f	t	t	\N
21461	136	25	13:00 ÀS 19:00	t	f	t	t	\N
21462	136	25	19:00 ÀS 01:00	t	f	t	t	\N
21463	136	26	07:00 ÀS 13:00	t	f	t	t	\N
21464	136	26	13:00 ÀS 19:00	t	f	t	t	\N
21465	136	26	19:00 ÀS 01:00	t	f	t	t	\N
21466	136	28	07:00 ÀS 13:00	t	f	t	t	\N
21467	136	28	13:00 ÀS 19:00	t	f	t	t	\N
21468	136	28	19:00 ÀS 01:00	t	f	t	t	\N
21469	136	29	07:00 ÀS 13:00	t	f	t	t	\N
21470	136	29	13:00 ÀS 19:00	t	f	t	t	\N
21471	136	29	19:00 ÀS 01:00	t	f	t	t	\N
28190	89	5	01:00 ÀS 07:00	t	f	t	t	\N
28191	89	4	13:00 ÀS 19:00	t	f	t	t	\N
28192	89	4	19:00 ÀS 01:00	t	f	t	t	\N
28193	89	4	01:00 ÀS 07:00	t	f	t	t	\N
38070	272	8	13:00 ÀS 19:00	t	f	t	t	\N
38071	272	8	19:00 ÀS 01:00	t	f	t	t	\N
38072	273	10	13:00 ÀS 19:00	t	f	t	t	\N
38073	273	10	19:00 ÀS 01:00	t	f	t	t	\N
38074	273	11	07:00 ÀS 13:00	t	f	t	t	\N
38075	273	11	13:00 ÀS 19:00	t	f	t	t	\N
38076	273	11	19:00 ÀS 01:00	t	f	t	t	\N
38077	273	3	07:00 ÀS 13:00	t	f	t	t	\N
38078	273	3	13:00 ÀS 19:00	t	f	t	t	\N
38079	273	3	19:00 ÀS 01:00	t	f	t	t	\N
38080	273	2	13:00 ÀS 19:00	t	f	t	t	\N
38081	273	2	19:00 ÀS 01:00	t	f	t	t	\N
38082	274	10	07:00 ÀS 13:00	t	f	t	t	\N
38083	274	10	13:00 ÀS 19:00	t	f	t	t	\N
38084	274	10	19:00 ÀS 01:00	t	f	t	t	\N
38085	274	11	07:00 ÀS 13:00	t	f	t	t	\N
38086	274	11	13:00 ÀS 19:00	t	f	t	t	\N
38087	274	13	13:00 ÀS 19:00	t	f	t	t	\N
38088	274	13	19:00 ÀS 01:00	t	f	t	t	\N
38089	274	14	07:00 ÀS 13:00	t	f	t	t	\N
38090	274	14	13:00 ÀS 19:00	t	f	t	t	\N
38091	274	14	19:00 ÀS 01:00	t	f	t	t	\N
38092	274	2	07:00 ÀS 13:00	t	f	t	t	\N
38093	274	2	13:00 ÀS 19:00	t	f	t	t	\N
38094	274	2	19:00 ÀS 01:00	t	f	t	t	\N
38095	274	3	07:00 ÀS 13:00	t	f	t	t	\N
38096	274	3	13:00 ÀS 19:00	t	f	t	t	\N
38097	274	6	07:00 ÀS 13:00	t	f	t	t	\N
38098	274	6	13:00 ÀS 19:00	t	f	t	t	\N
38099	274	6	19:00 ÀS 01:00	t	f	t	t	\N
38100	274	7	07:00 ÀS 13:00	t	f	t	t	\N
38101	274	5	13:00 ÀS 19:00	t	f	t	t	\N
38102	274	5	19:00 ÀS 01:00	t	f	t	t	\N
38103	274	1	19:00 ÀS 01:00	t	f	t	t	\N
38104	274	9	19:00 ÀS 01:00	t	f	t	t	\N
38105	275	10	13:00 ÀS 19:00	t	f	t	t	\N
38106	275	10	19:00 ÀS 01:00	t	f	t	t	\N
38107	275	11	13:00 ÀS 19:00	t	f	t	t	\N
38108	275	11	19:00 ÀS 01:00	t	f	t	t	\N
38109	275	12	13:00 ÀS 19:00	t	f	t	t	\N
38110	275	12	19:00 ÀS 01:00	t	f	t	t	\N
38111	275	13	13:00 ÀS 19:00	t	f	t	t	\N
38112	275	13	19:00 ÀS 01:00	t	f	t	t	\N
38113	275	15	13:00 ÀS 19:00	t	f	t	t	\N
38114	275	15	19:00 ÀS 01:00	t	f	t	t	\N
38115	275	1	13:00 ÀS 19:00	t	f	t	t	\N
38116	275	1	19:00 ÀS 01:00	t	f	t	t	\N
38117	275	2	13:00 ÀS 19:00	t	f	t	t	\N
38118	275	2	19:00 ÀS 01:00	t	f	t	t	\N
38119	275	3	13:00 ÀS 19:00	t	f	t	t	\N
38120	275	3	19:00 ÀS 01:00	t	f	t	t	\N
38121	275	4	13:00 ÀS 19:00	t	f	t	t	\N
38122	275	4	19:00 ÀS 01:00	t	f	t	t	\N
38123	275	5	13:00 ÀS 19:00	t	f	t	t	\N
38124	275	5	19:00 ÀS 01:00	t	f	t	t	\N
38125	275	8	13:00 ÀS 19:00	t	f	t	t	\N
38126	275	8	19:00 ÀS 01:00	t	f	t	t	\N
38127	275	9	13:00 ÀS 19:00	t	f	t	t	\N
38128	275	9	19:00 ÀS 01:00	t	f	t	t	\N
38129	276	10	07:00 ÀS 13:00	t	f	t	t	\N
38130	276	10	13:00 ÀS 19:00	t	f	t	t	\N
38131	276	10	19:00 ÀS 01:00	t	f	t	t	\N
38132	276	14	07:00 ÀS 13:00	t	f	t	t	\N
38133	276	14	13:00 ÀS 19:00	t	f	t	t	\N
38134	276	14	19:00 ÀS 01:00	t	f	t	t	\N
38135	276	1	07:00 ÀS 13:00	t	f	t	t	\N
38136	276	1	13:00 ÀS 19:00	t	f	t	t	\N
38137	276	1	19:00 ÀS 01:00	t	f	t	t	\N
38138	276	2	07:00 ÀS 13:00	t	f	t	t	\N
38139	276	2	13:00 ÀS 19:00	t	f	t	t	\N
38140	276	2	19:00 ÀS 01:00	t	f	t	t	\N
38141	276	5	07:00 ÀS 13:00	t	f	t	t	\N
38142	276	5	13:00 ÀS 19:00	t	f	t	t	\N
38143	276	5	19:00 ÀS 01:00	t	f	t	t	\N
38144	276	8	07:00 ÀS 13:00	t	f	t	t	\N
38145	276	8	13:00 ÀS 19:00	t	f	t	t	\N
38146	276	8	19:00 ÀS 01:00	t	f	t	t	\N
38147	276	9	07:00 ÀS 13:00	t	f	t	t	\N
38148	276	9	13:00 ÀS 19:00	t	f	t	t	\N
38149	276	9	19:00 ÀS 01:00	t	f	t	t	\N
38150	277	10	07:00 ÀS 13:00	t	f	t	t	\N
38151	277	10	13:00 ÀS 19:00	t	f	t	t	\N
38152	277	10	19:00 ÀS 01:00	t	f	t	t	\N
38153	277	10	01:00 ÀS 07:00	t	f	t	t	\N
38154	277	2	07:00 ÀS 13:00	t	f	t	t	\N
38155	277	2	13:00 ÀS 19:00	t	f	t	t	\N
38156	277	2	19:00 ÀS 01:00	t	f	t	t	\N
38157	277	2	01:00 ÀS 07:00	t	f	t	t	\N
38158	278	10	07:00 ÀS 13:00	t	f	t	t	\N
38159	278	10	13:00 ÀS 19:00	t	f	t	t	\N
38160	278	10	19:00 ÀS 01:00	t	f	t	t	\N
38161	278	11	07:00 ÀS 13:00	t	f	t	t	\N
38162	278	11	13:00 ÀS 19:00	t	f	t	t	\N
38163	278	11	19:00 ÀS 01:00	t	f	t	t	\N
38164	278	13	13:00 ÀS 19:00	t	f	t	t	\N
38165	278	13	19:00 ÀS 01:00	t	f	t	t	\N
38166	278	14	07:00 ÀS 13:00	t	f	t	t	\N
38167	278	14	13:00 ÀS 19:00	t	f	t	t	\N
38168	278	14	19:00 ÀS 01:00	t	f	t	t	\N
38169	278	1	07:00 ÀS 13:00	t	f	t	t	\N
38170	278	1	13:00 ÀS 19:00	t	f	t	t	\N
38171	278	1	19:00 ÀS 01:00	t	f	t	t	\N
38172	278	2	07:00 ÀS 13:00	t	f	t	t	\N
38173	278	2	13:00 ÀS 19:00	t	f	t	t	\N
38174	278	2	19:00 ÀS 01:00	t	f	t	t	\N
38175	278	3	07:00 ÀS 13:00	t	f	t	t	\N
38176	278	3	13:00 ÀS 19:00	t	f	t	t	\N
38177	278	3	19:00 ÀS 01:00	t	f	t	t	\N
38178	278	6	07:00 ÀS 13:00	t	f	t	t	\N
38179	278	6	13:00 ÀS 19:00	t	f	t	t	\N
38180	278	6	19:00 ÀS 01:00	t	f	t	t	\N
38181	278	5	13:00 ÀS 19:00	t	f	t	t	\N
38182	278	5	19:00 ÀS 01:00	t	f	t	t	\N
38183	278	9	13:00 ÀS 19:00	t	f	t	t	\N
38184	278	9	19:00 ÀS 01:00	t	f	t	t	\N
38185	279	12	07:00 ÀS 13:00	t	f	t	t	\N
38186	279	12	13:00 ÀS 19:00	t	f	t	t	\N
38187	279	12	19:00 ÀS 01:00	t	f	t	t	\N
38188	279	13	07:00 ÀS 13:00	t	f	t	t	\N
38189	279	13	13:00 ÀS 19:00	t	f	t	t	\N
38190	279	13	19:00 ÀS 01:00	t	f	t	t	\N
38191	279	15	07:00 ÀS 13:00	t	f	t	t	\N
38192	279	15	13:00 ÀS 19:00	t	f	t	t	\N
38193	279	15	19:00 ÀS 01:00	t	f	t	t	\N
38194	279	1	07:00 ÀS 13:00	t	f	t	t	\N
38195	279	1	13:00 ÀS 19:00	t	f	t	t	\N
38196	279	1	19:00 ÀS 01:00	t	f	t	t	\N
38197	279	3	07:00 ÀS 13:00	t	f	t	t	\N
38198	279	3	13:00 ÀS 19:00	t	f	t	t	\N
38199	279	3	19:00 ÀS 01:00	t	f	t	t	\N
38200	279	5	07:00 ÀS 13:00	t	f	t	t	\N
38201	279	5	13:00 ÀS 19:00	t	f	t	t	\N
38202	279	5	19:00 ÀS 01:00	t	f	t	t	\N
38203	279	8	07:00 ÀS 13:00	t	f	t	t	\N
38204	279	8	13:00 ÀS 19:00	t	f	t	t	\N
38205	279	8	19:00 ÀS 01:00	t	f	t	t	\N
38206	279	9	07:00 ÀS 13:00	t	f	t	t	\N
38207	279	9	13:00 ÀS 19:00	t	f	t	t	\N
38208	279	9	19:00 ÀS 01:00	t	f	t	t	\N
38209	280	10	13:00 ÀS 19:00	t	f	t	t	\N
38210	280	11	13:00 ÀS 19:00	t	f	t	t	\N
38211	280	12	13:00 ÀS 19:00	t	f	t	t	\N
38212	280	15	13:00 ÀS 19:00	t	f	t	t	\N
38213	280	1	13:00 ÀS 19:00	t	f	t	t	\N
38214	280	2	13:00 ÀS 19:00	t	f	t	t	\N
38215	280	3	13:00 ÀS 19:00	t	f	t	t	\N
38216	280	5	13:00 ÀS 19:00	t	f	t	t	\N
38217	280	8	13:00 ÀS 19:00	t	f	t	t	\N
38218	280	9	13:00 ÀS 19:00	t	f	t	t	\N
38219	280	6	19:00 ÀS 01:00	t	f	t	t	\N
38220	280	6	01:00 ÀS 07:00	t	f	t	t	\N
38221	280	7	19:00 ÀS 01:00	t	f	t	t	\N
38222	280	7	01:00 ÀS 07:00	t	f	t	t	\N
38223	281	12	07:00 ÀS 13:00	t	f	f	t	\N
38224	281	12	13:00 ÀS 19:00	t	f	f	t	\N
38225	281	12	19:00 ÀS 01:00	t	f	f	t	\N
38226	281	12	01:00 ÀS 07:00	t	f	f	t	\N
38227	281	4	07:00 ÀS 13:00	t	f	f	t	\N
38228	281	4	13:00 ÀS 19:00	t	f	f	t	\N
38229	281	8	07:00 ÀS 13:00	t	f	f	t	\N
38230	281	8	13:00 ÀS 19:00	t	f	f	t	\N
38231	281	8	19:00 ÀS 01:00	t	f	f	t	\N
38232	281	9	07:00 ÀS 13:00	t	f	f	t	\N
38233	281	9	13:00 ÀS 19:00	t	f	f	t	\N
38234	282	11	07:00 ÀS 13:00	t	f	t	t	\N
38235	282	11	13:00 ÀS 19:00	t	f	t	t	\N
38236	282	11	19:00 ÀS 01:00	t	f	t	t	\N
38237	282	11	01:00 ÀS 07:00	t	f	t	t	\N
38238	282	12	07:00 ÀS 13:00	t	f	t	t	\N
38239	282	12	13:00 ÀS 19:00	t	f	t	t	\N
38240	282	12	19:00 ÀS 01:00	t	f	t	t	\N
38241	282	12	01:00 ÀS 07:00	t	f	t	t	\N
38242	282	14	07:00 ÀS 13:00	t	f	t	t	\N
38243	282	14	13:00 ÀS 19:00	t	f	t	t	\N
38244	282	14	19:00 ÀS 01:00	t	f	t	t	\N
38245	282	14	01:00 ÀS 07:00	t	f	t	t	\N
38246	282	15	07:00 ÀS 13:00	t	f	t	t	\N
38247	282	15	13:00 ÀS 19:00	t	f	t	t	\N
38248	282	15	19:00 ÀS 01:00	t	f	t	t	\N
38249	282	15	01:00 ÀS 07:00	t	f	t	t	\N
38250	282	3	07:00 ÀS 13:00	t	f	t	t	\N
38251	282	3	13:00 ÀS 19:00	t	f	t	t	\N
38252	282	3	19:00 ÀS 01:00	t	f	t	t	\N
38253	282	3	01:00 ÀS 07:00	t	f	t	t	\N
38254	282	4	07:00 ÀS 13:00	t	f	t	t	\N
38255	282	4	13:00 ÀS 19:00	t	f	t	t	\N
38256	282	4	19:00 ÀS 01:00	t	f	t	t	\N
38257	282	4	01:00 ÀS 07:00	t	f	t	t	\N
38258	283	10	13:00 ÀS 19:00	t	f	f	t	\N
38259	283	11	13:00 ÀS 19:00	t	f	f	t	\N
38260	283	15	13:00 ÀS 19:00	t	f	f	t	\N
38261	283	1	13:00 ÀS 19:00	t	f	f	t	\N
38262	283	2	13:00 ÀS 19:00	t	f	f	t	\N
38263	283	3	13:00 ÀS 19:00	t	f	f	t	\N
38264	283	8	13:00 ÀS 19:00	t	f	f	t	\N
38265	283	9	13:00 ÀS 19:00	t	f	f	t	\N
38266	284	10	07:00 ÀS 13:00	t	f	t	t	\N
38267	284	10	13:00 ÀS 19:00	t	f	t	t	\N
38268	284	10	19:00 ÀS 01:00	t	f	t	t	\N
38269	284	11	07:00 ÀS 13:00	t	f	t	t	\N
38270	284	11	13:00 ÀS 19:00	t	f	t	t	\N
38271	284	11	19:00 ÀS 01:00	t	f	t	t	\N
38272	284	14	07:00 ÀS 13:00	t	f	t	t	\N
38273	284	14	13:00 ÀS 19:00	t	f	t	t	\N
38274	284	14	19:00 ÀS 01:00	t	f	t	t	\N
38275	284	15	07:00 ÀS 13:00	t	f	t	t	\N
38276	284	15	13:00 ÀS 19:00	t	f	t	t	\N
38277	284	15	19:00 ÀS 01:00	t	f	t	t	\N
38278	284	1	07:00 ÀS 13:00	t	f	t	t	\N
38279	284	1	13:00 ÀS 19:00	t	f	t	t	\N
38280	284	1	19:00 ÀS 01:00	t	f	t	t	\N
38281	284	2	07:00 ÀS 13:00	t	f	t	t	\N
38282	284	2	13:00 ÀS 19:00	t	f	t	t	\N
38283	284	2	19:00 ÀS 01:00	t	f	t	t	\N
38284	284	3	07:00 ÀS 13:00	t	f	t	t	\N
38285	284	3	13:00 ÀS 19:00	t	f	t	t	\N
38286	284	3	19:00 ÀS 01:00	t	f	t	t	\N
38287	284	5	07:00 ÀS 13:00	t	f	t	t	\N
38288	284	5	13:00 ÀS 19:00	t	f	t	t	\N
38289	284	5	19:00 ÀS 01:00	t	f	t	t	\N
38290	284	9	07:00 ÀS 13:00	t	f	t	t	\N
38291	284	9	13:00 ÀS 19:00	t	f	t	t	\N
38292	284	9	19:00 ÀS 01:00	t	f	t	t	\N
38293	285	14	19:00 ÀS 01:00	t	f	t	t	\N
38294	285	14	01:00 ÀS 07:00	t	f	t	t	\N
38295	285	3	19:00 ÀS 01:00	t	f	t	t	\N
38296	285	3	01:00 ÀS 07:00	t	f	t	t	\N
38297	286	11	13:00 ÀS 19:00	t	f	t	t	\N
38298	286	11	19:00 ÀS 01:00	t	f	t	t	\N
38299	286	15	13:00 ÀS 19:00	t	f	t	t	\N
38300	286	15	19:00 ÀS 01:00	t	f	t	t	\N
38301	286	4	07:00 ÀS 13:00	t	f	t	t	\N
38302	286	4	13:00 ÀS 19:00	t	f	t	t	\N
38303	286	4	19:00 ÀS 01:00	t	f	t	t	\N
38304	286	8	07:00 ÀS 13:00	t	f	t	t	\N
38305	286	8	13:00 ÀS 19:00	t	f	t	t	\N
38306	286	8	19:00 ÀS 01:00	t	f	t	t	\N
38307	286	3	13:00 ÀS 19:00	t	f	t	t	\N
38308	286	3	19:00 ÀS 01:00	t	f	t	t	\N
38309	287	10	07:00 ÀS 13:00	t	f	t	t	\N
38310	287	10	13:00 ÀS 19:00	t	f	t	t	\N
38311	287	10	19:00 ÀS 01:00	t	f	t	t	\N
38312	287	10	01:00 ÀS 07:00	t	f	t	t	\N
38313	287	12	13:00 ÀS 19:00	t	f	t	t	\N
38314	287	14	07:00 ÀS 13:00	t	f	t	t	\N
38315	287	14	13:00 ÀS 19:00	t	f	t	t	\N
38316	287	14	19:00 ÀS 01:00	t	f	t	t	\N
38317	287	14	01:00 ÀS 07:00	t	f	t	t	\N
38318	287	2	07:00 ÀS 13:00	t	f	t	t	\N
38319	287	2	13:00 ÀS 19:00	t	f	t	t	\N
38320	287	2	19:00 ÀS 01:00	t	f	t	t	\N
38321	287	2	01:00 ÀS 07:00	t	f	t	t	\N
38322	287	5	07:00 ÀS 13:00	t	f	t	t	\N
38323	287	5	13:00 ÀS 19:00	t	f	t	t	\N
38324	287	1	13:00 ÀS 19:00	t	f	t	t	\N
38325	287	1	19:00 ÀS 01:00	t	f	t	t	\N
38326	287	1	01:00 ÀS 07:00	t	f	t	t	\N
38327	287	4	13:00 ÀS 19:00	t	f	t	t	\N
38328	287	4	19:00 ÀS 01:00	t	f	t	t	\N
38329	287	4	01:00 ÀS 07:00	t	f	t	t	\N
38330	287	9	13:00 ÀS 19:00	t	f	t	t	\N
38331	287	9	19:00 ÀS 01:00	t	f	t	t	\N
38332	287	9	01:00 ÀS 07:00	t	f	t	t	\N
38333	288	10	13:00 ÀS 19:00	t	f	f	t	\N
38334	288	10	19:00 ÀS 01:00	t	f	f	t	\N
38335	288	11	13:00 ÀS 19:00	t	f	f	t	\N
38336	288	11	19:00 ÀS 01:00	t	f	f	t	\N
38337	288	13	13:00 ÀS 19:00	t	f	f	t	\N
38338	288	13	19:00 ÀS 01:00	t	f	f	t	\N
38339	288	14	13:00 ÀS 19:00	t	f	f	t	\N
38340	288	14	19:00 ÀS 01:00	t	f	f	t	\N
38341	288	15	13:00 ÀS 19:00	t	f	f	t	\N
38342	288	15	19:00 ÀS 01:00	t	f	f	t	\N
38343	288	1	13:00 ÀS 19:00	t	f	f	t	\N
38344	288	1	19:00 ÀS 01:00	t	f	f	t	\N
38345	288	2	13:00 ÀS 19:00	t	f	f	t	\N
38346	288	2	19:00 ÀS 01:00	t	f	f	t	\N
38347	288	3	13:00 ÀS 19:00	t	f	f	t	\N
38348	288	3	19:00 ÀS 01:00	t	f	f	t	\N
38349	288	5	13:00 ÀS 19:00	t	f	f	t	\N
38350	288	5	19:00 ÀS 01:00	t	f	f	t	\N
38351	288	6	13:00 ÀS 19:00	t	f	f	t	\N
38352	288	6	19:00 ÀS 01:00	t	f	f	t	\N
38353	288	7	13:00 ÀS 19:00	t	f	f	t	\N
38354	288	7	19:00 ÀS 01:00	t	f	f	t	\N
38355	288	9	13:00 ÀS 19:00	t	f	f	t	\N
38356	288	9	19:00 ÀS 01:00	t	f	f	t	\N
38357	289	11	13:00 ÀS 19:00	t	f	t	t	\N
38358	289	11	19:00 ÀS 01:00	t	f	t	t	\N
38359	289	11	01:00 ÀS 07:00	t	f	t	t	\N
38360	289	13	13:00 ÀS 19:00	t	f	t	t	\N
38361	289	13	19:00 ÀS 01:00	t	f	t	t	\N
38362	289	15	13:00 ÀS 19:00	t	f	t	t	\N
38363	289	15	19:00 ÀS 01:00	t	f	t	t	\N
38364	289	15	01:00 ÀS 07:00	t	f	t	t	\N
38365	289	3	13:00 ÀS 19:00	t	f	t	t	\N
38366	289	3	19:00 ÀS 01:00	t	f	t	t	\N
38367	289	3	01:00 ÀS 07:00	t	f	t	t	\N
38368	289	4	13:00 ÀS 19:00	t	f	t	t	\N
38369	289	4	19:00 ÀS 01:00	t	f	t	t	\N
38370	289	4	01:00 ÀS 07:00	t	f	t	t	\N
38371	289	5	13:00 ÀS 19:00	t	f	t	t	\N
38372	289	5	19:00 ÀS 01:00	t	f	t	t	\N
38373	289	5	01:00 ÀS 07:00	t	f	t	t	\N
38374	289	8	13:00 ÀS 19:00	t	f	t	t	\N
38375	289	8	19:00 ÀS 01:00	t	f	t	t	\N
38376	289	8	01:00 ÀS 07:00	t	f	t	t	\N
38377	289	9	13:00 ÀS 19:00	t	f	t	t	\N
38378	289	9	19:00 ÀS 01:00	t	f	t	t	\N
38379	290	12	07:00 ÀS 13:00	t	f	t	t	\N
38380	290	12	13:00 ÀS 19:00	t	f	t	t	\N
38381	290	12	19:00 ÀS 01:00	t	f	t	t	\N
38382	290	1	07:00 ÀS 13:00	t	f	t	t	\N
38383	290	1	13:00 ÀS 19:00	t	f	t	t	\N
38384	290	1	19:00 ÀS 01:00	t	f	t	t	\N
38385	290	4	07:00 ÀS 13:00	t	f	t	t	\N
38386	290	4	13:00 ÀS 19:00	t	f	t	t	\N
38387	290	4	19:00 ÀS 01:00	t	f	t	t	\N
38388	290	5	07:00 ÀS 13:00	t	f	t	t	\N
38389	290	5	13:00 ÀS 19:00	t	f	t	t	\N
38390	290	5	19:00 ÀS 01:00	t	f	t	t	\N
38391	290	8	07:00 ÀS 13:00	t	f	t	t	\N
38392	290	8	13:00 ÀS 19:00	t	f	t	t	\N
38393	290	8	19:00 ÀS 01:00	t	f	t	t	\N
38394	290	9	07:00 ÀS 13:00	t	f	t	t	\N
38395	290	9	13:00 ÀS 19:00	t	f	t	t	\N
38396	290	9	19:00 ÀS 01:00	t	f	t	t	\N
38397	291	14	19:00 ÀS 01:00	t	f	t	t	\N
38398	291	14	01:00 ÀS 07:00	t	f	t	t	\N
38399	291	1	07:00 ÀS 13:00	t	f	t	t	\N
38400	291	1	13:00 ÀS 19:00	t	f	t	t	\N
38401	291	9	07:00 ÀS 13:00	t	f	t	t	\N
38402	291	9	13:00 ÀS 19:00	t	f	t	t	\N
38403	291	6	19:00 ÀS 01:00	t	f	t	t	\N
38404	291	6	01:00 ÀS 07:00	t	f	t	t	\N
38405	292	10	19:00 ÀS 01:00	t	f	t	t	\N
38406	292	10	01:00 ÀS 07:00	t	f	t	t	\N
38407	292	12	13:00 ÀS 19:00	t	f	t	t	\N
38408	292	12	19:00 ÀS 01:00	t	f	t	t	\N
38409	292	12	01:00 ÀS 07:00	t	f	t	t	\N
38410	292	13	13:00 ÀS 19:00	t	f	t	t	\N
38411	292	13	19:00 ÀS 01:00	t	f	t	t	\N
38412	292	13	01:00 ÀS 07:00	t	f	t	t	\N
38413	292	14	13:00 ÀS 19:00	t	f	t	t	\N
38414	292	14	19:00 ÀS 01:00	t	f	t	t	\N
38415	292	14	01:00 ÀS 07:00	t	f	t	t	\N
38416	292	5	13:00 ÀS 19:00	t	f	t	t	\N
38417	292	5	19:00 ÀS 01:00	t	f	t	t	\N
38418	292	5	01:00 ÀS 07:00	t	f	t	t	\N
38419	292	6	13:00 ÀS 19:00	t	f	t	t	\N
38420	292	6	19:00 ÀS 01:00	t	f	t	t	\N
38421	292	6	01:00 ÀS 07:00	t	f	t	t	\N
38422	292	7	13:00 ÀS 19:00	t	f	t	t	\N
38423	292	7	19:00 ÀS 01:00	t	f	t	t	\N
38424	292	7	01:00 ÀS 07:00	t	f	t	t	\N
38425	292	3	19:00 ÀS 01:00	t	f	t	t	\N
38426	292	3	01:00 ÀS 07:00	t	f	t	t	\N
38427	293	11	13:00 ÀS 19:00	t	f	t	t	\N
38428	293	11	19:00 ÀS 01:00	t	f	t	t	\N
38429	293	15	13:00 ÀS 19:00	t	f	t	t	\N
38430	293	15	19:00 ÀS 01:00	t	f	t	t	\N
38431	293	5	07:00 ÀS 13:00	t	f	t	t	\N
38432	293	5	13:00 ÀS 19:00	t	f	t	t	\N
38433	293	9	07:00 ÀS 13:00	t	f	t	t	\N
38434	293	9	13:00 ÀS 19:00	t	f	t	t	\N
38435	293	9	19:00 ÀS 01:00	t	f	t	t	\N
38436	293	3	13:00 ÀS 19:00	t	f	t	t	\N
38437	293	3	19:00 ÀS 01:00	t	f	t	t	\N
38438	293	8	13:00 ÀS 19:00	t	f	t	t	\N
38439	293	8	19:00 ÀS 01:00	t	f	t	t	\N
38440	294	10	07:00 ÀS 13:00	t	f	f	t	\N
38441	294	11	07:00 ÀS 13:00	t	f	f	t	\N
38442	294	13	13:00 ÀS 19:00	t	f	f	t	\N
38443	294	14	07:00 ÀS 13:00	t	f	f	t	\N
38444	294	14	13:00 ÀS 19:00	t	f	f	t	\N
38445	294	15	07:00 ÀS 13:00	t	f	f	t	\N
38446	294	2	07:00 ÀS 13:00	t	f	f	t	\N
38447	294	3	07:00 ÀS 13:00	t	f	f	t	\N
38448	295	10	13:00 ÀS 19:00	t	f	t	t	\N
38449	295	13	13:00 ÀS 19:00	t	f	t	t	\N
38450	295	13	19:00 ÀS 01:00	t	f	t	t	\N
38451	295	14	13:00 ÀS 19:00	t	f	t	t	\N
38452	295	14	19:00 ÀS 01:00	t	f	t	t	\N
38453	295	15	01:00 ÀS 07:00	t	f	t	t	\N
38454	295	5	13:00 ÀS 19:00	t	f	t	t	\N
38455	295	5	19:00 ÀS 01:00	t	f	t	t	\N
38456	295	6	13:00 ÀS 19:00	t	f	t	t	\N
38457	295	7	13:00 ÀS 19:00	t	f	t	t	\N
38458	295	9	13:00 ÀS 19:00	t	f	t	t	\N
38459	295	9	01:00 ÀS 07:00	t	f	t	t	\N
38460	295	1	01:00 ÀS 07:00	t	f	t	t	\N
38461	295	2	01:00 ÀS 07:00	t	f	t	t	\N
38462	296	10	07:00 ÀS 13:00	t	f	t	t	\N
38463	296	10	13:00 ÀS 19:00	t	f	t	t	\N
38464	296	10	19:00 ÀS 01:00	t	f	t	t	\N
38465	296	10	01:00 ÀS 07:00	t	f	t	t	\N
38466	296	12	07:00 ÀS 13:00	t	f	t	t	\N
38467	296	12	13:00 ÀS 19:00	t	f	t	t	\N
38468	296	12	19:00 ÀS 01:00	t	f	t	t	\N
38469	296	12	01:00 ÀS 07:00	t	f	t	t	\N
38470	296	13	07:00 ÀS 13:00	t	f	t	t	\N
38471	296	13	13:00 ÀS 19:00	t	f	t	t	\N
38472	296	13	19:00 ÀS 01:00	t	f	t	t	\N
38473	296	13	01:00 ÀS 07:00	t	f	t	t	\N
38474	296	14	07:00 ÀS 13:00	t	f	t	t	\N
38475	296	14	13:00 ÀS 19:00	t	f	t	t	\N
38476	296	14	19:00 ÀS 01:00	t	f	t	t	\N
38477	296	14	01:00 ÀS 07:00	t	f	t	t	\N
38478	296	1	07:00 ÀS 13:00	t	f	t	t	\N
38479	296	1	13:00 ÀS 19:00	t	f	t	t	\N
38480	296	1	19:00 ÀS 01:00	t	f	t	t	\N
38481	296	1	01:00 ÀS 07:00	t	f	t	t	\N
38482	296	2	07:00 ÀS 13:00	t	f	t	t	\N
38483	296	2	13:00 ÀS 19:00	t	f	t	t	\N
38484	296	2	19:00 ÀS 01:00	t	f	t	t	\N
38485	296	2	01:00 ÀS 07:00	t	f	t	t	\N
38486	296	4	07:00 ÀS 13:00	t	f	t	t	\N
38487	296	4	13:00 ÀS 19:00	t	f	t	t	\N
38488	296	4	19:00 ÀS 01:00	t	f	t	t	\N
38489	296	4	01:00 ÀS 07:00	t	f	t	t	\N
38490	296	5	07:00 ÀS 13:00	t	f	t	t	\N
38491	296	5	13:00 ÀS 19:00	t	f	t	t	\N
38492	296	5	19:00 ÀS 01:00	t	f	t	t	\N
38493	296	5	01:00 ÀS 07:00	t	f	t	t	\N
38494	296	6	07:00 ÀS 13:00	t	f	t	t	\N
38495	296	6	13:00 ÀS 19:00	t	f	t	t	\N
38496	296	6	19:00 ÀS 01:00	t	f	t	t	\N
38497	296	6	01:00 ÀS 07:00	t	f	t	t	\N
38498	296	8	07:00 ÀS 13:00	t	f	t	t	\N
38499	296	8	13:00 ÀS 19:00	t	f	t	t	\N
38500	296	8	19:00 ÀS 01:00	t	f	t	t	\N
38501	296	8	01:00 ÀS 07:00	t	f	t	t	\N
38502	296	9	07:00 ÀS 13:00	t	f	t	t	\N
38503	296	9	13:00 ÀS 19:00	t	f	t	t	\N
38504	296	9	19:00 ÀS 01:00	t	f	t	t	\N
38505	296	9	01:00 ÀS 07:00	t	f	t	t	\N
38506	297	11	07:00 ÀS 13:00	t	f	t	t	\N
38507	297	11	13:00 ÀS 19:00	t	f	t	t	\N
38508	297	11	19:00 ÀS 01:00	t	f	t	t	\N
38509	297	11	01:00 ÀS 07:00	t	f	t	t	\N
38510	297	12	07:00 ÀS 13:00	t	f	t	t	\N
38511	297	12	13:00 ÀS 19:00	t	f	t	t	\N
38512	297	12	19:00 ÀS 01:00	t	f	t	t	\N
38513	297	12	01:00 ÀS 07:00	t	f	t	t	\N
38514	297	13	07:00 ÀS 13:00	t	f	t	t	\N
38515	297	13	13:00 ÀS 19:00	t	f	t	t	\N
38516	297	13	19:00 ÀS 01:00	t	f	t	t	\N
38517	297	13	01:00 ÀS 07:00	t	f	t	t	\N
38518	297	15	07:00 ÀS 13:00	t	f	t	t	\N
38519	297	15	13:00 ÀS 19:00	t	f	t	t	\N
38520	297	15	19:00 ÀS 01:00	t	f	t	t	\N
38521	297	15	01:00 ÀS 07:00	t	f	t	t	\N
38522	297	1	07:00 ÀS 13:00	t	f	t	t	\N
38523	297	1	13:00 ÀS 19:00	t	f	t	t	\N
38524	297	1	19:00 ÀS 01:00	t	f	t	t	\N
38525	297	1	01:00 ÀS 07:00	t	f	t	t	\N
38526	297	3	07:00 ÀS 13:00	t	f	t	t	\N
38527	297	3	13:00 ÀS 19:00	t	f	t	t	\N
38528	297	3	19:00 ÀS 01:00	t	f	t	t	\N
38529	297	3	01:00 ÀS 07:00	t	f	t	t	\N
38530	297	4	07:00 ÀS 13:00	t	f	t	t	\N
38531	297	4	13:00 ÀS 19:00	t	f	t	t	\N
38532	297	4	19:00 ÀS 01:00	t	f	t	t	\N
13874	84	4	19:00 ÀS 01:00	t	f	t	t	\N
38533	297	4	01:00 ÀS 07:00	t	f	t	t	\N
38534	297	5	07:00 ÀS 13:00	t	f	t	t	\N
38535	297	5	13:00 ÀS 19:00	t	f	t	t	\N
38536	297	5	19:00 ÀS 01:00	t	f	t	t	\N
38537	297	5	01:00 ÀS 07:00	t	f	t	t	\N
38538	297	7	07:00 ÀS 13:00	t	f	t	t	\N
38539	297	7	13:00 ÀS 19:00	t	f	t	t	\N
38540	297	7	19:00 ÀS 01:00	t	f	t	t	\N
38541	297	7	01:00 ÀS 07:00	t	f	t	t	\N
38542	297	8	07:00 ÀS 13:00	t	f	t	t	\N
38543	297	8	13:00 ÀS 19:00	t	f	t	t	\N
38544	297	8	19:00 ÀS 01:00	t	f	t	t	\N
38545	297	8	01:00 ÀS 07:00	t	f	t	t	\N
38546	297	9	07:00 ÀS 13:00	t	f	t	t	\N
38547	297	9	13:00 ÀS 19:00	t	f	t	t	\N
38548	297	9	19:00 ÀS 01:00	t	f	t	t	\N
38549	297	9	01:00 ÀS 07:00	t	f	t	t	\N
38550	298	15	13:00 ÀS 19:00	t	f	t	t	\N
38551	298	15	19:00 ÀS 01:00	t	f	t	t	\N
38552	298	4	07:00 ÀS 13:00	t	f	t	t	\N
38553	298	4	13:00 ÀS 19:00	t	f	t	t	\N
38554	298	5	07:00 ÀS 13:00	t	f	t	t	\N
38555	298	5	13:00 ÀS 19:00	t	f	t	t	\N
38556	298	8	07:00 ÀS 13:00	t	f	t	t	\N
38557	298	8	13:00 ÀS 19:00	t	f	t	t	\N
38558	298	8	19:00 ÀS 01:00	t	f	t	t	\N
38559	298	9	07:00 ÀS 13:00	t	f	t	t	\N
38560	298	9	13:00 ÀS 19:00	t	f	t	t	\N
38561	299	10	07:00 ÀS 13:00	t	f	t	t	\N
38562	299	10	13:00 ÀS 19:00	t	f	t	t	\N
38563	299	10	19:00 ÀS 01:00	t	f	t	t	\N
38564	299	10	01:00 ÀS 07:00	t	f	t	t	\N
38565	299	12	07:00 ÀS 13:00	t	f	t	t	\N
38566	299	12	13:00 ÀS 19:00	t	f	t	t	\N
38567	299	12	19:00 ÀS 01:00	t	f	t	t	\N
38568	299	12	01:00 ÀS 07:00	t	f	t	t	\N
38569	299	13	07:00 ÀS 13:00	t	f	t	t	\N
38570	299	13	13:00 ÀS 19:00	t	f	t	t	\N
38571	299	13	19:00 ÀS 01:00	t	f	t	t	\N
38572	299	13	01:00 ÀS 07:00	t	f	t	t	\N
38573	299	14	07:00 ÀS 13:00	t	f	t	t	\N
38574	299	14	13:00 ÀS 19:00	t	f	t	t	\N
38575	299	14	19:00 ÀS 01:00	t	f	t	t	\N
38576	299	14	01:00 ÀS 07:00	t	f	t	t	\N
38577	299	1	07:00 ÀS 13:00	t	f	t	t	\N
38578	299	1	13:00 ÀS 19:00	t	f	t	t	\N
38579	299	1	19:00 ÀS 01:00	t	f	t	t	\N
38580	299	1	01:00 ÀS 07:00	t	f	t	t	\N
38581	299	2	07:00 ÀS 13:00	t	f	t	t	\N
38582	299	2	13:00 ÀS 19:00	t	f	t	t	\N
38583	299	2	19:00 ÀS 01:00	t	f	t	t	\N
38584	299	2	01:00 ÀS 07:00	t	f	t	t	\N
38585	299	4	07:00 ÀS 13:00	t	f	t	t	\N
38586	299	4	13:00 ÀS 19:00	t	f	t	t	\N
38587	299	4	19:00 ÀS 01:00	t	f	t	t	\N
38588	299	4	01:00 ÀS 07:00	t	f	t	t	\N
38589	299	5	07:00 ÀS 13:00	t	f	t	t	\N
38590	299	5	13:00 ÀS 19:00	t	f	t	t	\N
38591	299	5	19:00 ÀS 01:00	t	f	t	t	\N
38592	299	5	01:00 ÀS 07:00	t	f	t	t	\N
38593	299	6	07:00 ÀS 13:00	t	f	t	t	\N
38594	299	6	13:00 ÀS 19:00	t	f	t	t	\N
38595	299	6	19:00 ÀS 01:00	t	f	t	t	\N
38596	299	6	01:00 ÀS 07:00	t	f	t	t	\N
38597	299	8	07:00 ÀS 13:00	t	f	t	t	\N
38598	299	8	13:00 ÀS 19:00	t	f	t	t	\N
38599	299	8	19:00 ÀS 01:00	t	f	t	t	\N
38600	299	8	01:00 ÀS 07:00	t	f	t	t	\N
38601	299	9	07:00 ÀS 13:00	t	f	t	t	\N
38602	299	9	13:00 ÀS 19:00	t	f	t	t	\N
38603	299	9	19:00 ÀS 01:00	t	f	t	t	\N
38604	299	9	01:00 ÀS 07:00	t	f	t	t	\N
38605	300	12	13:00 ÀS 19:00	t	f	t	t	\N
38606	300	12	19:00 ÀS 01:00	t	f	t	t	\N
38607	300	12	01:00 ÀS 07:00	t	f	t	t	\N
38608	300	15	13:00 ÀS 19:00	t	f	t	t	\N
38609	300	15	19:00 ÀS 01:00	t	f	t	t	\N
38610	300	15	01:00 ÀS 07:00	t	f	t	t	\N
38611	300	4	13:00 ÀS 19:00	t	f	t	t	\N
38612	300	4	19:00 ÀS 01:00	t	f	t	t	\N
38613	300	4	01:00 ÀS 07:00	t	f	t	t	\N
38614	301	10	07:00 ÀS 13:00	t	f	t	t	\N
38615	301	10	13:00 ÀS 19:00	t	f	t	t	\N
38616	301	10	19:00 ÀS 01:00	t	f	t	t	\N
38617	301	10	01:00 ÀS 07:00	t	f	t	t	\N
38618	301	12	07:00 ÀS 13:00	t	f	t	t	\N
38619	301	12	13:00 ÀS 19:00	t	f	t	t	\N
38620	301	12	19:00 ÀS 01:00	t	f	t	t	\N
38621	301	12	01:00 ÀS 07:00	t	f	t	t	\N
38622	301	13	07:00 ÀS 13:00	t	f	t	t	\N
38623	301	13	13:00 ÀS 19:00	t	f	t	t	\N
38624	301	13	19:00 ÀS 01:00	t	f	t	t	\N
38625	301	13	01:00 ÀS 07:00	t	f	t	t	\N
38626	301	14	07:00 ÀS 13:00	t	f	t	t	\N
38627	301	14	13:00 ÀS 19:00	t	f	t	t	\N
38628	301	14	19:00 ÀS 01:00	t	f	t	t	\N
38629	301	14	01:00 ÀS 07:00	t	f	t	t	\N
38630	301	1	07:00 ÀS 13:00	t	f	t	t	\N
38631	301	1	13:00 ÀS 19:00	t	f	t	t	\N
38632	301	1	19:00 ÀS 01:00	t	f	t	t	\N
38633	301	1	01:00 ÀS 07:00	t	f	t	t	\N
38634	301	2	07:00 ÀS 13:00	t	f	t	t	\N
38635	301	2	13:00 ÀS 19:00	t	f	t	t	\N
38636	301	2	19:00 ÀS 01:00	t	f	t	t	\N
38637	301	2	01:00 ÀS 07:00	t	f	t	t	\N
38638	301	4	07:00 ÀS 13:00	t	f	t	t	\N
38639	301	4	13:00 ÀS 19:00	t	f	t	t	\N
13884	86	16	07:00 ÀS 13:00	t	f	t	t	\N
13885	86	16	13:00 ÀS 19:00	t	f	t	t	\N
13886	86	16	19:00 ÀS 01:00	t	f	t	t	\N
13887	86	18	07:00 ÀS 13:00	t	f	t	t	\N
13888	86	18	13:00 ÀS 19:00	t	f	t	t	\N
38640	301	4	19:00 ÀS 01:00	t	f	t	t	\N
38641	301	4	01:00 ÀS 07:00	t	f	t	t	\N
38642	301	5	07:00 ÀS 13:00	t	f	t	t	\N
38643	301	5	13:00 ÀS 19:00	t	f	t	t	\N
38644	301	5	19:00 ÀS 01:00	t	f	t	t	\N
38645	301	5	01:00 ÀS 07:00	t	f	t	t	\N
38646	301	6	07:00 ÀS 13:00	t	f	t	t	\N
38647	301	6	13:00 ÀS 19:00	t	f	t	t	\N
38648	301	6	19:00 ÀS 01:00	t	f	t	t	\N
38649	301	6	01:00 ÀS 07:00	t	f	t	t	\N
38650	301	8	07:00 ÀS 13:00	t	f	t	t	\N
38651	301	8	13:00 ÀS 19:00	t	f	t	t	\N
38652	301	8	19:00 ÀS 01:00	t	f	t	t	\N
38653	301	8	01:00 ÀS 07:00	t	f	t	t	\N
38654	301	9	07:00 ÀS 13:00	t	f	t	t	\N
38655	301	9	13:00 ÀS 19:00	t	f	t	t	\N
38656	301	9	19:00 ÀS 01:00	t	f	t	t	\N
38657	301	9	01:00 ÀS 07:00	t	f	t	t	\N
38658	302	10	13:00 ÀS 19:00	t	f	t	t	\N
38659	302	10	19:00 ÀS 01:00	t	f	t	t	\N
38660	302	10	01:00 ÀS 07:00	t	f	t	t	\N
38661	302	11	07:00 ÀS 13:00	t	f	t	t	\N
38662	302	11	13:00 ÀS 19:00	t	f	t	t	\N
38663	302	11	19:00 ÀS 01:00	t	f	t	t	\N
38664	302	11	01:00 ÀS 07:00	t	f	t	t	\N
38665	302	12	07:00 ÀS 13:00	t	f	t	t	\N
38666	302	12	13:00 ÀS 19:00	t	f	t	t	\N
38667	302	12	19:00 ÀS 01:00	t	f	t	t	\N
38668	302	15	13:00 ÀS 19:00	t	f	t	t	\N
38669	302	15	19:00 ÀS 01:00	t	f	t	t	\N
38670	302	15	01:00 ÀS 07:00	t	f	t	t	\N
38671	302	3	07:00 ÀS 13:00	t	f	t	t	\N
38672	302	3	13:00 ÀS 19:00	t	f	t	t	\N
38673	302	3	19:00 ÀS 01:00	t	f	t	t	\N
38674	302	3	01:00 ÀS 07:00	t	f	t	t	\N
38675	302	4	07:00 ÀS 13:00	t	f	t	t	\N
38676	302	4	13:00 ÀS 19:00	t	f	t	t	\N
38677	302	4	19:00 ÀS 01:00	t	f	t	t	\N
38678	302	4	01:00 ÀS 07:00	t	f	t	t	\N
38679	302	7	07:00 ÀS 13:00	t	f	t	t	\N
38680	302	7	13:00 ÀS 19:00	t	f	t	t	\N
38681	302	7	19:00 ÀS 01:00	t	f	t	t	\N
38682	302	8	07:00 ÀS 13:00	t	f	t	t	\N
38683	302	8	13:00 ÀS 19:00	t	f	t	t	\N
38684	302	8	19:00 ÀS 01:00	t	f	t	t	\N
38685	302	2	13:00 ÀS 19:00	t	f	t	t	\N
38686	302	2	19:00 ÀS 01:00	t	f	t	t	\N
38687	302	2	01:00 ÀS 07:00	t	f	t	t	\N
38688	302	6	13:00 ÀS 19:00	t	f	t	t	\N
38689	302	6	19:00 ÀS 01:00	t	f	t	t	\N
38690	303	10	07:00 ÀS 13:00	t	f	t	t	\N
38691	303	10	13:00 ÀS 19:00	t	f	t	t	\N
38692	303	10	19:00 ÀS 01:00	t	f	t	t	\N
38693	303	10	01:00 ÀS 07:00	t	f	t	t	\N
38694	303	12	07:00 ÀS 13:00	t	f	t	t	\N
38695	303	12	13:00 ÀS 19:00	t	f	t	t	\N
38696	303	12	19:00 ÀS 01:00	t	f	t	t	\N
38697	303	12	01:00 ÀS 07:00	t	f	t	t	\N
38698	303	13	07:00 ÀS 13:00	t	f	t	t	\N
38699	303	13	13:00 ÀS 19:00	t	f	t	t	\N
38700	303	13	19:00 ÀS 01:00	t	f	t	t	\N
38701	303	13	01:00 ÀS 07:00	t	f	t	t	\N
38702	303	14	07:00 ÀS 13:00	t	f	t	t	\N
38703	303	14	13:00 ÀS 19:00	t	f	t	t	\N
38704	303	14	19:00 ÀS 01:00	t	f	t	t	\N
38705	303	14	01:00 ÀS 07:00	t	f	t	t	\N
38706	303	1	07:00 ÀS 13:00	t	f	t	t	\N
38707	303	1	13:00 ÀS 19:00	t	f	t	t	\N
38708	303	1	19:00 ÀS 01:00	t	f	t	t	\N
38709	303	1	01:00 ÀS 07:00	t	f	t	t	\N
38710	303	2	07:00 ÀS 13:00	t	f	t	t	\N
38711	303	2	13:00 ÀS 19:00	t	f	t	t	\N
38712	303	2	19:00 ÀS 01:00	t	f	t	t	\N
38713	303	2	01:00 ÀS 07:00	t	f	t	t	\N
38714	303	4	07:00 ÀS 13:00	t	f	t	t	\N
38715	303	4	13:00 ÀS 19:00	t	f	t	t	\N
38716	303	4	19:00 ÀS 01:00	t	f	t	t	\N
38717	303	4	01:00 ÀS 07:00	t	f	t	t	\N
38718	303	5	07:00 ÀS 13:00	t	f	t	t	\N
38719	303	5	13:00 ÀS 19:00	t	f	t	t	\N
38720	303	5	19:00 ÀS 01:00	t	f	t	t	\N
38721	303	5	01:00 ÀS 07:00	t	f	t	t	\N
38722	303	6	07:00 ÀS 13:00	t	f	t	t	\N
38723	303	6	13:00 ÀS 19:00	t	f	t	t	\N
38724	303	6	19:00 ÀS 01:00	t	f	t	t	\N
38725	303	6	01:00 ÀS 07:00	t	f	t	t	\N
38726	303	8	07:00 ÀS 13:00	t	f	t	t	\N
38727	303	8	13:00 ÀS 19:00	t	f	t	t	\N
38728	303	8	19:00 ÀS 01:00	t	f	t	t	\N
38729	303	8	01:00 ÀS 07:00	t	f	t	t	\N
38730	303	9	07:00 ÀS 13:00	t	f	t	t	\N
38731	303	9	13:00 ÀS 19:00	t	f	t	t	\N
38732	303	9	19:00 ÀS 01:00	t	f	t	t	\N
38733	303	9	01:00 ÀS 07:00	t	f	t	t	\N
28194	89	8	13:00 ÀS 19:00	t	f	t	t	\N
28195	89	8	19:00 ÀS 01:00	t	f	t	t	\N
28196	89	8	01:00 ÀS 07:00	t	f	t	t	\N
28217	141	24	01:00 ÀS 07:00	t	f	t	t	\N
28218	141	25	07:00 ÀS 13:00	t	f	t	t	\N
28219	141	25	13:00 ÀS 19:00	t	f	t	t	\N
28220	141	25	19:00 ÀS 01:00	t	f	t	t	\N
28221	141	25	01:00 ÀS 07:00	t	f	t	t	\N
28222	141	27	13:00 ÀS 19:00	t	f	t	t	\N
28225	141	28	07:00 ÀS 13:00	t	f	t	f	DESIST DIA 28/05 Req. nº  25372/2026-2ª CIA
28226	141	28	13:00 ÀS 19:00	t	f	t	f	DESIST DIA 28/05 Req. nº  25372/2026-2ª CIA
28227	141	28	19:00 ÀS 01:00	t	f	t	f	DESIST DIA 28/05 Req. nº  25372/2026-2ª CIA
28228	141	28	01:00 ÀS 07:00	t	f	t	f	DESIST DIA 28/05 Req. nº  25372/2026-2ª CIA
28223	141	27	19:00 ÀS 01:00	t	f	t	t	\N
28224	141	27	01:00 ÀS 07:00	t	f	t	t	\N
28229	141	29	07:00 ÀS 13:00	t	f	t	t	\N
28230	141	29	13:00 ÀS 19:00	t	f	t	t	\N
21695	152	30	07:00 ÀS 13:00	t	f	f	t	\N
21696	152	30	13:00 ÀS 19:00	t	f	f	t	\N
21697	152	30	19:00 ÀS 01:00	t	f	f	t	\N
21726	154	6	19:00 ÀS 01:00	t	f	f	t	\N
21694	152	29	01:00 ÀS 07:00	t	f	f	t	\N
21724	154	5	01:00 ÀS 07:00	t	f	f	t	\N
21725	154	6	13:00 ÀS 19:00	t	f	f	t	\N
21732	155	20	07:00 ÀS 13:00	t	f	f	t	\N
21727	154	6	01:00 ÀS 07:00	t	f	f	t	\N
21733	155	20	13:00 ÀS 19:00	t	f	f	t	\N
21722	154	5	13:00 ÀS 19:00	t	f	f	t	\N
21723	154	5	19:00 ÀS 01:00	t	f	f	t	\N
21734	155	20	19:00 ÀS 01:00	t	f	f	t	\N
21735	155	20	01:00 ÀS 07:00	t	f	f	t	\N
21736	155	27	07:00 ÀS 13:00	t	f	f	t	\N
21737	155	27	13:00 ÀS 19:00	t	f	f	t	\N
21738	155	27	19:00 ÀS 01:00	t	f	f	t	\N
21739	155	27	01:00 ÀS 07:00	t	f	f	t	\N
21740	155	28	07:00 ÀS 13:00	t	f	f	t	\N
21795	158	22	01:00 ÀS 07:00	t	f	t	t	\N
21796	158	24	07:00 ÀS 13:00	t	f	t	t	\N
21789	157	8	13:00 ÀS 19:00	t	f	t	t	\N
21786	157	14	19:00 ÀS 01:00	t	f	t	t	\N
21728	155	19	07:00 ÀS 13:00	t	f	f	t	\N
21729	155	19	13:00 ÀS 19:00	t	f	f	t	\N
21730	155	19	19:00 ÀS 01:00	t	f	f	t	\N
21731	155	19	01:00 ÀS 07:00	t	f	f	t	\N
21798	158	29	19:00 ÀS 01:00	t	f	t	t	\N
21790	157	5	19:00 ÀS 01:00	t	f	t	t	\N
21791	157	5	01:00 ÀS 07:00	t	f	t	t	\N
21787	157	14	01:00 ÀS 07:00	t	f	t	t	\N
21788	157	8	07:00 ÀS 13:00	t	f	t	t	\N
21797	158	24	13:00 ÀS 19:00	t	f	t	t	\N
21799	158	29	01:00 ÀS 07:00	t	f	t	t	\N
21792	158	16	07:00 ÀS 13:00	t	f	t	t	\N
21793	158	16	13:00 ÀS 19:00	t	f	t	t	\N
21794	158	22	19:00 ÀS 01:00	t	f	t	t	\N
28232	141	29	01:00 ÀS 07:00	t	f	t	t	\N
25719	156	18	07:00 ÀS 13:00	t	f	t	t	\N
25702	90	13	13:00 ÀS 19:00	t	f	t	t	\N
25723	156	21	13:00 ÀS 19:00	t	f	t	t	\N
25724	156	21	19:00 ÀS 01:00	t	f	t	t	\N
25725	156	21	01:00 ÀS 07:00	t	f	t	t	\N
25726	156	22	07:00 ÀS 13:00	t	f	t	t	\N
25727	156	22	13:00 ÀS 19:00	t	f	t	t	\N
25728	156	22	19:00 ÀS 01:00	t	f	t	t	\N
25729	156	22	01:00 ÀS 07:00	t	f	t	t	\N
25730	156	26	07:00 ÀS 13:00	t	f	t	t	\N
25731	156	26	13:00 ÀS 19:00	t	f	t	t	\N
25732	156	26	19:00 ÀS 01:00	t	f	t	t	\N
25733	156	26	01:00 ÀS 07:00	t	f	t	t	\N
28345	128	14	13:00 ÀS 19:00	t	f	t	t	\N
28346	128	5	07:00 ÀS 13:00	t	f	t	t	\N
28342	128	13	07:00 ÀS 13:00	t	f	t	t	\N
28343	128	13	13:00 ÀS 19:00	t	f	t	t	\N
25720	156	19	07:00 ÀS 13:00	t	f	t	t	\N
25721	156	19	13:00 ÀS 19:00	t	f	t	t	\N
25722	156	19	19:00 ÀS 01:00	t	f	t	t	\N
28347	128	5	13:00 ÀS 19:00	t	f	t	t	\N
28348	128	6	07:00 ÀS 13:00	t	f	t	t	\N
28349	128	6	13:00 ÀS 19:00	t	f	t	t	\N
28350	128	8	07:00 ÀS 13:00	t	f	t	t	\N
28351	128	8	13:00 ÀS 19:00	t	f	t	t	\N
28352	128	9	07:00 ÀS 13:00	t	f	t	t	\N
28353	128	9	13:00 ÀS 19:00	t	f	t	t	\N
21862	71	15	07:00 ÀS 13:00	t	f	t	t	\N
21863	71	15	13:00 ÀS 19:00	t	f	t	t	\N
21864	71	7	07:00 ÀS 13:00	t	f	t	t	\N
28344	128	14	07:00 ÀS 13:00	t	f	t	t	\N
21865	71	7	13:00 ÀS 19:00	t	f	t	t	\N
21866	71	5	19:00 ÀS 01:00	t	f	t	t	\N
21867	71	5	01:00 ÀS 07:00	t	f	t	t	\N
21870	161	21	19:00 ÀS 01:00	t	f	t	t	\N
21871	161	21	01:00 ÀS 07:00	t	f	t	t	\N
21860	71	14	19:00 ÀS 01:00	t	f	t	t	\N
21861	71	14	01:00 ÀS 07:00	t	f	t	t	\N
21872	161	22	07:00 ÀS 13:00	t	f	t	t	\N
21873	161	22	13:00 ÀS 19:00	t	f	t	t	\N
21874	161	27	19:00 ÀS 01:00	t	f	t	t	\N
21875	161	27	01:00 ÀS 07:00	t	f	t	t	\N
21876	161	29	07:00 ÀS 13:00	t	f	t	t	\N
21877	161	29	13:00 ÀS 19:00	t	f	t	t	\N
21906	162	18	07:00 ÀS 13:00	t	f	t	t	\N
21907	162	18	13:00 ÀS 19:00	t	f	t	t	\N
21868	161	19	19:00 ÀS 01:00	t	f	t	t	\N
21869	161	19	01:00 ÀS 07:00	t	f	t	t	\N
21908	162	18	19:00 ÀS 01:00	t	f	t	t	\N
21909	162	18	01:00 ÀS 07:00	t	f	t	t	\N
21910	162	21	07:00 ÀS 13:00	t	f	t	t	\N
21911	162	21	13:00 ÀS 19:00	t	f	t	t	\N
21912	162	21	19:00 ÀS 01:00	t	f	t	t	\N
21913	162	21	01:00 ÀS 07:00	t	f	t	t	\N
21914	162	22	07:00 ÀS 13:00	t	f	t	t	\N
21915	162	22	13:00 ÀS 19:00	t	f	t	t	\N
21916	162	22	19:00 ÀS 01:00	t	f	t	t	\N
21917	162	22	01:00 ÀS 07:00	t	f	t	t	\N
21918	162	25	07:00 ÀS 13:00	t	f	t	t	\N
21878	101	12	07:00 ÀS 13:00	t	f	t	t	\N
21879	101	12	13:00 ÀS 19:00	t	f	t	t	\N
21880	101	12	19:00 ÀS 01:00	t	f	t	t	\N
21881	101	12	01:00 ÀS 07:00	t	f	t	t	\N
21882	101	13	07:00 ÀS 13:00	t	f	t	t	\N
21883	101	13	13:00 ÀS 19:00	t	f	t	t	\N
21884	101	13	19:00 ÀS 01:00	t	f	t	t	\N
21885	101	13	01:00 ÀS 07:00	t	f	t	t	\N
21886	101	14	07:00 ÀS 13:00	t	f	t	t	\N
21887	101	14	13:00 ÀS 19:00	t	f	t	t	\N
21888	101	14	19:00 ÀS 01:00	t	f	t	t	\N
21889	101	14	01:00 ÀS 07:00	t	f	t	t	\N
21890	101	4	07:00 ÀS 13:00	t	f	t	t	\N
21930	115	10	13:00 ÀS 19:00	t	f	f	t	\N
21931	115	10	19:00 ÀS 01:00	t	f	f	t	\N
21932	115	11	13:00 ÀS 19:00	t	f	f	t	\N
21933	115	11	19:00 ÀS 01:00	t	f	f	t	\N
21952	163	31	13:00 ÀS 19:00	t	f	f	t	\N
21953	163	31	19:00 ÀS 01:00	t	f	f	t	\N
21959	77	3	19:00 ÀS 01:00	t	f	t	t	\N
21946	163	26	13:00 ÀS 19:00	t	f	f	t	\N
21960	77	6	13:00 ÀS 19:00	t	f	t	t	\N
21961	77	6	19:00 ÀS 01:00	t	f	t	t	\N
21963	164	19	19:00 ÀS 01:00	t	f	t	t	\N
21955	77	11	19:00 ÀS 01:00	t	f	t	t	\N
21956	77	14	13:00 ÀS 19:00	t	f	t	t	\N
21957	77	14	19:00 ÀS 01:00	t	f	t	t	\N
21958	77	3	13:00 ÀS 19:00	t	f	t	t	\N
21954	77	11	13:00 ÀS 19:00	t	f	t	t	\N
21964	164	22	13:00 ÀS 19:00	t	f	t	t	\N
21965	164	22	19:00 ÀS 01:00	t	f	t	t	\N
21966	164	27	13:00 ÀS 19:00	t	f	t	t	\N
21967	164	27	19:00 ÀS 01:00	t	f	t	t	\N
21968	164	30	13:00 ÀS 19:00	t	f	t	t	\N
21969	164	30	19:00 ÀS 01:00	t	f	t	t	\N
21998	165	18	07:00 ÀS 13:00	t	f	t	t	\N
21962	164	19	13:00 ÀS 19:00	t	f	t	t	\N
21999	165	18	13:00 ÀS 19:00	t	f	t	t	\N
22000	165	18	19:00 ÀS 01:00	t	f	t	t	\N
22001	165	18	01:00 ÀS 07:00	t	f	t	t	\N
22042	166	18	07:00 ÀS 13:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22043	166	18	13:00 ÀS 19:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22044	166	18	19:00 ÀS 01:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22045	166	18	01:00 ÀS 07:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22046	166	19	07:00 ÀS 13:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22047	166	19	13:00 ÀS 19:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22048	166	19	19:00 ÀS 01:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22049	166	19	01:00 ÀS 07:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22005	165	22	07:00 ÀS 13:00	t	f	t	f	DESIST 22/05 Req. nº  25507/2026-2ª CIA
22006	165	22	13:00 ÀS 19:00	t	f	t	f	DESIST 22/05 Req. nº  25507/2026-2ª CIA
22007	165	22	19:00 ÀS 01:00	t	f	t	f	DESIST 22/05 Req. nº  25507/2026-2ª CIA
22002	165	19	07:00 ÀS 13:00	t	f	t	t	\N
22003	165	19	13:00 ÀS 19:00	t	f	t	t	\N
22004	165	21	19:00 ÀS 01:00	t	f	t	t	\N
21970	72	10	07:00 ÀS 13:00	t	f	t	t	\N
21971	72	10	13:00 ÀS 19:00	t	f	t	t	\N
21972	72	10	19:00 ÀS 01:00	t	f	t	t	\N
21973	72	10	01:00 ÀS 07:00	t	f	t	t	\N
21974	72	11	07:00 ÀS 13:00	t	f	t	t	\N
21975	72	11	13:00 ÀS 19:00	t	f	t	t	\N
21976	72	11	19:00 ÀS 01:00	t	f	t	t	\N
21977	72	11	01:00 ÀS 07:00	t	f	t	t	\N
21978	72	13	07:00 ÀS 13:00	t	f	t	t	\N
21979	72	13	13:00 ÀS 19:00	t	f	t	t	\N
22014	165	27	13:00 ÀS 19:00	t	f	t	t	\N
22034	106	6	13:00 ÀS 19:00	t	f	f	t	\N
22035	106	6	19:00 ÀS 01:00	t	f	f	t	\N
22036	106	6	01:00 ÀS 07:00	t	f	f	t	\N
22037	106	7	07:00 ÀS 13:00	t	f	f	t	\N
22038	106	7	13:00 ÀS 19:00	t	f	f	t	\N
22039	106	7	19:00 ÀS 01:00	t	f	f	t	\N
22040	106	7	01:00 ÀS 07:00	t	f	f	t	\N
22041	106	3	01:00 ÀS 07:00	t	f	f	t	\N
22022	106	11	13:00 ÀS 19:00	t	f	f	t	\N
22008	165	25	01:00 ÀS 07:00	t	f	t	t	\N
22009	165	26	07:00 ÀS 13:00	t	f	t	t	\N
22010	165	26	13:00 ÀS 19:00	t	f	t	t	\N
22011	165	26	19:00 ÀS 01:00	t	f	t	t	\N
22012	165	26	01:00 ÀS 07:00	t	f	t	t	\N
22013	165	27	07:00 ÀS 13:00	t	f	t	t	\N
22023	106	11	19:00 ÀS 01:00	t	f	f	t	\N
22024	106	11	01:00 ÀS 07:00	t	f	f	t	\N
22029	106	15	07:00 ÀS 13:00	t	f	f	t	\N
22030	106	15	13:00 ÀS 19:00	t	f	f	t	\N
22031	106	15	19:00 ÀS 01:00	t	f	f	t	\N
22032	106	15	01:00 ÀS 07:00	t	f	f	t	\N
22053	166	22	01:00 ÀS 07:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22052	166	22	19:00 ÀS 01:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22051	166	22	13:00 ÀS 19:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22050	166	22	07:00 ÀS 13:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22058	166	26	07:00 ÀS 13:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22061	166	26	01:00 ÀS 07:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22060	166	26	19:00 ÀS 01:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22059	166	26	13:00 ÀS 19:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22062	166	27	07:00 ÀS 13:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22063	166	27	13:00 ÀS 19:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22064	166	27	19:00 ÀS 01:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22065	166	27	01:00 ÀS 07:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22033	106	6	07:00 ÀS 13:00	t	f	f	t	\N
22093	121	12	13:00 ÀS 19:00	t	f	t	t	\N
22094	121	12	19:00 ÀS 01:00	t	f	t	t	\N
22095	121	12	01:00 ÀS 07:00	t	f	t	t	\N
28355	159	17	13:00 ÀS 19:00	t	f	t	t	\N
28370	69	10	01:00 ÀS 07:00	t	f	t	t	\N
28371	69	15	07:00 ÀS 13:00	t	f	t	t	\N
28372	69	15	13:00 ÀS 19:00	t	f	t	t	\N
28373	69	15	19:00 ÀS 01:00	t	f	t	t	\N
28368	69	10	13:00 ÀS 19:00	t	f	t	t	\N
22073	112	14	07:00 ÀS 13:00	t	f	f	t	\N
22074	112	15	13:00 ÀS 19:00	t	f	f	t	\N
22075	112	7	13:00 ÀS 19:00	t	f	f	t	\N
22076	112	1	01:00 ÀS 07:00	t	f	f	t	\N
22057	166	23	01:00 ÀS 07:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22056	166	23	19:00 ÀS 01:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22055	166	23	13:00 ÀS 19:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22054	166	23	07:00 ÀS 13:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22077	112	5	01:00 ÀS 07:00	t	f	f	t	\N
22078	112	6	01:00 ÀS 07:00	t	f	f	t	\N
22079	112	9	01:00 ÀS 07:00	t	f	f	t	\N
22083	167	23	07:00 ÀS 13:00	t	f	f	t	\N
22084	167	25	01:00 ÀS 07:00	t	f	f	t	\N
22080	167	17	01:00 ÀS 07:00	t	f	f	t	\N
22070	112	10	01:00 ÀS 07:00	t	f	f	t	\N
22071	112	11	07:00 ÀS 13:00	t	f	f	t	\N
22072	112	13	01:00 ÀS 07:00	t	f	f	t	\N
22085	167	27	07:00 ÀS 13:00	t	f	f	t	\N
22086	167	29	01:00 ÀS 07:00	t	f	f	t	\N
22087	167	31	01:00 ÀS 07:00	t	f	f	t	\N
22120	168	19	07:00 ÀS 13:00	t	f	t	t	\N
22121	168	19	13:00 ÀS 19:00	t	f	t	t	\N
22081	167	19	13:00 ÀS 19:00	t	f	f	t	\N
22082	167	21	01:00 ÀS 07:00	t	f	f	t	\N
22122	168	19	19:00 ÀS 01:00	t	f	t	t	\N
22123	168	19	01:00 ÀS 07:00	t	f	t	t	\N
22124	168	20	07:00 ÀS 13:00	t	f	t	t	\N
22125	168	20	13:00 ÀS 19:00	t	f	t	t	\N
22126	168	20	19:00 ÀS 01:00	t	f	t	t	\N
22127	168	20	01:00 ÀS 07:00	t	f	t	t	\N
22128	168	21	07:00 ÀS 13:00	t	f	t	t	\N
22129	168	21	13:00 ÀS 19:00	t	f	t	t	\N
22100	121	15	07:00 ÀS 13:00	t	f	t	t	\N
22101	121	15	13:00 ÀS 19:00	t	f	t	t	\N
22130	168	21	19:00 ÀS 01:00	t	f	t	t	\N
22131	168	21	01:00 ÀS 07:00	t	f	t	t	\N
22132	168	24	07:00 ÀS 13:00	t	f	t	t	\N
22133	168	24	13:00 ÀS 19:00	t	f	t	t	\N
22134	168	24	19:00 ÀS 01:00	t	f	t	t	\N
22135	168	24	01:00 ÀS 07:00	t	f	t	t	\N
22136	168	25	07:00 ÀS 13:00	t	f	t	t	\N
21593	145	31	07:00 ÀS 13:00	t	f	f	t	\N
21594	145	31	13:00 ÀS 19:00	t	f	f	t	\N
21595	145	31	19:00 ÀS 01:00	t	f	f	t	\N
28323	148	25	13:00 ÀS 19:00	t	f	t	t	\N
29339	232	15	13:00 ÀS 19:00	t	f	t	t	\N
29340	232	15	19:00 ÀS 01:00	t	f	t	t	\N
29341	232	1	13:00 ÀS 19:00	t	f	t	t	\N
29342	232	1	19:00 ÀS 01:00	t	f	t	t	\N
29343	232	8	13:00 ÀS 19:00	t	f	t	t	\N
29344	232	8	19:00 ÀS 01:00	t	f	t	t	\N
28324	148	25	19:00 ÀS 01:00	t	f	t	t	\N
21676	151	15	13:00 ÀS 19:00	t	f	f	t	\N
21677	151	15	19:00 ÀS 01:00	t	f	f	t	\N
29345	233	16	13:00 ÀS 19:00	t	f	t	t	\N
29346	233	22	13:00 ÀS 19:00	t	f	t	t	\N
29347	233	22	19:00 ÀS 01:00	t	f	t	t	\N
29348	233	25	13:00 ÀS 19:00	t	f	t	t	\N
29349	233	25	19:00 ÀS 01:00	t	f	t	t	\N
29350	233	26	13:00 ÀS 19:00	t	f	t	t	\N
29351	233	26	19:00 ÀS 01:00	t	f	t	t	\N
29352	233	27	13:00 ÀS 19:00	t	f	t	t	\N
29353	233	27	19:00 ÀS 01:00	t	f	t	t	\N
29354	233	28	13:00 ÀS 19:00	t	f	t	t	\N
29355	233	28	19:00 ÀS 01:00	t	f	t	t	\N
29356	233	29	13:00 ÀS 19:00	t	f	t	t	\N
29357	233	29	19:00 ÀS 01:00	t	f	t	t	\N
21578	144	10	07:00 ÀS 13:00	t	f	f	t	\N
21579	144	10	13:00 ÀS 19:00	t	f	f	t	\N
21580	144	10	19:00 ÀS 01:00	t	f	f	t	\N
21581	144	10	01:00 ÀS 07:00	t	f	f	t	\N
21582	144	3	07:00 ÀS 13:00	t	f	f	t	\N
21583	144	3	13:00 ÀS 19:00	t	f	f	t	\N
21584	144	3	19:00 ÀS 01:00	t	f	f	t	\N
21714	154	12	07:00 ÀS 13:00	t	f	f	t	\N
21715	154	12	13:00 ÀS 19:00	t	f	f	t	\N
21716	154	12	19:00 ÀS 01:00	t	f	f	t	\N
21717	154	12	01:00 ÀS 07:00	t	f	f	t	\N
21718	154	13	07:00 ÀS 13:00	t	f	f	t	\N
21719	154	13	13:00 ÀS 19:00	t	f	f	t	\N
21720	154	13	19:00 ÀS 01:00	t	f	f	t	\N
21721	154	13	01:00 ÀS 07:00	t	f	f	t	\N
21741	155	28	13:00 ÀS 19:00	t	f	f	t	\N
21742	155	28	19:00 ÀS 01:00	t	f	f	t	\N
21743	155	28	01:00 ÀS 07:00	t	f	f	t	\N
25703	90	13	19:00 ÀS 01:00	t	f	t	t	\N
25704	90	13	01:00 ÀS 07:00	t	f	t	t	\N
25705	90	14	07:00 ÀS 13:00	t	f	t	t	\N
25706	90	14	13:00 ÀS 19:00	t	f	t	t	\N
25707	90	14	19:00 ÀS 01:00	t	f	t	t	\N
25708	90	14	01:00 ÀS 07:00	t	f	t	t	\N
25709	90	15	07:00 ÀS 13:00	t	f	t	t	\N
25710	90	15	13:00 ÀS 19:00	t	f	t	t	\N
25711	90	15	19:00 ÀS 01:00	t	f	t	t	\N
25712	90	6	07:00 ÀS 13:00	t	f	t	t	\N
25713	90	6	13:00 ÀS 19:00	t	f	t	t	\N
25714	90	6	19:00 ÀS 01:00	t	f	t	t	\N
25715	90	6	01:00 ÀS 07:00	t	f	t	t	\N
25716	90	5	13:00 ÀS 19:00	t	f	t	t	\N
25717	90	5	19:00 ÀS 01:00	t	f	t	t	\N
25718	90	5	01:00 ÀS 07:00	t	f	t	t	\N
25743	156	30	01:00 ÀS 07:00	t	f	t	t	\N
28354	159	17	07:00 ÀS 13:00	t	f	t	t	\N
25735	156	27	13:00 ÀS 19:00	t	f	t	t	\N
25736	156	27	19:00 ÀS 01:00	t	f	t	t	\N
25737	156	29	13:00 ÀS 19:00	t	f	t	t	\N
25738	156	29	19:00 ÀS 01:00	t	f	t	t	\N
25739	156	29	01:00 ÀS 07:00	t	f	t	t	\N
25740	156	30	07:00 ÀS 13:00	t	f	t	t	\N
25741	156	30	13:00 ÀS 19:00	t	f	t	t	\N
28382	160	17	13:00 ÀS 19:00	t	f	t	f	EXECUT SERV 17/05 Req. nº  24915/2026
28383	160	17	19:00 ÀS 01:00	t	f	t	f	EXECUT SERV 17/05 Req. nº  24915/2026
28384	160	17	01:00 ÀS 07:00	t	f	t	f	EXECUT SERV 17/05 Req. nº  24915/2026
28358	159	22	07:00 ÀS 13:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
28359	159	22	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
28360	159	24	07:00 ÀS 13:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
28361	159	24	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
28362	159	25	07:00 ÀS 13:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
28363	159	25	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
28364	159	29	07:00 ÀS 13:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
28365	159	29	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
28366	159	30	07:00 ÀS 13:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
28367	159	30	13:00 ÀS 19:00	t	f	t	f	DESIST TODOS OS DIAS Req. nº  25426/2026-1° CIA
25742	156	30	19:00 ÀS 01:00	t	f	t	t	\N
28375	69	3	07:00 ÀS 13:00	t	f	t	t	\N
28376	69	3	13:00 ÀS 19:00	t	f	t	t	\N
28377	69	3	19:00 ÀS 01:00	t	f	t	t	\N
28378	69	3	01:00 ÀS 07:00	t	f	t	t	\N
28379	69	1	13:00 ÀS 19:00	t	f	t	t	\N
28380	69	1	19:00 ÀS 01:00	t	f	t	t	\N
28381	69	1	01:00 ÀS 07:00	t	f	t	t	\N
28374	69	15	01:00 ÀS 07:00	t	f	t	t	\N
28385	160	22	07:00 ÀS 13:00	t	f	t	t	\N
28386	160	22	13:00 ÀS 19:00	t	f	t	t	\N
28387	160	22	19:00 ÀS 01:00	t	f	t	t	\N
28388	160	22	01:00 ÀS 07:00	t	f	t	t	\N
29370	231	10	13:00 ÀS 19:00	t	f	f	t	\N
29371	231	10	19:00 ÀS 01:00	t	f	f	t	\N
22324	66	1	07:00 ÀS 13:00	t	f	t	t	\N
22393	131	6	07:00 ÀS 13:00	t	f	f	t	\N
22394	131	6	13:00 ÀS 19:00	t	f	f	t	\N
22395	131	4	13:00 ÀS 19:00	t	f	f	t	\N
22396	131	8	13:00 ÀS 19:00	t	f	f	t	\N
22397	177	18	07:00 ÀS 13:00	t	f	f	t	\N
22398	177	18	13:00 ÀS 19:00	t	f	f	t	\N
22399	177	20	13:00 ÀS 19:00	t	f	f	t	\N
22341	176	18	13:00 ÀS 19:00	t	f	t	t	\N
22342	176	18	19:00 ÀS 01:00	t	f	t	t	\N
22343	176	18	01:00 ÀS 07:00	t	f	t	t	\N
22344	176	19	07:00 ÀS 13:00	t	f	t	t	\N
22345	176	19	13:00 ÀS 19:00	t	f	t	t	\N
22346	176	19	19:00 ÀS 01:00	t	f	t	t	\N
22347	176	19	01:00 ÀS 07:00	t	f	t	t	\N
22348	176	21	07:00 ÀS 13:00	t	f	t	t	\N
22349	176	21	13:00 ÀS 19:00	t	f	t	t	\N
22350	176	21	19:00 ÀS 01:00	t	f	t	t	\N
22351	176	21	01:00 ÀS 07:00	t	f	t	t	\N
22352	176	22	07:00 ÀS 13:00	t	f	t	t	\N
22353	176	22	13:00 ÀS 19:00	t	f	t	t	\N
22354	176	22	19:00 ÀS 01:00	t	f	t	t	\N
22355	176	22	01:00 ÀS 07:00	t	f	t	t	\N
22356	176	23	07:00 ÀS 13:00	t	f	t	t	\N
22400	177	21	07:00 ÀS 13:00	t	f	f	t	\N
22401	177	21	13:00 ÀS 19:00	t	f	f	t	\N
22402	177	22	07:00 ÀS 13:00	t	f	f	t	\N
22403	177	22	13:00 ÀS 19:00	t	f	f	t	\N
22404	177	25	07:00 ÀS 13:00	t	f	f	t	\N
22405	177	25	13:00 ÀS 19:00	t	f	f	t	\N
22406	177	26	07:00 ÀS 13:00	t	f	f	t	\N
22407	177	26	13:00 ÀS 19:00	t	f	f	t	\N
22408	177	28	13:00 ÀS 19:00	t	f	f	t	\N
22384	131	12	13:00 ÀS 19:00	t	f	f	t	\N
22385	131	13	07:00 ÀS 13:00	t	f	f	t	\N
22386	131	13	13:00 ÀS 19:00	t	f	f	t	\N
22387	131	14	07:00 ÀS 13:00	t	f	f	t	\N
22388	131	14	13:00 ÀS 19:00	t	f	f	t	\N
22389	131	1	07:00 ÀS 13:00	t	f	f	t	\N
22390	131	1	13:00 ÀS 19:00	t	f	f	t	\N
22391	131	5	07:00 ÀS 13:00	t	f	f	t	\N
22392	131	5	13:00 ÀS 19:00	t	f	f	t	\N
22409	177	29	07:00 ÀS 13:00	t	f	f	t	\N
22410	177	29	13:00 ÀS 19:00	t	f	f	t	\N
22411	178	13	07:00 ÀS 13:00	t	f	f	t	\N
22412	178	14	07:00 ÀS 13:00	t	f	f	t	\N
22413	178	1	07:00 ÀS 13:00	t	f	f	t	\N
28423	171	24	07:00 ÀS 13:00	t	f	f	t	\N
16479	68	12	13:00 ÀS 19:00	t	f	f	t	\N
16480	68	12	19:00 ÀS 01:00	t	f	f	t	\N
16481	68	12	01:00 ÀS 07:00	t	f	f	t	\N
16482	68	13	07:00 ÀS 13:00	t	f	f	t	\N
16483	68	13	13:00 ÀS 19:00	t	f	f	t	\N
16484	68	13	19:00 ÀS 01:00	t	f	f	t	\N
16485	68	5	07:00 ÀS 13:00	t	f	f	t	\N
16486	68	5	13:00 ÀS 19:00	t	f	f	t	\N
16487	68	5	19:00 ÀS 01:00	t	f	f	t	\N
16488	68	8	07:00 ÀS 13:00	t	f	f	t	\N
16489	68	8	13:00 ÀS 19:00	t	f	f	t	\N
16490	68	8	19:00 ÀS 01:00	t	f	f	t	\N
16491	68	8	01:00 ÀS 07:00	t	f	f	t	\N
16492	68	9	07:00 ÀS 13:00	t	f	f	t	\N
16493	68	9	13:00 ÀS 19:00	t	f	f	t	\N
16494	68	4	13:00 ÀS 19:00	t	f	f	t	\N
16495	68	4	19:00 ÀS 01:00	t	f	f	t	\N
16496	68	4	01:00 ÀS 07:00	t	f	f	t	\N
16497	68	7	13:00 ÀS 19:00	t	f	f	t	\N
16498	68	7	19:00 ÀS 01:00	t	f	f	t	\N
16499	68	7	01:00 ÀS 07:00	t	f	f	t	\N
28390	160	23	13:00 ÀS 19:00	t	f	t	t	\N
16500	186	20	13:00 ÀS 19:00	t	f	f	t	\N
28391	160	23	19:00 ÀS 01:00	t	f	t	t	\N
28392	160	23	01:00 ÀS 07:00	t	f	t	t	\N
28408	170	7	07:00 ÀS 13:00	t	f	t	t	\N
22414	178	1	13:00 ÀS 19:00	t	f	f	t	\N
22415	178	2	07:00 ÀS 13:00	t	f	f	t	\N
22416	178	2	13:00 ÀS 19:00	t	f	f	t	\N
22417	178	5	07:00 ÀS 13:00	t	f	f	t	\N
28433	172	13	07:00 ÀS 13:00	t	f	t	t	\N
28434	172	13	13:00 ÀS 19:00	t	f	t	t	\N
28435	172	13	19:00 ÀS 01:00	t	f	t	t	\N
22418	178	4	13:00 ÀS 19:00	t	f	f	t	\N
28436	172	14	07:00 ÀS 13:00	t	f	t	t	\N
28437	172	14	13:00 ÀS 19:00	t	f	t	t	\N
22426	179	24	13:00 ÀS 19:00	t	f	f	t	\N
22427	179	25	07:00 ÀS 13:00	t	f	f	t	\N
22428	179	26	07:00 ÀS 13:00	t	f	f	t	\N
22429	179	29	07:00 ÀS 13:00	t	f	f	t	\N
22430	179	30	13:00 ÀS 19:00	t	f	f	t	\N
22490	182	16	07:00 ÀS 13:00	t	f	t	t	\N
22419	178	9	13:00 ÀS 19:00	t	f	f	t	\N
16508	186	24	07:00 ÀS 13:00	t	f	f	t	\N
22420	179	16	13:00 ÀS 19:00	t	f	f	t	\N
22421	179	17	07:00 ÀS 13:00	t	f	f	t	\N
22422	179	17	13:00 ÀS 19:00	t	f	f	t	\N
22423	179	18	07:00 ÀS 13:00	t	f	f	t	\N
22424	179	21	07:00 ÀS 13:00	t	f	f	t	\N
22425	179	22	07:00 ÀS 13:00	t	f	f	t	\N
22491	182	18	13:00 ÀS 19:00	t	f	t	t	\N
22492	182	18	19:00 ÀS 01:00	t	f	t	t	\N
22561	91	12	13:00 ÀS 19:00	t	f	t	t	\N
22562	91	13	13:00 ÀS 19:00	t	f	t	t	\N
22563	91	14	13:00 ÀS 19:00	t	f	t	t	\N
22564	91	15	13:00 ÀS 19:00	t	f	t	t	\N
22565	91	15	01:00 ÀS 07:00	t	f	t	t	\N
22566	91	2	07:00 ÀS 13:00	t	f	t	t	\N
22532	183	18	19:00 ÀS 01:00	t	f	t	t	\N
22533	183	18	01:00 ÀS 07:00	t	f	t	t	\N
22534	183	19	19:00 ÀS 01:00	t	f	t	t	\N
22535	183	19	01:00 ÀS 07:00	t	f	t	t	\N
22511	87	10	13:00 ÀS 19:00	t	f	t	t	\N
22512	87	10	19:00 ÀS 01:00	t	f	t	t	\N
22513	87	10	01:00 ÀS 07:00	t	f	t	t	\N
22514	87	11	19:00 ÀS 01:00	t	f	t	t	\N
22515	87	11	01:00 ÀS 07:00	t	f	t	t	\N
22516	87	13	19:00 ÀS 01:00	t	f	t	t	\N
22517	87	13	01:00 ÀS 07:00	t	f	t	t	\N
22518	87	15	19:00 ÀS 01:00	t	f	t	t	\N
22519	87	15	01:00 ÀS 07:00	t	f	t	t	\N
22520	87	2	07:00 ÀS 13:00	t	f	t	t	\N
22567	91	3	07:00 ÀS 13:00	t	f	t	t	\N
22568	91	4	13:00 ÀS 19:00	t	f	t	t	\N
22569	91	5	13:00 ÀS 19:00	t	f	t	t	\N
22570	91	6	13:00 ÀS 19:00	t	f	t	t	\N
22571	91	7	13:00 ÀS 19:00	t	f	t	t	\N
22597	98	4	07:00 ÀS 13:00	t	f	t	t	\N
22598	98	4	13:00 ÀS 19:00	t	f	t	t	\N
22599	98	4	19:00 ÀS 01:00	t	f	t	t	\N
22600	98	5	07:00 ÀS 13:00	t	f	t	t	\N
22601	98	5	13:00 ÀS 19:00	t	f	t	t	\N
16501	186	20	19:00 ÀS 01:00	t	f	f	t	\N
16502	186	20	01:00 ÀS 07:00	t	f	f	t	\N
16503	186	21	07:00 ÀS 13:00	t	f	f	t	\N
16504	186	21	13:00 ÀS 19:00	t	f	f	t	\N
16505	186	23	13:00 ÀS 19:00	t	f	f	t	\N
16506	186	23	19:00 ÀS 01:00	t	f	f	t	\N
16507	186	23	01:00 ÀS 07:00	t	f	f	t	\N
22604	98	7	13:00 ÀS 19:00	t	f	t	t	\N
22536	183	21	19:00 ÀS 01:00	t	f	t	t	\N
22537	183	21	01:00 ÀS 07:00	t	f	t	t	\N
22538	183	22	07:00 ÀS 13:00	t	f	t	t	\N
22539	183	22	13:00 ÀS 19:00	t	f	t	t	\N
22540	183	22	19:00 ÀS 01:00	t	f	t	t	\N
22541	183	22	01:00 ÀS 07:00	t	f	t	t	\N
22542	183	23	07:00 ÀS 13:00	t	f	t	t	\N
22543	183	23	13:00 ÀS 19:00	t	f	t	t	\N
22544	183	23	19:00 ÀS 01:00	t	f	t	t	\N
22545	183	23	01:00 ÀS 07:00	t	f	t	t	\N
22546	183	27	19:00 ÀS 01:00	t	f	t	t	\N
22547	183	27	01:00 ÀS 07:00	t	f	t	t	\N
22548	183	29	07:00 ÀS 13:00	t	f	t	t	\N
22549	183	29	13:00 ÀS 19:00	t	f	t	t	\N
22575	184	18	13:00 ÀS 19:00	t	f	t	t	\N
22576	184	19	13:00 ÀS 19:00	t	f	t	t	\N
22577	184	20	13:00 ÀS 19:00	t	f	t	t	\N
22578	184	21	13:00 ÀS 19:00	t	f	t	t	\N
22579	184	22	13:00 ÀS 19:00	t	f	t	t	\N
22580	184	22	01:00 ÀS 07:00	t	f	t	t	\N
22581	184	25	13:00 ÀS 19:00	t	f	t	t	\N
22582	184	26	13:00 ÀS 19:00	t	f	t	t	\N
22583	184	27	13:00 ÀS 19:00	t	f	t	t	\N
22584	184	28	13:00 ÀS 19:00	t	f	t	t	\N
22585	184	29	13:00 ÀS 19:00	t	f	t	t	\N
22586	184	29	01:00 ÀS 07:00	t	f	t	t	\N
22605	98	7	19:00 ÀS 01:00	t	f	t	t	\N
22587	184	30	07:00 ÀS 13:00	t	f	t	t	\N
22588	184	31	07:00 ÀS 13:00	t	f	t	t	\N
28389	160	23	07:00 ÀS 13:00	t	f	t	t	\N
28393	160	30	07:00 ÀS 13:00	t	f	t	t	\N
28395	160	30	19:00 ÀS 01:00	t	f	t	t	\N
28396	160	30	01:00 ÀS 07:00	t	f	t	t	\N
28397	160	31	07:00 ÀS 13:00	t	f	t	t	\N
28398	160	31	13:00 ÀS 19:00	t	f	t	t	\N
28399	160	31	19:00 ÀS 01:00	t	f	t	t	\N
21891	101	4	13:00 ÀS 19:00	t	f	t	t	\N
21892	101	4	19:00 ÀS 01:00	t	f	t	t	\N
21893	101	4	01:00 ÀS 07:00	t	f	t	t	\N
21894	101	5	07:00 ÀS 13:00	t	f	t	t	\N
21895	101	5	13:00 ÀS 19:00	t	f	t	t	\N
21896	101	5	19:00 ÀS 01:00	t	f	t	t	\N
21897	101	5	01:00 ÀS 07:00	t	f	t	t	\N
21898	101	6	07:00 ÀS 13:00	t	f	t	t	\N
21899	101	6	13:00 ÀS 19:00	t	f	t	t	\N
21900	101	6	19:00 ÀS 01:00	t	f	t	t	\N
21901	101	6	01:00 ÀS 07:00	t	f	t	t	\N
21902	101	8	07:00 ÀS 13:00	t	f	t	t	\N
21903	101	8	13:00 ÀS 19:00	t	f	t	t	\N
21904	101	8	19:00 ÀS 01:00	t	f	t	t	\N
21905	101	8	01:00 ÀS 07:00	t	f	t	t	\N
21919	162	25	13:00 ÀS 19:00	t	f	t	t	\N
21920	162	25	19:00 ÀS 01:00	t	f	t	t	\N
21921	162	25	01:00 ÀS 07:00	t	f	t	t	\N
21922	162	26	07:00 ÀS 13:00	t	f	t	t	\N
21923	162	26	13:00 ÀS 19:00	t	f	t	t	\N
21924	162	26	19:00 ÀS 01:00	t	f	t	t	\N
21925	162	26	01:00 ÀS 07:00	t	f	t	t	\N
21926	162	28	07:00 ÀS 13:00	t	f	t	t	\N
21927	162	28	13:00 ÀS 19:00	t	f	t	t	\N
21928	162	28	19:00 ÀS 01:00	t	f	t	t	\N
21929	162	28	01:00 ÀS 07:00	t	f	t	t	\N
21935	115	12	19:00 ÀS 01:00	t	f	f	t	\N
21936	115	14	13:00 ÀS 19:00	t	f	f	t	\N
21937	115	14	19:00 ÀS 01:00	t	f	f	t	\N
21938	115	15	13:00 ÀS 19:00	t	f	f	t	\N
21939	115	15	19:00 ÀS 01:00	t	f	f	t	\N
21940	115	3	13:00 ÀS 19:00	t	f	f	t	\N
21941	115	3	19:00 ÀS 01:00	t	f	f	t	\N
21942	115	4	13:00 ÀS 19:00	t	f	f	t	\N
21943	115	4	19:00 ÀS 01:00	t	f	f	t	\N
21944	115	7	13:00 ÀS 19:00	t	f	f	t	\N
21945	115	7	19:00 ÀS 01:00	t	f	f	t	\N
21980	72	13	19:00 ÀS 01:00	t	f	t	t	\N
21981	72	13	01:00 ÀS 07:00	t	f	t	t	\N
21982	72	14	07:00 ÀS 13:00	t	f	t	t	\N
21983	72	14	13:00 ÀS 19:00	t	f	t	t	\N
21984	72	14	19:00 ÀS 01:00	t	f	t	t	\N
21985	72	14	01:00 ÀS 07:00	t	f	t	t	\N
21986	72	15	07:00 ÀS 13:00	t	f	t	t	\N
28439	172	5	07:00 ÀS 13:00	t	f	t	t	\N
28440	172	6	07:00 ÀS 13:00	t	f	t	t	\N
28441	172	6	13:00 ÀS 19:00	t	f	t	t	\N
28442	172	9	07:00 ÀS 13:00	t	f	t	t	\N
28445	173	21	07:00 ÀS 13:00	t	f	t	t	\N
28438	172	2	07:00 ÀS 13:00	t	f	t	t	\N
28446	173	21	13:00 ÀS 19:00	t	f	t	t	\N
28447	173	21	19:00 ÀS 01:00	t	f	t	t	\N
28448	173	22	07:00 ÀS 13:00	t	f	t	t	\N
28443	173	18	07:00 ÀS 13:00	t	f	t	t	\N
28444	173	18	13:00 ÀS 19:00	t	f	t	t	\N
22718	187	13	19:00 ÀS 01:00	t	f	t	t	\N
22719	187	13	01:00 ÀS 07:00	t	f	t	t	\N
22720	187	14	07:00 ÀS 13:00	t	f	t	t	\N
22721	187	14	13:00 ÀS 19:00	t	f	t	t	\N
22722	187	5	07:00 ÀS 13:00	t	f	t	t	\N
22723	187	5	13:00 ÀS 19:00	t	f	t	t	\N
22730	188	20	07:00 ÀS 13:00	t	f	t	t	\N
22731	188	20	13:00 ÀS 19:00	t	f	t	t	\N
22732	188	20	19:00 ÀS 01:00	t	f	t	t	\N
22712	187	12	07:00 ÀS 13:00	t	f	t	t	\N
22713	187	12	13:00 ÀS 19:00	t	f	t	t	\N
22714	187	12	19:00 ÀS 01:00	t	f	t	t	\N
22715	187	12	01:00 ÀS 07:00	t	f	t	t	\N
22716	187	13	07:00 ÀS 13:00	t	f	t	t	\N
22607	185	20	07:00 ÀS 13:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22609	185	21	07:00 ÀS 13:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22611	185	25	07:00 ÀS 13:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22613	185	25	19:00 ÀS 01:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22614	185	27	13:00 ÀS 19:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22616	185	28	13:00 ÀS 19:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22615	185	28	07:00 ÀS 13:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22618	185	29	07:00 ÀS 13:00	t	f	t	f	DESIST Req. nº  24008/2026-1° CIA
22894	191	18	07:00 ÀS 13:00	t	f	f	t	\N
22895	191	18	13:00 ÀS 19:00	t	f	f	t	\N
22896	191	18	19:00 ÀS 01:00	t	f	f	t	\N
22897	191	19	07:00 ÀS 13:00	t	f	f	t	\N
22066	166	30	07:00 ÀS 13:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22067	166	30	13:00 ÀS 19:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22068	166	30	19:00 ÀS 01:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22069	166	30	01:00 ÀS 07:00	t	f	f	f	DESIST TODOS OS DIAS (16 a 31)  Req. nº  25244/2026-COPOM
22891	191	16	07:00 ÀS 13:00	t	f	f	t	\N
22892	191	16	13:00 ÀS 19:00	t	f	f	t	\N
22893	191	16	19:00 ÀS 01:00	t	f	f	t	\N
22717	187	13	13:00 ÀS 19:00	t	f	t	t	\N
21987	72	15	13:00 ÀS 19:00	t	f	t	t	\N
21988	72	1	07:00 ÀS 13:00	t	f	t	t	\N
21989	72	1	13:00 ÀS 19:00	t	f	t	t	\N
21990	72	1	19:00 ÀS 01:00	t	f	t	t	\N
21991	72	1	01:00 ÀS 07:00	t	f	t	t	\N
21992	72	2	07:00 ÀS 13:00	t	f	t	t	\N
21993	72	2	13:00 ÀS 19:00	t	f	t	t	\N
21994	72	2	19:00 ÀS 01:00	t	f	t	t	\N
21995	72	6	07:00 ÀS 13:00	t	f	t	t	\N
21996	72	6	13:00 ÀS 19:00	t	f	t	t	\N
21997	72	9	01:00 ÀS 07:00	t	f	t	t	\N
22015	165	27	19:00 ÀS 01:00	t	f	t	t	\N
22016	165	27	01:00 ÀS 07:00	t	f	t	t	\N
22102	121	15	19:00 ÀS 01:00	t	f	t	t	\N
22103	121	15	01:00 ÀS 07:00	t	f	t	t	\N
22752	70	14	13:00 ÀS 19:00	t	f	t	t	\N
22733	188	20	01:00 ÀS 07:00	t	f	t	t	\N
22753	70	4	07:00 ÀS 13:00	t	f	t	t	\N
22754	70	4	19:00 ÀS 01:00	t	f	t	t	\N
22755	70	5	07:00 ÀS 13:00	t	f	t	t	\N
22756	70	5	13:00 ÀS 19:00	t	f	t	t	\N
22757	70	5	19:00 ÀS 01:00	t	f	t	t	\N
22770	189	24	07:00 ÀS 13:00	t	f	t	t	\N
22771	189	24	19:00 ÀS 01:00	t	f	t	t	\N
22772	189	25	07:00 ÀS 13:00	t	f	t	t	\N
22773	189	25	13:00 ÀS 19:00	t	f	t	t	\N
22774	189	25	19:00 ÀS 01:00	t	f	t	t	\N
22775	189	26	13:00 ÀS 19:00	t	f	t	t	\N
22746	70	10	13:00 ÀS 19:00	t	f	t	t	\N
22747	70	12	07:00 ÀS 13:00	t	f	t	t	\N
22748	70	12	19:00 ÀS 01:00	t	f	t	t	\N
22749	70	13	07:00 ÀS 13:00	t	f	t	t	\N
22750	70	13	13:00 ÀS 19:00	t	f	t	t	\N
22751	70	13	19:00 ÀS 01:00	t	f	t	t	\N
22776	189	28	07:00 ÀS 13:00	t	f	t	t	\N
22777	189	28	19:00 ÀS 01:00	t	f	t	t	\N
22778	189	29	07:00 ÀS 13:00	t	f	t	t	\N
22779	189	29	13:00 ÀS 19:00	t	f	t	t	\N
22780	189	29	19:00 ÀS 01:00	t	f	t	t	\N
22832	134	16	07:00 ÀS 13:00	t	f	t	t	\N
22803	74	11	13:00 ÀS 19:00	t	f	t	t	\N
22804	74	11	19:00 ÀS 01:00	t	f	t	t	\N
22805	74	12	07:00 ÀS 13:00	t	f	t	t	\N
22806	74	12	13:00 ÀS 19:00	t	f	t	t	\N
22807	74	12	19:00 ÀS 01:00	t	f	t	t	\N
22764	189	20	07:00 ÀS 13:00	t	f	t	t	\N
22765	189	20	19:00 ÀS 01:00	t	f	t	t	\N
22766	189	21	07:00 ÀS 13:00	t	f	t	t	\N
22767	189	21	13:00 ÀS 19:00	t	f	t	t	\N
22768	189	21	19:00 ÀS 01:00	t	f	t	t	\N
22769	189	22	13:00 ÀS 19:00	t	f	t	t	\N
22833	134	16	13:00 ÀS 19:00	t	f	t	t	\N
22834	134	16	19:00 ÀS 01:00	t	f	t	t	\N
22835	134	17	07:00 ÀS 13:00	t	f	t	t	\N
22836	134	17	13:00 ÀS 19:00	t	f	t	t	\N
22837	134	17	19:00 ÀS 01:00	t	f	t	t	\N
22838	134	19	13:00 ÀS 19:00	t	f	t	t	\N
22839	134	19	19:00 ÀS 01:00	t	f	t	t	\N
22840	134	20	07:00 ÀS 13:00	t	f	t	t	\N
22841	134	20	13:00 ÀS 19:00	t	f	t	t	\N
22842	134	20	19:00 ÀS 01:00	t	f	t	t	\N
22843	134	21	07:00 ÀS 13:00	t	f	t	t	\N
22808	74	13	07:00 ÀS 13:00	t	f	t	t	\N
22809	74	13	13:00 ÀS 19:00	t	f	t	t	\N
22810	74	13	19:00 ÀS 01:00	t	f	t	t	\N
22811	74	15	13:00 ÀS 19:00	t	f	t	t	\N
22812	74	15	19:00 ÀS 01:00	t	f	t	t	\N
22813	74	1	07:00 ÀS 13:00	t	f	t	t	\N
22814	74	1	13:00 ÀS 19:00	t	f	t	t	\N
22844	134	21	13:00 ÀS 19:00	t	f	t	t	\N
22845	134	21	19:00 ÀS 01:00	t	f	t	t	\N
22846	134	23	13:00 ÀS 19:00	t	f	t	t	\N
22847	134	23	19:00 ÀS 01:00	t	f	t	t	\N
22848	134	24	07:00 ÀS 13:00	t	f	t	t	\N
22849	134	24	13:00 ÀS 19:00	t	f	t	t	\N
22850	134	24	19:00 ÀS 01:00	t	f	t	t	\N
22851	134	25	07:00 ÀS 13:00	t	f	t	t	\N
22898	191	19	13:00 ÀS 19:00	t	f	f	t	\N
22899	191	19	19:00 ÀS 01:00	t	f	f	t	\N
22900	191	20	07:00 ÀS 13:00	t	f	f	t	\N
22901	191	20	13:00 ÀS 19:00	t	f	f	t	\N
22902	191	20	19:00 ÀS 01:00	t	f	f	t	\N
22903	191	22	07:00 ÀS 13:00	t	f	f	t	\N
22904	191	22	13:00 ÀS 19:00	t	f	f	t	\N
22905	191	22	19:00 ÀS 01:00	t	f	f	t	\N
22864	95	10	07:00 ÀS 13:00	t	f	t	t	\N
22865	95	10	13:00 ÀS 19:00	t	f	t	t	\N
22866	95	10	19:00 ÀS 01:00	t	f	t	t	\N
22867	95	11	07:00 ÀS 13:00	t	f	t	t	\N
22868	95	11	13:00 ÀS 19:00	t	f	t	t	\N
22869	95	11	19:00 ÀS 01:00	t	f	t	t	\N
22870	95	12	07:00 ÀS 13:00	t	f	t	t	\N
22871	95	12	13:00 ÀS 19:00	t	f	t	t	\N
22872	95	12	19:00 ÀS 01:00	t	f	t	t	\N
22873	95	15	07:00 ÀS 13:00	t	f	t	t	\N
22927	75	11	07:00 ÀS 13:00	t	f	t	t	\N
22928	75	11	13:00 ÀS 19:00	t	f	t	t	\N
22929	75	11	19:00 ÀS 01:00	t	f	t	t	\N
22930	75	11	01:00 ÀS 07:00	t	f	t	t	\N
22931	75	12	07:00 ÀS 13:00	t	f	t	t	\N
22932	75	12	13:00 ÀS 19:00	t	f	t	t	\N
22933	75	12	19:00 ÀS 01:00	t	f	t	t	\N
22934	75	12	01:00 ÀS 07:00	t	f	t	t	\N
22935	75	14	07:00 ÀS 13:00	t	f	t	t	\N
22936	75	14	13:00 ÀS 19:00	t	f	t	t	\N
22937	75	14	19:00 ÀS 01:00	t	f	t	t	\N
22938	75	14	01:00 ÀS 07:00	t	f	t	t	\N
22939	75	15	07:00 ÀS 13:00	t	f	t	t	\N
22940	75	15	13:00 ÀS 19:00	t	f	t	t	\N
22941	75	15	19:00 ÀS 01:00	t	f	t	t	\N
22963	192	16	07:00 ÀS 13:00	t	f	t	t	\N
22964	192	16	13:00 ÀS 19:00	t	f	t	t	\N
22965	192	16	19:00 ÀS 01:00	t	f	t	t	\N
22966	192	16	01:00 ÀS 07:00	t	f	t	t	\N
22967	192	18	07:00 ÀS 13:00	t	f	t	t	\N
22968	192	18	13:00 ÀS 19:00	t	f	t	t	\N
22969	192	19	07:00 ÀS 13:00	t	f	t	t	\N
22970	192	19	13:00 ÀS 19:00	t	f	t	t	\N
22971	192	19	19:00 ÀS 01:00	t	f	t	t	\N
22972	192	19	01:00 ÀS 07:00	t	f	t	t	\N
22942	75	15	01:00 ÀS 07:00	t	f	t	t	\N
22943	75	3	07:00 ÀS 13:00	t	f	t	t	\N
22944	75	3	13:00 ÀS 19:00	t	f	t	t	\N
22945	75	3	19:00 ÀS 01:00	t	f	t	t	\N
22946	75	3	01:00 ÀS 07:00	t	f	t	t	\N
22947	75	4	07:00 ÀS 13:00	t	f	t	t	\N
22948	75	4	13:00 ÀS 19:00	t	f	t	t	\N
22949	75	4	19:00 ÀS 01:00	t	f	t	t	\N
22950	75	4	01:00 ÀS 07:00	t	f	t	t	\N
22951	75	6	07:00 ÀS 13:00	t	f	t	t	\N
22952	75	6	13:00 ÀS 19:00	t	f	t	t	\N
22953	75	6	19:00 ÀS 01:00	t	f	t	t	\N
22954	75	6	01:00 ÀS 07:00	t	f	t	t	\N
22955	75	7	07:00 ÀS 13:00	t	f	t	t	\N
22119	121	8	01:00 ÀS 07:00	t	f	t	t	\N
22137	168	25	13:00 ÀS 19:00	t	f	t	t	\N
22138	168	25	19:00 ÀS 01:00	t	f	t	t	\N
22139	168	25	01:00 ÀS 07:00	t	f	t	t	\N
22140	168	27	07:00 ÀS 13:00	t	f	t	t	\N
22141	168	27	13:00 ÀS 19:00	t	f	t	t	\N
22142	168	27	19:00 ÀS 01:00	t	f	t	t	\N
22143	168	27	01:00 ÀS 07:00	t	f	t	t	\N
22144	168	28	07:00 ÀS 13:00	t	f	t	t	\N
22145	168	28	13:00 ÀS 19:00	t	f	t	t	\N
22146	168	28	19:00 ÀS 01:00	t	f	t	t	\N
22147	168	28	01:00 ÀS 07:00	t	f	t	t	\N
22148	168	29	07:00 ÀS 13:00	t	f	t	t	\N
22149	168	29	13:00 ÀS 19:00	t	f	t	t	\N
22150	168	29	19:00 ÀS 01:00	t	f	t	t	\N
22151	168	29	01:00 ÀS 07:00	t	f	t	t	\N
22973	192	20	07:00 ÀS 13:00	t	f	t	t	\N
22974	192	20	13:00 ÀS 19:00	t	f	t	t	\N
22975	192	20	19:00 ÀS 01:00	t	f	t	t	\N
22976	192	20	01:00 ÀS 07:00	t	f	t	t	\N
22977	192	22	07:00 ÀS 13:00	t	f	t	t	\N
22978	192	22	13:00 ÀS 19:00	t	f	t	t	\N
22979	192	23	07:00 ÀS 13:00	t	f	t	t	\N
22980	192	23	13:00 ÀS 19:00	t	f	t	t	\N
22981	192	24	07:00 ÀS 13:00	t	f	t	t	\N
22982	192	24	13:00 ÀS 19:00	t	f	t	t	\N
22983	192	26	07:00 ÀS 13:00	t	f	t	t	\N
22984	192	26	13:00 ÀS 19:00	t	f	t	t	\N
22985	192	26	19:00 ÀS 01:00	t	f	t	t	\N
22986	192	26	01:00 ÀS 07:00	t	f	t	t	\N
22987	192	27	07:00 ÀS 13:00	t	f	t	t	\N
28430	171	31	07:00 ÀS 13:00	t	f	f	t	\N
28431	171	31	13:00 ÀS 19:00	t	f	f	t	\N
28403	170	11	07:00 ÀS 13:00	t	f	t	t	\N
28404	170	11	13:00 ÀS 19:00	t	f	t	t	\N
28405	170	15	07:00 ÀS 13:00	t	f	t	t	\N
28406	170	15	13:00 ÀS 19:00	t	f	t	t	\N
28407	170	15	19:00 ÀS 01:00	t	f	t	t	\N
28574	180	20	07:00 ÀS 13:00	t	f	t	f	EXECUT SERV 20/05 Req. nº  25387/2026-1° CIA / RESERVA DE ARMAMENTO
28575	180	20	13:00 ÀS 19:00	t	f	t	f	EXECUT SERV 20/05 Req. nº  25387/2026-1° CIA / RESERVA DE ARMAMENTO
28576	180	20	19:00 ÀS 01:00	t	f	t	f	EXECUT SERV 20/05 Req. nº  25387/2026-1° CIA / RESERVA DE ARMAMENTO
28409	170	7	13:00 ÀS 19:00	t	f	t	t	\N
28410	170	7	19:00 ÀS 01:00	t	f	t	t	\N
28411	170	8	07:00 ÀS 13:00	t	f	t	t	\N
28412	170	8	13:00 ÀS 19:00	t	f	t	t	\N
28413	170	8	19:00 ÀS 01:00	t	f	t	t	\N
28432	171	31	19:00 ÀS 01:00	t	f	f	t	\N
28449	173	22	13:00 ÀS 19:00	t	f	t	t	\N
28450	173	25	07:00 ÀS 13:00	t	f	t	t	\N
28451	173	25	13:00 ÀS 19:00	t	f	t	t	\N
28452	173	25	19:00 ÀS 01:00	t	f	t	t	\N
28453	173	26	07:00 ÀS 13:00	t	f	t	t	\N
28454	173	29	07:00 ÀS 13:00	t	f	t	t	\N
28455	173	29	13:00 ÀS 19:00	t	f	t	t	\N
28456	173	29	19:00 ÀS 01:00	t	f	t	t	\N
30254	94	4	01:00 ÀS 07:00	t	f	t	t	\N
30255	94	5	07:00 ÀS 13:00	t	f	t	t	\N
30256	94	5	13:00 ÀS 19:00	t	f	t	t	\N
30257	94	5	19:00 ÀS 01:00	t	f	t	t	\N
30258	94	5	01:00 ÀS 07:00	t	f	t	t	\N
30259	94	7	07:00 ÀS 13:00	t	f	t	t	\N
30260	94	7	13:00 ÀS 19:00	t	f	t	t	\N
30261	94	7	19:00 ÀS 01:00	t	f	t	t	\N
30262	94	7	01:00 ÀS 07:00	t	f	t	t	\N
30263	94	8	07:00 ÀS 13:00	t	f	t	t	\N
30264	94	8	13:00 ÀS 19:00	t	f	t	t	\N
30265	94	8	19:00 ÀS 01:00	t	f	t	t	\N
30266	94	8	01:00 ÀS 07:00	t	f	t	t	\N
30267	94	9	07:00 ÀS 13:00	t	f	t	t	\N
30268	94	9	13:00 ÀS 19:00	t	f	t	t	\N
30269	94	9	19:00 ÀS 01:00	t	f	t	t	\N
30270	94	9	01:00 ÀS 07:00	t	f	t	t	\N
30285	174	20	19:00 ÀS 01:00	t	f	t	t	\N
30287	174	21	07:00 ÀS 13:00	t	f	t	t	\N
30288	174	21	13:00 ÀS 19:00	t	f	t	t	\N
30289	174	21	19:00 ÀS 01:00	t	f	t	t	\N
30290	174	21	01:00 ÀS 07:00	t	f	t	t	\N
30291	174	23	07:00 ÀS 13:00	t	f	t	t	\N
30292	174	23	13:00 ÀS 19:00	t	f	t	t	\N
30293	174	23	19:00 ÀS 01:00	t	f	t	t	\N
28563	117	8	07:00 ÀS 13:00	t	f	t	t	\N
28564	117	8	13:00 ÀS 19:00	t	f	t	t	\N
28565	117	8	19:00 ÀS 01:00	t	f	t	t	\N
28566	117	6	13:00 ÀS 19:00	t	f	t	t	\N
28567	117	7	13:00 ÀS 19:00	t	f	t	t	\N
28568	117	7	19:00 ÀS 01:00	t	f	t	t	\N
28581	180	27	07:00 ÀS 13:00	t	f	t	t	\N
28582	180	27	13:00 ÀS 19:00	t	f	t	t	\N
28583	180	27	19:00 ÀS 01:00	t	f	t	t	\N
28584	180	28	07:00 ÀS 13:00	t	f	t	t	\N
28585	180	28	13:00 ÀS 19:00	t	f	t	t	\N
28586	180	28	19:00 ÀS 01:00	t	f	t	t	\N
28587	180	31	13:00 ÀS 19:00	t	f	t	t	\N
28569	180	18	13:00 ÀS 19:00	t	f	t	t	\N
28570	180	18	19:00 ÀS 01:00	t	f	t	t	\N
28571	180	19	07:00 ÀS 13:00	t	f	t	t	\N
28572	180	19	13:00 ÀS 19:00	t	f	t	t	\N
28573	180	19	19:00 ÀS 01:00	t	f	t	t	\N
28550	117	11	13:00 ÀS 19:00	t	f	t	t	\N
28551	117	12	07:00 ÀS 13:00	t	f	t	t	\N
28552	117	12	13:00 ÀS 19:00	t	f	t	t	\N
28553	117	12	19:00 ÀS 01:00	t	f	t	t	\N
28554	117	14	13:00 ÀS 19:00	t	f	t	t	\N
28555	117	14	19:00 ÀS 01:00	t	f	t	t	\N
28556	117	15	07:00 ÀS 13:00	t	f	t	t	\N
28557	117	15	13:00 ÀS 19:00	t	f	t	t	\N
28558	117	15	19:00 ÀS 01:00	t	f	t	t	\N
28559	117	3	07:00 ÀS 13:00	t	f	t	t	\N
28560	117	4	07:00 ÀS 13:00	t	f	t	t	\N
28561	117	4	13:00 ÀS 19:00	t	f	t	t	\N
28562	117	4	19:00 ÀS 01:00	t	f	t	t	\N
28577	180	22	13:00 ÀS 19:00	t	f	t	t	\N
28578	180	22	19:00 ÀS 01:00	t	f	t	t	\N
28579	180	24	07:00 ÀS 13:00	t	f	t	t	\N
28580	180	26	13:00 ÀS 19:00	t	f	t	t	\N
30286	174	20	01:00 ÀS 07:00	t	f	t	t	\N
30294	174	23	01:00 ÀS 07:00	t	f	t	t	\N
30295	174	24	07:00 ÀS 13:00	t	f	t	t	\N
30296	174	24	13:00 ÀS 19:00	t	f	t	t	\N
30297	174	24	19:00 ÀS 01:00	t	f	t	t	\N
30298	174	24	01:00 ÀS 07:00	t	f	t	t	\N
30299	174	25	07:00 ÀS 13:00	t	f	t	t	\N
30300	174	25	13:00 ÀS 19:00	t	f	t	t	\N
30301	174	25	19:00 ÀS 01:00	t	f	t	t	\N
30302	174	25	01:00 ÀS 07:00	t	f	t	t	\N
30303	174	27	07:00 ÀS 13:00	t	f	t	t	\N
30304	174	27	13:00 ÀS 19:00	t	f	t	t	\N
30305	174	27	19:00 ÀS 01:00	t	f	t	t	\N
30306	174	27	01:00 ÀS 07:00	t	f	t	t	\N
30307	174	28	07:00 ÀS 13:00	t	f	t	t	\N
30308	174	28	13:00 ÀS 19:00	t	f	t	t	\N
30309	174	28	19:00 ÀS 01:00	t	f	t	t	\N
30310	174	28	01:00 ÀS 07:00	t	f	t	t	\N
30311	174	29	07:00 ÀS 13:00	t	f	t	t	\N
30312	174	29	13:00 ÀS 19:00	t	f	t	t	\N
30313	174	29	19:00 ÀS 01:00	t	f	t	t	\N
30314	174	29	01:00 ÀS 07:00	t	f	t	t	\N
30315	174	31	07:00 ÀS 13:00	t	f	t	t	\N
30316	174	31	13:00 ÀS 19:00	t	f	t	t	\N
30317	174	31	19:00 ÀS 01:00	t	f	t	t	\N
30318	174	31	01:00 ÀS 07:00	t	f	t	t	\N
22325	66	1	13:00 ÀS 19:00	t	f	t	t	\N
22326	66	1	19:00 ÀS 01:00	t	f	t	t	\N
22327	66	1	01:00 ÀS 07:00	t	f	t	t	\N
22357	176	23	13:00 ÀS 19:00	t	f	t	t	\N
22358	176	23	19:00 ÀS 01:00	t	f	t	t	\N
22359	176	23	01:00 ÀS 07:00	t	f	t	t	\N
22360	176	25	07:00 ÀS 13:00	t	f	t	t	\N
22361	176	25	13:00 ÀS 19:00	t	f	t	t	\N
22362	176	25	19:00 ÀS 01:00	t	f	t	t	\N
22363	176	25	01:00 ÀS 07:00	t	f	t	t	\N
22364	176	26	07:00 ÀS 13:00	t	f	t	t	\N
22365	176	26	13:00 ÀS 19:00	t	f	t	t	\N
22487	181	2	13:00 ÀS 19:00	t	f	f	t	\N
22488	181	6	13:00 ÀS 19:00	t	f	f	t	\N
22489	181	6	19:00 ÀS 01:00	t	f	f	t	\N
22482	181	7	07:00 ÀS 13:00	t	f	f	t	\N
22483	181	7	13:00 ÀS 19:00	t	f	f	t	\N
22484	181	7	19:00 ÀS 01:00	t	f	f	t	\N
22485	181	8	07:00 ÀS 13:00	t	f	f	t	\N
22486	181	8	13:00 ÀS 19:00	t	f	f	t	\N
22366	176	26	19:00 ÀS 01:00	t	f	t	t	\N
22367	176	26	01:00 ÀS 07:00	t	f	t	t	\N
22368	176	27	07:00 ÀS 13:00	t	f	t	t	\N
22369	176	27	13:00 ÀS 19:00	t	f	t	t	\N
22370	176	27	19:00 ÀS 01:00	t	f	t	t	\N
22371	176	27	01:00 ÀS 07:00	t	f	t	t	\N
22372	176	29	07:00 ÀS 13:00	t	f	t	t	\N
22373	176	29	13:00 ÀS 19:00	t	f	t	t	\N
22374	176	29	19:00 ÀS 01:00	t	f	t	t	\N
22375	176	29	01:00 ÀS 07:00	t	f	t	t	\N
22376	176	30	07:00 ÀS 13:00	t	f	t	t	\N
22377	176	30	13:00 ÀS 19:00	t	f	t	t	\N
22378	176	30	19:00 ÀS 01:00	t	f	t	t	\N
22379	176	30	01:00 ÀS 07:00	t	f	t	t	\N
22380	176	31	07:00 ÀS 13:00	t	f	t	t	\N
22381	176	31	13:00 ÀS 19:00	t	f	t	t	\N
22382	176	31	19:00 ÀS 01:00	t	f	t	t	\N
22383	176	31	01:00 ÀS 07:00	t	f	t	t	\N
22494	182	19	13:00 ÀS 19:00	t	f	t	t	\N
22495	182	19	19:00 ÀS 01:00	t	f	t	t	\N
22496	182	20	07:00 ÀS 13:00	t	f	t	t	\N
30348	124	5	07:00 ÀS 13:00	t	f	t	t	\N
30349	124	5	13:00 ÀS 19:00	t	f	t	t	\N
22497	182	20	13:00 ÀS 19:00	t	f	t	t	\N
22498	182	22	13:00 ÀS 19:00	t	f	t	t	\N
22499	182	22	19:00 ÀS 01:00	t	f	t	t	\N
22500	182	23	07:00 ÀS 13:00	t	f	t	t	\N
22501	182	23	13:00 ÀS 19:00	t	f	t	t	\N
22502	182	26	13:00 ÀS 19:00	t	f	t	t	\N
22503	182	26	19:00 ÀS 01:00	t	f	t	t	\N
22504	182	27	07:00 ÀS 13:00	t	f	t	t	\N
22505	182	27	13:00 ÀS 19:00	t	f	t	t	\N
22506	182	27	19:00 ÀS 01:00	t	f	t	t	\N
22507	182	28	07:00 ÀS 13:00	t	f	t	t	\N
22508	182	28	13:00 ÀS 19:00	t	f	t	t	\N
22509	182	30	13:00 ÀS 19:00	t	f	t	t	\N
22525	87	3	13:00 ÀS 19:00	t	f	t	t	\N
22526	87	3	19:00 ÀS 01:00	t	f	t	t	\N
22527	87	3	01:00 ÀS 07:00	t	f	t	t	\N
22528	87	5	19:00 ÀS 01:00	t	f	t	t	\N
22529	87	5	01:00 ÀS 07:00	t	f	t	t	\N
22530	87	6	19:00 ÀS 01:00	t	f	t	t	\N
22531	87	6	01:00 ÀS 07:00	t	f	t	t	\N
22550	183	29	19:00 ÀS 01:00	t	f	t	t	\N
22551	183	29	01:00 ÀS 07:00	t	f	t	t	\N
22552	183	30	07:00 ÀS 13:00	t	f	t	t	\N
22553	183	30	13:00 ÀS 19:00	t	f	t	t	\N
22554	183	30	19:00 ÀS 01:00	t	f	t	t	\N
22555	183	30	01:00 ÀS 07:00	t	f	t	t	\N
22556	183	31	07:00 ÀS 13:00	t	f	t	t	\N
22557	183	31	13:00 ÀS 19:00	t	f	t	t	\N
22558	183	31	19:00 ÀS 01:00	t	f	t	t	\N
22559	183	31	01:00 ÀS 07:00	t	f	t	t	\N
22572	91	8	13:00 ÀS 19:00	t	f	t	t	\N
22573	91	8	01:00 ÀS 07:00	t	f	t	t	\N
22574	91	1	01:00 ÀS 07:00	t	f	t	t	\N
30350	124	5	19:00 ÀS 01:00	t	f	t	t	\N
30351	124	5	01:00 ÀS 07:00	t	f	t	t	\N
30352	124	7	07:00 ÀS 13:00	t	f	t	t	\N
30353	124	7	13:00 ÀS 19:00	t	f	t	t	\N
30354	124	7	19:00 ÀS 01:00	t	f	t	t	\N
30355	124	7	01:00 ÀS 07:00	t	f	t	t	\N
30356	124	8	07:00 ÀS 13:00	t	f	t	t	\N
30357	124	8	13:00 ÀS 19:00	t	f	t	t	\N
30358	124	8	19:00 ÀS 01:00	t	f	t	t	\N
30359	124	8	01:00 ÀS 07:00	t	f	t	t	\N
30360	124	9	07:00 ÀS 13:00	t	f	t	t	\N
30361	124	9	13:00 ÀS 19:00	t	f	t	t	\N
30362	124	9	19:00 ÀS 01:00	t	f	t	t	\N
30363	124	9	01:00 ÀS 07:00	t	f	t	t	\N
30377	133	20	13:00 ÀS 19:00	t	f	t	t	\N
30378	133	20	19:00 ÀS 01:00	t	f	t	t	\N
30379	133	20	01:00 ÀS 07:00	t	f	t	t	\N
30380	133	21	07:00 ÀS 13:00	t	f	t	t	\N
30381	133	21	13:00 ÀS 19:00	t	f	t	t	\N
30382	133	21	19:00 ÀS 01:00	t	f	t	t	\N
30383	133	21	01:00 ÀS 07:00	t	f	t	t	\N
30384	133	23	07:00 ÀS 13:00	t	f	t	t	\N
30385	133	23	13:00 ÀS 19:00	t	f	t	t	\N
30386	133	23	19:00 ÀS 01:00	t	f	t	t	\N
30387	133	23	01:00 ÀS 07:00	t	f	t	t	\N
30388	133	24	07:00 ÀS 13:00	t	f	t	t	\N
30389	133	24	13:00 ÀS 19:00	t	f	t	t	\N
30390	133	24	19:00 ÀS 01:00	t	f	t	t	\N
30391	133	24	01:00 ÀS 07:00	t	f	t	t	\N
30392	133	25	07:00 ÀS 13:00	t	f	t	t	\N
30393	133	25	13:00 ÀS 19:00	t	f	t	t	\N
30394	133	25	19:00 ÀS 01:00	t	f	t	t	\N
30395	133	25	01:00 ÀS 07:00	t	f	t	t	\N
30396	133	27	07:00 ÀS 13:00	t	f	t	t	\N
30397	133	27	13:00 ÀS 19:00	t	f	t	t	\N
30398	133	27	19:00 ÀS 01:00	t	f	t	t	\N
30399	133	27	01:00 ÀS 07:00	t	f	t	t	\N
30400	133	28	07:00 ÀS 13:00	t	f	t	t	\N
30401	133	28	13:00 ÀS 19:00	t	f	t	t	\N
30402	133	28	19:00 ÀS 01:00	t	f	t	t	\N
30403	133	28	01:00 ÀS 07:00	t	f	t	t	\N
30404	133	29	07:00 ÀS 13:00	t	f	t	t	\N
28682	93	14	07:00 ÀS 13:00	t	f	t	t	\N
28683	93	14	13:00 ÀS 19:00	t	f	t	t	\N
28684	93	14	19:00 ÀS 01:00	t	f	t	t	\N
28685	93	15	07:00 ÀS 13:00	t	f	t	t	\N
28686	93	15	13:00 ÀS 19:00	t	f	t	t	\N
28687	93	6	07:00 ÀS 13:00	t	f	t	t	\N
28688	93	6	13:00 ÀS 19:00	t	f	t	t	\N
28689	93	6	19:00 ÀS 01:00	t	f	t	t	\N
28690	93	7	07:00 ÀS 13:00	t	f	t	t	\N
28691	93	7	13:00 ÀS 19:00	t	f	t	t	\N
28692	93	5	13:00 ÀS 19:00	t	f	t	t	\N
28694	190	18	13:00 ÀS 19:00	t	f	t	t	\N
28693	190	18	07:00 ÀS 13:00	t	f	t	t	\N
28680	93	13	13:00 ÀS 19:00	t	f	t	t	\N
28681	93	13	19:00 ÀS 01:00	t	f	t	t	\N
28695	190	18	19:00 ÀS 01:00	t	f	t	t	\N
28696	190	19	07:00 ÀS 13:00	t	f	t	t	\N
28697	190	19	13:00 ÀS 19:00	t	f	t	t	\N
28698	190	31	07:00 ÀS 13:00	t	f	t	t	\N
28699	190	31	13:00 ÀS 19:00	t	f	t	t	\N
28700	190	31	19:00 ÀS 01:00	t	f	t	t	\N
30405	133	29	13:00 ÀS 19:00	t	f	t	t	\N
30406	133	29	19:00 ÀS 01:00	t	f	t	t	\N
30407	133	29	01:00 ÀS 07:00	t	f	t	t	\N
30408	133	31	07:00 ÀS 13:00	t	f	t	t	\N
30409	133	31	13:00 ÀS 19:00	t	f	t	t	\N
30410	133	31	19:00 ÀS 01:00	t	f	t	t	\N
30411	133	31	01:00 ÀS 07:00	t	f	t	t	\N
22724	187	5	19:00 ÀS 01:00	t	f	t	t	\N
22725	187	5	01:00 ÀS 07:00	t	f	t	t	\N
22726	187	6	07:00 ÀS 13:00	t	f	t	t	\N
22727	187	6	13:00 ÀS 19:00	t	f	t	t	\N
22728	187	6	19:00 ÀS 01:00	t	f	t	t	\N
22729	187	6	01:00 ÀS 07:00	t	f	t	t	\N
22734	188	21	07:00 ÀS 13:00	t	f	t	t	\N
22735	188	21	13:00 ÀS 19:00	t	f	t	t	\N
22736	188	28	07:00 ÀS 13:00	t	f	t	t	\N
22737	188	28	13:00 ÀS 19:00	t	f	t	t	\N
23495	80	4	07:00 ÀS 13:00	t	f	t	t	\N
23496	80	4	13:00 ÀS 19:00	t	f	t	t	\N
23497	80	7	07:00 ÀS 13:00	t	f	t	t	\N
23498	80	7	13:00 ÀS 19:00	t	f	t	t	\N
22738	188	28	19:00 ÀS 01:00	t	f	t	t	\N
22739	188	28	01:00 ÀS 07:00	t	f	t	t	\N
23501	80	6	13:00 ÀS 19:00	t	f	t	t	\N
22740	188	29	07:00 ÀS 13:00	t	f	t	t	\N
22741	188	29	13:00 ÀS 19:00	t	f	t	t	\N
22742	188	29	19:00 ÀS 01:00	t	f	t	t	\N
22743	188	29	01:00 ÀS 07:00	t	f	t	t	\N
22744	188	30	07:00 ÀS 13:00	t	f	t	t	\N
22745	188	30	13:00 ÀS 19:00	t	f	t	t	\N
23510	202	24	07:00 ÀS 13:00	t	f	t	t	\N
23511	202	24	13:00 ÀS 19:00	t	f	t	t	\N
22758	70	8	07:00 ÀS 13:00	t	f	t	t	\N
22759	70	8	19:00 ÀS 01:00	t	f	t	t	\N
22760	70	9	07:00 ÀS 13:00	t	f	t	t	\N
22761	70	9	13:00 ÀS 19:00	t	f	t	t	\N
22762	70	9	19:00 ÀS 01:00	t	f	t	t	\N
22763	70	6	13:00 ÀS 19:00	t	f	t	t	\N
22781	189	30	13:00 ÀS 19:00	t	f	t	t	\N
22815	74	1	19:00 ÀS 01:00	t	f	t	t	\N
22816	74	4	07:00 ÀS 13:00	t	f	t	t	\N
22817	74	4	13:00 ÀS 19:00	t	f	t	t	\N
22818	74	4	19:00 ÀS 01:00	t	f	t	t	\N
22819	74	5	07:00 ÀS 13:00	t	f	t	t	\N
22820	74	5	13:00 ÀS 19:00	t	f	t	t	\N
22821	74	5	19:00 ÀS 01:00	t	f	t	t	\N
22822	74	8	07:00 ÀS 13:00	t	f	t	t	\N
22823	74	8	13:00 ÀS 19:00	t	f	t	t	\N
22824	74	8	19:00 ÀS 01:00	t	f	t	t	\N
22825	74	9	07:00 ÀS 13:00	t	f	t	t	\N
22826	74	9	13:00 ÀS 19:00	t	f	t	t	\N
22827	74	9	19:00 ÀS 01:00	t	f	t	t	\N
22828	74	3	13:00 ÀS 19:00	t	f	t	t	\N
22829	74	3	19:00 ÀS 01:00	t	f	t	t	\N
22830	74	7	13:00 ÀS 19:00	t	f	t	t	\N
22831	74	7	19:00 ÀS 01:00	t	f	t	t	\N
22852	134	25	13:00 ÀS 19:00	t	f	t	t	\N
22853	134	25	19:00 ÀS 01:00	t	f	t	t	\N
22854	134	27	13:00 ÀS 19:00	t	f	t	t	\N
22855	134	27	19:00 ÀS 01:00	t	f	t	t	\N
22856	134	28	07:00 ÀS 13:00	t	f	t	t	\N
22858	134	28	19:00 ÀS 01:00	t	f	t	t	\N
23552	203	16	07:00 ÀS 13:00	t	f	t	t	\N
23520	109	15	07:00 ÀS 13:00	t	f	t	t	\N
23570	203	21	19:00 ÀS 01:00	t	f	t	t	\N
23571	203	21	01:00 ÀS 07:00	t	f	t	t	\N
23572	203	23	07:00 ÀS 13:00	t	f	t	t	\N
23553	203	16	13:00 ÀS 19:00	t	f	t	t	\N
23554	203	16	19:00 ÀS 01:00	t	f	t	t	\N
23555	203	16	01:00 ÀS 07:00	t	f	t	t	\N
23556	203	17	07:00 ÀS 13:00	t	f	t	t	\N
23557	203	17	13:00 ÀS 19:00	t	f	t	t	\N
23558	203	17	19:00 ÀS 01:00	t	f	t	t	\N
23559	203	17	01:00 ÀS 07:00	t	f	t	t	\N
23560	203	19	07:00 ÀS 13:00	t	f	t	t	\N
23561	203	19	13:00 ÀS 19:00	t	f	t	t	\N
23562	203	19	19:00 ÀS 01:00	t	f	t	t	\N
23563	203	19	01:00 ÀS 07:00	t	f	t	t	\N
23564	203	20	07:00 ÀS 13:00	t	f	t	t	\N
23565	203	20	13:00 ÀS 19:00	t	f	t	t	\N
23566	203	20	19:00 ÀS 01:00	t	f	t	t	\N
23567	203	20	01:00 ÀS 07:00	t	f	t	t	\N
23568	203	21	07:00 ÀS 13:00	t	f	t	t	\N
23569	203	21	13:00 ÀS 19:00	t	f	t	t	\N
13480	62	18	13:00 ÀS 19:00	t	f	t	t	\N
13481	62	19	07:00 ÀS 13:00	t	f	t	t	\N
13482	62	21	07:00 ÀS 13:00	t	f	t	t	\N
13483	62	22	07:00 ÀS 13:00	t	f	t	t	\N
13484	62	22	13:00 ÀS 19:00	t	f	t	t	\N
13485	62	22	19:00 ÀS 01:00	t	f	t	t	\N
13486	62	23	07:00 ÀS 13:00	t	f	t	t	\N
13487	62	23	13:00 ÀS 19:00	t	f	t	t	\N
13488	62	23	19:00 ÀS 01:00	t	f	t	t	\N
13489	62	27	07:00 ÀS 13:00	t	f	t	t	\N
13490	62	27	13:00 ÀS 19:00	t	f	t	t	\N
13491	62	27	19:00 ÀS 01:00	t	f	t	t	\N
13492	62	29	07:00 ÀS 13:00	t	f	t	t	\N
13493	62	29	13:00 ÀS 19:00	t	f	t	t	\N
13494	62	29	19:00 ÀS 01:00	t	f	t	t	\N
13495	62	30	07:00 ÀS 13:00	t	f	t	t	\N
13496	62	30	13:00 ÀS 19:00	t	f	t	t	\N
13497	62	30	19:00 ÀS 01:00	t	f	t	t	\N
13498	63	17	07:00 ÀS 13:00	t	f	t	t	\N
13499	63	17	13:00 ÀS 19:00	t	f	t	t	\N
13500	63	17	19:00 ÀS 01:00	t	f	t	t	\N
13501	63	17	01:00 ÀS 07:00	t	f	t	t	\N
13502	63	18	07:00 ÀS 13:00	t	f	t	t	\N
13503	63	18	13:00 ÀS 19:00	t	f	t	t	\N
13504	63	18	19:00 ÀS 01:00	t	f	t	t	\N
13505	63	18	01:00 ÀS 07:00	t	f	t	t	\N
13506	63	19	07:00 ÀS 13:00	t	f	t	t	\N
13507	63	19	13:00 ÀS 19:00	t	f	t	t	\N
13508	63	19	19:00 ÀS 01:00	t	f	t	t	\N
13509	63	19	01:00 ÀS 07:00	t	f	t	t	\N
13510	63	21	07:00 ÀS 13:00	t	f	t	t	\N
13511	63	21	13:00 ÀS 19:00	t	f	t	t	\N
13512	63	21	19:00 ÀS 01:00	t	f	t	t	\N
13513	63	21	01:00 ÀS 07:00	t	f	t	t	\N
23613	111	3	01:00 ÀS 07:00	t	f	t	t	\N
23626	204	30	19:00 ÀS 01:00	t	f	t	t	\N
23627	204	30	01:00 ÀS 07:00	t	f	t	t	\N
23638	206	19	13:00 ÀS 19:00	t	f	f	t	\N
23639	206	19	19:00 ÀS 01:00	t	f	f	t	\N
23640	206	20	13:00 ÀS 19:00	t	f	f	t	\N
23641	206	20	19:00 ÀS 01:00	t	f	f	t	\N
23642	206	21	13:00 ÀS 19:00	t	f	f	t	\N
23643	206	26	13:00 ÀS 19:00	t	f	f	t	\N
23644	206	26	19:00 ÀS 01:00	t	f	f	t	\N
23645	206	27	13:00 ÀS 19:00	t	f	f	t	\N
23646	206	27	19:00 ÀS 01:00	t	f	f	t	\N
23647	206	28	13:00 ÀS 19:00	t	f	f	t	\N
23614	204	19	13:00 ÀS 19:00	t	f	t	t	\N
23600	111	11	13:00 ÀS 19:00	t	f	t	t	\N
23601	111	11	19:00 ÀS 01:00	t	f	t	t	\N
23602	111	11	01:00 ÀS 07:00	t	f	t	t	\N
23603	111	14	07:00 ÀS 13:00	t	f	t	t	\N
23604	111	14	13:00 ÀS 19:00	t	f	t	t	\N
23605	111	14	19:00 ÀS 01:00	t	f	t	t	\N
23606	111	14	01:00 ÀS 07:00	t	f	t	t	\N
23607	111	6	07:00 ÀS 13:00	t	f	t	t	\N
23608	111	6	13:00 ÀS 19:00	t	f	t	t	\N
23609	111	6	19:00 ÀS 01:00	t	f	t	t	\N
23610	111	6	01:00 ÀS 07:00	t	f	t	t	\N
23611	111	3	13:00 ÀS 19:00	t	f	t	t	\N
23612	111	3	19:00 ÀS 01:00	t	f	t	t	\N
23628	205	12	13:00 ÀS 19:00	t	f	f	t	\N
23629	205	12	19:00 ÀS 01:00	t	f	f	t	\N
23615	204	19	19:00 ÀS 01:00	t	f	t	t	\N
23616	204	19	01:00 ÀS 07:00	t	f	t	t	\N
23617	204	22	07:00 ÀS 13:00	t	f	t	t	\N
23618	204	22	13:00 ÀS 19:00	t	f	t	t	\N
23619	204	22	19:00 ÀS 01:00	t	f	t	t	\N
23620	204	22	01:00 ÀS 07:00	t	f	t	t	\N
23621	204	27	13:00 ÀS 19:00	t	f	t	t	\N
23622	204	27	19:00 ÀS 01:00	t	f	t	t	\N
23623	204	27	01:00 ÀS 07:00	t	f	t	t	\N
23624	204	30	07:00 ÀS 13:00	t	f	t	t	\N
23625	204	30	13:00 ÀS 19:00	t	f	t	t	\N
23630	205	13	13:00 ÀS 19:00	t	f	f	t	\N
23631	205	13	19:00 ÀS 01:00	t	f	f	t	\N
23632	205	14	13:00 ÀS 19:00	t	f	f	t	\N
23633	205	5	13:00 ÀS 19:00	t	f	f	t	\N
23634	205	5	19:00 ÀS 01:00	t	f	f	t	\N
23635	205	6	13:00 ÀS 19:00	t	f	f	t	\N
23636	205	6	19:00 ÀS 01:00	t	f	f	t	\N
23637	205	7	13:00 ÀS 19:00	t	f	f	t	\N
23648	64	15	13:00 ÀS 19:00	t	f	t	t	\N
23649	64	15	19:00 ÀS 01:00	t	f	t	t	\N
23650	64	6	07:00 ÀS 13:00	t	f	t	t	\N
23651	64	6	13:00 ÀS 19:00	t	f	t	t	\N
23652	64	6	19:00 ÀS 01:00	t	f	t	t	\N
23653	64	6	01:00 ÀS 07:00	t	f	t	t	\N
23654	64	7	07:00 ÀS 13:00	t	f	t	t	\N
23655	64	7	13:00 ÀS 19:00	t	f	t	t	\N
23656	64	7	19:00 ÀS 01:00	t	f	t	t	\N
23657	64	1	13:00 ÀS 19:00	t	f	t	t	\N
23658	64	1	19:00 ÀS 01:00	t	f	t	t	\N
13514	63	22	07:00 ÀS 13:00	t	f	t	t	\N
13515	63	22	13:00 ÀS 19:00	t	f	t	t	\N
13516	63	22	19:00 ÀS 01:00	t	f	t	t	\N
13517	63	22	01:00 ÀS 07:00	t	f	t	t	\N
13518	63	23	07:00 ÀS 13:00	t	f	t	t	\N
13519	63	23	13:00 ÀS 19:00	t	f	t	t	\N
13520	63	23	19:00 ÀS 01:00	t	f	t	t	\N
13521	63	23	01:00 ÀS 07:00	t	f	t	t	\N
13522	63	25	07:00 ÀS 13:00	t	f	t	t	\N
13523	63	25	13:00 ÀS 19:00	t	f	t	t	\N
13524	63	25	19:00 ÀS 01:00	t	f	t	t	\N
13525	63	25	01:00 ÀS 07:00	t	f	t	t	\N
13526	63	26	07:00 ÀS 13:00	t	f	t	t	\N
13527	63	26	13:00 ÀS 19:00	t	f	t	t	\N
13528	63	26	19:00 ÀS 01:00	t	f	t	t	\N
13529	63	26	01:00 ÀS 07:00	t	f	t	t	\N
13530	63	27	07:00 ÀS 13:00	t	f	t	t	\N
13531	63	27	13:00 ÀS 19:00	t	f	t	t	\N
13532	63	27	19:00 ÀS 01:00	t	f	t	t	\N
13533	63	27	01:00 ÀS 07:00	t	f	t	t	\N
13534	63	29	07:00 ÀS 13:00	t	f	t	t	\N
13535	63	29	13:00 ÀS 19:00	t	f	t	t	\N
13536	63	29	19:00 ÀS 01:00	t	f	t	t	\N
13537	63	29	01:00 ÀS 07:00	t	f	t	t	\N
13538	63	30	07:00 ÀS 13:00	t	f	t	t	\N
13539	63	30	13:00 ÀS 19:00	t	f	t	t	\N
13540	63	30	19:00 ÀS 01:00	t	f	t	t	\N
13541	63	30	01:00 ÀS 07:00	t	f	t	t	\N
13542	64	16	07:00 ÀS 13:00	t	f	t	t	\N
13543	64	16	13:00 ÀS 19:00	t	f	t	t	\N
13544	64	16	19:00 ÀS 01:00	t	f	t	t	\N
13545	64	16	01:00 ÀS 07:00	t	f	t	t	\N
13546	64	17	07:00 ÀS 13:00	t	f	t	t	\N
13547	64	17	13:00 ÀS 19:00	t	f	t	t	\N
13548	64	17	19:00 ÀS 01:00	t	f	t	t	\N
13549	64	19	13:00 ÀS 19:00	t	f	t	t	\N
13550	64	19	19:00 ÀS 01:00	t	f	t	t	\N
13551	64	19	01:00 ÀS 07:00	t	f	t	t	\N
13552	64	20	07:00 ÀS 13:00	t	f	t	t	\N
13553	64	20	13:00 ÀS 19:00	t	f	t	t	\N
13554	64	20	19:00 ÀS 01:00	t	f	t	t	\N
13555	64	20	01:00 ÀS 07:00	t	f	t	t	\N
13556	64	21	07:00 ÀS 13:00	t	f	t	t	\N
13557	64	21	13:00 ÀS 19:00	t	f	t	t	\N
13558	64	21	19:00 ÀS 01:00	t	f	t	t	\N
13559	64	23	13:00 ÀS 19:00	t	f	t	t	\N
13560	64	23	19:00 ÀS 01:00	t	f	t	t	\N
13561	64	23	01:00 ÀS 07:00	t	f	t	t	\N
13562	64	24	07:00 ÀS 13:00	t	f	t	t	\N
13563	64	24	13:00 ÀS 19:00	t	f	t	t	\N
13564	64	24	19:00 ÀS 01:00	t	f	t	t	\N
13565	64	24	01:00 ÀS 07:00	t	f	t	t	\N
13566	64	25	07:00 ÀS 13:00	t	f	t	t	\N
13567	64	25	13:00 ÀS 19:00	t	f	t	t	\N
13568	64	25	19:00 ÀS 01:00	t	f	t	t	\N
13569	64	27	13:00 ÀS 19:00	t	f	t	t	\N
13570	64	27	19:00 ÀS 01:00	t	f	t	t	\N
13571	64	27	01:00 ÀS 07:00	t	f	t	t	\N
13572	64	28	07:00 ÀS 13:00	t	f	t	t	\N
13573	64	28	13:00 ÀS 19:00	t	f	t	t	\N
13574	64	28	19:00 ÀS 01:00	t	f	t	t	\N
13575	64	28	01:00 ÀS 07:00	t	f	t	t	\N
13576	64	29	07:00 ÀS 13:00	t	f	t	t	\N
13577	64	29	13:00 ÀS 19:00	t	f	t	t	\N
13578	64	29	19:00 ÀS 01:00	t	f	t	t	\N
13579	65	18	13:00 ÀS 19:00	t	f	t	t	\N
13580	65	18	19:00 ÀS 01:00	t	f	t	t	\N
13581	65	19	07:00 ÀS 13:00	t	f	t	t	\N
13582	65	19	13:00 ÀS 19:00	t	f	t	t	\N
13583	65	19	19:00 ÀS 01:00	t	f	t	t	\N
13584	65	19	01:00 ÀS 07:00	t	f	t	t	\N
13585	65	20	07:00 ÀS 13:00	t	f	t	t	\N
13586	65	20	13:00 ÀS 19:00	t	f	t	t	\N
13587	65	20	19:00 ÀS 01:00	t	f	t	t	\N
13588	65	20	01:00 ÀS 07:00	t	f	t	t	\N
13589	65	22	07:00 ÀS 13:00	t	f	t	t	\N
13590	65	22	13:00 ÀS 19:00	t	f	t	t	\N
13591	65	22	19:00 ÀS 01:00	t	f	t	t	\N
13592	65	22	01:00 ÀS 07:00	t	f	t	t	\N
13593	65	23	07:00 ÀS 13:00	t	f	t	t	\N
13594	65	23	13:00 ÀS 19:00	t	f	t	t	\N
13595	65	23	19:00 ÀS 01:00	t	f	t	t	\N
13596	65	26	13:00 ÀS 19:00	t	f	t	t	\N
13597	65	26	19:00 ÀS 01:00	t	f	t	t	\N
13598	65	27	07:00 ÀS 13:00	t	f	t	t	\N
13599	65	27	13:00 ÀS 19:00	t	f	t	t	\N
13600	65	27	19:00 ÀS 01:00	t	f	t	t	\N
13601	65	27	01:00 ÀS 07:00	t	f	t	t	\N
13602	65	28	07:00 ÀS 13:00	t	f	t	t	\N
13603	65	28	13:00 ÀS 19:00	t	f	t	t	\N
13604	65	28	19:00 ÀS 01:00	t	f	t	t	\N
13605	65	28	01:00 ÀS 07:00	t	f	t	t	\N
13606	65	30	07:00 ÀS 13:00	t	f	t	t	\N
13607	65	30	13:00 ÀS 19:00	t	f	t	t	\N
13608	65	30	19:00 ÀS 01:00	t	f	t	t	\N
13609	65	30	01:00 ÀS 07:00	t	f	t	t	\N
13610	66	16	07:00 ÀS 13:00	t	f	t	t	\N
13611	66	16	13:00 ÀS 19:00	t	f	t	t	\N
13612	66	16	19:00 ÀS 01:00	t	f	t	t	\N
13613	66	16	01:00 ÀS 07:00	t	f	t	t	\N
13614	66	20	07:00 ÀS 13:00	t	f	t	t	\N
13615	66	20	13:00 ÀS 19:00	t	f	t	t	\N
13616	66	20	19:00 ÀS 01:00	t	f	t	t	\N
13617	66	20	01:00 ÀS 07:00	t	f	t	t	\N
13618	66	21	07:00 ÀS 13:00	t	f	t	t	\N
13619	66	21	13:00 ÀS 19:00	t	f	t	t	\N
13620	66	21	19:00 ÀS 01:00	t	f	t	t	\N
13621	66	21	01:00 ÀS 07:00	t	f	t	t	\N
13622	66	24	07:00 ÀS 13:00	t	f	t	t	\N
13623	66	24	13:00 ÀS 19:00	t	f	t	t	\N
13624	66	24	19:00 ÀS 01:00	t	f	t	t	\N
13625	66	24	01:00 ÀS 07:00	t	f	t	t	\N
13626	67	17	07:00 ÀS 13:00	t	f	t	t	\N
13627	67	17	13:00 ÀS 19:00	t	f	t	t	\N
13628	67	18	07:00 ÀS 13:00	t	f	t	t	\N
13629	67	18	13:00 ÀS 19:00	t	f	t	t	\N
13630	67	21	07:00 ÀS 13:00	t	f	t	t	\N
13631	67	21	13:00 ÀS 19:00	t	f	t	t	\N
13632	67	22	07:00 ÀS 13:00	t	f	t	t	\N
13633	67	22	13:00 ÀS 19:00	t	f	t	t	\N
13634	67	25	07:00 ÀS 13:00	t	f	t	t	\N
13635	67	25	13:00 ÀS 19:00	t	f	t	t	\N
13636	67	29	07:00 ÀS 13:00	t	f	t	t	\N
13637	67	29	13:00 ÀS 19:00	t	f	t	t	\N
13640	68	18	13:00 ÀS 19:00	t	f	f	t	\N
13641	68	18	19:00 ÀS 01:00	t	f	f	t	\N
13642	68	19	07:00 ÀS 13:00	t	f	f	t	\N
13643	68	19	13:00 ÀS 19:00	t	f	f	t	\N
13638	67	30	07:00 ÀS 13:00	t	f	t	f	DESIST VOLUNTARIEDADE Req. nº 25098/2026-1 CIA
13639	67	30	13:00 ÀS 19:00	t	f	t	f	DESIST VOLUNTARIEDADE Req. nº 25098/2026-1 CIA
13644	68	21	13:00 ÀS 19:00	t	f	f	t	\N
13645	68	21	19:00 ÀS 01:00	t	f	f	t	\N
13646	68	22	07:00 ÀS 13:00	t	f	f	t	\N
13647	68	22	13:00 ÀS 19:00	t	f	f	t	\N
13648	68	22	19:00 ÀS 01:00	t	f	f	t	\N
13649	68	23	07:00 ÀS 13:00	t	f	f	t	\N
13650	68	23	13:00 ÀS 19:00	t	f	f	t	\N
13651	68	26	13:00 ÀS 19:00	t	f	f	t	\N
13652	68	26	19:00 ÀS 01:00	t	f	f	t	\N
13653	68	27	07:00 ÀS 13:00	t	f	f	t	\N
13654	68	27	13:00 ÀS 19:00	t	f	f	t	\N
13655	68	29	13:00 ÀS 19:00	t	f	f	t	\N
13656	68	29	19:00 ÀS 01:00	t	f	f	t	\N
13657	68	30	07:00 ÀS 13:00	t	f	f	t	\N
13658	68	30	13:00 ÀS 19:00	t	f	f	t	\N
13659	68	30	19:00 ÀS 01:00	t	f	f	t	\N
13660	69	17	07:00 ÀS 13:00	t	f	t	t	\N
13661	69	17	13:00 ÀS 19:00	t	f	t	t	\N
13662	69	17	19:00 ÀS 01:00	t	f	t	t	\N
13663	69	17	01:00 ÀS 07:00	t	f	t	t	\N
13664	69	19	13:00 ÀS 19:00	t	f	t	t	\N
13665	69	19	19:00 ÀS 01:00	t	f	t	t	\N
13666	69	19	01:00 ÀS 07:00	t	f	t	t	\N
13667	69	24	07:00 ÀS 13:00	t	f	t	t	\N
13668	69	24	13:00 ÀS 19:00	t	f	t	t	\N
13669	69	24	19:00 ÀS 01:00	t	f	t	t	\N
13670	69	24	01:00 ÀS 07:00	t	f	t	t	\N
13671	69	25	07:00 ÀS 13:00	t	f	t	t	\N
13672	69	25	13:00 ÀS 19:00	t	f	t	t	\N
13673	69	25	19:00 ÀS 01:00	t	f	t	t	\N
13674	69	25	01:00 ÀS 07:00	t	f	t	t	\N
13675	70	22	07:00 ÀS 13:00	t	f	t	t	\N
13676	70	22	13:00 ÀS 19:00	t	f	t	t	\N
13677	70	22	19:00 ÀS 01:00	t	f	t	t	\N
13678	70	23	07:00 ÀS 13:00	t	f	t	t	\N
13679	70	23	13:00 ÀS 19:00	t	f	t	t	\N
13680	70	23	19:00 ÀS 01:00	t	f	t	t	\N
13681	70	26	07:00 ÀS 13:00	t	f	t	t	\N
13682	70	26	13:00 ÀS 19:00	t	f	t	t	\N
13683	70	26	19:00 ÀS 01:00	t	f	t	t	\N
13684	70	27	07:00 ÀS 13:00	t	f	t	t	\N
13685	70	27	13:00 ÀS 19:00	t	f	t	t	\N
13686	70	27	19:00 ÀS 01:00	t	f	t	t	\N
13687	70	30	07:00 ÀS 13:00	t	f	t	t	\N
13688	70	30	13:00 ÀS 19:00	t	f	t	t	\N
13689	70	30	19:00 ÀS 01:00	t	f	t	t	\N
13690	71	17	07:00 ÀS 13:00	t	f	t	t	\N
13691	71	17	13:00 ÀS 19:00	t	f	t	t	\N
13692	71	20	07:00 ÀS 13:00	t	f	t	t	\N
13693	71	20	13:00 ÀS 19:00	t	f	t	t	\N
13694	71	27	07:00 ÀS 13:00	t	f	t	t	\N
13695	71	27	13:00 ÀS 19:00	t	f	t	t	\N
13696	71	29	07:00 ÀS 13:00	t	f	t	t	\N
13697	71	29	13:00 ÀS 19:00	t	f	t	t	\N
13698	72	16	07:00 ÀS 13:00	t	f	t	t	\N
13699	72	16	13:00 ÀS 19:00	t	f	t	t	\N
13700	72	19	07:00 ÀS 13:00	t	f	t	t	\N
13701	72	19	13:00 ÀS 19:00	t	f	t	t	\N
13702	72	19	19:00 ÀS 01:00	t	f	t	t	\N
13703	72	20	07:00 ÀS 13:00	t	f	t	t	\N
13704	72	20	13:00 ÀS 19:00	t	f	t	t	\N
13706	72	23	07:00 ÀS 13:00	t	f	t	t	\N
13707	72	23	13:00 ÀS 19:00	t	f	t	t	\N
13708	72	27	07:00 ÀS 13:00	t	f	t	t	\N
13709	72	27	13:00 ÀS 19:00	t	f	t	t	\N
13710	72	27	19:00 ÀS 01:00	t	f	t	t	\N
13711	72	28	07:00 ÀS 13:00	t	f	t	t	\N
13712	72	28	13:00 ÀS 19:00	t	f	t	t	\N
13713	73	16	07:00 ÀS 13:00	t	f	t	t	\N
13714	73	16	13:00 ÀS 19:00	t	f	t	t	\N
13715	73	18	19:00 ÀS 01:00	t	f	t	t	\N
13716	73	19	07:00 ÀS 13:00	t	f	t	t	\N
13717	73	20	07:00 ÀS 13:00	t	f	t	t	\N
13718	73	20	13:00 ÀS 19:00	t	f	t	t	\N
13719	73	22	19:00 ÀS 01:00	t	f	t	t	\N
13720	73	23	07:00 ÀS 13:00	t	f	t	t	\N
13721	73	23	13:00 ÀS 19:00	t	f	t	t	\N
13722	73	23	19:00 ÀS 01:00	t	f	t	t	\N
13723	73	24	07:00 ÀS 13:00	t	f	t	t	\N
13724	73	27	07:00 ÀS 13:00	t	f	t	t	\N
13725	73	27	13:00 ÀS 19:00	t	f	t	t	\N
13705	72	22	19:00 ÀS 01:00	t	f	t	f	DESIST 22/05 Req. nº  25507/2026-2ª CIA
13726	73	27	19:00 ÀS 01:00	t	f	t	t	\N
13727	73	28	07:00 ÀS 13:00	t	f	t	t	\N
13728	73	28	13:00 ÀS 19:00	t	f	t	t	\N
13729	73	30	19:00 ÀS 01:00	t	f	t	t	\N
13730	74	17	19:00 ÀS 01:00	t	f	t	t	\N
13731	74	18	07:00 ÀS 13:00	t	f	t	t	\N
13732	74	18	13:00 ÀS 19:00	t	f	t	t	\N
13733	74	18	19:00 ÀS 01:00	t	f	t	t	\N
13734	74	19	07:00 ÀS 13:00	t	f	t	t	\N
13735	74	19	13:00 ÀS 19:00	t	f	t	t	\N
13736	74	21	19:00 ÀS 01:00	t	f	t	t	\N
13737	74	22	07:00 ÀS 13:00	t	f	t	t	\N
13738	74	22	13:00 ÀS 19:00	t	f	t	t	\N
13739	74	22	19:00 ÀS 01:00	t	f	t	t	\N
13740	74	23	07:00 ÀS 13:00	t	f	t	t	\N
13741	74	23	13:00 ÀS 19:00	t	f	t	t	\N
13742	74	25	19:00 ÀS 01:00	t	f	t	t	\N
13743	74	26	07:00 ÀS 13:00	t	f	t	t	\N
13744	74	26	13:00 ÀS 19:00	t	f	t	t	\N
13745	74	26	19:00 ÀS 01:00	t	f	t	t	\N
13746	74	27	07:00 ÀS 13:00	t	f	t	t	\N
13747	74	27	13:00 ÀS 19:00	t	f	t	t	\N
13748	74	29	19:00 ÀS 01:00	t	f	t	t	\N
13749	74	30	07:00 ÀS 13:00	t	f	t	t	\N
13750	74	30	13:00 ÀS 19:00	t	f	t	t	\N
13751	74	30	19:00 ÀS 01:00	t	f	t	t	\N
13752	75	16	07:00 ÀS 13:00	t	f	t	t	\N
13753	75	16	13:00 ÀS 19:00	t	f	t	t	\N
13754	75	16	19:00 ÀS 01:00	t	f	t	t	\N
13755	75	16	01:00 ÀS 07:00	t	f	t	t	\N
13756	75	17	07:00 ÀS 13:00	t	f	t	t	\N
13757	75	17	13:00 ÀS 19:00	t	f	t	t	\N
13758	75	17	19:00 ÀS 01:00	t	f	t	t	\N
13759	75	17	01:00 ÀS 07:00	t	f	t	t	\N
13760	75	20	07:00 ÀS 13:00	t	f	t	t	\N
13761	75	20	13:00 ÀS 19:00	t	f	t	t	\N
13762	75	20	19:00 ÀS 01:00	t	f	t	t	\N
13763	75	20	01:00 ÀS 07:00	t	f	t	t	\N
13764	75	21	07:00 ÀS 13:00	t	f	t	t	\N
13765	75	21	13:00 ÀS 19:00	t	f	t	t	\N
13766	75	21	19:00 ÀS 01:00	t	f	t	t	\N
13767	75	21	01:00 ÀS 07:00	t	f	t	t	\N
13768	75	23	07:00 ÀS 13:00	t	f	t	t	\N
13769	75	23	13:00 ÀS 19:00	t	f	t	t	\N
13770	75	23	19:00 ÀS 01:00	t	f	t	t	\N
13771	75	23	01:00 ÀS 07:00	t	f	t	t	\N
13772	75	24	07:00 ÀS 13:00	t	f	t	t	\N
13773	75	24	13:00 ÀS 19:00	t	f	t	t	\N
13774	75	25	13:00 ÀS 19:00	t	f	t	t	\N
13775	75	25	19:00 ÀS 01:00	t	f	t	t	\N
13776	75	27	07:00 ÀS 13:00	t	f	t	t	\N
13777	75	27	13:00 ÀS 19:00	t	f	t	t	\N
13778	75	27	19:00 ÀS 01:00	t	f	t	t	\N
13779	75	27	01:00 ÀS 07:00	t	f	t	t	\N
13780	75	28	07:00 ÀS 13:00	t	f	t	t	\N
13781	75	28	13:00 ÀS 19:00	t	f	t	t	\N
13782	75	28	19:00 ÀS 01:00	t	f	t	t	\N
13783	75	28	01:00 ÀS 07:00	t	f	t	t	\N
13784	75	29	07:00 ÀS 13:00	t	f	t	t	\N
13785	75	29	13:00 ÀS 19:00	t	f	t	t	\N
13786	75	29	19:00 ÀS 01:00	t	f	t	t	\N
13787	75	29	01:00 ÀS 07:00	t	f	t	t	\N
13788	76	17	07:00 ÀS 13:00	t	f	t	t	\N
13789	76	17	13:00 ÀS 19:00	t	f	t	t	\N
13790	76	17	19:00 ÀS 01:00	t	f	t	t	\N
13791	76	18	07:00 ÀS 13:00	t	f	t	t	\N
13792	76	18	13:00 ÀS 19:00	t	f	t	t	\N
13793	76	18	19:00 ÀS 01:00	t	f	t	t	\N
13794	76	18	01:00 ÀS 07:00	t	f	t	t	\N
13795	76	19	07:00 ÀS 13:00	t	f	t	t	\N
13796	76	19	13:00 ÀS 19:00	t	f	t	t	\N
13797	76	19	19:00 ÀS 01:00	t	f	t	t	\N
13798	76	19	01:00 ÀS 07:00	t	f	t	t	\N
13799	76	20	01:00 ÀS 07:00	t	f	t	t	\N
13800	76	22	13:00 ÀS 19:00	t	f	t	t	\N
13801	76	22	19:00 ÀS 01:00	t	f	t	t	\N
13802	76	23	07:00 ÀS 13:00	t	f	t	t	\N
13803	76	23	01:00 ÀS 07:00	t	f	t	t	\N
13804	76	27	13:00 ÀS 19:00	t	f	t	t	\N
13805	76	27	19:00 ÀS 01:00	t	f	t	t	\N
13806	76	28	07:00 ÀS 13:00	t	f	t	t	\N
13807	77	17	13:00 ÀS 19:00	t	f	t	t	\N
13808	77	17	19:00 ÀS 01:00	t	f	t	t	\N
13809	77	20	13:00 ÀS 19:00	t	f	t	t	\N
13810	77	20	19:00 ÀS 01:00	t	f	t	t	\N
13811	77	25	13:00 ÀS 19:00	t	f	t	t	\N
13812	77	25	19:00 ÀS 01:00	t	f	t	t	\N
13813	77	28	13:00 ÀS 19:00	t	f	t	t	\N
13814	77	28	19:00 ÀS 01:00	t	f	t	t	\N
13815	78	17	07:00 ÀS 13:00	t	f	t	t	\N
13816	78	17	13:00 ÀS 19:00	t	f	t	t	\N
13817	78	17	19:00 ÀS 01:00	t	f	t	t	\N
13818	78	17	01:00 ÀS 07:00	t	f	t	t	\N
13819	78	21	07:00 ÀS 13:00	t	f	t	t	\N
13820	78	21	13:00 ÀS 19:00	t	f	t	t	\N
13821	78	21	19:00 ÀS 01:00	t	f	t	t	\N
13822	78	21	01:00 ÀS 07:00	t	f	t	t	\N
13823	78	26	07:00 ÀS 13:00	t	f	t	t	\N
13824	78	26	13:00 ÀS 19:00	t	f	t	t	\N
13825	78	26	19:00 ÀS 01:00	t	f	t	t	\N
13826	78	26	01:00 ÀS 07:00	t	f	t	t	\N
13827	78	29	07:00 ÀS 13:00	t	f	t	t	\N
13828	78	29	13:00 ÀS 19:00	t	f	t	t	\N
13829	78	29	19:00 ÀS 01:00	t	f	t	t	\N
13830	78	29	01:00 ÀS 07:00	t	f	t	t	\N
13831	79	18	19:00 ÀS 01:00	t	f	t	t	\N
13832	79	26	19:00 ÀS 01:00	t	f	t	t	\N
13833	80	17	07:00 ÀS 13:00	t	f	t	t	\N
13834	80	17	13:00 ÀS 19:00	t	f	t	t	\N
13835	80	17	19:00 ÀS 01:00	t	f	t	t	\N
13836	80	17	01:00 ÀS 07:00	t	f	t	t	\N
13837	80	21	07:00 ÀS 13:00	t	f	t	t	\N
13838	80	21	13:00 ÀS 19:00	t	f	t	t	\N
13839	80	21	19:00 ÀS 01:00	t	f	t	t	\N
13840	80	21	01:00 ÀS 07:00	t	f	t	t	\N
13841	80	28	19:00 ÀS 01:00	t	f	t	t	\N
13842	80	28	01:00 ÀS 07:00	t	f	t	t	\N
13843	80	29	19:00 ÀS 01:00	t	f	t	t	\N
13844	80	29	01:00 ÀS 07:00	t	f	t	t	\N
13845	80	30	19:00 ÀS 01:00	t	f	t	t	\N
13846	80	30	01:00 ÀS 07:00	t	f	t	t	\N
13847	81	19	07:00 ÀS 13:00	t	f	t	t	\N
13848	81	19	13:00 ÀS 19:00	t	f	t	t	\N
13849	81	24	07:00 ÀS 13:00	t	f	t	t	\N
13850	81	24	13:00 ÀS 19:00	t	f	t	t	\N
13851	81	26	07:00 ÀS 13:00	t	f	t	t	\N
13852	81	26	13:00 ÀS 19:00	t	f	t	t	\N
13853	82	17	13:00 ÀS 19:00	t	f	t	t	\N
13854	82	17	19:00 ÀS 01:00	t	f	t	t	\N
13855	82	17	01:00 ÀS 07:00	t	f	t	t	\N
13856	82	24	13:00 ÀS 19:00	t	f	t	t	\N
13857	82	24	19:00 ÀS 01:00	t	f	t	t	\N
13858	82	24	01:00 ÀS 07:00	t	f	t	t	\N
13859	82	25	07:00 ÀS 13:00	t	f	t	t	\N
13860	82	25	13:00 ÀS 19:00	t	f	t	t	\N
13861	82	25	19:00 ÀS 01:00	t	f	t	t	\N
13862	82	25	01:00 ÀS 07:00	t	f	t	t	\N
13863	83	21	07:00 ÀS 13:00	t	f	f	t	\N
13864	83	21	13:00 ÀS 19:00	t	f	f	t	\N
13865	83	21	19:00 ÀS 01:00	t	f	f	t	\N
13866	83	25	07:00 ÀS 13:00	t	f	f	t	\N
13867	83	25	13:00 ÀS 19:00	t	f	f	t	\N
13868	83	29	07:00 ÀS 13:00	t	f	f	t	\N
13869	83	29	13:00 ÀS 19:00	t	f	f	t	\N
13870	83	29	19:00 ÀS 01:00	t	f	f	t	\N
13871	84	10	13:00 ÀS 19:00	t	f	t	t	\N
13872	84	10	19:00 ÀS 01:00	t	f	t	t	\N
13873	84	4	13:00 ÀS 19:00	t	f	t	t	\N
13889	86	18	19:00 ÀS 01:00	t	f	t	t	\N
13890	86	19	07:00 ÀS 13:00	t	f	t	t	\N
13891	86	19	13:00 ÀS 19:00	t	f	t	t	\N
13892	86	19	19:00 ÀS 01:00	t	f	t	t	\N
13893	86	20	07:00 ÀS 13:00	t	f	t	t	\N
13894	86	20	13:00 ÀS 19:00	t	f	t	t	\N
13895	86	20	19:00 ÀS 01:00	t	f	t	t	\N
13896	86	22	07:00 ÀS 13:00	t	f	t	t	\N
13897	86	22	13:00 ÀS 19:00	t	f	t	t	\N
13898	86	22	19:00 ÀS 01:00	t	f	t	t	\N
13899	86	23	07:00 ÀS 13:00	t	f	t	t	\N
13900	86	23	13:00 ÀS 19:00	t	f	t	t	\N
13901	86	23	19:00 ÀS 01:00	t	f	t	t	\N
13902	86	24	07:00 ÀS 13:00	t	f	t	t	\N
13903	86	24	13:00 ÀS 19:00	t	f	t	t	\N
13904	86	24	19:00 ÀS 01:00	t	f	t	t	\N
13905	86	26	07:00 ÀS 13:00	t	f	t	t	\N
13906	86	26	13:00 ÀS 19:00	t	f	t	t	\N
13907	86	26	19:00 ÀS 01:00	t	f	t	t	\N
13908	86	27	07:00 ÀS 13:00	t	f	t	t	\N
13909	86	27	13:00 ÀS 19:00	t	f	t	t	\N
13910	86	27	19:00 ÀS 01:00	t	f	t	t	\N
13911	86	28	07:00 ÀS 13:00	t	f	t	t	\N
13912	86	28	13:00 ÀS 19:00	t	f	t	t	\N
13913	86	28	19:00 ÀS 01:00	t	f	t	t	\N
13914	86	30	07:00 ÀS 13:00	t	f	t	t	\N
13915	86	30	13:00 ÀS 19:00	t	f	t	t	\N
13916	86	30	19:00 ÀS 01:00	t	f	t	t	\N
13917	87	16	07:00 ÀS 13:00	t	f	t	t	\N
13918	87	16	13:00 ÀS 19:00	t	f	t	t	\N
13919	87	16	19:00 ÀS 01:00	t	f	t	t	\N
13920	87	16	01:00 ÀS 07:00	t	f	t	t	\N
13921	87	17	07:00 ÀS 13:00	t	f	t	t	\N
13922	87	17	13:00 ÀS 19:00	t	f	t	t	\N
13923	87	17	19:00 ÀS 01:00	t	f	t	t	\N
13924	87	17	01:00 ÀS 07:00	t	f	t	t	\N
13925	87	20	07:00 ÀS 13:00	t	f	t	t	\N
13926	87	20	13:00 ÀS 19:00	t	f	t	t	\N
13927	87	20	19:00 ÀS 01:00	t	f	t	t	\N
13928	87	20	01:00 ÀS 07:00	t	f	t	t	\N
13929	87	21	07:00 ÀS 13:00	t	f	t	t	\N
13930	87	21	13:00 ÀS 19:00	t	f	t	t	\N
13931	87	21	19:00 ÀS 01:00	t	f	t	t	\N
13932	87	21	01:00 ÀS 07:00	t	f	t	t	\N
13933	87	25	07:00 ÀS 13:00	t	f	t	t	\N
13934	87	25	13:00 ÀS 19:00	t	f	t	t	\N
13935	87	25	19:00 ÀS 01:00	t	f	t	t	\N
13936	87	25	01:00 ÀS 07:00	t	f	t	t	\N
13937	87	28	07:00 ÀS 13:00	t	f	t	t	\N
13938	87	28	13:00 ÀS 19:00	t	f	t	t	\N
13939	87	28	19:00 ÀS 01:00	t	f	t	t	\N
13940	87	28	01:00 ÀS 07:00	t	f	t	t	\N
13941	87	29	07:00 ÀS 13:00	t	f	t	t	\N
13942	87	29	13:00 ÀS 19:00	t	f	t	t	\N
13943	87	29	19:00 ÀS 01:00	t	f	t	t	\N
13944	87	29	01:00 ÀS 07:00	t	f	t	t	\N
13945	88	17	13:00 ÀS 19:00	t	f	t	t	\N
13946	88	17	19:00 ÀS 01:00	t	f	t	t	\N
13947	88	17	01:00 ÀS 07:00	t	f	t	t	\N
13948	88	20	13:00 ÀS 19:00	t	f	t	t	\N
13949	88	20	19:00 ÀS 01:00	t	f	t	t	\N
13950	88	20	01:00 ÀS 07:00	t	f	t	t	\N
13951	88	25	13:00 ÀS 19:00	t	f	t	t	\N
13952	88	25	19:00 ÀS 01:00	t	f	t	t	\N
13953	88	25	01:00 ÀS 07:00	t	f	t	t	\N
13954	88	28	13:00 ÀS 19:00	t	f	t	t	\N
13955	88	28	19:00 ÀS 01:00	t	f	t	t	\N
13956	88	28	01:00 ÀS 07:00	t	f	t	t	\N
13957	89	17	13:00 ÀS 19:00	t	f	t	t	\N
13958	89	17	19:00 ÀS 01:00	t	f	t	t	\N
13959	89	17	01:00 ÀS 07:00	t	f	t	t	\N
13960	89	18	07:00 ÀS 13:00	t	f	t	t	\N
13961	89	18	13:00 ÀS 19:00	t	f	t	t	\N
13962	89	18	19:00 ÀS 01:00	t	f	t	t	\N
13963	89	18	01:00 ÀS 07:00	t	f	t	t	\N
13964	89	19	07:00 ÀS 13:00	t	f	t	t	\N
13965	89	19	13:00 ÀS 19:00	t	f	t	t	\N
13966	89	19	19:00 ÀS 01:00	t	f	t	t	\N
13967	89	19	01:00 ÀS 07:00	t	f	t	t	\N
13968	89	22	13:00 ÀS 19:00	t	f	t	t	\N
13969	89	22	19:00 ÀS 01:00	t	f	t	t	\N
13970	89	22	01:00 ÀS 07:00	t	f	t	t	\N
13971	89	23	07:00 ÀS 13:00	t	f	t	t	\N
13972	89	23	13:00 ÀS 19:00	t	f	t	t	\N
13973	89	23	19:00 ÀS 01:00	t	f	t	t	\N
13974	89	23	01:00 ÀS 07:00	t	f	t	t	\N
13975	89	25	13:00 ÀS 19:00	t	f	t	t	\N
13976	89	25	19:00 ÀS 01:00	t	f	t	t	\N
13977	89	25	01:00 ÀS 07:00	t	f	t	t	\N
13978	89	26	07:00 ÀS 13:00	t	f	t	t	\N
13979	89	26	13:00 ÀS 19:00	t	f	t	t	\N
13980	89	26	19:00 ÀS 01:00	t	f	t	t	\N
13981	89	26	01:00 ÀS 07:00	t	f	t	t	\N
13982	89	27	07:00 ÀS 13:00	t	f	t	t	\N
13983	89	27	13:00 ÀS 19:00	t	f	t	t	\N
13984	89	27	19:00 ÀS 01:00	t	f	t	t	\N
13985	89	27	01:00 ÀS 07:00	t	f	t	t	\N
13986	89	30	13:00 ÀS 19:00	t	f	t	t	\N
13987	89	30	19:00 ÀS 01:00	t	f	t	t	\N
13988	89	30	01:00 ÀS 07:00	t	f	t	t	\N
13989	90	16	07:00 ÀS 13:00	t	f	t	t	\N
13990	90	16	13:00 ÀS 19:00	t	f	t	t	\N
13991	90	16	19:00 ÀS 01:00	t	f	t	t	\N
13992	90	16	01:00 ÀS 07:00	t	f	t	t	\N
13993	90	17	07:00 ÀS 13:00	t	f	t	t	\N
22860	134	29	13:00 ÀS 19:00	t	f	t	t	\N
22861	134	29	19:00 ÀS 01:00	t	f	t	t	\N
13994	90	20	07:00 ÀS 13:00	t	f	t	t	\N
13995	90	20	13:00 ÀS 19:00	t	f	t	t	\N
13996	90	20	19:00 ÀS 01:00	t	f	t	t	\N
13997	90	20	01:00 ÀS 07:00	t	f	t	t	\N
13998	90	21	07:00 ÀS 13:00	t	f	t	t	\N
13999	90	21	13:00 ÀS 19:00	t	f	t	t	\N
14000	90	21	19:00 ÀS 01:00	t	f	t	t	\N
14001	90	23	13:00 ÀS 19:00	t	f	t	t	\N
14002	90	23	19:00 ÀS 01:00	t	f	t	t	\N
14003	90	23	01:00 ÀS 07:00	t	f	t	t	\N
14004	90	24	07:00 ÀS 13:00	t	f	t	t	\N
14005	90	27	13:00 ÀS 19:00	t	f	t	t	\N
14006	90	27	19:00 ÀS 01:00	t	f	t	t	\N
14007	90	27	01:00 ÀS 07:00	t	f	t	t	\N
14008	90	28	07:00 ÀS 13:00	t	f	t	t	\N
14009	90	28	13:00 ÀS 19:00	t	f	t	t	\N
14010	90	28	19:00 ÀS 01:00	t	f	t	t	\N
14011	90	28	01:00 ÀS 07:00	t	f	t	t	\N
14012	90	29	07:00 ÀS 13:00	t	f	t	t	\N
14013	90	29	13:00 ÀS 19:00	t	f	t	t	\N
14014	90	29	19:00 ÀS 01:00	t	f	t	t	\N
14015	91	16	13:00 ÀS 19:00	t	f	t	t	\N
14016	91	17	13:00 ÀS 19:00	t	f	t	t	\N
14017	91	18	07:00 ÀS 13:00	t	f	t	t	\N
14018	91	19	07:00 ÀS 13:00	t	f	t	t	\N
14019	91	20	13:00 ÀS 19:00	t	f	t	t	\N
14020	91	21	13:00 ÀS 19:00	t	f	t	t	\N
14021	91	22	13:00 ÀS 19:00	t	f	t	t	\N
14022	91	23	13:00 ÀS 19:00	t	f	t	t	\N
14023	91	24	13:00 ÀS 19:00	t	f	t	t	\N
14024	91	25	07:00 ÀS 13:00	t	f	t	t	\N
14025	91	26	07:00 ÀS 13:00	t	f	t	t	\N
14026	91	27	13:00 ÀS 19:00	t	f	t	t	\N
14027	91	28	13:00 ÀS 19:00	t	f	t	t	\N
14028	91	29	13:00 ÀS 19:00	t	f	t	t	\N
14029	91	30	13:00 ÀS 19:00	t	f	t	t	\N
14030	92	17	07:00 ÀS 13:00	t	f	t	t	\N
14031	92	17	13:00 ÀS 19:00	t	f	t	t	\N
14032	92	17	19:00 ÀS 01:00	t	f	t	t	\N
14033	92	17	01:00 ÀS 07:00	t	f	t	t	\N
14034	92	18	07:00 ÀS 13:00	t	f	t	t	\N
14035	92	18	13:00 ÀS 19:00	t	f	t	t	\N
14036	92	18	19:00 ÀS 01:00	t	f	t	t	\N
14037	92	18	01:00 ÀS 07:00	t	f	t	t	\N
14038	92	22	07:00 ÀS 13:00	t	f	t	t	\N
14039	92	22	13:00 ÀS 19:00	t	f	t	t	\N
14040	92	22	19:00 ÀS 01:00	t	f	t	t	\N
14041	92	22	01:00 ÀS 07:00	t	f	t	t	\N
14042	92	25	07:00 ÀS 13:00	t	f	t	t	\N
14043	92	25	13:00 ÀS 19:00	t	f	t	t	\N
14044	92	25	19:00 ÀS 01:00	t	f	t	t	\N
14045	92	25	01:00 ÀS 07:00	t	f	t	t	\N
14046	92	26	07:00 ÀS 13:00	t	f	t	t	\N
14047	92	26	13:00 ÀS 19:00	t	f	t	t	\N
14048	92	26	19:00 ÀS 01:00	t	f	t	t	\N
14049	92	26	01:00 ÀS 07:00	t	f	t	t	\N
14050	92	29	07:00 ÀS 13:00	t	f	t	t	\N
14051	92	29	13:00 ÀS 19:00	t	f	t	t	\N
14052	92	29	19:00 ÀS 01:00	t	f	t	t	\N
14053	92	29	01:00 ÀS 07:00	t	f	t	t	\N
14054	92	30	07:00 ÀS 13:00	t	f	t	t	\N
14055	92	30	13:00 ÀS 19:00	t	f	t	t	\N
14056	92	30	19:00 ÀS 01:00	t	f	t	t	\N
14057	92	30	01:00 ÀS 07:00	t	f	t	t	\N
14058	93	16	07:00 ÀS 13:00	t	f	t	t	\N
14059	93	16	13:00 ÀS 19:00	t	f	t	t	\N
14060	93	17	07:00 ÀS 13:00	t	f	t	t	\N
14061	93	17	13:00 ÀS 19:00	t	f	t	t	\N
14062	93	17	19:00 ÀS 01:00	t	f	t	t	\N
14063	93	20	13:00 ÀS 19:00	t	f	t	t	\N
14064	93	20	19:00 ÀS 01:00	t	f	t	t	\N
14065	93	21	07:00 ÀS 13:00	t	f	t	t	\N
14066	93	21	13:00 ÀS 19:00	t	f	t	t	\N
14067	93	21	19:00 ÀS 01:00	t	f	t	t	\N
14068	93	28	07:00 ÀS 13:00	t	f	t	t	\N
14069	93	28	13:00 ÀS 19:00	t	f	t	t	\N
14070	93	29	07:00 ÀS 13:00	t	f	t	t	\N
14071	93	29	13:00 ÀS 19:00	t	f	t	t	\N
14072	93	29	19:00 ÀS 01:00	t	f	t	t	\N
14073	94	17	07:00 ÀS 13:00	t	f	t	t	\N
14074	94	17	13:00 ÀS 19:00	t	f	t	t	\N
14075	94	17	19:00 ÀS 01:00	t	f	t	t	\N
14076	94	17	01:00 ÀS 07:00	t	f	t	t	\N
14077	94	18	07:00 ÀS 13:00	t	f	t	t	\N
14078	94	18	13:00 ÀS 19:00	t	f	t	t	\N
14079	94	18	19:00 ÀS 01:00	t	f	t	t	\N
14080	94	18	01:00 ÀS 07:00	t	f	t	t	\N
14081	94	19	07:00 ÀS 13:00	t	f	t	t	\N
14082	94	19	13:00 ÀS 19:00	t	f	t	t	\N
14083	94	19	19:00 ÀS 01:00	t	f	t	t	\N
14084	94	19	01:00 ÀS 07:00	t	f	t	t	\N
14085	94	21	07:00 ÀS 13:00	t	f	t	t	\N
14086	94	21	13:00 ÀS 19:00	t	f	t	t	\N
14087	94	21	19:00 ÀS 01:00	t	f	t	t	\N
14088	94	21	01:00 ÀS 07:00	t	f	t	t	\N
14089	94	22	07:00 ÀS 13:00	t	f	t	t	\N
14090	94	22	13:00 ÀS 19:00	t	f	t	t	\N
14091	94	22	19:00 ÀS 01:00	t	f	t	t	\N
14092	94	22	01:00 ÀS 07:00	t	f	t	t	\N
14093	94	23	07:00 ÀS 13:00	t	f	t	t	\N
14094	94	23	13:00 ÀS 19:00	t	f	t	t	\N
14095	94	23	19:00 ÀS 01:00	t	f	t	t	\N
14096	94	23	01:00 ÀS 07:00	t	f	t	t	\N
14097	94	25	07:00 ÀS 13:00	t	f	t	t	\N
14098	94	25	13:00 ÀS 19:00	t	f	t	t	\N
14099	94	25	19:00 ÀS 01:00	t	f	t	t	\N
14100	94	25	01:00 ÀS 07:00	t	f	t	t	\N
14101	94	26	07:00 ÀS 13:00	t	f	t	t	\N
14102	94	26	13:00 ÀS 19:00	t	f	t	t	\N
14103	94	26	19:00 ÀS 01:00	t	f	t	t	\N
14104	94	26	01:00 ÀS 07:00	t	f	t	t	\N
14105	94	27	07:00 ÀS 13:00	t	f	t	t	\N
14106	94	27	13:00 ÀS 19:00	t	f	t	t	\N
14107	94	27	19:00 ÀS 01:00	t	f	t	t	\N
14108	94	27	01:00 ÀS 07:00	t	f	t	t	\N
14109	94	29	07:00 ÀS 13:00	t	f	t	t	\N
14110	94	29	13:00 ÀS 19:00	t	f	t	t	\N
14111	94	29	19:00 ÀS 01:00	t	f	t	t	\N
14112	94	29	01:00 ÀS 07:00	t	f	t	t	\N
14113	94	30	07:00 ÀS 13:00	t	f	t	t	\N
14114	94	30	13:00 ÀS 19:00	t	f	t	t	\N
14115	94	30	19:00 ÀS 01:00	t	f	t	t	\N
14116	94	30	01:00 ÀS 07:00	t	f	t	t	\N
14117	95	16	07:00 ÀS 13:00	t	f	t	t	\N
14118	95	16	13:00 ÀS 19:00	t	f	t	t	\N
14119	95	16	19:00 ÀS 01:00	t	f	t	t	\N
14120	95	17	07:00 ÀS 13:00	t	f	t	t	\N
14121	95	17	13:00 ÀS 19:00	t	f	t	t	\N
14122	95	17	19:00 ÀS 01:00	t	f	t	t	\N
14123	95	18	07:00 ÀS 13:00	t	f	t	t	\N
14124	95	18	13:00 ÀS 19:00	t	f	t	t	\N
14125	95	18	19:00 ÀS 01:00	t	f	t	t	\N
14126	95	20	07:00 ÀS 13:00	t	f	t	t	\N
14127	95	20	13:00 ÀS 19:00	t	f	t	t	\N
14128	95	20	19:00 ÀS 01:00	t	f	t	t	\N
14129	95	21	07:00 ÀS 13:00	t	f	t	t	\N
14130	95	21	13:00 ÀS 19:00	t	f	t	t	\N
14131	95	21	19:00 ÀS 01:00	t	f	t	t	\N
14132	95	24	07:00 ÀS 13:00	t	f	t	t	\N
14133	95	24	13:00 ÀS 19:00	t	f	t	t	\N
14134	95	24	19:00 ÀS 01:00	t	f	t	t	\N
14135	95	25	07:00 ÀS 13:00	t	f	t	t	\N
14136	95	25	13:00 ÀS 19:00	t	f	t	t	\N
14137	95	25	19:00 ÀS 01:00	t	f	t	t	\N
14138	95	28	07:00 ÀS 13:00	t	f	t	t	\N
14139	95	28	13:00 ÀS 19:00	t	f	t	t	\N
14140	95	28	19:00 ÀS 01:00	t	f	t	t	\N
14141	95	30	07:00 ÀS 13:00	t	f	t	t	\N
14142	95	30	13:00 ÀS 19:00	t	f	t	t	\N
14143	95	30	19:00 ÀS 01:00	t	f	t	t	\N
14144	96	16	13:00 ÀS 19:00	t	f	t	t	\N
14145	96	17	13:00 ÀS 19:00	t	f	t	t	\N
14146	96	20	13:00 ÀS 19:00	t	f	t	t	\N
14147	96	22	13:00 ÀS 19:00	t	f	t	t	\N
14148	96	23	13:00 ÀS 19:00	t	f	t	t	\N
14149	96	24	13:00 ÀS 19:00	t	f	t	t	\N
14150	96	27	13:00 ÀS 19:00	t	f	t	t	\N
14151	96	28	13:00 ÀS 19:00	t	f	t	t	\N
14152	96	29	13:00 ÀS 19:00	t	f	t	t	\N
14153	96	30	13:00 ÀS 19:00	t	f	t	t	\N
14154	97	16	07:00 ÀS 13:00	t	f	t	t	\N
14155	97	16	13:00 ÀS 19:00	t	f	t	t	\N
24006	86	10	07:00 ÀS 13:00	t	f	t	f	DIA 05/05 EXECUTANDO SERV 02/05 Req. nº  134/2026\nDIA 10/05 EXECUTANDO SERV 10/05 Req. nº  151/2026
24007	86	10	13:00 ÀS 19:00	t	f	t	f	DIA 05/05 EXECUTANDO SERV 02/05 Req. nº  134/2026\nDIA 10/05 EXECUTANDO SERV 10/05 Req. nº  151/2026
24008	86	10	19:00 ÀS 01:00	t	f	t	f	DIA 05/05 EXECUTANDO SERV 02/05 Req. nº  134/2026\nDIA 10/05 EXECUTANDO SERV 10/05 Req. nº  151/2026
14156	97	16	19:00 ÀS 01:00	t	f	t	t	\N
14157	97	16	01:00 ÀS 07:00	t	f	t	t	\N
14158	97	17	07:00 ÀS 13:00	t	f	t	t	\N
14159	97	17	13:00 ÀS 19:00	t	f	t	t	\N
14160	97	17	19:00 ÀS 01:00	t	f	t	t	\N
14161	97	19	13:00 ÀS 19:00	t	f	t	t	\N
14162	97	19	19:00 ÀS 01:00	t	f	t	t	\N
14163	97	20	07:00 ÀS 13:00	t	f	t	t	\N
14164	97	20	13:00 ÀS 19:00	t	f	t	t	\N
14165	97	20	19:00 ÀS 01:00	t	f	t	t	\N
14166	97	20	01:00 ÀS 07:00	t	f	t	t	\N
14167	97	21	07:00 ÀS 13:00	t	f	t	t	\N
14168	97	21	13:00 ÀS 19:00	t	f	t	t	\N
14169	97	21	19:00 ÀS 01:00	t	f	t	t	\N
14170	97	23	13:00 ÀS 19:00	t	f	t	t	\N
14171	97	23	19:00 ÀS 01:00	t	f	t	t	\N
14172	97	25	07:00 ÀS 13:00	t	f	t	t	\N
14173	97	25	13:00 ÀS 19:00	t	f	t	t	\N
14174	97	25	19:00 ÀS 01:00	t	f	t	t	\N
14175	97	27	13:00 ÀS 19:00	t	f	t	t	\N
14176	97	27	19:00 ÀS 01:00	t	f	t	t	\N
14177	97	28	07:00 ÀS 13:00	t	f	t	t	\N
14178	97	28	13:00 ÀS 19:00	t	f	t	t	\N
14179	97	28	19:00 ÀS 01:00	t	f	t	t	\N
14180	97	28	01:00 ÀS 07:00	t	f	t	t	\N
14181	97	29	07:00 ÀS 13:00	t	f	t	t	\N
14182	97	29	13:00 ÀS 19:00	t	f	t	t	\N
14183	97	29	19:00 ÀS 01:00	t	f	t	t	\N
14184	98	17	13:00 ÀS 19:00	t	f	t	t	\N
14185	98	22	07:00 ÀS 13:00	t	f	t	t	\N
14186	98	22	13:00 ÀS 19:00	t	f	t	t	\N
14187	98	22	19:00 ÀS 01:00	t	f	t	t	\N
14188	98	23	07:00 ÀS 13:00	t	f	t	t	\N
14189	98	23	13:00 ÀS 19:00	t	f	t	t	\N
14190	98	27	07:00 ÀS 13:00	t	f	t	t	\N
14191	98	27	13:00 ÀS 19:00	t	f	t	t	\N
14192	98	29	13:00 ÀS 19:00	t	f	t	t	\N
24009	86	11	07:00 ÀS 13:00	t	f	t	t	\N
24010	86	11	13:00 ÀS 19:00	t	f	t	t	\N
24011	86	11	19:00 ÀS 01:00	t	f	t	t	\N
23986	119	8	19:00 ÀS 01:00	t	f	t	t	\N
23987	119	8	01:00 ÀS 07:00	t	f	t	t	\N
23988	119	9	19:00 ÀS 01:00	t	f	t	t	\N
23989	119	9	01:00 ÀS 07:00	t	f	t	t	\N
24120	126	8	13:00 ÀS 19:00	t	f	f	f	EXECUT SERV - EXECUT SERV 08/05 Req. nº  23972/2026-2º CIA
24121	126	8	19:00 ÀS 01:00	t	f	f	f	EXECUT SERV - EXECUT SERV 08/05 Req. nº  23972/2026-2º CIA
14193	98	30	07:00 ÀS 13:00	t	f	t	t	\N
14194	98	30	13:00 ÀS 19:00	t	f	t	t	\N
14195	98	30	19:00 ÀS 01:00	t	f	t	t	\N
14196	99	16	07:00 ÀS 13:00	t	f	t	t	\N
14197	99	16	13:00 ÀS 19:00	t	f	t	t	\N
14198	99	16	01:00 ÀS 07:00	t	f	t	t	\N
14199	99	19	07:00 ÀS 13:00	t	f	t	t	\N
14200	99	19	13:00 ÀS 19:00	t	f	t	t	\N
14201	99	20	07:00 ÀS 13:00	t	f	t	t	\N
14202	99	23	07:00 ÀS 13:00	t	f	t	t	\N
14203	99	23	13:00 ÀS 19:00	t	f	t	t	\N
14204	99	24	07:00 ÀS 13:00	t	f	t	t	\N
14205	99	24	13:00 ÀS 19:00	t	f	t	t	\N
14206	99	24	01:00 ÀS 07:00	t	f	t	t	\N
14207	99	26	13:00 ÀS 19:00	t	f	t	t	\N
14208	99	27	07:00 ÀS 13:00	t	f	t	t	\N
14209	99	27	13:00 ÀS 19:00	t	f	t	t	\N
14210	99	28	07:00 ÀS 13:00	t	f	t	t	\N
14211	99	28	01:00 ÀS 07:00	t	f	t	t	\N
14212	99	30	13:00 ÀS 19:00	t	f	t	t	\N
14213	100	19	07:00 ÀS 13:00	t	f	t	t	\N
14214	100	19	13:00 ÀS 19:00	t	f	t	t	\N
14215	100	19	19:00 ÀS 01:00	t	f	t	t	\N
14216	100	19	01:00 ÀS 07:00	t	f	t	t	\N
14217	100	22	07:00 ÀS 13:00	t	f	t	t	\N
14218	100	22	13:00 ÀS 19:00	t	f	t	t	\N
14219	100	22	19:00 ÀS 01:00	t	f	t	t	\N
14220	100	22	01:00 ÀS 07:00	t	f	t	t	\N
14221	100	27	07:00 ÀS 13:00	t	f	t	t	\N
14222	100	27	13:00 ÀS 19:00	t	f	t	t	\N
14223	100	27	19:00 ÀS 01:00	t	f	t	t	\N
14224	100	27	01:00 ÀS 07:00	t	f	t	t	\N
14225	100	30	07:00 ÀS 13:00	t	f	t	t	\N
14226	100	30	13:00 ÀS 19:00	t	f	t	t	\N
14227	100	30	19:00 ÀS 01:00	t	f	t	t	\N
14228	100	30	01:00 ÀS 07:00	t	f	t	t	\N
14229	101	16	07:00 ÀS 13:00	t	f	t	t	\N
14230	101	16	13:00 ÀS 19:00	t	f	t	t	\N
14231	101	16	19:00 ÀS 01:00	t	f	t	t	\N
14232	101	16	01:00 ÀS 07:00	t	f	t	t	\N
24078	67	11	07:00 ÀS 13:00	t	f	t	t	\N
24027	86	3	07:00 ÀS 13:00	t	f	t	t	\N
24079	67	11	13:00 ÀS 19:00	t	f	t	t	\N
24104	126	12	13:00 ÀS 19:00	t	f	f	t	\N
14233	101	23	07:00 ÀS 13:00	t	f	t	t	\N
14234	101	23	13:00 ÀS 19:00	t	f	t	t	\N
14235	101	23	19:00 ÀS 01:00	t	f	t	t	\N
14236	101	23	01:00 ÀS 07:00	t	f	t	t	\N
14237	101	27	07:00 ÀS 13:00	t	f	t	t	\N
14238	101	27	13:00 ÀS 19:00	t	f	t	t	\N
14239	101	27	19:00 ÀS 01:00	t	f	t	t	\N
14240	101	27	01:00 ÀS 07:00	t	f	t	t	\N
14241	101	28	07:00 ÀS 13:00	t	f	t	t	\N
14242	101	28	13:00 ÀS 19:00	t	f	t	t	\N
14243	101	28	19:00 ÀS 01:00	t	f	t	t	\N
14244	101	28	01:00 ÀS 07:00	t	f	t	t	\N
14245	101	30	07:00 ÀS 13:00	t	f	t	t	\N
14246	101	30	13:00 ÀS 19:00	t	f	t	t	\N
14247	101	30	19:00 ÀS 01:00	t	f	t	t	\N
14248	101	30	01:00 ÀS 07:00	t	f	t	t	\N
14249	102	17	07:00 ÀS 13:00	t	f	t	t	\N
14250	102	17	13:00 ÀS 19:00	t	f	t	t	\N
14251	102	17	19:00 ÀS 01:00	t	f	t	t	\N
14252	102	17	01:00 ÀS 07:00	t	f	t	t	\N
14253	102	18	07:00 ÀS 13:00	t	f	t	t	\N
14254	102	18	13:00 ÀS 19:00	t	f	t	t	\N
14255	102	18	19:00 ÀS 01:00	t	f	t	t	\N
14256	102	18	01:00 ÀS 07:00	t	f	t	t	\N
14257	102	19	07:00 ÀS 13:00	t	f	t	t	\N
14258	102	19	13:00 ÀS 19:00	t	f	t	t	\N
14259	102	19	19:00 ÀS 01:00	t	f	t	t	\N
14260	102	19	01:00 ÀS 07:00	t	f	t	t	\N
14261	102	21	07:00 ÀS 13:00	t	f	t	t	\N
14262	102	21	13:00 ÀS 19:00	t	f	t	t	\N
14263	102	21	19:00 ÀS 01:00	t	f	t	t	\N
14264	102	21	01:00 ÀS 07:00	t	f	t	t	\N
14265	102	22	07:00 ÀS 13:00	t	f	t	t	\N
14266	102	22	13:00 ÀS 19:00	t	f	t	t	\N
14267	102	22	19:00 ÀS 01:00	t	f	t	t	\N
14268	102	22	01:00 ÀS 07:00	t	f	t	t	\N
14269	102	23	07:00 ÀS 13:00	t	f	t	t	\N
14270	102	23	13:00 ÀS 19:00	t	f	t	t	\N
14271	102	23	19:00 ÀS 01:00	t	f	t	t	\N
14272	102	23	01:00 ÀS 07:00	t	f	t	t	\N
14273	102	25	07:00 ÀS 13:00	t	f	t	t	\N
14274	102	25	13:00 ÀS 19:00	t	f	t	t	\N
14275	102	25	19:00 ÀS 01:00	t	f	t	t	\N
14276	102	25	01:00 ÀS 07:00	t	f	t	t	\N
14277	102	26	07:00 ÀS 13:00	t	f	t	t	\N
14278	102	26	13:00 ÀS 19:00	t	f	t	t	\N
14279	102	26	19:00 ÀS 01:00	t	f	t	t	\N
14280	102	26	01:00 ÀS 07:00	t	f	t	t	\N
14281	102	27	07:00 ÀS 13:00	t	f	t	t	\N
14282	102	27	13:00 ÀS 19:00	t	f	t	t	\N
14283	102	27	19:00 ÀS 01:00	t	f	t	t	\N
14284	102	27	01:00 ÀS 07:00	t	f	t	t	\N
14285	102	29	07:00 ÀS 13:00	t	f	t	t	\N
14286	102	29	13:00 ÀS 19:00	t	f	t	t	\N
14287	102	29	19:00 ÀS 01:00	t	f	t	t	\N
14288	102	29	01:00 ÀS 07:00	t	f	t	t	\N
14289	102	30	07:00 ÀS 13:00	t	f	t	t	\N
14290	102	30	13:00 ÀS 19:00	t	f	t	t	\N
14291	102	30	19:00 ÀS 01:00	t	f	t	t	\N
14292	102	30	01:00 ÀS 07:00	t	f	t	t	\N
14293	103	20	13:00 ÀS 19:00	t	f	t	t	\N
14294	103	20	19:00 ÀS 01:00	t	f	t	t	\N
14295	103	23	07:00 ÀS 13:00	t	f	t	t	\N
14296	103	23	13:00 ÀS 19:00	t	f	t	t	\N
14297	103	23	19:00 ÀS 01:00	t	f	t	t	\N
14298	103	24	07:00 ÀS 13:00	t	f	t	t	\N
14299	103	27	07:00 ÀS 13:00	t	f	t	t	\N
14300	103	27	13:00 ÀS 19:00	t	f	t	t	\N
14301	103	27	19:00 ÀS 01:00	t	f	t	t	\N
14302	103	28	07:00 ÀS 13:00	t	f	t	t	\N
14303	103	28	13:00 ÀS 19:00	t	f	t	t	\N
14304	103	28	19:00 ÀS 01:00	t	f	t	t	\N
14305	104	16	07:00 ÀS 13:00	t	f	t	t	\N
14306	104	16	13:00 ÀS 19:00	t	f	t	t	\N
14307	104	16	19:00 ÀS 01:00	t	f	t	t	\N
14308	104	16	01:00 ÀS 07:00	t	f	t	t	\N
14309	104	18	13:00 ÀS 19:00	t	f	t	t	\N
14310	104	18	19:00 ÀS 01:00	t	f	t	t	\N
14311	104	18	01:00 ÀS 07:00	t	f	t	t	\N
14312	104	19	07:00 ÀS 13:00	t	f	t	t	\N
14313	104	19	13:00 ÀS 19:00	t	f	t	t	\N
14314	104	19	19:00 ÀS 01:00	t	f	t	t	\N
14315	104	19	01:00 ÀS 07:00	t	f	t	t	\N
14316	104	20	07:00 ÀS 13:00	t	f	t	t	\N
14317	104	20	13:00 ÀS 19:00	t	f	t	t	\N
14318	104	20	19:00 ÀS 01:00	t	f	t	t	\N
14319	104	20	01:00 ÀS 07:00	t	f	t	t	\N
14320	104	22	13:00 ÀS 19:00	t	f	t	t	\N
14321	104	22	19:00 ÀS 01:00	t	f	t	t	\N
14322	104	22	01:00 ÀS 07:00	t	f	t	t	\N
14323	104	23	07:00 ÀS 13:00	t	f	t	t	\N
14324	104	23	13:00 ÀS 19:00	t	f	t	t	\N
14325	104	23	19:00 ÀS 01:00	t	f	t	t	\N
14326	104	23	01:00 ÀS 07:00	t	f	t	t	\N
14327	104	24	07:00 ÀS 13:00	t	f	t	t	\N
14328	104	24	13:00 ÀS 19:00	t	f	t	t	\N
14329	104	24	19:00 ÀS 01:00	t	f	t	t	\N
14330	104	24	01:00 ÀS 07:00	t	f	t	t	\N
14331	104	26	13:00 ÀS 19:00	t	f	t	t	\N
14332	104	26	19:00 ÀS 01:00	t	f	t	t	\N
14333	104	26	01:00 ÀS 07:00	t	f	t	t	\N
14334	104	27	07:00 ÀS 13:00	t	f	t	t	\N
14335	104	27	13:00 ÀS 19:00	t	f	t	t	\N
14336	104	27	19:00 ÀS 01:00	t	f	t	t	\N
14337	104	27	01:00 ÀS 07:00	t	f	t	t	\N
14338	104	28	07:00 ÀS 13:00	t	f	t	t	\N
14339	104	28	13:00 ÀS 19:00	t	f	t	t	\N
14340	104	28	19:00 ÀS 01:00	t	f	t	t	\N
14341	104	28	01:00 ÀS 07:00	t	f	t	t	\N
14342	104	30	13:00 ÀS 19:00	t	f	t	t	\N
14343	104	30	19:00 ÀS 01:00	t	f	t	t	\N
14344	104	30	01:00 ÀS 07:00	t	f	t	t	\N
14345	105	16	07:00 ÀS 13:00	t	f	t	t	\N
14346	105	16	13:00 ÀS 19:00	t	f	t	t	\N
14347	105	16	19:00 ÀS 01:00	t	f	t	t	\N
14348	105	16	01:00 ÀS 07:00	t	f	t	t	\N
14349	105	17	07:00 ÀS 13:00	t	f	t	t	\N
14350	105	17	13:00 ÀS 19:00	t	f	t	t	\N
14351	105	17	19:00 ÀS 01:00	t	f	t	t	\N
14352	105	17	01:00 ÀS 07:00	t	f	t	t	\N
14353	105	18	07:00 ÀS 13:00	t	f	t	t	\N
14354	105	18	13:00 ÀS 19:00	t	f	t	t	\N
14355	105	20	07:00 ÀS 13:00	t	f	t	t	\N
14356	105	20	13:00 ÀS 19:00	t	f	t	t	\N
14357	105	20	19:00 ÀS 01:00	t	f	t	t	\N
14358	105	20	01:00 ÀS 07:00	t	f	t	t	\N
14359	105	21	07:00 ÀS 13:00	t	f	t	t	\N
14360	105	21	19:00 ÀS 01:00	t	f	t	t	\N
14361	105	21	01:00 ÀS 07:00	t	f	t	t	\N
14362	105	22	07:00 ÀS 13:00	t	f	t	t	\N
14363	105	22	13:00 ÀS 19:00	t	f	t	t	\N
14364	105	22	19:00 ÀS 01:00	t	f	t	t	\N
14365	105	22	01:00 ÀS 07:00	t	f	t	t	\N
14366	105	24	07:00 ÀS 13:00	t	f	t	t	\N
14367	105	24	13:00 ÀS 19:00	t	f	t	t	\N
14368	105	24	19:00 ÀS 01:00	t	f	t	t	\N
14369	105	24	01:00 ÀS 07:00	t	f	t	t	\N
14370	105	25	07:00 ÀS 13:00	t	f	t	t	\N
14371	105	25	13:00 ÀS 19:00	t	f	t	t	\N
14372	105	28	07:00 ÀS 13:00	t	f	t	t	\N
14373	105	28	19:00 ÀS 01:00	t	f	t	t	\N
14374	105	28	01:00 ÀS 07:00	t	f	t	t	\N
14375	105	29	07:00 ÀS 13:00	t	f	t	t	\N
14376	105	29	13:00 ÀS 19:00	t	f	t	t	\N
14377	105	29	19:00 ÀS 01:00	t	f	t	t	\N
14378	105	29	01:00 ÀS 07:00	t	f	t	t	\N
14379	105	30	07:00 ÀS 13:00	t	f	t	t	\N
14380	105	30	13:00 ÀS 19:00	t	f	t	t	\N
14381	105	30	19:00 ÀS 01:00	t	f	t	t	\N
14382	105	30	01:00 ÀS 07:00	t	f	t	t	\N
14383	131	16	07:00 ÀS 13:00	t	f	f	t	\N
14384	131	16	13:00 ÀS 19:00	t	f	f	t	\N
14385	131	20	07:00 ÀS 13:00	t	f	f	t	\N
14386	131	20	13:00 ÀS 19:00	t	f	f	t	\N
14387	131	22	13:00 ÀS 19:00	t	f	f	t	\N
14388	131	23	07:00 ÀS 13:00	t	f	f	t	\N
14389	131	23	13:00 ÀS 19:00	t	f	f	t	\N
14390	131	27	07:00 ÀS 13:00	t	f	f	t	\N
14391	131	27	13:00 ÀS 19:00	t	f	f	t	\N
14392	131	28	07:00 ÀS 13:00	t	f	f	t	\N
14393	131	28	13:00 ÀS 19:00	t	f	f	t	\N
14394	131	30	13:00 ÀS 19:00	t	f	f	t	\N
14395	106	16	07:00 ÀS 13:00	t	f	f	t	\N
14396	106	16	13:00 ÀS 19:00	t	f	f	t	\N
14397	106	16	01:00 ÀS 07:00	t	f	f	t	\N
14398	106	17	07:00 ÀS 13:00	t	f	f	t	\N
14399	106	17	13:00 ÀS 19:00	t	f	f	t	\N
14400	106	17	19:00 ÀS 01:00	t	f	f	t	\N
14401	106	17	01:00 ÀS 07:00	t	f	f	t	\N
14402	106	20	07:00 ÀS 13:00	t	f	f	t	\N
14403	106	20	13:00 ÀS 19:00	t	f	f	t	\N
14404	106	20	01:00 ÀS 07:00	t	f	f	t	\N
14405	106	21	07:00 ÀS 13:00	t	f	f	t	\N
14406	106	21	13:00 ÀS 19:00	t	f	f	t	\N
14407	106	21	19:00 ÀS 01:00	t	f	f	t	\N
14408	106	21	01:00 ÀS 07:00	t	f	f	t	\N
14409	106	24	07:00 ÀS 13:00	t	f	f	t	\N
14410	106	24	13:00 ÀS 19:00	t	f	f	t	\N
14411	106	25	07:00 ÀS 13:00	t	f	f	t	\N
14412	106	25	13:00 ÀS 19:00	t	f	f	t	\N
14413	106	25	19:00 ÀS 01:00	t	f	f	t	\N
14414	106	25	01:00 ÀS 07:00	t	f	f	t	\N
14415	106	28	07:00 ÀS 13:00	t	f	f	t	\N
14416	106	28	13:00 ÀS 19:00	t	f	f	t	\N
14417	106	28	01:00 ÀS 07:00	t	f	f	t	\N
14418	106	29	07:00 ÀS 13:00	t	f	f	t	\N
14419	106	29	13:00 ÀS 19:00	t	f	f	t	\N
14420	106	29	19:00 ÀS 01:00	t	f	f	t	\N
14421	106	29	01:00 ÀS 07:00	t	f	f	t	\N
14422	107	22	07:00 ÀS 13:00	t	f	t	t	\N
14423	107	22	13:00 ÀS 19:00	t	f	t	t	\N
14424	107	23	07:00 ÀS 13:00	t	f	t	t	\N
14425	107	23	13:00 ÀS 19:00	t	f	t	t	\N
14426	107	25	07:00 ÀS 13:00	t	f	t	t	\N
14427	107	25	13:00 ÀS 19:00	t	f	t	t	\N
14428	107	26	07:00 ÀS 13:00	t	f	t	t	\N
14429	107	26	13:00 ÀS 19:00	t	f	t	t	\N
14430	108	16	07:00 ÀS 13:00	t	f	t	t	\N
14431	108	16	13:00 ÀS 19:00	t	f	t	t	\N
14432	108	17	07:00 ÀS 13:00	t	f	t	t	\N
14433	108	17	13:00 ÀS 19:00	t	f	t	t	\N
14434	108	20	07:00 ÀS 13:00	t	f	t	t	\N
14435	108	20	13:00 ÀS 19:00	t	f	t	t	\N
14436	108	21	07:00 ÀS 13:00	t	f	t	t	\N
14437	108	21	13:00 ÀS 19:00	t	f	t	t	\N
14438	108	24	07:00 ÀS 13:00	t	f	t	t	\N
14439	108	24	13:00 ÀS 19:00	t	f	t	t	\N
14440	108	25	07:00 ÀS 13:00	t	f	t	t	\N
14441	108	25	13:00 ÀS 19:00	t	f	t	t	\N
14442	108	27	07:00 ÀS 13:00	t	f	t	t	\N
14443	108	27	13:00 ÀS 19:00	t	f	t	t	\N
14444	108	28	07:00 ÀS 13:00	t	f	t	t	\N
14445	108	28	13:00 ÀS 19:00	t	f	t	t	\N
14446	108	29	07:00 ÀS 13:00	t	f	t	t	\N
14447	108	29	13:00 ÀS 19:00	t	f	t	t	\N
14448	109	10	07:00 ÀS 13:00	t	f	t	t	\N
14449	109	10	13:00 ÀS 19:00	t	f	t	t	\N
14450	109	10	19:00 ÀS 01:00	t	f	t	t	\N
14451	109	10	01:00 ÀS 07:00	t	f	t	t	\N
14452	109	11	07:00 ÀS 13:00	t	f	t	t	\N
14453	109	11	13:00 ÀS 19:00	t	f	t	t	\N
14454	109	11	19:00 ÀS 01:00	t	f	t	t	\N
14455	109	11	01:00 ÀS 07:00	t	f	t	t	\N
14456	109	13	07:00 ÀS 13:00	t	f	t	t	\N
14457	109	13	13:00 ÀS 19:00	t	f	t	t	\N
14458	109	13	19:00 ÀS 01:00	t	f	t	t	\N
14459	109	13	01:00 ÀS 07:00	t	f	t	t	\N
14460	109	14	07:00 ÀS 13:00	t	f	t	t	\N
14461	109	14	13:00 ÀS 19:00	t	f	t	t	\N
14462	109	14	19:00 ÀS 01:00	t	f	t	t	\N
14463	109	14	01:00 ÀS 07:00	t	f	t	t	\N
22857	134	28	13:00 ÀS 19:00	t	f	t	t	\N
22859	134	29	07:00 ÀS 13:00	t	f	t	t	\N
22862	134	31	13:00 ÀS 19:00	t	f	t	t	\N
22863	134	31	19:00 ÀS 01:00	t	f	t	t	\N
14472	109	2	07:00 ÀS 13:00	t	f	t	t	\N
14473	109	2	13:00 ÀS 19:00	t	f	t	t	\N
22874	95	15	13:00 ÀS 19:00	t	f	t	t	\N
22876	95	2	07:00 ÀS 13:00	t	f	t	t	\N
14474	109	2	19:00 ÀS 01:00	t	f	t	t	\N
14475	109	2	01:00 ÀS 07:00	t	f	t	t	\N
14484	109	6	07:00 ÀS 13:00	t	f	t	t	\N
14485	109	6	13:00 ÀS 19:00	t	f	t	t	\N
14486	109	6	19:00 ÀS 01:00	t	f	t	t	\N
14487	109	6	01:00 ÀS 07:00	t	f	t	t	\N
22875	95	15	19:00 ÀS 01:00	t	f	t	t	\N
22877	95	2	13:00 ÀS 19:00	t	f	t	t	\N
22878	95	2	19:00 ÀS 01:00	t	f	t	t	\N
22879	95	3	07:00 ÀS 13:00	t	f	t	t	\N
22880	95	3	13:00 ÀS 19:00	t	f	t	t	\N
22881	95	3	19:00 ÀS 01:00	t	f	t	t	\N
22882	95	4	07:00 ÀS 13:00	t	f	t	t	\N
22883	95	4	13:00 ÀS 19:00	t	f	t	t	\N
22884	95	4	19:00 ÀS 01:00	t	f	t	t	\N
22885	95	6	07:00 ÀS 13:00	t	f	t	t	\N
22886	95	6	13:00 ÀS 19:00	t	f	t	t	\N
22887	95	6	19:00 ÀS 01:00	t	f	t	t	\N
22888	95	8	07:00 ÀS 13:00	t	f	t	t	\N
22889	95	8	13:00 ÀS 19:00	t	f	t	t	\N
22890	95	8	19:00 ÀS 01:00	t	f	t	t	\N
14544	111	17	13:00 ÀS 19:00	t	f	t	t	\N
14545	111	17	19:00 ÀS 01:00	t	f	t	t	\N
14546	111	17	01:00 ÀS 07:00	t	f	t	t	\N
14547	111	20	07:00 ÀS 13:00	t	f	t	t	\N
14548	111	20	13:00 ÀS 19:00	t	f	t	t	\N
14549	111	20	19:00 ÀS 01:00	t	f	t	t	\N
14550	111	20	01:00 ÀS 07:00	t	f	t	t	\N
14551	111	25	13:00 ÀS 19:00	t	f	t	t	\N
14552	111	25	19:00 ÀS 01:00	t	f	t	t	\N
14553	111	25	01:00 ÀS 07:00	t	f	t	t	\N
14554	111	28	07:00 ÀS 13:00	t	f	t	t	\N
14555	111	28	13:00 ÀS 19:00	t	f	t	t	\N
14556	111	28	19:00 ÀS 01:00	t	f	t	t	\N
14557	111	28	01:00 ÀS 07:00	t	f	t	t	\N
14558	112	21	19:00 ÀS 01:00	t	f	f	t	\N
14559	112	23	01:00 ÀS 07:00	t	f	f	t	\N
14560	112	29	19:00 ÀS 01:00	t	f	f	t	\N
14561	113	17	01:00 ÀS 07:00	t	f	t	t	\N
14562	113	18	01:00 ÀS 07:00	t	f	t	t	\N
14563	113	21	01:00 ÀS 07:00	t	f	t	t	\N
14564	113	22	01:00 ÀS 07:00	t	f	t	t	\N
14565	113	24	01:00 ÀS 07:00	t	f	t	t	\N
14566	113	25	01:00 ÀS 07:00	t	f	t	t	\N
14567	113	28	01:00 ÀS 07:00	t	f	t	t	\N
14568	113	29	01:00 ÀS 07:00	t	f	t	t	\N
14569	113	30	01:00 ÀS 07:00	t	f	t	t	\N
14570	114	17	07:00 ÀS 13:00	t	f	t	t	\N
14571	114	17	13:00 ÀS 19:00	t	f	t	t	\N
14572	114	17	19:00 ÀS 01:00	t	f	t	t	\N
14573	114	18	07:00 ÀS 13:00	t	f	t	t	\N
14574	114	18	13:00 ÀS 19:00	t	f	t	t	\N
14575	114	18	19:00 ÀS 01:00	t	f	t	t	\N
14576	114	21	07:00 ÀS 13:00	t	f	t	t	\N
14577	114	21	13:00 ÀS 19:00	t	f	t	t	\N
14578	114	21	19:00 ÀS 01:00	t	f	t	t	\N
14579	114	22	07:00 ÀS 13:00	t	f	t	t	\N
14580	114	22	13:00 ÀS 19:00	t	f	t	t	\N
14581	114	22	19:00 ÀS 01:00	t	f	t	t	\N
14582	114	25	07:00 ÀS 13:00	t	f	t	t	\N
14583	114	25	13:00 ÀS 19:00	t	f	t	t	\N
14584	114	25	19:00 ÀS 01:00	t	f	t	t	\N
14585	114	26	07:00 ÀS 13:00	t	f	t	t	\N
14586	114	26	13:00 ÀS 19:00	t	f	t	t	\N
14587	114	26	19:00 ÀS 01:00	t	f	t	t	\N
14588	114	29	07:00 ÀS 13:00	t	f	t	t	\N
14589	114	29	13:00 ÀS 19:00	t	f	t	t	\N
14590	114	29	19:00 ÀS 01:00	t	f	t	t	\N
14591	114	30	07:00 ÀS 13:00	t	f	t	t	\N
14592	114	30	13:00 ÀS 19:00	t	f	t	t	\N
14593	114	30	19:00 ÀS 01:00	t	f	t	t	\N
29376	237	15	13:00 ÀS 19:00	t	f	f	t	\N
22956	75	7	13:00 ÀS 19:00	t	f	t	t	\N
22957	75	7	19:00 ÀS 01:00	t	f	t	t	\N
22958	75	7	01:00 ÀS 07:00	t	f	t	t	\N
22959	75	8	07:00 ÀS 13:00	t	f	t	t	\N
22960	75	8	13:00 ÀS 19:00	t	f	t	t	\N
22961	75	8	19:00 ÀS 01:00	t	f	t	t	\N
22962	75	8	01:00 ÀS 07:00	t	f	t	t	\N
22988	192	27	13:00 ÀS 19:00	t	f	t	t	\N
22989	192	27	19:00 ÀS 01:00	t	f	t	t	\N
22990	192	27	01:00 ÀS 07:00	t	f	t	t	\N
22991	192	28	07:00 ÀS 13:00	t	f	t	t	\N
22992	192	28	13:00 ÀS 19:00	t	f	t	t	\N
22993	192	28	19:00 ÀS 01:00	t	f	t	t	\N
22994	192	28	01:00 ÀS 07:00	t	f	t	t	\N
22995	192	30	07:00 ÀS 13:00	t	f	t	t	\N
22996	192	30	13:00 ÀS 19:00	t	f	t	t	\N
22997	192	31	07:00 ÀS 13:00	t	f	t	t	\N
22998	192	31	13:00 ÀS 19:00	t	f	t	t	\N
30412	96	11	13:00 ÀS 19:00	t	f	t	t	\N
30414	96	13	13:00 ÀS 19:00	t	f	t	t	\N
14594	115	23	13:00 ÀS 19:00	t	f	f	t	\N
14595	115	23	19:00 ÀS 01:00	t	f	f	t	\N
14596	115	24	13:00 ÀS 19:00	t	f	f	t	\N
14597	115	24	19:00 ÀS 01:00	t	f	f	t	\N
14598	115	26	13:00 ÀS 19:00	t	f	f	t	\N
14599	115	26	19:00 ÀS 01:00	t	f	f	t	\N
14600	115	27	13:00 ÀS 19:00	t	f	f	t	\N
14601	115	27	19:00 ÀS 01:00	t	f	f	t	\N
14602	115	30	13:00 ÀS 19:00	t	f	f	t	\N
14603	115	30	19:00 ÀS 01:00	t	f	f	t	\N
14611	117	16	13:00 ÀS 19:00	t	f	t	t	\N
14612	117	16	19:00 ÀS 01:00	t	f	t	t	\N
14613	117	17	07:00 ÀS 13:00	t	f	t	t	\N
14614	117	17	13:00 ÀS 19:00	t	f	t	t	\N
14615	117	17	19:00 ÀS 01:00	t	f	t	t	\N
14616	117	18	07:00 ÀS 13:00	t	f	t	t	\N
14617	117	21	13:00 ÀS 19:00	t	f	t	t	\N
14618	117	21	19:00 ÀS 01:00	t	f	t	t	\N
14619	117	22	07:00 ÀS 13:00	t	f	t	t	\N
14620	117	22	13:00 ÀS 19:00	t	f	t	t	\N
14621	117	22	19:00 ÀS 01:00	t	f	t	t	\N
14622	117	26	07:00 ÀS 13:00	t	f	t	t	\N
14623	117	28	13:00 ÀS 19:00	t	f	t	t	\N
14624	117	28	19:00 ÀS 01:00	t	f	t	t	\N
14625	117	29	07:00 ÀS 13:00	t	f	t	t	\N
14626	117	29	13:00 ÀS 19:00	t	f	t	t	\N
14627	118	16	13:00 ÀS 19:00	t	f	t	t	\N
14628	118	16	19:00 ÀS 01:00	t	f	t	t	\N
14629	118	16	01:00 ÀS 07:00	t	f	t	t	\N
14630	118	17	13:00 ÀS 19:00	t	f	t	t	\N
14631	118	17	19:00 ÀS 01:00	t	f	t	t	\N
14632	118	17	01:00 ÀS 07:00	t	f	t	t	\N
14633	118	18	07:00 ÀS 13:00	t	f	t	t	\N
14634	118	18	13:00 ÀS 19:00	t	f	t	t	\N
14635	118	18	19:00 ÀS 01:00	t	f	t	t	\N
14636	118	18	01:00 ÀS 07:00	t	f	t	t	\N
14637	118	19	07:00 ÀS 13:00	t	f	t	t	\N
14638	118	19	13:00 ÀS 19:00	t	f	t	t	\N
14639	118	19	19:00 ÀS 01:00	t	f	t	t	\N
14640	118	19	01:00 ÀS 07:00	t	f	t	t	\N
14641	118	20	13:00 ÀS 19:00	t	f	t	t	\N
14642	118	20	19:00 ÀS 01:00	t	f	t	t	\N
14643	118	20	01:00 ÀS 07:00	t	f	t	t	\N
14644	118	21	13:00 ÀS 19:00	t	f	t	t	\N
14645	118	21	19:00 ÀS 01:00	t	f	t	t	\N
14646	118	21	01:00 ÀS 07:00	t	f	t	t	\N
14647	118	22	13:00 ÀS 19:00	t	f	t	t	\N
14648	118	22	19:00 ÀS 01:00	t	f	t	t	\N
14649	118	22	01:00 ÀS 07:00	t	f	t	t	\N
14650	118	23	13:00 ÀS 19:00	t	f	t	t	\N
14651	118	23	19:00 ÀS 01:00	t	f	t	t	\N
14652	118	23	01:00 ÀS 07:00	t	f	t	t	\N
14653	118	24	13:00 ÀS 19:00	t	f	t	t	\N
14654	118	24	19:00 ÀS 01:00	t	f	t	t	\N
14655	118	24	01:00 ÀS 07:00	t	f	t	t	\N
14656	118	25	07:00 ÀS 13:00	t	f	t	t	\N
14657	118	25	13:00 ÀS 19:00	t	f	t	t	\N
14658	118	25	19:00 ÀS 01:00	t	f	t	t	\N
14659	118	25	01:00 ÀS 07:00	t	f	t	t	\N
14660	118	26	07:00 ÀS 13:00	t	f	t	t	\N
14661	118	26	13:00 ÀS 19:00	t	f	t	t	\N
14662	118	26	19:00 ÀS 01:00	t	f	t	t	\N
14663	118	26	01:00 ÀS 07:00	t	f	t	t	\N
14664	118	27	13:00 ÀS 19:00	t	f	t	t	\N
22917	191	27	19:00 ÀS 01:00	t	f	f	t	\N
14665	118	27	19:00 ÀS 01:00	t	f	t	t	\N
14666	118	27	01:00 ÀS 07:00	t	f	t	t	\N
14667	118	28	13:00 ÀS 19:00	t	f	t	t	\N
14668	118	28	19:00 ÀS 01:00	t	f	t	t	\N
14669	118	28	01:00 ÀS 07:00	t	f	t	t	\N
14670	118	29	13:00 ÀS 19:00	t	f	t	t	\N
14671	118	29	19:00 ÀS 01:00	t	f	t	t	\N
14672	118	29	01:00 ÀS 07:00	t	f	t	t	\N
14673	118	30	13:00 ÀS 19:00	t	f	t	t	\N
14674	118	30	19:00 ÀS 01:00	t	f	t	t	\N
14675	118	30	01:00 ÀS 07:00	t	f	t	t	\N
14676	119	22	19:00 ÀS 01:00	t	f	t	t	\N
14677	119	22	01:00 ÀS 07:00	t	f	t	t	\N
14678	119	23	19:00 ÀS 01:00	t	f	t	t	\N
14679	119	23	01:00 ÀS 07:00	t	f	t	t	\N
14680	120	16	13:00 ÀS 19:00	t	f	t	t	\N
14681	120	16	19:00 ÀS 01:00	t	f	t	t	\N
14682	120	17	13:00 ÀS 19:00	t	f	t	t	\N
14683	120	17	19:00 ÀS 01:00	t	f	t	t	\N
14684	120	18	07:00 ÀS 13:00	t	f	t	t	\N
14685	120	18	13:00 ÀS 19:00	t	f	t	t	\N
14686	120	18	19:00 ÀS 01:00	t	f	t	t	\N
14687	120	19	07:00 ÀS 13:00	t	f	t	t	\N
14688	120	19	13:00 ÀS 19:00	t	f	t	t	\N
14689	120	19	19:00 ÀS 01:00	t	f	t	t	\N
14690	120	20	13:00 ÀS 19:00	t	f	t	t	\N
14691	120	20	19:00 ÀS 01:00	t	f	t	t	\N
14692	120	21	13:00 ÀS 19:00	t	f	t	t	\N
14693	120	21	19:00 ÀS 01:00	t	f	t	t	\N
14694	120	22	13:00 ÀS 19:00	t	f	t	t	\N
14695	120	22	19:00 ÀS 01:00	t	f	t	t	\N
14696	120	23	13:00 ÀS 19:00	t	f	t	t	\N
14697	120	23	19:00 ÀS 01:00	t	f	t	t	\N
14698	120	24	13:00 ÀS 19:00	t	f	t	t	\N
14699	120	24	19:00 ÀS 01:00	t	f	t	t	\N
14700	120	25	07:00 ÀS 13:00	t	f	t	t	\N
14701	120	25	13:00 ÀS 19:00	t	f	t	t	\N
14702	120	25	19:00 ÀS 01:00	t	f	t	t	\N
14703	120	26	07:00 ÀS 13:00	t	f	t	t	\N
14704	120	26	13:00 ÀS 19:00	t	f	t	t	\N
14705	120	26	19:00 ÀS 01:00	t	f	t	t	\N
14706	120	27	13:00 ÀS 19:00	t	f	t	t	\N
14707	120	27	19:00 ÀS 01:00	t	f	t	t	\N
14708	120	28	13:00 ÀS 19:00	t	f	t	t	\N
14709	120	28	19:00 ÀS 01:00	t	f	t	t	\N
14710	120	29	13:00 ÀS 19:00	t	f	t	t	\N
14711	120	29	19:00 ÀS 01:00	t	f	t	t	\N
14712	120	30	13:00 ÀS 19:00	t	f	t	t	\N
14713	120	30	19:00 ÀS 01:00	t	f	t	t	\N
30416	96	15	13:00 ÀS 19:00	t	f	t	t	\N
30417	96	4	13:00 ÀS 19:00	t	f	t	t	\N
30419	96	6	13:00 ÀS 19:00	t	f	t	t	\N
30420	96	7	13:00 ÀS 19:00	t	f	t	t	\N
30421	96	8	13:00 ÀS 19:00	t	f	t	t	\N
14714	121	17	13:00 ÀS 19:00	t	f	t	t	\N
14715	121	17	19:00 ÀS 01:00	t	f	t	t	\N
14716	121	17	01:00 ÀS 07:00	t	f	t	t	\N
14717	121	22	07:00 ÀS 13:00	t	f	t	t	\N
14718	121	22	13:00 ÀS 19:00	t	f	t	t	\N
14719	121	22	19:00 ÀS 01:00	t	f	t	t	\N
14720	121	22	01:00 ÀS 07:00	t	f	t	t	\N
14721	121	23	07:00 ÀS 13:00	t	f	t	t	\N
14722	121	23	13:00 ÀS 19:00	t	f	t	t	\N
14723	121	23	19:00 ÀS 01:00	t	f	t	t	\N
14724	121	23	01:00 ÀS 07:00	t	f	t	t	\N
14725	121	26	07:00 ÀS 13:00	t	f	t	t	\N
14726	121	26	13:00 ÀS 19:00	t	f	t	t	\N
14727	121	26	19:00 ÀS 01:00	t	f	t	t	\N
14728	121	26	01:00 ÀS 07:00	t	f	t	t	\N
14729	121	27	07:00 ÀS 13:00	t	f	t	t	\N
14730	121	27	13:00 ÀS 19:00	t	f	t	t	\N
14731	121	27	19:00 ÀS 01:00	t	f	t	t	\N
14732	121	27	01:00 ÀS 07:00	t	f	t	t	\N
14733	121	30	07:00 ÀS 13:00	t	f	t	t	\N
14734	121	30	13:00 ÀS 19:00	t	f	t	t	\N
14735	121	30	19:00 ÀS 01:00	t	f	t	t	\N
14736	121	30	01:00 ÀS 07:00	t	f	t	t	\N
30413	96	12	13:00 ÀS 19:00	t	f	t	t	\N
30415	96	14	13:00 ÀS 19:00	t	f	t	t	\N
14739	122	15	13:00 ÀS 19:00	t	f	f	t	\N
14740	122	1	13:00 ÀS 19:00	t	f	f	t	\N
14741	122	2	13:00 ÀS 19:00	t	f	f	t	\N
30418	96	5	13:00 ÀS 19:00	t	f	t	t	\N
14744	122	8	13:00 ÀS 19:00	t	f	f	t	\N
14745	122	9	13:00 ÀS 19:00	t	f	f	t	\N
30431	193	29	13:00 ÀS 19:00	t	f	t	t	\N
14753	124	17	07:00 ÀS 13:00	t	f	t	t	\N
14754	124	17	13:00 ÀS 19:00	t	f	t	t	\N
14755	124	17	19:00 ÀS 01:00	t	f	t	t	\N
14756	124	17	01:00 ÀS 07:00	t	f	t	t	\N
14757	124	18	07:00 ÀS 13:00	t	f	t	t	\N
14758	124	18	13:00 ÀS 19:00	t	f	t	t	\N
14759	124	18	19:00 ÀS 01:00	t	f	t	t	\N
14760	124	18	01:00 ÀS 07:00	t	f	t	t	\N
14761	124	19	07:00 ÀS 13:00	t	f	t	t	\N
14762	124	19	13:00 ÀS 19:00	t	f	t	t	\N
14763	124	19	19:00 ÀS 01:00	t	f	t	t	\N
14764	124	19	01:00 ÀS 07:00	t	f	t	t	\N
14765	124	21	07:00 ÀS 13:00	t	f	t	t	\N
14766	124	21	13:00 ÀS 19:00	t	f	t	t	\N
14767	124	21	19:00 ÀS 01:00	t	f	t	t	\N
14768	124	21	01:00 ÀS 07:00	t	f	t	t	\N
14769	124	22	07:00 ÀS 13:00	t	f	t	t	\N
14770	124	22	13:00 ÀS 19:00	t	f	t	t	\N
14771	124	22	19:00 ÀS 01:00	t	f	t	t	\N
14772	124	22	01:00 ÀS 07:00	t	f	t	t	\N
14773	124	23	07:00 ÀS 13:00	t	f	t	t	\N
14774	124	23	13:00 ÀS 19:00	t	f	t	t	\N
14775	124	23	19:00 ÀS 01:00	t	f	t	t	\N
14776	124	23	01:00 ÀS 07:00	t	f	t	t	\N
14777	124	25	07:00 ÀS 13:00	t	f	t	t	\N
14778	124	25	13:00 ÀS 19:00	t	f	t	t	\N
14779	124	25	19:00 ÀS 01:00	t	f	t	t	\N
14780	124	25	01:00 ÀS 07:00	t	f	t	t	\N
14781	124	26	07:00 ÀS 13:00	t	f	t	t	\N
14782	124	26	13:00 ÀS 19:00	t	f	t	t	\N
14783	124	26	19:00 ÀS 01:00	t	f	t	t	\N
14784	124	26	01:00 ÀS 07:00	t	f	t	t	\N
14785	124	27	07:00 ÀS 13:00	t	f	t	t	\N
14786	124	27	13:00 ÀS 19:00	t	f	t	t	\N
14787	124	27	19:00 ÀS 01:00	t	f	t	t	\N
14788	124	27	01:00 ÀS 07:00	t	f	t	t	\N
14789	124	29	07:00 ÀS 13:00	t	f	t	t	\N
14790	124	29	13:00 ÀS 19:00	t	f	t	t	\N
14791	124	29	19:00 ÀS 01:00	t	f	t	t	\N
14792	124	29	01:00 ÀS 07:00	t	f	t	t	\N
14793	124	30	07:00 ÀS 13:00	t	f	t	t	\N
14794	124	30	13:00 ÀS 19:00	t	f	t	t	\N
14795	124	30	19:00 ÀS 01:00	t	f	t	t	\N
14796	124	30	01:00 ÀS 07:00	t	f	t	t	\N
14797	125	17	13:00 ÀS 19:00	t	f	t	t	\N
14798	125	17	19:00 ÀS 01:00	t	f	t	t	\N
14799	125	21	13:00 ÀS 19:00	t	f	t	t	\N
14800	125	21	19:00 ÀS 01:00	t	f	t	t	\N
14801	125	22	13:00 ÀS 19:00	t	f	t	t	\N
14802	125	22	19:00 ÀS 01:00	t	f	t	t	\N
14803	125	23	13:00 ÀS 19:00	t	f	t	t	\N
14804	125	23	19:00 ÀS 01:00	t	f	t	t	\N
14805	125	27	13:00 ÀS 19:00	t	f	t	t	\N
14806	125	27	19:00 ÀS 01:00	t	f	t	t	\N
14807	125	29	13:00 ÀS 19:00	t	f	t	t	\N
14808	125	29	19:00 ÀS 01:00	t	f	t	t	\N
14809	125	30	13:00 ÀS 19:00	t	f	t	t	\N
14810	125	30	19:00 ÀS 01:00	t	f	t	t	\N
14811	126	16	13:00 ÀS 19:00	t	f	f	t	\N
14812	126	16	19:00 ÀS 01:00	t	f	f	t	\N
14813	126	18	13:00 ÀS 19:00	t	f	f	t	\N
14814	126	18	19:00 ÀS 01:00	t	f	f	t	\N
14815	126	19	13:00 ÀS 19:00	t	f	f	t	\N
14816	126	19	19:00 ÀS 01:00	t	f	f	t	\N
14817	126	20	13:00 ÀS 19:00	t	f	f	t	\N
14818	126	20	19:00 ÀS 01:00	t	f	f	t	\N
14819	126	22	13:00 ÀS 19:00	t	f	f	t	\N
14820	126	22	19:00 ÀS 01:00	t	f	f	t	\N
14821	126	23	13:00 ÀS 19:00	t	f	f	t	\N
14822	126	23	19:00 ÀS 01:00	t	f	f	t	\N
14823	126	24	13:00 ÀS 19:00	t	f	f	t	\N
14824	126	24	19:00 ÀS 01:00	t	f	f	t	\N
14825	126	26	13:00 ÀS 19:00	t	f	f	t	\N
14826	126	26	19:00 ÀS 01:00	t	f	f	t	\N
14827	126	27	13:00 ÀS 19:00	t	f	f	t	\N
14828	126	27	19:00 ÀS 01:00	t	f	f	t	\N
14829	127	16	13:00 ÀS 19:00	t	f	t	t	\N
14830	127	20	13:00 ÀS 19:00	t	f	t	t	\N
14831	127	28	13:00 ÀS 19:00	t	f	t	t	\N
14832	127	29	13:00 ÀS 19:00	t	f	t	t	\N
14833	128	19	07:00 ÀS 13:00	t	f	t	t	\N
30441	194	13	13:00 ÀS 19:00	t	f	t	t	\N
30442	194	13	19:00 ÀS 01:00	t	f	t	t	\N
30444	194	14	13:00 ÀS 19:00	t	f	t	t	\N
30445	194	14	19:00 ÀS 01:00	t	f	t	t	\N
30446	194	14	01:00 ÀS 07:00	t	f	t	t	\N
14834	128	19	13:00 ÀS 19:00	t	f	t	t	\N
14835	128	20	07:00 ÀS 13:00	t	f	t	t	\N
14836	128	20	13:00 ÀS 19:00	t	f	t	t	\N
14837	128	22	07:00 ÀS 13:00	t	f	t	t	\N
14838	128	22	13:00 ÀS 19:00	t	f	t	t	\N
14839	128	23	07:00 ÀS 13:00	t	f	t	t	\N
14840	128	23	13:00 ÀS 19:00	t	f	t	t	\N
14841	128	27	07:00 ÀS 13:00	t	f	t	t	\N
14842	128	27	13:00 ÀS 19:00	t	f	t	t	\N
14843	128	28	07:00 ÀS 13:00	t	f	t	t	\N
14844	128	28	13:00 ÀS 19:00	t	f	t	t	\N
14845	128	30	07:00 ÀS 13:00	t	f	t	t	\N
14846	128	30	13:00 ÀS 19:00	t	f	t	t	\N
14847	129	19	07:00 ÀS 13:00	t	f	t	t	\N
14848	129	19	13:00 ÀS 19:00	t	f	t	t	\N
14849	129	19	19:00 ÀS 01:00	t	f	t	t	\N
14850	129	19	01:00 ÀS 07:00	t	f	t	t	\N
14851	129	27	07:00 ÀS 13:00	t	f	t	t	\N
14852	129	27	13:00 ÀS 19:00	t	f	t	t	\N
14853	129	27	19:00 ÀS 01:00	t	f	t	t	\N
14854	129	27	01:00 ÀS 07:00	t	f	t	t	\N
14855	130	16	07:00 ÀS 13:00	t	f	t	t	\N
14856	130	16	13:00 ÀS 19:00	t	f	t	t	\N
14857	130	16	19:00 ÀS 01:00	t	f	t	t	\N
14858	130	16	01:00 ÀS 07:00	t	f	t	t	\N
14859	130	17	07:00 ÀS 13:00	t	f	t	t	\N
14860	130	17	13:00 ÀS 19:00	t	f	t	t	\N
14861	130	17	19:00 ÀS 01:00	t	f	t	t	\N
14862	130	17	01:00 ÀS 07:00	t	f	t	t	\N
14863	130	18	07:00 ÀS 13:00	t	f	t	t	\N
14864	130	18	13:00 ÀS 19:00	t	f	t	t	\N
14865	130	18	19:00 ÀS 01:00	t	f	t	t	\N
14866	130	18	01:00 ÀS 07:00	t	f	t	t	\N
14867	130	20	07:00 ÀS 13:00	t	f	t	t	\N
14868	130	20	13:00 ÀS 19:00	t	f	t	t	\N
14869	130	20	19:00 ÀS 01:00	t	f	t	t	\N
14870	130	20	01:00 ÀS 07:00	t	f	t	t	\N
14871	130	21	07:00 ÀS 13:00	t	f	t	t	\N
14872	130	21	13:00 ÀS 19:00	t	f	t	t	\N
14873	130	21	19:00 ÀS 01:00	t	f	t	t	\N
14874	130	21	01:00 ÀS 07:00	t	f	t	t	\N
14875	130	22	07:00 ÀS 13:00	t	f	t	t	\N
14876	130	22	13:00 ÀS 19:00	t	f	t	t	\N
14877	130	22	19:00 ÀS 01:00	t	f	t	t	\N
14878	130	22	01:00 ÀS 07:00	t	f	t	t	\N
14879	130	24	07:00 ÀS 13:00	t	f	t	t	\N
14880	130	24	13:00 ÀS 19:00	t	f	t	t	\N
14881	130	24	19:00 ÀS 01:00	t	f	t	t	\N
14882	130	24	01:00 ÀS 07:00	t	f	t	t	\N
14883	130	25	07:00 ÀS 13:00	t	f	t	t	\N
14884	130	25	13:00 ÀS 19:00	t	f	t	t	\N
14885	130	25	19:00 ÀS 01:00	t	f	t	t	\N
14886	130	25	01:00 ÀS 07:00	t	f	t	t	\N
14887	130	26	07:00 ÀS 13:00	t	f	t	t	\N
14888	130	26	13:00 ÀS 19:00	t	f	t	t	\N
14889	130	26	19:00 ÀS 01:00	t	f	t	t	\N
14890	130	26	01:00 ÀS 07:00	t	f	t	t	\N
14891	130	28	07:00 ÀS 13:00	t	f	t	t	\N
14892	130	28	13:00 ÀS 19:00	t	f	t	t	\N
14893	130	28	19:00 ÀS 01:00	t	f	t	t	\N
14894	130	28	01:00 ÀS 07:00	t	f	t	t	\N
14895	130	29	07:00 ÀS 13:00	t	f	t	t	\N
14896	130	29	13:00 ÀS 19:00	t	f	t	t	\N
14897	130	29	19:00 ÀS 01:00	t	f	t	t	\N
14898	130	29	01:00 ÀS 07:00	t	f	t	t	\N
14899	130	30	07:00 ÀS 13:00	t	f	t	t	\N
14900	130	30	13:00 ÀS 19:00	t	f	t	t	\N
14901	130	30	19:00 ÀS 01:00	t	f	t	t	\N
14902	130	30	01:00 ÀS 07:00	t	f	t	t	\N
30448	194	15	19:00 ÀS 01:00	t	f	t	t	\N
30449	194	15	01:00 ÀS 07:00	t	f	t	t	\N
30451	194	1	19:00 ÀS 01:00	t	f	t	t	\N
30452	194	1	01:00 ÀS 07:00	t	f	t	t	\N
30453	194	2	13:00 ÀS 19:00	t	f	t	t	\N
30454	194	2	19:00 ÀS 01:00	t	f	t	t	\N
30455	194	2	01:00 ÀS 07:00	t	f	t	t	\N
30456	194	3	13:00 ÀS 19:00	t	f	t	t	\N
30457	194	3	19:00 ÀS 01:00	t	f	t	t	\N
30458	194	3	01:00 ÀS 07:00	t	f	t	t	\N
30459	194	4	13:00 ÀS 19:00	t	f	t	t	\N
30460	194	4	19:00 ÀS 01:00	t	f	t	t	\N
23659	64	1	01:00 ÀS 07:00	t	f	t	t	\N
23663	132	17	13:00 ÀS 19:00	t	f	t	t	\N
23664	132	17	19:00 ÀS 01:00	t	f	t	t	\N
23665	132	17	01:00 ÀS 07:00	t	f	t	t	\N
23666	132	21	13:00 ÀS 19:00	t	f	t	t	\N
30443	194	13	01:00 ÀS 07:00	t	f	t	t	\N
30447	194	15	13:00 ÀS 19:00	t	f	t	t	\N
30450	194	1	13:00 ÀS 19:00	t	f	t	t	\N
30461	194	4	01:00 ÀS 07:00	t	f	t	t	\N
30462	194	5	13:00 ÀS 19:00	t	f	t	t	\N
30463	194	5	19:00 ÀS 01:00	t	f	t	t	\N
30464	194	5	01:00 ÀS 07:00	t	f	t	t	\N
30465	194	6	13:00 ÀS 19:00	t	f	t	t	\N
30466	194	6	19:00 ÀS 01:00	t	f	t	t	\N
30467	194	6	01:00 ÀS 07:00	t	f	t	t	\N
30468	194	7	13:00 ÀS 19:00	t	f	t	t	\N
30469	194	7	19:00 ÀS 01:00	t	f	t	t	\N
30470	194	7	01:00 ÀS 07:00	t	f	t	t	\N
30471	194	8	13:00 ÀS 19:00	t	f	t	t	\N
30472	194	8	19:00 ÀS 01:00	t	f	t	t	\N
30473	194	8	01:00 ÀS 07:00	t	f	t	t	\N
30474	194	9	13:00 ÀS 19:00	t	f	t	t	\N
30475	194	9	19:00 ÀS 01:00	t	f	t	t	\N
30476	194	9	01:00 ÀS 07:00	t	f	t	t	\N
30511	195	27	19:00 ÀS 01:00	t	f	t	t	\N
30512	195	27	01:00 ÀS 07:00	t	f	t	t	\N
30513	195	28	13:00 ÀS 19:00	t	f	t	t	\N
30514	195	28	19:00 ÀS 01:00	t	f	t	t	\N
30515	195	28	01:00 ÀS 07:00	t	f	t	t	\N
30516	195	29	13:00 ÀS 19:00	t	f	t	t	\N
30517	195	29	19:00 ÀS 01:00	t	f	t	t	\N
30518	195	29	01:00 ÀS 07:00	t	f	t	t	\N
30519	195	30	13:00 ÀS 19:00	t	f	t	t	\N
30520	195	30	19:00 ÀS 01:00	t	f	t	t	\N
30521	195	30	01:00 ÀS 07:00	t	f	t	t	\N
30522	195	31	13:00 ÀS 19:00	t	f	t	t	\N
30523	195	31	19:00 ÀS 01:00	t	f	t	t	\N
23773	209	16	13:00 ÀS 19:00	t	f	t	t	\N
23774	209	16	19:00 ÀS 01:00	t	f	t	t	\N
23775	209	16	01:00 ÀS 07:00	t	f	t	t	\N
23747	65	12	13:00 ÀS 19:00	t	f	t	t	\N
23748	65	12	19:00 ÀS 01:00	t	f	t	t	\N
23749	65	12	01:00 ÀS 07:00	t	f	t	t	\N
23789	209	25	13:00 ÀS 19:00	t	f	t	t	\N
23790	209	25	19:00 ÀS 01:00	t	f	t	t	\N
23791	209	28	13:00 ÀS 19:00	t	f	t	t	\N
23792	209	28	19:00 ÀS 01:00	t	f	t	t	\N
23793	209	28	01:00 ÀS 07:00	t	f	t	t	\N
23798	130	10	13:00 ÀS 19:00	t	f	t	t	\N
23799	130	10	19:00 ÀS 01:00	t	f	t	t	\N
23800	130	11	07:00 ÀS 13:00	t	f	t	t	\N
23801	130	11	01:00 ÀS 07:00	t	f	t	t	\N
23802	130	12	07:00 ÀS 13:00	t	f	t	t	\N
23776	209	17	13:00 ÀS 19:00	t	f	t	t	\N
23777	209	17	19:00 ÀS 01:00	t	f	t	t	\N
23778	209	20	13:00 ÀS 19:00	t	f	t	t	\N
23779	209	20	19:00 ÀS 01:00	t	f	t	t	\N
23780	209	20	01:00 ÀS 07:00	t	f	t	t	\N
23781	209	21	13:00 ÀS 19:00	t	f	t	t	\N
23782	209	21	19:00 ÀS 01:00	t	f	t	t	\N
23783	209	21	01:00 ÀS 07:00	t	f	t	t	\N
23784	209	22	13:00 ÀS 19:00	t	f	t	t	\N
23785	209	22	19:00 ÀS 01:00	t	f	t	t	\N
23786	209	24	13:00 ÀS 19:00	t	f	t	t	\N
23787	209	24	19:00 ÀS 01:00	t	f	t	t	\N
23788	209	24	01:00 ÀS 07:00	t	f	t	t	\N
23803	130	12	13:00 ÀS 19:00	t	f	t	t	\N
23804	130	12	19:00 ÀS 01:00	t	f	t	t	\N
23805	130	12	01:00 ÀS 07:00	t	f	t	t	\N
23806	130	13	07:00 ÀS 13:00	t	f	t	t	\N
23807	130	13	13:00 ÀS 19:00	t	f	t	t	\N
23808	130	13	19:00 ÀS 01:00	t	f	t	t	\N
23809	130	13	01:00 ÀS 07:00	t	f	t	t	\N
23810	130	14	13:00 ÀS 19:00	t	f	t	t	\N
23811	130	14	19:00 ÀS 01:00	t	f	t	t	\N
23812	130	15	07:00 ÀS 13:00	t	f	t	t	\N
23813	130	15	01:00 ÀS 07:00	t	f	t	t	\N
23814	130	4	07:00 ÀS 13:00	t	f	t	t	\N
23815	130	4	13:00 ÀS 19:00	t	f	t	t	\N
23816	130	4	19:00 ÀS 01:00	t	f	t	t	\N
23817	130	4	01:00 ÀS 07:00	t	f	t	t	\N
23818	130	5	07:00 ÀS 13:00	t	f	t	t	\N
23819	130	5	13:00 ÀS 19:00	t	f	t	t	\N
30524	195	31	01:00 ÀS 07:00	t	f	t	t	\N
30532	63	12	01:00 ÀS 07:00	t	f	t	t	\N
30533	63	13	07:00 ÀS 13:00	t	f	t	t	\N
30535	63	13	19:00 ÀS 01:00	t	f	t	t	\N
30536	63	13	01:00 ÀS 07:00	t	f	t	t	\N
30537	63	15	07:00 ÀS 13:00	t	f	t	t	\N
30538	63	15	13:00 ÀS 19:00	t	f	t	t	\N
30539	63	15	19:00 ÀS 01:00	t	f	t	t	\N
30540	63	15	01:00 ÀS 07:00	t	f	t	t	\N
30541	63	1	07:00 ÀS 13:00	t	f	t	t	\N
30542	63	1	13:00 ÀS 19:00	t	f	t	t	\N
30543	63	1	19:00 ÀS 01:00	t	f	t	t	\N
30544	63	1	01:00 ÀS 07:00	t	f	t	t	\N
30545	63	3	07:00 ÀS 13:00	t	f	t	t	\N
23879	118	10	07:00 ÀS 13:00	t	f	t	t	\N
23830	130	9	13:00 ÀS 19:00	t	f	t	t	\N
23880	118	10	13:00 ÀS 19:00	t	f	t	t	\N
23832	210	16	07:00 ÀS 13:00	t	f	t	t	\N
23833	210	16	13:00 ÀS 19:00	t	f	t	t	\N
23916	118	5	13:00 ÀS 19:00	t	f	t	t	\N
23917	118	5	19:00 ÀS 01:00	t	f	t	t	\N
23918	118	5	01:00 ÀS 07:00	t	f	t	t	\N
23919	118	6	13:00 ÀS 19:00	t	f	t	t	\N
23920	118	6	19:00 ÀS 01:00	t	f	t	t	\N
23928	211	16	07:00 ÀS 13:00	t	f	t	t	\N
23929	211	16	13:00 ÀS 19:00	t	f	t	t	\N
23930	211	16	19:00 ÀS 01:00	t	f	t	t	\N
23931	211	16	01:00 ÀS 07:00	t	f	t	t	\N
23932	211	17	07:00 ÀS 13:00	t	f	t	t	\N
23933	211	17	13:00 ÀS 19:00	t	f	t	t	\N
23881	118	10	19:00 ÀS 01:00	t	f	t	t	\N
23882	118	10	01:00 ÀS 07:00	t	f	t	t	\N
23883	118	11	13:00 ÀS 19:00	t	f	t	t	\N
23884	118	11	19:00 ÀS 01:00	t	f	t	t	\N
23885	118	11	01:00 ÀS 07:00	t	f	t	t	\N
23886	118	12	13:00 ÀS 19:00	t	f	t	t	\N
23887	118	12	19:00 ÀS 01:00	t	f	t	t	\N
23888	118	12	01:00 ÀS 07:00	t	f	t	t	\N
23889	118	13	13:00 ÀS 19:00	t	f	t	t	\N
23890	118	13	19:00 ÀS 01:00	t	f	t	t	\N
23891	118	13	01:00 ÀS 07:00	t	f	t	t	\N
23892	118	14	13:00 ÀS 19:00	t	f	t	t	\N
23893	118	14	19:00 ÀS 01:00	t	f	t	t	\N
23894	118	14	01:00 ÀS 07:00	t	f	t	t	\N
23895	118	15	13:00 ÀS 19:00	t	f	t	t	\N
23896	118	15	19:00 ÀS 01:00	t	f	t	t	\N
23897	118	15	01:00 ÀS 07:00	t	f	t	t	\N
23898	118	2	07:00 ÀS 13:00	t	f	t	t	\N
23899	118	2	13:00 ÀS 19:00	t	f	t	t	\N
23900	118	2	19:00 ÀS 01:00	t	f	t	t	\N
23901	118	2	01:00 ÀS 07:00	t	f	t	t	\N
23902	118	3	07:00 ÀS 13:00	t	f	t	t	\N
23903	118	3	13:00 ÀS 19:00	t	f	t	t	\N
23904	118	3	19:00 ÀS 01:00	t	f	t	t	\N
23905	118	3	01:00 ÀS 07:00	t	f	t	t	\N
23906	118	9	07:00 ÀS 13:00	t	f	t	t	\N
23907	118	9	13:00 ÀS 19:00	t	f	t	t	\N
23908	118	9	19:00 ÀS 01:00	t	f	t	t	\N
23909	118	9	01:00 ÀS 07:00	t	f	t	t	\N
23910	118	1	13:00 ÀS 19:00	t	f	t	t	\N
23911	118	1	19:00 ÀS 01:00	t	f	t	t	\N
23912	118	1	01:00 ÀS 07:00	t	f	t	t	\N
23913	118	4	13:00 ÀS 19:00	t	f	t	t	\N
23914	118	4	19:00 ÀS 01:00	t	f	t	t	\N
23915	118	4	01:00 ÀS 07:00	t	f	t	t	\N
30534	63	13	13:00 ÀS 19:00	t	f	t	t	\N
30546	63	3	13:00 ÀS 19:00	t	f	t	t	\N
30547	63	3	19:00 ÀS 01:00	t	f	t	t	\N
30548	63	3	01:00 ÀS 07:00	t	f	t	t	\N
30549	63	4	07:00 ÀS 13:00	t	f	t	t	\N
30550	63	4	13:00 ÀS 19:00	t	f	t	t	\N
30551	63	4	19:00 ÀS 01:00	t	f	t	t	\N
30552	63	4	01:00 ÀS 07:00	t	f	t	t	\N
30553	63	5	07:00 ÀS 13:00	t	f	t	t	\N
30554	63	5	13:00 ÀS 19:00	t	f	t	t	\N
30555	63	5	19:00 ÀS 01:00	t	f	t	t	\N
30556	63	5	01:00 ÀS 07:00	t	f	t	t	\N
30557	63	7	07:00 ÀS 13:00	t	f	t	t	\N
30558	63	7	13:00 ÀS 19:00	t	f	t	t	\N
30559	63	7	19:00 ÀS 01:00	t	f	t	t	\N
30560	63	7	01:00 ÀS 07:00	t	f	t	t	\N
30561	63	8	07:00 ÀS 13:00	t	f	t	t	\N
30562	63	8	13:00 ÀS 19:00	t	f	t	t	\N
30563	63	8	19:00 ÀS 01:00	t	f	t	t	\N
30564	63	8	01:00 ÀS 07:00	t	f	t	t	\N
30565	63	9	07:00 ÀS 13:00	t	f	t	t	\N
30566	63	9	13:00 ÀS 19:00	t	f	t	t	\N
30567	63	9	19:00 ÀS 01:00	t	f	t	t	\N
30568	63	9	01:00 ÀS 07:00	t	f	t	t	\N
30603	196	27	19:00 ÀS 01:00	t	f	t	t	\N
30604	196	27	01:00 ÀS 07:00	t	f	t	t	\N
30605	196	28	07:00 ÀS 13:00	t	f	t	t	\N
30606	196	28	13:00 ÀS 19:00	t	f	t	t	\N
30607	196	28	19:00 ÀS 01:00	t	f	t	t	\N
30608	196	28	01:00 ÀS 07:00	t	f	t	t	\N
30609	196	29	07:00 ÀS 13:00	t	f	t	t	\N
30610	196	29	13:00 ÀS 19:00	t	f	t	t	\N
30611	196	29	19:00 ÀS 01:00	t	f	t	t	\N
30612	196	29	01:00 ÀS 07:00	t	f	t	t	\N
30613	196	31	07:00 ÀS 13:00	t	f	t	t	\N
30614	196	31	13:00 ÀS 19:00	t	f	t	t	\N
30615	196	31	19:00 ÀS 01:00	t	f	t	t	\N
30616	196	31	01:00 ÀS 07:00	t	f	t	t	\N
30629	197	14	07:00 ÀS 13:00	t	f	t	t	\N
30630	197	14	13:00 ÀS 19:00	t	f	t	t	\N
30631	197	14	19:00 ÀS 01:00	t	f	t	t	\N
30632	197	14	01:00 ÀS 07:00	t	f	t	t	\N
30633	197	15	07:00 ÀS 13:00	t	f	t	t	\N
30634	197	15	13:00 ÀS 19:00	t	f	t	t	\N
30635	197	15	19:00 ÀS 01:00	t	f	t	t	\N
30636	197	15	01:00 ÀS 07:00	t	f	t	t	\N
30637	197	2	07:00 ÀS 13:00	t	f	t	t	\N
30638	197	2	13:00 ÀS 19:00	t	f	t	t	\N
30639	197	2	19:00 ÀS 01:00	t	f	t	t	\N
30640	197	2	01:00 ÀS 07:00	t	f	t	t	\N
30641	197	3	07:00 ÀS 13:00	t	f	t	t	\N
30642	197	3	13:00 ÀS 19:00	t	f	t	t	\N
30643	197	3	19:00 ÀS 01:00	t	f	t	t	\N
30644	197	3	01:00 ÀS 07:00	t	f	t	t	\N
30645	197	4	07:00 ÀS 13:00	t	f	t	t	\N
30646	197	4	13:00 ÀS 19:00	t	f	t	t	\N
30647	197	4	19:00 ÀS 01:00	t	f	t	t	\N
30648	197	4	01:00 ÀS 07:00	t	f	t	t	\N
30649	197	6	07:00 ÀS 13:00	t	f	t	t	\N
30650	197	6	13:00 ÀS 19:00	t	f	t	t	\N
30651	197	6	19:00 ÀS 01:00	t	f	t	t	\N
30652	197	6	01:00 ÀS 07:00	t	f	t	t	\N
30653	197	7	07:00 ÀS 13:00	t	f	t	t	\N
30654	197	7	13:00 ÀS 19:00	t	f	t	t	\N
30655	197	7	19:00 ÀS 01:00	t	f	t	t	\N
30656	197	7	01:00 ÀS 07:00	t	f	t	t	\N
30657	197	8	07:00 ÀS 13:00	t	f	t	t	\N
30658	197	8	13:00 ÀS 19:00	t	f	t	t	\N
30659	197	8	19:00 ÀS 01:00	t	f	t	t	\N
30660	197	8	01:00 ÀS 07:00	t	f	t	t	\N
30669	198	19	07:00 ÀS 13:00	t	f	t	t	\N
30670	198	19	13:00 ÀS 19:00	t	f	t	t	\N
30671	198	19	19:00 ÀS 01:00	t	f	t	t	\N
30672	198	19	01:00 ÀS 07:00	t	f	t	t	\N
30673	198	20	07:00 ÀS 13:00	t	f	t	t	\N
30674	198	20	13:00 ÀS 19:00	t	f	t	t	\N
30675	198	20	19:00 ÀS 01:00	t	f	t	t	\N
30676	198	20	01:00 ÀS 07:00	t	f	t	t	\N
30677	198	22	07:00 ÀS 13:00	t	f	t	t	\N
30678	198	22	13:00 ÀS 19:00	t	f	t	t	\N
30679	198	22	19:00 ÀS 01:00	t	f	t	t	\N
30680	198	22	01:00 ÀS 07:00	t	f	t	t	\N
30681	198	23	07:00 ÀS 13:00	t	f	t	t	\N
30682	198	23	13:00 ÀS 19:00	t	f	t	t	\N
30683	198	23	19:00 ÀS 01:00	t	f	t	t	\N
30684	198	23	01:00 ÀS 07:00	t	f	t	t	\N
30685	198	24	07:00 ÀS 13:00	t	f	t	t	\N
30686	198	24	13:00 ÀS 19:00	t	f	t	t	\N
30687	198	24	19:00 ÀS 01:00	t	f	t	t	\N
30688	198	24	01:00 ÀS 07:00	t	f	t	t	\N
30689	198	26	07:00 ÀS 13:00	t	f	t	t	\N
30690	198	26	13:00 ÀS 19:00	t	f	t	t	\N
30691	198	26	19:00 ÀS 01:00	t	f	t	t	\N
30692	198	26	01:00 ÀS 07:00	t	f	t	t	\N
30693	198	27	07:00 ÀS 13:00	t	f	t	t	\N
30694	198	27	13:00 ÀS 19:00	t	f	t	t	\N
30695	198	27	19:00 ÀS 01:00	t	f	t	t	\N
30696	198	27	01:00 ÀS 07:00	t	f	t	t	\N
30697	198	28	07:00 ÀS 13:00	t	f	t	t	\N
30698	198	28	13:00 ÀS 19:00	t	f	t	t	\N
30699	198	28	19:00 ÀS 01:00	t	f	t	t	\N
30700	198	28	01:00 ÀS 07:00	t	f	t	t	\N
30701	198	30	07:00 ÀS 13:00	t	f	t	t	\N
30702	198	30	13:00 ÀS 19:00	t	f	t	t	\N
30703	198	30	19:00 ÀS 01:00	t	f	t	t	\N
30704	198	30	01:00 ÀS 07:00	t	f	t	t	\N
30705	198	31	07:00 ÀS 13:00	t	f	t	t	\N
30706	198	31	13:00 ÀS 19:00	t	f	t	t	\N
30707	198	31	19:00 ÀS 01:00	t	f	t	t	\N
30708	198	31	01:00 ÀS 07:00	t	f	t	t	\N
30746	102	8	13:00 ÀS 19:00	t	f	t	t	\N
30747	102	8	19:00 ÀS 01:00	t	f	t	t	\N
30748	102	8	01:00 ÀS 07:00	t	f	t	t	\N
30749	102	9	07:00 ÀS 13:00	t	f	t	t	\N
30750	102	9	13:00 ÀS 19:00	t	f	t	t	\N
30751	102	9	19:00 ÀS 01:00	t	f	t	t	\N
30752	102	9	01:00 ÀS 07:00	t	f	t	t	\N
30766	199	20	13:00 ÀS 19:00	t	f	t	t	\N
30767	199	20	19:00 ÀS 01:00	t	f	t	t	\N
30768	199	20	01:00 ÀS 07:00	t	f	t	t	\N
30769	199	21	07:00 ÀS 13:00	t	f	t	t	\N
30770	199	21	13:00 ÀS 19:00	t	f	t	t	\N
30771	199	21	19:00 ÀS 01:00	t	f	t	t	\N
29136	200	24	13:00 ÀS 19:00	t	f	t	t	\N
29137	200	24	19:00 ÀS 01:00	t	f	t	t	\N
29138	200	25	07:00 ÀS 13:00	t	f	t	t	\N
29139	200	25	13:00 ÀS 19:00	t	f	t	t	\N
29140	200	25	19:00 ÀS 01:00	t	f	t	t	\N
29141	200	26	07:00 ÀS 13:00	t	f	t	t	\N
29142	200	26	13:00 ÀS 19:00	t	f	t	t	\N
29143	200	26	19:00 ÀS 01:00	t	f	t	t	\N
29144	200	28	07:00 ÀS 13:00	t	f	t	t	\N
29145	200	28	13:00 ÀS 19:00	t	f	t	t	\N
29146	200	28	19:00 ÀS 01:00	t	f	t	t	\N
29147	200	29	07:00 ÀS 13:00	t	f	t	t	\N
29148	200	29	13:00 ÀS 19:00	t	f	t	t	\N
29149	200	29	19:00 ÀS 01:00	t	f	t	t	\N
23521	109	15	13:00 ÀS 19:00	t	f	t	t	\N
23522	109	15	19:00 ÀS 01:00	t	f	t	t	\N
23523	109	15	01:00 ÀS 07:00	t	f	t	t	\N
23524	109	1	07:00 ÀS 13:00	t	f	t	t	\N
23525	109	1	13:00 ÀS 19:00	t	f	t	t	\N
23526	109	1	19:00 ÀS 01:00	t	f	t	t	\N
23527	109	1	01:00 ÀS 07:00	t	f	t	t	\N
23528	109	3	07:00 ÀS 13:00	t	f	t	t	\N
23529	109	3	13:00 ÀS 19:00	t	f	t	t	\N
23530	109	3	19:00 ÀS 01:00	t	f	t	t	\N
23531	109	3	01:00 ÀS 07:00	t	f	t	t	\N
23532	109	4	07:00 ÀS 13:00	t	f	t	t	\N
23533	109	4	13:00 ÀS 19:00	t	f	t	t	\N
23534	109	4	19:00 ÀS 01:00	t	f	t	t	\N
23535	109	4	01:00 ÀS 07:00	t	f	t	t	\N
23536	109	5	07:00 ÀS 13:00	t	f	t	t	\N
23537	109	5	13:00 ÀS 19:00	t	f	t	t	\N
23538	109	5	19:00 ÀS 01:00	t	f	t	t	\N
23539	109	5	01:00 ÀS 07:00	t	f	t	t	\N
23540	109	7	07:00 ÀS 13:00	t	f	t	t	\N
23541	109	7	13:00 ÀS 19:00	t	f	t	t	\N
23542	109	7	19:00 ÀS 01:00	t	f	t	t	\N
23543	109	7	01:00 ÀS 07:00	t	f	t	t	\N
23544	109	8	07:00 ÀS 13:00	t	f	t	t	\N
23545	109	8	13:00 ÀS 19:00	t	f	t	t	\N
23546	109	8	19:00 ÀS 01:00	t	f	t	t	\N
23547	109	8	01:00 ÀS 07:00	t	f	t	t	\N
23548	109	9	07:00 ÀS 13:00	t	f	t	t	\N
23549	109	9	13:00 ÀS 19:00	t	f	t	t	\N
23550	109	9	19:00 ÀS 01:00	t	f	t	t	\N
23551	109	9	01:00 ÀS 07:00	t	f	t	t	\N
23573	203	23	13:00 ÀS 19:00	t	f	t	t	\N
23574	203	23	19:00 ÀS 01:00	t	f	t	t	\N
23575	203	23	01:00 ÀS 07:00	t	f	t	t	\N
23576	203	24	07:00 ÀS 13:00	t	f	t	t	\N
23577	203	24	13:00 ÀS 19:00	t	f	t	t	\N
23578	203	24	19:00 ÀS 01:00	t	f	t	t	\N
23579	203	24	01:00 ÀS 07:00	t	f	t	t	\N
23580	203	25	07:00 ÀS 13:00	t	f	t	t	\N
23581	203	25	13:00 ÀS 19:00	t	f	t	t	\N
23582	203	25	19:00 ÀS 01:00	t	f	t	t	\N
23583	203	25	01:00 ÀS 07:00	t	f	t	t	\N
23584	203	27	07:00 ÀS 13:00	t	f	t	t	\N
23585	203	27	13:00 ÀS 19:00	t	f	t	t	\N
23586	203	27	19:00 ÀS 01:00	t	f	t	t	\N
23587	203	27	01:00 ÀS 07:00	t	f	t	t	\N
23588	203	28	07:00 ÀS 13:00	t	f	t	t	\N
23589	203	28	13:00 ÀS 19:00	t	f	t	t	\N
23590	203	28	19:00 ÀS 01:00	t	f	t	t	\N
23591	203	28	01:00 ÀS 07:00	t	f	t	t	\N
23592	203	29	07:00 ÀS 13:00	t	f	t	t	\N
23593	203	29	13:00 ÀS 19:00	t	f	t	t	\N
23594	203	29	19:00 ÀS 01:00	t	f	t	t	\N
23595	203	29	01:00 ÀS 07:00	t	f	t	t	\N
23596	203	31	07:00 ÀS 13:00	t	f	t	t	\N
23597	203	31	13:00 ÀS 19:00	t	f	t	t	\N
23598	203	31	19:00 ÀS 01:00	t	f	t	t	\N
23599	203	31	01:00 ÀS 07:00	t	f	t	t	\N
23660	64	5	13:00 ÀS 19:00	t	f	t	t	\N
23661	64	5	19:00 ÀS 01:00	t	f	t	t	\N
23662	64	5	01:00 ÀS 07:00	t	f	t	t	\N
23667	132	21	19:00 ÀS 01:00	t	f	t	t	\N
23668	132	21	01:00 ÀS 07:00	t	f	t	t	\N
23669	132	22	07:00 ÀS 13:00	t	f	t	t	\N
23670	132	22	13:00 ÀS 19:00	t	f	t	t	\N
23671	132	22	19:00 ÀS 01:00	t	f	t	t	\N
23672	132	22	01:00 ÀS 07:00	t	f	t	t	\N
23673	132	23	07:00 ÀS 13:00	t	f	t	t	\N
23674	132	23	13:00 ÀS 19:00	t	f	t	t	\N
23675	132	23	19:00 ÀS 01:00	t	f	t	t	\N
23676	132	25	13:00 ÀS 19:00	t	f	t	t	\N
23677	132	25	19:00 ÀS 01:00	t	f	t	t	\N
23678	132	25	01:00 ÀS 07:00	t	f	t	t	\N
23679	132	26	07:00 ÀS 13:00	t	f	t	t	\N
23680	132	26	13:00 ÀS 19:00	t	f	t	t	\N
23681	132	26	19:00 ÀS 01:00	t	f	t	t	\N
23682	132	26	01:00 ÀS 07:00	t	f	t	t	\N
23683	132	27	07:00 ÀS 13:00	t	f	t	t	\N
23684	132	27	13:00 ÀS 19:00	t	f	t	t	\N
23685	132	27	19:00 ÀS 01:00	t	f	t	t	\N
23686	132	29	13:00 ÀS 19:00	t	f	t	t	\N
23687	132	29	19:00 ÀS 01:00	t	f	t	t	\N
23688	132	29	01:00 ÀS 07:00	t	f	t	t	\N
23689	132	30	07:00 ÀS 13:00	t	f	t	t	\N
23690	132	30	13:00 ÀS 19:00	t	f	t	t	\N
23691	132	30	19:00 ÀS 01:00	t	f	t	t	\N
23692	132	30	01:00 ÀS 07:00	t	f	t	t	\N
23693	132	31	07:00 ÀS 13:00	t	f	t	t	\N
23694	132	31	13:00 ÀS 19:00	t	f	t	t	\N
23695	132	31	19:00 ÀS 01:00	t	f	t	t	\N
23750	65	13	13:00 ÀS 19:00	t	f	t	t	\N
23751	65	13	19:00 ÀS 01:00	t	f	t	t	\N
23752	65	13	01:00 ÀS 07:00	t	f	t	t	\N
23753	65	14	13:00 ÀS 19:00	t	f	t	t	\N
23754	65	14	19:00 ÀS 01:00	t	f	t	t	\N
23755	65	14	01:00 ÀS 07:00	t	f	t	t	\N
23756	65	1	13:00 ÀS 19:00	t	f	t	t	\N
23757	65	1	19:00 ÀS 01:00	t	f	t	t	\N
23758	65	1	01:00 ÀS 07:00	t	f	t	t	\N
23759	65	4	13:00 ÀS 19:00	t	f	t	t	\N
23760	65	4	19:00 ÀS 01:00	t	f	t	t	\N
23761	65	4	01:00 ÀS 07:00	t	f	t	t	\N
23762	65	5	13:00 ÀS 19:00	t	f	t	t	\N
23763	65	5	19:00 ÀS 01:00	t	f	t	t	\N
23764	65	5	01:00 ÀS 07:00	t	f	t	t	\N
23765	65	6	13:00 ÀS 19:00	t	f	t	t	\N
23766	65	6	19:00 ÀS 01:00	t	f	t	t	\N
23767	65	6	01:00 ÀS 07:00	t	f	t	t	\N
29093	104	12	07:00 ÀS 13:00	t	f	t	t	\N
29094	104	12	13:00 ÀS 19:00	t	f	t	t	\N
29095	104	12	19:00 ÀS 01:00	t	f	t	t	\N
29120	200	17	07:00 ÀS 13:00	t	f	t	t	\N
29121	200	17	13:00 ÀS 19:00	t	f	t	t	\N
29122	200	17	19:00 ÀS 01:00	t	f	t	t	\N
29123	200	18	07:00 ÀS 13:00	t	f	t	t	\N
29124	200	18	13:00 ÀS 19:00	t	f	t	t	\N
29125	200	18	19:00 ÀS 01:00	t	f	t	t	\N
29126	200	20	07:00 ÀS 13:00	t	f	t	t	\N
29127	200	20	13:00 ÀS 19:00	t	f	t	t	\N
29128	200	20	19:00 ÀS 01:00	t	f	t	t	\N
29129	200	21	07:00 ÀS 13:00	t	f	t	t	\N
29130	200	21	13:00 ÀS 19:00	t	f	t	t	\N
29131	200	21	19:00 ÀS 01:00	t	f	t	t	\N
29132	200	22	07:00 ÀS 13:00	t	f	t	t	\N
29133	200	22	13:00 ÀS 19:00	t	f	t	t	\N
29134	200	22	19:00 ÀS 01:00	t	f	t	t	\N
29135	200	24	07:00 ÀS 13:00	t	f	t	t	\N
29163	105	6	13:00 ÀS 19:00	t	f	t	t	\N
29164	105	6	19:00 ÀS 01:00	t	f	t	t	\N
23768	65	8	13:00 ÀS 19:00	t	f	t	t	\N
23769	65	8	19:00 ÀS 01:00	t	f	t	t	\N
23770	65	8	01:00 ÀS 07:00	t	f	t	t	\N
23771	65	9	13:00 ÀS 19:00	t	f	t	t	\N
29090	104	10	07:00 ÀS 13:00	t	f	t	t	\N
29091	104	10	13:00 ÀS 19:00	t	f	t	t	\N
29092	104	10	19:00 ÀS 01:00	t	f	t	t	\N
29096	104	13	07:00 ÀS 13:00	t	f	t	t	\N
29097	104	13	13:00 ÀS 19:00	t	f	t	t	\N
29098	104	13	19:00 ÀS 01:00	t	f	t	t	\N
29099	104	14	07:00 ÀS 13:00	t	f	t	t	\N
29100	104	14	13:00 ÀS 19:00	t	f	t	t	\N
29101	104	14	19:00 ÀS 01:00	t	f	t	t	\N
29102	104	2	07:00 ÀS 13:00	t	f	t	t	\N
29103	104	2	13:00 ÀS 19:00	t	f	t	t	\N
29104	104	2	19:00 ÀS 01:00	t	f	t	t	\N
29105	104	4	07:00 ÀS 13:00	t	f	t	t	\N
29106	104	4	13:00 ÀS 19:00	t	f	t	t	\N
29107	104	4	19:00 ÀS 01:00	t	f	t	t	\N
29108	104	5	07:00 ÀS 13:00	t	f	t	t	\N
29109	104	5	13:00 ÀS 19:00	t	f	t	t	\N
29110	104	5	19:00 ÀS 01:00	t	f	t	t	\N
29111	104	6	07:00 ÀS 13:00	t	f	t	t	\N
29112	104	6	13:00 ÀS 19:00	t	f	t	t	\N
29113	104	6	19:00 ÀS 01:00	t	f	t	t	\N
29114	104	8	07:00 ÀS 13:00	t	f	t	t	\N
29115	104	8	13:00 ÀS 19:00	t	f	t	t	\N
29116	104	8	19:00 ÀS 01:00	t	f	t	t	\N
29117	104	9	07:00 ÀS 13:00	t	f	t	t	\N
29118	104	9	13:00 ÀS 19:00	t	f	t	t	\N
29119	104	9	19:00 ÀS 01:00	t	f	t	t	\N
23772	65	9	19:00 ÀS 01:00	t	f	t	t	\N
23794	209	29	13:00 ÀS 19:00	t	f	t	t	\N
23795	209	29	19:00 ÀS 01:00	t	f	t	t	\N
23796	209	30	13:00 ÀS 19:00	t	f	t	t	\N
23797	209	30	19:00 ÀS 01:00	t	f	t	t	\N
23834	210	16	19:00 ÀS 01:00	t	f	t	t	\N
23835	210	16	01:00 ÀS 07:00	t	f	t	t	\N
29150	105	11	13:00 ÀS 19:00	t	f	t	t	\N
29151	105	11	19:00 ÀS 01:00	t	f	t	t	\N
29152	105	11	01:00 ÀS 07:00	t	f	t	t	\N
29153	105	12	01:00 ÀS 07:00	t	f	t	t	\N
29154	105	14	13:00 ÀS 19:00	t	f	t	t	\N
29155	105	14	19:00 ÀS 01:00	t	f	t	t	\N
29156	105	14	01:00 ÀS 07:00	t	f	t	t	\N
29157	105	15	13:00 ÀS 19:00	t	f	t	t	\N
29158	105	15	19:00 ÀS 01:00	t	f	t	t	\N
29159	105	15	01:00 ÀS 07:00	t	f	t	t	\N
29160	105	4	13:00 ÀS 19:00	t	f	t	t	\N
29161	105	4	19:00 ÀS 01:00	t	f	t	t	\N
29162	105	4	01:00 ÀS 07:00	t	f	t	t	\N
23820	130	5	19:00 ÀS 01:00	t	f	t	t	\N
23821	130	5	01:00 ÀS 07:00	t	f	t	t	\N
23822	130	7	07:00 ÀS 13:00	t	f	t	t	\N
23823	130	7	19:00 ÀS 01:00	t	f	t	t	\N
23824	130	7	01:00 ÀS 07:00	t	f	t	t	\N
23825	130	8	07:00 ÀS 13:00	t	f	t	t	\N
23826	130	8	13:00 ÀS 19:00	t	f	t	t	\N
23827	130	8	19:00 ÀS 01:00	t	f	t	t	\N
23828	130	8	01:00 ÀS 07:00	t	f	t	t	\N
23829	130	9	07:00 ÀS 13:00	t	f	t	t	\N
23831	130	9	01:00 ÀS 07:00	t	f	t	t	\N
23836	210	17	07:00 ÀS 13:00	t	f	t	t	\N
23837	210	17	13:00 ÀS 19:00	t	f	t	t	\N
23838	210	17	19:00 ÀS 01:00	t	f	t	t	\N
23839	210	17	01:00 ÀS 07:00	t	f	t	t	\N
23840	210	18	13:00 ÀS 19:00	t	f	t	t	\N
23841	210	18	19:00 ÀS 01:00	t	f	t	t	\N
23842	210	19	07:00 ÀS 13:00	t	f	t	t	\N
23843	210	19	01:00 ÀS 07:00	t	f	t	t	\N
23844	210	20	07:00 ÀS 13:00	t	f	t	t	\N
23845	210	20	13:00 ÀS 19:00	t	f	t	t	\N
23921	118	6	01:00 ÀS 07:00	t	f	t	t	\N
23922	118	7	13:00 ÀS 19:00	t	f	t	t	\N
23923	118	7	19:00 ÀS 01:00	t	f	t	t	\N
23924	118	7	01:00 ÀS 07:00	t	f	t	t	\N
23925	118	8	13:00 ÀS 19:00	t	f	t	t	\N
23926	118	8	19:00 ÀS 01:00	t	f	t	t	\N
23927	118	8	01:00 ÀS 07:00	t	f	t	t	\N
29165	105	6	01:00 ÀS 07:00	t	f	t	t	\N
29166	105	7	13:00 ÀS 19:00	t	f	t	t	\N
29167	105	7	19:00 ÀS 01:00	t	f	t	t	\N
29168	105	7	01:00 ÀS 07:00	t	f	t	t	\N
29169	105	8	13:00 ÀS 19:00	t	f	t	t	\N
29170	105	8	19:00 ÀS 01:00	t	f	t	t	\N
29171	105	8	01:00 ÀS 07:00	t	f	t	t	\N
29172	201	16	13:00 ÀS 19:00	t	f	t	t	\N
29173	201	18	13:00 ÀS 19:00	t	f	t	t	\N
29174	201	18	19:00 ÀS 01:00	t	f	t	t	\N
29175	201	18	01:00 ÀS 07:00	t	f	t	t	\N
29176	201	19	01:00 ÀS 07:00	t	f	t	t	\N
23846	210	20	19:00 ÀS 01:00	t	f	t	t	\N
23847	210	20	01:00 ÀS 07:00	t	f	t	t	\N
23848	210	21	07:00 ÀS 13:00	t	f	t	t	\N
23849	210	21	13:00 ÀS 19:00	t	f	t	t	\N
23850	210	21	19:00 ÀS 01:00	t	f	t	t	\N
23851	210	21	01:00 ÀS 07:00	t	f	t	t	\N
23852	210	22	13:00 ÀS 19:00	t	f	t	t	\N
23853	210	22	19:00 ÀS 01:00	t	f	t	t	\N
23854	210	23	07:00 ÀS 13:00	t	f	t	t	\N
23855	210	23	01:00 ÀS 07:00	t	f	t	t	\N
23856	210	24	07:00 ÀS 13:00	t	f	t	t	\N
23857	210	24	13:00 ÀS 19:00	t	f	t	t	\N
23858	210	24	19:00 ÀS 01:00	t	f	t	t	\N
23859	210	24	01:00 ÀS 07:00	t	f	t	t	\N
23860	210	25	07:00 ÀS 13:00	t	f	t	t	\N
23861	210	25	13:00 ÀS 19:00	t	f	t	t	\N
23862	210	25	19:00 ÀS 01:00	t	f	t	t	\N
23863	210	25	01:00 ÀS 07:00	t	f	t	t	\N
23864	210	26	13:00 ÀS 19:00	t	f	t	t	\N
23865	210	27	07:00 ÀS 13:00	t	f	t	t	\N
23866	210	27	19:00 ÀS 01:00	t	f	t	t	\N
23867	210	27	01:00 ÀS 07:00	t	f	t	t	\N
23868	210	28	13:00 ÀS 19:00	t	f	t	t	\N
23869	210	28	01:00 ÀS 07:00	t	f	t	t	\N
23870	210	29	07:00 ÀS 13:00	t	f	t	t	\N
23871	210	29	13:00 ÀS 19:00	t	f	t	t	\N
23872	210	29	19:00 ÀS 01:00	t	f	t	t	\N
23873	210	29	01:00 ÀS 07:00	t	f	t	t	\N
23874	210	30	07:00 ÀS 13:00	t	f	t	t	\N
23875	210	30	13:00 ÀS 19:00	t	f	t	t	\N
23876	210	30	19:00 ÀS 01:00	t	f	t	t	\N
23877	210	31	19:00 ÀS 01:00	t	f	t	t	\N
23878	210	31	01:00 ÀS 07:00	t	f	t	t	\N
23956	211	24	13:00 ÀS 19:00	t	f	t	t	\N
23957	211	24	19:00 ÀS 01:00	t	f	t	t	\N
23958	211	24	01:00 ÀS 07:00	t	f	t	t	\N
23959	211	25	13:00 ÀS 19:00	t	f	t	t	\N
23960	211	25	19:00 ÀS 01:00	t	f	t	t	\N
23961	211	25	01:00 ÀS 07:00	t	f	t	t	\N
23962	211	26	13:00 ÀS 19:00	t	f	t	t	\N
23963	211	26	19:00 ÀS 01:00	t	f	t	t	\N
23964	211	26	01:00 ÀS 07:00	t	f	t	t	\N
23965	211	27	13:00 ÀS 19:00	t	f	t	t	\N
23966	211	27	19:00 ÀS 01:00	t	f	t	t	\N
23967	211	27	01:00 ÀS 07:00	t	f	t	t	\N
23968	211	28	13:00 ÀS 19:00	t	f	t	t	\N
23969	211	28	19:00 ÀS 01:00	t	f	t	t	\N
23970	211	28	01:00 ÀS 07:00	t	f	t	t	\N
23971	211	29	13:00 ÀS 19:00	t	f	t	t	\N
23972	211	29	19:00 ÀS 01:00	t	f	t	t	\N
23973	211	29	01:00 ÀS 07:00	t	f	t	t	\N
23974	211	30	07:00 ÀS 13:00	t	f	t	t	\N
23975	211	30	13:00 ÀS 19:00	t	f	t	t	\N
23976	211	30	19:00 ÀS 01:00	t	f	t	t	\N
23977	211	30	01:00 ÀS 07:00	t	f	t	t	\N
23978	211	31	07:00 ÀS 13:00	t	f	t	t	\N
23979	211	31	13:00 ÀS 19:00	t	f	t	t	\N
23980	211	31	19:00 ÀS 01:00	t	f	t	t	\N
23981	211	31	01:00 ÀS 07:00	t	f	t	t	\N
24028	86	3	13:00 ÀS 19:00	t	f	t	t	\N
24029	86	3	19:00 ÀS 01:00	t	f	t	t	\N
24033	86	6	07:00 ÀS 13:00	t	f	t	t	\N
24034	86	6	13:00 ÀS 19:00	t	f	t	t	\N
24035	86	6	19:00 ÀS 01:00	t	f	t	t	\N
24036	86	7	07:00 ÀS 13:00	t	f	t	t	\N
24037	86	7	13:00 ÀS 19:00	t	f	t	t	\N
24038	86	7	19:00 ÀS 01:00	t	f	t	t	\N
24039	86	9	07:00 ÀS 13:00	t	f	t	t	\N
24040	86	9	13:00 ÀS 19:00	t	f	t	t	\N
24041	86	9	19:00 ÀS 01:00	t	f	t	t	\N
24053	213	21	19:00 ÀS 01:00	t	f	t	t	\N
24054	213	22	07:00 ÀS 13:00	t	f	t	t	\N
24055	213	22	13:00 ÀS 19:00	t	f	t	t	\N
24056	213	22	19:00 ÀS 01:00	t	f	t	t	\N
24057	213	23	07:00 ÀS 13:00	t	f	t	t	\N
24058	213	23	13:00 ÀS 19:00	t	f	t	t	\N
24059	213	23	19:00 ÀS 01:00	t	f	t	t	\N
24060	213	25	07:00 ÀS 13:00	t	f	t	t	\N
24061	213	25	13:00 ÀS 19:00	t	f	t	t	\N
24062	213	25	19:00 ÀS 01:00	t	f	t	t	\N
24063	213	26	07:00 ÀS 13:00	t	f	t	t	\N
24064	213	26	13:00 ÀS 19:00	t	f	t	t	\N
24065	213	26	19:00 ÀS 01:00	t	f	t	t	\N
24066	213	27	07:00 ÀS 13:00	t	f	t	t	\N
24067	213	27	13:00 ÀS 19:00	t	f	t	t	\N
24068	213	27	19:00 ÀS 01:00	t	f	t	t	\N
24070	213	29	13:00 ÀS 19:00	t	f	t	t	\N
24071	213	29	19:00 ÀS 01:00	t	f	t	t	\N
24072	213	30	07:00 ÀS 13:00	t	f	t	t	\N
24073	213	30	13:00 ÀS 19:00	t	f	t	t	\N
24074	213	30	19:00 ÀS 01:00	t	f	t	t	\N
24075	213	31	07:00 ÀS 13:00	t	f	t	t	\N
24076	213	31	13:00 ÀS 19:00	t	f	t	t	\N
29177	201	20	13:00 ÀS 19:00	t	f	t	t	\N
29178	201	20	19:00 ÀS 01:00	t	f	t	t	\N
29179	201	20	01:00 ÀS 07:00	t	f	t	t	\N
29180	201	22	13:00 ÀS 19:00	t	f	t	t	\N
29181	201	22	19:00 ÀS 01:00	t	f	t	t	\N
29182	201	22	01:00 ÀS 07:00	t	f	t	t	\N
29183	201	23	13:00 ÀS 19:00	t	f	t	t	\N
29184	201	26	01:00 ÀS 07:00	t	f	t	t	\N
29185	201	27	13:00 ÀS 19:00	t	f	t	t	\N
29186	201	27	19:00 ÀS 01:00	t	f	t	t	\N
29187	201	27	01:00 ÀS 07:00	t	f	t	t	\N
29188	201	28	13:00 ÀS 19:00	t	f	t	t	\N
29189	201	28	19:00 ÀS 01:00	t	f	t	t	\N
29190	201	28	01:00 ÀS 07:00	t	f	t	t	\N
29191	201	30	13:00 ÀS 19:00	t	f	t	t	\N
24069	213	29	07:00 ÀS 13:00	t	f	t	t	\N
24077	213	31	19:00 ÀS 01:00	t	f	t	t	\N
24122	126	9	13:00 ÀS 19:00	t	f	f	t	\N
24123	126	9	19:00 ÀS 01:00	t	f	f	t	\N
24138	215	25	13:00 ÀS 19:00	t	f	f	t	\N
24139	215	25	19:00 ÀS 01:00	t	f	f	t	\N
24140	215	26	13:00 ÀS 19:00	t	f	f	t	\N
24141	215	26	19:00 ÀS 01:00	t	f	f	t	\N
24142	215	28	13:00 ÀS 19:00	t	f	f	t	\N
24143	215	28	19:00 ÀS 01:00	t	f	f	t	\N
24144	215	29	13:00 ÀS 19:00	t	f	f	t	\N
24145	215	29	19:00 ÀS 01:00	t	f	f	t	\N
24146	215	30	13:00 ÀS 19:00	t	f	f	t	\N
24202	218	29	13:00 ÀS 19:00	t	f	t	t	\N
24203	218	29	19:00 ÀS 01:00	t	f	t	t	\N
24204	218	29	01:00 ÀS 07:00	t	f	t	t	\N
24205	218	30	07:00 ÀS 13:00	t	f	t	t	\N
24206	218	31	19:00 ÀS 01:00	t	f	t	t	\N
24207	218	31	01:00 ÀS 07:00	t	f	t	t	\N
29217	114	4	13:00 ÀS 19:00	t	f	t	t	\N
29218	114	4	19:00 ÀS 01:00	t	f	t	t	\N
29219	114	7	07:00 ÀS 13:00	t	f	t	t	\N
29220	114	7	13:00 ÀS 19:00	t	f	t	t	\N
29221	114	7	19:00 ÀS 01:00	t	f	t	t	\N
29222	114	8	07:00 ÀS 13:00	t	f	t	t	\N
29192	82	11	13:00 ÀS 19:00	t	f	t	t	\N
29193	82	11	19:00 ÀS 01:00	t	f	t	t	\N
29194	82	11	01:00 ÀS 07:00	t	f	t	t	\N
29195	82	14	13:00 ÀS 19:00	t	f	t	t	\N
29196	82	14	19:00 ÀS 01:00	t	f	t	t	\N
29197	82	14	01:00 ÀS 07:00	t	f	t	t	\N
29223	114	8	13:00 ÀS 19:00	t	f	t	t	\N
29224	114	8	19:00 ÀS 01:00	t	f	t	t	\N
29198	207	19	13:00 ÀS 19:00	t	f	t	t	\N
29199	207	19	19:00 ÀS 01:00	t	f	t	t	\N
29200	207	19	01:00 ÀS 07:00	t	f	t	t	\N
29201	207	22	13:00 ÀS 19:00	t	f	t	t	\N
29202	207	22	19:00 ÀS 01:00	t	f	t	t	\N
29203	207	22	01:00 ÀS 07:00	t	f	t	t	\N
29204	207	27	13:00 ÀS 19:00	t	f	t	t	\N
29205	207	27	19:00 ÀS 01:00	t	f	t	t	\N
29206	207	27	01:00 ÀS 07:00	t	f	t	t	\N
29207	114	11	07:00 ÀS 13:00	t	f	t	t	\N
29208	114	11	13:00 ÀS 19:00	t	f	t	t	\N
29209	114	11	19:00 ÀS 01:00	t	f	t	t	\N
29210	114	12	07:00 ÀS 13:00	t	f	t	t	\N
29211	114	12	13:00 ÀS 19:00	t	f	t	t	\N
29212	114	12	19:00 ÀS 01:00	t	f	t	t	\N
29213	114	15	07:00 ÀS 13:00	t	f	t	t	\N
29214	114	15	13:00 ÀS 19:00	t	f	t	t	\N
29215	114	15	19:00 ÀS 01:00	t	f	t	t	\N
29216	114	4	07:00 ÀS 13:00	t	f	t	t	\N
29225	208	16	07:00 ÀS 13:00	t	f	t	t	\N
29226	208	16	13:00 ÀS 19:00	t	f	t	t	\N
29227	208	16	19:00 ÀS 01:00	t	f	t	t	\N
29228	208	19	07:00 ÀS 13:00	t	f	t	t	\N
29229	208	19	13:00 ÀS 19:00	t	f	t	t	\N
29230	208	19	19:00 ÀS 01:00	t	f	t	t	\N
29231	208	20	07:00 ÀS 13:00	t	f	t	t	\N
29232	208	20	13:00 ÀS 19:00	t	f	t	t	\N
29233	208	20	19:00 ÀS 01:00	t	f	t	t	\N
29234	208	23	07:00 ÀS 13:00	t	f	t	t	\N
29235	208	23	13:00 ÀS 19:00	t	f	t	t	\N
29236	208	23	19:00 ÀS 01:00	t	f	t	t	\N
29237	208	27	07:00 ÀS 13:00	t	f	t	t	\N
29238	208	27	13:00 ÀS 19:00	t	f	t	t	\N
29239	208	27	19:00 ÀS 01:00	t	f	t	t	\N
29240	208	28	07:00 ÀS 13:00	t	f	t	t	\N
29241	208	28	13:00 ÀS 19:00	t	f	t	t	\N
29242	208	28	19:00 ÀS 01:00	t	f	t	t	\N
30090	221	15	19:00 ÀS 01:00	t	f	t	t	\N
30091	221	15	01:00 ÀS 07:00	t	f	t	t	\N
30092	221	7	19:00 ÀS 01:00	t	f	t	t	\N
30093	221	7	01:00 ÀS 07:00	t	f	t	t	\N
30094	222	11	07:00 ÀS 13:00	t	f	t	t	\N
30095	222	11	13:00 ÀS 19:00	t	f	t	t	\N
30096	222	12	07:00 ÀS 13:00	t	f	t	t	\N
30097	222	12	13:00 ÀS 19:00	t	f	t	t	\N
30098	222	13	07:00 ÀS 13:00	t	f	t	t	\N
30099	222	13	13:00 ÀS 19:00	t	f	t	t	\N
30100	222	4	07:00 ÀS 13:00	t	f	t	t	\N
30101	222	4	13:00 ÀS 19:00	t	f	t	t	\N
30102	222	5	07:00 ÀS 13:00	t	f	t	t	\N
30103	222	5	13:00 ÀS 19:00	t	f	t	t	\N
30104	222	9	07:00 ÀS 13:00	t	f	t	t	\N
30105	222	9	13:00 ÀS 19:00	t	f	t	t	\N
30106	222	9	19:00 ÀS 01:00	t	f	t	t	\N
30110	149	2	07:00 ÀS 13:00	f	f	t	t	\N
30111	149	2	13:00 ÀS 19:00	f	f	t	t	\N
30115	149	9	07:00 ÀS 13:00	f	f	t	t	\N
30116	149	9	13:00 ÀS 19:00	f	f	t	t	\N
30119	186	12	13:00 ÀS 19:00	f	f	f	t	\N
30120	186	12	19:00 ÀS 01:00	f	f	f	t	\N
30121	186	12	01:00 ÀS 07:00	f	f	f	t	\N
30122	186	13	07:00 ÀS 13:00	f	f	f	t	\N
30123	186	13	13:00 ÀS 19:00	f	f	f	t	\N
30124	186	13	19:00 ÀS 01:00	f	f	f	t	\N
30128	186	5	07:00 ÀS 13:00	f	f	f	t	\N
30142	142	11	19:00 ÀS 01:00	t	f	t	t	\N
30143	142	11	01:00 ÀS 07:00	t	f	t	t	\N
30144	142	3	19:00 ÀS 01:00	t	f	t	t	\N
30145	142	3	01:00 ÀS 07:00	t	f	t	t	\N
30164	146	5	19:00 ÀS 01:00	t	f	t	t	\N
30165	146	8	07:00 ÀS 13:00	t	f	t	t	\N
30166	146	8	13:00 ÀS 19:00	t	f	t	t	\N
30167	146	8	19:00 ÀS 01:00	t	f	t	t	\N
30168	146	9	07:00 ÀS 13:00	t	f	t	t	\N
30169	146	9	13:00 ÀS 19:00	t	f	t	t	\N
30170	146	9	19:00 ÀS 01:00	t	f	t	t	\N
30171	146	3	13:00 ÀS 19:00	t	f	t	t	\N
30172	146	3	19:00 ÀS 01:00	t	f	t	t	\N
30173	146	7	13:00 ÀS 19:00	t	f	t	t	\N
30174	146	7	19:00 ÀS 01:00	t	f	t	t	\N
30176	147	16	13:00 ÀS 19:00	t	f	t	t	\N
30177	147	16	19:00 ÀS 01:00	t	f	t	t	\N
30178	147	17	07:00 ÀS 13:00	t	f	t	t	\N
30179	147	17	13:00 ÀS 19:00	t	f	t	t	\N
30180	147	17	19:00 ÀS 01:00	t	f	t	t	\N
30181	147	19	13:00 ÀS 19:00	t	f	t	t	\N
30182	147	19	19:00 ÀS 01:00	t	f	t	t	\N
30183	147	20	07:00 ÀS 13:00	t	f	t	t	\N
30184	147	20	13:00 ÀS 19:00	t	f	t	t	\N
30185	147	20	19:00 ÀS 01:00	t	f	t	t	\N
30186	147	21	07:00 ÀS 13:00	t	f	t	t	\N
30187	147	21	13:00 ÀS 19:00	t	f	t	t	\N
30146	146	11	13:00 ÀS 19:00	t	f	t	t	\N
30147	146	11	19:00 ÀS 01:00	t	f	t	t	\N
30148	146	12	07:00 ÀS 13:00	t	f	t	t	\N
30149	146	12	13:00 ÀS 19:00	t	f	t	t	\N
30150	146	12	19:00 ÀS 01:00	t	f	t	t	\N
30151	146	13	07:00 ÀS 13:00	t	f	t	t	\N
30152	146	13	13:00 ÀS 19:00	t	f	t	t	\N
30153	146	13	19:00 ÀS 01:00	t	f	t	t	\N
30154	146	15	13:00 ÀS 19:00	t	f	t	t	\N
30155	146	15	19:00 ÀS 01:00	t	f	t	t	\N
30156	146	1	07:00 ÀS 13:00	t	f	t	t	\N
30157	146	1	13:00 ÀS 19:00	t	f	t	t	\N
30158	146	1	19:00 ÀS 01:00	t	f	t	t	\N
30159	146	4	07:00 ÀS 13:00	t	f	t	t	\N
30160	146	4	13:00 ÀS 19:00	t	f	t	t	\N
30161	146	4	19:00 ÀS 01:00	t	f	t	t	\N
30162	146	5	07:00 ÀS 13:00	t	f	t	t	\N
30163	146	5	13:00 ÀS 19:00	t	f	t	t	\N
30175	147	16	07:00 ÀS 13:00	t	f	t	t	\N
30188	147	21	19:00 ÀS 01:00	t	f	t	t	\N
30189	147	23	13:00 ÀS 19:00	t	f	t	t	\N
30190	147	23	19:00 ÀS 01:00	t	f	t	t	\N
30191	147	24	07:00 ÀS 13:00	t	f	t	t	\N
30192	147	24	13:00 ÀS 19:00	t	f	t	t	\N
30193	147	24	19:00 ÀS 01:00	t	f	t	t	\N
30194	147	25	07:00 ÀS 13:00	t	f	t	t	\N
30195	147	25	13:00 ÀS 19:00	t	f	t	t	\N
30196	147	25	19:00 ÀS 01:00	t	f	t	t	\N
30197	147	27	07:00 ÀS 13:00	t	f	t	t	\N
30198	147	27	13:00 ÀS 19:00	t	f	t	t	\N
30199	147	27	19:00 ÀS 01:00	t	f	t	t	\N
30200	147	28	07:00 ÀS 13:00	t	f	t	t	\N
30201	147	28	13:00 ÀS 19:00	t	f	t	t	\N
30202	147	28	19:00 ÀS 01:00	t	f	t	t	\N
30203	147	29	07:00 ÀS 13:00	t	f	t	t	\N
30204	147	29	13:00 ÀS 19:00	t	f	t	t	\N
30205	147	29	19:00 ÀS 01:00	t	f	t	t	\N
30206	147	31	13:00 ÀS 19:00	t	f	t	t	\N
30207	147	31	19:00 ÀS 01:00	t	f	t	t	\N
30208	122	11	13:00 ÀS 19:00	t	f	f	t	\N
30209	122	12	13:00 ÀS 19:00	t	f	f	t	\N
30210	122	13	13:00 ÀS 19:00	t	f	f	t	\N
30211	122	14	13:00 ÀS 19:00	t	f	f	t	\N
30212	122	4	13:00 ÀS 19:00	t	f	f	t	\N
30213	122	5	13:00 ÀS 19:00	t	f	f	t	\N
30214	122	6	13:00 ÀS 19:00	t	f	f	t	\N
30215	122	7	13:00 ÀS 19:00	t	f	f	t	\N
30216	153	18	13:00 ÀS 19:00	t	f	f	t	\N
30217	153	19	13:00 ÀS 19:00	t	f	f	t	\N
30218	153	20	13:00 ÀS 19:00	t	f	f	t	\N
30219	153	21	13:00 ÀS 19:00	t	f	f	t	\N
30220	153	25	13:00 ÀS 19:00	t	f	f	t	\N
30221	153	26	13:00 ÀS 19:00	t	f	f	t	\N
30222	153	27	13:00 ÀS 19:00	t	f	f	t	\N
30223	153	28	13:00 ÀS 19:00	t	f	f	t	\N
30224	169	30	07:00 ÀS 13:00	t	f	t	t	\N
30225	99	1	07:00 ÀS 13:00	t	f	t	t	\N
30226	99	1	13:00 ÀS 19:00	t	f	t	t	\N
30271	174	16	07:00 ÀS 13:00	t	f	t	t	\N
30272	174	16	13:00 ÀS 19:00	t	f	t	t	\N
30273	174	16	19:00 ÀS 01:00	t	f	t	t	\N
30274	174	16	01:00 ÀS 07:00	t	f	t	t	\N
30275	174	17	07:00 ÀS 13:00	t	f	t	t	\N
30276	174	17	13:00 ÀS 19:00	t	f	t	t	\N
30277	174	17	19:00 ÀS 01:00	t	f	t	t	\N
30129	186	5	13:00 ÀS 19:00	f	f	f	t	\N
30130	186	8	07:00 ÀS 13:00	f	f	f	t	\N
30278	174	17	01:00 ÀS 07:00	t	f	t	t	\N
30279	174	19	07:00 ÀS 13:00	t	f	t	t	\N
30280	174	19	13:00 ÀS 19:00	t	f	t	t	\N
30281	174	19	19:00 ÀS 01:00	t	f	t	t	\N
30282	174	19	01:00 ÀS 07:00	t	f	t	t	\N
30283	174	20	07:00 ÀS 13:00	t	f	t	t	\N
30284	174	20	13:00 ÀS 19:00	t	f	t	t	\N
30319	175	17	19:00 ÀS 01:00	t	f	t	t	\N
30227	94	11	07:00 ÀS 13:00	t	f	t	t	\N
30228	94	11	13:00 ÀS 19:00	t	f	t	t	\N
30229	94	11	19:00 ÀS 01:00	t	f	t	t	\N
30230	94	11	01:00 ÀS 07:00	t	f	t	t	\N
30231	94	12	07:00 ÀS 13:00	t	f	t	t	\N
30232	94	12	13:00 ÀS 19:00	t	f	t	t	\N
30233	94	12	19:00 ÀS 01:00	t	f	t	t	\N
30234	94	12	01:00 ÀS 07:00	t	f	t	t	\N
30235	94	13	07:00 ÀS 13:00	t	f	t	t	\N
30236	94	13	13:00 ÀS 19:00	t	f	t	t	\N
30237	94	13	19:00 ÀS 01:00	t	f	t	t	\N
30238	94	13	01:00 ÀS 07:00	t	f	t	t	\N
30239	94	15	07:00 ÀS 13:00	t	f	t	t	\N
30240	94	15	13:00 ÀS 19:00	t	f	t	t	\N
30241	94	15	19:00 ÀS 01:00	t	f	t	t	\N
30242	94	15	01:00 ÀS 07:00	t	f	t	t	\N
30243	94	1	07:00 ÀS 13:00	t	f	t	t	\N
30244	94	1	13:00 ÀS 19:00	t	f	t	t	\N
30245	94	1	19:00 ÀS 01:00	t	f	t	t	\N
30246	94	1	01:00 ÀS 07:00	t	f	t	t	\N
30247	94	3	07:00 ÀS 13:00	t	f	t	t	\N
30248	94	3	13:00 ÀS 19:00	t	f	t	t	\N
30249	94	3	19:00 ÀS 01:00	t	f	t	t	\N
30250	94	3	01:00 ÀS 07:00	t	f	t	t	\N
30251	94	4	07:00 ÀS 13:00	t	f	t	t	\N
30252	94	4	13:00 ÀS 19:00	t	f	t	t	\N
30253	94	4	19:00 ÀS 01:00	t	f	t	t	\N
30364	133	16	07:00 ÀS 13:00	t	f	t	t	\N
30365	133	16	13:00 ÀS 19:00	t	f	t	t	\N
30366	133	16	19:00 ÀS 01:00	t	f	t	t	\N
30367	133	16	01:00 ÀS 07:00	t	f	t	t	\N
30368	133	17	07:00 ÀS 13:00	t	f	t	t	\N
30369	133	17	13:00 ÀS 19:00	t	f	t	t	\N
30370	133	17	19:00 ÀS 01:00	t	f	t	t	\N
30371	133	17	01:00 ÀS 07:00	t	f	t	t	\N
30372	133	19	07:00 ÀS 13:00	t	f	t	t	\N
30373	133	19	13:00 ÀS 19:00	t	f	t	t	\N
30374	133	19	19:00 ÀS 01:00	t	f	t	t	\N
30375	133	19	01:00 ÀS 07:00	t	f	t	t	\N
30376	133	20	07:00 ÀS 13:00	t	f	t	t	\N
30320	124	11	07:00 ÀS 13:00	t	f	t	t	\N
30321	124	11	13:00 ÀS 19:00	t	f	t	t	\N
30322	124	11	19:00 ÀS 01:00	t	f	t	t	\N
30323	124	11	01:00 ÀS 07:00	t	f	t	t	\N
30324	124	12	07:00 ÀS 13:00	t	f	t	t	\N
30325	124	12	13:00 ÀS 19:00	t	f	t	t	\N
30326	124	12	19:00 ÀS 01:00	t	f	t	t	\N
30327	124	12	01:00 ÀS 07:00	t	f	t	t	\N
30328	124	13	07:00 ÀS 13:00	t	f	t	t	\N
30329	124	13	13:00 ÀS 19:00	t	f	t	t	\N
30330	124	13	19:00 ÀS 01:00	t	f	t	t	\N
30331	124	13	01:00 ÀS 07:00	t	f	t	t	\N
30332	124	15	07:00 ÀS 13:00	t	f	t	t	\N
30333	124	15	13:00 ÀS 19:00	t	f	t	t	\N
30334	124	15	19:00 ÀS 01:00	t	f	t	t	\N
30335	124	15	01:00 ÀS 07:00	t	f	t	t	\N
30336	124	1	07:00 ÀS 13:00	t	f	t	t	\N
30337	124	1	13:00 ÀS 19:00	t	f	t	t	\N
30338	124	1	19:00 ÀS 01:00	t	f	t	t	\N
30339	124	1	01:00 ÀS 07:00	t	f	t	t	\N
30340	124	3	07:00 ÀS 13:00	t	f	t	t	\N
30341	124	3	13:00 ÀS 19:00	t	f	t	t	\N
30342	124	3	19:00 ÀS 01:00	t	f	t	t	\N
30343	124	3	01:00 ÀS 07:00	t	f	t	t	\N
30344	124	4	07:00 ÀS 13:00	t	f	t	t	\N
30345	124	4	13:00 ÀS 19:00	t	f	t	t	\N
30346	124	4	19:00 ÀS 01:00	t	f	t	t	\N
30347	124	4	01:00 ÀS 07:00	t	f	t	t	\N
30423	193	19	13:00 ÀS 19:00	t	f	t	t	\N
30424	193	20	13:00 ÀS 19:00	t	f	t	t	\N
30425	193	21	13:00 ÀS 19:00	t	f	t	t	\N
30426	193	22	13:00 ÀS 19:00	t	f	t	t	\N
30427	193	25	13:00 ÀS 19:00	t	f	t	t	\N
30428	193	26	13:00 ÀS 19:00	t	f	t	t	\N
30429	193	27	13:00 ÀS 19:00	t	f	t	t	\N
30430	193	28	13:00 ÀS 19:00	t	f	t	t	\N
30477	195	16	13:00 ÀS 19:00	t	f	t	t	\N
30422	193	18	13:00 ÀS 19:00	t	f	t	t	\N
30478	195	16	19:00 ÀS 01:00	t	f	t	t	\N
30479	195	16	01:00 ÀS 07:00	t	f	t	t	\N
30480	195	17	13:00 ÀS 19:00	t	f	t	t	\N
30481	195	17	19:00 ÀS 01:00	t	f	t	t	\N
30482	195	17	01:00 ÀS 07:00	t	f	t	t	\N
30483	195	18	13:00 ÀS 19:00	t	f	t	t	\N
30484	195	18	19:00 ÀS 01:00	t	f	t	t	\N
30485	195	18	01:00 ÀS 07:00	t	f	t	t	\N
30432	194	10	13:00 ÀS 19:00	t	f	t	t	\N
30433	194	10	19:00 ÀS 01:00	t	f	t	t	\N
30434	194	10	01:00 ÀS 07:00	t	f	t	t	\N
30435	194	11	13:00 ÀS 19:00	t	f	t	t	\N
30436	194	11	19:00 ÀS 01:00	t	f	t	t	\N
30437	194	11	01:00 ÀS 07:00	t	f	t	t	\N
30438	194	12	13:00 ÀS 19:00	t	f	t	t	\N
30439	194	12	19:00 ÀS 01:00	t	f	t	t	\N
30440	194	12	01:00 ÀS 07:00	t	f	t	t	\N
30527	63	11	19:00 ÀS 01:00	t	f	t	t	\N
30528	63	11	01:00 ÀS 07:00	t	f	t	t	\N
30529	63	12	07:00 ÀS 13:00	t	f	t	t	\N
30530	63	12	13:00 ÀS 19:00	t	f	t	t	\N
30531	63	12	19:00 ÀS 01:00	t	f	t	t	\N
30486	195	19	13:00 ÀS 19:00	t	f	t	t	\N
30487	195	19	19:00 ÀS 01:00	t	f	t	t	\N
30488	195	19	01:00 ÀS 07:00	t	f	t	t	\N
30489	195	20	13:00 ÀS 19:00	t	f	t	t	\N
30490	195	20	19:00 ÀS 01:00	t	f	t	t	\N
30491	195	20	01:00 ÀS 07:00	t	f	t	t	\N
30492	195	21	13:00 ÀS 19:00	t	f	t	t	\N
30493	195	21	19:00 ÀS 01:00	t	f	t	t	\N
30494	195	21	01:00 ÀS 07:00	t	f	t	t	\N
30495	195	22	13:00 ÀS 19:00	t	f	t	t	\N
30496	195	22	19:00 ÀS 01:00	t	f	t	t	\N
30497	195	22	01:00 ÀS 07:00	t	f	t	t	\N
30498	195	23	13:00 ÀS 19:00	t	f	t	t	\N
30499	195	23	19:00 ÀS 01:00	t	f	t	t	\N
30500	195	23	01:00 ÀS 07:00	t	f	t	t	\N
30501	195	24	13:00 ÀS 19:00	t	f	t	t	\N
30502	195	24	19:00 ÀS 01:00	t	f	t	t	\N
30503	195	24	01:00 ÀS 07:00	t	f	t	t	\N
30504	195	25	13:00 ÀS 19:00	t	f	t	t	\N
30505	195	25	19:00 ÀS 01:00	t	f	t	t	\N
30506	195	25	01:00 ÀS 07:00	t	f	t	t	\N
30507	195	26	13:00 ÀS 19:00	t	f	t	t	\N
30508	195	26	19:00 ÀS 01:00	t	f	t	t	\N
30509	195	26	01:00 ÀS 07:00	t	f	t	t	\N
30510	195	27	13:00 ÀS 19:00	t	f	t	t	\N
30525	63	11	07:00 ÀS 13:00	t	f	t	t	\N
30526	63	11	13:00 ÀS 19:00	t	f	t	t	\N
30617	197	10	07:00 ÀS 13:00	t	f	t	t	\N
30618	197	10	13:00 ÀS 19:00	t	f	t	t	\N
30619	197	10	19:00 ÀS 01:00	t	f	t	t	\N
30620	197	10	01:00 ÀS 07:00	t	f	t	t	\N
30621	197	11	07:00 ÀS 13:00	t	f	t	t	\N
30622	197	11	13:00 ÀS 19:00	t	f	t	t	\N
30623	197	11	19:00 ÀS 01:00	t	f	t	t	\N
30624	197	11	01:00 ÀS 07:00	t	f	t	t	\N
30625	197	12	07:00 ÀS 13:00	t	f	t	t	\N
30626	197	12	13:00 ÀS 19:00	t	f	t	t	\N
30627	197	12	19:00 ÀS 01:00	t	f	t	t	\N
30628	197	12	01:00 ÀS 07:00	t	f	t	t	\N
30569	196	16	07:00 ÀS 13:00	t	f	t	t	\N
30570	196	16	13:00 ÀS 19:00	t	f	t	t	\N
30571	196	16	19:00 ÀS 01:00	t	f	t	t	\N
30572	196	16	01:00 ÀS 07:00	t	f	t	t	\N
30573	196	17	07:00 ÀS 13:00	t	f	t	t	\N
30574	196	17	13:00 ÀS 19:00	t	f	t	t	\N
30575	196	17	19:00 ÀS 01:00	t	f	t	t	\N
30576	196	17	01:00 ÀS 07:00	t	f	t	t	\N
30577	196	19	07:00 ÀS 13:00	t	f	t	t	\N
30578	196	19	13:00 ÀS 19:00	t	f	t	t	\N
30579	196	19	19:00 ÀS 01:00	t	f	t	t	\N
30580	196	19	01:00 ÀS 07:00	t	f	t	t	\N
30581	196	20	07:00 ÀS 13:00	t	f	t	t	\N
30582	196	20	13:00 ÀS 19:00	t	f	t	t	\N
30583	196	20	19:00 ÀS 01:00	t	f	t	t	\N
30584	196	20	01:00 ÀS 07:00	t	f	t	t	\N
30585	196	21	07:00 ÀS 13:00	t	f	t	t	\N
30586	196	21	13:00 ÀS 19:00	t	f	t	t	\N
30587	196	21	19:00 ÀS 01:00	t	f	t	t	\N
30588	196	21	01:00 ÀS 07:00	t	f	t	t	\N
30589	196	23	07:00 ÀS 13:00	t	f	t	t	\N
30590	196	23	13:00 ÀS 19:00	t	f	t	t	\N
30591	196	23	19:00 ÀS 01:00	t	f	t	t	\N
30592	196	23	01:00 ÀS 07:00	t	f	t	t	\N
30593	196	24	07:00 ÀS 13:00	t	f	t	t	\N
30594	196	24	13:00 ÀS 19:00	t	f	t	t	\N
30595	196	24	19:00 ÀS 01:00	t	f	t	t	\N
30596	196	24	01:00 ÀS 07:00	t	f	t	t	\N
30597	196	25	07:00 ÀS 13:00	t	f	t	t	\N
30598	196	25	13:00 ÀS 19:00	t	f	t	t	\N
30599	196	25	19:00 ÀS 01:00	t	f	t	t	\N
30600	196	25	01:00 ÀS 07:00	t	f	t	t	\N
30601	196	27	07:00 ÀS 13:00	t	f	t	t	\N
30602	196	27	13:00 ÀS 19:00	t	f	t	t	\N
30709	102	11	07:00 ÀS 13:00	t	f	t	t	\N
30710	102	11	13:00 ÀS 19:00	t	f	t	t	\N
30711	102	11	19:00 ÀS 01:00	t	f	t	t	\N
30712	102	11	01:00 ÀS 07:00	t	f	t	t	\N
30713	102	12	07:00 ÀS 13:00	t	f	t	t	\N
30714	102	12	13:00 ÀS 19:00	t	f	t	t	\N
30715	102	12	19:00 ÀS 01:00	t	f	t	t	\N
30716	102	12	01:00 ÀS 07:00	t	f	t	t	\N
30661	198	16	07:00 ÀS 13:00	t	f	t	t	\N
30662	198	16	13:00 ÀS 19:00	t	f	t	t	\N
30663	198	16	19:00 ÀS 01:00	t	f	t	t	\N
30664	198	16	01:00 ÀS 07:00	t	f	t	t	\N
30665	198	18	07:00 ÀS 13:00	t	f	t	t	\N
30666	198	18	13:00 ÀS 19:00	t	f	t	t	\N
30667	198	18	19:00 ÀS 01:00	t	f	t	t	\N
30668	198	18	01:00 ÀS 07:00	t	f	t	t	\N
30753	199	16	07:00 ÀS 13:00	t	f	t	t	\N
30754	199	16	13:00 ÀS 19:00	t	f	t	t	\N
30755	199	16	19:00 ÀS 01:00	t	f	t	t	\N
30756	199	16	01:00 ÀS 07:00	t	f	t	t	\N
30757	199	17	07:00 ÀS 13:00	t	f	t	t	\N
30758	199	17	13:00 ÀS 19:00	t	f	t	t	\N
30759	199	17	19:00 ÀS 01:00	t	f	t	t	\N
30760	199	17	01:00 ÀS 07:00	t	f	t	t	\N
30761	199	19	07:00 ÀS 13:00	t	f	t	t	\N
30762	199	19	13:00 ÀS 19:00	t	f	t	t	\N
30763	199	19	19:00 ÀS 01:00	t	f	t	t	\N
30764	199	19	01:00 ÀS 07:00	t	f	t	t	\N
30765	199	20	07:00 ÀS 13:00	t	f	t	t	\N
30717	102	13	07:00 ÀS 13:00	t	f	t	t	\N
30718	102	13	13:00 ÀS 19:00	t	f	t	t	\N
30719	102	13	19:00 ÀS 01:00	t	f	t	t	\N
30720	102	13	01:00 ÀS 07:00	t	f	t	t	\N
30721	102	15	07:00 ÀS 13:00	t	f	t	t	\N
30722	102	15	13:00 ÀS 19:00	t	f	t	t	\N
30723	102	15	19:00 ÀS 01:00	t	f	t	t	\N
30724	102	15	01:00 ÀS 07:00	t	f	t	t	\N
30725	102	1	07:00 ÀS 13:00	t	f	t	t	\N
30726	102	1	13:00 ÀS 19:00	t	f	t	t	\N
30727	102	1	19:00 ÀS 01:00	t	f	t	t	\N
30728	102	1	01:00 ÀS 07:00	t	f	t	t	\N
30729	102	3	07:00 ÀS 13:00	t	f	t	t	\N
30730	102	3	13:00 ÀS 19:00	t	f	t	t	\N
30731	102	3	19:00 ÀS 01:00	t	f	t	t	\N
30732	102	3	01:00 ÀS 07:00	t	f	t	t	\N
30733	102	4	07:00 ÀS 13:00	t	f	t	t	\N
30734	102	4	13:00 ÀS 19:00	t	f	t	t	\N
30735	102	4	19:00 ÀS 01:00	t	f	t	t	\N
30736	102	4	01:00 ÀS 07:00	t	f	t	t	\N
30737	102	5	07:00 ÀS 13:00	t	f	t	t	\N
30738	102	5	13:00 ÀS 19:00	t	f	t	t	\N
30739	102	5	19:00 ÀS 01:00	t	f	t	t	\N
30740	102	5	01:00 ÀS 07:00	t	f	t	t	\N
30741	102	7	07:00 ÀS 13:00	t	f	t	t	\N
30742	102	7	13:00 ÀS 19:00	t	f	t	t	\N
30743	102	7	19:00 ÀS 01:00	t	f	t	t	\N
30744	102	7	01:00 ÀS 07:00	t	f	t	t	\N
30745	102	8	07:00 ÀS 13:00	t	f	t	t	\N
30772	199	21	01:00 ÀS 07:00	t	f	t	t	\N
30773	199	23	07:00 ÀS 13:00	t	f	t	t	\N
30774	199	23	13:00 ÀS 19:00	t	f	t	t	\N
30775	199	23	19:00 ÀS 01:00	t	f	t	t	\N
30776	199	23	01:00 ÀS 07:00	t	f	t	t	\N
30777	199	24	07:00 ÀS 13:00	t	f	t	t	\N
30778	199	24	13:00 ÀS 19:00	t	f	t	t	\N
30779	199	24	19:00 ÀS 01:00	t	f	t	t	\N
30780	199	24	01:00 ÀS 07:00	t	f	t	t	\N
30781	199	25	07:00 ÀS 13:00	t	f	t	t	\N
30782	199	25	13:00 ÀS 19:00	t	f	t	t	\N
30783	199	25	19:00 ÀS 01:00	t	f	t	t	\N
30784	199	25	01:00 ÀS 07:00	t	f	t	t	\N
30785	199	27	07:00 ÀS 13:00	t	f	t	t	\N
30786	199	27	13:00 ÀS 19:00	t	f	t	t	\N
30787	199	27	19:00 ÀS 01:00	t	f	t	t	\N
30788	199	27	01:00 ÀS 07:00	t	f	t	t	\N
30789	199	28	07:00 ÀS 13:00	t	f	t	t	\N
30790	199	28	13:00 ÀS 19:00	t	f	t	t	\N
30791	199	28	19:00 ÀS 01:00	t	f	t	t	\N
30792	199	28	01:00 ÀS 07:00	t	f	t	t	\N
30793	199	29	07:00 ÀS 13:00	t	f	t	t	\N
30794	199	29	13:00 ÀS 19:00	t	f	t	t	\N
30795	199	29	19:00 ÀS 01:00	t	f	t	t	\N
30796	199	29	01:00 ÀS 07:00	t	f	t	t	\N
30797	199	31	07:00 ÀS 13:00	t	f	t	t	\N
30798	199	31	13:00 ÀS 19:00	t	f	t	t	\N
30799	199	31	19:00 ÀS 01:00	t	f	t	t	\N
30800	199	31	01:00 ÀS 07:00	t	f	t	t	\N
24004	212	28	19:00 ÀS 01:00	t	f	t	t	\N
24005	212	28	01:00 ÀS 07:00	t	f	t	t	\N
24012	86	13	07:00 ÀS 13:00	t	f	t	t	\N
24013	86	13	13:00 ÀS 19:00	t	f	t	t	\N
24014	86	13	19:00 ÀS 01:00	t	f	t	t	\N
24015	86	14	07:00 ÀS 13:00	t	f	t	t	\N
24016	86	14	13:00 ÀS 19:00	t	f	t	t	\N
23990	212	17	07:00 ÀS 13:00	t	f	t	t	\N
23991	212	17	13:00 ÀS 19:00	t	f	t	t	\N
23934	211	17	19:00 ÀS 01:00	t	f	t	t	\N
23935	211	17	01:00 ÀS 07:00	t	f	t	t	\N
23936	211	18	13:00 ÀS 19:00	t	f	t	t	\N
23937	211	18	19:00 ÀS 01:00	t	f	t	t	\N
23938	211	18	01:00 ÀS 07:00	t	f	t	t	\N
23939	211	19	13:00 ÀS 19:00	t	f	t	t	\N
23940	211	19	19:00 ÀS 01:00	t	f	t	t	\N
23941	211	19	01:00 ÀS 07:00	t	f	t	t	\N
23942	211	20	13:00 ÀS 19:00	t	f	t	t	\N
23943	211	20	19:00 ÀS 01:00	t	f	t	t	\N
23944	211	20	01:00 ÀS 07:00	t	f	t	t	\N
23945	211	21	13:00 ÀS 19:00	t	f	t	t	\N
23946	211	21	19:00 ÀS 01:00	t	f	t	t	\N
23947	211	21	01:00 ÀS 07:00	t	f	t	t	\N
23948	211	22	13:00 ÀS 19:00	t	f	t	t	\N
23949	211	22	19:00 ÀS 01:00	t	f	t	t	\N
23950	211	22	01:00 ÀS 07:00	t	f	t	t	\N
23951	211	23	07:00 ÀS 13:00	t	f	t	t	\N
23952	211	23	13:00 ÀS 19:00	t	f	t	t	\N
23953	211	23	19:00 ÀS 01:00	t	f	t	t	\N
23954	211	23	01:00 ÀS 07:00	t	f	t	t	\N
23955	211	24	07:00 ÀS 13:00	t	f	t	t	\N
23992	212	17	19:00 ÀS 01:00	t	f	t	t	\N
23993	212	17	01:00 ÀS 07:00	t	f	t	t	\N
23994	212	18	13:00 ÀS 19:00	t	f	t	t	\N
23995	212	18	19:00 ÀS 01:00	t	f	t	t	\N
23982	119	13	19:00 ÀS 01:00	t	f	t	t	\N
23983	119	13	01:00 ÀS 07:00	t	f	t	t	\N
23984	119	5	19:00 ÀS 01:00	t	f	t	t	\N
23985	119	5	01:00 ÀS 07:00	t	f	t	t	\N
23996	212	18	01:00 ÀS 07:00	t	f	t	t	\N
23997	212	21	19:00 ÀS 01:00	t	f	t	t	\N
23998	212	21	01:00 ÀS 07:00	t	f	t	t	\N
23999	212	25	19:00 ÀS 01:00	t	f	t	t	\N
24000	212	25	01:00 ÀS 07:00	t	f	t	t	\N
24001	212	26	13:00 ÀS 19:00	t	f	t	t	\N
24002	212	26	19:00 ÀS 01:00	t	f	t	t	\N
24003	212	26	01:00 ÀS 07:00	t	f	t	t	\N
24017	86	14	19:00 ÀS 01:00	t	f	t	t	\N
24018	86	15	07:00 ÀS 13:00	t	f	t	t	\N
24019	86	15	13:00 ÀS 19:00	t	f	t	t	\N
24020	86	15	19:00 ÀS 01:00	t	f	t	t	\N
24021	86	1	07:00 ÀS 13:00	t	f	t	t	\N
24022	86	1	13:00 ÀS 19:00	t	f	t	t	\N
24023	86	1	19:00 ÀS 01:00	t	f	t	t	\N
24024	86	2	07:00 ÀS 13:00	t	f	t	t	\N
24025	86	2	13:00 ÀS 19:00	t	f	t	t	\N
24026	86	2	19:00 ÀS 01:00	t	f	t	t	\N
24105	126	12	19:00 ÀS 01:00	t	f	f	t	\N
24080	67	11	19:00 ÀS 01:00	t	f	t	t	\N
24081	67	15	07:00 ÀS 13:00	t	f	t	t	\N
24082	67	15	13:00 ÀS 19:00	t	f	t	t	\N
24083	67	4	07:00 ÀS 13:00	t	f	t	t	\N
24084	67	4	13:00 ÀS 19:00	t	f	t	t	\N
24085	67	7	07:00 ÀS 13:00	t	f	t	t	\N
24086	67	7	13:00 ÀS 19:00	t	f	t	t	\N
24087	67	7	19:00 ÀS 01:00	t	f	t	t	\N
24088	67	8	07:00 ÀS 13:00	t	f	t	t	\N
24042	213	17	07:00 ÀS 13:00	t	f	t	t	\N
24043	213	17	13:00 ÀS 19:00	t	f	t	t	\N
24044	213	17	19:00 ÀS 01:00	t	f	t	t	\N
24045	213	18	07:00 ÀS 13:00	t	f	t	t	\N
24046	213	18	13:00 ÀS 19:00	t	f	t	t	\N
24047	213	18	19:00 ÀS 01:00	t	f	t	t	\N
24048	213	19	07:00 ÀS 13:00	t	f	t	t	\N
24049	213	19	13:00 ÀS 19:00	t	f	t	t	\N
24050	213	19	19:00 ÀS 01:00	t	f	t	t	\N
24051	213	21	07:00 ÀS 13:00	t	f	t	t	\N
24052	213	21	13:00 ÀS 19:00	t	f	t	t	\N
24091	214	19	07:00 ÀS 13:00	t	f	t	t	\N
24092	214	19	13:00 ÀS 19:00	t	f	t	t	\N
24093	214	19	19:00 ÀS 01:00	t	f	t	t	\N
24094	214	20	07:00 ÀS 13:00	t	f	t	t	\N
24095	214	20	13:00 ÀS 19:00	t	f	t	t	\N
24096	214	27	07:00 ÀS 13:00	t	f	t	t	\N
24097	214	27	13:00 ÀS 19:00	t	f	t	t	\N
24098	214	27	19:00 ÀS 01:00	t	f	t	t	\N
24099	214	28	07:00 ÀS 13:00	t	f	t	t	\N
24100	214	28	13:00 ÀS 19:00	t	f	t	t	\N
24101	214	30	13:00 ÀS 19:00	t	f	t	t	\N
24102	214	31	07:00 ÀS 13:00	t	f	t	t	\N
24103	214	31	13:00 ÀS 19:00	t	f	t	t	\N
24089	67	8	13:00 ÀS 19:00	t	f	t	t	\N
24090	67	2	13:00 ÀS 19:00	t	f	t	t	\N
24106	126	13	13:00 ÀS 19:00	t	f	f	t	\N
24107	126	13	19:00 ÀS 01:00	t	f	f	t	\N
24108	126	14	13:00 ÀS 19:00	t	f	f	t	\N
24109	126	14	19:00 ÀS 01:00	t	f	f	t	\N
24110	126	1	13:00 ÀS 19:00	t	f	f	t	\N
24111	126	1	19:00 ÀS 01:00	t	f	f	t	\N
24112	126	2	13:00 ÀS 19:00	t	f	f	t	\N
24113	126	2	19:00 ÀS 01:00	t	f	f	t	\N
24114	126	4	13:00 ÀS 19:00	t	f	f	t	\N
24115	126	4	19:00 ÀS 01:00	t	f	f	t	\N
24116	126	5	13:00 ÀS 19:00	t	f	f	t	\N
24117	126	5	19:00 ÀS 01:00	t	f	f	t	\N
24118	126	6	13:00 ÀS 19:00	t	f	f	t	\N
24124	215	16	13:00 ÀS 19:00	t	f	f	t	\N
24125	215	16	19:00 ÀS 01:00	t	f	f	t	\N
24126	215	17	13:00 ÀS 19:00	t	f	f	t	\N
24127	215	17	19:00 ÀS 01:00	t	f	f	t	\N
24128	215	18	13:00 ÀS 19:00	t	f	f	t	\N
24129	215	18	19:00 ÀS 01:00	t	f	f	t	\N
24130	215	20	13:00 ÀS 19:00	t	f	f	t	\N
24131	215	20	19:00 ÀS 01:00	t	f	f	t	\N
24132	215	21	13:00 ÀS 19:00	t	f	f	t	\N
24133	215	21	19:00 ÀS 01:00	t	f	f	t	\N
24134	215	22	13:00 ÀS 19:00	t	f	f	t	\N
24135	215	22	19:00 ÀS 01:00	t	f	f	t	\N
24136	215	24	13:00 ÀS 19:00	t	f	f	t	\N
24137	215	24	19:00 ÀS 01:00	t	f	f	t	\N
24119	126	6	19:00 ÀS 01:00	t	f	f	t	\N
24165	217	18	13:00 ÀS 19:00	t	f	t	t	\N
24147	215	30	19:00 ÀS 01:00	t	f	f	t	\N
24166	217	19	13:00 ÀS 19:00	t	f	t	t	\N
24167	217	20	13:00 ÀS 19:00	t	f	t	t	\N
24168	217	21	13:00 ÀS 19:00	t	f	t	t	\N
24169	217	22	13:00 ÀS 19:00	t	f	t	t	\N
24170	217	22	19:00 ÀS 01:00	t	f	t	t	\N
24171	217	22	01:00 ÀS 07:00	t	f	t	t	\N
24172	217	25	13:00 ÀS 19:00	t	f	t	t	\N
24173	217	26	13:00 ÀS 19:00	t	f	t	t	\N
24174	217	27	13:00 ÀS 19:00	t	f	t	t	\N
24175	217	29	13:00 ÀS 19:00	t	f	t	t	\N
24176	217	29	19:00 ÀS 01:00	t	f	t	t	\N
24177	217	29	01:00 ÀS 07:00	t	f	t	t	\N
24190	218	17	07:00 ÀS 13:00	t	f	t	t	\N
24191	218	17	13:00 ÀS 19:00	t	f	t	t	\N
24192	218	17	19:00 ÀS 01:00	t	f	t	t	\N
24193	218	17	01:00 ÀS 07:00	t	f	t	t	\N
24194	218	19	19:00 ÀS 01:00	t	f	t	t	\N
24148	216	11	13:00 ÀS 19:00	t	f	t	t	\N
24149	216	12	13:00 ÀS 19:00	t	f	t	t	\N
24150	216	13	13:00 ÀS 19:00	t	f	t	t	\N
24151	216	14	13:00 ÀS 19:00	t	f	t	t	\N
24152	216	15	13:00 ÀS 19:00	t	f	t	t	\N
24153	216	15	19:00 ÀS 01:00	t	f	t	t	\N
24154	216	15	01:00 ÀS 07:00	t	f	t	t	\N
24155	216	1	13:00 ÀS 19:00	t	f	t	t	\N
24156	216	1	19:00 ÀS 01:00	t	f	t	t	\N
24157	216	1	01:00 ÀS 07:00	t	f	t	t	\N
24158	216	4	13:00 ÀS 19:00	t	f	t	t	\N
24159	216	5	13:00 ÀS 19:00	t	f	t	t	\N
24160	216	6	13:00 ÀS 19:00	t	f	t	t	\N
24161	216	7	13:00 ÀS 19:00	t	f	t	t	\N
24162	216	8	13:00 ÀS 19:00	t	f	t	t	\N
24163	216	8	19:00 ÀS 01:00	t	f	t	t	\N
24164	216	8	01:00 ÀS 07:00	t	f	t	t	\N
24195	218	19	01:00 ÀS 07:00	t	f	t	t	\N
24196	218	20	13:00 ÀS 19:00	t	f	t	t	\N
24197	218	20	19:00 ÀS 01:00	t	f	t	t	\N
24198	218	20	01:00 ÀS 07:00	t	f	t	t	\N
24199	218	21	07:00 ÀS 13:00	t	f	t	t	\N
24200	218	21	19:00 ÀS 01:00	t	f	t	t	\N
24201	218	21	01:00 ÀS 07:00	t	f	t	t	\N
24208	219	10	19:00 ÀS 01:00	t	f	t	t	\N
24209	219	10	01:00 ÀS 07:00	t	f	t	t	\N
24210	219	2	19:00 ÀS 01:00	t	f	t	t	\N
24211	219	2	01:00 ÀS 07:00	t	f	t	t	\N
24212	220	18	19:00 ÀS 01:00	t	f	t	t	\N
24178	78	11	19:00 ÀS 01:00	t	f	t	t	\N
24179	78	11	01:00 ÀS 07:00	t	f	t	t	\N
24180	78	12	07:00 ÀS 13:00	t	f	t	t	\N
24181	78	12	13:00 ÀS 19:00	t	f	t	t	\N
24182	78	12	19:00 ÀS 01:00	t	f	t	t	\N
24183	78	12	01:00 ÀS 07:00	t	f	t	t	\N
24184	78	13	19:00 ÀS 01:00	t	f	t	t	\N
24185	78	13	01:00 ÀS 07:00	t	f	t	t	\N
24186	78	4	19:00 ÀS 01:00	t	f	t	t	\N
24187	78	4	01:00 ÀS 07:00	t	f	t	t	\N
24188	78	5	19:00 ÀS 01:00	t	f	t	t	\N
24189	78	5	01:00 ÀS 07:00	t	f	t	t	\N
24213	220	18	01:00 ÀS 07:00	t	f	t	t	\N
24214	220	26	19:00 ÀS 01:00	t	f	t	t	\N
24215	220	26	01:00 ÀS 07:00	t	f	t	t	\N
\.


--
-- Data for Name: efetivo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.efetivo (id_militar, nome_completo, nome_guerra, posto_graduacao, matricula, numero_ordem, cpf, rgpm, opm, telefone, motorista, status_ativo) FROM stdin;
200	MARTINHO DE ARAUJO JOVINO JUNIOR	JOVINO	1º TEN PM	15199	174232	03666327524	15621017	9o BPM	\N	Não	t
220	SALOMÃO GOMES BARBOSA JUNIOR	SALOMAO	1º SGT PM	1204270	96347	03907636406	4872002	9o BPM	(82)98131-1513	Nao	t
230	EDUARDO LIMA E SILVA	E. LIMA	2º SGT PM	1203100	96023	00475357507	5492002	9o BPM	(82)98866-1800	Nao	t
206	EDERALDO DE LIMA	EDERALDO	SUB PM	73261	78276	47256079400	964987	9o BPM	(82)98735-8912	Não	t
241	JESSE VENANCIO CINTRA	CINTRA	2º SGT PM	336874	113621	03993910451	10083006	9o BPM	(82)98807-5422	Nao	t
209	CICERO SILVA DOS SANTOS	SILVA	1º SGT PM	112534	81636	92614698415	233992	9o BPM	(82)98859-2513	Não	t
205	PEDRO VINÍCIUS GUEDES BRAGA	GUEDES	ASP PM	51829	204806	07242175330	20089094047	9o BPM	(88)99346-6012	Não	t
247	JURANDIR ALVES DE SIQUEIRA	JURANDIR	2º SGT PM	655716	140605	94189862568	13437010	9o BPM	(75)98815-6565	Nao	t
217	PAULO RICARDO BARROS SALES	PAULO SALES	1º SGT PM	348660	113800	95873902453	10989006	9o BPM	(82)99985-3875	Não	t
238	GRÉCIO DARKE JESUS DE FREITAS	GRECIO	2º SGT PM	1202626	95715	69907030597	1859002	9o BPM	(82)98133-6527	Nao	t
212	ISABEL CRISTINA TELES PEREIRA LIMA	ISABEL	1º SGT PM	1205560	96834	03528192437	04.668-002	9o BPM	(82)99976-5880	Não	t
210	EROLDO ROCHA QUEIROZ	QUEIROZ	1º SGT PM	1206044	97037	04512828419	4383002	9o BPM	(82)98829-5779	Nao	t
203	ALEXANDRE HENRIQUE TEIXEIRA BEZERRA	HENRIQUE	2º TEN PM	96644	80200	60515082449	522991	9o BPM	(82)98102-4689	Não	t
242	JOSE AUGUSTO DOS SANTOS	AUGUSTO	2º SGT PM	335177	113560	03390131418	9187006	9o BPM	(82)99915-6241	Nao	t
228	CARLOS BEZERRA DA SILVA	CARLOS	2º SGT PM	649309	140303	06709505480	13.455-010	9o BPM	(82)99947-8991	Nao	t
239	HEIDER CLAITON ALVES DE SOUZA	HEIDER	2º SGT PM	652628	140466	86342754420	13334010	9o BPM	(82)99142-2680	Nao	t
221	SEBASTIAO EMILIANO DA SILVA	DA SILVA	1º SGT PM	99449	80464	55398847449	3729991	9o BPM	(82)98858-7666	Nao	t
224	WELLINGTON ALVES DA SILVA	WELLINGTON	1º SGT PM	118974	82274	84219734449	12.390-998	9o BPM	(82)99947-9053	Não	t
231	EDVÂNIO PINHEIRO DA SILVA	EDVÂNIO	2º SGT PM	351245	113881	01920833501	8461006	9o BPM	(75)99218-0855	Não	t
226	ANDERSON FLAVIO DE MOURA MORAES	FLÁVIO	2º SGT PM	304050	113056	02771615410	8874006	9o BPM	(82)98135-7236	Nao	t
222	SÓSTENES TAVARES CERQUEIRA	TAVARES	1º SGT PM	1202707	95723	02803393484	1145002	9o BPM	(82)99822-6287	Não	t
236	FRANCISCO OLIVEIRA	F. OLIVEIRA	2º SGT PM	646512	140245	04580551400	13439010	9o BPM	(82)98822-5540	Nao	t
245	JOSINALDO AERMÍNIO DA SILVA	AERMÍNIO	2º SGT PM	347060	113745	03238212435	9222006	9o BPM	(87)98105-3435	Não	t
249	MARCELO PEREIRA NICOLAU	NICOLAU	2º SGT PM	335002	113527	04675737439	10868006	9o BPM	(82)98856-8796	Não	t
232	ELIOMAR ALVES TAVARES	ELIOMAR	2º SGT PM	323845	113308	05297372488	9112006	9o BPM	(82)98118-2156	Nao	t
223	VALTER DOS SANTOS	VALTER	1º SGT PM	99678	80485	78684706404	9075991	9o BPM	6411412	Não	t
308	JOSÉ DIEGO DA SILVA	J. DIEGO	CB PM	26158	178106	07410063408	15716018	9o BPM	(82)99909-2883	Não	t
234	FERNANDO RODRIGUES SILVA	FERNANDO	2º SGT PM	306550	113106	01173400494	10436006	9o BPM	(87)99161-4346	Não	t
233	ESPEDITO JOSE DA SILVA PEREIRA	J. PEREIRA	2º SGT PM	349305	113851	07024580402	9936006	9o BPM	(87)99635-4364	Não	t
201	PEDRO VINICYOS VIEIRA SANTOS	VINICYOS	1º TEN PM	22624	174290	04949356500	31959571	9o BPM	\N	Não	t
229	CRISTIANO MARQUES DA SILVA	CRISTIANO	2º SGT PM	366498	113954	94556229553	8995006	9o BPM	(75)98841-0233	Nao	t
207	JOSE CICERO MACIEL SILVA	MACIEL	SUB PM	69027	77935	63538016453	3727987	9o BPM	(82)98107-2803	Nao	t
225	ALEX FAGUNDES DOS SANTOS	FAGUNDES	2º SGT PM	312274	113174	00920580432	10766006	9o BPM	(82)98759-9157	Nao	t
235	FLAVIANA DOS SANTOS	FLAVIANA	2º SGT PM	367494	114029	03989768484	9142006	9o BPM	(75)99168-6811	Nao	t
216	MARCOS ARAÚJO DA SILVA	MARCOS ARAÚJO	1º SGT PM	119903	82367	88856437449	12401998	9o BPM	(82)98134-3344	Nao	t
204	ANTONIO FERNANDO DE CARVALHO NETO	CARVALHO	ASP PM	53880	178249	09601191402	16199018	9o BPM	(82)99696-6326	Nao	t
243	JOSÉ EDIMILSON DE MENEZES	J. EDIMILSON	2º SGT PM	1202316	95684	87158043568	5376002	9o BPM	(82)98874-9957	Nao	t
197	JOSÉ CLOVES DA SILVA JÚNIOR	CLOVES	CAP PM	14664	151197	07712466416	14895014	9o BPM	(82)99108-2747	Não	t
213	JOSE CARLOS PEREIRA DA SILVA	C. PEREIRA	1º SGT PM	1206982	99485	03696736465	7562003	9o BPM	(75)98841-7032	Nao	t
214	JOSÉ MESSIAS SATIRO SILVA	SATIRO	1º SGT PM	115789	81956	74072269468	4673994	9o BPM	(82)98131-1592	Nao	t
199	JAILSON LIMA DOS SANTOS	JAILSON	1º TEN PM	84913	79207	63607263434	01.262-989	9o BPM	(82)99944-0268	Nao	t
218	PAULO ROBERTO MELO SILVA	ROBERTO	1º SGT PM	120936	87881	34842063491	12906987	9o BPM	(82)98128-1095	Não	t
240	IVALDO GUEDES DA SILVA	GUEDES	2º SGT PM	334995	113526	02857505507	8909006	9o BPM	(82)98214-9628	Não	t
246	JOSIVALDO ANTONIO DE MELO	JOSIVALDO	2º SGT PM	359980	113910	03854071493	8480006	9o BPM	(82)98123-2990	Não	t
244	JOSÉ LAÉCIO MARTINS	LAÉCIO	2º SGT PM	365327	113934	05786696413	8850006	9o BPM	(87)99915-9043	Não	t
248	MAILTON DOS SANTOS SILVA	MAILTON	2º SGT PM	303330	113028	04937992490	8583006	9o BPM	(82)99600-8633	Nao	t
250	MARIA LAYS PEREIRA DA SILVA	MARIA LAYS	2º SGT PM	336432	113587	06647595481	10952006	9o BPM	(82)99956-0698	Não	t
208	AÉCIO VALGUEIRO FERRAZ	FERRAZ	1º SGT PM	1205722	96990	03316813403	2529002	9o BPM	(87)98115-3258	Não	t
215	MARCELO FEITOSA DOS SANTOS	FEITOSA	1º SGT PM	1203134	96026	04020579458	5591002	9o BPM	(82)98160-9913	Nao	t
211	FLÁVIO DA SILVA BEZERRA	BEZERRA	1º SGT PM	1206010	97034	02891372417	3623002	9o BPM	(87)99962-1291	Não	t
251	MARIA NILDA PESSOA MATIAS	NILDA	2º SGT PM	349259	113847	06141549446	09.388-006	9o BPM	(75)99247-1565	Nao	t
219	REGINALDO DE JESUS OLIVEIRA	REGINALDO	1º SGT PM	1204130	96333	69343284500	04.215-002	9o BPM	(79)98834-9230	Não	t
227	ANTONIO WILSON GONÇALVES DE ALENCAR JUNIOR	WILSON	2º SGT PM	357359	113900	89704843534	8469006	9o BPM	(75)99256-3996	Nao	t
202	VALDEMAR FRANCISCO PEREIRA FILHO	PEREIRA	1º TEN PM	5916	187778	06895110437	35904054	9o BPM	(82)99954-0077	Não	t
255	WDSON GREYCK QUEIROZ DA COSTA	WDSON	2º SGT PM	655120	140547	06747113438	13559010	9o BPM	(82)98882-7233	Nao	t
276	JOSÉ CLODOALDO ALVES DE SOUZA JÚNIOR	CLODOALDO JÚNIOR	3º SGT PM	5487	149261	04725847402	6127024	9o BPM	(82)98105-9205	Nao	t
263	ELTON SILVA LIMA	ELTON	3º SGT PM	21946	170489	08867037439	15597016	9o BPM	(87)03851-5934	Não	t
301	DANIELDER DE MENEZES CINTRA	CINTRA	CB PM	25593	178044	08741541464	15722018	9o BPM	(82)99951-6844	Nao	t
264	EMMANUEL BARBOSA MENEZES	EMMANUEL	3º SGT PM	2259	148970	08280330488	32141025	9o BPM	(82)98121-2509	Não	t
261	DAMIÃO DOS SANTOS FERNANDES JUNIOR	DAMIÃO	3º SGT PM	21474	170056	05614697500	15504016	9o BPM	(75)99212-7677	Nao	t
254	SHIRLEY ELIENAI NASCIMENTO DE LIMA LICETTI	ELIENAI	2º SGT PM	317535	113233	02936774411	8952006	9o BPM	(82)98849-8787	Não	t
300	CLEITON MOTA DA SILVA	MOTA	CB PM	28495	178350	06382031550	16.024-018	9o BPM	(79)99833-0844	Não	t
271	JACKSON ALEXANDRINO DA SILVA	ALEXAANDRINO	3º SGT PM	12726	150057	00657269522	30066263	9o BPM	793252593	Nao	t
262	ELIELSON SOARES DE ARAUJO	ELIELSON	3º SGT PM	15474	165579	01432523481	15.079-016	9o BPM	(82)99931-7851	Não	t
267	FRANCISCO FABIANO MOURA FELIX	MOURA	3º SGT PM	3786	165469	07050017418	15064016	9o BPM	(83)99660-9491	Não	t
304	HYGOR LEONARDO DE SÁ SANTOS	HYGOR SÁ	CB PM	26310	178127	10529552400	16295018	9o BPM	(87)99625-0490	Não	t
282	MARCIO ANTONIO DA SILVA	ANTONIO	3º SGT PM	2313	148975	01564452557	951931709	9o BPM	(75)99124-5829	Nao	t
283	MAXSUEL DOS SANTOS	M SANTOS	3º SGT PM	16691	165715	09694808499	15086016	9o BPM	(82)99654-1849	Nao	t
273	JONAS CONSTANTE DE ALMEIDA JUNIOR	JONAS	3º SGT PM	8621	149528	06256653416	2002001088259	9o BPM	(82)99647-3412	Não	t
269	ISLANIO SALVIANO DA CRUZ	ISLANIO	3º SGT PM	309850	113155	06232107462	8811006	9o BPM	(87)03871-3958	Não	t
274	JONAS DOMINGOS CAVALCANTI	CAVALCANTI	3º SGT PM	14060	150186	04822405559	8269487	9o BPM	(82)99646-1879	Não	t
275	JORGE RANULFO DA SILVA RODRIGUES	RANULFO	3º SGT PM	12831	150062	07999833495	31827594	9o BPM	(82)99660-6054	Não	t
253	RAFAEL MONTEIRO MENDES	MONTEIRO	2º SGT PM	663824	140787	05626561463	13.508-010	9o BPM	(82)99628-5177	Nao	t
297	CAMILA SANTANA CARVALHO CALO	CAMILA	CB PM	24902	177965	04573423583	16091018	9o BPM	(82)99163-4189	Nao	t
278	JUSSAN DE SOUZA QUEIROZ	JUSSAN	3º SGT PM	10758	149728	08484444422	30371643	9o BPM	(82)99976-9448	Não	t
257	ABEL JUNIOR DOS SANTOS OLIVEIRA	ABEL	3º SGT PM	5053	149220	03991256479	6458291	9o BPM	(87)99801-2833	Não	t
277	JOSÉ FERNANDO DOS SANTOS DIAS	DIAS	3º SGT PM	657280	140637	05075229409	13443010	9o BPM	(82)99930-7264	Nao	t
287	RAFAEL HENRIQUE BEZERRA DA SILVA	RAFAEL BEZERRA	3º SGT PM	14265	150780	00973463570	1138131806	9o BPM	(75)98847-9292	Não	t
286	PEDRO HENRIQUE DOS SANTOS NETO	PEDRO NETO	3º SGT PM	15377	165563	06867027431	15015016	9o BPM	(82)98868-7384	Nao	t
284	MELQUISEDEQUE DE AMORIM SANTOS	AMORIM	3º SGT PM	18252	167924	03137786550	15289016	9o BPM	\N	Não	t
268	IREMAR FLORENTINO DOS SANTOS	IREMAR	3º SGT PM	22187	170514	08092284407	15561016	9o BPM	839934378	Não	t
281	MANOEL CLAUDINO FILHO	FILHO	3º SGT PM	16179	165664	04146548462	15081016	9o BPM	(82)99951-3824	Não	t
279	LEOMAX XAVIER DE SALES	LEOMAX	3º SGT PM	12742	150059	07051614479	3448885	9o BPM	(83)99903-3167	Não	t
259	ALAN KLEBER DE MENEZES SOARES	ALAN KLEBER	3º SGT PM	1426060	142423	02715243405	13687010	9o BPM	(82)98855-0829	Nao	t
256	YURI LINHARES DE BARROS	YURI	2º SGT PM	321753	113295	04349408444	9402006	9o BPM	(87)98812-7791	Nao	t
285	NEWERTON SANTOS DA SILVA	NEWERTON	3º SGT PM	5410	149253	07758985467	31767435	9o BPM	(82)98757-8629	Não	t
280	MACIEL RODRIGUES DA SILVA	MACIEL	3º SGT PM	949	148063	88858561449	13763013	9o BPM	(82)99812-9500	Não	t
289	RAFAEL TEIXEIRA LOPES CARVALHO	TEIXEIRA	3º SGT PM	10901	149745	09078392401	8798544	9o BPM	(87)98835-4907	Não	t
293	VICTOR HUGO SANTANA ARAÚJO	VICTOR HUGO	3º SGT PM	14206	150671	07652744423	14839014	9o BPM	(82)99695-3933	Nao	t
294	WILLIAM CARLOS DO NASCIMENTO SILVA	NASCIMENTO	3º SGT PM	12718	150056	08916626420	7101160	9o BPM	(87)99626-7259	Não	t
295	YURE GLEIDSON MENEZES MARQUES	MARQUES	3º SGT PM	2585	148996	08993559430	8127776	9o BPM	(87)99209-2704	Não	t
305	JADIEL ANDRADE DA SILVEIRA JUNIOR	JADIEL	CB PM	23655	177856	04793418503	16.268-018	9o BPM	(79)99881-9895	Nao	t
265	EWERTON ALVES DO NASCIMENTO	EWERTON	3º SGT PM	17841	167848	07685533421	15316016	9o BPM	(82)99602-0984	Nao	t
298	CINTIA DE BRITO MONTEIRO	CINTIA	CB PM	31100	178588	04159863540	16485018	9o BPM	(75)98853-7403	Não	t
296	ALLISSON MATEUS DA SILVA	ALLISSON	CB PM	31046	178586	12207731405	15994018	9o BPM	(87)98845-4351	Nao	t
292	SIMONE MARIA DE LAVOR OLIVEIRA	SIMONE	3º SGT PM	15423	165571	07723084463	14984016	9o BPM	(87)99825-1996	Não	t
288	RAFAEL MACHADO DOS SANTOS	RAFAEL	3º SGT PM	18872	168903	03681493588	15281016	9o BPM	(75)99159-0107	Nao	t
302	DIEGO BARBOSA MATIAS BARROS	DIEGO MATIAS	CB PM	34223	178851	12954083417	16436018	9o BPM	(87)99163-6479	Não	t
303	EMERSON LOPES DOS SANTOS	LOPES	CB PM	29904	178482	05772590596	15782018	9o BPM	(82)98180-8007	Não	t
260	ALISSON ALVES MARTINS DOS SANTOS	MARTINS	3º SGT PM	22047	170499	03517069507	15534016	9o BPM	(87)98845-8542	Nao	t
270	IVANILDO FRANCISCO DE OLIVEIRA	IVANILDO	3º SGT PM	22241	170518	05720954490	15558016	9o BPM	(82)99970-4632	Não	t
306	JEFERSON IRENO DOS SANTOS	JEFERSON	CB PM	33812	178819	06244833554	16.184-018	9o BPM	(75)99938-0302	Não	t
307	JONATA GOMES DE LIMA	J. LIMA	CB PM	32115	178693	10102129401	159991018	9o BPM	(87)98824-0493	Não	t
299	CLÉBSON CAVALCANTE LIMA NOVAES	NOVAES	CB PM	29033	178403	09414899499	16313018	9o BPM	(87)99913-0812	Não	t
290	SALES RONILDO DE ARRUDA SIQUEIRA	SIQUEIRA	3º SGT PM	6025	149308	07466643469	7364227	9o BPM	(87)99627-7693	Não	t
258	ADELMO AGOSTINHO DE AQUINO	AQUINO	3º SGT PM	8389	149508	06825409433	30917875	9o BPM	(82)99915-8884	Nao	t
291	SELSON CARLOS DOS SANTOS	SELSON	3º SGT PM	21199	170012	00744108578	15.464-016	9o BPM	(82)98728-4376	Não	t
266	FRANCISCO DIÊGO GOMES DE MOURA	GOMES	3º SGT PM	16489	165692	06041363405	15102016	9o BPM	(87)98109-1231	Não	t
314	LUCAS EMMANUEL TENÓRIO DE HOLANDA	TENÓRIO	CB PM	28550	178356	07620825428	15938018	9o BPM	(82)99983-6820	Não	t
315	PABLO RAFAEL NASCIMENTO SANTOS	RAFAEL	CB PM	33693	178811	04583458576	16425018	9o BPM	(79)99860-8200	Nao	t
342	ISABELLE LOPES DE MORAES	ISABELLE	SD PM	40231	186456	12803337401	0	9o BPM	(82)99843-5219	Nao	t
327	ANNE CAROLINE OLIVEIRA MOTTA	CAROLINE MOTTA	SD PM	53686	205014	06628832503	1497450527	9o BPM	(74)98821-2263	Nao	t
312	LAZARO LOPES DA SILVA	L. LOPES	CB PM	23930	177884	10417350490	16039018	9o BPM	(82)99944-5813	Não	t
347	JOSEMAR DE JESUS OLIVEIRA	JOSEMAR	SD PM	43680	186895	01196351511	31156576 SSP-SE	9o BPM	(79)99969-6267	Nao	t
335	ERINALDO FERREIRA DE OLIVEIRA	E. OLIVEIRA	SD PM	55301	205326	05827861502	35003596	9o BPM	(79)99657-2094	Não	t
360	MARIA CLARA ROCHA SANTOS	MARIA	SD PM	47830	204398	05527529596	36279293	9o BPM	(79)99997-1844	Nao	t
330	DANIEL DO NASCIMENTO	D. NASCIMENTO	SD PM	43567	186842	07133899400	0	9o BPM	(82)98189-5362	Nao	t
355	LEONARDO VINICIUS RODRIGUES ALMEIDA	ALMEIDA	SD PM	50385	204663	06647805559	2054888621	9o BPM	(75)98893-5811	Nao	t
332	DOUGLAS NASCIMENTO DE SOUZA	NASCIMENTO	SD PM	49689	204598	05123818529	1379328470	9o BPM	(74)98831-9959	Não	t
366	RENATA FIGUEIREDO AMARO	RENATA	SD PM	43664	186893	05965465483	6710959 SDS-PE	9o BPM	(87)99924-2604	Não	t
353	KARYLLA MIRELLY ANDRADE E SILVA	KARYLLA	SD PM	48330	204441	06815463443	9619753	9o BPM	(87)98856-4936	Nao	t
317	RENATO MOREIRA DA SILVA JUNIOR	RENATO MOREIRA	CB PM	32271	178703	11723604488	15836018	9o BPM	(82)98152-5002	Nao	t
329	CORIOLANO NUNES DE MEDEIROS	CORIOLANO	SD PM	34959	186004	00850281423	0	9o BPM	(87)99811-0556	Nao	t
351	JÚLIO CÉSAR BARBOZA DA SILVA	CÉSAR	SD PM	55794	205379	12387543416	9631963	9o BPM	(87)99937-8944	Nao	t
362	MAURO CESAR DE SOUZA SILVA	MAURO	SD PM	35661	186065	02322167460	0	9o BPM	(82)98131-7746	Nao	t
357	LUCAS ALENCAR DE OLIVEIRA	L.OLIVEIRA	SD PM	50911	204722	11646880498	10324490	9o BPM	(87)99805-4243	Não	t
320	ACLEYTON DE LIMA SOARES	ACLEYTON	SD PM	36854	186153	03152404409	0	9o BPM	(87)99966-7664	Nao	t
365	RAIMUNDO NONATO GOMES NETO	R. NETO	SD PM	40800	186512	09609574483	0	9o BPM	(87)99167-3984	Não	t
344	JONAS HENRIQUE GOMES DA SILVA	J. SILVA	SD PM	40606	186492	11700427407	0	9o BPM	(87)99105-4732	Não	t
339	GICELIO CORREIA LIMA	GICÉLIO	SD PM	50881	204720	12133895426	38132133	9o BPM	(82)98843-3324	Nao	t
336	FÁBIO SANTOS VASCONCELOS	VASCONCELOS	SD PM	56090	205417	08000961504	38152606	9o BPM	(79)99604-9986	Não	t
325	ANDREON BEZERRA DA SILVA	ANDREON	SD PM	9440	198562	04834403459	1571513	9o BPM	(82)99956-4686	Nao	t
338	FILIPE CALIXTO MARQUES	FILIPE	SD PM	57207	205514	36392148892	391050229	9o BPM	(74)98806-5500	Não	t
326	ANDREY BERNARDES DE SIQUEIRA LOPES	BERNARDES	SD PM	53562	205006	08799322447	8228202	9o BPM	(83)99869-7439	Nao	t
340	GILMAR CASTILHO DE LIMA	CASTILHO	SD PM	42978	186791	02829560507	0	9o BPM	(79)99801-4485	Nao	t
334	ELISVAN FILGUEIRA	ELISVAN	SD PM	44512	188103	04094841482	33383090	9o BPM	(82)99931-6925	Não	t
333	ELAINE ERICA DE SÁ NETO NASCIMENTO	ELAINE	SD PM	41939	186690	10136255442	0	9o BPM	(87)99917-6649	Não	t
346	JOSÉ ANSELMO SANTOS SOUZA	ANSELMO	SD PM	56014	205406	05423438519	1565181557	9o BPM	(79)99928-7786	Não	t
350	JUCIVALDO FONSECA GOIS	J. GOIS	SD PM	37702	186231	98859188504	0	9o BPM	(79)99802-4282	Nao	t
364	PEDRO OLIVEIRA AVELINO SILVA	AVELINO	SD PM	50636	204698	06407787556	1446892433	9o BPM	(75)98148-6233	Nao	t
341	HERCULES LIMA DA SILVA	HERCULES	SD PM	55441	205343	13190351406	39745562	9o BPM	(82)98175-9799	Nao	t
348	JOSE MARLON ARAUJO DOS SANTOS JUNIOR	MARLON	SD PM	57100	205505	10353065498	10573245	9o BPM	(87)98168-7623	Não	t
359	MARCIO GOMES DO NASCIMENTO	GOMES	SD PM	35629	186062	03497341436	0	9o BPM	(87)99619-7749	Nao	t
352	JÚLIO CÉSAR FLORENTINO BENTO	FLORENTINO	SD PM	54941	205257	13568613425	4438237	9o BPM	(83)99991-9725	Não	t
316	PEDRO ANTONIO DA SILVA	PEDRO	CB PM	30830	178564	10677531419	16037018	9o BPM	(82)98117-6457	Nao	t
324	ALUÍSIO ROCHA DOS SANTOS	ROCHA	SD PM	7889	188076	56471815468	6951342	9o BPM	(82)98863-3584	Nao	t
319	TAYZE DOS ANJOS GOMES	TAYZE	CB PM	34312	178860	10032912447	16480018	9o BPM	(87)98822-1819	Não	t
345	JOSÉ ANDERSON DE MELO CARDOSO	CARDOSO	SD PM	55999	205404	10111691427	9102590	9o BPM	(87)98811-2434	Não	t
323	ALLEF GOIS DE OLIVEIRA NASCIMENTO	GOIS	SD PM	49492	204577	09456573583	36854271	9o BPM	(79)99879-0902	Não	t
331	DEIZIANE FERREIRA CARVALHO	DEIZIANE	SD PM	47899	204404	10124044476	1419884956	9o BPM	(87)98817-6394	Nao	t
318	SIMONE DOS SANTOS CORRÊA	SIMONE CORRÊA	CB PM	23213	177810	03349582532	16263018	9o BPM	(82)98751-5569	Nao	t
321	ALEF BARBOSA DE LIRA	ALEF LIRA	SD PM	47864	204401	10851074421	35975229	9o BPM	(82)99664-9825	Nao	t
310	JOSE THOMAS FONSECA FERREIRA SILVA	THOMAS	CB PM	27448	178242	10036352454	16.158-018	9o BPM	(82)99662-4424	Não	t
356	LIZANDRA EMANUELE ALVES DE SIQUEIRA	LIZANDRA	SD PM	50520	204683	06728161562	2056424541	9o BPM	(75)98888-6036	Nao	t
361	MÁRIO SILVA DOS SANTOS	SANTOS	SD PM	51241	204755	04491264554	1536812250	9o BPM	(75)98702-6205	Nao	t
322	ALEX JULIAN DA SILVA SIQUEIRA	JULIAN	SD PM	47988	204410	86492138554	2205896318	9o BPM	(74)98822-3210	Não	t
354	LARISSA BRITO SIQUEIRA	LARISSA	SD PM	48909	204512	13774823405	42433975	9o BPM	(82)98112-5757	Não	t
337	FELIPE DO NASCIMENTO CARVALHO	F. CARVALHO	SD PM	55808	205380	05430473502	33402108	9o BPM	(79)99883-2581	Nao	t
363	PAULO VITOR DOS SANTOS LEITE	P. LEITE	SD PM	49867	204612	06473689516	36032786	9o BPM	(79)99948-6153	Não	t
313	LEONELSON PABLO DA SILVA CRUZ	LEONELSON	CB PM	27065	178208	08989177430	16405018	9o BPM	(79)98819-5052	Nao	t
349	JOSUE SANTOS CONCEIÇÃO	JOSUE	SD PM	55727	205373	07309480562	2174688107	9o BPM	(75)99298-2287	Nao	t
311	KANANDA NATÁLIA FERREIRA DE OLIVEIRA BEZERRA	KANANDA	CB PM	33316	178782	06492060539	16468018	9o BPM	(75)98879-0533	Não	t
328	AUFRAM MENESES SOUZA	AUFRAM	SD PM	42480	186742	04008148540	0	9o BPM	(79)99987-1113	Nao	t
358	MANOEL MESSIAS NOGUEIRA BARBOSA	MANOEL	SD PM	41122	186542	11283774461	0	9o BPM	(87)99811-3134	Não	t
380	CICERO MARCOS GUERRA DA SILVA 	MARCOS GUERRA	1º SGT PM	96881	\N	49433164415	\N	COPES	\N	Não	t
368	ROSANA DA SILVA LISBOA	ROSANA	SD PM	55549	205357	09181241402	8144165	9o BPM	(87)99628-0922	Nao	t
381	ZAQUEU DE LIMA OLIVEIRA FILHO	LIMA FILHO	1º TEN PM	16870	\N	01408030500	\N	COPES	\N	Nao	t
376	WASHINGTON LUIZ SANTOS DE SOUZA	SOUZA	SD PM	46426	204091	38731422870	2236055498	9o BPM	(75)99860-9570	Nao	t
386	JOSE ALBERTO MIRON	ALBERTO	SD PM	177888	177888	08181549422	\N	COPES	\N	Nao	t
252	OTACÍLIO JOSÉ DE LIMA JÚNIOR	OTACÍLIO	2º SGT PM	322750	113304	50691775400	09.397-006	9o BPM	(82)99607-2451	Nao	t
196	ADEMAR SIQUEIRA DA SILVA NETO	SILVA NETO	TC PM	1200712	94700	04158269423	13011002	9o BPM	(82)99944-0010	Não	t
198	MARCUS VINICIUS SILVA CAVALCANTE	CAVALCANTE	CAP PM	1207490	105876	05829243407	7816005	9o BPM	(82)99671-9192	Nao	t
382	MARNO GUERRA DA SILVA	MARNO GUERRA	1º SGT PM	118559	\N	89411064434	\N	DP	\N	Nao	t
384	JOSÉ MURILO TENÓRIO MAGALHÃES	MAGALHÃES	1º TEN PM	14532	151175	07573627459	14893014	9o BPM	(82)98108-6780	Não	t
371	STÊVÃO JOSÉ DE SÁ LOPES FREIRE	J. LOPES	SD PM	34835	185993	05414524440	0	9o BPM	(87)98845-6969	Não	t
388	FRANCISCO FIDELIS DE SOUZA	FIDELES	2º SGT PM	309435	113147	02955374423	08.926-006	9o BPM	(82)98129-4660	Não	t
372	SYDNEY BONFIM JÚNIOR	SYDNEY	SD PM	40100	186445	06462277424	0	9o BPM	(82)98853-6178	Não	t
237	FRANCYDREYKY CAVALCANTI DE FREITAS	FREITAS	2º SGT PM	646555	140249	06511014410	13511010	9o BPM	(82)99811-1327	Nao	t
373	THALES MYKAEL GOMES DE ANDRADE	THALES	SD PM	47473	204336	06546508532	36168394	9o BPM	(79)99678-9764	Não	t
385	DANIEL GONZAGA DA SILVA	DANIEL GONZAGA	3º SGT PM	11959	149851	05797534410	31136079	9o BPM	(82)99949-1014	Não	t
389	JOSÉ ROBERTO DA SILVA	ROBERTO	2º SGT PM	327069	113363	00750828455	9781006	9o BPM	(82)99920-7328	Não	t
383	PEDRO BARBOSA DE OLIVEIRA JUNIOR	DE OLIVEIRA	TC PM	1207202	\N	05359116455	\N	CPRA	\N	Não	t
375	WANDERSON BERG NASCIMENTO SILVA	BERG	SD PM	46515	204131	09409560470	8161669	9o BPM	(87)93300-1288	Não	t
378	WINICIOS KENNEDY DA SILVA NASCIMENTO	KENNEDY SILVA	SD PM	57622	205913	12147879401	9771058	9o BPM	(87)98182-3630	Não	t
370	SOCORRO STEFANY BALBINO DO NASCIMENTO	STEFANY	SD PM	40010	186435	07517662406	0	9o BPM	(87)98872-6748	Nao	t
374	WALMARIO NASCIMENTO MENEZES	WALMARIO	SD PM	46523	204132	05422322517	1531107753	9o BPM	(75)99918-0396	Nao	t
377	WILSON VICTOR ALVES MARTINS	WILSON	SD PM	48836	204504	11969310464	9263442	9o BPM	(87)98875-9314	Nao	t
367	ROBERTO GABRIEL XAVIER RIBEIRO ALENCAR	ALENCAR	SD PM	53279	204983	12441175440	30353556	9o BPM	(82)99953-4861	Nao	t
387	EVANDRO VIEIRA COSTA	EVANDRO	3º SGT PM	149679	149679	05423251443	\N	9º BPM	\N	Nao	t
390	CAIO EMANUEL ALVES MAIA	MAIA	3º SGT PM	21040	169995	10174482485	15377016	9o BPM	(87)98847-3653	Não	t
272	JEFFERSON MANOEL BEZERRA DOS SANTOS	J.SANTOS	3º SGT PM	16608	165703	04591473589	15092016	9o BPM	(75)98360-4896	Nao	t
379	MARCOS LUIZ BATISTA BISPO 	BISPO	1º SGT PM	1205447	\N	04020609462	\N	COPES	(82) 99978-0468	Nao	t
391	JOÃO CORREIA DA SILVA JÚNIOR	CORREIA	3º SGT PM	11843	149836	06480682424	2000001258430	9o BPM	(82)98108-6362	Não	t
369	SERGIO CORREIA LIMA	SERGIO	SD PM	54267	205063	10604776454	34449418	9o BPM	(82)98741-3195	Nao	t
392	ROMUALDO BARRETO DE LIMA	ROMUALDO	3º SGT PM	10561	149703	05757093404	6696773	9o BPM	(87)99637-2173	Não	t
309	JOSEFA EDIVANIA SOARES DA SILVA	EDIVANIA SOARES	CB PM	24287	177920	60078927358	15828018	9o BPM	(88)99763-4037	Não	t
393	BRUNNO TENÓRIO SILVA	BRUNNO SILVA	SD PM	38644	186317	07401423480	0	9o BPM	(87)99808-7393	Não	t
343	JEFTÉ ROBERTO CAMPOS DA SILVA	JEFTE	SD PM	56936	205491	12607917425	10315335	9o BPM	(81)98692-8725	Não	t
\.


--
-- Data for Name: escala_efetivo_servico; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.escala_efetivo_servico (id_vinculo, id_escala, id_militar, id_execucao, status, data_vinculo, editado_em) FROM stdin;
196	\N	287	193	Apenas executado	2026-04-28 16:00:26.237956	2026-04-28 16:00:26.237956
197	\N	287	194	Apenas executado	2026-04-28 16:00:26.243338	2026-04-28 16:00:26.243338
208	\N	259	205	Apenas executado	2026-04-28 16:00:26.30508	2026-04-28 16:00:26.30508
209	\N	259	206	Apenas executado	2026-04-28 16:00:26.310339	2026-04-28 16:00:26.310339
218	\N	242	215	Apenas executado	2026-04-28 16:00:26.362747	2026-04-28 16:00:26.362747
221	\N	260	218	Apenas executado	2026-04-28 16:00:26.378696	2026-04-28 16:00:26.378696
222	\N	200	219	Apenas executado	2026-04-28 16:00:26.384077	2026-04-28 16:00:26.384077
223	\N	200	220	Apenas executado	2026-04-28 16:00:26.389378	2026-04-28 16:00:26.389378
224	\N	200	221	Apenas executado	2026-04-28 16:00:26.394758	2026-04-28 16:00:26.394758
225	\N	200	222	Apenas executado	2026-04-28 16:00:26.400011	2026-04-28 16:00:26.400011
234	\N	241	231	Apenas executado	2026-04-28 16:00:26.44899	2026-04-28 16:00:26.44899
240	\N	196	237	Apenas executado	2026-04-28 16:00:26.482604	2026-04-28 16:00:26.482604
245	\N	210	242	Apenas executado	2026-04-28 16:00:26.510834	2026-04-28 16:00:26.510834
246	\N	210	243	Apenas executado	2026-04-28 16:00:26.516085	2026-04-28 16:00:26.516085
1434	\N	199	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
250	\N	315	247	Apenas executado	2026-04-28 16:00:26.536947	2026-04-28 16:00:26.536947
251	\N	272	248	Apenas executado	2026-04-28 16:00:26.543366	2026-04-28 16:00:26.543366
253	\N	249	250	Apenas executado	2026-04-28 16:00:26.555721	2026-04-28 16:00:26.555721
254	\N	249	251	Apenas executado	2026-04-28 16:00:26.560943	2026-04-28 16:00:26.560943
1506	\N	203	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
1507	\N	317	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
266	\N	337	263	Apenas executado	2026-04-28 16:00:26.624181	2026-04-28 16:00:26.624181
267	\N	360	264	Apenas executado	2026-04-28 16:00:26.629345	2026-04-28 16:00:26.629345
268	\N	360	265	Apenas executado	2026-04-28 16:00:26.634656	2026-04-28 16:00:26.634656
1508	\N	305	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
1509	\N	225	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
271	\N	253	268	Apenas executado	2026-04-28 16:00:26.652332	2026-04-28 16:00:26.652332
272	\N	253	269	Apenas executado	2026-04-28 16:00:26.657564	2026-04-28 16:00:26.657564
275	\N	198	272	Apenas executado	2026-04-28 16:00:26.674193	2026-04-28 16:00:26.674193
276	\N	251	273	Apenas executado	2026-04-28 16:00:26.679364	2026-04-28 16:00:26.679364
279	\N	363	276	Apenas executado	2026-04-28 16:00:26.696423	2026-04-28 16:00:26.696423
1510	\N	364	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
1511	\N	377	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
1512	\N	237	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
1513	\N	355	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
288	\N	258	285	Apenas executado	2026-04-28 16:00:26.745207	2026-04-28 16:00:26.745207
289	\N	258	286	Apenas executado	2026-04-28 16:00:26.755673	2026-04-28 16:00:26.755673
290	\N	258	287	Apenas executado	2026-04-28 16:00:26.760907	2026-04-28 16:00:26.760907
292	\N	202	289	Apenas executado	2026-04-28 16:00:26.771414	2026-04-28 16:00:26.771414
293	\N	202	290	Apenas executado	2026-04-28 16:00:26.77705	2026-04-28 16:00:26.77705
294	\N	330	291	Apenas executado	2026-04-28 16:00:26.783383	2026-04-28 16:00:26.783383
1514	\N	327	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
1515	\N	199	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
227	1273	213	224	Planejado e executado	2026-04-28 16:00:26.410655	2026-05-07 14:49:44.158961
205	1280	362	202	Planejado e executado	2026-04-28 16:00:26.28908	2026-05-07 14:49:44.158961
189	1138	230	186	Planejado e executado	2026-04-28 16:00:26.197274	2026-05-07 14:20:44.659315
247	1140	297	244	Planejado e executado	2026-04-28 16:00:26.521368	2026-05-07 14:20:44.659315
236	1148	328	233	Planejado e executado	2026-04-28 16:00:26.459621	2026-05-07 14:20:44.659315
203	1149	362	200	Planejado e executado	2026-04-28 16:00:26.278311	2026-05-07 14:20:44.659315
286	1106	228	283	Planejado e executado	2026-04-28 16:00:26.73432	2026-05-07 14:18:07.714963
226	1183	213	223	Planejado e executado	2026-04-28 16:00:26.405734	2026-05-07 14:34:59.259778
235	1185	241	232	Planejado e executado	2026-04-28 16:00:26.454303	2026-05-07 14:34:59.259778
259	1187	325	256	Planejado e executado	2026-04-28 16:00:26.587362	2026-05-07 14:34:59.259778
256	1188	305	253	Planejado e executado	2026-04-28 16:00:26.571317	2026-05-07 14:34:59.259778
241	1192	256	238	Planejado e executado	2026-04-28 16:00:26.488011	2026-05-07 14:34:59.259778
204	1193	362	201	Planejado e executado	2026-04-28 16:00:26.283751	2026-05-07 14:34:59.259778
273	1281	253	270	Planejado e executado	2026-04-28 16:00:26.662775	2026-05-07 14:49:44.158961
262	1194	277	259	Planejado e executado	2026-04-28 16:00:26.603076	2026-05-07 14:34:59.259778
202	1213	282	199	Planejado e executado	2026-04-28 16:00:26.273017	2026-05-07 14:37:27.375985
220	1238	359	217	Planejado e executado	2026-04-28 16:00:26.373334	2026-05-07 14:43:46.415338
193	1256	271	190	Planejado e executado	2026-04-28 16:00:26.22041	2026-05-07 14:47:37.143538
238	1257	328	235	Planejado e executado	2026-04-28 16:00:26.470346	2026-05-07 14:47:37.143538
237	1239	328	234	Planejado e executado	2026-04-28 16:00:26.464996	2026-05-07 14:43:46.415338
261	1240	248	258	Planejado e executado	2026-04-28 16:00:26.5979	2026-05-07 14:43:46.415338
257	1241	305	254	Planejado e executado	2026-04-28 16:00:26.576677	2026-05-07 14:43:46.415338
277	1214	364	274	Planejado e executado	2026-04-28 16:00:26.685357	2026-05-07 14:37:27.375985
249	1215	315	246	Planejado e executado	2026-04-28 16:00:26.531702	2026-05-07 14:37:27.375985
217	1242	318	214	Planejado e executado	2026-04-28 16:00:26.357356	2026-05-07 14:43:46.415338
252	1245	272	249	Planejado e executado	2026-04-28 16:00:26.548563	2026-05-07 14:43:46.415338
230	1258	220	227	Planejado e executado	2026-04-28 16:00:26.42678	2026-05-07 14:47:37.143538
287	1260	228	284	Planejado e executado	2026-04-28 16:00:26.739383	2026-05-07 14:47:37.143538
190	1261	230	187	Planejado e executado	2026-04-28 16:00:26.20333	2026-05-07 14:47:37.143538
213	1262	340	210	Planejado e executado	2026-04-28 16:00:26.333104	2026-05-07 14:47:37.143538
239	1349	328	236	Planejado e executado	2026-04-28 16:00:26.477082	2026-05-07 15:01:04.773072
200	1319	347	197	Planejado e executado	2026-04-28 16:00:26.26233	2026-05-07 14:58:02.796595
281	1291	237	278	Planejado e executado	2026-04-28 16:00:26.708629	2026-05-07 14:55:11.580706
258	1293	305	255	Planejado e executado	2026-04-28 16:00:26.582261	2026-05-07 14:55:11.580706
243	1295	361	240	Planejado e executado	2026-04-28 16:00:26.49901	2026-05-07 14:55:11.580706
199	1296	347	196	Planejado e executado	2026-04-28 16:00:26.257133	2026-05-07 14:55:11.580706
191	1297	230	188	Planejado e executado	2026-04-28 16:00:26.208967	2026-05-07 14:55:11.580706
274	1299	253	271	Planejado e executado	2026-04-28 16:00:26.668686	2026-05-07 14:55:11.580706
216	1323	320	213	Planejado e executado	2026-04-28 16:00:26.352058	2026-05-07 14:58:02.796595
228	1324	213	225	Planejado e executado	2026-04-28 16:00:26.415956	2026-05-07 14:58:02.796595
211	1354	226	208	Planejado e executado	2026-04-28 16:00:26.322087	2026-05-07 15:01:04.773072
263	1356	277	260	Planejado e executado	2026-04-28 16:00:26.608303	2026-05-07 15:01:04.773072
206	1358	362	203	Planejado e executado	2026-04-28 16:00:26.294356	2026-05-07 15:01:04.773072
195	1325	329	192	Planejado e executado	2026-04-28 16:00:26.231958	2026-05-07 14:58:02.796595
210	1326	226	207	Planejado e executado	2026-04-28 16:00:26.31615	2026-05-07 14:58:02.796595
233	1327	235	230	Planejado e executado	2026-04-28 16:00:26.443651	2026-05-07 14:58:02.796595
265	1329	374	262	Planejado e executado	2026-04-28 16:00:26.618914	2026-05-07 14:58:02.796595
291	1359	286	288	Planejado e executado	2026-04-28 16:00:26.766136	2026-05-07 15:01:04.773072
229	1369	213	226	Planejado e executado	2026-04-28 16:00:26.421407	2026-05-07 15:03:27.190668
255	1371	276	252	Planejado e executado	2026-04-28 16:00:26.566172	2026-05-07 15:03:27.190668
278	1373	364	275	Planejado e executado	2026-04-28 16:00:26.69076	2026-05-07 15:03:27.190668
242	1374	256	239	Planejado e executado	2026-04-28 16:00:26.493716	2026-05-07 15:03:27.190668
214	1376	340	211	Planejado e executado	2026-04-28 16:00:26.338661	2026-05-07 15:03:27.190668
285	1377	355	282	Planejado e executado	2026-04-28 16:00:26.729191	2026-05-07 15:03:27.190668
295	\N	330	292	Apenas executado	2026-04-28 16:00:26.790897	2026-04-28 16:00:26.790897
296	\N	330	293	Apenas executado	2026-04-28 16:00:26.796692	2026-04-28 16:00:26.796692
1435	\N	326	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
300	\N	301	297	Apenas executado	2026-04-28 16:00:26.817316	2026-04-28 16:00:26.817316
301	\N	301	298	Apenas executado	2026-04-28 16:00:26.82401	2026-04-28 16:00:26.82401
302	\N	301	299	Apenas executado	2026-04-28 16:00:26.829074	2026-04-28 16:00:26.829074
1436	\N	318	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
1437	\N	277	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
305	\N	204	302	Apenas executado	2026-04-28 16:00:26.845832	2026-04-28 16:00:26.845832
1438	\N	339	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
1439	\N	260	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
1440	\N	243	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
319	\N	377	316	Apenas executado	2026-04-28 16:00:26.920301	2026-04-28 16:00:26.920301
1441	\N	360	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
1442	\N	321	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
1443	\N	215	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
329	\N	342	326	Apenas executado	2026-04-28 16:00:26.97331	2026-04-28 16:00:26.97331
330	\N	342	327	Apenas executado	2026-04-28 16:00:26.978263	2026-04-28 16:00:26.978263
331	\N	342	328	Apenas executado	2026-04-28 16:00:26.983348	2026-04-28 16:00:26.983348
332	\N	341	329	Apenas executado	2026-04-28 16:00:26.990712	2026-04-28 16:00:26.990712
1444	\N	367	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
337	\N	206	334	Apenas executado	2026-04-28 16:00:27.017821	2026-04-28 16:00:27.017821
338	\N	206	335	Apenas executado	2026-04-28 16:00:27.022941	2026-04-28 16:00:27.022941
339	\N	206	336	Apenas executado	2026-04-28 16:00:27.027904	2026-04-28 16:00:27.027904
340	\N	206	337	Apenas executado	2026-04-28 16:00:27.032922	2026-04-28 16:00:27.032922
341	\N	252	338	Apenas executado	2026-04-28 16:00:27.037935	2026-04-28 16:00:27.037935
342	\N	252	339	Apenas executado	2026-04-28 16:00:27.042898	2026-04-28 16:00:27.042898
343	\N	252	340	Apenas executado	2026-04-28 16:00:27.048246	2026-04-28 16:00:27.048246
344	\N	221	341	Apenas executado	2026-04-28 16:00:27.053263	2026-04-28 16:00:27.053263
345	\N	221	342	Apenas executado	2026-04-28 16:00:27.058276	2026-04-28 16:00:27.058276
346	\N	221	343	Apenas executado	2026-04-28 16:00:27.062876	2026-04-28 16:00:27.062876
348	\N	207	345	Apenas executado	2026-04-28 16:00:27.072557	2026-04-28 16:00:27.072557
1445	\N	236	\N	Planejado	2026-05-10 13:02:37.485009	2026-05-10 13:02:37.485009
359	\N	216	356	Apenas executado	2026-04-28 16:00:27.128907	2026-04-28 16:00:27.128907
1446	1489	199	658	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:57.21239
368	\N	381	365	Apenas executado	2026-04-28 16:00:46.452623	2026-04-28 16:00:46.452623
369	\N	381	366	Apenas executado	2026-04-28 16:00:46.457843	2026-04-28 16:00:46.457843
370	\N	379	367	Apenas executado	2026-04-28 16:00:46.467188	2026-04-28 16:00:46.467188
371	\N	380	368	Apenas executado	2026-04-28 16:00:46.494953	2026-04-28 16:00:46.494953
372	\N	380	369	Apenas executado	2026-04-28 16:00:46.500271	2026-04-28 16:00:46.500271
376	\N	382	373	Apenas executado	2026-04-28 16:01:07.192738	2026-04-28 16:01:07.192738
377	\N	382	374	Apenas executado	2026-04-28 16:01:07.198162	2026-04-28 16:01:07.198162
379	\N	262	376	Apenas executado	2026-04-28 16:18:13.299273	2026-04-28 16:18:13.299273
380	\N	262	377	Apenas executado	2026-04-28 16:18:13.311284	2026-04-28 16:18:13.311284
381	\N	281	378	Apenas executado	2026-04-28 16:18:13.37985	2026-04-28 16:18:13.37985
382	\N	281	379	Apenas executado	2026-04-28 16:18:13.385147	2026-04-28 16:18:13.385147
383	\N	281	380	Apenas executado	2026-04-28 16:18:13.39057	2026-04-28 16:18:13.39057
384	\N	383	381	Apenas executado	2026-04-28 16:25:39.321913	2026-04-28 16:25:39.321913
385	\N	383	382	Apenas executado	2026-04-28 16:25:39.331826	2026-04-28 16:25:39.331826
389	\N	220	\N	Planejado e não executado	2026-04-28 17:05:28.952972	2026-04-28 17:05:28.952972
390	\N	318	\N	Planejado e não executado	2026-04-28 17:05:28.952972	2026-04-28 17:05:28.952972
391	\N	282	\N	Planejado e não executado	2026-04-28 17:05:28.952972	2026-04-28 17:05:28.952972
395	\N	203	\N	Planejado e não Executado	2026-05-04 14:35:00.963748	2026-05-04 14:35:00.963748
396	\N	215	\N	Planejado e não Executado	2026-05-04 14:35:00.963748	2026-05-04 14:35:00.963748
397	\N	305	\N	Planejado e não Executado	2026-05-04 14:35:00.963748	2026-05-04 14:35:00.963748
392	1414	220	401	Planejado e executado	2026-04-28 17:05:58.996465	2026-05-07 15:08:44.509707
393	1415	318	394	Planejado e executado	2026-04-28 17:05:58.996465	2026-05-07 15:08:44.509707
394	1416	282	388	Planejado e executado	2026-04-28 17:05:58.996465	2026-05-07 15:08:44.509707
316	1139	317	313	Planejado e executado	2026-04-28 16:00:26.905072	2026-05-07 14:20:44.659315
306	1144	204	303	Planejado e executado	2026-04-28 16:00:26.850697	2026-05-07 14:20:44.659315
373	1066	382	370	Planejado e executado	2026-04-28 16:01:07.172327	2026-05-07 14:14:02.355288
308	1071	283	305	Planejado e executado	2026-04-28 16:00:26.861871	2026-05-07 14:14:02.355288
361	1147	247	358	Planejado e executado	2026-04-28 16:00:27.139162	2026-05-07 14:20:44.659315
347	1105	203	344	Planejado e executado	2026-04-28 16:00:27.067606	2026-05-07 14:18:07.714963
320	1217	377	317	Planejado e executado	2026-04-28 16:00:26.925262	2026-05-07 14:37:27.375985
321	1110	339	318	Planejado e executado	2026-04-28 16:00:26.930886	2026-05-07 14:18:07.714963
360	1184	227	357	Planejado e executado	2026-04-28 16:00:27.134245	2026-05-07 14:34:59.259778
354	1186	214	351	Planejado e executado	2026-04-28 16:00:27.103904	2026-05-07 14:34:59.259778
317	1221	317	314	Planejado e executado	2026-04-28 16:00:26.910245	2026-05-07 14:37:27.375985
374	1189	382	371	Planejado e executado	2026-04-28 16:01:07.181903	2026-05-07 14:34:59.259778
375	1237	382	372	Planejado e executado	2026-04-28 16:01:07.187317	2026-05-07 14:43:46.415338
352	1243	238	349	Planejado e executado	2026-04-28 16:00:27.09387	2026-05-07 14:43:46.415338
349	1222	207	346	Planejado e executado	2026-04-28 16:00:27.07889	2026-05-07 14:37:27.375985
311	1244	369	308	Planejado e executado	2026-04-28 16:00:26.877295	2026-05-07 14:43:46.415338
386	1387	248	420	Planejado e executado	2026-04-28 16:48:39.07932	2026-05-07 15:05:41.393232
298	1255	205	295	Planejado e executado	2026-04-28 16:00:26.807453	2026-05-07 14:47:37.143538
314	1259	321	311	Planejado e executado	2026-04-28 16:00:26.895358	2026-05-07 14:47:37.143538
334	1263	376	331	Planejado e executado	2026-04-28 16:00:27.001255	2026-05-07 14:47:37.143538
318	1292	317	315	Planejado e executado	2026-04-28 16:00:26.915261	2026-05-07 14:55:11.580706
327	1274	367	324	Planejado e executado	2026-04-28 16:00:26.963139	2026-05-07 14:49:44.158961
307	1294	204	304	Planejado e executado	2026-04-28 16:00:26.855968	2026-05-07 14:55:11.580706
362	1298	247	359	Planejado e executado	2026-04-28 16:00:27.143987	2026-05-07 14:55:11.580706
336	1370	376	333	Planejado e executado	2026-04-28 16:00:27.012695	2026-05-07 15:03:27.190668
363	1348	247	360	Planejado e executado	2026-04-28 16:00:27.148926	2026-05-07 15:01:04.773072
353	1351	238	350	Planejado e executado	2026-04-28 16:00:27.098895	2026-05-07 15:01:04.773072
324	1275	296	321	Planejado e executado	2026-04-28 16:00:26.947838	2026-05-07 14:49:44.158961
358	1276	216	355	Planejado e executado	2026-04-28 16:00:27.123904	2026-05-07 14:49:44.158961
322	1352	339	319	Planejado e executado	2026-04-28 16:00:26.935882	2026-05-07 15:01:04.773072
299	1318	205	296	Planejado e executado	2026-04-28 16:00:26.812479	2026-05-07 14:58:02.796595
357	1320	239	354	Planejado e executado	2026-04-28 16:00:27.118913	2026-05-07 14:58:02.796595
378	1321	382	375	Planejado e executado	2026-04-28 16:01:07.203634	2026-05-07 14:58:02.796595
312	1322	369	309	Planejado e executado	2026-04-28 16:00:26.883267	2026-05-07 14:58:02.796595
335	1328	376	332	Planejado e executado	2026-04-28 16:00:27.007652	2026-05-07 14:58:02.796595
355	1372	214	352	Planejado e executado	2026-04-28 16:00:27.108915	2026-05-07 15:03:27.190668
313	1375	369	310	Planejado e executado	2026-04-28 16:00:26.888383	2026-05-07 15:03:27.190668
387	1388	261	426	Planejado e executado	2026-04-28 16:48:39.07932	2026-05-07 15:05:41.393232
388	1389	329	384	Planejado e executado	2026-04-28 16:48:39.07932	2026-05-07 15:05:41.393232
328	1353	367	325	Planejado e executado	2026-04-28 16:00:26.968253	2026-05-07 15:01:04.773072
366	1355	350	363	Planejado e executado	2026-04-28 16:00:27.164615	2026-05-07 15:01:04.773072
398	\N	203	\N	Planejado e não Executado	2026-05-04 14:35:58.732953	2026-05-04 14:35:58.732953
399	\N	215	\N	Planejado e não Executado	2026-05-04 14:35:58.732953	2026-05-04 14:35:58.732953
400	\N	305	\N	Planejado e não Executado	2026-05-04 14:35:58.732953	2026-05-04 14:35:58.732953
401	\N	214	\N	Planejado e não Executado	2026-05-04 14:35:58.732953	2026-05-04 14:35:58.732953
402	\N	350	\N	Planejado e não Executado	2026-05-04 14:35:58.732953	2026-05-04 14:35:58.732953
403	\N	328	\N	Planejado e não Executado	2026-05-04 14:35:58.732953	2026-05-04 14:35:58.732953
404	\N	203	\N	Planejado e não Executado	2026-05-04 14:36:47.633971	2026-05-04 14:36:47.633971
405	\N	215	\N	Planejado e não Executado	2026-05-04 14:36:47.633971	2026-05-04 14:36:47.633971
406	\N	305	\N	Planejado e não Executado	2026-05-04 14:36:47.633971	2026-05-04 14:36:47.633971
407	\N	214	\N	Planejado e não Executado	2026-05-04 14:36:47.633971	2026-05-04 14:36:47.633971
408	\N	350	\N	Planejado e não Executado	2026-05-04 14:36:47.633971	2026-05-04 14:36:47.633971
409	\N	328	\N	Planejado e não Executado	2026-05-04 14:36:47.633971	2026-05-04 14:36:47.633971
410	\N	238	\N	Planejado e não Executado	2026-05-04 14:36:47.633971	2026-05-04 14:36:47.633971
411	\N	297	\N	Planejado e não Executado	2026-05-04 14:36:47.633971	2026-05-04 14:36:47.633971
412	\N	313	\N	Planejado e não Executado	2026-05-04 14:36:47.633971	2026-05-04 14:36:47.633971
413	\N	203	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
414	\N	215	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
415	\N	305	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
416	\N	238	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
417	\N	297	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
418	\N	313	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
419	\N	214	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
420	\N	350	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
421	\N	328	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
422	\N	243	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
423	\N	315	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
424	\N	325	\N	Planejado e não Executado	2026-05-04 14:37:46.906067	2026-05-04 14:37:46.906067
425	\N	203	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
426	\N	215	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
427	\N	305	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
428	\N	243	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
429	\N	315	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
430	\N	325	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
431	\N	238	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
432	\N	297	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
433	\N	313	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
434	\N	214	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
435	\N	350	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
436	\N	328	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
437	\N	255	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
438	\N	259	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
439	\N	362	\N	Planejado e não Executado	2026-05-04 14:38:34.633498	2026-05-04 14:38:34.633498
440	\N	203	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
441	\N	215	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
442	\N	305	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
443	\N	243	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
444	\N	315	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
445	\N	325	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
446	\N	238	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
447	\N	297	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
448	\N	313	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
449	\N	214	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
450	\N	350	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
451	\N	328	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
452	\N	255	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
1455	1498	243	\N	Planejado	2026-05-10 13:03:22.393574	2026-05-10 13:03:22.393574
1523	\N	305	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1524	\N	225	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1525	\N	364	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1526	\N	377	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1527	\N	237	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1528	\N	355	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1529	\N	327	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1530	\N	199	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1531	\N	282	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1532	\N	356	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1533	\N	255	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1534	\N	259	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1535	\N	318	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1536	\N	359	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1537	\N	361	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1538	\N	320	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1626	\N	213	\N	Planejado	2026-05-12 15:15:10.367305	2026-05-12 15:15:10.367305
1627	\N	277	\N	Planejado	2026-05-12 15:15:10.367305	2026-05-12 15:15:10.367305
1628	\N	227	\N	Planejado	2026-05-12 15:15:10.367305	2026-05-12 15:15:10.367305
1629	\N	382	\N	Planejado	2026-05-12 15:15:10.367305	2026-05-12 15:15:10.367305
1630	\N	350	\N	Planejado	2026-05-12 15:15:10.367305	2026-05-12 15:15:10.367305
1631	\N	320	\N	Planejado	2026-05-12 15:15:10.367305	2026-05-12 15:15:10.367305
1632	\N	260	\N	Planejado	2026-05-12 15:15:10.367305	2026-05-12 15:15:10.367305
1448	1491	318	643	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:56.604169
1451	1494	260	644	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:56.637191
1452	1495	215	645	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:56.720786
1454	1497	236	647	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:56.76146
1449	1492	277	648	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:56.823018
1456	1499	360	649	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:56.847486
1457	1500	321	655	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:57.068392
1450	1493	339	656	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:57.097642
1453	1496	367	657	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:57.120807
455	\N	381	\N	Planejado e não Executado	2026-05-04 14:39:32.123221	2026-05-04 14:39:32.123221
456	\N	265	\N	Planejado e não Executado	2026-05-04 14:39:32.123221	2026-05-04 14:39:32.123221
457	\N	317	\N	Planejado e não Executado	2026-05-04 14:39:32.123221	2026-05-04 14:39:32.123221
458	\N	381	\N	Planejado e não Executado	2026-05-04 14:40:20.713569	2026-05-04 14:40:20.713569
459	\N	265	\N	Planejado e não Executado	2026-05-04 14:40:20.713569	2026-05-04 14:40:20.713569
460	\N	317	\N	Planejado e não Executado	2026-05-04 14:40:20.713569	2026-05-04 14:40:20.713569
461	\N	214	\N	Planejado e não Executado	2026-05-04 14:40:20.713569	2026-05-04 14:40:20.713569
462	\N	277	\N	Planejado e não Executado	2026-05-04 14:40:20.713569	2026-05-04 14:40:20.713569
463	\N	326	\N	Planejado e não Executado	2026-05-04 14:40:20.713569	2026-05-04 14:40:20.713569
464	\N	214	\N	Planejado e não Executado	2026-05-04 14:41:26.259936	2026-05-04 14:41:26.259936
465	\N	277	\N	Planejado e não Executado	2026-05-04 14:41:26.259936	2026-05-04 14:41:26.259936
466	\N	326	\N	Planejado e não Executado	2026-05-04 14:41:26.259936	2026-05-04 14:41:26.259936
467	\N	381	\N	Planejado e não Executado	2026-05-04 14:41:26.259936	2026-05-04 14:41:26.259936
468	\N	265	\N	Planejado e não Executado	2026-05-04 14:41:26.259936	2026-05-04 14:41:26.259936
469	\N	317	\N	Planejado e não Executado	2026-05-04 14:41:26.259936	2026-05-04 14:41:26.259936
470	\N	382	\N	Planejado e não Executado	2026-05-04 14:41:26.259936	2026-05-04 14:41:26.259936
471	\N	320	\N	Planejado e não Executado	2026-05-04 14:41:26.259936	2026-05-04 14:41:26.259936
472	\N	325	\N	Planejado e não Executado	2026-05-04 14:41:26.259936	2026-05-04 14:41:26.259936
485	\N	204	\N	Planejado e não Executado	2026-05-04 14:44:55.613363	2026-05-04 14:44:55.613363
486	\N	376	\N	Planejado e não Executado	2026-05-04 14:44:55.613363	2026-05-04 14:44:55.613363
487	\N	329	\N	Planejado e não Executado	2026-05-04 14:44:55.613363	2026-05-04 14:44:55.613363
488	\N	204	\N	Planejado e não Executado	2026-05-04 14:45:32.945569	2026-05-04 14:45:32.945569
489	\N	376	\N	Planejado e não Executado	2026-05-04 14:45:32.945569	2026-05-04 14:45:32.945569
490	\N	329	\N	Planejado e não Executado	2026-05-04 14:45:32.945569	2026-05-04 14:45:32.945569
491	\N	216	\N	Planejado e não Executado	2026-05-04 14:45:32.945569	2026-05-04 14:45:32.945569
492	\N	364	\N	Planejado e não Executado	2026-05-04 14:45:32.945569	2026-05-04 14:45:32.945569
493	\N	328	\N	Planejado e não Executado	2026-05-04 14:45:32.945569	2026-05-04 14:45:32.945569
494	\N	216	\N	Planejado e não Executado	2026-05-04 14:47:24.624672	2026-05-04 14:47:24.624672
495	\N	364	\N	Planejado e não Executado	2026-05-04 14:47:24.624672	2026-05-04 14:47:24.624672
496	\N	328	\N	Planejado e não Executado	2026-05-04 14:47:24.624672	2026-05-04 14:47:24.624672
497	\N	204	\N	Planejado e não Executado	2026-05-04 14:47:24.624672	2026-05-04 14:47:24.624672
498	\N	376	\N	Planejado e não Executado	2026-05-04 14:47:24.624672	2026-05-04 14:47:24.624672
499	\N	329	\N	Planejado e não Executado	2026-05-04 14:47:24.624672	2026-05-04 14:47:24.624672
500	\N	205	\N	Planejado e não Executado	2026-05-04 14:47:24.624672	2026-05-04 14:47:24.624672
501	\N	353	\N	Planejado e não Executado	2026-05-04 14:47:24.624672	2026-05-04 14:47:24.624672
502	\N	239	\N	Planejado e não Executado	2026-05-04 14:47:24.624672	2026-05-04 14:47:24.624672
503	\N	205	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
504	\N	353	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
505	\N	239	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
506	\N	216	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
507	\N	364	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
508	\N	328	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
509	\N	204	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
510	\N	376	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
511	\N	329	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
512	\N	235	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
513	\N	247	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
473	\N	214	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
474	\N	277	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
475	\N	326	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
476	\N	382	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
477	\N	320	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
478	\N	325	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
479	\N	381	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
480	\N	265	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
481	\N	317	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
482	\N	242	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
483	\N	369	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
484	\N	349	\N	Planejado e não Executado	2026-05-04 14:42:04.724525	2026-05-04 14:42:04.724525
453	\N	259	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
454	\N	362	\N	Planejado e não Executado	2026-05-04 14:38:41.489814	2026-05-04 14:38:41.489814
1458	\N	250	599	Apenas executado	2026-05-11 13:38:20.410422	2026-05-11 13:38:20.410422
1459	\N	342	604	Apenas executado	2026-05-11 13:38:20.616631	2026-05-11 13:38:20.616631
1460	\N	247	608	Apenas executado	2026-05-11 13:38:20.765806	2026-05-11 13:38:20.765806
1521	\N	203	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1522	\N	317	\N	Planejado	2026-05-11 20:36:10.536815	2026-05-11 20:36:10.536815
1555	1595	361	\N	Planejado	2026-05-11 20:36:26.2659	2026-05-11 20:36:26.2659
1617	\N	213	\N	Planejado	2026-05-12 15:14:01.877822	2026-05-12 15:14:01.877822
1618	\N	277	\N	Planejado	2026-05-12 15:14:01.877822	2026-05-12 15:14:01.877822
1619	\N	227	\N	Planejado	2026-05-12 15:14:01.877822	2026-05-12 15:14:01.877822
1633	\N	341	\N	Planejado	2026-05-12 15:15:10.367305	2026-05-12 15:15:10.367305
1635	\N	213	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1602	\N	199	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1603	\N	230	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1604	\N	331	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1605	\N	247	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1606	\N	326	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1607	\N	364	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1608	\N	238	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1609	\N	328	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1610	\N	225	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1611	\N	204	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1612	\N	313	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1549	1589	282	674	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:29.664612
1552	1592	259	675	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:29.693978
1556	1596	320	676	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:29.716767
1554	1594	359	678	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:29.755765
1541	1581	305	682	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:29.916694
1543	1583	364	684	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:30.026755
1547	1587	327	686	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:30.043131
1546	1586	355	687	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:30.061921
1550	1590	356	688	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:30.075714
1540	1580	317	693	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:30.237416
1544	1584	377	694	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:30.250932
1539	1579	203	697	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:30.365878
514	\N	362	\N	Planejado e não Executado	2026-05-04 14:48:34.769979	2026-05-04 14:48:34.769979
515	\N	205	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
516	\N	353	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
517	\N	239	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
518	\N	216	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
519	\N	364	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
520	\N	328	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
521	\N	204	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
522	\N	376	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
523	\N	329	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
524	\N	235	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
525	\N	247	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
526	\N	362	\N	Planejado e não Executado	2026-05-04 14:49:33.420657	2026-05-04 14:49:33.420657
527	\N	205	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
528	\N	353	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
529	\N	239	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
530	\N	216	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
531	\N	364	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
532	\N	328	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
533	\N	204	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
534	\N	376	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
535	\N	329	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
536	\N	235	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
537	\N	247	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
538	\N	351	\N	Planejado e não Executado	2026-05-04 14:50:41.162187	2026-05-04 14:50:41.162187
539	\N	205	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
540	\N	353	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
541	\N	239	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
542	\N	216	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
543	\N	364	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
544	\N	328	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
545	\N	204	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
546	\N	238	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
547	\N	329	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
548	\N	235	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
549	\N	247	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
550	\N	351	\N	Planejado e não Executado	2026-05-04 14:51:01.695061	2026-05-04 14:51:01.695061
563	\N	220	\N	Planejado e não Executado	2026-05-04 14:52:18.902521	2026-05-04 14:52:18.902521
564	\N	286	\N	Planejado e não Executado	2026-05-04 14:52:18.902521	2026-05-04 14:52:18.902521
565	\N	326	\N	Planejado e não Executado	2026-05-04 14:52:18.902521	2026-05-04 14:52:18.902521
566	\N	220	\N	Planejado e não Executado	2026-05-04 14:52:32.999429	2026-05-04 14:52:32.999429
567	\N	286	\N	Planejado e não Executado	2026-05-04 14:52:32.999429	2026-05-04 14:52:32.999429
568	\N	326	\N	Planejado e não Executado	2026-05-04 14:52:32.999429	2026-05-04 14:52:32.999429
569	\N	220	\N	Planejado e não Executado	2026-05-04 14:54:02.869646	2026-05-04 14:54:02.869646
570	\N	286	\N	Planejado e não Executado	2026-05-04 14:54:02.869646	2026-05-04 14:54:02.869646
571	\N	326	\N	Planejado e não Executado	2026-05-04 14:54:02.869646	2026-05-04 14:54:02.869646
572	\N	228	\N	Planejado e não Executado	2026-05-04 14:54:02.869646	2026-05-04 14:54:02.869646
573	\N	283	\N	Planejado e não Executado	2026-05-04 14:54:02.869646	2026-05-04 14:54:02.869646
574	\N	313	\N	Planejado e não Executado	2026-05-04 14:54:02.869646	2026-05-04 14:54:02.869646
575	\N	228	\N	Planejado e não Executado	2026-05-04 14:55:10.174887	2026-05-04 14:55:10.174887
576	\N	283	\N	Planejado e não Executado	2026-05-04 14:55:10.174887	2026-05-04 14:55:10.174887
577	\N	313	\N	Planejado e não Executado	2026-05-04 14:55:10.174887	2026-05-04 14:55:10.174887
578	\N	220	\N	Planejado e não Executado	2026-05-04 14:55:10.174887	2026-05-04 14:55:10.174887
579	\N	286	\N	Planejado e não Executado	2026-05-04 14:55:10.174887	2026-05-04 14:55:10.174887
580	\N	326	\N	Planejado e não Executado	2026-05-04 14:55:10.174887	2026-05-04 14:55:10.174887
581	\N	207	\N	Planejado e não Executado	2026-05-04 14:55:10.174887	2026-05-04 14:55:10.174887
582	\N	318	\N	Planejado e não Executado	2026-05-04 14:55:10.174887	2026-05-04 14:55:10.174887
583	\N	339	\N	Planejado e não Executado	2026-05-04 14:55:10.174887	2026-05-04 14:55:10.174887
1461	\N	203	\N	Planejado	2026-05-11 15:28:26.941354	2026-05-11 15:28:26.941354
1462	\N	317	\N	Planejado	2026-05-11 15:28:26.941354	2026-05-11 15:28:26.941354
1463	\N	305	\N	Planejado	2026-05-11 15:28:26.941354	2026-05-11 15:28:26.941354
1557	\N	200	611	Apenas executado	2026-05-12 12:11:42.532284	2026-05-12 12:11:42.532284
593	\N	237	\N	Planejado e não Executado	2026-05-04 14:56:01.393445	2026-05-04 14:56:01.393445
594	\N	362	\N	Planejado e não Executado	2026-05-04 14:56:01.393445	2026-05-04 14:56:01.393445
595	\N	367	\N	Planejado e não Executado	2026-05-04 14:56:01.393445	2026-05-04 14:56:01.393445
596	\N	237	\N	Planejado e não Executado	2026-05-04 14:56:10.695043	2026-05-04 14:56:10.695043
597	\N	362	\N	Planejado e não Executado	2026-05-04 14:56:10.695043	2026-05-04 14:56:10.695043
598	\N	367	\N	Planejado e não Executado	2026-05-04 14:56:10.695043	2026-05-04 14:56:10.695043
1558	\N	288	612	Apenas executado	2026-05-12 12:11:42.550954	2026-05-12 12:11:42.550954
1559	\N	196	614	Apenas executado	2026-05-12 12:11:42.636428	2026-05-12 12:11:42.636428
1560	\N	249	615	Apenas executado	2026-05-12 12:11:42.698885	2026-05-12 12:11:42.698885
599	\N	237	\N	Planejado e não Executado	2026-05-04 14:57:02.236533	2026-05-04 14:57:02.236533
600	\N	362	\N	Planejado e não Executado	2026-05-04 14:57:02.236533	2026-05-04 14:57:02.236533
601	\N	367	\N	Planejado e não Executado	2026-05-04 14:57:02.236533	2026-05-04 14:57:02.236533
584	\N	228	\N	Planejado e não Executado	2026-05-04 14:55:13.890734	2026-05-04 14:55:13.890734
585	\N	283	\N	Planejado e não Executado	2026-05-04 14:55:13.890734	2026-05-04 14:55:13.890734
586	\N	313	\N	Planejado e não Executado	2026-05-04 14:55:13.890734	2026-05-04 14:55:13.890734
587	\N	220	\N	Planejado e não Executado	2026-05-04 14:55:13.890734	2026-05-04 14:55:13.890734
588	\N	286	\N	Planejado e não Executado	2026-05-04 14:55:13.890734	2026-05-04 14:55:13.890734
551	\N	205	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
552	\N	353	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
553	\N	239	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
554	\N	216	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
555	\N	364	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
556	\N	328	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
557	\N	204	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
558	\N	238	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
559	\N	329	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
1561	\N	385	617	Apenas executado	2026-05-12 12:11:42.801799	2026-05-12 12:11:42.801799
1562	\N	301	619	Apenas executado	2026-05-12 12:11:42.942027	2026-05-12 12:11:42.942027
1563	\N	206	622	Apenas executado	2026-05-12 12:11:43.117398	2026-05-12 12:11:43.117398
1564	\N	207	624	Apenas executado	2026-05-12 12:11:43.175259	2026-05-12 12:11:43.175259
1565	\N	224	625	Apenas executado	2026-05-12 12:11:43.210008	2026-05-12 12:11:43.210008
602	\N	229	\N	Planejado e não Executado	2026-05-04 14:57:02.236533	2026-05-04 14:57:02.236533
603	\N	282	\N	Planejado e não Executado	2026-05-04 14:57:02.236533	2026-05-04 14:57:02.236533
604	\N	377	\N	Planejado e não Executado	2026-05-04 14:57:02.236533	2026-05-04 14:57:02.236533
605	\N	229	\N	Planejado e não Executado	2026-05-04 14:58:24.961647	2026-05-04 14:58:24.961647
606	\N	282	\N	Planejado e não Executado	2026-05-04 14:58:24.961647	2026-05-04 14:58:24.961647
607	\N	377	\N	Planejado e não Executado	2026-05-04 14:58:24.961647	2026-05-04 14:58:24.961647
608	\N	237	\N	Planejado e não Executado	2026-05-04 14:58:24.961647	2026-05-04 14:58:24.961647
609	\N	362	\N	Planejado e não Executado	2026-05-04 14:58:24.961647	2026-05-04 14:58:24.961647
610	\N	367	\N	Planejado e não Executado	2026-05-04 14:58:24.961647	2026-05-04 14:58:24.961647
611	\N	260	\N	Planejado e não Executado	2026-05-04 14:58:24.961647	2026-05-04 14:58:24.961647
612	\N	331	\N	Planejado e não Executado	2026-05-04 14:58:24.961647	2026-05-04 14:58:24.961647
613	\N	355	\N	Planejado e não Executado	2026-05-04 14:58:24.961647	2026-05-04 14:58:24.961647
614	\N	229	\N	Planejado e não Executado	2026-05-04 14:58:51.600365	2026-05-04 14:58:51.600365
615	\N	282	\N	Planejado e não Executado	2026-05-04 14:58:51.600365	2026-05-04 14:58:51.600365
616	\N	227	\N	Planejado e não Executado	2026-05-04 14:58:51.600365	2026-05-04 14:58:51.600365
617	\N	260	\N	Planejado e não Executado	2026-05-04 14:58:51.600365	2026-05-04 14:58:51.600365
618	\N	331	\N	Planejado e não Executado	2026-05-04 14:58:51.600365	2026-05-04 14:58:51.600365
619	\N	355	\N	Planejado e não Executado	2026-05-04 14:58:51.600365	2026-05-04 14:58:51.600365
620	\N	237	\N	Planejado e não Executado	2026-05-04 14:58:51.600365	2026-05-04 14:58:51.600365
621	\N	362	\N	Planejado e não Executado	2026-05-04 14:58:51.600365	2026-05-04 14:58:51.600365
622	\N	367	\N	Planejado e não Executado	2026-05-04 14:58:51.600365	2026-05-04 14:58:51.600365
623	\N	229	\N	Planejado e não Executado	2026-05-04 14:58:58.585387	2026-05-04 14:58:58.585387
624	\N	282	\N	Planejado e não Executado	2026-05-04 14:58:58.585387	2026-05-04 14:58:58.585387
625	\N	227	\N	Planejado e não Executado	2026-05-04 14:58:58.585387	2026-05-04 14:58:58.585387
626	\N	260	\N	Planejado e não Executado	2026-05-04 14:58:58.585387	2026-05-04 14:58:58.585387
627	\N	331	\N	Planejado e não Executado	2026-05-04 14:58:58.585387	2026-05-04 14:58:58.585387
628	\N	355	\N	Planejado e não Executado	2026-05-04 14:58:58.585387	2026-05-04 14:58:58.585387
629	\N	237	\N	Planejado e não Executado	2026-05-04 14:58:58.585387	2026-05-04 14:58:58.585387
630	\N	362	\N	Planejado e não Executado	2026-05-04 14:58:58.585387	2026-05-04 14:58:58.585387
631	\N	367	\N	Planejado e não Executado	2026-05-04 14:58:58.585387	2026-05-04 14:58:58.585387
632	\N	229	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
633	\N	282	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
634	\N	227	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
635	\N	260	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
636	\N	331	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
637	\N	355	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
638	\N	237	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
639	\N	362	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
640	\N	367	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
641	\N	342	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
642	\N	321	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
643	\N	360	\N	Planejado e não Executado	2026-05-04 14:59:56.040181	2026-05-04 14:59:56.040181
644	\N	229	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
645	\N	282	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
646	\N	227	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
647	\N	260	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
648	\N	331	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
649	\N	355	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
650	\N	237	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
651	\N	362	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
652	\N	367	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
653	\N	342	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
654	\N	321	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
655	\N	360	\N	Planejado e não Executado	2026-05-04 15:01:12.612194	2026-05-04 15:01:12.612194
656	\N	229	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
657	\N	282	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
658	\N	227	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
659	\N	260	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
660	\N	331	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
661	\N	355	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
662	\N	237	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
663	\N	362	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
664	\N	367	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
665	\N	342	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
666	\N	321	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
667	\N	360	\N	Planejado e não Executado	2026-05-04 15:01:17.780223	2026-05-04 15:01:17.780223
1464	\N	203	\N	Planejado	2026-05-11 15:29:01.054913	2026-05-11 15:29:01.054913
680	\N	205	\N	Planejado e não Executado	2026-05-04 15:02:17.242647	2026-05-04 15:02:17.242647
681	\N	239	\N	Planejado e não Executado	2026-05-04 15:02:17.242647	2026-05-04 15:02:17.242647
682	\N	305	\N	Planejado e não Executado	2026-05-04 15:02:17.242647	2026-05-04 15:02:17.242647
683	\N	205	\N	Planejado e não Executado	2026-05-04 15:02:56.162954	2026-05-04 15:02:56.162954
684	\N	239	\N	Planejado e não Executado	2026-05-04 15:02:56.162954	2026-05-04 15:02:56.162954
685	\N	305	\N	Planejado e não Executado	2026-05-04 15:02:56.162954	2026-05-04 15:02:56.162954
686	\N	214	\N	Planejado e não Executado	2026-05-04 15:02:56.162954	2026-05-04 15:02:56.162954
687	\N	360	\N	Planejado e não Executado	2026-05-04 15:02:56.162954	2026-05-04 15:02:56.162954
688	\N	296	\N	Planejado e não Executado	2026-05-04 15:02:56.162954	2026-05-04 15:02:56.162954
689	\N	214	\N	Planejado e não Executado	2026-05-04 15:03:30.45918	2026-05-04 15:03:30.45918
668	\N	229	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
669	\N	282	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
670	\N	227	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
671	\N	260	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
672	\N	331	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
1465	\N	317	\N	Planejado	2026-05-11 15:29:01.054913	2026-05-11 15:29:01.054913
1466	\N	305	\N	Planejado	2026-05-11 15:29:01.054913	2026-05-11 15:29:01.054913
1467	\N	199	\N	Planejado	2026-05-11 15:29:01.054913	2026-05-11 15:29:01.054913
1468	\N	282	\N	Planejado	2026-05-11 15:29:01.054913	2026-05-11 15:29:01.054913
1469	\N	356	\N	Planejado	2026-05-11 15:29:01.054913	2026-05-11 15:29:01.054913
1568	\N	331	\N	Planejado	2026-05-12 14:34:55.933851	2026-05-12 14:34:55.933851
1620	\N	213	\N	Planejado	2026-05-12 15:14:39.007466	2026-05-12 15:14:39.007466
1621	\N	277	\N	Planejado	2026-05-12 15:14:39.007466	2026-05-12 15:14:39.007466
1636	\N	277	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1637	\N	227	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1638	\N	260	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1639	\N	341	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1640	\N	305	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
690	\N	360	\N	Planejado e não Executado	2026-05-04 15:03:30.45918	2026-05-04 15:03:30.45918
691	\N	296	\N	Planejado e não Executado	2026-05-04 15:03:30.45918	2026-05-04 15:03:30.45918
692	\N	205	\N	Planejado e não Executado	2026-05-04 15:03:30.45918	2026-05-04 15:03:30.45918
693	\N	239	\N	Planejado e não Executado	2026-05-04 15:03:30.45918	2026-05-04 15:03:30.45918
694	\N	305	\N	Planejado e não Executado	2026-05-04 15:03:30.45918	2026-05-04 15:03:30.45918
695	\N	213	\N	Planejado e não Executado	2026-05-04 15:03:30.45918	2026-05-04 15:03:30.45918
696	\N	277	\N	Planejado e não Executado	2026-05-04 15:03:30.45918	2026-05-04 15:03:30.45918
697	\N	282	\N	Planejado e não Executado	2026-05-04 15:03:30.45918	2026-05-04 15:03:30.45918
698	\N	214	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
699	\N	360	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
700	\N	296	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
701	\N	213	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
702	\N	277	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
703	\N	282	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
704	\N	205	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
705	\N	239	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
706	\N	305	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
707	\N	243	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
708	\N	242	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
709	\N	364	\N	Planejado e não Executado	2026-05-04 15:04:01.381481	2026-05-04 15:04:01.381481
710	\N	243	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
711	\N	242	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
712	\N	364	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
713	\N	214	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
714	\N	360	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
715	\N	296	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
716	\N	213	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
717	\N	277	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
718	\N	282	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
719	\N	205	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
720	\N	239	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
721	\N	305	\N	Planejado e não Executado	2026-05-04 15:04:15.613303	2026-05-04 15:04:15.613303
734	\N	216	\N	Planejado e não Executado	2026-05-04 15:05:17.949459	2026-05-04 15:05:17.949459
735	\N	248	\N	Planejado e não Executado	2026-05-04 15:05:17.949459	2026-05-04 15:05:17.949459
736	\N	317	\N	Planejado e não Executado	2026-05-04 15:05:17.949459	2026-05-04 15:05:17.949459
737	\N	216	\N	Planejado e não Executado	2026-05-04 15:05:53.988566	2026-05-04 15:05:53.988566
738	\N	248	\N	Planejado e não Executado	2026-05-04 15:05:53.988566	2026-05-04 15:05:53.988566
739	\N	317	\N	Planejado e não Executado	2026-05-04 15:05:53.988566	2026-05-04 15:05:53.988566
740	\N	235	\N	Planejado e não Executado	2026-05-04 15:05:53.988566	2026-05-04 15:05:53.988566
741	\N	247	\N	Planejado e não Executado	2026-05-04 15:05:53.988566	2026-05-04 15:05:53.988566
742	\N	328	\N	Planejado e não Executado	2026-05-04 15:05:53.988566	2026-05-04 15:05:53.988566
743	\N	235	\N	Planejado e não Executado	2026-05-04 15:06:36.556205	2026-05-04 15:06:36.556205
744	\N	247	\N	Planejado e não Executado	2026-05-04 15:06:36.556205	2026-05-04 15:06:36.556205
745	\N	328	\N	Planejado e não Executado	2026-05-04 15:06:36.556205	2026-05-04 15:06:36.556205
746	\N	216	\N	Planejado e não Executado	2026-05-04 15:06:36.556205	2026-05-04 15:06:36.556205
747	\N	248	\N	Planejado e não Executado	2026-05-04 15:06:36.556205	2026-05-04 15:06:36.556205
748	\N	317	\N	Planejado e não Executado	2026-05-04 15:06:36.556205	2026-05-04 15:06:36.556205
749	\N	225	\N	Planejado e não Executado	2026-05-04 15:06:36.556205	2026-05-04 15:06:36.556205
750	\N	356	\N	Planejado e não Executado	2026-05-04 15:06:36.556205	2026-05-04 15:06:36.556205
751	\N	265	\N	Planejado e não Executado	2026-05-04 15:06:36.556205	2026-05-04 15:06:36.556205
752	\N	235	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
753	\N	247	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
754	\N	328	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
755	\N	225	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
756	\N	356	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
757	\N	265	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
758	\N	216	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
759	\N	248	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
760	\N	317	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
761	\N	204	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
762	\N	230	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
763	\N	361	\N	Planejado e não Executado	2026-05-04 15:07:36.577322	2026-05-04 15:07:36.577322
764	\N	204	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
765	\N	230	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
766	\N	361	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
767	\N	235	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
768	\N	247	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
769	\N	328	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
770	\N	225	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
771	\N	356	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
722	\N	214	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
723	\N	360	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
724	\N	296	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
725	\N	213	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
726	\N	277	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
727	\N	282	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
728	\N	205	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
729	\N	239	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
730	\N	305	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
731	\N	243	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
732	\N	242	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
1115	\N	225	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1123	770	359	567	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:28.972124
1117	764	215	570	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.071702
1118	765	210	571	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.099264
1124	771	248	573	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.172424
1121	768	286	577	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.315293
1126	773	265	578	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.344713
1120	767	283	582	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.415033
1116	763	203	587	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.565223
1125	772	199	589	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.585672
1119	766	229	593	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.681292
772	\N	265	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
773	\N	216	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
774	\N	248	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
775	\N	317	\N	Planejado e não Executado	2026-05-04 15:07:53.371672	2026-05-04 15:07:53.371672
776	\N	235	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
777	\N	247	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
778	\N	328	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
779	\N	225	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
780	\N	356	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
781	\N	265	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
782	\N	216	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
783	\N	248	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
784	\N	317	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
785	\N	204	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
786	\N	230	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
787	\N	361	\N	Planejado e não Executado	2026-05-04 15:08:33.735328	2026-05-04 15:08:33.735328
802	\N	287	386	Apenas executado	2026-05-04 15:19:32.147943	2026-05-04 15:19:32.147943
803	\N	287	387	Apenas executado	2026-05-04 15:19:32.152357	2026-05-04 15:19:32.152357
812	\N	200	398	Apenas executado	2026-05-04 15:19:32.250001	2026-05-04 15:19:32.250001
813	\N	200	399	Apenas executado	2026-05-04 15:19:32.254752	2026-05-04 15:19:32.254752
814	\N	288	400	Apenas executado	2026-05-04 15:19:32.259283	2026-05-04 15:19:32.259283
821	\N	210	408	Apenas executado	2026-05-04 15:19:32.334323	2026-05-04 15:19:32.334323
824	\N	315	411	Apenas executado	2026-05-04 15:19:32.355716	2026-05-04 15:19:32.355716
826	\N	249	413	Apenas executado	2026-05-04 15:19:32.372051	2026-05-04 15:19:32.372051
827	\N	249	414	Apenas executado	2026-05-04 15:19:32.376748	2026-05-04 15:19:32.376748
828	\N	249	415	Apenas executado	2026-05-04 15:19:32.38175	2026-05-04 15:19:32.38175
834	\N	277	422	Apenas executado	2026-05-04 15:19:32.430597	2026-05-04 15:19:32.430597
838	\N	198	427	Apenas executado	2026-05-04 15:19:32.475855	2026-05-04 15:19:32.475855
839	\N	198	428	Apenas executado	2026-05-04 15:19:32.480563	2026-05-04 15:19:32.480563
840	\N	251	429	Apenas executado	2026-05-04 15:19:32.487012	2026-05-04 15:19:32.487012
841	\N	251	430	Apenas executado	2026-05-04 15:19:32.491727	2026-05-04 15:19:32.491727
843	\N	250	432	Apenas executado	2026-05-04 15:19:32.510041	2026-05-04 15:19:32.510041
844	\N	250	433	Apenas executado	2026-05-04 15:19:32.514752	2026-05-04 15:19:32.514752
848	\N	258	437	Apenas executado	2026-05-04 15:19:32.545824	2026-05-04 15:19:32.545824
854	\N	197	443	Apenas executado	2026-05-04 15:19:32.589702	2026-05-04 15:19:32.589702
855	\N	301	444	Apenas executado	2026-05-04 15:19:32.599545	2026-05-04 15:19:32.599545
788	\N	235	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
789	\N	247	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
790	\N	328	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
791	\N	225	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
792	\N	356	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
793	\N	265	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
794	\N	216	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
795	\N	248	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
796	\N	317	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
797	\N	204	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
798	\N	230	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
799	\N	361	\N	Planejado e não Executado	2026-05-04 15:09:59.478069	2026-05-04 15:09:59.478069
1471	\N	317	\N	Planejado	2026-05-11 15:29:49.642726	2026-05-11 15:29:49.642726
849	1418	286	438	Planejado e executado	2026-05-04 15:19:32.552497	2026-05-07 15:08:44.509707
1472	\N	305	\N	Planejado	2026-05-11 15:29:49.642726	2026-05-11 15:29:49.642726
1473	\N	199	\N	Planejado	2026-05-11 15:29:49.642726	2026-05-11 15:29:49.642726
850	1390	205	439	Planejado e executado	2026-05-04 15:19:32.571285	2026-05-07 15:05:41.393232
805	578	362	390	Planejado e executado	2026-05-04 15:19:32.179834	2026-05-05 15:52:43.139225
829	1391	305	416	Planejado e executado	2026-05-04 15:19:32.393584	2026-05-07 15:05:41.393232
817	1393	241	404	Planejado e executado	2026-05-04 15:19:32.295254	2026-05-07 15:05:41.393232
835	1395	374	423	Planejado e executado	2026-05-04 15:19:32.438854	2026-05-07 15:05:41.393232
856	533	326	445	Planejado e executado	2026-05-04 15:19:32.606	2026-05-05 15:28:41.113271
832	536	325	419	Planejado e executado	2026-05-04 15:19:32.409343	2026-05-05 15:28:41.113271
847	582	353	436	Planejado e executado	2026-05-04 15:19:32.535664	2026-05-05 15:52:43.139225
830	485	305	417	Planejado e executado	2026-05-04 15:19:32.398269	2026-05-05 15:22:58.24214
820	486	215	407	Planejado e executado	2026-05-04 15:19:32.316078	2026-05-05 15:22:58.24214
831	488	325	418	Planejado e executado	2026-05-04 15:19:32.404708	2026-05-05 15:22:58.24214
819	584	328	406	Planejado e executado	2026-05-04 15:19:32.311583	2026-05-05 15:52:43.139225
1474	\N	282	\N	Planejado	2026-05-11 15:29:49.642726	2026-05-11 15:29:49.642726
808	537	320	393	Planejado e executado	2026-05-04 15:19:32.211214	2026-05-05 15:28:41.113271
853	540	265	442	Planejado e executado	2026-05-04 15:19:32.585296	2026-05-05 15:28:41.113271
810	541	242	396	Planejado e executado	2026-05-04 15:19:32.230284	2026-05-05 15:28:41.113271
852	542	349	441	Planejado e executado	2026-05-04 15:19:32.580509	2026-05-05 15:28:41.113271
825	489	315	412	Planejado e executado	2026-05-04 15:19:32.360269	2026-05-05 15:22:58.24214
823	492	297	410	Planejado e executado	2026-05-04 15:19:32.345524	2026-05-05 15:22:58.24214
818	494	328	405	Planejado e executado	2026-05-04 15:19:32.307015	2026-05-05 15:22:58.24214
1475	\N	356	\N	Planejado	2026-05-11 15:29:49.642726	2026-05-11 15:29:49.642726
842	585	364	431	Planejado e executado	2026-05-04 15:19:32.500048	2026-05-05 15:52:43.139225
801	587	329	385	Planejado e executado	2026-05-04 15:19:32.140809	2026-05-05 15:52:43.139225
1566	\N	199	\N	Planejado	2026-05-12 14:34:55.933851	2026-05-12 14:34:55.933851
800	1419	271	383	Planejado e executado	2026-05-04 15:19:32.122833	2026-05-07 15:08:44.509707
822	1422	297	409	Planejado e executado	2026-05-04 15:19:32.340804	2026-05-07 15:08:44.509707
815	1423	235	402	Planejado e executado	2026-05-04 15:19:32.282478	2026-05-07 15:08:44.509707
836	1425	360	424	Planejado e executado	2026-05-04 15:19:32.449049	2026-05-07 15:08:44.509707
1567	\N	230	\N	Planejado	2026-05-12 14:34:55.933851	2026-05-12 14:34:55.933851
833	1456	277	421	Planejado e executado	2026-05-04 15:19:32.425831	2026-05-07 15:11:39.874649
811	1457	359	397	Planejado e executado	2026-05-04 15:19:32.236544	2026-05-07 15:11:39.874649
837	1458	360	425	Planejado e executado	2026-05-04 15:19:32.453818	2026-05-07 15:11:39.874649
1569	\N	199	\N	Planejado	2026-05-12 14:35:15.402203	2026-05-12 14:35:15.402203
1570	\N	230	\N	Planejado	2026-05-12 14:35:15.402203	2026-05-12 14:35:15.402203
1571	\N	331	\N	Planejado	2026-05-12 14:35:15.402203	2026-05-12 14:35:15.402203
857	1460	313	446	Planejado e executado	2026-05-04 15:19:32.612387	2026-05-07 15:11:39.874649
809	1462	242	395	Planejado e executado	2026-05-04 15:19:32.225716	2026-05-07 15:11:39.874649
806	1463	259	391	Planejado e executado	2026-05-04 15:19:32.189847	2026-05-07 15:11:39.874649
845	1467	228	434	Planejado e executado	2026-05-04 15:19:32.526292	2026-05-07 15:11:39.874649
1572	\N	199	\N	Planejado	2026-05-12 14:35:24.010731	2026-05-12 14:35:24.010731
1573	\N	230	\N	Planejado	2026-05-12 14:35:24.010731	2026-05-12 14:35:24.010731
1574	\N	331	\N	Planejado	2026-05-12 14:35:24.010731	2026-05-12 14:35:24.010731
1622	\N	227	\N	Planejado	2026-05-12 15:14:39.007466	2026-05-12 15:14:39.007466
1623	\N	382	\N	Planejado	2026-05-12 15:14:39.007466	2026-05-12 15:14:39.007466
1624	\N	350	\N	Planejado	2026-05-12 15:14:39.007466	2026-05-12 15:14:39.007466
1625	\N	320	\N	Planejado	2026-05-12 15:14:39.007466	2026-05-12 15:14:39.007466
863	\N	321	452	Apenas executado	2026-05-04 15:19:32.658065	2026-05-04 15:19:32.658065
1470	\N	203	\N	Planejado	2026-05-11 15:29:49.642726	2026-05-11 15:29:49.642726
867	\N	342	456	Apenas executado	2026-05-04 15:19:32.709344	2026-05-04 15:19:32.709344
868	\N	342	457	Apenas executado	2026-05-04 15:19:32.713386	2026-05-04 15:19:32.713386
870	\N	206	459	Apenas executado	2026-05-04 15:19:32.734511	2026-05-04 15:19:32.734511
871	\N	252	460	Apenas executado	2026-05-04 15:19:32.742623	2026-05-04 15:19:32.742623
872	\N	221	461	Apenas executado	2026-05-04 15:19:32.751288	2026-05-04 15:19:32.751288
589	\N	326	\N	Planejado e não Executado	2026-05-04 14:55:13.890734	2026-05-04 14:55:13.890734
590	\N	207	\N	Planejado e não Executado	2026-05-04 14:55:13.890734	2026-05-04 14:55:13.890734
591	\N	318	\N	Planejado e não Executado	2026-05-04 14:55:13.890734	2026-05-04 14:55:13.890734
592	\N	339	\N	Planejado e não Executado	2026-05-04 14:55:13.890734	2026-05-04 14:55:13.890734
898	\N	379	478	Apenas executado	2026-05-04 15:30:57.43722	2026-05-04 15:30:57.43722
899	\N	379	479	Apenas executado	2026-05-04 15:30:57.442273	2026-05-04 15:30:57.442273
900	\N	380	480	Apenas executado	2026-05-04 15:30:57.483083	2026-05-04 15:30:57.483083
895	\N	318	\N	Planejado e não Executado	2026-05-04 15:25:37.152383	2026-05-04 15:25:37.152383
896	\N	339	\N	Planejado e não Executado	2026-05-04 15:25:37.152383	2026-05-04 15:25:37.152383
733	\N	364	\N	Planejado e não Executado	2026-05-04 15:04:25.222516	2026-05-04 15:04:25.222516
673	\N	355	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
674	\N	237	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
675	\N	362	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
676	\N	367	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
677	\N	342	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
678	\N	321	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
679	\N	360	\N	Planejado e não Executado	2026-05-04 15:01:28.778613	2026-05-04 15:01:28.778613
560	\N	235	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
561	\N	247	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
562	\N	351	\N	Planejado e não Executado	2026-05-04 14:51:34.097025	2026-05-04 14:51:34.097025
888	\N	228	\N	Planejado e não Executado	2026-05-04 15:25:37.152383	2026-05-04 15:25:37.152383
889	\N	283	\N	Planejado e não Executado	2026-05-04 15:25:37.152383	2026-05-04 15:25:37.152383
890	\N	313	\N	Planejado e não Executado	2026-05-04 15:25:37.152383	2026-05-04 15:25:37.152383
891	\N	220	\N	Planejado e não Executado	2026-05-04 15:25:37.152383	2026-05-04 15:25:37.152383
892	\N	286	\N	Planejado e não Executado	2026-05-04 15:25:37.152383	2026-05-04 15:25:37.152383
893	\N	326	\N	Planejado e não Executado	2026-05-04 15:25:37.152383	2026-05-04 15:25:37.152383
894	\N	207	\N	Planejado e não Executado	2026-05-04 15:25:37.152383	2026-05-04 15:25:37.152383
902	\N	216	\N	Planejado e não Executado	2026-05-05 13:15:10.501237	2026-05-05 13:15:10.501237
903	\N	235	\N	Planejado e não Executado	2026-05-05 13:15:10.501237	2026-05-05 13:15:10.501237
904	\N	205	\N	Planejado e não Executado	2026-05-05 13:15:10.501237	2026-05-05 13:15:10.501237
911	\N	297	\N	Planejado e não Executado	2026-05-05 15:27:10.198793	2026-05-05 15:27:10.198793
905	\N	205	\N	Planejado e não Executado	2026-05-05 13:39:55.506995	2026-05-05 13:39:55.506995
906	\N	216	\N	Planejado e não Executado	2026-05-05 13:39:55.506995	2026-05-05 13:39:55.506995
907	\N	235	\N	Planejado e não Executado	2026-05-05 13:39:55.506995	2026-05-05 13:39:55.506995
901	535	382	481	Planejado e executado	2026-05-04 15:32:36.998389	2026-05-05 15:28:41.113271
908	\N	297	\N	Planejado e não Executado	2026-05-05 15:25:03.238026	2026-05-05 15:25:03.238026
897	538	381	477	Planejado e executado	2026-05-04 15:30:57.418774	2026-05-05 15:28:41.113271
864	539	317	453	Planejado e executado	2026-05-04 15:19:32.667729	2026-05-05 15:28:41.113271
909	\N	297	\N	Planejado e não Executado	2026-05-05 15:25:16.383832	2026-05-05 15:25:16.383832
917	\N	205	\N	Planejado e não Executado	2026-05-05 15:52:23.368369	2026-05-05 15:52:23.368369
873	484	203	462	Planejado e executado	2026-05-04 15:19:32.756859	2026-05-05 15:22:58.24214
881	487	243	470	Planejado e executado	2026-05-04 15:19:32.809368	2026-05-05 15:22:58.24214
876	490	238	465	Planejado e executado	2026-05-04 15:19:32.779348	2026-05-05 15:22:58.24214
858	491	313	447	Planejado e executado	2026-05-04 15:19:32.616975	2026-05-05 15:22:58.24214
877	493	214	466	Planejado e executado	2026-05-04 15:19:32.787299	2026-05-05 15:22:58.24214
915	\N	216	\N	Planejado e não Executado	2026-05-05 15:51:53.819148	2026-05-05 15:51:53.819148
923	\N	220	\N	Planejado e não Executado	2026-05-05 15:55:34.454198	2026-05-05 15:55:34.454198
910	\N	297	\N	Planejado e não Executado	2026-05-05 15:26:11.375982	2026-05-05 15:26:11.375982
924	\N	326	\N	Planejado e não Executado	2026-05-05 15:55:34.454198	2026-05-05 15:55:34.454198
862	543	369	451	Planejado e executado	2026-05-04 15:19:32.651312	2026-05-05 15:28:41.113271
918	\N	216	\N	Planejado e não Executado	2026-05-05 15:52:23.368369	2026-05-05 15:52:23.368369
916	\N	205	\N	Planejado e não Executado	2026-05-05 15:51:53.819148	2026-05-05 15:51:53.819148
925	\N	286	\N	Planejado e não Executado	2026-05-05 15:55:34.454198	2026-05-05 15:55:34.454198
912	\N	297	\N	Planejado e não Executado	2026-05-05 15:28:05.511295	2026-05-05 15:28:05.511295
887	495	350	476	Planejado e executado	2026-05-04 15:19:32.851967	2026-05-05 15:22:58.24214
846	496	255	435	Planejado e executado	2026-05-04 15:19:32.53097	2026-05-05 15:22:58.24214
807	497	259	392	Planejado e executado	2026-05-04 15:19:32.194403	2026-05-05 15:22:58.24214
804	498	362	389	Planejado e executado	2026-05-04 15:19:32.175016	2026-05-05 15:22:58.24214
926	\N	228	\N	Planejado e não Executado	2026-05-05 15:55:34.454198	2026-05-05 15:55:34.454198
920	577	235	489	Planejado e executado	2026-05-05 15:52:43.139225	2026-05-06 13:05:43.560298
914	\N	216	\N	Planejado e não Executado	2026-05-05 15:51:18.482935	2026-05-05 15:51:18.482935
878	532	214	467	Planejado e executado	2026-05-04 15:19:32.791837	2026-05-05 15:28:41.113271
913	534	297	\N	Planejado e não Executado	2026-05-05 15:28:41.113271	2026-05-05 15:28:41.113271
922	583	216	516	Planejado e executado	2026-05-05 15:52:43.139225	2026-05-06 13:05:44.124676
919	\N	235	\N	Planejado e não Executado	2026-05-05 15:52:23.368369	2026-05-05 15:52:23.368369
921	580	205	520	Planejado e executado	2026-05-05 15:52:43.139225	2026-05-06 13:06:45.603083
885	579	247	474	Planejado e executado	2026-05-04 15:19:32.837707	2026-05-05 15:52:43.139225
880	581	239	469	Planejado e executado	2026-05-04 15:19:32.804553	2026-05-05 15:52:43.139225
859	586	204	448	Planejado e executado	2026-05-04 15:19:32.626926	2026-05-05 15:52:43.139225
869	588	376	458	Planejado e executado	2026-05-04 15:19:32.724674	2026-05-05 15:52:43.139225
879	1392	239	468	Planejado e executado	2026-05-04 15:19:32.800003	2026-05-07 15:05:41.393232
861	1394	369	450	Planejado e executado	2026-05-04 15:19:32.646714	2026-05-07 15:05:41.393232
884	1417	247	473	Planejado e executado	2026-05-04 15:19:32.833053	2026-05-07 15:08:44.509707
874	1420	207	463	Planejado e executado	2026-05-04 15:19:32.764932	2026-05-07 15:08:44.509707
865	1421	377	454	Planejado e executado	2026-05-04 15:19:32.678294	2026-05-07 15:08:44.509707
1476	\N	203	\N	Planejado	2026-05-11 15:33:34.14104	2026-05-11 15:33:34.14104
882	1459	216	471	Planejado e executado	2026-05-04 15:19:32.817333	2026-05-07 15:11:39.874649
860	1461	283	449	Planejado e executado	2026-05-04 15:19:32.635003	2026-05-07 15:11:39.874649
886	1464	229	475	Planejado e executado	2026-05-04 15:19:32.845746	2026-05-07 15:11:39.874649
1477	\N	317	\N	Planejado	2026-05-11 15:33:34.14104	2026-05-11 15:33:34.14104
875	1465	238	464	Planejado e executado	2026-05-04 15:19:32.77477	2026-05-07 15:11:39.874649
1575	\N	199	\N	Planejado	2026-05-12 15:11:03.440373	2026-05-12 15:11:03.440373
1576	\N	230	\N	Planejado	2026-05-12 15:11:03.440373	2026-05-12 15:11:03.440373
1577	\N	331	\N	Planejado	2026-05-12 15:11:03.440373	2026-05-12 15:11:03.440373
927	\N	313	\N	Planejado e não Executado	2026-05-05 15:55:34.454198	2026-05-05 15:55:34.454198
928	\N	360	\N	Planejado e não Executado	2026-05-05 15:55:34.454198	2026-05-05 15:55:34.454198
938	\N	237	\N	Planejado e não Executado	2026-05-05 15:57:10.294683	2026-05-05 15:57:10.294683
939	\N	367	\N	Planejado e não Executado	2026-05-05 15:57:10.294683	2026-05-05 15:57:10.294683
940	\N	362	\N	Planejado e não Executado	2026-05-05 15:57:10.294683	2026-05-05 15:57:10.294683
941	\N	237	\N	Planejado e não Executado	2026-05-05 15:58:34.214572	2026-05-05 15:58:34.214572
942	\N	367	\N	Planejado e não Executado	2026-05-05 15:58:34.214572	2026-05-05 15:58:34.214572
943	\N	362	\N	Planejado e não Executado	2026-05-05 15:58:34.214572	2026-05-05 15:58:34.214572
944	\N	229	\N	Planejado e não Executado	2026-05-05 15:58:34.214572	2026-05-05 15:58:34.214572
945	\N	316	\N	Planejado e não Executado	2026-05-05 15:58:34.214572	2026-05-05 15:58:34.214572
946	\N	377	\N	Planejado e não Executado	2026-05-05 15:58:34.214572	2026-05-05 15:58:34.214572
947	\N	229	\N	Planejado e não Executado	2026-05-05 15:59:42.854981	2026-05-05 15:59:42.854981
948	\N	316	\N	Planejado e não Executado	2026-05-05 15:59:42.854981	2026-05-05 15:59:42.854981
949	\N	377	\N	Planejado e não Executado	2026-05-05 15:59:42.854981	2026-05-05 15:59:42.854981
950	\N	237	\N	Planejado e não Executado	2026-05-05 15:59:42.854981	2026-05-05 15:59:42.854981
951	\N	367	\N	Planejado e não Executado	2026-05-05 15:59:42.854981	2026-05-05 15:59:42.854981
952	\N	362	\N	Planejado e não Executado	2026-05-05 15:59:42.854981	2026-05-05 15:59:42.854981
953	\N	260	\N	Planejado e não Executado	2026-05-05 15:59:42.854981	2026-05-05 15:59:42.854981
954	\N	355	\N	Planejado e não Executado	2026-05-05 15:59:42.854981	2026-05-05 15:59:42.854981
955	\N	331	\N	Planejado e não Executado	2026-05-05 15:59:42.854981	2026-05-05 15:59:42.854981
1478	\N	305	\N	Planejado	2026-05-11 15:33:34.14104	2026-05-11 15:33:34.14104
1479	\N	199	\N	Planejado	2026-05-11 15:33:34.14104	2026-05-11 15:33:34.14104
1480	\N	282	\N	Planejado	2026-05-11 15:33:34.14104	2026-05-11 15:33:34.14104
1481	\N	356	\N	Planejado	2026-05-11 15:33:34.14104	2026-05-11 15:33:34.14104
1482	\N	237	\N	Planejado	2026-05-11 15:33:34.14104	2026-05-11 15:33:34.14104
1483	\N	355	\N	Planejado	2026-05-11 15:33:34.14104	2026-05-11 15:33:34.14104
1484	\N	327	\N	Planejado	2026-05-11 15:33:34.14104	2026-05-11 15:33:34.14104
968	\N	287	482	Apenas executado	2026-05-06 13:05:43.40371	2026-05-06 13:05:43.40371
937	603	318	484	Planejado e executado	2026-05-05 15:56:12.974728	2026-05-06 13:05:43.475407
969	\N	288	486	Apenas executado	2026-05-06 13:05:43.518497	2026-05-06 13:05:43.518497
970	\N	288	487	Apenas executado	2026-05-06 13:05:43.525391	2026-05-06 13:05:43.525391
932	598	220	488	Planejado e executado	2026-05-05 15:56:12.974728	2026-05-06 13:05:43.545666
971	\N	196	490	Apenas executado	2026-05-06 13:05:43.5902	2026-05-06 13:05:43.5902
972	\N	249	491	Apenas executado	2026-05-06 13:05:43.649776	2026-05-06 13:05:43.649776
973	\N	277	492	Apenas executado	2026-05-06 13:05:43.689509	2026-05-06 13:05:43.689509
931	597	360	493	Planejado e executado	2026-05-05 15:56:12.974728	2026-05-06 13:05:43.713496
974	\N	198	495	Apenas executado	2026-05-06 13:05:43.746276	2026-05-06 13:05:43.746276
975	\N	198	496	Apenas executado	2026-05-06 13:05:43.751434	2026-05-06 13:05:43.751434
976	\N	251	497	Apenas executado	2026-05-06 13:05:43.763372	2026-05-06 13:05:43.763372
977	\N	251	498	Apenas executado	2026-05-06 13:05:43.774723	2026-05-06 13:05:43.774723
929	595	228	501	Planejado e executado	2026-05-05 15:56:12.974728	2026-05-06 13:05:43.819434
978	\N	255	502	Apenas executado	2026-05-06 13:05:43.826814	2026-05-06 13:05:43.826814
979	\N	258	503	Apenas executado	2026-05-06 13:05:43.844265	2026-05-06 13:05:43.844265
934	600	286	504	Planejado e executado	2026-05-05 15:56:12.974728	2026-05-06 13:05:43.853417
980	\N	301	505	Apenas executado	2026-05-06 13:05:43.885053	2026-05-06 13:05:43.885053
933	599	326	506	Planejado e executado	2026-05-05 15:56:12.974728	2026-05-06 13:05:43.894436
930	596	313	507	Planejado e executado	2026-05-05 15:56:12.974728	2026-05-06 13:05:43.9058
981	\N	313	508	Apenas executado	2026-05-06 13:05:43.912651	2026-05-06 13:05:43.912651
936	602	339	510	Planejado e executado	2026-05-05 15:56:12.974728	2026-05-06 13:05:43.979694
1485	\N	237	\N	Planejado	2026-05-11 15:34:05.241619	2026-05-11 15:34:05.241619
982	\N	252	513	Apenas executado	2026-05-06 13:05:44.050697	2026-05-06 13:05:44.050697
935	601	207	514	Planejado e executado	2026-05-05 15:56:12.974728	2026-05-06 13:05:44.076977
983	\N	224	515	Apenas executado	2026-05-06 13:05:44.102251	2026-05-06 13:05:44.102251
1486	\N	355	\N	Planejado	2026-05-11 15:34:05.241619	2026-05-11 15:34:05.241619
984	\N	379	518	Apenas executado	2026-05-06 13:06:45.55963	2026-05-06 13:06:45.55963
985	\N	379	519	Apenas executado	2026-05-06 13:06:45.571233	2026-05-06 13:06:45.571233
986	\N	380	521	Apenas executado	2026-05-06 13:06:45.63672	2026-05-06 13:06:45.63672
987	\N	259	\N	Planejado e não Executado	2026-05-06 13:17:43.34212	2026-05-06 13:17:43.34212
988	\N	205	\N	Planejado e não Executado	2026-05-06 13:17:43.34212	2026-05-06 13:17:43.34212
989	\N	199	\N	Planejado e não Executado	2026-05-06 13:17:43.34212	2026-05-06 13:17:43.34212
990	\N	259	\N	Planejado e não Executado	2026-05-06 13:18:03.642293	2026-05-06 13:18:03.642293
991	\N	205	\N	Planejado e não Executado	2026-05-06 13:18:03.642293	2026-05-06 13:18:03.642293
992	\N	198	\N	Planejado e não Executado	2026-05-06 13:18:03.642293	2026-05-06 13:18:03.642293
993	\N	259	\N	Planejado e não Executado	2026-05-06 13:18:04.724111	2026-05-06 13:18:04.724111
994	\N	205	\N	Planejado e não Executado	2026-05-06 13:18:04.724111	2026-05-06 13:18:04.724111
995	\N	198	\N	Planejado e não Executado	2026-05-06 13:18:04.724111	2026-05-06 13:18:04.724111
996	\N	205	\N	Planejado e não Executado	2026-05-06 14:45:03.701193	2026-05-06 14:45:03.701193
997	\N	239	\N	Planejado e não Executado	2026-05-06 14:45:03.701193	2026-05-06 14:45:03.701193
998	\N	305	\N	Planejado e não Executado	2026-05-06 14:45:03.701193	2026-05-06 14:45:03.701193
999	\N	205	\N	Planejado e não Executado	2026-05-06 14:47:01.621381	2026-05-06 14:47:01.621381
1000	\N	239	\N	Planejado e não Executado	2026-05-06 14:47:01.621381	2026-05-06 14:47:01.621381
1001	\N	305	\N	Planejado e não Executado	2026-05-06 14:47:01.621381	2026-05-06 14:47:01.621381
1002	\N	214	\N	Planejado e não Executado	2026-05-06 14:47:01.621381	2026-05-06 14:47:01.621381
1003	\N	296	\N	Planejado e não Executado	2026-05-06 14:47:01.621381	2026-05-06 14:47:01.621381
1004	\N	283	\N	Planejado e não Executado	2026-05-06 14:47:01.621381	2026-05-06 14:47:01.621381
1005	\N	214	\N	Planejado e não Executado	2026-05-06 14:47:48.280657	2026-05-06 14:47:48.280657
1006	\N	296	\N	Planejado e não Executado	2026-05-06 14:47:48.280657	2026-05-06 14:47:48.280657
1007	\N	283	\N	Planejado e não Executado	2026-05-06 14:47:48.280657	2026-05-06 14:47:48.280657
1008	\N	205	\N	Planejado e não Executado	2026-05-06 14:47:48.280657	2026-05-06 14:47:48.280657
1009	\N	239	\N	Planejado e não Executado	2026-05-06 14:47:48.280657	2026-05-06 14:47:48.280657
1010	\N	305	\N	Planejado e não Executado	2026-05-06 14:47:48.280657	2026-05-06 14:47:48.280657
1011	\N	213	\N	Planejado e não Executado	2026-05-06 14:47:48.280657	2026-05-06 14:47:48.280657
1012	\N	282	\N	Planejado e não Executado	2026-05-06 14:47:48.280657	2026-05-06 14:47:48.280657
1013	\N	277	\N	Planejado e não Executado	2026-05-06 14:47:48.280657	2026-05-06 14:47:48.280657
1487	\N	327	\N	Planejado	2026-05-11 15:34:05.241619	2026-05-11 15:34:05.241619
957	\N	316	\N	Planejado e não Executado	2026-05-05 16:00:44.598851	2026-05-05 16:00:44.598851
958	\N	377	\N	Planejado e não Executado	2026-05-05 16:00:44.598851	2026-05-05 16:00:44.598851
1488	\N	203	\N	Planejado	2026-05-11 15:34:05.241619	2026-05-11 15:34:05.241619
1489	\N	317	\N	Planejado	2026-05-11 15:34:05.241619	2026-05-11 15:34:05.241619
961	\N	331	\N	Planejado e não Executado	2026-05-05 16:00:44.598851	2026-05-05 16:00:44.598851
1490	\N	305	\N	Planejado	2026-05-11 15:34:05.241619	2026-05-11 15:34:05.241619
1578	\N	204	\N	Planejado	2026-05-12 15:11:03.440373	2026-05-12 15:11:03.440373
1579	\N	313	\N	Planejado	2026-05-12 15:11:03.440373	2026-05-12 15:11:03.440373
1580	\N	297	\N	Planejado	2026-05-12 15:11:03.440373	2026-05-12 15:11:03.440373
1491	\N	199	\N	Planejado	2026-05-11 15:34:05.241619	2026-05-11 15:34:05.241619
1492	\N	282	\N	Planejado	2026-05-11 15:34:05.241619	2026-05-11 15:34:05.241619
1493	\N	356	\N	Planejado	2026-05-11 15:34:05.241619	2026-05-11 15:34:05.241619
1026	\N	216	\N	Planejado	2026-05-06 14:50:04.188116	2026-05-06 14:50:04.188116
1027	\N	317	\N	Planejado	2026-05-06 14:50:04.188116	2026-05-06 14:50:04.188116
1028	\N	248	\N	Planejado	2026-05-06 14:50:04.188116	2026-05-06 14:50:04.188116
1029	\N	216	\N	Planejado	2026-05-06 14:50:39.512919	2026-05-06 14:50:39.512919
1030	\N	317	\N	Planejado	2026-05-06 14:50:39.512919	2026-05-06 14:50:39.512919
1031	\N	248	\N	Planejado	2026-05-06 14:50:39.512919	2026-05-06 14:50:39.512919
1032	\N	235	\N	Planejado	2026-05-06 14:50:39.512919	2026-05-06 14:50:39.512919
1033	\N	328	\N	Planejado	2026-05-06 14:50:39.512919	2026-05-06 14:50:39.512919
1034	\N	247	\N	Planejado	2026-05-06 14:50:39.512919	2026-05-06 14:50:39.512919
1035	\N	235	\N	Planejado	2026-05-06 14:51:18.844316	2026-05-06 14:51:18.844316
1036	\N	328	\N	Planejado	2026-05-06 14:51:18.844316	2026-05-06 14:51:18.844316
1037	\N	247	\N	Planejado	2026-05-06 14:51:18.844316	2026-05-06 14:51:18.844316
1038	\N	216	\N	Planejado	2026-05-06 14:51:18.844316	2026-05-06 14:51:18.844316
1039	\N	317	\N	Planejado	2026-05-06 14:51:18.844316	2026-05-06 14:51:18.844316
1040	\N	248	\N	Planejado	2026-05-06 14:51:18.844316	2026-05-06 14:51:18.844316
1041	\N	225	\N	Planejado	2026-05-06 14:51:18.844316	2026-05-06 14:51:18.844316
1042	\N	265	\N	Planejado	2026-05-06 14:51:18.844316	2026-05-06 14:51:18.844316
1043	\N	356	\N	Planejado	2026-05-06 14:51:18.844316	2026-05-06 14:51:18.844316
1044	\N	235	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1045	\N	328	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1046	\N	247	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1047	\N	225	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1048	\N	265	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1049	\N	356	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1050	\N	216	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1051	\N	317	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1052	\N	248	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1053	\N	204	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1054	\N	361	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1055	\N	230	\N	Planejado	2026-05-06 14:52:13.000037	2026-05-06 14:52:13.000037
1068	\N	203	\N	Planejado	2026-05-06 14:53:17.924209	2026-05-06 14:53:17.924209
1069	\N	215	\N	Planejado	2026-05-06 14:53:17.924209	2026-05-06 14:53:17.924209
1070	\N	210	\N	Planejado	2026-05-06 14:53:17.924209	2026-05-06 14:53:17.924209
1071	\N	203	\N	Planejado	2026-05-06 14:54:01.023236	2026-05-06 14:54:01.023236
1072	\N	215	\N	Planejado	2026-05-06 14:54:01.023236	2026-05-06 14:54:01.023236
1073	\N	210	\N	Planejado	2026-05-06 14:54:01.023236	2026-05-06 14:54:01.023236
1074	\N	230	\N	Planejado	2026-05-06 14:54:01.023236	2026-05-06 14:54:01.023236
1075	\N	359	\N	Planejado	2026-05-06 14:54:01.023236	2026-05-06 14:54:01.023236
1076	\N	248	\N	Planejado	2026-05-06 14:54:01.023236	2026-05-06 14:54:01.023236
1077	\N	203	\N	Planejado	2026-05-06 14:54:19.17129	2026-05-06 14:54:19.17129
1078	\N	215	\N	Planejado	2026-05-06 14:54:19.17129	2026-05-06 14:54:19.17129
1079	\N	210	\N	Planejado	2026-05-06 14:54:19.17129	2026-05-06 14:54:19.17129
1080	\N	230	\N	Planejado	2026-05-06 14:54:19.17129	2026-05-06 14:54:19.17129
1081	\N	359	\N	Planejado	2026-05-06 14:54:19.17129	2026-05-06 14:54:19.17129
1082	\N	248	\N	Planejado	2026-05-06 14:54:19.17129	2026-05-06 14:54:19.17129
1083	\N	203	\N	Planejado	2026-05-06 14:54:48.497741	2026-05-06 14:54:48.497741
1084	\N	215	\N	Planejado	2026-05-06 14:54:48.497741	2026-05-06 14:54:48.497741
1085	\N	210	\N	Planejado	2026-05-06 14:54:48.497741	2026-05-06 14:54:48.497741
1086	\N	230	\N	Planejado	2026-05-06 14:54:48.497741	2026-05-06 14:54:48.497741
1087	\N	359	\N	Planejado	2026-05-06 14:54:48.497741	2026-05-06 14:54:48.497741
1088	\N	248	\N	Planejado	2026-05-06 14:54:48.497741	2026-05-06 14:54:48.497741
1089	\N	199	\N	Planejado	2026-05-06 14:54:48.497741	2026-05-06 14:54:48.497741
1090	\N	265	\N	Planejado	2026-05-06 14:54:48.497741	2026-05-06 14:54:48.497741
1091	\N	225	\N	Planejado	2026-05-06 14:54:48.497741	2026-05-06 14:54:48.497741
1101	\N	229	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1102	\N	283	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1103	\N	286	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1092	\N	203	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1093	\N	215	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1094	\N	210	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1095	\N	230	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1096	\N	359	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1097	\N	248	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1098	\N	199	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1099	\N	265	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1100	\N	225	\N	Planejado	2026-05-06 14:55:49.768786	2026-05-06 14:55:49.768786
1104	\N	203	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1105	\N	215	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1106	\N	210	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1107	\N	229	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1108	\N	283	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1109	\N	286	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1110	\N	230	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1111	\N	359	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1112	\N	248	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1113	\N	199	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1114	\N	265	\N	Planejado	2026-05-06 14:55:59.899365	2026-05-06 14:55:59.899365
1022	\N	305	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1023	\N	243	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1024	\N	364	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1025	\N	242	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1014	\N	214	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1015	\N	296	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1016	\N	283	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1017	\N	213	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1018	\N	282	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1067	714	230	538	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.085324
1059	706	225	539	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.115937
1056	703	235	542	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.278927
1057	704	328	543	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.308308
1066	713	361	545	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.330886
1064	711	248	546	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.401062
1061	708	356	548	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.512654
1060	707	265	553	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.576856
1065	712	204	554	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.616986
1063	710	317	555	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.655996
1062	709	216	559	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.818226
1058	705	247	560	Planejado e executado	2026-05-06 14:52:19.549881	2026-05-08 14:09:59.835613
1131	\N	381	\N	Planejado	2026-05-06 14:57:21.7532	2026-05-06 14:57:21.7532
1132	\N	227	\N	Planejado	2026-05-06 14:57:21.7532	2026-05-06 14:57:21.7532
1133	\N	318	\N	Planejado	2026-05-06 14:57:21.7532	2026-05-06 14:57:21.7532
1134	\N	381	\N	Planejado	2026-05-06 14:58:20.940465	2026-05-06 14:58:20.940465
1135	\N	227	\N	Planejado	2026-05-06 14:58:20.940465	2026-05-06 14:58:20.940465
1136	\N	318	\N	Planejado	2026-05-06 14:58:20.940465	2026-05-06 14:58:20.940465
1137	\N	204	\N	Planejado	2026-05-06 14:58:20.940465	2026-05-06 14:58:20.940465
1138	\N	296	\N	Planejado	2026-05-06 14:58:20.940465	2026-05-06 14:58:20.940465
1139	\N	226	\N	Planejado	2026-05-06 14:58:20.940465	2026-05-06 14:58:20.940465
1140	\N	381	\N	Planejado	2026-05-06 14:58:57.190356	2026-05-06 14:58:57.190356
1141	\N	227	\N	Planejado	2026-05-06 14:58:57.190356	2026-05-06 14:58:57.190356
1142	\N	318	\N	Planejado	2026-05-06 14:58:57.190356	2026-05-06 14:58:57.190356
1143	\N	204	\N	Planejado	2026-05-06 14:58:57.190356	2026-05-06 14:58:57.190356
1144	\N	296	\N	Planejado	2026-05-06 14:58:57.190356	2026-05-06 14:58:57.190356
1145	\N	226	\N	Planejado	2026-05-06 14:58:57.190356	2026-05-06 14:58:57.190356
1146	\N	238	\N	Planejado	2026-05-06 14:58:57.190356	2026-05-06 14:58:57.190356
1147	\N	326	\N	Planejado	2026-05-06 14:58:57.190356	2026-05-06 14:58:57.190356
1148	\N	297	\N	Planejado	2026-05-06 14:58:57.190356	2026-05-06 14:58:57.190356
1149	\N	381	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1150	\N	227	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1151	\N	318	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1152	\N	238	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1153	\N	326	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1154	\N	297	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1155	\N	204	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1156	\N	296	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1157	\N	226	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1158	\N	214	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1159	\N	367	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1160	\N	313	\N	Planejado	2026-05-06 14:59:32.678434	2026-05-06 14:59:32.678434
1176	\N	213	\N	Planejado	2026-05-06 15:38:14.526	2026-05-06 15:38:14.526
1177	\N	341	\N	Planejado	2026-05-06 15:38:14.526	2026-05-06 15:38:14.526
1178	\N	277	\N	Planejado	2026-05-06 15:38:14.526	2026-05-06 15:38:14.526
1179	\N	213	\N	Planejado	2026-05-06 15:38:35.19932	2026-05-06 15:38:35.19932
1180	\N	341	\N	Planejado	2026-05-06 15:38:35.19932	2026-05-06 15:38:35.19932
1181	\N	277	\N	Planejado	2026-05-06 15:38:35.19932	2026-05-06 15:38:35.19932
1182	\N	213	\N	Planejado	2026-05-06 15:39:10.063316	2026-05-06 15:39:10.063316
1183	\N	341	\N	Planejado	2026-05-06 15:39:10.063316	2026-05-06 15:39:10.063316
1184	\N	277	\N	Planejado	2026-05-06 15:39:10.063316	2026-05-06 15:39:10.063316
1185	\N	320	\N	Planejado	2026-05-06 15:39:10.063316	2026-05-06 15:39:10.063316
1186	\N	325	\N	Planejado	2026-05-06 15:39:10.063316	2026-05-06 15:39:10.063316
1187	\N	368	\N	Planejado	2026-05-06 15:39:10.063316	2026-05-06 15:39:10.063316
1188	\N	213	\N	Planejado	2026-05-06 15:39:48.06004	2026-05-06 15:39:48.06004
1189	\N	341	\N	Planejado	2026-05-06 15:39:48.06004	2026-05-06 15:39:48.06004
1190	\N	277	\N	Planejado	2026-05-06 15:39:48.06004	2026-05-06 15:39:48.06004
1191	\N	320	\N	Planejado	2026-05-06 15:39:48.06004	2026-05-06 15:39:48.06004
1192	\N	325	\N	Planejado	2026-05-06 15:39:48.06004	2026-05-06 15:39:48.06004
1193	\N	368	\N	Planejado	2026-05-06 15:39:48.06004	2026-05-06 15:39:48.06004
1194	\N	216	\N	Planejado	2026-05-06 15:39:48.06004	2026-05-06 15:39:48.06004
1195	\N	283	\N	Planejado	2026-05-06 15:39:48.06004	2026-05-06 15:39:48.06004
1196	\N	353	\N	Planejado	2026-05-06 15:39:48.06004	2026-05-06 15:39:48.06004
1197	\N	213	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1198	\N	341	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1199	\N	277	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1200	\N	216	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1201	\N	283	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1202	\N	353	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1203	\N	320	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1204	\N	325	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1205	\N	368	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1206	\N	243	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1207	\N	349	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1208	\N	364	\N	Planejado	2026-05-06 15:40:52.328123	2026-05-06 15:40:52.328123
1220	867	364	\N	Planejado	2026-05-06 15:41:02.55185	2026-05-06 15:41:02.55185
1019	\N	277	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1020	\N	205	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1021	\N	239	\N	Planejado e não Executado	2026-05-06 14:48:53.993887	2026-05-06 14:48:53.993887
1215	862	320	595	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.113559
1209	856	213	596	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.184399
1216	863	325	597	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.311123
1211	858	277	598	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.338569
1214	861	353	600	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.445477
1219	866	349	601	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.478306
1217	864	368	602	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.523611
1221	\N	214	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1222	\N	296	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1223	\N	283	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1224	\N	213	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1225	\N	282	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1174	821	362	563	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:28.892989
1130	777	259	564	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:28.913417
1172	819	226	565	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:28.923604
1163	810	318	566	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:28.949239
1175	822	260	568	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:28.981785
1169	816	297	572	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:29.111066
1168	815	326	579	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:29.368122
1166	813	313	580	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:29.385119
1170	817	204	581	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:29.401754
1171	818	296	583	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:29.472029
1165	812	367	584	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:29.485132
1173	820	207	588	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:29.580377
1167	814	238	590	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:29.601
1164	811	214	591	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:29.620014
1162	809	227	592	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:29.660074
1161	808	381	594	Planejado e executado	2026-05-06 15:00:16.243808	2026-05-10 12:33:44.962306
1213	860	283	603	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.545576
1210	857	341	605	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.623053
1218	865	243	606	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.733834
1212	859	216	607	Planejado e executado	2026-05-06 15:41:02.55185	2026-05-11 13:38:20.747271
1502	\N	356	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1503	\N	225	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1504	\N	364	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1587	\N	238	\N	Planejado	2026-05-12 15:11:38.684732	2026-05-12 15:11:38.684732
1226	\N	277	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1227	\N	205	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1228	\N	239	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1229	\N	305	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1230	\N	243	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1231	\N	364	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1232	\N	242	\N	Planejado e não Executado	2026-05-06 16:43:41.402868	2026-05-06 16:43:41.402868
1238	885	277	\N	Planejado e não Executado	2026-05-06 16:43:43.863761	2026-05-06 16:43:43.863761
956	892	229	517	Planejado e executado	2026-05-05 16:00:44.598851	2026-05-06 16:43:49.331756
1245	893	316	\N	Planejado e não Executado	2026-05-06 16:43:49.331756	2026-05-06 16:43:49.331756
1246	894	377	\N	Planejado e não Executado	2026-05-06 16:43:49.331756	2026-05-06 16:43:49.331756
959	895	260	485	Planejado e executado	2026-05-05 16:00:44.598851	2026-05-06 16:43:49.331756
960	896	355	500	Planejado e executado	2026-05-05 16:00:44.598851	2026-05-06 16:43:49.331756
1247	897	331	\N	Planejado e não Executado	2026-05-06 16:43:49.331756	2026-05-06 16:43:49.331756
962	898	237	499	Planejado e executado	2026-05-05 16:00:44.598851	2026-05-06 16:43:49.331756
963	899	367	511	Planejado e executado	2026-05-05 16:00:44.598851	2026-05-06 16:43:49.331756
964	900	362	483	Planejado e executado	2026-05-05 16:00:44.598851	2026-05-06 16:43:49.331756
965	901	342	512	Planejado e executado	2026-05-05 16:00:44.598851	2026-05-06 16:43:49.331756
966	902	321	509	Planejado e executado	2026-05-05 16:00:44.598851	2026-05-06 16:43:49.331756
967	903	360	494	Planejado e executado	2026-05-05 16:00:44.598851	2026-05-06 16:43:49.331756
1248	\N	239	\N	Planejado	2026-05-07 13:56:54.535049	2026-05-07 13:56:54.535049
1249	\N	347	\N	Planejado	2026-05-07 13:56:54.535049	2026-05-07 13:56:54.535049
1250	\N	317	\N	Planejado	2026-05-07 13:56:54.535049	2026-05-07 13:56:54.535049
1251	\N	239	\N	Planejado	2026-05-07 13:57:33.47819	2026-05-07 13:57:33.47819
1252	\N	347	\N	Planejado	2026-05-07 13:57:33.47819	2026-05-07 13:57:33.47819
1253	\N	317	\N	Planejado	2026-05-07 13:57:33.47819	2026-05-07 13:57:33.47819
1254	\N	213	\N	Planejado	2026-05-07 13:57:33.47819	2026-05-07 13:57:33.47819
1255	\N	329	\N	Planejado	2026-05-07 13:57:33.47819	2026-05-07 13:57:33.47819
1256	\N	325	\N	Planejado	2026-05-07 13:57:33.47819	2026-05-07 13:57:33.47819
1257	\N	213	\N	Planejado	2026-05-07 13:58:09.582867	2026-05-07 13:58:09.582867
1258	\N	329	\N	Planejado	2026-05-07 13:58:09.582867	2026-05-07 13:58:09.582867
1259	\N	325	\N	Planejado	2026-05-07 13:58:09.582867	2026-05-07 13:58:09.582867
1260	\N	239	\N	Planejado	2026-05-07 13:58:09.582867	2026-05-07 13:58:09.582867
1261	\N	347	\N	Planejado	2026-05-07 13:58:09.582867	2026-05-07 13:58:09.582867
1262	\N	317	\N	Planejado	2026-05-07 13:58:09.582867	2026-05-07 13:58:09.582867
1263	\N	286	\N	Planejado	2026-05-07 13:58:09.582867	2026-05-07 13:58:09.582867
1264	\N	324	\N	Planejado	2026-05-07 13:58:09.582867	2026-05-07 13:58:09.582867
1265	\N	339	\N	Planejado	2026-05-07 13:58:09.582867	2026-05-07 13:58:09.582867
1266	\N	213	\N	Planejado	2026-05-07 13:59:12.678083	2026-05-07 13:59:12.678083
1267	\N	329	\N	Planejado	2026-05-07 13:59:12.678083	2026-05-07 13:59:12.678083
1268	\N	325	\N	Planejado	2026-05-07 13:59:12.678083	2026-05-07 13:59:12.678083
1269	\N	239	\N	Planejado	2026-05-07 13:59:12.678083	2026-05-07 13:59:12.678083
1270	\N	347	\N	Planejado	2026-05-07 13:59:12.678083	2026-05-07 13:59:12.678083
1271	\N	317	\N	Planejado	2026-05-07 13:59:12.678083	2026-05-07 13:59:12.678083
1272	\N	242	\N	Planejado	2026-05-07 13:59:12.678083	2026-05-07 13:59:12.678083
1273	\N	324	\N	Planejado	2026-05-07 13:59:12.678083	2026-05-07 13:59:12.678083
1274	\N	339	\N	Planejado	2026-05-07 13:59:12.678083	2026-05-07 13:59:12.678083
1284	\N	220	\N	Planejado	2026-05-07 14:00:15.525637	2026-05-07 14:00:15.525637
1285	\N	359	\N	Planejado	2026-05-07 14:00:15.525637	2026-05-07 14:00:15.525637
1286	\N	242	\N	Planejado	2026-05-07 14:00:15.525637	2026-05-07 14:00:15.525637
1287	\N	220	\N	Planejado	2026-05-07 14:00:54.767486	2026-05-07 14:00:54.767486
1288	\N	359	\N	Planejado	2026-05-07 14:00:54.767486	2026-05-07 14:00:54.767486
1289	\N	242	\N	Planejado	2026-05-07 14:00:54.767486	2026-05-07 14:00:54.767486
1290	\N	199	\N	Planejado	2026-05-07 14:00:54.767486	2026-05-07 14:00:54.767486
1291	\N	376	\N	Planejado	2026-05-07 14:00:54.767486	2026-05-07 14:00:54.767486
1292	\N	382	\N	Planejado	2026-05-07 14:00:54.767486	2026-05-07 14:00:54.767486
1293	\N	199	\N	Planejado	2026-05-07 14:01:30.329308	2026-05-07 14:01:30.329308
1294	\N	376	\N	Planejado	2026-05-07 14:01:30.329308	2026-05-07 14:01:30.329308
1295	\N	382	\N	Planejado	2026-05-07 14:01:30.329308	2026-05-07 14:01:30.329308
1296	\N	220	\N	Planejado	2026-05-07 14:01:30.329308	2026-05-07 14:01:30.329308
1297	\N	359	\N	Planejado	2026-05-07 14:01:30.329308	2026-05-07 14:01:30.329308
1298	\N	242	\N	Planejado	2026-05-07 14:01:30.329308	2026-05-07 14:01:30.329308
1299	\N	214	\N	Planejado	2026-05-07 14:01:30.329308	2026-05-07 14:01:30.329308
1300	\N	265	\N	Planejado	2026-05-07 14:01:30.329308	2026-05-07 14:01:30.329308
1301	\N	229	\N	Planejado	2026-05-07 14:01:30.329308	2026-05-07 14:01:30.329308
1302	\N	199	\N	Planejado	2026-05-07 14:02:03.736815	2026-05-07 14:02:03.736815
1303	\N	376	\N	Planejado	2026-05-07 14:02:03.736815	2026-05-07 14:02:03.736815
1304	\N	382	\N	Planejado	2026-05-07 14:02:03.736815	2026-05-07 14:02:03.736815
1305	\N	214	\N	Planejado	2026-05-07 14:02:03.736815	2026-05-07 14:02:03.736815
1306	\N	265	\N	Planejado	2026-05-07 14:02:03.736815	2026-05-07 14:02:03.736815
1307	\N	229	\N	Planejado	2026-05-07 14:02:03.736815	2026-05-07 14:02:03.736815
1308	\N	220	\N	Planejado	2026-05-07 14:02:03.736815	2026-05-07 14:02:03.736815
1309	\N	359	\N	Planejado	2026-05-07 14:02:03.736815	2026-05-07 14:02:03.736815
1310	\N	242	\N	Planejado	2026-05-07 14:02:03.736815	2026-05-07 14:02:03.736815
1237	884	282	522	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:32.173194
1244	891	242	523	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:32.260009
1236	883	213	524	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:32.295135
1241	888	305	527	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:32.402179
1243	890	364	528	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:32.480107
1235	882	283	529	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:32.580337
1234	881	296	531	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:32.640155
1233	880	214	533	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:32.734888
1240	887	239	534	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:32.74798
1242	889	243	535	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:32.755285
1239	886	205	537	Planejado e executado	2026-05-06 16:43:43.863761	2026-05-07 15:41:48.989829
1278	\N	239	\N	Planejado	2026-05-07 13:59:42.325619	2026-05-07 13:59:42.325619
1279	\N	347	\N	Planejado	2026-05-07 13:59:42.325619	2026-05-07 13:59:42.325619
1280	\N	317	\N	Planejado	2026-05-07 13:59:42.325619	2026-05-07 13:59:42.325619
1275	\N	213	\N	Planejado	2026-05-07 13:59:42.325619	2026-05-07 13:59:42.325619
1276	\N	329	\N	Planejado	2026-05-07 13:59:42.325619	2026-05-07 13:59:42.325619
1277	\N	325	\N	Planejado	2026-05-07 13:59:42.325619	2026-05-07 13:59:42.325619
1281	\N	286	\N	Planejado	2026-05-07 13:59:42.325619	2026-05-07 13:59:42.325619
1282	\N	324	\N	Planejado	2026-05-07 13:59:42.325619	2026-05-07 13:59:42.325619
1283	\N	339	\N	Planejado	2026-05-07 13:59:42.325619	2026-05-07 13:59:42.325619
1494	\N	203	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1495	\N	317	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1496	\N	305	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1497	\N	237	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1498	\N	355	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1499	\N	327	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1500	\N	199	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1501	\N	282	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1312	968	376	635	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:36.932536
1311	967	199	638	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:37.021712
1314	970	214	639	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:37.050758
1316	972	229	640	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:37.118418
1320	976	207	\N	Planejado	2026-05-07 14:02:46.955011	2026-05-07 14:02:46.955011
1323	\N	236	\N	Planejado	2026-05-07 14:03:37.793162	2026-05-07 14:03:37.793162
1324	\N	367	\N	Planejado	2026-05-07 14:03:37.793162	2026-05-07 14:03:37.793162
1325	\N	286	\N	Planejado	2026-05-07 14:03:37.793162	2026-05-07 14:03:37.793162
1326	\N	236	\N	Planejado	2026-05-07 14:04:25.273603	2026-05-07 14:04:25.273603
1327	\N	367	\N	Planejado	2026-05-07 14:04:25.273603	2026-05-07 14:04:25.273603
1328	\N	286	\N	Planejado	2026-05-07 14:04:25.273603	2026-05-07 14:04:25.273603
1329	\N	199	\N	Planejado	2026-05-07 14:04:25.273603	2026-05-07 14:04:25.273603
1330	\N	326	\N	Planejado	2026-05-07 14:04:25.273603	2026-05-07 14:04:25.273603
1331	\N	318	\N	Planejado	2026-05-07 14:04:25.273603	2026-05-07 14:04:25.273603
1332	\N	199	\N	Planejado	2026-05-07 14:04:35.078581	2026-05-07 14:04:35.078581
1333	\N	326	\N	Planejado	2026-05-07 14:04:35.078581	2026-05-07 14:04:35.078581
1334	\N	318	\N	Planejado	2026-05-07 14:04:35.078581	2026-05-07 14:04:35.078581
1335	\N	236	\N	Planejado	2026-05-07 14:04:35.078581	2026-05-07 14:04:35.078581
1336	\N	367	\N	Planejado	2026-05-07 14:04:35.078581	2026-05-07 14:04:35.078581
1337	\N	286	\N	Planejado	2026-05-07 14:04:35.078581	2026-05-07 14:04:35.078581
1338	\N	199	\N	Planejado	2026-05-07 14:05:12.555475	2026-05-07 14:05:12.555475
1339	\N	326	\N	Planejado	2026-05-07 14:05:12.555475	2026-05-07 14:05:12.555475
1340	\N	318	\N	Planejado	2026-05-07 14:05:12.555475	2026-05-07 14:05:12.555475
1341	\N	236	\N	Planejado	2026-05-07 14:05:12.555475	2026-05-07 14:05:12.555475
1342	\N	367	\N	Planejado	2026-05-07 14:05:12.555475	2026-05-07 14:05:12.555475
1343	\N	286	\N	Planejado	2026-05-07 14:05:12.555475	2026-05-07 14:05:12.555475
1344	\N	277	\N	Planejado	2026-05-07 14:05:12.555475	2026-05-07 14:05:12.555475
1345	\N	339	\N	Planejado	2026-05-07 14:05:12.555475	2026-05-07 14:05:12.555475
1346	\N	260	\N	Planejado	2026-05-07 14:05:12.555475	2026-05-07 14:05:12.555475
1359	\N	220	\N	Planejado	2026-05-07 14:06:46.846677	2026-05-07 14:06:46.846677
1360	\N	359	\N	Planejado	2026-05-07 14:06:46.846677	2026-05-07 14:06:46.846677
1361	\N	248	\N	Planejado	2026-05-07 14:06:46.846677	2026-05-07 14:06:46.846677
1362	\N	220	\N	Planejado	2026-05-07 14:07:37.061215	2026-05-07 14:07:37.061215
1363	\N	359	\N	Planejado	2026-05-07 14:07:37.061215	2026-05-07 14:07:37.061215
1364	\N	248	\N	Planejado	2026-05-07 14:07:37.061215	2026-05-07 14:07:37.061215
1365	\N	229	\N	Planejado	2026-05-07 14:07:37.061215	2026-05-07 14:07:37.061215
1366	\N	325	\N	Planejado	2026-05-07 14:07:37.061215	2026-05-07 14:07:37.061215
1367	\N	282	\N	Planejado	2026-05-07 14:07:37.061215	2026-05-07 14:07:37.061215
1368	\N	229	\N	Planejado	2026-05-07 14:08:09.725008	2026-05-07 14:08:09.725008
1369	\N	325	\N	Planejado	2026-05-07 14:08:09.725008	2026-05-07 14:08:09.725008
1370	\N	282	\N	Planejado	2026-05-07 14:08:09.725008	2026-05-07 14:08:09.725008
1371	\N	220	\N	Planejado	2026-05-07 14:08:09.725008	2026-05-07 14:08:09.725008
1372	\N	359	\N	Planejado	2026-05-07 14:08:09.725008	2026-05-07 14:08:09.725008
1373	\N	248	\N	Planejado	2026-05-07 14:08:09.725008	2026-05-07 14:08:09.725008
1374	\N	239	\N	Planejado	2026-05-07 14:08:09.725008	2026-05-07 14:08:09.725008
1375	\N	355	\N	Planejado	2026-05-07 14:08:09.725008	2026-05-07 14:08:09.725008
1376	\N	347	\N	Planejado	2026-05-07 14:08:09.725008	2026-05-07 14:08:09.725008
1377	\N	229	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1378	\N	325	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1379	\N	282	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1380	\N	239	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1381	\N	355	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1382	\N	347	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1383	\N	220	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1384	\N	359	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1385	\N	248	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1386	\N	331	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1387	\N	377	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1388	\N	364	\N	Planejado	2026-05-07 14:08:46.204555	2026-05-07 14:08:46.204555
1398	1054	331	\N	Planejado	2026-05-07 14:08:52.492515	2026-05-07 14:08:52.492515
1353	\N	236	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
1354	\N	367	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
1355	\N	286	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
1347	\N	199	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
1348	\N	326	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
310	1067	369	307	Planejado e executado	2026-04-28 16:00:26.872276	2026-05-07 14:14:02.355288
364	1068	229	361	Planejado e executado	2026-04-28 16:00:27.153942	2026-05-07 14:14:02.355288
188	1069	230	185	Planejado e executado	2026-04-28 16:00:26.184883	2026-05-07 14:14:02.355288
248	1070	315	245	Planejado e executado	2026-04-28 16:00:26.526402	2026-05-07 14:14:02.355288
1401	1072	204	\N	Planejado e não Executado	2026-05-07 14:14:02.355288	2026-05-07 14:14:02.355288
1402	1073	377	\N	Planejado e não Executado	2026-05-07 14:14:02.355288	2026-05-07 14:14:02.355288
1403	1074	241	\N	Planejado e não Executado	2026-05-07 14:14:02.355288	2026-05-07 14:14:02.355288
244	1107	210	241	Planejado e executado	2026-04-28 16:00:26.504394	2026-05-07 14:18:07.714963
192	1108	271	189	Planejado e executado	2026-04-28 16:00:26.214646	2026-05-07 14:18:07.714963
194	1109	329	191	Planejado e executado	2026-04-28 16:00:26.226172	2026-05-07 14:18:07.714963
1349	\N	318	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
1350	\N	277	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
1351	\N	339	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
1352	\N	260	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
1356	\N	243	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
297	1111	205	294	Planejado e executado	2026-04-28 16:00:26.801971	2026-05-07 14:18:07.714963
198	1112	347	195	Planejado e executado	2026-04-28 16:00:26.251846	2026-05-07 14:18:07.714963
356	1113	239	353	Planejado e executado	2026-04-28 16:00:27.113894	2026-05-07 14:18:07.714963
367	1114	381	364	Planejado e executado	2026-04-28 16:00:46.440994	2026-05-07 14:18:07.714963
201	1115	282	198	Planejado e executado	2026-04-28 16:00:26.267712	2026-05-07 14:18:07.714963
260	1116	248	257	Planejado e executado	2026-04-28 16:00:26.592611	2026-05-07 14:18:07.714963
1357	\N	360	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
1358	\N	321	\N	Planejado	2026-05-07 14:05:55.061533	2026-05-07 14:05:55.061533
1505	\N	377	\N	Planejado	2026-05-11 15:34:44.255896	2026-05-11 15:34:44.255896
1322	978	230	627	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:36.2004
1319	975	242	628	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:36.339717
1318	974	359	629	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:36.352382
1317	973	220	630	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:36.418977
1321	977	276	631	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:36.525117
1394	1050	347	660	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:05.903199
1391	1047	282	661	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:05.920953
1396	1052	359	662	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:05.993984
1395	1051	220	663	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:06.108907
1390	1046	325	664	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:06.22091
1397	1053	248	665	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:06.234763
1400	1056	364	666	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:06.31816
1393	1049	355	667	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:06.342121
1399	1055	377	668	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:06.499934
1392	1048	239	669	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:06.661874
1389	1045	229	671	Planejado e executado	2026-05-07 14:08:52.492515	2026-05-15 15:55:06.714384
231	1117	235	228	Planejado e executado	2026-04-28 16:00:26.432066	2026-05-07 14:18:07.714963
207	1118	259	204	Planejado e executado	2026-04-28 16:00:26.299717	2026-05-07 14:18:07.714963
270	1119	253	267	Planejado e executado	2026-04-28 16:00:26.647243	2026-05-07 14:18:07.714963
351	1141	238	348	Planejado e executado	2026-04-28 16:00:27.088921	2026-05-07 14:20:44.659315
333	1142	376	330	Planejado e executado	2026-04-28 16:00:26.996626	2026-05-07 14:20:44.659315
304	1143	313	301	Planejado e executado	2026-04-28 16:00:26.839087	2026-05-07 14:20:44.659315
326	1145	367	323	Planejado e executado	2026-04-28 16:00:26.958233	2026-05-07 14:20:44.659315
323	1146	296	320	Planejado e executado	2026-04-28 16:00:26.942588	2026-05-07 14:20:44.659315
1516	\N	282	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
1517	\N	356	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
212	1190	340	209	Planejado e executado	2026-04-28 16:00:26.327603	2026-05-07 14:34:59.259778
215	1191	320	212	Planejado e executado	2026-04-28 16:00:26.346566	2026-05-07 14:34:59.259778
219	1216	242	216	Planejado e executado	2026-04-28 16:00:26.36804	2026-05-07 14:37:27.375985
269	1218	261	266	Planejado e executado	2026-04-28 16:00:26.642048	2026-05-07 14:37:27.375985
280	1219	237	277	Planejado e executado	2026-04-28 16:00:26.70174	2026-05-07 14:37:27.375985
284	1220	355	281	Planejado e executado	2026-04-28 16:00:26.724179	2026-05-07 14:37:27.375985
264	1223	374	261	Planejado e executado	2026-04-28 16:00:26.613596	2026-05-07 14:37:27.375985
232	1224	235	229	Planejado e executado	2026-04-28 16:00:26.437367	2026-05-07 14:37:27.375985
303	1277	326	300	Planejado e executado	2026-04-28 16:00:26.834082	2026-05-07 14:49:44.158961
309	1278	283	306	Planejado e executado	2026-04-28 16:00:26.86707	2026-05-07 14:49:44.158961
365	1279	229	362	Planejado e executado	2026-04-28 16:00:27.15958	2026-05-07 14:49:44.158961
1518	\N	255	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
325	1350	296	322	Planejado e executado	2026-04-28 16:00:26.952834	2026-05-07 15:01:04.773072
350	1357	207	347	Planejado e executado	2026-04-28 16:00:27.083908	2026-05-07 15:01:04.773072
1404	1424	288	\N	Planejado e não Executado	2026-05-07 15:08:44.509707	2026-05-07 15:08:44.509707
866	1466	296	455	Planejado e executado	2026-05-04 15:19:32.691532	2026-05-07 15:11:39.874649
1405	\N	220	525	Apenas executado	2026-05-07 15:41:32.306191	2026-05-07 15:41:32.306191
1406	\N	249	526	Apenas executado	2026-05-07 15:41:32.385856	2026-05-07 15:41:32.385856
1407	\N	377	530	Apenas executado	2026-05-07 15:41:32.620007	2026-05-07 15:41:32.620007
1408	\N	206	532	Apenas executado	2026-05-07 15:41:32.684037	2026-05-07 15:41:32.684037
1409	\N	381	536	Apenas executado	2026-05-07 15:41:48.937136	2026-05-07 15:41:48.937136
1413	1471	286	\N	Planejado	2026-05-07 15:56:40.534305	2026-05-07 15:56:40.534305
1419	\N	287	540	Apenas executado	2026-05-08 14:09:59.143084	2026-05-08 14:09:59.143084
1420	\N	288	541	Apenas executado	2026-05-08 14:09:59.243327	2026-05-08 14:09:59.243327
1421	\N	196	544	Apenas executado	2026-05-08 14:09:59.320108	2026-05-08 14:09:59.320108
1422	\N	385	547	Apenas executado	2026-05-08 14:09:59.451023	2026-05-08 14:09:59.451023
1423	\N	384	549	Apenas executado	2026-05-08 14:09:59.553986	2026-05-08 14:09:59.553986
1424	\N	384	550	Apenas executado	2026-05-08 14:09:59.559236	2026-05-08 14:09:59.559236
1425	\N	384	551	Apenas executado	2026-05-08 14:09:59.564468	2026-05-08 14:09:59.564468
1426	\N	384	552	Apenas executado	2026-05-08 14:09:59.569948	2026-05-08 14:09:59.569948
1427	\N	206	556	Apenas executado	2026-05-08 14:09:59.727223	2026-05-08 14:09:59.727223
1428	\N	252	557	Apenas executado	2026-05-08 14:09:59.742243	2026-05-08 14:09:59.742243
1429	\N	224	558	Apenas executado	2026-05-08 14:09:59.792118	2026-05-08 14:09:59.792118
1122	769	230	561	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:28.819979
1127	774	225	562	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:28.849569
1430	\N	288	569	Apenas executado	2026-05-10 12:33:29.008255	2026-05-10 12:33:29.008255
1431	\N	360	574	Apenas executado	2026-05-10 12:33:29.204201	2026-05-10 12:33:29.204201
1128	775	255	575	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.285113
1432	\N	258	576	Apenas executado	2026-05-10 12:33:29.30407	2026-05-10 12:33:29.30407
1433	\N	221	585	Apenas executado	2026-05-10 12:33:29.551001	2026-05-10 12:33:29.551001
1129	776	324	586	Planejado e executado	2026-05-06 14:56:34.652362	2026-05-10 12:33:29.556217
1519	\N	259	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
1520	\N	318	\N	Planejado	2026-05-11 15:36:53.520729	2026-05-11 15:36:53.520729
1411	1469	329	609	Planejado e executado	2026-05-07 15:56:40.534305	2026-05-12 12:11:42.388723
1418	1476	347	610	Planejado e executado	2026-05-07 15:56:40.534305	2026-05-12 12:11:42.424291
1410	1468	213	613	Planejado e executado	2026-05-07 15:56:40.534305	2026-05-12 12:11:42.572938
1412	1470	325	616	Planejado e executado	2026-05-07 15:56:40.534305	2026-05-12 12:11:42.726881
1417	1475	355	618	Planejado e executado	2026-05-07 15:56:40.534305	2026-05-12 12:11:42.854469
1416	1474	317	620	Planejado e executado	2026-05-07 15:56:40.534305	2026-05-12 12:11:43.028039
1415	1473	339	621	Planejado e executado	2026-05-07 15:56:40.534305	2026-05-12 12:11:43.047436
1414	1472	324	623	Planejado e executado	2026-05-07 15:56:40.534305	2026-05-12 12:11:43.152581
1581	\N	199	\N	Planejado	2026-05-12 15:11:38.684732	2026-05-12 15:11:38.684732
1582	\N	230	\N	Planejado	2026-05-12 15:11:38.684732	2026-05-12 15:11:38.684732
1583	\N	331	\N	Planejado	2026-05-12 15:11:38.684732	2026-05-12 15:11:38.684732
1584	\N	204	\N	Planejado	2026-05-12 15:11:38.684732	2026-05-12 15:11:38.684732
1585	\N	313	\N	Planejado	2026-05-12 15:11:38.684732	2026-05-12 15:11:38.684732
1586	\N	297	\N	Planejado	2026-05-12 15:11:38.684732	2026-05-12 15:11:38.684732
1588	\N	328	\N	Planejado	2026-05-12 15:11:38.684732	2026-05-12 15:11:38.684732
1589	\N	225	\N	Planejado	2026-05-12 15:11:38.684732	2026-05-12 15:11:38.684732
1590	\N	199	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1591	\N	230	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1592	\N	331	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1593	\N	238	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1594	\N	328	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1595	\N	225	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1596	\N	204	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1597	\N	313	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1598	\N	297	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1599	\N	247	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1600	\N	326	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1601	\N	364	\N	Planejado	2026-05-12 15:12:46.998075	2026-05-12 15:12:46.998075
1634	\N	305	\N	Planejado	2026-05-12 15:15:10.367305	2026-05-12 15:15:10.367305
1641	\N	382	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1642	\N	350	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1643	\N	320	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1644	\N	214	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1645	\N	339	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1646	\N	315	\N	Planejado	2026-05-12 15:15:41.499926	2026-05-12 15:15:41.499926
1613	\N	297	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1614	\N	207	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1615	\N	376	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1616	\N	242	\N	Planejado	2026-05-12 15:13:23.375321	2026-05-12 15:13:23.375321
1659	\N	243	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1660	\N	362	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1661	\N	276	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1650	\N	214	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1651	\N	339	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1652	\N	315	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1647	\N	213	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1648	\N	277	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1649	\N	227	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1662	\N	199	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1663	\N	230	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1664	\N	331	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1665	\N	247	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1666	\N	326	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1667	\N	364	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1668	\N	238	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1669	\N	328	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1670	\N	225	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1671	\N	204	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1672	\N	359	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1673	\N	297	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1674	\N	207	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1675	\N	376	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1676	\N	242	\N	Planejado	2026-05-12 15:22:21.471707	2026-05-12 15:22:21.471707
1677	1708	199	\N	Planejado	2026-05-12 15:24:00.394105	2026-05-12 15:24:00.394105
1682	1713	364	\N	Planejado	2026-05-12 15:24:00.394105	2026-05-12 15:24:00.394105
1313	969	382	626	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:22.252044
1692	\N	286	632	Apenas executado	2026-05-13 11:15:36.71326	2026-05-13 11:15:36.71326
1315	971	265	633	Planejado e executado	2026-05-07 14:02:46.955011	2026-05-13 11:15:36.752661
1693	\N	301	634	Apenas executado	2026-05-13 11:15:36.776201	2026-05-13 11:15:36.776201
1694	\N	252	636	Apenas executado	2026-05-13 11:15:36.966639	2026-05-13 11:15:36.966639
1695	\N	221	637	Apenas executado	2026-05-13 11:15:36.987823	2026-05-13 11:15:36.987823
1656	\N	382	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1657	\N	350	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1658	\N	320	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1653	\N	260	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1654	\N	341	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1655	\N	305	\N	Planejado	2026-05-12 15:16:26.940902	2026-05-12 15:16:26.940902
1696	\N	213	\N	Planejado	2026-05-13 11:39:01.027497	2026-05-13 11:39:01.027497
1697	\N	277	\N	Planejado	2026-05-13 11:39:01.027497	2026-05-13 11:39:01.027497
1698	\N	227	\N	Planejado	2026-05-13 11:39:01.027497	2026-05-13 11:39:01.027497
1699	\N	260	\N	Planejado	2026-05-13 11:39:01.027497	2026-05-13 11:39:01.027497
1700	\N	341	\N	Planejado	2026-05-13 11:39:01.027497	2026-05-13 11:39:01.027497
1701	\N	305	\N	Planejado	2026-05-13 11:39:01.027497	2026-05-13 11:39:01.027497
1702	\N	382	\N	Planejado	2026-05-13 11:39:01.027497	2026-05-13 11:39:01.027497
1703	\N	350	\N	Planejado	2026-05-13 11:39:01.027497	2026-05-13 11:39:01.027497
1704	\N	315	\N	Planejado	2026-05-13 11:39:01.027497	2026-05-13 11:39:01.027497
1705	\N	213	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1706	\N	277	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1707	\N	227	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1708	\N	260	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1709	\N	341	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1710	\N	305	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1711	\N	382	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1712	\N	350	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1713	\N	315	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1714	\N	214	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1715	\N	339	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1716	\N	276	\N	Planejado	2026-05-13 11:39:36.835764	2026-05-13 11:39:36.835764
1717	\N	214	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1718	\N	339	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1719	\N	276	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1720	\N	213	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1721	\N	277	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1722	\N	227	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1723	\N	260	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1724	\N	341	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1725	\N	305	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1726	\N	382	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1727	\N	350	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1728	\N	315	\N	Planejado	2026-05-13 11:39:54.570196	2026-05-13 11:39:54.570196
1735	1762	260	\N	Planejado	2026-05-13 11:40:30.21039	2026-05-13 11:40:30.21039
1740	1767	315	\N	Planejado	2026-05-13 11:40:30.21039	2026-05-13 11:40:30.21039
1744	\N	220	\N	Planejado	2026-05-13 20:10:26.463611	2026-05-13 20:10:26.463611
1745	\N	282	\N	Planejado	2026-05-13 20:10:26.463611	2026-05-13 20:10:26.463611
1746	\N	248	\N	Planejado	2026-05-13 20:10:26.463611	2026-05-13 20:10:26.463611
1747	\N	220	\N	Planejado	2026-05-13 20:11:12.679029	2026-05-13 20:11:12.679029
1748	\N	282	\N	Planejado	2026-05-13 20:11:12.679029	2026-05-13 20:11:12.679029
1749	\N	248	\N	Planejado	2026-05-13 20:11:12.679029	2026-05-13 20:11:12.679029
1750	\N	225	\N	Planejado	2026-05-13 20:11:12.679029	2026-05-13 20:11:12.679029
1751	\N	283	\N	Planejado	2026-05-13 20:11:12.679029	2026-05-13 20:11:12.679029
1752	\N	229	\N	Planejado	2026-05-13 20:11:12.679029	2026-05-13 20:11:12.679029
1753	\N	225	\N	Planejado	2026-05-13 20:12:03.572077	2026-05-13 20:12:03.572077
1754	\N	283	\N	Planejado	2026-05-13 20:12:03.572077	2026-05-13 20:12:03.572077
1755	\N	229	\N	Planejado	2026-05-13 20:12:03.572077	2026-05-13 20:12:03.572077
1756	\N	220	\N	Planejado	2026-05-13 20:12:03.572077	2026-05-13 20:12:03.572077
1757	\N	282	\N	Planejado	2026-05-13 20:12:03.572077	2026-05-13 20:12:03.572077
1758	\N	248	\N	Planejado	2026-05-13 20:12:03.572077	2026-05-13 20:12:03.572077
1759	\N	235	\N	Planejado	2026-05-13 20:12:03.572077	2026-05-13 20:12:03.572077
1678	1709	230	699	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.8343
1742	1769	362	700	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.844704
1691	1722	242	702	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.855171
1687	1718	359	703	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.860233
1729	1756	213	704	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.865287
1684	1715	328	705	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.87035
1688	1719	297	706	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.875212
1734	1761	276	707	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.879968
1737	1764	305	708	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.884783
1730	1757	277	709	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.889564
1681	1712	326	712	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.90368
1685	1716	313	713	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.908468
1686	1717	204	714	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.913248
1679	1710	331	715	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.91793
1733	1760	339	717	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.927261
1736	1763	341	719	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.936662
1690	1721	376	720	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.941406
1689	1720	207	722	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.950951
1741	1768	207	723	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.955916
1683	1714	238	724	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.960644
1732	1759	214	725	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.965298
1743	1770	243	726	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.969942
1731	1758	227	727	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.974649
1680	1711	247	728	Planejado e executado	2026-05-12 15:24:00.394105	2026-05-18 12:29:31.979317
1739	1766	350	729	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:31.983975
1738	1765	382	731	Planejado e executado	2026-05-13 11:40:30.21039	2026-05-18 12:29:44.958847
1760	\N	349	\N	Planejado	2026-05-13 20:12:03.572077	2026-05-13 20:12:03.572077
1761	\N	325	\N	Planejado	2026-05-13 20:12:03.572077	2026-05-13 20:12:03.572077
1765	1792	220	\N	Planejado	2026-05-13 20:12:14.524112	2026-05-13 20:12:14.524112
1768	1795	235	\N	Planejado	2026-05-13 20:12:14.524112	2026-05-13 20:12:14.524112
1771	\N	239	\N	Planejado	2026-05-13 20:13:14.095351	2026-05-13 20:13:14.095351
1772	\N	347	\N	Planejado	2026-05-13 20:13:14.095351	2026-05-13 20:13:14.095351
1773	\N	317	\N	Planejado	2026-05-13 20:13:14.095351	2026-05-13 20:13:14.095351
1774	\N	239	\N	Planejado	2026-05-13 20:14:37.487641	2026-05-13 20:14:37.487641
1775	\N	347	\N	Planejado	2026-05-13 20:14:37.487641	2026-05-13 20:14:37.487641
1776	\N	317	\N	Planejado	2026-05-13 20:14:37.487641	2026-05-13 20:14:37.487641
1777	\N	265	\N	Planejado	2026-05-13 20:14:37.487641	2026-05-13 20:14:37.487641
1778	\N	329	\N	Planejado	2026-05-13 20:14:37.487641	2026-05-13 20:14:37.487641
1779	\N	296	\N	Planejado	2026-05-13 20:14:37.487641	2026-05-13 20:14:37.487641
1789	\N	238	\N	Planejado	2026-05-13 20:16:41.170744	2026-05-13 20:16:41.170744
1790	\N	367	\N	Planejado	2026-05-13 20:16:41.170744	2026-05-13 20:16:41.170744
1791	\N	318	\N	Planejado	2026-05-13 20:16:41.170744	2026-05-13 20:16:41.170744
1792	\N	238	\N	Planejado	2026-05-13 20:18:06.634803	2026-05-13 20:18:06.634803
1793	\N	367	\N	Planejado	2026-05-13 20:18:06.634803	2026-05-13 20:18:06.634803
1794	\N	318	\N	Planejado	2026-05-13 20:18:06.634803	2026-05-13 20:18:06.634803
1795	\N	214	\N	Planejado	2026-05-13 20:18:06.634803	2026-05-13 20:18:06.634803
1796	\N	364	\N	Planejado	2026-05-13 20:18:06.634803	2026-05-13 20:18:06.634803
1797	\N	230	\N	Planejado	2026-05-13 20:18:06.634803	2026-05-13 20:18:06.634803
1798	\N	242	\N	Planejado	2026-05-13 20:18:06.634803	2026-05-13 20:18:06.634803
1799	\N	324	\N	Planejado	2026-05-13 20:18:06.634803	2026-05-13 20:18:06.634803
1800	\N	277	\N	Planejado	2026-05-13 20:18:06.634803	2026-05-13 20:18:06.634803
1801	\N	242	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1802	\N	324	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1803	\N	277	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1804	\N	238	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1805	\N	367	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1806	\N	318	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1807	\N	214	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1808	\N	364	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1809	\N	230	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1810	\N	286	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1811	\N	321	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1812	\N	360	\N	Planejado	2026-05-13 20:18:49.898669	2026-05-13 20:18:49.898669
1813	\N	286	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1814	\N	321	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1815	\N	360	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1816	\N	242	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1817	\N	324	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1818	\N	277	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1819	\N	238	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1820	\N	367	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1821	\N	318	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1822	\N	214	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1823	\N	364	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1824	\N	230	\N	Planejado	2026-05-13 20:19:17.810662	2026-05-13 20:19:17.810662
1832	1859	364	\N	Planejado	2026-05-13 20:19:27.158039	2026-05-13 20:19:27.158039
1836	1863	360	\N	Planejado	2026-05-13 20:19:27.158039	2026-05-13 20:19:27.158039
1837	\N	237	\N	Planejado	2026-05-13 20:20:15.823906	2026-05-13 20:20:15.823906
1838	\N	355	\N	Planejado	2026-05-13 20:20:15.823906	2026-05-13 20:20:15.823906
1839	\N	305	\N	Planejado	2026-05-13 20:20:15.823906	2026-05-13 20:20:15.823906
1840	\N	237	\N	Planejado	2026-05-13 20:20:16.337732	2026-05-13 20:20:16.337732
1841	\N	355	\N	Planejado	2026-05-13 20:20:16.337732	2026-05-13 20:20:16.337732
1842	\N	305	\N	Planejado	2026-05-13 20:20:16.337732	2026-05-13 20:20:16.337732
1843	\N	237	\N	Planejado	2026-05-13 20:20:57.001884	2026-05-13 20:20:57.001884
1844	\N	355	\N	Planejado	2026-05-13 20:20:57.001884	2026-05-13 20:20:57.001884
1845	\N	305	\N	Planejado	2026-05-13 20:20:57.001884	2026-05-13 20:20:57.001884
1846	\N	204	\N	Planejado	2026-05-13 20:20:57.001884	2026-05-13 20:20:57.001884
1847	\N	328	\N	Planejado	2026-05-13 20:20:57.001884	2026-05-13 20:20:57.001884
1848	\N	236	\N	Planejado	2026-05-13 20:20:57.001884	2026-05-13 20:20:57.001884
1849	\N	237	\N	Planejado	2026-05-13 20:21:39.857914	2026-05-13 20:21:39.857914
1850	\N	355	\N	Planejado	2026-05-13 20:21:39.857914	2026-05-13 20:21:39.857914
1851	\N	305	\N	Planejado	2026-05-13 20:21:39.857914	2026-05-13 20:21:39.857914
1852	\N	204	\N	Planejado	2026-05-13 20:21:39.857914	2026-05-13 20:21:39.857914
1853	\N	328	\N	Planejado	2026-05-13 20:21:39.857914	2026-05-13 20:21:39.857914
1854	\N	236	\N	Planejado	2026-05-13 20:21:39.857914	2026-05-13 20:21:39.857914
1855	\N	382	\N	Planejado	2026-05-13 20:21:39.857914	2026-05-13 20:21:39.857914
1856	\N	377	\N	Planejado	2026-05-13 20:21:39.857914	2026-05-13 20:21:39.857914
1857	\N	315	\N	Planejado	2026-05-13 20:21:39.857914	2026-05-13 20:21:39.857914
1858	\N	382	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1859	\N	377	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1860	\N	315	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1861	\N	237	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1862	\N	355	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1863	\N	305	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1864	\N	204	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1865	\N	328	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1866	\N	236	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1833	1860	230	732	Planejado e executado	2026-05-13 20:19:27.158039	2026-05-22 12:07:37.788199
1781	1808	329	733	Planejado e executado	2026-05-13 20:15:51.241174	2026-05-22 12:07:37.800171
1762	1789	225	734	Planejado e executado	2026-05-13 20:12:14.524112	2026-05-22 12:07:37.806263
1784	1811	347	736	Planejado e executado	2026-05-13 20:15:51.241174	2026-05-22 12:07:37.81792
1766	1793	282	737	Planejado e executado	2026-05-13 20:12:14.524112	2026-05-22 12:07:37.823444
1830	1857	318	740	Planejado e executado	2026-05-13 20:19:27.158039	2026-05-22 12:07:37.843839
1825	1852	242	742	Planejado e executado	2026-05-13 20:19:27.158039	2026-05-22 12:07:37.856344
1770	1797	325	754	Planejado e executado	2026-05-13 20:12:14.524112	2026-05-22 12:07:37.930772
1767	1794	248	755	Planejado e executado	2026-05-13 20:12:14.524112	2026-05-22 12:07:37.93607
1827	1854	277	756	Planejado e executado	2026-05-13 20:19:27.158039	2026-05-22 12:07:37.943402
1834	1861	286	768	Planejado e executado	2026-05-13 20:19:27.158039	2026-05-22 12:07:38.00942
1769	1796	349	769	Planejado e executado	2026-05-13 20:12:14.524112	2026-05-22 12:07:38.014748
1780	1807	265	770	Planejado e executado	2026-05-13 20:15:51.241174	2026-05-22 12:07:38.020003
1763	1790	283	776	Planejado e executado	2026-05-13 20:12:14.524112	2026-05-22 12:07:38.060371
1787	1814	369	777	Planejado e executado	2026-05-13 20:15:51.241174	2026-05-22 12:07:38.067764
1835	1862	321	778	Planejado e executado	2026-05-13 20:19:27.158039	2026-05-22 12:07:38.075133
1785	1812	317	779	Planejado e executado	2026-05-13 20:15:51.241174	2026-05-22 12:07:38.08041
1788	1815	339	781	Planejado e executado	2026-05-13 20:15:51.241174	2026-05-22 12:07:38.093428
1782	1809	296	782	Planejado e executado	2026-05-13 20:15:51.241174	2026-05-22 12:07:38.098781
1829	1856	367	783	Planejado e executado	2026-05-13 20:19:27.158039	2026-05-22 12:07:38.104085
1826	1853	324	792	Planejado e executado	2026-05-13 20:19:27.158039	2026-05-22 12:07:38.162189
1828	1855	238	793	Planejado e executado	2026-05-13 20:19:27.158039	2026-05-22 12:07:38.175169
1831	1858	214	794	Planejado e executado	2026-05-13 20:19:27.158039	2026-05-22 12:07:38.182383
1783	1810	239	796	Planejado e executado	2026-05-13 20:15:51.241174	2026-05-22 12:07:38.193747
1786	1813	247	797	Planejado e executado	2026-05-13 20:15:51.241174	2026-05-22 12:07:38.204527
1764	1791	229	798	Planejado e executado	2026-05-13 20:12:14.524112	2026-05-22 12:07:38.209392
1867	\N	260	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1868	\N	376	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1869	\N	313	\N	Planejado	2026-05-13 20:22:21.662307	2026-05-13 20:22:21.662307
1872	1899	315	\N	Planejado	2026-05-13 20:24:15.509527	2026-05-13 20:24:15.509527
1875	1902	305	\N	Planejado	2026-05-13 20:24:15.509527	2026-05-13 20:24:15.509527
1879	1906	260	\N	Planejado	2026-05-13 20:24:15.509527	2026-05-13 20:24:15.509527
1882	\N	381	641	Apenas executado	2026-05-14 12:01:32.842444	2026-05-14 12:01:32.842444
1883	\N	379	642	Apenas executado	2026-05-14 12:01:32.865917	2026-05-14 12:01:32.865917
1884	\N	196	646	Apenas executado	2026-05-14 12:01:56.733222	2026-05-14 12:01:56.733222
1885	\N	385	650	Apenas executado	2026-05-14 12:01:56.867651	2026-05-14 12:01:56.867651
1886	\N	198	651	Apenas executado	2026-05-14 12:01:56.881678	2026-05-14 12:01:56.881678
1887	\N	251	652	Apenas executado	2026-05-14 12:01:56.895134	2026-05-14 12:01:56.895134
1447	1490	326	653	Planejado e executado	2026-05-10 13:03:22.393574	2026-05-14 12:01:57.010132
1888	\N	331	654	Apenas executado	2026-05-14 12:01:57.04772	2026-05-14 12:01:57.04772
1889	\N	224	659	Apenas executado	2026-05-14 12:01:57.245156	2026-05-14 12:01:57.245156
1890	\N	243	670	Apenas executado	2026-05-15 15:55:06.672919	2026-05-15 15:55:06.672919
1891	\N	380	672	Apenas executado	2026-05-18 12:16:07.906939	2026-05-18 12:16:07.906939
1542	1582	225	673	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:29.625837
1553	1593	318	677	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:29.731011
1892	\N	288	679	Apenas executado	2026-05-18 12:16:29.783742	2026-05-18 12:16:29.783742
1893	\N	196	680	Apenas executado	2026-05-18 12:16:29.854933	2026-05-18 12:16:29.854933
1894	\N	210	681	Apenas executado	2026-05-18 12:16:29.876736	2026-05-18 12:16:29.876736
1895	\N	385	683	Apenas executado	2026-05-18 12:16:29.992908	2026-05-18 12:16:29.992908
1545	1585	237	685	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:30.038469
1551	1591	255	689	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:30.085711
1896	\N	258	690	Apenas executado	2026-05-18 12:16:30.104451	2026-05-18 12:16:30.104451
1897	\N	197	691	Apenas executado	2026-05-18 12:16:30.144891	2026-05-18 12:16:30.144891
1898	\N	369	692	Apenas executado	2026-05-18 12:16:30.215164	2026-05-18 12:16:30.215164
1899	\N	342	695	Apenas executado	2026-05-18 12:16:30.297208	2026-05-18 12:16:30.297208
1900	\N	252	696	Apenas executado	2026-05-18 12:16:30.342154	2026-05-18 12:16:30.342154
1548	1588	199	698	Planejado e executado	2026-05-11 20:36:26.2659	2026-05-18 12:16:30.388177
1901	\N	318	701	Apenas executado	2026-05-18 12:29:31.849817	2026-05-18 12:29:31.849817
1902	\N	360	710	Apenas executado	2026-05-18 12:29:31.894193	2026-05-18 12:29:31.894193
1903	\N	255	711	Apenas executado	2026-05-18 12:29:31.898949	2026-05-18 12:29:31.898949
1904	\N	321	716	Apenas executado	2026-05-18 12:29:31.922717	2026-05-18 12:29:31.922717
1905	\N	342	718	Apenas executado	2026-05-18 12:29:31.931976	2026-05-18 12:29:31.931976
1906	\N	203	721	Apenas executado	2026-05-18 12:29:31.946247	2026-05-18 12:29:31.946247
1907	\N	382	730	Apenas executado	2026-05-18 12:29:44.948793	2026-05-18 12:29:44.948793
1908	\N	220	\N	Planejado	2026-05-19 18:31:43.164842	2026-05-19 18:31:43.164842
1909	\N	329	\N	Planejado	2026-05-19 18:31:43.164842	2026-05-19 18:31:43.164842
1910	\N	237	\N	Planejado	2026-05-19 18:31:43.164842	2026-05-19 18:31:43.164842
1911	\N	220	\N	Planejado	2026-05-19 18:33:13.625392	2026-05-19 18:33:13.625392
1912	\N	329	\N	Planejado	2026-05-19 18:33:13.625392	2026-05-19 18:33:13.625392
1913	\N	237	\N	Planejado	2026-05-19 18:33:13.625392	2026-05-19 18:33:13.625392
1914	\N	204	\N	Planejado	2026-05-19 18:33:13.625392	2026-05-19 18:33:13.625392
1915	\N	325	\N	Planejado	2026-05-19 18:33:13.625392	2026-05-19 18:33:13.625392
1916	\N	283	\N	Planejado	2026-05-19 18:33:13.625392	2026-05-19 18:33:13.625392
1917	\N	220	\N	Planejado	2026-05-19 18:33:52.694	2026-05-19 18:33:52.694
1918	\N	329	\N	Planejado	2026-05-19 18:33:52.694	2026-05-19 18:33:52.694
1919	\N	237	\N	Planejado	2026-05-19 18:33:52.694	2026-05-19 18:33:52.694
1920	\N	204	\N	Planejado	2026-05-19 18:33:52.694	2026-05-19 18:33:52.694
1921	\N	325	\N	Planejado	2026-05-19 18:33:52.694	2026-05-19 18:33:52.694
1922	\N	283	\N	Planejado	2026-05-19 18:33:52.694	2026-05-19 18:33:52.694
1923	\N	220	\N	Planejado	2026-05-19 18:37:07.29004	2026-05-19 18:37:07.29004
1924	\N	329	\N	Planejado	2026-05-19 18:37:07.29004	2026-05-19 18:37:07.29004
1925	\N	237	\N	Planejado	2026-05-19 18:37:07.29004	2026-05-19 18:37:07.29004
1926	\N	204	\N	Planejado	2026-05-19 18:37:07.29004	2026-05-19 18:37:07.29004
1927	\N	325	\N	Planejado	2026-05-19 18:37:07.29004	2026-05-19 18:37:07.29004
1928	\N	283	\N	Planejado	2026-05-19 18:37:07.29004	2026-05-19 18:37:07.29004
1929	\N	203	\N	Planejado	2026-05-19 18:37:07.29004	2026-05-19 18:37:07.29004
1930	\N	248	\N	Planejado	2026-05-19 18:37:07.29004	2026-05-19 18:37:07.29004
1931	\N	215	\N	Planejado	2026-05-19 18:37:07.29004	2026-05-19 18:37:07.29004
1932	\N	220	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1933	\N	329	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1934	\N	237	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1935	\N	203	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1936	\N	248	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1937	\N	215	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1938	\N	204	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1939	\N	325	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1940	\N	283	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1941	\N	239	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1942	\N	347	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1943	\N	353	\N	Planejado	2026-05-19 18:38:05.961902	2026-05-19 18:38:05.961902
1955	1956	283	\N	Planejado	2026-05-19 18:38:51.226195	2026-05-19 18:38:51.226195
1959	\N	230	\N	Planejado	2026-05-19 18:39:46.942516	2026-05-19 18:39:46.942516
1960	\N	296	\N	Planejado	2026-05-19 18:39:46.942516	2026-05-19 18:39:46.942516
1961	\N	265	\N	Planejado	2026-05-19 18:39:46.942516	2026-05-19 18:39:46.942516
1962	\N	230	\N	Planejado	2026-05-19 18:40:43.836026	2026-05-19 18:40:43.836026
1963	\N	296	\N	Planejado	2026-05-19 18:40:43.836026	2026-05-19 18:40:43.836026
1964	\N	265	\N	Planejado	2026-05-19 18:40:43.836026	2026-05-19 18:40:43.836026
1965	\N	381	\N	Planejado	2026-05-19 18:40:43.836026	2026-05-19 18:40:43.836026
1966	\N	320	\N	Planejado	2026-05-19 18:40:43.836026	2026-05-19 18:40:43.836026
1967	\N	356	\N	Planejado	2026-05-19 18:40:43.836026	2026-05-19 18:40:43.836026
1877	1904	328	750	Planejado e executado	2026-05-13 20:24:15.509527	2026-05-22 12:07:37.903027
1878	1905	236	752	Planejado e executado	2026-05-13 20:24:15.509527	2026-05-22 12:07:37.915758
1873	1900	237	762	Planejado e executado	2026-05-13 20:24:15.509527	2026-05-22 12:07:37.977066
1874	1901	355	764	Planejado e executado	2026-05-13 20:24:15.509527	2026-05-22 12:07:37.987083
1881	1908	313	774	Planejado e executado	2026-05-13 20:24:15.509527	2026-05-22 12:07:38.047743
1876	1903	204	775	Planejado e executado	2026-05-13 20:24:15.509527	2026-05-22 12:07:38.055083
1871	1898	377	780	Planejado e executado	2026-05-13 20:24:15.509527	2026-05-22 12:07:38.085785
1880	1907	376	784	Planejado e executado	2026-05-13 20:24:15.509527	2026-05-22 12:07:38.119243
1870	1897	382	801	Planejado e executado	2026-05-13 20:24:15.509527	2026-05-22 12:07:59.007402
1945	1946	329	802	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.301077
1948	1949	347	804	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.319606
1944	1945	220	812	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.39285
1952	1953	215	814	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.408914
1954	1955	325	819	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.44743
1951	1952	248	820	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.454331
1946	1947	237	824	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.491162
1949	1950	353	827	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.513921
1953	1954	204	833	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.568831
1957	1958	377	836	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.600349
1947	1948	239	847	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.704956
1956	1957	229	849	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.72448
1968	\N	230	\N	Planejado	2026-05-19 18:41:16.375391	2026-05-19 18:41:16.375391
1969	\N	296	\N	Planejado	2026-05-19 18:41:16.375391	2026-05-19 18:41:16.375391
1970	\N	265	\N	Planejado	2026-05-19 18:41:16.375391	2026-05-19 18:41:16.375391
1971	\N	381	\N	Planejado	2026-05-19 18:41:16.375391	2026-05-19 18:41:16.375391
1972	\N	320	\N	Planejado	2026-05-19 18:41:16.375391	2026-05-19 18:41:16.375391
1973	\N	356	\N	Planejado	2026-05-19 18:41:16.375391	2026-05-19 18:41:16.375391
1974	\N	199	\N	Planejado	2026-05-19 18:41:16.375391	2026-05-19 18:41:16.375391
1975	\N	369	\N	Planejado	2026-05-19 18:41:16.375391	2026-05-19 18:41:16.375391
1976	\N	305	\N	Planejado	2026-05-19 18:41:16.375391	2026-05-19 18:41:16.375391
1977	\N	230	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1978	\N	296	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1979	\N	265	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1980	\N	199	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1981	\N	369	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1982	\N	305	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1983	\N	381	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1984	\N	320	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1985	\N	356	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1986	\N	213	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1987	\N	359	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1988	\N	247	\N	Planejado	2026-05-19 18:41:53.879911	2026-05-19 18:41:53.879911
1989	\N	230	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
1990	\N	296	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
1991	\N	265	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
1992	\N	213	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
1993	\N	359	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
1994	\N	247	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
1995	\N	199	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
1996	\N	369	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
1997	\N	305	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
1998	\N	381	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
1999	\N	320	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
2000	\N	356	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
2001	\N	315	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
2002	\N	362	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
2003	\N	321	\N	Planejado	2026-05-19 18:42:42.281576	2026-05-19 18:42:42.281576
2004	2005	230	\N	Planejado	2026-05-19 18:42:51.359931	2026-05-19 18:42:51.359931
2016	2017	315	\N	Planejado	2026-05-19 18:42:51.359931	2026-05-19 18:42:51.359931
2017	2018	362	\N	Planejado	2026-05-19 18:42:51.359931	2026-05-19 18:42:51.359931
2018	2019	321	\N	Planejado	2026-05-19 18:42:51.359931	2026-05-19 18:42:51.359931
2019	\N	214	\N	Planejado	2026-05-19 18:43:34.921052	2026-05-19 18:43:34.921052
2020	\N	364	\N	Planejado	2026-05-19 18:43:34.921052	2026-05-19 18:43:34.921052
2021	\N	331	\N	Planejado	2026-05-19 18:43:34.921052	2026-05-19 18:43:34.921052
2022	\N	214	\N	Planejado	2026-05-19 18:44:14.829437	2026-05-19 18:44:14.829437
2023	\N	364	\N	Planejado	2026-05-19 18:44:14.829437	2026-05-19 18:44:14.829437
2024	\N	331	\N	Planejado	2026-05-19 18:44:14.829437	2026-05-19 18:44:14.829437
2025	\N	382	\N	Planejado	2026-05-19 18:44:14.829437	2026-05-19 18:44:14.829437
2026	\N	277	\N	Planejado	2026-05-19 18:44:14.829437	2026-05-19 18:44:14.829437
2027	\N	225	\N	Planejado	2026-05-19 18:44:14.829437	2026-05-19 18:44:14.829437
2028	\N	214	\N	Planejado	2026-05-19 18:44:44.836833	2026-05-19 18:44:44.836833
2029	\N	364	\N	Planejado	2026-05-19 18:44:44.836833	2026-05-19 18:44:44.836833
2030	\N	331	\N	Planejado	2026-05-19 18:44:44.836833	2026-05-19 18:44:44.836833
2031	\N	382	\N	Planejado	2026-05-19 18:44:44.836833	2026-05-19 18:44:44.836833
2032	\N	277	\N	Planejado	2026-05-19 18:44:44.836833	2026-05-19 18:44:44.836833
2033	\N	225	\N	Planejado	2026-05-19 18:44:44.836833	2026-05-19 18:44:44.836833
2034	\N	238	\N	Planejado	2026-05-19 18:44:44.836833	2026-05-19 18:44:44.836833
2035	\N	367	\N	Planejado	2026-05-19 18:44:44.836833	2026-05-19 18:44:44.836833
2036	\N	297	\N	Planejado	2026-05-19 18:44:44.836833	2026-05-19 18:44:44.836833
2037	\N	214	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2038	\N	364	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2039	\N	331	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2040	\N	382	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2041	\N	277	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2042	\N	225	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2043	\N	238	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2044	\N	367	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2045	\N	297	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2046	\N	286	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2047	\N	328	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2048	\N	313	\N	Planejado	2026-05-19 18:45:36.604328	2026-05-19 18:45:36.604328
2052	\N	286	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2053	\N	328	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2054	\N	313	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2049	\N	214	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2050	\N	364	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2051	\N	331	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2055	\N	382	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2056	\N	277	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2057	\N	225	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2058	\N	238	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2059	\N	367	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2060	\N	297	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2061	\N	207	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2062	\N	376	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2063	\N	242	\N	Planejado	2026-05-19 18:46:51.029193	2026-05-19 18:46:51.029193
2064	\N	214	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2065	\N	364	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2066	\N	331	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2067	\N	382	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2068	\N	277	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2069	\N	225	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2070	\N	207	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2071	\N	376	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2014	2015	320	806	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:01:47.336078
2008	2009	359	809	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:01:47.363901
2007	2008	213	811	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:01:47.385889
2012	2013	305	818	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:01:47.440601
2015	2016	356	825	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:01:47.499858
2006	2007	265	829	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:01:47.533416
2011	2012	369	835	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:01:47.58754
2005	2006	296	837	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:01:47.611225
2010	2011	199	844	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:01:47.67817
2009	2010	247	848	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:01:47.717486
2013	2014	381	853	Planejado e executado	2026-05-19 18:42:51.359931	2026-05-25 13:02:11.96832
2072	\N	242	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2073	\N	238	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2074	\N	367	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2075	\N	297	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2076	\N	286	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2077	\N	328	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2078	\N	313	\N	Planejado	2026-05-19 18:47:55.892488	2026-05-19 18:47:55.892488
2094	\N	220	\N	Planejado	2026-05-19 18:49:04.781068	2026-05-19 18:49:04.781068
2095	\N	325	\N	Planejado	2026-05-19 18:49:04.781068	2026-05-19 18:49:04.781068
2096	\N	283	\N	Planejado	2026-05-19 18:49:04.781068	2026-05-19 18:49:04.781068
2097	\N	220	\N	Planejado	2026-05-19 18:49:44.276937	2026-05-19 18:49:44.276937
2098	\N	325	\N	Planejado	2026-05-19 18:49:44.276937	2026-05-19 18:49:44.276937
2099	\N	283	\N	Planejado	2026-05-19 18:49:44.276937	2026-05-19 18:49:44.276937
2100	\N	213	\N	Planejado	2026-05-19 18:49:44.276937	2026-05-19 18:49:44.276937
2101	\N	326	\N	Planejado	2026-05-19 18:49:44.276937	2026-05-19 18:49:44.276937
2102	\N	236	\N	Planejado	2026-05-19 18:49:44.276937	2026-05-19 18:49:44.276937
2103	2104	213	\N	Planejado	2026-05-19 18:50:21.887055	2026-05-19 18:50:21.887055
2107	2108	325	\N	Planejado	2026-05-19 18:50:21.887055	2026-05-19 18:50:21.887055
2110	2111	276	\N	Planejado	2026-05-19 18:50:21.887055	2026-05-19 18:50:21.887055
2111	2112	229	\N	Planejado	2026-05-19 18:50:21.887055	2026-05-19 18:50:21.887055
2112	\N	199	\N	Planejado	2026-05-19 18:51:05.899567	2026-05-19 18:51:05.899567
2113	\N	296	\N	Planejado	2026-05-19 18:51:05.899567	2026-05-19 18:51:05.899567
2114	\N	237	\N	Planejado	2026-05-19 18:51:05.899567	2026-05-19 18:51:05.899567
2115	\N	199	\N	Planejado	2026-05-19 18:51:44.311684	2026-05-19 18:51:44.311684
2116	\N	296	\N	Planejado	2026-05-19 18:51:44.311684	2026-05-19 18:51:44.311684
2117	\N	237	\N	Planejado	2026-05-19 18:51:44.311684	2026-05-19 18:51:44.311684
2118	\N	225	\N	Planejado	2026-05-19 18:51:44.311684	2026-05-19 18:51:44.311684
2119	\N	377	\N	Planejado	2026-05-19 18:51:44.311684	2026-05-19 18:51:44.311684
2120	\N	265	\N	Planejado	2026-05-19 18:51:44.311684	2026-05-19 18:51:44.311684
2125	2126	296	\N	Planejado	2026-05-19 18:52:31.401462	2026-05-19 18:52:31.401462
2130	\N	230	\N	Planejado	2026-05-19 18:53:44.693638	2026-05-19 18:53:44.693638
2131	\N	329	\N	Planejado	2026-05-19 18:53:44.693638	2026-05-19 18:53:44.693638
2132	\N	248	\N	Planejado	2026-05-19 18:53:44.693638	2026-05-19 18:53:44.693638
2133	\N	230	\N	Planejado	2026-05-19 18:54:22.63628	2026-05-19 18:54:22.63628
2134	\N	329	\N	Planejado	2026-05-19 18:54:22.63628	2026-05-19 18:54:22.63628
2135	\N	248	\N	Planejado	2026-05-19 18:54:22.63628	2026-05-19 18:54:22.63628
2136	\N	242	\N	Planejado	2026-05-19 18:54:22.63628	2026-05-19 18:54:22.63628
2137	\N	369	\N	Planejado	2026-05-19 18:54:22.63628	2026-05-19 18:54:22.63628
2138	\N	247	\N	Planejado	2026-05-19 18:54:22.63628	2026-05-19 18:54:22.63628
2139	\N	242	\N	Planejado	2026-05-19 18:55:06.42627	2026-05-19 18:55:06.42627
2140	\N	369	\N	Planejado	2026-05-19 18:55:06.42627	2026-05-19 18:55:06.42627
2141	\N	247	\N	Planejado	2026-05-19 18:55:06.42627	2026-05-19 18:55:06.42627
2142	\N	230	\N	Planejado	2026-05-19 18:55:06.42627	2026-05-19 18:55:06.42627
2143	\N	329	\N	Planejado	2026-05-19 18:55:06.42627	2026-05-19 18:55:06.42627
2144	\N	248	\N	Planejado	2026-05-19 18:55:06.42627	2026-05-19 18:55:06.42627
2145	\N	239	\N	Planejado	2026-05-19 18:55:06.42627	2026-05-19 18:55:06.42627
2146	\N	347	\N	Planejado	2026-05-19 18:55:06.42627	2026-05-19 18:55:06.42627
2147	\N	353	\N	Planejado	2026-05-19 18:55:06.42627	2026-05-19 18:55:06.42627
2148	\N	239	\N	Planejado	2026-05-19 18:55:24.069613	2026-05-19 18:55:24.069613
2149	\N	347	\N	Planejado	2026-05-19 18:55:24.069613	2026-05-19 18:55:24.069613
2150	\N	353	\N	Planejado	2026-05-19 18:55:24.069613	2026-05-19 18:55:24.069613
2151	\N	242	\N	Planejado	2026-05-19 18:55:24.069613	2026-05-19 18:55:24.069613
2152	\N	369	\N	Planejado	2026-05-19 18:55:24.069613	2026-05-19 18:55:24.069613
2153	\N	247	\N	Planejado	2026-05-19 18:55:24.069613	2026-05-19 18:55:24.069613
2154	\N	230	\N	Planejado	2026-05-19 18:55:24.069613	2026-05-19 18:55:24.069613
2155	\N	329	\N	Planejado	2026-05-19 18:55:24.069613	2026-05-19 18:55:24.069613
2156	\N	248	\N	Planejado	2026-05-19 18:55:24.069613	2026-05-19 18:55:24.069613
2167	2168	321	\N	Planejado	2026-05-19 18:56:08.873915	2026-05-19 18:56:08.873915
2169	\N	216	\N	Planejado	2026-05-19 18:57:13.383171	2026-05-19 18:57:13.383171
2170	\N	317	\N	Planejado	2026-05-19 18:57:13.383171	2026-05-19 18:57:13.383171
2171	\N	277	\N	Planejado	2026-05-19 18:57:13.383171	2026-05-19 18:57:13.383171
2172	\N	216	\N	Planejado	2026-05-19 18:57:54.520543	2026-05-19 18:57:54.520543
2173	\N	317	\N	Planejado	2026-05-19 18:57:54.520543	2026-05-19 18:57:54.520543
2174	\N	277	\N	Planejado	2026-05-19 18:57:54.520543	2026-05-19 18:57:54.520543
2175	\N	214	\N	Planejado	2026-05-19 18:57:54.520543	2026-05-19 18:57:54.520543
2176	\N	313	\N	Planejado	2026-05-19 18:57:54.520543	2026-05-19 18:57:54.520543
2177	\N	238	\N	Planejado	2026-05-19 18:57:54.520543	2026-05-19 18:57:54.520543
2178	\N	216	\N	Planejado	2026-05-19 18:58:27.829738	2026-05-19 18:58:27.829738
2179	\N	317	\N	Planejado	2026-05-19 18:58:27.829738	2026-05-19 18:58:27.829738
2180	\N	277	\N	Planejado	2026-05-19 18:58:27.829738	2026-05-19 18:58:27.829738
2181	\N	214	\N	Planejado	2026-05-19 18:58:27.829738	2026-05-19 18:58:27.829738
2087	2088	225	803	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.311762
2090	2091	242	808	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.356839
2083	2084	328	813	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.403719
2093	2094	297	816	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.423209
2086	2087	277	821	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.46299
2080	2081	364	823	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.484157
2082	2083	286	828	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.524577
2084	2085	313	832	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.559834
2081	2082	331	834	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.577719
2092	2093	367	838	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.618105
2089	2090	376	839	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.630825
2088	2089	207	843	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.673019
2091	2092	238	845	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.687012
2079	2080	214	846	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:01:47.696028
2085	2086	382	851	Planejado e executado	2026-05-19 18:48:13.050924	2026-05-25 13:02:00.813882
2160	2161	230	856	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:22.92
2161	2162	329	858	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:22.944202
2121	2122	225	860	Planejado e executado	2026-05-19 18:52:31.401462	2026-06-03 17:00:22.961437
2166	2167	362	866	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:23.012838
2163	2164	242	874	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:23.080715
2127	2128	359	875	Planejado e executado	2026-05-19 18:52:31.401462	2026-06-03 17:00:23.092532
2105	2106	236	892	Planejado e executado	2026-05-19 18:50:21.887055	2026-06-03 17:00:23.244612
2162	2163	248	896	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:23.288383
2168	2169	360	901	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:23.328967
2126	2127	237	905	Planejado e executado	2026-05-19 18:52:31.401462	2026-06-03 17:00:23.372369
2159	2160	353	912	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:23.423248
2128	2129	349	919	Planejado e executado	2026-05-19 18:52:31.401462	2026-06-03 17:00:23.475193
2104	2105	326	930	Planejado e executado	2026-05-19 18:50:21.887055	2026-06-03 17:00:23.553195
2108	2109	283	936	Planejado e executado	2026-05-19 18:50:21.887055	2026-06-03 17:00:23.604006
2164	2165	369	938	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:23.626184
2122	2123	377	942	Planejado e executado	2026-05-19 18:52:31.401462	2026-06-03 17:00:23.65918
2157	2158	239	970	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:23.893883
2109	2110	243	972	Planejado e executado	2026-05-19 18:50:21.887055	2026-06-03 17:00:23.906505
2165	2166	247	976	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:23.937189
2182	\N	313	\N	Planejado	2026-05-19 18:58:27.829738	2026-05-19 18:58:27.829738
2183	\N	238	\N	Planejado	2026-05-19 18:58:27.829738	2026-05-19 18:58:27.829738
2184	\N	382	\N	Planejado	2026-05-19 18:58:27.829738	2026-05-19 18:58:27.829738
2185	\N	286	\N	Planejado	2026-05-19 18:58:27.829738	2026-05-19 18:58:27.829738
2186	\N	318	\N	Planejado	2026-05-19 18:58:27.829738	2026-05-19 18:58:27.829738
2199	\N	220	\N	Planejado	2026-05-21 18:11:10.491304	2026-05-21 18:11:10.491304
2200	\N	355	\N	Planejado	2026-05-21 18:11:10.491304	2026-05-21 18:11:10.491304
2201	\N	356	\N	Planejado	2026-05-21 18:11:10.491304	2026-05-21 18:11:10.491304
2202	\N	220	\N	Planejado	2026-05-21 18:12:30.125704	2026-05-21 18:12:30.125704
2203	\N	355	\N	Planejado	2026-05-21 18:12:30.125704	2026-05-21 18:12:30.125704
2204	\N	356	\N	Planejado	2026-05-21 18:12:30.125704	2026-05-21 18:12:30.125704
2205	\N	381	\N	Planejado	2026-05-21 18:12:30.125704	2026-05-21 18:12:30.125704
2206	\N	367	\N	Planejado	2026-05-21 18:12:30.125704	2026-05-21 18:12:30.125704
2207	\N	286	\N	Planejado	2026-05-21 18:12:30.125704	2026-05-21 18:12:30.125704
2208	\N	220	\N	Planejado	2026-05-21 18:13:09.697808	2026-05-21 18:13:09.697808
2209	\N	355	\N	Planejado	2026-05-21 18:13:09.697808	2026-05-21 18:13:09.697808
2210	\N	356	\N	Planejado	2026-05-21 18:13:09.697808	2026-05-21 18:13:09.697808
2211	\N	381	\N	Planejado	2026-05-21 18:13:09.697808	2026-05-21 18:13:09.697808
2212	\N	367	\N	Planejado	2026-05-21 18:13:09.697808	2026-05-21 18:13:09.697808
2213	\N	286	\N	Planejado	2026-05-21 18:13:09.697808	2026-05-21 18:13:09.697808
2214	\N	203	\N	Planejado	2026-05-21 18:13:09.697808	2026-05-21 18:13:09.697808
2215	\N	277	\N	Planejado	2026-05-21 18:13:09.697808	2026-05-21 18:13:09.697808
2216	\N	215	\N	Planejado	2026-05-21 18:13:09.697808	2026-05-21 18:13:09.697808
2217	\N	220	\N	Planejado	2026-05-21 18:15:06.160782	2026-05-21 18:15:06.160782
2218	\N	355	\N	Planejado	2026-05-21 18:15:06.160782	2026-05-21 18:15:06.160782
2219	\N	356	\N	Planejado	2026-05-21 18:15:06.160782	2026-05-21 18:15:06.160782
2220	\N	203	\N	Planejado	2026-05-21 18:15:06.160782	2026-05-21 18:15:06.160782
2221	\N	277	\N	Planejado	2026-05-21 18:15:06.160782	2026-05-21 18:15:06.160782
2222	\N	215	\N	Planejado	2026-05-21 18:15:06.160782	2026-05-21 18:15:06.160782
2223	\N	381	\N	Planejado	2026-05-21 18:15:06.160782	2026-05-21 18:15:06.160782
2224	\N	367	\N	Planejado	2026-05-21 18:15:06.160782	2026-05-21 18:15:06.160782
2225	\N	286	\N	Planejado	2026-05-21 18:15:06.160782	2026-05-21 18:15:06.160782
2226	\N	220	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2227	\N	355	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2228	\N	356	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2229	\N	203	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2230	\N	277	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2231	\N	215	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2232	\N	381	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2233	\N	367	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2234	\N	286	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2235	\N	226	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2236	\N	283	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2237	\N	236	\N	Planejado	2026-05-21 18:15:47.877452	2026-05-21 18:15:47.877452
2238	\N	220	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2239	\N	355	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2240	\N	356	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2241	\N	226	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2242	\N	283	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2243	\N	236	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2244	\N	203	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2245	\N	277	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2246	\N	215	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2247	\N	381	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2248	\N	367	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2249	\N	286	\N	Planejado	2026-05-21 18:16:24.549028	2026-05-21 18:16:24.549028
2265	\N	230	\N	Planejado	2026-05-21 18:19:07.2588	2026-05-21 18:19:07.2588
2266	\N	296	\N	Planejado	2026-05-21 18:19:07.2588	2026-05-21 18:19:07.2588
2267	\N	297	\N	Planejado	2026-05-21 18:19:07.2588	2026-05-21 18:19:07.2588
2268	\N	230	\N	Planejado	2026-05-21 18:19:51.442725	2026-05-21 18:19:51.442725
2269	\N	296	\N	Planejado	2026-05-21 18:19:51.442725	2026-05-21 18:19:51.442725
2270	\N	297	\N	Planejado	2026-05-21 18:19:51.442725	2026-05-21 18:19:51.442725
2271	\N	199	\N	Planejado	2026-05-21 18:19:51.442725	2026-05-21 18:19:51.442725
2272	\N	305	\N	Planejado	2026-05-21 18:19:51.442725	2026-05-21 18:19:51.442725
2273	\N	265	\N	Planejado	2026-05-21 18:19:51.442725	2026-05-21 18:19:51.442725
2274	\N	230	\N	Planejado	2026-05-21 18:20:39.649192	2026-05-21 18:20:39.649192
2275	\N	296	\N	Planejado	2026-05-21 18:20:39.649192	2026-05-21 18:20:39.649192
2276	\N	297	\N	Planejado	2026-05-21 18:20:39.649192	2026-05-21 18:20:39.649192
2277	\N	199	\N	Planejado	2026-05-21 18:20:39.649192	2026-05-21 18:20:39.649192
2278	\N	305	\N	Planejado	2026-05-21 18:20:39.649192	2026-05-21 18:20:39.649192
2279	\N	265	\N	Planejado	2026-05-21 18:20:39.649192	2026-05-21 18:20:39.649192
2280	\N	214	\N	Planejado	2026-05-21 18:20:39.649192	2026-05-21 18:20:39.649192
2281	\N	326	\N	Planejado	2026-05-21 18:20:39.649192	2026-05-21 18:20:39.649192
2282	\N	239	\N	Planejado	2026-05-21 18:20:39.649192	2026-05-21 18:20:39.649192
2283	\N	230	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2284	\N	296	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2285	\N	297	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2286	\N	214	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2287	\N	326	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2288	\N	239	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2250	\N	220	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2251	\N	355	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2252	\N	356	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2253	\N	226	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2254	\N	283	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2255	\N	236	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2256	\N	203	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2257	\N	277	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2258	\N	215	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2259	\N	381	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2260	\N	367	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2261	\N	286	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2262	\N	255	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2263	\N	331	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2264	\N	259	\N	Planejado	2026-05-21 18:17:59.323467	2026-05-21 18:17:59.323467
2187	\N	382	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2188	\N	286	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2189	\N	318	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2190	\N	216	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2191	\N	317	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2192	\N	277	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2193	\N	214	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2194	\N	313	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2195	\N	238	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2196	\N	207	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2197	\N	376	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2198	\N	324	\N	Planejado	2026-05-19 18:59:12.968352	2026-05-19 18:59:12.968352
2289	\N	199	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2290	\N	305	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2291	\N	265	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2292	\N	213	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2293	\N	329	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2294	\N	313	\N	Planejado	2026-05-21 18:21:47.195398	2026-05-21 18:21:47.195398
2307	2308	315	\N	Planejado	2026-05-21 18:22:35.269873	2026-05-21 18:22:35.269873
2310	\N	237	\N	Planejado	2026-05-21 18:23:31.75983	2026-05-21 18:23:31.75983
2311	\N	317	\N	Planejado	2026-05-21 18:23:31.75983	2026-05-21 18:23:31.75983
2312	\N	353	\N	Planejado	2026-05-21 18:23:31.75983	2026-05-21 18:23:31.75983
2313	\N	237	\N	Planejado	2026-05-21 18:24:09.740377	2026-05-21 18:24:09.740377
2314	\N	317	\N	Planejado	2026-05-21 18:24:09.740377	2026-05-21 18:24:09.740377
2315	\N	353	\N	Planejado	2026-05-21 18:24:09.740377	2026-05-21 18:24:09.740377
2316	\N	204	\N	Planejado	2026-05-21 18:24:09.740377	2026-05-21 18:24:09.740377
2317	\N	320	\N	Planejado	2026-05-21 18:24:09.740377	2026-05-21 18:24:09.740377
2318	\N	382	\N	Planejado	2026-05-21 18:24:09.740377	2026-05-21 18:24:09.740377
2319	\N	237	\N	Planejado	2026-05-21 18:24:45.946085	2026-05-21 18:24:45.946085
2320	\N	317	\N	Planejado	2026-05-21 18:24:45.946085	2026-05-21 18:24:45.946085
2321	\N	353	\N	Planejado	2026-05-21 18:24:45.946085	2026-05-21 18:24:45.946085
2322	\N	204	\N	Planejado	2026-05-21 18:24:45.946085	2026-05-21 18:24:45.946085
2323	\N	320	\N	Planejado	2026-05-21 18:24:45.946085	2026-05-21 18:24:45.946085
2324	\N	382	\N	Planejado	2026-05-21 18:24:45.946085	2026-05-21 18:24:45.946085
2325	\N	216	\N	Planejado	2026-05-21 18:24:45.946085	2026-05-21 18:24:45.946085
2326	\N	359	\N	Planejado	2026-05-21 18:24:45.946085	2026-05-21 18:24:45.946085
2327	\N	248	\N	Planejado	2026-05-21 18:24:45.946085	2026-05-21 18:24:45.946085
2328	\N	237	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2329	\N	317	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2330	\N	353	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2331	\N	216	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2332	\N	359	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2333	\N	248	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2334	\N	204	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2335	\N	320	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2336	\N	382	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2337	\N	225	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2338	\N	282	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2339	\N	362	\N	Planejado	2026-05-21 18:25:28.989674	2026-05-21 18:25:28.989674
2355	\N	287	735	Apenas executado	2026-05-22 12:07:37.811953	2026-05-22 12:07:37.811953
2356	\N	259	738	Apenas executado	2026-05-22 12:07:37.831216	2026-05-22 12:07:37.831216
2357	\N	259	739	Apenas executado	2026-05-22 12:07:37.836022	2026-05-22 12:07:37.836022
2358	\N	318	741	Apenas executado	2026-05-22 12:07:37.849203	2026-05-22 12:07:37.849203
2359	\N	200	743	Apenas executado	2026-05-22 12:07:37.863629	2026-05-22 12:07:37.863629
2360	\N	200	744	Apenas executado	2026-05-22 12:07:37.868783	2026-05-22 12:07:37.868783
2361	\N	288	745	Apenas executado	2026-05-22 12:07:37.87394	2026-05-22 12:07:37.87394
2362	\N	288	746	Apenas executado	2026-05-22 12:07:37.87904	2026-05-22 12:07:37.87904
2363	\N	288	747	Apenas executado	2026-05-22 12:07:37.884054	2026-05-22 12:07:37.884054
2364	\N	220	748	Apenas executado	2026-05-22 12:07:37.891059	2026-05-22 12:07:37.891059
2365	\N	328	749	Apenas executado	2026-05-22 12:07:37.898047	2026-05-22 12:07:37.898047
2366	\N	196	751	Apenas executado	2026-05-22 12:07:37.908638	2026-05-22 12:07:37.908638
2367	\N	305	753	Apenas executado	2026-05-22 12:07:37.925606	2026-05-22 12:07:37.925606
2368	\N	385	757	Apenas executado	2026-05-22 12:07:37.950756	2026-05-22 12:07:37.950756
2369	\N	198	758	Apenas executado	2026-05-22 12:07:37.955871	2026-05-22 12:07:37.955871
2370	\N	198	759	Apenas executado	2026-05-22 12:07:37.961013	2026-05-22 12:07:37.961013
2340	\N	237	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2341	\N	317	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2342	\N	353	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2343	\N	225	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2344	\N	282	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2345	\N	362	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2346	\N	216	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2347	\N	359	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2348	\N	248	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2349	\N	204	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2350	\N	320	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2351	\N	382	\N	Planejado	2026-05-21 18:26:19.223589	2026-05-21 18:26:19.223589
2295	2296	230	857	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:22.929928
2299	2300	329	859	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:22.950412
2298	2299	213	881	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.144541
2308	2309	361	889	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.213387
2297	2298	297	891	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.234369
2305	2306	305	894	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.265276
2306	2307	265	925	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.512472
2302	2303	326	932	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.565848
2300	2301	313	934	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.583531
2353	2354	369	939	Planejado e executado	2026-05-21 18:26:19.223589	2026-06-03 17:00:23.631458
2309	2310	377	943	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.664467
2354	2355	339	944	Planejado e executado	2026-05-21 18:26:19.223589	2026-06-03 17:00:23.673881
2296	2297	296	946	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.688893
2304	2305	199	964	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.842536
2301	2302	214	967	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.870739
2303	2304	239	971	Planejado e executado	2026-05-21 18:22:35.269873	2026-06-03 17:00:23.899178
2352	2353	243	973	Planejado e executado	2026-05-21 18:26:19.223589	2026-06-03 17:00:23.912228
2371	\N	251	760	Apenas executado	2026-05-22 12:07:37.966102	2026-05-22 12:07:37.966102
2372	\N	251	761	Apenas executado	2026-05-22 12:07:37.971948	2026-05-22 12:07:37.971948
2373	\N	250	763	Apenas executado	2026-05-22 12:07:37.982415	2026-05-22 12:07:37.982415
2374	\N	255	765	Apenas executado	2026-05-22 12:07:37.994149	2026-05-22 12:07:37.994149
2375	\N	258	766	Apenas executado	2026-05-22 12:07:37.999374	2026-05-22 12:07:37.999374
2376	\N	258	767	Apenas executado	2026-05-22 12:07:38.004223	2026-05-22 12:07:38.004223
2377	\N	301	771	Apenas executado	2026-05-22 12:07:38.025241	2026-05-22 12:07:38.025241
2378	\N	301	772	Apenas executado	2026-05-22 12:07:38.030111	2026-05-22 12:07:38.030111
2379	\N	301	773	Apenas executado	2026-05-22 12:07:38.035115	2026-05-22 12:07:38.035115
2380	\N	206	785	Apenas executado	2026-05-22 12:07:38.124666	2026-05-22 12:07:38.124666
2381	\N	206	786	Apenas executado	2026-05-22 12:07:38.12979	2026-05-22 12:07:38.12979
2382	\N	206	787	Apenas executado	2026-05-22 12:07:38.134834	2026-05-22 12:07:38.134834
2383	\N	252	788	Apenas executado	2026-05-22 12:07:38.139962	2026-05-22 12:07:38.139962
2384	\N	252	789	Apenas executado	2026-05-22 12:07:38.145089	2026-05-22 12:07:38.145089
2385	\N	221	790	Apenas executado	2026-05-22 12:07:38.150231	2026-05-22 12:07:38.150231
2386	\N	221	791	Apenas executado	2026-05-22 12:07:38.155391	2026-05-22 12:07:38.155391
2387	\N	224	795	Apenas executado	2026-05-22 12:07:38.188993	2026-05-22 12:07:38.188993
2388	\N	379	799	Apenas executado	2026-05-22 12:07:48.703342	2026-05-22 12:07:48.703342
2389	\N	379	800	Apenas executado	2026-05-22 12:07:48.714774	2026-05-22 12:07:48.714774
2390	\N	362	805	Apenas executado	2026-05-25 13:01:47.327467	2026-05-25 13:01:47.327467
2391	\N	318	807	Apenas executado	2026-05-25 13:01:47.347773	2026-05-25 13:01:47.347773
2392	\N	200	810	Apenas executado	2026-05-25 13:01:47.372917	2026-05-25 13:01:47.372917
2393	\N	210	815	Apenas executado	2026-05-25 13:01:47.415982	2026-05-25 13:01:47.415982
2394	\N	315	817	Apenas executado	2026-05-25 13:01:47.429862	2026-05-25 13:01:47.429862
2395	\N	364	822	Apenas executado	2026-05-25 13:01:47.479325	2026-05-25 13:01:47.479325
1958	1959	255	826	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.508792
2396	\N	197	830	Apenas executado	2026-05-25 13:01:47.538655	2026-05-25 13:01:47.538655
2397	\N	301	831	Apenas executado	2026-05-25 13:01:47.549295	2026-05-25 13:01:47.549295
2398	\N	206	840	Apenas executado	2026-05-25 13:01:47.64201	2026-05-25 13:01:47.64201
2399	\N	252	841	Apenas executado	2026-05-25 13:01:47.651609	2026-05-25 13:01:47.651609
1950	1951	203	842	Planejado e executado	2026-05-19 18:38:51.226195	2026-05-25 13:01:47.664143
2400	\N	382	850	Apenas executado	2026-05-25 13:02:00.803613	2026-05-25 13:02:00.803613
2401	\N	381	852	Apenas executado	2026-05-25 13:02:11.957161	2026-05-25 13:02:11.957161
2402	\N	205	854	Apenas executado	2026-05-25 13:02:11.989619	2026-05-25 13:02:11.989619
2403	\N	380	855	Apenas executado	2026-05-25 13:02:12.001372	2026-05-25 13:02:12.001372
2404	\N	238	\N	Planejado	2026-05-28 18:15:22.741824	2026-05-28 18:15:22.741824
2405	\N	277	\N	Planejado	2026-05-28 18:15:22.741824	2026-05-28 18:15:22.741824
2406	\N	247	\N	Planejado	2026-05-28 18:15:22.741824	2026-05-28 18:15:22.741824
2407	\N	238	\N	Planejado	2026-05-28 18:17:19.924578	2026-05-28 18:17:19.924578
2408	\N	364	\N	Planejado	2026-05-28 18:17:19.924578	2026-05-28 18:17:19.924578
2409	\N	247	\N	Planejado	2026-05-28 18:17:19.924578	2026-05-28 18:17:19.924578
2410	\N	214	\N	Planejado	2026-05-28 18:17:19.924578	2026-05-28 18:17:19.924578
2411	\N	364	\N	Planejado	2026-05-28 18:17:19.924578	2026-05-28 18:17:19.924578
2412	\N	242	\N	Planejado	2026-05-28 18:17:19.924578	2026-05-28 18:17:19.924578
2413	\N	214	\N	Planejado	2026-05-28 18:17:57.552158	2026-05-28 18:17:57.552158
2414	\N	364	\N	Planejado	2026-05-28 18:17:57.552158	2026-05-28 18:17:57.552158
2415	\N	242	\N	Planejado	2026-05-28 18:17:57.552158	2026-05-28 18:17:57.552158
2416	\N	238	\N	Planejado	2026-05-28 18:17:57.552158	2026-05-28 18:17:57.552158
2417	\N	277	\N	Planejado	2026-05-28 18:17:57.552158	2026-05-28 18:17:57.552158
2418	\N	247	\N	Planejado	2026-05-28 18:17:57.552158	2026-05-28 18:17:57.552158
2422	\N	238	\N	Planejado	2026-05-28 18:18:26.094794	2026-05-28 18:18:26.094794
2423	\N	277	\N	Planejado	2026-05-28 18:18:26.094794	2026-05-28 18:18:26.094794
2424	\N	247	\N	Planejado	2026-05-28 18:18:26.094794	2026-05-28 18:18:26.094794
2419	\N	214	\N	Planejado	2026-05-28 18:18:26.094794	2026-05-28 18:18:26.094794
2420	\N	364	\N	Planejado	2026-05-28 18:18:26.094794	2026-05-28 18:18:26.094794
2421	\N	242	\N	Planejado	2026-05-28 18:18:26.094794	2026-05-28 18:18:26.094794
2425	\N	238	\N	Planejado	2026-05-28 18:19:43.553794	2026-05-28 18:19:43.553794
2426	\N	364	\N	Planejado	2026-05-28 18:19:43.553794	2026-05-28 18:19:43.553794
2427	\N	247	\N	Planejado	2026-05-28 18:19:43.553794	2026-05-28 18:19:43.553794
2428	\N	238	\N	Planejado	2026-05-28 18:20:22.480164	2026-05-28 18:20:22.480164
2429	\N	364	\N	Planejado	2026-05-28 18:20:22.480164	2026-05-28 18:20:22.480164
2430	\N	247	\N	Planejado	2026-05-28 18:20:22.480164	2026-05-28 18:20:22.480164
2431	\N	214	\N	Planejado	2026-05-28 18:20:22.480164	2026-05-28 18:20:22.480164
2432	\N	277	\N	Planejado	2026-05-28 18:20:22.480164	2026-05-28 18:20:22.480164
2433	\N	242	\N	Planejado	2026-05-28 18:20:22.480164	2026-05-28 18:20:22.480164
2443	\N	232	\N	Planejado	2026-05-31 12:26:08.964396	2026-05-31 12:26:08.964396
2444	\N	305	\N	Planejado	2026-05-31 12:26:08.964396	2026-05-31 12:26:08.964396
2445	\N	387	\N	Planejado	2026-05-31 12:26:08.964396	2026-05-31 12:26:08.964396
2446	\N	232	\N	Planejado	2026-05-31 12:27:13.326457	2026-05-31 12:27:13.326457
2447	\N	305	\N	Planejado	2026-05-31 12:27:13.326457	2026-05-31 12:27:13.326457
2448	\N	387	\N	Planejado	2026-05-31 12:27:13.326457	2026-05-31 12:27:13.326457
2449	\N	227	\N	Planejado	2026-05-31 12:27:13.326457	2026-05-31 12:27:13.326457
2450	\N	283	\N	Planejado	2026-05-31 12:27:13.326457	2026-05-31 12:27:13.326457
2451	\N	271	\N	Planejado	2026-05-31 12:27:13.326457	2026-05-31 12:27:13.326457
2455	\N	232	\N	Planejado	2026-05-31 12:28:21.712355	2026-05-31 12:28:21.712355
2456	\N	305	\N	Planejado	2026-05-31 12:28:21.712355	2026-05-31 12:28:21.712355
2457	\N	387	\N	Planejado	2026-05-31 12:28:21.712355	2026-05-31 12:28:21.712355
2452	\N	227	\N	Planejado	2026-05-31 12:28:21.712355	2026-05-31 12:28:21.712355
2453	\N	283	\N	Planejado	2026-05-31 12:28:21.712355	2026-05-31 12:28:21.712355
2454	\N	271	\N	Planejado	2026-05-31 12:28:21.712355	2026-05-31 12:28:21.712355
2458	\N	243	\N	Planejado	2026-05-31 12:28:21.712355	2026-05-31 12:28:21.712355
2459	\N	276	\N	Planejado	2026-05-31 12:28:21.712355	2026-05-31 12:28:21.712355
2460	\N	230	\N	Planejado	2026-05-31 12:28:21.712355	2026-05-31 12:28:21.712355
2461	\N	227	\N	Planejado	2026-05-31 12:29:00.681081	2026-05-31 12:29:00.681081
2462	\N	283	\N	Planejado	2026-05-31 12:29:00.681081	2026-05-31 12:29:00.681081
2463	\N	271	\N	Planejado	2026-05-31 12:29:00.681081	2026-05-31 12:29:00.681081
2464	\N	232	\N	Planejado	2026-05-31 12:29:00.681081	2026-05-31 12:29:00.681081
2465	\N	305	\N	Planejado	2026-05-31 12:29:00.681081	2026-05-31 12:29:00.681081
2466	\N	387	\N	Planejado	2026-05-31 12:29:00.681081	2026-05-31 12:29:00.681081
2467	\N	243	\N	Planejado	2026-05-31 12:29:00.681081	2026-05-31 12:29:00.681081
2468	\N	276	\N	Planejado	2026-05-31 12:29:00.681081	2026-05-31 12:29:00.681081
2469	\N	230	\N	Planejado	2026-05-31 12:29:00.681081	2026-05-31 12:29:00.681081
2470	\N	227	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2471	\N	283	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2440	\N	253	\N	Planejado	2026-05-28 18:23:02.131264	2026-05-28 18:23:02.131264
2441	\N	376	\N	Planejado	2026-05-28 18:23:02.131264	2026-05-28 18:23:02.131264
2442	\N	313	\N	Planejado	2026-05-28 18:23:02.131264	2026-05-28 18:23:02.131264
2434	\N	214	\N	Planejado	2026-05-28 18:23:02.131264	2026-05-28 18:23:02.131264
2435	\N	277	\N	Planejado	2026-05-28 18:23:02.131264	2026-05-28 18:23:02.131264
2436	\N	242	\N	Planejado	2026-05-28 18:23:02.131264	2026-05-28 18:23:02.131264
2437	\N	238	\N	Planejado	2026-05-28 18:23:02.131264	2026-05-28 18:23:02.131264
2438	\N	364	\N	Planejado	2026-05-28 18:23:02.131264	2026-05-28 18:23:02.131264
2439	\N	247	\N	Planejado	2026-05-28 18:23:02.131264	2026-05-28 18:23:02.131264
2479	\N	243	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2480	\N	276	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2481	\N	230	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2482	\N	243	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2483	\N	276	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2484	\N	230	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2475	\N	232	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2476	\N	305	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2477	\N	387	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2478	\N	305	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2472	\N	271	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2473	\N	227	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2474	\N	283	\N	Planejado	2026-05-31 12:29:08.694876	2026-05-31 12:29:08.694876
2491	\N	253	\N	Planejado e não Executado	2026-06-01 15:38:52.82652	2026-06-01 15:38:52.82652
2492	\N	376	\N	Planejado e não Executado	2026-06-01 15:38:52.82652	2026-06-01 15:38:52.82652
2493	\N	313	\N	Planejado e não Executado	2026-06-01 15:38:52.82652	2026-06-01 15:38:52.82652
2485	\N	214	\N	Planejado e não Executado	2026-06-01 15:38:52.82652	2026-06-01 15:38:52.82652
2486	\N	277	\N	Planejado e não Executado	2026-06-01 15:38:52.82652	2026-06-01 15:38:52.82652
2487	\N	242	\N	Planejado e não Executado	2026-06-01 15:38:52.82652	2026-06-01 15:38:52.82652
2488	\N	238	\N	Planejado e não Executado	2026-06-01 15:38:52.82652	2026-06-01 15:38:52.82652
2489	\N	364	\N	Planejado e não Executado	2026-06-01 15:38:52.82652	2026-06-01 15:38:52.82652
2490	\N	247	\N	Planejado e não Executado	2026-06-01 15:38:52.82652	2026-06-01 15:38:52.82652
2494	\N	236	\N	Planejado e não Executado	2026-06-03 16:32:23.329727	2026-06-03 16:32:23.329727
2495	\N	296	\N	Planejado e não Executado	2026-06-03 16:32:23.329727	2026-06-03 16:32:23.329727
2496	\N	369	\N	Planejado e não Executado	2026-06-03 16:32:23.329727	2026-06-03 16:32:23.329727
2497	2449	236	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2498	2450	296	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2499	2451	369	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2500	2452	225	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2501	2453	328	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2502	2454	377	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2503	2455	255	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2504	2456	265	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2505	2457	359	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2506	2458	355	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2507	2459	349	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2508	2460	374	\N	Planejado e não Executado	2026-06-03 16:37:08.556336	2026-06-03 16:37:08.556336
2509	\N	287	861	Apenas executado	2026-06-03 17:00:22.969739	2026-06-03 17:00:22.969739
2510	\N	287	862	Apenas executado	2026-06-03 17:00:22.976787	2026-06-03 17:00:22.976787
2158	2159	347	863	Planejado e executado	2026-05-19 18:56:08.873915	2026-06-03 17:00:22.988854
2511	\N	282	864	Apenas executado	2026-06-03 17:00:22.997158	2026-06-03 17:00:22.997158
2512	\N	362	865	Apenas executado	2026-06-03 17:00:23.007232	2026-06-03 17:00:23.007232
2513	\N	362	867	Apenas executado	2026-06-03 17:00:23.018527	2026-06-03 17:00:23.018527
2514	\N	259	868	Apenas executado	2026-06-03 17:00:23.028523	2026-06-03 17:00:23.028523
2515	\N	259	869	Apenas executado	2026-06-03 17:00:23.035756	2026-06-03 17:00:23.035756
2516	\N	226	870	Apenas executado	2026-06-03 17:00:23.041309	2026-06-03 17:00:23.041309
2517	\N	320	871	Apenas executado	2026-06-03 17:00:23.048958	2026-06-03 17:00:23.048958
2518	\N	320	872	Apenas executado	2026-06-03 17:00:23.054379	2026-06-03 17:00:23.054379
2519	\N	318	873	Apenas executado	2026-06-03 17:00:23.068703	2026-06-03 17:00:23.068703
2520	\N	200	876	Apenas executado	2026-06-03 17:00:23.106916	2026-06-03 17:00:23.106916
2521	\N	200	877	Apenas executado	2026-06-03 17:00:23.112263	2026-06-03 17:00:23.112263
2522	\N	200	878	Apenas executado	2026-06-03 17:00:23.117379	2026-06-03 17:00:23.117379
2523	\N	288	879	Apenas executado	2026-06-03 17:00:23.129402	2026-06-03 17:00:23.129402
2524	\N	288	880	Apenas executado	2026-06-03 17:00:23.134873	2026-06-03 17:00:23.134873
2106	2107	220	882	Planejado e executado	2026-05-19 18:50:21.887055	2026-06-03 17:00:23.15483
2525	\N	220	883	Apenas executado	2026-06-03 17:00:23.160359	2026-06-03 17:00:23.160359
2526	\N	328	884	Apenas executado	2026-06-03 17:00:23.175021	2026-06-03 17:00:23.175021
2527	\N	328	885	Apenas executado	2026-06-03 17:00:23.181394	2026-06-03 17:00:23.181394
2528	\N	215	886	Apenas executado	2026-06-03 17:00:23.190734	2026-06-03 17:00:23.190734
2529	\N	196	887	Apenas executado	2026-06-03 17:00:23.198301	2026-06-03 17:00:23.198301
2530	\N	196	888	Apenas executado	2026-06-03 17:00:23.203782	2026-06-03 17:00:23.203782
2531	\N	210	890	Apenas executado	2026-06-03 17:00:23.221247	2026-06-03 17:00:23.221247
2532	\N	236	893	Apenas executado	2026-06-03 17:00:23.249885	2026-06-03 17:00:23.249885
2533	\N	325	895	Apenas executado	2026-06-03 17:00:23.276795	2026-06-03 17:00:23.276795
2534	\N	248	897	Apenas executado	2026-06-03 17:00:23.296595	2026-06-03 17:00:23.296595
2535	\N	277	898	Apenas executado	2026-06-03 17:00:23.307636	2026-06-03 17:00:23.307636
2536	\N	277	899	Apenas executado	2026-06-03 17:00:23.312403	2026-06-03 17:00:23.312403
2537	\N	360	900	Apenas executado	2026-06-03 17:00:23.322295	2026-06-03 17:00:23.322295
2538	\N	198	902	Apenas executado	2026-06-03 17:00:23.343521	2026-06-03 17:00:23.343521
2539	\N	251	903	Apenas executado	2026-06-03 17:00:23.354034	2026-06-03 17:00:23.354034
2129	2130	364	904	Planejado e executado	2026-05-19 18:52:31.401462	2026-06-03 17:00:23.363778
2540	\N	237	906	Apenas executado	2026-06-03 17:00:23.377261	2026-06-03 17:00:23.377261
2541	\N	237	907	Apenas executado	2026-06-03 17:00:23.381987	2026-06-03 17:00:23.381987
2542	\N	355	908	Apenas executado	2026-06-03 17:00:23.390926	2026-06-03 17:00:23.390926
2543	\N	356	909	Apenas executado	2026-06-03 17:00:23.398332	2026-06-03 17:00:23.398332
2544	\N	255	910	Apenas executado	2026-06-03 17:00:23.410423	2026-06-03 17:00:23.410423
2545	\N	255	911	Apenas executado	2026-06-03 17:00:23.415769	2026-06-03 17:00:23.415769
2546	\N	353	913	Apenas executado	2026-06-03 17:00:23.428666	2026-06-03 17:00:23.428666
2547	\N	258	914	Apenas executado	2026-06-03 17:00:23.438329	2026-06-03 17:00:23.438329
2548	\N	258	915	Apenas executado	2026-06-03 17:00:23.44354	2026-06-03 17:00:23.44354
2549	\N	258	916	Apenas executado	2026-06-03 17:00:23.448919	2026-06-03 17:00:23.448919
2550	\N	286	917	Apenas executado	2026-06-03 17:00:23.460949	2026-06-03 17:00:23.460949
2551	\N	286	918	Apenas executado	2026-06-03 17:00:23.466413	2026-06-03 17:00:23.466413
2552	\N	393	920	Apenas executado	2026-06-03 17:00:23.480658	2026-06-03 17:00:23.480658
2553	\N	393	921	Apenas executado	2026-06-03 17:00:23.486251	2026-06-03 17:00:23.486251
2554	\N	393	922	Apenas executado	2026-06-03 17:00:23.491458	2026-06-03 17:00:23.491458
2555	\N	393	923	Apenas executado	2026-06-03 17:00:23.496923	2026-06-03 17:00:23.496923
2123	2124	265	924	Planejado e executado	2026-05-19 18:52:31.401462	2026-06-03 17:00:23.506816
2556	\N	197	926	Apenas executado	2026-06-03 17:00:23.520497	2026-06-03 17:00:23.520497
2557	\N	301	927	Apenas executado	2026-06-03 17:00:23.534173	2026-06-03 17:00:23.534173
2558	\N	301	928	Apenas executado	2026-06-03 17:00:23.539759	2026-06-03 17:00:23.539759
2559	\N	301	929	Apenas executado	2026-06-03 17:00:23.54529	2026-06-03 17:00:23.54529
2560	\N	326	931	Apenas executado	2026-06-03 17:00:23.559994	2026-06-03 17:00:23.559994
2561	\N	313	933	Apenas executado	2026-06-03 17:00:23.578042	2026-06-03 17:00:23.578042
2562	\N	204	935	Apenas executado	2026-06-03 17:00:23.59698	2026-06-03 17:00:23.59698
2563	\N	331	937	Apenas executado	2026-06-03 17:00:23.616777	2026-06-03 17:00:23.616777
2564	\N	317	940	Apenas executado	2026-06-03 17:00:23.64477	2026-06-03 17:00:23.64477
2565	\N	317	941	Apenas executado	2026-06-03 17:00:23.650037	2026-06-03 17:00:23.650037
2566	\N	296	945	Apenas executado	2026-06-03 17:00:23.683648	2026-06-03 17:00:23.683648
2567	\N	367	947	Apenas executado	2026-06-03 17:00:23.699388	2026-06-03 17:00:23.699388
2568	\N	367	948	Apenas executado	2026-06-03 17:00:23.705014	2026-06-03 17:00:23.705014
2569	\N	342	949	Apenas executado	2026-06-03 17:00:23.71362	2026-06-03 17:00:23.71362
2570	\N	342	950	Apenas executado	2026-06-03 17:00:23.718819	2026-06-03 17:00:23.718819
2571	\N	376	951	Apenas executado	2026-06-03 17:00:23.733263	2026-06-03 17:00:23.733263
2572	\N	206	952	Apenas executado	2026-06-03 17:00:23.752076	2026-06-03 17:00:23.752076
2573	\N	206	953	Apenas executado	2026-06-03 17:00:23.757293	2026-06-03 17:00:23.757293
2574	\N	206	954	Apenas executado	2026-06-03 17:00:23.762284	2026-06-03 17:00:23.762284
2575	\N	252	955	Apenas executado	2026-06-03 17:00:23.774796	2026-06-03 17:00:23.774796
2576	\N	252	956	Apenas executado	2026-06-03 17:00:23.77999	2026-06-03 17:00:23.77999
2577	\N	221	957	Apenas executado	2026-06-03 17:00:23.790415	2026-06-03 17:00:23.790415
2578	\N	221	958	Apenas executado	2026-06-03 17:00:23.795488	2026-06-03 17:00:23.795488
2579	\N	221	959	Apenas executado	2026-06-03 17:00:23.800752	2026-06-03 17:00:23.800752
2580	\N	324	960	Apenas executado	2026-06-03 17:00:23.809266	2026-06-03 17:00:23.809266
2581	\N	203	961	Apenas executado	2026-06-03 17:00:23.81846	2026-06-03 17:00:23.81846
2582	\N	207	962	Apenas executado	2026-06-03 17:00:23.829669	2026-06-03 17:00:23.829669
2124	2125	199	963	Planejado e executado	2026-05-19 18:52:31.401462	2026-06-03 17:00:23.837014
2583	\N	238	965	Apenas executado	2026-06-03 17:00:23.85393	2026-06-03 17:00:23.85393
2584	\N	214	966	Apenas executado	2026-06-03 17:00:23.865478	2026-06-03 17:00:23.865478
2585	\N	224	968	Apenas executado	2026-06-03 17:00:23.879466	2026-06-03 17:00:23.879466
2586	\N	224	969	Apenas executado	2026-06-03 17:00:23.884731	2026-06-03 17:00:23.884731
2587	\N	216	974	Apenas executado	2026-06-03 17:00:23.918938	2026-06-03 17:00:23.918938
2588	\N	216	975	Apenas executado	2026-06-03 17:00:23.924186	2026-06-03 17:00:23.924186
2589	\N	381	977	Apenas executado	2026-06-03 17:00:50.871448	2026-06-03 17:00:50.871448
2590	\N	381	978	Apenas executado	2026-06-03 17:00:50.882841	2026-06-03 17:00:50.882841
2591	\N	379	979	Apenas executado	2026-06-03 17:00:50.901528	2026-06-03 17:00:50.901528
2592	\N	386	980	Apenas executado	2026-06-03 17:00:50.937989	2026-06-03 17:00:50.937989
2593	\N	386	981	Apenas executado	2026-06-03 17:00:50.943537	2026-06-03 17:00:50.943537
2594	\N	386	982	Apenas executado	2026-06-03 17:00:50.949167	2026-06-03 17:00:50.949167
2595	\N	380	983	Apenas executado	2026-06-03 17:00:50.969645	2026-06-03 17:00:50.969645
2596	\N	382	984	Apenas executado	2026-06-03 17:01:01.135636	2026-06-03 17:01:01.135636
2597	\N	382	985	Apenas executado	2026-06-03 17:01:01.146074	2026-06-03 17:01:01.146074
2598	\N	230	986	Apenas executado	2026-06-03 17:04:58.474451	2026-06-03 17:04:58.474451
2599	\N	271	987	Apenas executado	2026-06-03 17:04:58.484989	2026-06-03 17:04:58.484989
2600	\N	287	988	Apenas executado	2026-06-03 17:04:58.507423	2026-06-03 17:04:58.507423
2601	\N	242	989	Apenas executado	2026-06-03 17:04:58.564189	2026-06-03 17:04:58.564189
2602	\N	359	990	Apenas executado	2026-06-03 17:04:58.576371	2026-06-03 17:04:58.576371
2603	\N	328	991	Apenas executado	2026-06-03 17:04:58.630261	2026-06-03 17:04:58.630261
2604	\N	196	992	Apenas executado	2026-06-03 17:04:58.646041	2026-06-03 17:04:58.646041
2605	\N	196	993	Apenas executado	2026-06-03 17:04:58.651256	2026-06-03 17:04:58.651256
2606	\N	305	994	Apenas executado	2026-06-03 17:04:58.690057	2026-06-03 17:04:58.690057
2607	\N	232	995	Apenas executado	2026-06-03 17:04:58.722118	2026-06-03 17:04:58.722118
2608	\N	232	996	Apenas executado	2026-06-03 17:04:58.727133	2026-06-03 17:04:58.727133
2609	\N	360	997	Apenas executado	2026-06-03 17:04:58.738759	2026-06-03 17:04:58.738759
2610	\N	253	998	Apenas executado	2026-06-03 17:04:58.744015	2026-06-03 17:04:58.744015
2611	\N	198	999	Apenas executado	2026-06-03 17:04:58.755177	2026-06-03 17:04:58.755177
2612	\N	251	1000	Apenas executado	2026-06-03 17:04:58.766474	2026-06-03 17:04:58.766474
2613	\N	330	1001	Apenas executado	2026-06-03 17:04:58.830861	2026-06-03 17:04:58.830861
2614	\N	313	1002	Apenas executado	2026-06-03 17:04:58.897457	2026-06-03 17:04:58.897457
2615	\N	283	1003	Apenas executado	2026-06-03 17:04:58.914613	2026-06-03 17:04:58.914613
2616	\N	321	1004	Apenas executado	2026-06-03 17:04:58.937692	2026-06-03 17:04:58.937692
2617	\N	376	1005	Apenas executado	2026-06-03 17:04:58.996221	2026-06-03 17:04:58.996221
2618	\N	376	1006	Apenas executado	2026-06-03 17:04:59.001117	2026-06-03 17:04:59.001117
2619	\N	206	1007	Apenas executado	2026-06-03 17:04:59.019781	2026-06-03 17:04:59.019781
2620	\N	252	1008	Apenas executado	2026-06-03 17:04:59.035083	2026-06-03 17:04:59.035083
2621	\N	221	1009	Apenas executado	2026-06-03 17:04:59.049959	2026-06-03 17:04:59.049959
2622	\N	214	1010	Apenas executado	2026-06-03 17:04:59.099025	2026-06-03 17:04:59.099025
2623	\N	243	1011	Apenas executado	2026-06-03 17:04:59.122942	2026-06-03 17:04:59.122942
2624	\N	247	1012	Apenas executado	2026-06-03 17:04:59.138916	2026-06-03 17:04:59.138916
2625	\N	379	1013	Apenas executado	2026-06-03 17:09:11.985009	2026-06-03 17:09:11.985009
2626	\N	380	1014	Apenas executado	2026-06-03 17:09:12.036198	2026-06-03 17:09:12.036198
2627	\N	380	1015	Apenas executado	2026-06-03 17:09:12.041366	2026-06-03 17:09:12.041366
\.


--
-- Data for Name: escala_planejamento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.escala_planejamento (id_escala, id_ciclo, id_militar, id_disponibilidade, id_tipo_servico, data_servico, horario_servico, horario_embarque, nome_recurso, funcao, observacoes, publicado) FROM stdin;
1897	2	382	23947	1	2026-05-21	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1898	2	377	25725	1	2026-05-21	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
1899	2	315	22351	1	2026-05-21	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1183	1	213	14161	2	2026-04-19	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
1184	1	227	14833	2	2026-04-19	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
1185	1	241	14199	2	2026-04-19	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
1900	2	237	21317	1	2026-05-21	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1901	2	355	21871	1	2026-05-21	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1902	2	305	23668	1	2026-05-21	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1186	1	214	14815	2	2026-04-19	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
1187	1	325	13700	2	2026-04-19	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
1188	1	305	13551	2	2026-04-19	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
856	1	213	28046	2	2026-05-10	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
857	1	341	28142	2	2026-05-10	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
858	1	277	29090	2	2026-05-10	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
859	1	216	21930	2	2026-05-10	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
860	1	283	26404	2	2026-05-10	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
861	1	353	21581	2	2026-05-10	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
862	1	320	28370	2	2026-05-10	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
863	1	325	21973	2	2026-05-10	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
864	1	368	\N	2	2026-05-10	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
865	1	243	22070	2	2026-05-10	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
866	1	349	24209	2	2026-05-10	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
867	1	364	\N	2	2026-05-10	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
967	1	199	27954	1	2026-05-12	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
968	1	376	28182	1	2026-05-12	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
969	1	382	23888	1	2026-05-12	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
763	1	203	\N	2	2026-05-08	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
764	1	215	22396	2	2026-05-08	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
765	1	210	29343	2	2026-05-08	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
970	1	214	24104	1	2026-05-12	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
971	1	265	22472	1	2026-05-12	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
972	1	229	21881	1	2026-05-12	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
973	1	220	21438	1	2026-05-12	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
766	1	229	21905	2	2026-05-08	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
767	1	283	26401	2	2026-05-08	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
768	1	286	22119	2	2026-05-08	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
769	1	230	29171	2	2026-05-08	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
770	1	359	27873	2	2026-05-08	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
771	1	248	28563	2	2026-05-08	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
772	1	199	27982	2	2026-05-08	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
773	1	265	22485	2	2026-05-08	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
774	1	225	28411	2	2026-05-08	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
775	1	255	24164	2	2026-05-08	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
776	1	324	28155	2	2026-05-08	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
777	1	259	22573	2	2026-05-08	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
974	1	359	27862	1	2026-05-12	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
975	1	242	22870	1	2026-05-12	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
976	1	207	23805	2	2026-05-12	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
484	1	203	24219	2	2026-05-01	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
485	1	305	23659	2	2026-05-01	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
486	1	215	22389	2	2026-05-01	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
487	1	243	22076	2	2026-05-01	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
488	1	325	21991	2	2026-05-01	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
489	1	315	22327	2	2026-05-01	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
490	1	238	23527	2	2026-05-01	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
491	1	313	23758	2	2026-05-01	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
703	1	235	22040	1	2026-05-07	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
704	1	328	22830	1	2026-05-07	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
705	1	247	29219	1	2026-05-07	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
706	1	225	28408	1	2026-05-07	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
707	1	265	22482	1	2026-05-07	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
708	1	356	28170	1	2026-05-07	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
709	1	216	21944	1	2026-05-07	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
710	1	317	24085	1	2026-05-07	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
711	1	248	28567	1	2026-05-07	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
712	1	204	24225	2	2026-05-07	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
713	1	361	28240	2	2026-05-07	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
714	1	230	29168	2	2026-05-07	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
492	1	297	22413	2	2026-05-01	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
493	1	214	24110	2	2026-05-01	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
494	1	328	22813	2	2026-05-01	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
495	1	350	22302	2	2026-05-01	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
496	1	255	24157	2	2026-05-01	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
497	1	259	22574	2	2026-05-01	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
498	1	362	24021	2	2026-05-01	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
595	1	228	22597	1	2026-05-04	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
596	1	313	23761	1	2026-05-04	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
597	1	360	\N	1	2026-05-04	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
598	1	220	21444	1	2026-05-04	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
599	1	326	21271	1	2026-05-04	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
600	1	286	22107	1	2026-05-04	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
601	1	207	23817	2	2026-05-04	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
602	1	339	24187	2	2026-05-04	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
603	1	318	16496	2	2026-05-04	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
532	1	214	24112	2	2026-05-02	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
533	1	326	21260	2	2026-05-02	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
534	1	297	22415	2	2026-05-02	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
535	1	382	23901	2	2026-05-02	20:00 às 04:00	\N	Força Tarefa PARICONHA	Comandante	8h	t
536	1	325	21992	2	2026-05-02	20:00 às 04:00	\N	Força Tarefa PARICONHA	Motorista	8h	t
537	1	320	\N	2	2026-05-02	20:00 às 04:00	\N	Força Tarefa PARICONHA	Patrulheiro	8h	t
538	1	381	21678	2	2026-05-02	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
539	1	317	24090	2	2026-05-02	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
540	1	265	22487	2	2026-05-02	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
541	1	242	22876	2	2026-05-02	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
542	1	349	24211	2	2026-05-02	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
543	1	369	22523	2	2026-05-02	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
2122	2	225	28426	1	2026-05-26	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
2123	2	377	25733	1	2026-05-26	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
2124	2	265	22502	1	2026-05-26	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
2125	2	199	28022	1	2026-05-26	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
2126	2	296	15378	1	2026-05-26	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
2127	2	237	21321	1	2026-05-26	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1189	1	382	14640	2	2026-04-19	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
1190	1	340	13798	2	2026-04-19	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
1191	1	320	13666	2	2026-04-19	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
1192	1	256	14850	2	2026-04-19	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1193	1	362	13890	2	2026-04-19	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1579	1	203	\N	2	2026-05-15	14:00 às 22:00	\N	Força Tarefa 01DELMIRO	Comandante	8h	t
577	1	235	22041	2	2026-05-03	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
578	1	362	24027	2	2026-05-03	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
579	1	247	\N	2	2026-05-03	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
580	1	205	24228	2	2026-05-03	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
581	1	239	23613	2	2026-05-03	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
582	1	353	21585	2	2026-05-03	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
583	1	216	21940	1	2026-05-03	16:00 às 22:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
584	1	328	22828	1	2026-05-03	16:00 às 22:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
585	1	364	22946	1	2026-05-03	16:00 às 22:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
586	1	204	24222	2	2026-05-03	16:00 às 00:00	\N	Força Tarefa PIRINHAS	Comandante	8h	t
587	1	329	21958	2	2026-05-03	16:00 às 00:00	\N	Força Tarefa PIRINHAS	Motorista	8h	t
588	1	376	\N	2	2026-05-03	16:00 às 00:00	\N	Força Tarefa PIRINHAS	Patrulheiro	8h	t
1580	1	317	24081	2	2026-05-15	14:00 às 22:00	\N	Força Tarefa 01DELMIRO	Motorista	8h	t
1581	1	305	23648	2	2026-05-15	14:00 às 22:00	\N	Força Tarefa 01DELMIRO	Patrulheiro	8h	t
1582	1	225	28405	2	2026-05-15	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
977	1	276	28313	2	2026-05-12	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
978	1	230	29153	2	2026-05-12	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1583	1	364	22942	2	2026-05-15	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
1584	1	377	25709	2	2026-05-15	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
1585	1	237	21305	2	2026-05-15	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
1586	1	355	21862	2	2026-05-15	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
1587	1	327	29378	2	2026-05-15	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
1588	1	199	27966	2	2026-05-15	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
1589	1	282	28685	2	2026-05-15	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
1590	1	356	28166	2	2026-05-15	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
1591	1	255	24154	2	2026-05-15	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
2128	2	359	27898	2	2026-05-26	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
2129	2	349	24215	2	2026-05-26	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
2130	2	364	22986	2	2026-05-26	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1194	1	277	14315	2	2026-04-19	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1045	1	229	21889	1	2026-05-14	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1046	1	325	21985	1	2026-05-14	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
808	1	381	21685	2	2026-05-09	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
809	1	227	28352	2	2026-05-09	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
810	1	318	16492	2	2026-05-09	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
811	1	214	24122	2	2026-05-09	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
812	1	367	22760	2	2026-05-09	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
813	1	313	23771	2	2026-05-09	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
814	1	238	23551	2	2026-05-09	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
815	1	326	21268	2	2026-05-09	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
816	1	297	22419	2	2026-05-09	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
817	1	204	\N	2	2026-05-09	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
818	1	296	15359	2	2026-05-09	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
819	1	226	\N	2	2026-05-09	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
820	1	207	23831	2	2026-05-09	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
821	1	362	24039	2	2026-05-09	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
822	1	260	23989	2	2026-05-09	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1047	1	282	28682	1	2026-05-14	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1048	1	239	23606	1	2026-05-14	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
1049	1	355	21861	1	2026-05-14	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
1050	1	347	29197	1	2026-05-14	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
1051	1	220	21442	1	2026-05-14	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1052	1	359	27865	1	2026-05-14	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1053	1	248	28554	1	2026-05-14	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1054	1	331	21787	2	2026-05-14	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1055	1	377	25708	2	2026-05-14	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1056	1	364	22938	2	2026-05-14	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1213	1	282	14063	1	2026-04-20	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1214	1	364	13763	1	2026-04-20	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
880	1	214	24118	1	2026-05-06	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
881	1	296	15356	1	2026-05-06	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
882	1	283	26398	1	2026-05-06	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
883	1	213	28066	1	2026-05-06	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
884	1	282	28687	1	2026-05-06	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
885	1	277	29111	1	2026-05-06	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
886	1	205	24231	1	2026-05-06	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
887	1	239	23610	1	2026-05-06	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
888	1	305	23653	1	2026-05-06	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
889	1	243	22078	2	2026-05-06	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
890	1	364	22954	2	2026-05-06	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
891	1	242	22885	2	2026-05-06	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
892	1	229	21897	1	2026-05-05	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
893	1	316	25536	1	2026-05-05	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
894	1	377	25718	1	2026-05-05	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
895	1	260	23985	1	2026-05-05	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
896	1	355	21867	1	2026-05-05	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
897	1	331	21791	1	2026-05-05	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
898	1	237	21307	1	2026-05-05	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
899	1	367	22755	1	2026-05-05	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
900	1	362	24030	1	2026-05-05	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
901	1	342	23633	2	2026-05-05	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
902	1	321	22725	2	2026-05-05	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
903	1	360	21724	2	2026-05-05	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1215	1	315	13617	1	2026-04-20	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1066	1	382	14629	1	2026-04-16	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1067	1	369	13920	1	2026-04-16	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
1068	1	229	14232	1	2026-04-16	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1069	1	230	14348	1	2026-04-16	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1070	1	315	13613	1	2026-04-16	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1071	1	283	14604	1	2026-04-16	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1072	1	204	\N	2	2026-04-16	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1073	1	377	13992	2	2026-04-16	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1074	1	241	14198	2	2026-04-16	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1216	1	242	14126	1	2026-04-20	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1217	1	377	13997	1	2026-04-20	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1218	1	261	14293	1	2026-04-20	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1219	1	237	14434	2	2026-04-20	09:00 às 17:00	\N	Força Tarefa PELOPES	Comandante	8h	t
1220	1	355	13692	2	2026-04-20	09:00 às 17:00	\N	Força Tarefa PELOPES	Motorista	8h	t
1387	1	248	14623	1	2026-04-28	20:00 às 02:00	\N	FORÇA TAREFA 02 DELMIRO	Comandante	6h	t
1388	1	261	14302	1	2026-04-28	20:00 às 02:00	\N	FORÇA TAREFA 02 DELMIRO	Motorista	6h	t
1389	1	329	13813	1	2026-04-28	20:00 às 02:00	\N	FORÇA TAREFA 02 DELMIRO	Patrulheiro	6h	t
1390	1	205	\N	1	2026-04-28	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1391	1	305	13575	1	2026-04-28	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1392	1	239	14557	1	2026-04-28	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1221	1	317	\N	2	2026-04-20	09:00 às 17:00	\N	Força Tarefa PELOPES	Patrulheiro	8h	t
1222	1	207	14870	2	2026-04-20	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1223	1	374	13950	2	2026-04-20	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1224	1	235	14404	2	2026-04-20	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1105	1	203	\N	2	2026-04-17	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
1106	1	228	14184	2	2026-04-17	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
1107	1	210	\N	2	2026-04-17	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
1108	1	271	14033	2	2026-04-17	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
1109	1	329	13807	2	2026-04-17	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
1110	1	339	13818	2	2026-04-17	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
1111	1	205	\N	2	2026-04-17	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
1112	1	347	13855	2	2026-04-17	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
1113	1	239	14546	2	2026-04-17	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
1114	1	381	\N	2	2026-04-17	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
1115	1	282	14060	2	2026-04-17	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
1116	1	248	14613	2	2026-04-17	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
1117	1	235	14401	2	2026-04-17	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1118	1	259	14016	2	2026-04-17	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1119	1	253	14682	2	2026-04-17	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1237	1	382	14646	2	2026-04-21	18:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
1238	1	359	13840	2	2026-04-21	18:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
1239	1	328	13736	2	2026-04-21	18:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
1240	1	248	14617	2	2026-04-21	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
1241	1	305	13556	2	2026-04-21	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
1242	1	318	13644	2	2026-04-21	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
1243	1	238	\N	2	2026-04-21	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1244	1	369	13932	2	2026-04-21	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1138	1	230	14353	2	2026-04-18	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
1139	1	317	13628	2	2026-04-18	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
1140	1	297	\N	2	2026-04-18	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
1141	1	238	\N	2	2026-04-18	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
1142	1	376	13963	2	2026-04-18	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
1143	1	313	13579	2	2026-04-18	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
1144	1	204	\N	2	2026-04-18	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
1145	1	367	\N	2	2026-04-18	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
1146	1	296	13480	2	2026-04-18	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
1147	1	247	14573	2	2026-04-18	18:00 às 02:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1148	1	328	13731	2	2026-04-18	18:00 às 02:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1149	1	362	13887	2	2026-04-18	18:00 às 02:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1245	1	272	14563	2	2026-04-21	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1255	1	205	\N	1	2026-04-22	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1256	1	271	14041	1	2026-04-22	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
1257	1	328	13737	1	2026-04-22	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1258	1	220	14801	1	2026-04-22	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1259	1	321	\N	1	2026-04-22	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1260	1	228	14185	1	2026-04-22	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1261	1	230	14365	2	2026-04-22	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1262	1	340	13800	2	2026-04-22	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1263	1	376	13970	2	2026-04-22	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1273	1	213	14170	1	2026-04-23	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1274	1	367	13678	1	2026-04-23	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
1275	1	296	13486	1	2026-04-23	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1276	1	216	14594	1	2026-04-23	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1277	1	326	13720	1	2026-04-23	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1278	1	283	14607	1	2026-04-23	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1279	1	229	14236	2	2026-04-23	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1280	1	362	13899	2	2026-04-23	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1281	1	253	14696	2	2026-04-23	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1291	1	237	14438	2	2026-04-24	14:00 às 22:00	\N	Força Tarefa 01 AGUA BRANCA	Comandante	8h	t
1292	1	317	\N	2	2026-04-24	14:00 às 22:00	\N	Força Tarefa 01 AGUA BRANCA	Motorista	8h	t
1293	1	305	13565	2	2026-04-24	14:00 às 22:00	\N	Força Tarefa 01 AGUA BRANCA	Patrulheiro	8h	t
1294	1	204	\N	2	2026-04-24	21:00 às 05:00	\N	Força Tarefa 03 AGUA BRANCA	Comandante	8h	t
1295	1	361	\N	2	2026-04-24	21:00 às 05:00	\N	Força Tarefa 03 AGUA BRANCA	Motorista	8h	t
1296	1	347	13858	2	2026-04-24	21:00 às 05:00	\N	Força Tarefa 03 AGUA BRANCA	Patrulheiro	8h	t
1297	1	230	14369	2	2026-04-24	22:00 às 06:00	\N	Força Tarefa	Comandante	8h	t
1298	1	247	\N	2	2026-04-24	22:00 às 06:00	\N	Força Tarefa	Motorista	8h	t
1299	1	253	14698	2	2026-04-24	22:00 às 06:00	\N	Força Tarefa	Patrulheiro	8h	t
1903	2	204	33965	1	2026-05-21	20:00 às 02:00	\N	Força Tarefa PIRANHAS	Comandante	6h	t
1904	2	328	22843	1	2026-05-21	20:00 às 02:00	\N	Força Tarefa PIRANHAS	Motorista	6h	t
1905	2	236	28445	1	2026-05-21	20:00 às 02:00	\N	Força Tarefa PIRANHAS	Patrulheiro	6h	t
1906	2	260	23998	2	2026-05-21	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1907	2	376	28214	2	2026-05-21	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1908	2	313	23783	2	2026-05-21	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1393	1	241	14211	2	2026-04-28	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1394	1	369	13940	2	2026-04-28	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1395	1	374	13956	2	2026-04-28	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1945	2	220	21457	2	2026-05-22	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
1946	2	329	21964	2	2026-05-22	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
1947	2	237	21319	2	2026-05-22	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
1318	1	205	\N	2	2026-04-25	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
1319	1	347	13862	2	2026-04-25	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
1320	1	239	14553	2	2026-04-25	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
1321	1	382	14659	2	2026-04-25	20:00 às 04:00	\N	Força Tarefa PARICONHA	Comandante	8h	t
1322	1	369	13936	2	2026-04-25	20:00 às 04:00	\N	Força Tarefa PARICONHA	Motorista	8h	t
1323	1	320	13674	2	2026-04-25	20:00 às 04:00	\N	Força Tarefa PARICONHA	Patrulheiro	8h	t
1324	1	213	14172	2	2026-04-25	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
1325	1	329	13811	2	2026-04-25	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
1326	1	226	14426	2	2026-04-25	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
1327	1	235	14414	2	2026-04-25	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1328	1	376	13977	2	2026-04-25	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1329	1	374	13953	2	2026-04-25	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1948	2	239	23620	2	2026-05-22	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
1949	2	347	29203	2	2026-05-22	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
1950	2	353	21588	2	2026-05-22	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
1951	2	203	\N	2	2026-05-22	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
1952	2	248	28577	2	2026-05-22	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
1953	2	215	22402	2	2026-05-22	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
1414	1	220	14807	1	2026-04-29	18:00 às 00:00	\N	FORÇA TAREFA 3ª CIA	Comandante	6h	t
1415	1	318	13655	1	2026-04-29	18:00 às 00:00	\N	FORÇA TAREFA 3ª CIA	Motorista	6h	t
1416	1	282	14070	1	2026-04-29	18:00 às 00:00	\N	FORÇA TAREFA 3ª CIA	Patrulheiro	6h	t
1417	1	247	14588	1	2026-04-29	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
1418	1	286	\N	1	2026-04-29	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
1419	1	271	14053	1	2026-04-29	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
1420	1	207	14898	1	2026-04-29	08:00 às 14:00	\N	Força Tarefa JURI MATA GRANDE	Comandante	6h	t
1421	1	377	14012	1	2026-04-29	08:00 às 14:00	\N	Força Tarefa JURI MATA GRANDE	Motorista	6h	t
1422	1	297	\N	1	2026-04-29	08:00 às 14:00	\N	Força Tarefa JURI MATA GRANDE	Patrulheiro	6h	t
1348	1	247	14585	2	2026-04-26	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
1349	1	328	13743	2	2026-04-26	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
1350	1	296	\N	2	2026-04-26	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
1351	1	238	\N	2	2026-04-26	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
1352	1	339	13826	2	2026-04-26	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
1353	1	367	13681	2	2026-04-26	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
1354	1	226	14428	2	2026-04-26	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
1355	1	350	13832	2	2026-04-26	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
1356	1	277	14333	2	2026-04-26	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
1357	1	207	14890	2	2026-04-26	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1358	1	362	13905	2	2026-04-26	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1359	1	286	14728	2	2026-04-26	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1423	1	235	14421	2	2026-04-29	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1424	1	288	\N	2	2026-04-29	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1425	1	360	\N	2	2026-04-29	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1369	1	213	14175	1	2026-04-27	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
1370	1	376	13985	1	2026-04-27	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
1371	1	276	14224	1	2026-04-27	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
1372	1	214	14827	1	2026-04-27	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1373	1	364	13779	1	2026-04-27	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1374	1	256	14854	1	2026-04-27	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1375	1	369	\N	2	2026-04-27	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1376	1	340	13804	2	2026-04-27	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1377	1	355	13694	2	2026-04-27	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1592	1	259	22565	2	2026-05-15	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1593	1	318	\N	2	2026-05-15	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1594	1	359	27869	2	2026-05-15	21:00 às 05:00	\N	Força Tarefa SENADOR RUI PALMEIRA	Comandante	8h	t
1595	1	361	28238	2	2026-05-15	21:00 às 05:00	\N	Força Tarefa SENADOR RUI PALMEIRA	Motorista	8h	t
1596	1	320	28374	2	2026-05-15	21:00 às 05:00	\N	Força Tarefa SENADOR RUI PALMEIRA	Patrulheiro	8h	t
1456	1	277	14344	1	2026-04-30	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
1457	1	359	13846	1	2026-04-30	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
1458	1	360	\N	1	2026-04-30	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
1459	1	216	14602	1	2026-04-30	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1460	1	313	13609	1	2026-04-30	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1461	1	283	14610	1	2026-04-30	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1462	1	242	14141	2	2026-04-30	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1463	1	259	14029	2	2026-04-30	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1464	1	229	14248	2	2026-04-30	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1465	1	238	\N	1	2026-04-30	08:00 às 14:00	\N	Força TarefaJURI MATA GRANDE	Comandante	6h	t
1466	1	296	13495	1	2026-04-30	08:00 às 14:00	\N	Força TarefaJURI MATA GRANDE	Motorista	6h	t
1467	1	228	14193	1	2026-04-30	08:00 às 14:00	\N	Força TarefaJURI MATA GRANDE	Patrulheiro	6h	t
1468	1	213	28047	1	2026-05-11	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1469	1	329	21954	1	2026-05-11	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
1470	1	325	21977	1	2026-05-11	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1471	1	286	22091	2	2026-05-11	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1472	1	324	28151	2	2026-05-11	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1473	1	339	24179	2	2026-05-11	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1474	1	317	24078	1	2026-05-11	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1475	1	355	21859	1	2026-05-11	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1476	1	347	29194	1	2026-05-11	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
2158	2	239	23623	1	2026-05-27	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
2159	2	347	29206	1	2026-05-27	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
2160	2	353	21592	1	2026-05-27	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1954	2	204	33966	2	2026-05-22	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
1955	2	325	\N	2	2026-05-22	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
1956	2	283	\N	2	2026-05-22	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
1957	2	229	21917	2	2026-05-22	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1958	2	377	25729	2	2026-05-22	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1959	2	255	24171	2	2026-05-22	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
2161	2	230	29187	1	2026-05-27	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
2162	2	329	21966	1	2026-05-27	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1489	1	199	27958	1	2026-05-13	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1490	1	326	21252	1	2026-05-13	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
1491	1	318	16482	1	2026-05-13	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1492	1	277	29096	1	2026-05-13	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	6h	t
1493	1	339	24185	1	2026-05-13	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	6h	t
1494	1	260	23983	1	2026-05-13	20:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	6h	t
1495	1	215	22385	1	2026-05-13	18:00 às 00:00	\N	Força Tarefa 3ªcia	Comandante	6h	t
1496	1	367	22749	1	2026-05-13	18:00 às 00:00	\N	Força Tarefa 3ªcia	Motorista	6h	t
1497	1	236	28433	1	2026-05-13	18:00 às 00:00	\N	Força Tarefa 3ªcia	Patrulheiro	6h	t
1498	1	243	22072	2	2026-05-13	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1499	1	360	21721	2	2026-05-13	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1500	1	321	22719	2	2026-05-13	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
2163	2	248	28581	1	2026-05-27	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1807	2	265	22493	1	2026-05-19	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1808	2	329	21962	1	2026-05-19	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
1809	2	296	\N	1	2026-05-19	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1810	2	239	23616	1	2026-05-19	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1811	2	347	29200	1	2026-05-19	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1812	2	317	24091	1	2026-05-19	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1813	2	247	29228	2	2026-05-19	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1814	2	369	22535	2	2026-05-19	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1815	2	339	24195	2	2026-05-19	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
2164	2	242	22915	1	2026-05-27	20:00 às 02:00	\N	Força Tarefa PIRANHAS	Comandante	6h	t
2165	2	369	22547	1	2026-05-27	20:00 às 02:00	\N	Força Tarefa PIRANHAS	Motorista	6h	t
2166	2	247	29237	1	2026-05-27	20:00 às 02:00	\N	Força Tarefa PIRANHAS	Patrulheiro	6h	t
2167	2	362	24066	2	2026-05-27	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
2168	2	321	\N	2	2026-05-27	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
2169	2	360	21739	2	2026-05-27	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1756	2	213	28081	2	2026-05-17	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
1757	2	277	29120	2	2026-05-17	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
1758	2	227	28354	2	2026-05-17	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
1759	2	214	24126	2	2026-05-17	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
1760	2	339	24193	2	2026-05-17	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
1761	2	276	28317	2	2026-05-17	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
1762	2	260	23993	2	2026-05-17	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
1763	2	341	28146	2	2026-05-17	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
1764	2	305	23665	2	2026-05-17	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
1765	2	382	23935	2	2026-05-17	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
1766	2	350	30319	2	2026-05-17	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
1767	2	315	22339	2	2026-05-17	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
1768	2	207	23839	2	2026-05-17	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
2104	2	213	28101	1	2026-05-25	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
2105	2	326	21287	1	2026-05-25	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
2106	2	236	28450	1	2026-05-25	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
2107	2	220	21460	1	2026-05-25	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
2108	2	325	22008	1	2026-05-25	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
2109	2	283	\N	1	2026-05-25	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
2110	2	243	22084	2	2026-05-25	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
2111	2	276	28325	2	2026-05-25	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
2112	2	229	21921	2	2026-05-25	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1769	2	362	24042	2	2026-05-17	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1770	2	243	22080	2	2026-05-17	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1789	2	225	28417	1	2026-05-18	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1790	2	283	\N	1	2026-05-18	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
1791	2	229	21909	1	2026-05-18	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1792	2	220	21451	1	2026-05-18	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1793	2	282	28693	1	2026-05-18	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1794	2	248	28569	1	2026-05-18	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1795	2	235	22045	2	2026-05-18	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1796	2	349	24213	2	2026-05-18	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1797	2	325	22001	2	2026-05-18	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1708	2	199	27990	2	2026-05-16	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
1709	2	230	29172	2	2026-05-16	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
1710	2	331	21792	2	2026-05-16	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
1711	2	247	29225	2	2026-05-16	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
1712	2	326	21275	2	2026-05-16	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
1713	2	364	22966	2	2026-05-16	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
1714	2	238	23555	2	2026-05-16	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
1715	2	328	22832	2	2026-05-16	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
1716	2	313	23775	2	2026-05-16	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
1717	2	204	33960	2	2026-05-16	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
1718	2	359	27877	2	2026-05-16	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
1719	2	297	22420	2	2026-05-16	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
1720	2	207	23835	2	2026-05-16	18:00 às 02:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1721	2	376	28199	2	2026-05-16	18:00 às 02:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1722	2	242	22891	2	2026-05-16	18:00 às 02:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
1852	2	242	22900	1	2026-05-20	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Comandante	6h	t
1853	2	324	28159	1	2026-05-20	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Motorista	6h	t
1854	2	277	29126	1	2026-05-20	20:00 às 02:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	6h	t
1855	2	238	23567	1	2026-05-20	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	6h	t
1856	2	367	22764	1	2026-05-20	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	6h	t
1857	2	318	16502	1	2026-05-20	18:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	6h	t
1858	2	214	24130	1	2026-05-20	20:00 às 02:00	\N	Força Tarefa PIRANHAS	Comandante	6h	t
1859	2	364	22976	1	2026-05-20	20:00 às 02:00	\N	Força Tarefa PIRANHAS	Motorista	6h	t
1860	2	230	29179	1	2026-05-20	20:00 às 02:00	\N	Força Tarefa PIRANHAS	Patrulheiro	6h	t
1861	2	286	22127	2	2026-05-20	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
1862	2	321	22733	2	2026-05-20	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
1863	2	360	21735	2	2026-05-20	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
2005	2	230	29183	2	2026-05-23	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
2006	2	296	\N	2	2026-05-23	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
2007	2	265	22500	2	2026-05-23	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
2008	2	213	28096	2	2026-05-23	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
2009	2	359	27895	2	2026-05-23	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
2010	2	247	29234	2	2026-05-23	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
2011	2	199	28014	2	2026-05-23	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
2012	2	369	22545	2	2026-05-23	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
2013	2	305	23673	2	2026-05-23	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
2014	2	381	21688	2	2026-05-23	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
2015	2	320	28392	2	2026-05-23	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
2016	2	356	28172	2	2026-05-23	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
2017	2	315	22359	2	2026-05-23	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
2018	2	362	24057	2	2026-05-23	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
2019	2	321	\N	2	2026-05-23	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
2353	2	243	22087	2	2026-05-31	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
2354	2	369	22559	2	2026-05-31	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
2355	2	339	24207	2	2026-05-31	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
2449	2	236	37930	1	2026-06-03	18:00 às 00:00	\N	FT 3ª CIA	Comandante	6h	t
2450	2	296	37382	1	2026-06-03	18:00 às 00:00	\N	FT 3ª CIA	Motorista	6h	t
2451	2	369	37242	1	2026-06-03	18:00 às 00:00	\N	FT 3ª CIA	Patrulheiro	6h	t
2452	2	225	37946	1	2026-06-03	20:00 às 02:00	\N	FT PIRANHAS	Comandante	6h	t
2453	2	328	37188	1	2026-06-03	20:00 às 02:00	\N	FT PIRANHAS	Motorista	6h	t
2454	2	377	38077	1	2026-06-03	20:00 às 02:00	\N	FT PIRANHAS	Patrulheiro	6h	t
2455	2	255	37359	1	2026-06-03	20:00 às 02:00	\N	FT DELMIRO	Comandante	6h	t
2456	2	265	37369	1	2026-06-03	20:00 às 02:00	\N	FT DELMIRO	Motorista	6h	t
2457	2	359	37318	1	2026-06-03	20:00 às 02:00	\N	FT DELMIRO	Patrulheiro	6h	t
2080	2	214	24136	2	2026-05-24	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
2081	2	364	22981	2	2026-05-24	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
2082	2	331	21796	2	2026-05-24	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
2083	2	286	22135	2	2026-05-24	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
2084	2	328	22848	2	2026-05-24	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
2085	2	313	23788	2	2026-05-24	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
2086	2	382	23958	2	2026-05-24	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
2087	2	277	29135	2	2026-05-24	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
2088	2	225	28423	2	2026-05-24	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
2089	2	207	23859	2	2026-05-24	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
2090	2	376	28217	2	2026-05-24	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
2091	2	242	22909	2	2026-05-24	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
2092	2	238	23579	2	2026-05-24	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
2093	2	367	22770	2	2026-05-24	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
2094	2	297	22426	2	2026-05-24	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
2296	2	230	29191	2	2026-05-30	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Comandante	8h	t
2297	2	296	15385	2	2026-05-30	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Motorista	8h	t
2298	2	297	22430	2	2026-05-30	14:00 às 22:00	\N	Força Tarefa 01 DELMIRO	Patrulheiro	8h	t
2299	2	213	28115	2	2026-05-30	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Comandante	8h	t
2300	2	329	21968	2	2026-05-30	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Motorista	8h	t
2301	2	313	23796	2	2026-05-30	18:00 às 02:00	\N	Força Tarefa 02 DELMIRO	Patrulheiro	8h	t
2302	2	214	24146	2	2026-05-30	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Comandante	8h	t
2303	2	326	21297	2	2026-05-30	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Motorista	8h	t
2304	2	239	23627	2	2026-05-30	16:00 às 00:00	\N	Força Tarefa 3ªCIA	Patrulheiro	8h	t
2305	2	199	28038	2	2026-05-30	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Comandante	8h	t
2306	2	305	23692	2	2026-05-30	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Motorista	8h	t
2307	2	265	22509	2	2026-05-30	16:00 às 00:00	\N	Força Tarefa PIRANHAS	Patrulheiro	8h	t
2308	2	315	22379	2	2026-05-30	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Comandante	8h	t
2309	2	361	28247	2	2026-05-30	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Motorista	8h	t
2310	2	377	25743	2	2026-05-30	22:00 às 06:00	\N	Força Tarefa POSTO FISCAL	Patrulheiro	8h	t
2458	2	355	37269	2	2026-06-03	22:00 às 06:00	\N	FT POSTO FISCAL	Comandante	8h	t
2459	2	349	37258	2	2026-06-03	22:00 às 06:00	\N	FT POSTO FISCAL	Motorista	8h	t
2460	2	374	38033	2	2026-06-03	22:00 às 06:00	\N	FT POSTO FISCAL	Patrulheiro	8h	t
\.


--
-- Data for Name: feriados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feriados (id_feriado, data, descricao) FROM stdin;
1	2025-01-01	Confraternização Universal
2	2025-03-03	Carnaval
3	2025-03-04	Carnaval
4	2025-04-18	Sexta-feira Santa
5	2025-04-21	Tiradentes
6	2025-05-01	Dia do Trabalho
7	2025-06-19	Corpus Christi
8	2025-09-07	Independência do Brasil
9	2025-10-12	Nossa Sra Aparecida
10	2025-11-02	Finados
11	2025-11-15	Proclamação da República
12	2025-11-20	Consciência Negra
13	2025-12-25	Natal
14	2026-01-01	Confraternização Universal
15	2026-02-16	Carnaval
16	2026-02-17	Carnaval
17	2026-03-03	Carnaval
18	2026-04-03	Sexta-feira Santa
19	2026-04-21	Tiradentes
20	2026-05-01	Dia do Trabalho
21	2026-06-04	Corpus Christi
22	2026-07-09	Independência do Brasil
23	2026-10-12	Nossa Sra Aparecida
24	2026-11-02	Finados
25	2026-11-15	Proclamação da República
26	2026-11-20	Consciência Negra
27	2026-12-25	Natal
\.


--
-- Data for Name: importacao_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.importacao_log (id_log, id_usuario, arquivo_nome, arquivo_hash, status, id_militar, id_requerimento, ciclos_afetados, detalhes, importado_em) FROM stdin;
\.


--
-- Data for Name: metas_alocacao; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metas_alocacao (id_meta, id_ciclo, data, cenario, qtd_equipes_planejadas, custo_estimado) FROM stdin;
121	1	2026-04-16	A	4	2304.36
122	1	2026-04-17	B	5	3750.00
123	1	2026-04-18	B	5	3750.00
124	1	2026-04-19	B	5	3750.00
125	1	2026-04-20	A	4	2304.36
126	1	2026-04-21	B	5	3750.00
128	1	2026-04-23	A	4	2304.36
129	1	2026-04-24	B	5	3750.00
130	1	2026-04-25	B	5	3750.00
131	1	2026-04-26	B	5	3750.00
132	1	2026-04-27	A	4	2304.36
133	1	2026-04-28	A	4	2304.36
134	1	2026-04-29	A	4	2304.36
135	1	2026-04-30	A	4	2304.36
136	1	2026-05-01	B	5	3750.00
137	1	2026-05-02	B	5	3750.00
138	1	2026-05-03	B	5	3750.00
139	1	2026-05-04	A	3	1728.27
140	1	2026-05-05	A	3	1728.27
141	1	2026-05-06	A	3	1728.27
142	1	2026-05-07	A	3	1728.27
183	1	2026-05-08	B	6	4500.00
184	1	2026-05-09	B	6	4500.00
1945	2	2026-05-25	A	3	1728.27
1946	2	2026-05-26	A	3	1728.27
1947	2	2026-05-27	A	3	1728.27
1948	2	2026-05-28	A	3	1728.27
1949	2	2026-05-29	B	5	3750.00
1950	2	2026-05-30	B	5	3750.00
1951	2	2026-05-31	B	5	3750.00
1952	2	2026-06-01	A	3	1728.27
308	1	2026-05-12	A	5	2880.45
1953	2	2026-06-02	A	3	1728.27
209	1	2026-05-10	B	7	5250.00
753	1	2026-05-14	A	5	2880.45
612	1	2026-05-13	A	5	2880.45
127	1	2026-04-22	A	4	2304.36
295	1	2026-05-11	A	5	2880.45
2097	3	2026-06-16	A	4	2304.36
2098	3	2026-06-17	A	4	2304.36
2099	3	2026-06-18	A	4	2304.36
2100	3	2026-06-19	B	5	3750.00
2101	3	2026-06-20	B	5	3750.00
2102	3	2026-06-21	B	5	3750.00
2103	3	2026-06-22	A	4	2304.36
2104	3	2026-06-23	A	4	2304.36
2105	3	2026-06-24	A	4	2304.36
2106	3	2026-06-25	A	4	2304.36
2107	3	2026-06-26	B	5	3750.00
2108	3	2026-06-27	B	5	3750.00
2109	3	2026-06-28	B	5	3750.00
2110	3	2026-06-29	A	4	2304.36
2111	3	2026-06-30	A	4	2304.36
2112	3	2026-07-01	A	4	2304.36
2113	3	2026-07-02	A	4	2304.36
2114	3	2026-07-03	B	5	3750.00
2115	3	2026-07-04	B	5	3750.00
1238	2	2026-05-18	A	4	2304.36
1239	2	2026-05-19	A	4	2304.36
1240	2	2026-05-20	A	4	2304.36
1241	2	2026-05-21	A	4	2304.36
916	2	2026-05-16	B	5	3750.00
917	2	2026-05-17	B	5	3750.00
947	1	2026-05-15	B	5	3750.00
1392	2	2026-05-22	B	5	3750.00
1393	2	2026-05-23	B	5	3750.00
1394	2	2026-05-24	B	5	3750.00
2116	3	2026-07-05	B	5	3750.00
2117	3	2026-07-06	A	3	1728.27
2118	3	2026-07-07	A	3	1728.27
2119	3	2026-07-08	A	3	1728.27
2120	3	2026-07-09	B	5	3750.00
2121	3	2026-07-10	B	5	3750.00
2122	3	2026-07-11	B	5	3750.00
2123	3	2026-07-12	B	5	3750.00
2124	3	2026-07-13	A	3	1728.27
2125	3	2026-07-14	A	3	1728.27
2126	3	2026-07-15	A	3	1728.27
2127	4	2026-07-16	A	4	2304.36
2128	4	2026-07-17	B	5	3750.00
2129	4	2026-07-18	B	5	3750.00
2130	4	2026-07-19	B	5	3750.00
2131	4	2026-07-20	A	4	2304.36
2132	4	2026-07-21	A	4	2304.36
2133	4	2026-07-22	A	4	2304.36
2134	4	2026-07-23	A	4	2304.36
2135	4	2026-07-24	B	5	3750.00
2136	4	2026-07-25	B	5	3750.00
2137	4	2026-07-26	B	5	3750.00
2138	4	2026-07-27	A	3	1728.27
2139	4	2026-07-28	A	3	1728.27
2140	4	2026-07-29	A	3	1728.27
2141	4	2026-07-30	A	3	1728.27
2142	4	2026-07-31	B	5	3750.00
2143	4	2026-08-01	B	5	3750.00
2144	4	2026-08-02	B	5	3750.00
2145	4	2026-08-03	A	3	1728.27
2146	4	2026-08-04	A	3	1728.27
2147	4	2026-08-05	A	3	1728.27
2148	4	2026-08-06	A	3	1728.27
2149	4	2026-08-07	B	5	3750.00
2150	4	2026-08-08	B	5	3750.00
2151	4	2026-08-09	B	5	3750.00
2152	4	2026-08-10	A	3	1728.27
2153	4	2026-08-11	A	3	1728.27
2154	4	2026-08-12	A	3	1728.27
2155	4	2026-08-13	A	3	1728.27
2156	4	2026-08-14	B	5	3750.00
2157	4	2026-08-15	B	5	3750.00
2171	2	2026-06-03	A	2	1152.18
2172	2	2026-06-04	B	5	3750.00
2173	2	2026-06-05	B	5	3750.00
2174	2	2026-06-06	B	5	3750.00
2175	2	2026-06-07	B	5	3750.00
2176	2	2026-06-08	A	2	1152.18
2177	2	2026-06-09	A	2	1152.18
2178	2	2026-06-10	A	2	1152.18
2179	2	2026-06-11	A	2	1152.18
2180	2	2026-06-12	B	5	3750.00
2181	2	2026-06-13	B	5	3750.00
2182	2	2026-06-14	B	5	3750.00
2183	2	2026-06-15	A	2	1152.18
\.


--
-- Data for Name: opm; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opm (id_opm, descricao, sigla, endereco, telefone, email) FROM stdin;
1	9º Batalhão de Policia Militar	9º BPM	AL 145, BAIRRO UNIVERSITARIO - DELMIRO GOUVEIA - AL	82 988333868	9bpm@pmal.gov.br
\.


--
-- Data for Name: requerimentos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.requerimentos (id_requerimento, id_militar, id_ciclo, numero_requerimento, data_solicitacao, observacao, id_usuario_criacao, mes_referencia) FROM stdin;
75	364	1	22369/2026-P1	2026-04-28 13:58:06.016869	\N	\N	2026-05
150	326	2	23237/2026-9º BPM	2026-05-04 13:37:02.351755	\N	\N	2026-05
136	220	2	23112/2026-1 CIA	2026-05-04 13:37:01.786314	\N	\N	2026-05
149	296	2	23396/2026-9° BPM	2026-05-04 13:37:02.255982		\N	2026-06
163	216	2	22630/2026-3A CIA CISP MATA GRANDE	2026-05-04 13:37:02.904405	\N	\N	2026-05
152	381	2	22970/2026-PESSOAL	2026-05-04 13:37:02.417125	\N	\N	2026-05
138	324	1	23076/2026-CISP DE ÁGUA BRANCA	2026-05-04 13:37:01.844476	\N	\N	2026-05
73	326	1	23237/2026-9º BPM	2026-04-28 13:58:05.930413	\N	\N	2026-05
78	339	1	22449/2026-9° BPM	2026-04-28 13:58:06.145895	\N	\N	2026-05
105	230	1	22403/2026-RP	2026-04-28 13:58:07.27657	\N	\N	2026-05
64	305	1	22195/2026-PELOPES    79 998819895	2026-04-28 13:58:05.572987	\N	\N	2026-05
151	381	1	22970/2026-PESSOAL	2026-05-04 13:37:02.395783	\N	\N	2026-05
130	207	1	22324/2026-1⁰ CIA	2026-04-28 13:58:08.24436	\N	\N	2026-05
134	328	2	22172/2026-PESSOAL	2026-04-29 12:24:17.626105	\N	\N	2026-05
135	341	2	23122/2026-9 BPM	2026-05-04 13:37:01.744399	\N	\N	2026-05
109	238	1	22269/2026-2° CIA	2026-04-28 13:58:07.47266	\N	\N	2026-05
95	242	1	22417/2026-1ªCIA/9ºBPM	2026-04-28 13:58:06.786875	\N	\N	2026-05
65	313	1	22317/2026-2°CIA (PIAU)	2026-04-28 13:58:05.645926	\N	\N	2026-05
125	220	1	23112/2026-1 CIA	2026-04-28 13:58:08.111461	\N	\N	2026-05
167	243	2	22581/2026-1ª CIA DELMIRO	2026-05-04 13:37:03.360633	\N	\N	2026-05
102	221	1	22213/2026-1• CIA	2026-04-28 13:58:07.111457	\N	\N	2026-05
111	239	1	22316/2026-1 CIA	2026-04-28 13:58:07.609987	\N	\N	2026-05
93	282	1	22357/2026-GPM BARRAGEM	2026-04-28 13:58:06.672489	\N	\N	2026-05
114	247	1	22386/2026-1 CIA	2026-04-28 13:58:07.680334	\N	\N	2026-05
81	341	1	23122/2026-9 BPM	2026-04-28 13:58:06.227528	\N	\N	2026-05
83	356	1	23031/2026-P1	2026-04-28 13:58:06.266567	\N	\N	2026-05
104	277	1	22354/2026-1ª CIA	2026-04-28 13:58:07.209405	\N	\N	2026-05
74	328	1	22172/2026-PESSOAL	2026-04-28 13:58:05.970856	\N	\N	2026-05
165	325	2	22507/2026-2ª CIA	2026-05-04 13:37:03.089918	\N	\N	2026-05
118	382	1	22351/2026-2° CIA	2026-04-28 13:58:07.807788	\N	\N	2026-05
119	260	1	22400/2026-1 CIA	2026-04-28 13:58:07.879611	\N	\N	2026-05
86	362	1	22266/2026-1 CIA/RP	2026-04-28 13:58:06.327592	\N	\N	2026-05
63	301	1	22256/2026-1ª CIA	2026-04-28 13:58:05.493458	\N	\N	2026-05
159	227	2	22770/2026-1° CIA	2026-05-04 13:37:02.65925	\N	\N	2026-05
62	296	1	23011/2026-9º BPM	2026-04-28 13:58:05.446632	\N	\N	2026-05
140	356	2	23031/2026-P1	2026-05-04 13:37:01.892446	\N	\N	2026-05
82	347	1	22328/2026-1ª CIA - PELOPES    79999696267	2026-04-28 13:58:06.243591	\N	\N	2026-05
67	317	1	22303/2026-1 CIA	2026-04-28 13:58:05.735775	\N	\N	2026-05
120	253	1	17288/2026-PAA	2026-04-28 13:58:07.904937	\N	\N	2026-04
168	286	2	22575/2026-PAA	2026-05-04 13:37:03.491701	\N	\N	2026-05
157	331	1	22878/2026-PELOPES	2026-05-04 13:37:02.606889	\N	\N	2026-05
68	318	1	22327/2026-RP	2026-04-28 13:58:05.768728	\N	\N	2026-05
141	376	2	22334/2026-2ªCIA	2026-05-04 13:37:01.946018	\N	\N	2026-05
126	214	1	22399/2026-GPM PARICONHA	2026-04-28 13:58:08.146226	\N	\N	2026-05
80	359	1	23821/2026-2A CIA GPM PARICONHA	2026-04-28 13:58:06.197795	\N	\N	2026-05
139	324	2	23076/2026-CISP DE ÁGUA BRANCA	2026-05-04 13:37:01.85505	\N	\N	2026-05
97	213	1	23141/2026-2° CIA	2026-04-28 13:58:06.865013	\N	\N	2026-05
84	361	1	23042/2026-CISP PIRANHAS	2026-04-28 13:58:06.287408	\N	\N	2026-05
89	376	1	22334/2026-2ªCIA	2026-04-28 13:58:06.47142	\N	\N	2026-05
144	353	1	23007/2026-1A CIA	2026-05-04 13:37:02.041068	\N	\N	2026-05
66	315	1	22549/2026-RP	2026-04-28 13:58:05.699345	\N	\N	2026-05
117	248	1	22497/2026-1° CIA	2026-04-28 13:58:07.76477	\N	\N	2026-05
87	369	1	22463/2026-9° BPM	2026-04-28 13:58:06.387627	\N	\N	2026-05
91	259	1	22356/2026-PESSOAL	2026-04-28 13:58:06.592347	\N	\N	2026-05
98	228	1	22232/2026-1ª CIA	2026-04-28 13:58:06.917691	\N	\N	2026-05
124	252	1	22182/2026-1• CIA	2026-04-28 13:58:08.04027	\N	\N	2026-05
133	252	2	22182/2026-1• CIA	2026-04-29 12:24:17.484591	\N	\N	2026-05
137	316	1	23100/2026-2ª CIA	2026-05-04 13:37:01.825101	\N	\N	2026-05
143	361	2	23042/2026-CISP PIRANHAS	2026-05-04 13:37:02.024291	\N	\N	2026-05
145	353	2	23007/2026-1A CIA	2026-05-04 13:37:02.054366	\N	\N	2026-05
147	288	2	23018/2026-P2	2026-05-04 13:37:02.132668	\N	\N	2026-05
142	351	1	23035/2026-9º BPM	2026-05-04 13:37:02.004119	\N	\N	2026-05
100	276	1	23030/2026-PESSOAL	2026-04-28 13:58:07.032546	\N	\N	2026-05
153	251	2	22963/2026-PAA	2026-05-04 13:37:02.460012	\N	\N	2026-05
148	276	2	23030/2026-PESSOAL	2026-05-04 13:37:02.196363	\N	\N	2026-05
146	288	1	23018/2026-P2	2026-05-04 13:37:02.089146	\N	\N	2026-05
154	360	1	22934/2026-9º BPM	2026-05-04 13:37:02.480472	\N	\N	2026-05
90	377	1	22923/2026-2º CIA	2026-04-28 13:58:06.533492	\N	\N	2026-05
156	377	2	22923/2026-2º CIA	2026-05-04 13:37:02.564896	\N	\N	2026-05
158	331	2	22878/2026-PELOPES	2026-05-04 13:37:02.617799	\N	\N	2026-05
122	251	1	22963/2026-PAA	2026-04-28 13:58:08.003711	\N	\N	2026-05
160	320	2	22721/2026-2° CIA	2026-05-04 13:37:02.709931	\N	\N	2026-05
161	355	2	22692/2026-1 CIA	2026-05-04 13:37:02.762783	\N	\N	2026-05
69	320	1	22721/2026-2° CIA	2026-04-28 13:58:05.806526	\N	\N	2026-05
162	229	2	22670/2026-2CIA	2026-05-04 13:37:02.834753	\N	\N	2026-05
128	227	1	22770/2026-1° CIA	2026-04-28 13:58:08.192538	\N	\N	2026-05
164	329	2	22608/2026-3A CIA CISP MATA GRANDE	2026-05-04 13:37:02.966531	\N	\N	2026-05
71	355	1	22692/2026-1 CIA	2026-04-28 13:58:05.870779	\N	\N	2026-05
166	235	2	22587/2026-COPOM	2026-05-04 13:37:03.229944	\N	\N	2026-05
101	229	1	22670/2026-2CIA	2026-04-28 13:58:07.06352	\N	\N	2026-05
115	216	1	22630/2026-3A CIA CISP MATA GRANDE	2026-04-28 13:58:07.722462	\N	\N	2026-05
77	329	1	22608/2026-3A CIA CISP MATA GRANDE	2026-04-28 13:58:06.125486	\N	\N	2026-05
72	325	1	22507/2026-2ª CIA	2026-04-28 13:58:05.894571	\N	\N	2026-05
106	235	1	22587/2026-COPOM	2026-04-28 13:58:07.363743	\N	\N	2026-05
112	243	1	22581/2026-1ª CIA DELMIRO	2026-04-28 13:58:07.638042	\N	\N	2026-05
121	286	1	22575/2026-PAA	2026-04-28 13:58:07.960198	\N	\N	2026-05
94	258	1	22556/2026-1° CIA	2026-04-28 13:58:06.713724	\N	\N	2026-05
70	367	1	22426/2026-SEC	2026-04-28 13:58:05.839673	\N	\N	2026-05
127	293	1	17310/2026-9° BPM	2026-04-28 13:58:08.176924	\N	\N	2026-04
185	228	2	22232/2026-1ª CIA	2026-05-04 13:37:04.755936	\N	\N	2026-05
186	318	2	23782/2026-RP	2026-05-04 13:37:04.996657		\N	2026-06
187	321	1	22335/2026-SEC	2026-05-04 13:37:05.047052	\N	\N	2026-05
188	321	2	22335/2026-SEC	2026-05-04 13:37:05.095809	\N	\N	2026-05
189	367	2	22426/2026-SEC	2026-05-04 13:37:05.211609	\N	\N	2026-05
201	230	2	22403/2026-RP	2026-05-04 13:37:06.604493	\N	\N	2026-05
172	236	1	22568/2026-2° CIA	2026-05-04 13:37:03.709351	\N	\N	2026-05
203	238	2	22269/2026-2° CIA	2026-05-04 13:37:06.741667	\N	\N	2026-05
204	239	2	22316/2026-1 CIA	2026-05-04 13:37:06.832069	\N	\N	2026-05
205	342	1	22440/2026-SEC	2026-05-04 13:37:06.86103	\N	\N	2026-05
206	342	2	22440/2026-SEC	2026-05-04 13:37:06.876444	\N	\N	2026-05
216	255	1	22314/2026-P3	2026-05-04 13:37:07.707669	\N	\N	2026-05
217	255	2	22314/2026-P3	2026-05-04 13:37:07.732386	\N	\N	2026-05
218	339	2	22449/2026-9° BPM	2026-05-04 13:37:07.777713	\N	\N	2026-05
190	282	2	22357/2026-GPM BARRAGEM	2026-05-04 13:37:05.315515	\N	\N	2026-05
219	349	1	22454/2026-P1 - 9° BPM	2026-05-04 13:37:07.806993	\N	\N	2026-05
220	349	2	22454/2026-P1 - 9° BPM	2026-05-04 13:37:07.8145	\N	\N	2026-05
171	225	2	22572/2026-2 CIA	2026-05-04 13:37:03.64904		\N	2026-05
245	386	2	27038/2026-COPES	2026-05-28 18:21:35.415682	\N	\N	2026-06
247	387	2	27470/2026-PAA	2026-05-28 19:12:55.304748	\N	\N	2026-06
191	242	2	22417/2026-1ªCIA/9ºBPM	2026-05-04 13:37:05.558605		\N	2026-05
129	256	1	18485/2026-3 CIA	2026-04-28 13:58:08.21629	\N	\N	2026-04
76	340	1	17566/2026-2ª CIA OLHO DAGUA DO CASADO	2026-04-28 13:58:06.086211	\N	\N	2026-04
88	374	1	17814/2026-P1	2026-04-28 13:58:06.437213	\N	\N	2026-04
92	271	1	17776/2026-2 CIA	2026-04-28 13:58:06.625434	\N	\N	2026-04
132	305	2	22195/2026-PELOPES    79 998819895	2026-04-29 12:24:17.345331	\N	\N	2026-05
173	236	2	22568/2026-2° CIA	2026-05-04 13:37:03.72488	\N	\N	2026-05
202	359	2	23821/2026-2A CIA GPM PARICONHA	2026-05-04 13:37:06.660266	\N	\N	2026-05
222	226	1	23431/2026-2ªCIA/ GPM DO PIAU	2026-05-04 14:16:21.611606	\N	\N	2026-05
221	327	1	23488/2026-SEC9BPM	2026-05-04 14:16:21.594531	\N	\N	2026-05
223	199	1	23328/2026-1° CIA	2026-05-04 14:16:21.683517	\N	\N	2026-05
174	258	2	22556/2026-1° CIA	2026-05-04 13:37:03.899768	\N	\N	2026-05
224	199	2	23328/2026-1° CIA	2026-05-04 14:16:21.745918	\N	\N	2026-05
192	364	2	22369/2026-P1	2026-05-04 13:37:05.699553	\N	\N	2026-05
108	237	1	23171/2026-PELOPES / 1 CIA	2026-04-28 13:58:07.432814	\N	\N	2026-05
175	350	2	22550/2026-PESSOAL    79998024282	2026-05-04 13:37:03.980458	\N	\N	2026-05
79	350	1	22550/2026-PESSOAL    79998024282	2026-04-28 13:58:06.180408	\N	\N	2026-05
176	315	2	22549/2026-RP	2026-05-04 13:37:04.086319	\N	\N	2026-05
131	215	1	22545/2026-2ACIA/CISP AGUA BRANCA   TEL.:82 98160-9913	2026-04-28 14:46:39.426891	\N	\N	2026-05
177	215	2	22545/2026-2ACIA/CISP AGUA BRANCA   TEL.:82 98160-9913	2026-05-04 13:37:04.272128	\N	\N	2026-05
178	297	1	22540/2026-COPOM	2026-05-04 13:37:04.304496	\N	\N	2026-05
179	297	2	22540/2026-COPOM	2026-05-04 13:37:04.318522	\N	\N	2026-05
207	347	2	22328/2026-1ª CIA - PELOPES    79999696267	2026-05-04 13:37:06.991965	\N	\N	2026-05
181	265	1	22503/2026-1 CIA	2026-05-04 13:37:04.466585		\N	2026-05
180	248	2	22497/2026-1° CIA	2026-05-04 13:37:04.418708	\N	\N	2026-05
248	204	2	28317/2026-1ª CIA	2026-05-31 12:23:14.830029	\N	\N	2026-06
103	261	1	17325/2026-CISP AGUA BRANCA	2026-04-28 13:58:07.179854	\N	\N	2026-04
96	379	1	22282/2026-P/3	2026-04-28 13:58:06.841405	\N	\N	2026-05
182	265	2	22503/2026-1 CIA	2026-05-04 13:37:04.496955	\N	\N	2026-05
208	247	2	22386/2026-1 CIA	2026-05-04 13:37:07.036885	\N	\N	2026-05
183	369	2	22463/2026-9° BPM	2026-05-04 13:37:04.599876	\N	\N	2026-05
209	313	2	22317/2026-2°CIA (PIAU)	2026-05-04 13:37:07.108084	\N	\N	2026-05
210	207	2	22324/2026-1⁰ CIA	2026-05-04 13:37:07.202303	\N	\N	2026-05
225	237	2	23171/2026-PELOPES / 1 CIA	2026-05-04 14:16:21.958226	\N	\N	2026-05
211	382	2	22351/2026-2° CIA	2026-05-04 13:37:07.349273	\N	\N	2026-05
212	260	2	22400/2026-1 CIA	2026-05-04 13:37:07.440887	\N	\N	2026-05
213	362	2	22266/2026-1 CIA/RP	2026-05-04 13:37:07.527985	\N	\N	2026-05
214	317	2	22303/2026-1 CIA	2026-05-04 13:37:07.604891	\N	\N	2026-05
215	214	2	22399/2026-GPM PARICONHA	2026-05-04 13:37:07.663842	\N	\N	2026-05
193	379	2	22282/2026-P/3	2026-05-04 13:37:05.839249	\N	\N	2026-05
242	253	2	27210/2026-PAA	2026-05-28 18:21:25.572468	\N	\N	2026-06
194	198	1	22315/2026-SUBCMD	2026-05-04 13:37:05.879609	\N	\N	2026-05
116	283	1	23254/2026-1 CIA	2026-04-28 13:58:07.747248		\N	2026-04
107	226	1	17891/2026-2ª CIA / GPM DO PIAU	2026-04-28 13:58:07.411954	\N	\N	2026-04
184	259	2	22356/2026-PESSOAL	2026-05-04 13:37:04.690308	\N	\N	2026-05
226	213	2	23141/2026-2° CIA	2026-05-04 14:16:22.078887	\N	\N	2026-05
249	364	2	28219/2026-SEC	2026-05-31 12:23:14.882336	\N	\N	2026-06
155	360	2	22934/2026-9º BPM	2026-05-04 13:37:02.501858	\N	\N	2026-05
195	198	2	22315/2026-SUBCMD	2026-05-04 13:37:05.953288	\N	\N	2026-05
196	301	2	22256/2026-1ª CIA	2026-05-04 13:37:06.124013	\N	\N	2026-05
197	330	1	22258/2026-3° CIA	2026-05-04 13:37:06.200742	\N	\N	2026-05
198	330	2	22258/2026-3° CIA	2026-05-04 13:37:06.263508	\N	\N	2026-05
244	316	2	26907/2026-2ª CIA	2026-05-28 18:21:26.093328	\N	\N	2026-06
113	272	1	17257/2026-1 CIA	2026-04-28 13:58:07.654802	\N	\N	2026-04
199	221	2	22213/2026-1• CIA	2026-05-04 13:37:06.401656	\N	\N	2026-05
200	277	2	22354/2026-1ª CIA	2026-05-04 13:37:06.521117	\N	\N	2026-05
169	241	2	22577/2026-COPOM	2026-05-04 13:37:03.582067	\N	\N	2026-05
99	241	1	22577/2026-COPOM	2026-04-28 13:58:06.969716	\N	\N	2026-05
170	225	1	22572/2026-2 CIA	2026-05-04 13:37:03.617072	\N	\N	2026-05
232	210	1	24155/2026-PAA	2026-05-06 14:16:04.214834	\N	\N	2026-05
233	210	2	24155/2026-PAA	2026-05-06 14:16:04.242593	\N	\N	2026-05
238	368	2	24146/2026-SEC	2026-05-12 12:20:30.192936	\N	\N	2026-05
231	368	1	24146/2026-SEC	2026-05-06 14:03:12.080143	enviou requerimento após o prazo	\N	2026-04
240	204	2	\N	2026-05-12 15:10:21.184541	NÃO ENVIOU REQUERIMENTO	16	2026-05
237	327	1	\N	2026-05-11 15:32:37.185135	ENVIOU REQUERIMENTO APOS O PRAZO	16	2026-04
227	203	1	\N	2026-05-04 14:32:11.931982	\N	16	2026-04
228	204	1	\N	2026-05-04 14:43:51.649028	\N	16	2026-04
229	205	1	\N	2026-05-04 14:46:28.762873	\N	16	2026-04
239	283	2	23254/2026-1 CIA	2026-05-12 12:20:30.342736	\N	\N	2026-05
241	203	2	\N	2026-05-19 18:36:06.253084	NÃO ENVIOU REQUERIMENTO	16	2026-05
250	226	2	27985/2026-GPM PIAU/ 2ª CIA	2026-05-31 12:23:14.924017	\N	\N	2026-06
251	230	2	27975/2026-2 CIA	2026-05-31 12:23:14.954351	\N	\N	2026-06
252	370	2	27957/2026-RP	2026-05-31 12:23:14.989163	\N	\N	2026-06
253	227	2	27953/2026-1° CIA	2026-05-31 12:23:15.000944	\N	\N	2026-06
254	271	2	27927/2026-2 CIA	2026-05-31 12:23:15.030168	\N	\N	2026-06
255	288	2	27853/2026-P2	2026-05-31 12:23:15.077349	\N	\N	2026-06
256	337	2	27845/2026-9BPM	2026-05-31 12:23:15.127357	\N	\N	2026-06
257	361	2	27846/2026-CISP PIRANHAS	2026-05-31 12:23:15.138481	\N	\N	2026-06
258	283	2	27767/2026-1 CIA	2026-05-31 12:23:15.163071	\N	\N	2026-06
259	232	2	27764/2026-3° CIA	2026-05-31 12:23:15.197294	\N	\N	2026-06
260	243	2	27748/2026-1ª CIA DELMIRO GTOUVEIA	2026-05-31 12:23:15.267201	\N	\N	2026-06
261	236	2	27721/2026-2° CIA	2026-05-31 12:23:15.292341	\N	\N	2026-06
262	225	2	27691/2026-2 CIA	2026-05-31 12:23:15.323381	\N	\N	2026-06
263	216	2	27671/2026-3A CIA CISP MATA GRANDE	2026-05-31 12:23:15.362194	\N	\N	2026-06
264	325	2	27667/2026-2ª CIA	2026-05-31 12:23:15.390591	\N	\N	2026-06
265	356	2	27661/2026-P1	2026-05-31 12:23:15.408338	\N	\N	2026-06
266	339	2	27630/2026-9° BPM	2026-05-31 12:23:15.420904	\N	\N	2026-06
267	259	2	27617/2026-PAA	2026-05-31 12:23:15.454603	\N	\N	2026-06
268	215	2	27606/2026-2ACIA/CISP AGUA BRANCA    TEL.: 82 98160-9913	2026-05-31 12:23:15.507903	\N	\N	2026-06
269	374	2	27526/2026-P1	2026-05-31 12:23:15.532974	\N	\N	2026-06
270	286	2	27516/2026-PAA	2026-05-31 12:23:15.553738	\N	\N	2026-06
271	329	2	27498/2026-3A CIA CISP MATA GRANDE	2026-05-31 12:23:15.590106	\N	\N	2026-06
272	282	2	27496/2026-GPM BARRAGEM	2026-05-31 12:23:15.610304	\N	\N	2026-06
273	377	2	27490/2026-2° CIA	2026-05-31 12:23:15.637009	\N	\N	2026-06
274	326	2	27488/2026-9º BPM	2026-05-31 12:23:15.69043	\N	\N	2026-06
275	210	2	27487/2026-PAA	2026-05-31 12:23:15.744606	\N	\N	2026-06
276	367	2	27467/2026-SEC	2026-05-31 12:23:15.789285	\N	\N	2026-06
277	276	2	27472/2026-PESSOAL	2026-05-31 12:23:15.824243	\N	\N	2026-06
278	328	2	27414/2026-PESSOAL	2026-05-31 12:23:15.851715	\N	\N	2026-06
279	242	2	27393/2026-COPOM	2026-05-31 12:23:15.89926	\N	\N	2026-06
280	379	2	27267/2026-P/3	2026-05-31 12:23:15.948461	\N	\N	2026-06
281	353	2	27240/2026-1A CIA	2026-05-31 12:23:15.974523	\N	\N	2026-06
282	369	2	27222/2026-9° BPM	2026-05-31 12:23:16.000772	\N	\N	2026-06
283	251	2	27217/2026-PAA	2026-05-31 12:23:16.050085	\N	\N	2026-06
284	277	2	27080/2026-1ª CIA	2026-05-31 12:23:16.078369	\N	\N	2026-06
285	349	2	26988/2026-P1 - 9° BPM	2026-05-31 12:23:16.11924	\N	\N	2026-06
286	355	2	27164/2026-1 CIA	2026-05-31 12:23:16.132858	\N	\N	2026-06
287	376	2	27086/2026-2ªCIA	2026-05-31 12:23:16.166828	\N	\N	2026-06
288	214	2	27068/2026-P1 09 BPM	2026-05-31 12:23:16.215597	\N	\N	2026-06
289	359	2	27114/2026-2°CIA - GPM DE PARICONHA	2026-05-31 12:23:16.261815	\N	\N	2026-06
290	247	2	26979/2026-1 CIA	2026-05-31 12:23:16.304563	\N	\N	2026-06
291	331	2	26943/2026-PELOPES	2026-05-31 12:23:16.335572	\N	\N	2026-06
292	255	2	26968/2026-PAA	2026-05-31 12:23:16.359646	\N	\N	2026-06
293	265	2	26957/2026-1 CIA	2026-05-31 12:23:16.399751	\N	\N	2026-06
294	297	2	26917/2026-RP	2026-05-31 12:23:16.429319	\N	\N	2026-06
295	313	2	26803/2026-2°CIA (PIAU)	2026-05-31 12:23:16.459724	\N	\N	2026-06
296	238	2	26815/2026-2° CIA	2026-05-31 12:23:16.497334	\N	\N	2026-06
297	330	2	26802/2026-3° CIA	2026-05-31 12:23:16.573015	\N	\N	2026-06
298	317	2	26784/2026-1 CIA	2026-05-31 12:23:16.646858	\N	\N	2026-06
299	258	2	26731/2026-1° CIA	2026-05-31 12:23:16.679117	\N	\N	2026-06
300	347	2	26727/2026-1ª CIA - PELOPES    79999696267	2026-05-31 12:23:16.746739	\N	\N	2026-06
301	221	2	26666/2026-1• CIA	2026-05-31 12:23:16.778333	\N	\N	2026-06
302	305	2	26587/2026-PELOPES    79 998819895	2026-05-31 12:23:16.851744	\N	\N	2026-06
303	252	2	26663/2026-1• CIA	2026-05-31 12:23:16.911877	\N	\N	2026-06
\.


--
-- Data for Name: servicos_executados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.servicos_executados (id_execucao, id_ciclo, id_militar, id_tipo_servico, data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca, cmd, opm_origem, modalidade, guarnicao) FROM stdin;
185	1	230	1	2026-04-16	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
186	1	230	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 - DELMIRO
187	1	230	1	2026-04-22	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
188	1	230	1	2026-04-24	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FORÇA TAREFA POSTO FISCAL
189	1	271	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
190	1	271	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
191	1	329	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
192	1	329	1	2026-04-25	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA PIRA
193	1	287	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
194	1	287	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
195	1	347	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
196	1	347	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 03 AGUA BRANCA
197	1	347	1	2026-04-25	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
198	1	282	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
199	1	282	1	2026-04-20	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
200	1	362	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 2
201	1	362	1	2026-04-19	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
202	1	362	1	2026-04-23	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
203	1	362	1	2026-04-26	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
204	1	259	1	2026-04-17	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FORÇA TAREFA POSTO FISCAL
205	1	259	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 07
206	1	259	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 03
207	1	226	1	2026-04-25	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA PIRA
208	1	226	1	2026-04-26	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
209	1	340	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
210	1	340	1	2026-04-22	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
211	1	340	1	2026-04-27	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
212	1	320	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
213	1	320	1	2026-04-25	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PARICONHA
214	1	318	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
215	1	242	1	2026-04-18	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
216	1	242	1	2026-04-20	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
217	1	359	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
218	1	260	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
219	1	200	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 03 - DELMIRO GOUVEIA
220	1	200	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT TAREFA
221	1	200	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
222	1	200	1	2026-04-27	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
223	1	213	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
224	1	213	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
225	1	213	1	2026-04-25	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA PIRA
226	1	213	1	2026-04-27	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
227	1	220	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
228	1	235	1	2026-04-17	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FORÇA TAREFA POSTO FISCAL
229	1	235	1	2026-04-20	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
230	1	235	1	2026-04-25	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
231	1	241	1	2026-04-17	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
232	1	241	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
233	1	328	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 2
234	1	328	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
235	1	328	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
236	1	328	1	2026-04-26	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
237	1	196	1	2026-04-22	3	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS
238	1	256	1	2026-04-19	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
239	1	256	1	2026-04-27	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
240	1	361	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 03 AGUA BRANCA
241	1	210	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
243	1	210	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 05
244	1	297	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 - DELMIRO
245	1	315	1	2026-04-16	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
246	1	315	1	2026-04-20	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
247	1	315	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 AGUA BRANCA
248	1	272	1	2026-04-18	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
249	1	272	1	2026-04-21	2	t	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
250	1	249	1	2026-04-21	2	t	8	250.00	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS
251	1	249	1	2026-04-22	3	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS
252	1	276	1	2026-04-27	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
253	1	305	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
254	1	305	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
255	1	305	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 AGUA BRANCA
256	1	325	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
257	1	248	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
258	1	248	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
259	1	277	1	2026-04-19	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
260	1	277	1	2026-04-26	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
261	1	374	1	2026-04-20	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
262	1	374	1	2026-04-25	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
263	1	337	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
264	1	360	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
265	1	360	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
266	1	261	1	2026-04-20	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
267	1	253	1	2026-04-17	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FORÇA TAREFA POSTO FISCAL
268	1	253	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 07
269	1	253	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 03
270	1	253	1	2026-04-23	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
271	1	253	1	2026-04-24	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FORÇA TAREFA POSTO FISCAL
272	1	198	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUBCOMANDO
273	1	251	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUBCOMANDO
274	1	364	1	2026-04-20	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
275	1	364	1	2026-04-27	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
276	1	363	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 AGUA BRANCA
278	1	237	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 AGUA BRANCA
283	1	228	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
284	1	228	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
285	1	258	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 03 - DELMIRO GOUVEIA
286	1	258	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT TAREFA
287	1	258	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
288	1	286	1	2026-04-26	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
289	1	202	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 07
290	1	202	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 03
291	1	330	1	2026-04-16	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
292	1	330	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
293	1	330	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
294	1	205	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
295	1	205	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
296	1	205	1	2026-04-25	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
297	1	301	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 03 - DELMIRO GOUVEIA
298	1	301	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT TAREFA
299	1	301	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
300	1	326	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
301	1	313	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 03
302	1	204	1	2026-04-17	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
303	1	204	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
304	1	204	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 03 AGUA BRANCA
305	1	283	1	2026-04-16	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
306	1	283	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
307	1	369	1	2026-04-16	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
308	1	369	1	2026-04-21	2	t	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
309	1	369	1	2026-04-25	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PARICONHA
311	1	321	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
313	1	317	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 - DELMIRO
315	1	317	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 AGUA BRANCA
316	1	377	1	2026-04-17	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
317	1	377	1	2026-04-20	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
318	1	339	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
319	1	339	1	2026-04-26	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
320	1	296	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
314	1	317	1	2026-04-20	1	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PELOPES
281	1	355	1	2026-04-20	1	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PELOPES
282	1	355	1	2026-04-27	1	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
310	1	369	1	2026-04-27	1	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
321	1	296	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
322	1	296	1	2026-04-26	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
323	1	367	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
324	1	367	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
325	1	367	1	2026-04-26	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
326	1	342	1	2026-04-16	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
327	1	342	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
328	1	342	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
329	1	341	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
330	1	376	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 03
331	1	376	1	2026-04-22	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
332	1	376	1	2026-04-25	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
333	1	376	1	2026-04-27	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
334	1	206	1	2026-04-16	4	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
335	1	206	1	2026-04-17	5	f	8	250.00	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
336	1	206	1	2026-04-20	1	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
337	1	206	1	2026-04-22	3	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
338	1	252	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
339	1	252	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
340	1	252	1	2026-04-27	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
341	1	221	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
342	1	221	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
343	1	221	1	2026-04-27	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
344	1	203	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
345	1	207	1	2026-04-18	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
346	1	207	1	2026-04-20	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
347	1	207	1	2026-04-26	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
348	1	238	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 03
349	1	238	1	2026-04-21	2	t	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
350	1	238	1	2026-04-26	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
351	1	214	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
352	1	214	1	2026-04-27	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
353	1	239	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
354	1	239	1	2026-04-25	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
355	1	216	1	2026-04-23	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
356	1	216	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 AGUA BRANCA
357	1	227	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
358	1	247	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 2
359	1	247	1	2026-04-24	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FORÇA TAREFA POSTO FISCAL
360	1	247	1	2026-04-26	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
361	1	229	1	2026-04-16	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
362	1	229	1	2026-04-23	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
363	1	350	1	2026-04-26	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
364	1	381	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
365	1	381	1	2026-04-24	5	f	8	250.00	Presente	CME	COPES	FORÇA TAREFA	FT COPES
366	1	381	1	2026-04-27	1	f	6	192.03	Presente	CME	COPES	FORÇA TAREFA	FT 01 COPES
367	1	379	1	2026-04-22	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUBCOMANDO
369	1	380	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 05
370	1	382	1	2026-04-16	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
371	1	382	1	2026-04-19	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
374	1	382	1	2026-04-24	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 05
375	1	382	1	2026-04-25	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PARICONHA
376	1	262	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
377	1	262	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
242	1	210	1	2026-04-22	3	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 04 DELMIRO
368	1	380	1	2026-04-22	3	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 04 DELMIRO
373	1	382	1	2026-04-22	3	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 04 DELMIRO
372	1	382	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
277	1	237	1	2026-04-20	1	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PELOPES
378	1	281	1	2026-04-16	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
379	1	281	1	2026-04-17	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
380	1	281	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
381	1	383	1	2026-04-18	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
382	1	383	1	2026-04-21	2	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
383	1	271	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
384	1	329	1	2026-04-28	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
385	1	329	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA PIRANHAS
386	1	287	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
387	1	287	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
388	1	282	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
389	1	362	1	2026-05-01	5	t	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
390	1	362	1	2026-05-03	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
391	1	259	1	2026-04-30	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
392	1	259	1	2026-05-01	5	t	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
393	1	320	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PARICONHA
394	1	318	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
395	1	242	1	2026-04-30	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
396	1	242	1	2026-05-02	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
397	1	359	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
398	1	200	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
399	1	200	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
400	1	288	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
401	1	220	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
402	1	235	1	2026-04-29	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
404	1	241	1	2026-04-28	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
405	1	328	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
406	1	328	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
407	1	215	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
408	1	210	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
409	1	297	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - JURI
410	1	297	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - 3ª CIA
411	1	315	1	2026-04-29	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
412	1	315	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
413	1	249	1	2026-04-28	2	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS
414	1	249	1	2026-04-29	3	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS
415	1	249	1	2026-04-30	4	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS
416	1	305	1	2026-04-28	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
417	1	305	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
418	1	325	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
419	1	325	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PARICONHA
420	1	248	1	2026-04-28	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
421	1	277	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
422	1	277	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
423	1	374	1	2026-04-28	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
424	1	360	1	2026-04-29	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
425	1	360	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
426	1	261	1	2026-04-28	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
427	1	198	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUBCOMANDO
428	1	198	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
429	1	251	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUBCOMANDO
430	1	251	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
431	1	364	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
432	1	250	1	2026-04-19	0	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FT JOGO
433	1	250	1	2026-04-27	1	f	6	192.03	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 06
434	1	228	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT JURI MATA GRANDE
435	1	255	1	2026-05-01	5	t	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
436	1	353	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
437	1	258	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
438	1	286	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
439	1	205	1	2026-04-28	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
441	1	349	1	2026-05-02	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
442	1	265	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
443	1	197	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
444	1	301	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
445	1	326	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
446	1	313	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
447	1	313	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - 3ª CIA
448	1	204	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA PIRANHAS
449	1	283	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
450	1	369	1	2026-04-28	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
451	1	369	1	2026-05-02	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
452	1	321	1	2026-04-23	4	f	6	192.03	Presente	CPRA	3º BPM	FORÇA TAREFA	EXTRA CRAIBAS 03
453	1	317	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
454	1	377	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - JURI
455	1	296	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT JURI MATA GRANDE
456	1	342	1	2026-05-02	6	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FORÇA TAREFA 07
457	1	342	1	2026-05-03	0	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 06
458	1	376	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA PIRANHAS
459	1	206	1	2026-04-29	3	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
460	1	252	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
461	1	221	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
462	1	203	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
463	1	207	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - JURI
464	1	238	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT JURI MATA GRANDE
465	1	238	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - 3ª CIA
466	1	214	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
467	1	214	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
468	1	239	1	2026-04-28	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
469	1	239	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
470	1	243	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
471	1	216	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
473	1	247	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
474	1	247	1	2026-05-03	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
475	1	229	1	2026-04-30	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
476	1	350	1	2026-05-01	5	t	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
477	1	381	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
478	1	379	1	2026-04-29	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUBCOMANDO
479	1	379	1	2026-04-30	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
480	1	380	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
481	1	382	1	2026-05-02	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PARICONHA
482	1	287	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
483	1	362	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3CIA
484	1	318	1	2026-05-04	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
485	1	260	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 02
486	1	288	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
487	1	288	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
488	1	220	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
489	1	235	1	2026-05-03	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
490	1	196	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT CMDO
491	1	249	1	2026-05-04	1	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS
492	1	277	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
493	1	360	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
494	1	360	1	2026-05-05	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT FAZENDARIA
495	1	198	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUBCOMANDO
496	1	198	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
497	1	251	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUBCOMANDO
498	1	251	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
499	1	237	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3CIA
500	1	355	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 02
501	1	228	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
502	1	255	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
503	1	258	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
504	1	286	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
505	1	301	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
506	1	326	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
507	1	313	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
508	1	313	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 02
509	1	321	1	2026-05-05	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT FAZENDARIA
510	1	339	1	2026-05-04	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
511	1	367	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3CIA
512	1	342	1	2026-05-05	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT FAZENDARIA
513	1	252	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
514	1	207	1	2026-05-04	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
515	1	224	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT CMDO
516	1	216	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
517	1	229	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
518	1	379	1	2026-05-04	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUBCOMANDO
519	1	379	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
520	1	205	1	2026-05-03	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
521	1	380	1	2026-05-05	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT CMDO
522	1	282	1	2026-05-06	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
523	1	242	1	2026-05-06	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
524	1	213	1	2026-05-06	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
525	1	220	1	2026-05-06	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
526	1	249	1	2026-05-06	3	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS
527	1	305	1	2026-05-06	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
528	1	364	1	2026-05-06	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
529	1	283	1	2026-05-06	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT01
530	1	377	1	2026-05-06	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
531	1	296	1	2026-05-06	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT01
532	1	206	1	2026-05-06	3	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
533	1	214	1	2026-05-06	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT01
534	1	239	1	2026-05-06	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
535	1	243	1	2026-05-06	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
536	1	381	1	2026-05-06	3	f	6	192.03	Presente	CME	COPES	FORÇA TAREFA	FT 01
537	1	205	1	2026-05-06	3	f	6	192.03	Presente	CME	COPES	FORÇA TAREFA	FT COPES
538	1	230	1	2026-05-07	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
539	1	225	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
540	1	287	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
541	1	288	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
542	1	235	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
543	1	328	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
544	1	196	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTCOMANDO
545	1	361	1	2026-05-07	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
546	1	248	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
547	1	385	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTCOMANDO
548	1	356	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
549	1	384	1	2026-04-19	0	f	8	250.00	Presente	CME	COPES	FORÇA TAREFA	FT 02
550	1	384	1	2026-04-26	0	f	8	250.00	Presente	CME	COPES	FORÇA TAREFA	FT 03 COPES
551	1	384	1	2026-05-02	6	f	8	250.00	Presente	CME	COPES	FORÇA TAREFA	FT COPES
552	1	384	1	2026-05-03	0	f	8	250.00	Presente	CME	COPES	FORÇA TAREFA	FT 02 COPES
553	1	265	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
554	1	204	1	2026-05-07	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
555	1	317	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
556	1	206	1	2026-05-07	4	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
557	1	252	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
558	1	224	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTCOMANDO
559	1	216	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
560	1	247	1	2026-05-07	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
561	1	230	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
562	1	225	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
563	1	362	1	2026-05-09	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
564	1	259	1	2026-05-08	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
565	1	226	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
566	1	318	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT
567	1	359	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
568	1	260	1	2026-05-09	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
569	1	288	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
570	1	215	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
571	1	210	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
572	1	297	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - 3ª CIA
573	1	248	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
574	1	360	1	2026-05-08	5	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 06
575	1	255	1	2026-05-08	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
576	1	258	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
577	1	286	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 02
578	1	265	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
579	1	326	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - 3ª CIA
580	1	313	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
581	1	204	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
582	1	283	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 02
583	1	296	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
584	1	367	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
585	1	221	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
586	1	324	1	2026-05-08	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
587	1	203	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
588	1	207	1	2026-05-09	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
589	1	199	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
590	1	238	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - 3ª CIA
591	1	214	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
592	1	227	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT
593	1	229	1	2026-05-08	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 02
594	1	381	1	2026-05-09	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT
595	1	320	1	2026-05-10	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
596	1	213	1	2026-05-10	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
597	1	325	1	2026-05-10	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
598	1	277	1	2026-05-10	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
599	1	250	1	2026-05-10	0	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FT JOGO
600	1	353	1	2026-05-10	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
601	1	349	1	2026-05-10	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
602	1	368	1	2026-05-10	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
603	1	283	1	2026-05-10	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
604	1	342	1	2026-05-10	0	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 04
605	1	341	1	2026-05-10	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
606	1	243	1	2026-05-10	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
607	1	216	1	2026-05-10	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
608	1	247	1	2026-05-10	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
609	1	329	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01 DELMIRO
610	1	347	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
611	1	200	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
612	1	288	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
613	1	213	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01 DELMIRO
614	1	196	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDP
615	1	249	1	2026-05-11	1	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS
616	1	325	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01 DELMIRO
617	1	385	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDP
618	1	355	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
619	1	301	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
620	1	317	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
621	1	339	1	2026-05-11	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
622	1	206	1	2026-05-11	1	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
623	1	324	1	2026-05-11	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
624	1	207	1	2026-05-11	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
625	1	224	1	2026-05-11	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDP
626	1	382	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
627	1	230	1	2026-05-12	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
628	1	242	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
629	1	359	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
630	1	220	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
631	1	276	1	2026-05-12	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
632	1	286	1	2026-05-12	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
633	1	265	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 02
634	1	301	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
635	1	376	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
636	1	252	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
637	1	221	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
638	1	199	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
639	1	214	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 02
640	1	229	1	2026-05-12	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 02
641	1	381	1	2026-05-12	2	f	6	192.03	Presente	CME	COPES	FORÇA TAREFA	FT 01 COPES
642	1	379	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
643	1	318	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
644	1	260	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
645	1	215	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
646	1	196	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
647	1	236	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
648	1	277	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
649	1	360	1	2026-05-13	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
650	1	385	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
651	1	198	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
652	1	251	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
653	1	326	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
654	1	331	1	2026-05-13	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
655	1	321	1	2026-05-13	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
656	1	339	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
657	1	367	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
658	1	199	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
659	1	224	1	2026-05-13	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
660	1	347	1	2026-05-14	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 02 DELMIRO
661	1	282	1	2026-05-14	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
662	1	359	1	2026-05-14	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
663	1	220	1	2026-05-14	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
664	1	325	1	2026-05-14	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
665	1	248	1	2026-05-14	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA
666	1	364	1	2026-05-14	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
667	1	355	1	2026-05-14	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 02 DELMIRO
668	1	377	1	2026-05-14	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
669	1	239	1	2026-05-14	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 02 DELMIRO
670	1	243	1	2026-05-14	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
671	1	229	1	2026-05-14	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
672	1	380	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 06
673	1	225	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
674	1	282	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
675	1	259	1	2026-05-15	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FORÇA TAREFA POSTO FISCAL DELMIRO GOUVEIA
676	1	320	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SENADOR RUI PALMEIRA
677	1	318	1	2026-05-15	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FORÇA TAREFA POSTO FISCAL DELMIRO GOUVEIA
678	1	359	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SENADOR RUI PALMEIRA
679	1	288	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
680	1	196	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
681	1	210	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 06
682	1	305	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
683	1	385	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
684	1	364	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
685	1	237	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
686	1	327	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
687	1	355	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
688	1	356	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
689	1	255	1	2026-05-15	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FORÇA TAREFA POSTO FISCAL DELMIRO GOUVEIA
690	1	258	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
691	1	197	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 06
692	1	369	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SENADOR RUI PALMEIRA
693	1	317	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
694	1	377	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
695	1	342	1	2026-05-15	5	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 03
696	1	252	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA
697	1	203	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO GOUVEIA
698	1	199	1	2026-05-15	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
699	2	230	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
700	2	362	1	2026-05-17	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
701	2	318	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
702	2	242	1	2026-05-16	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
703	2	359	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - PIRANHAS
704	2	213	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
705	2	328	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
706	2	297	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - PIRANHAS
707	2	276	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
708	2	305	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
709	2	277	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01 DELMIRO
710	2	360	1	2026-05-16	6	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 03
711	2	255	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
712	2	326	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
713	2	313	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
714	2	204	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - PIRANHAS
715	2	331	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
716	2	321	1	2026-05-16	6	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FORÇA TAREFA
717	2	339	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
718	2	342	1	2026-05-17	0	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 04
719	2	341	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
720	2	376	1	2026-05-16	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
721	2	203	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
722	2	207	1	2026-05-16	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
723	2	207	1	2026-05-17	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
724	2	238	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3 CIA
725	2	214	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01 DELMIRO
727	2	227	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01 DELMIRO
728	2	247	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
729	2	350	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
730	2	382	1	2026-05-16	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
731	2	382	1	2026-05-17	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
732	2	230	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
733	2	329	1	2026-05-19	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO
734	2	225	1	2026-05-18	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
735	2	287	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 01
736	2	347	1	2026-05-19	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 3ª CIA
737	2	282	1	2026-05-18	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
740	2	318	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
741	2	318	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
742	2	242	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
743	2	200	1	2026-05-19	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
744	2	200	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
745	2	288	1	2026-05-19	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
746	2	288	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 02
747	2	288	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 02
748	2	220	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
749	2	328	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
750	2	328	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
751	2	196	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
752	2	236	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
753	2	305	1	2026-05-18	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
755	2	248	1	2026-05-18	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
756	2	277	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
757	2	385	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
758	2	198	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUB CMD
759	2	198	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	SUBCOMANDO
760	2	251	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUB CMD
761	2	251	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	SUBCOMANDO
762	2	237	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
763	2	250	1	2026-05-20	3	f	6	192.03	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 04
764	2	355	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
766	2	258	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 02
767	2	258	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 02
770	2	265	1	2026-05-19	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO
771	2	301	1	2026-05-19	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
772	2	301	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 02
773	2	301	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
775	2	204	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
776	2	283	1	2026-05-18	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
779	2	317	1	2026-05-19	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 3ª CIA
780	2	377	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
782	2	296	1	2026-05-19	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO
783	2	367	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
785	2	206	1	2026-05-18	1	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
786	2	206	1	2026-05-19	2	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
787	2	206	1	2026-05-20	3	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
788	2	252	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 01
789	2	252	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
790	2	221	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 01
791	2	221	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 02
792	2	324	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
793	2	238	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
794	2	214	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
795	2	224	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
774	2	313	1	2026-05-21	4	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
765	2	255	1	2026-05-20	3	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT FAZENDARIA
784	2	376	1	2026-05-21	4	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
777	2	369	1	2026-05-19	2	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
768	2	286	1	2026-05-20	3	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT FAZENDARIA
778	2	321	1	2026-05-20	3	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT FAZENDARIA
781	2	339	1	2026-05-19	2	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
738	2	259	1	2026-05-18	1	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
769	2	349	1	2026-05-18	1	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
754	2	325	1	2026-05-18	1	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
796	2	239	1	2026-05-19	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 3ª CIA
798	2	229	1	2026-05-18	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
799	2	379	1	2026-05-20	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT SUB CMD
800	2	379	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	SUBCOMANDO
801	2	382	1	2026-05-21	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
802	2	329	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
803	2	225	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 2 CIA
804	2	347	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 02 DELMIRO
805	2	362	1	2026-05-24	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
806	2	320	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
807	2	318	1	2026-05-24	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
808	2	242	1	2026-05-24	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FUACAL
809	2	359	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT02
810	2	200	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
811	2	213	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT02
812	2	220	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
813	2	328	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
814	2	215	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
815	2	210	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT
816	2	297	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - 3ª CIA
817	2	315	1	2026-05-24	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
818	2	305	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3CIA
819	2	325	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
820	2	248	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
821	2	277	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 2 CIA
822	2	364	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
823	2	364	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
824	2	237	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
825	2	356	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
826	2	255	1	2026-05-22	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
827	2	353	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 02 DELMIRO
828	2	286	1	2026-05-24	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FUACAL
829	2	265	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO
830	2	197	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT
831	2	301	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
832	2	313	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
833	2	204	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
834	2	331	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
835	2	369	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3CIA
836	2	377	1	2026-05-22	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
837	2	296	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO
838	2	367	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - 3ª CIA
839	2	376	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
840	2	206	1	2026-05-23	6	f	8	250.00	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
841	2	252	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
842	2	203	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
843	2	207	1	2026-05-24	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FUACAL
844	2	199	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3CIA
845	2	238	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - 3ª CIA
846	2	214	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
847	2	239	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 02 DELMIRO
848	2	247	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT02
849	2	229	1	2026-05-22	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
850	2	382	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO
851	2	382	1	2026-05-24	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 2 CIA
852	2	381	1	2026-05-22	5	f	8	250.00	Presente	CME	COPES	FORÇA TAREFA	FT 03 COPES
853	2	381	1	2026-05-23	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
854	2	205	1	2026-05-22	5	f	8	250.00	Presente	CME	COPES	FORÇA TAREFA	FT COPES 01
855	2	380	1	2026-05-22	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT
739	2	259	1	2026-05-21	4	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
797	2	247	1	2026-05-19	2	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
726	2	243	1	2026-05-17	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
856	2	230	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
857	2	230	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT01
858	2	329	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
859	2	329	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
860	2	225	1	2026-05-26	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
861	2	287	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 01
862	2	287	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 1
863	2	347	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 01 DELMIRO
864	2	282	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
865	2	362	1	2026-05-25	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
866	2	362	1	2026-05-27	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
867	2	362	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
868	2	259	1	2026-05-28	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
869	2	259	1	2026-05-29	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
870	2	226	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 3 CIA
871	2	320	1	2026-05-30	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
872	2	320	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
873	2	318	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
874	2	242	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
875	2	359	1	2026-05-26	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
876	2	200	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 01
877	2	200	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 02
878	2	200	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
879	2	288	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 02
880	2	288	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
881	2	213	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
882	2	220	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 DA CIA
883	2	220	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
884	2	328	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
885	2	328	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3° CIA
886	2	215	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
887	2	196	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
888	2	196	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
889	2	361	1	2026-05-30	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
890	2	210	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 05
891	2	297	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT01
892	2	236	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
893	2	236	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
894	2	305	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 2CIA
895	2	325	1	2026-05-26	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3ª CIA
896	2	248	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
897	2	248	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3° CIA
898	2	277	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
899	2	277	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
900	2	360	1	2026-05-26	2	f	6	192.03	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 05
901	2	360	1	2026-05-27	3	f	6	192.03	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 03
902	2	198	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
903	2	251	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
904	2	364	1	2026-05-26	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
905	2	237	1	2026-05-26	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3ª CIA
906	2	237	1	2026-05-29	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
907	2	237	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO
908	2	355	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
909	2	356	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
910	2	255	1	2026-05-27	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
911	2	255	1	2026-05-28	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
912	2	353	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 01 DELMIRO
913	2	353	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO
914	2	258	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 1
915	2	258	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 1
916	2	258	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 01
917	2	286	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
918	2	286	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
919	2	349	1	2026-05-26	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL DELMIRO GOUVEIA
920	2	393	1	2026-05-18	1	f	6	192.03	Presente	CPRS	6ª CPM/I	FORÇA TAREFA	FT BELO MONTE
921	2	393	1	2026-05-26	2	f	6	192.03	Presente	CPRS	6ª CPM/I	FORÇA TAREFA	FT BELO MONTE
922	2	393	1	2026-05-28	4	f	6	192.03	Presente	CPRS	6ª CPM/I	FORÇA TAREFA	FORÇA TAREFA
923	2	393	1	2026-05-30	6	f	8	250.00	Presente	CPRS	6ª CPM/I	FORÇA TAREFA	FT BELO MONTE
924	2	265	1	2026-05-26	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
925	2	265	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 2CIA
926	2	197	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 05
927	2	301	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 01
928	2	301	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT - VELADA 02
929	2	301	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 02
930	2	326	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
931	2	326	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
932	2	326	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
933	2	313	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT BELO MONTE
934	2	313	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO GOUVEIA
935	2	204	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
936	2	283	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 DA CIA
937	2	331	1	2026-05-29	5	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
938	2	369	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
939	2	369	1	2026-05-31	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
940	2	317	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 3 CIA
941	2	317	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01 DELMIRO
942	2	377	1	2026-05-26	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 01
943	2	377	1	2026-05-30	6	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
944	2	339	1	2026-05-31	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
945	2	296	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 DA CIA
946	2	296	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT01
947	2	367	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
948	2	367	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02 DELMIRO
949	2	342	1	2026-05-29	5	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 06
950	2	342	1	2026-05-31	0	f	8	250.00	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 03
951	2	376	1	2026-05-25	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
952	2	206	1	2026-05-26	2	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
953	2	206	1	2026-05-27	3	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
954	2	206	1	2026-05-28	4	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
955	2	252	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 1
956	2	252	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 02
957	2	221	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 1
958	2	221	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 1
959	2	221	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA 02
960	2	324	1	2026-05-28	4	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
961	2	203	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3A CIA
962	2	207	1	2026-05-27	3	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
963	2	199	1	2026-05-26	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3ª CIA
964	2	199	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 2CIA
965	2	238	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT BELO MONTE
966	2	214	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT BELO MONTE
967	2	214	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
968	2	224	1	2026-05-25	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
969	2	224	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
970	2	239	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 01 DELMIRO
971	2	239	1	2026-05-30	6	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
972	2	243	1	2026-05-25	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
973	2	243	1	2026-05-31	0	f	8	250.00	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
974	2	216	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORCA TAREFA 3 CIA
975	2	216	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 3° CIA
976	2	247	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
977	2	381	1	2026-05-26	2	f	6	192.03	Presente	CME	COPES	FORÇA TAREFA	FT 01 - COPES
978	2	381	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
979	2	379	1	2026-05-27	3	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
980	2	386	1	2026-05-23	6	f	8	250.00	Presente	CME	COPES	FORÇA TAREFA	FT 02 - COPES
981	2	386	1	2026-05-26	2	f	6	192.03	Presente	CME	COPES	FORÇA TAREFA	FT 01 - COPES
982	2	386	1	2026-05-31	0	f	8	250.00	Presente	CME	COPES	FORÇA TAREFA	FT 01 - COPES
983	2	380	1	2026-05-29	5	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 05
984	2	382	1	2026-05-28	4	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
985	2	382	1	2026-05-31	0	f	8	250.00	Presente	CPRS	9º BPM	FORÇA TAREFA	FT PIRANHAS
986	2	230	1	2026-06-02	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT FAZENDARIA
987	2	271	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
988	2	287	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
989	2	242	1	2026-06-01	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT01
990	2	359	1	2026-06-01	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT01
991	2	328	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
992	2	196	1	2026-06-01	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
993	2	196	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
994	2	305	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
995	2	232	1	2026-06-01	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
996	2	232	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
997	2	360	1	2026-06-02	2	f	6	192.03	Presente	CPRA	3º BPM	FORÇA TAREFA	FT 06
998	2	253	1	2026-06-01	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
999	2	198	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
1000	2	251	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
1001	2	330	1	2026-06-01	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
1002	2	313	1	2026-06-01	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
1003	2	283	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FORÇA TAREFA 01
1004	2	321	1	2026-06-02	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT FAZENDARIA
1005	2	376	1	2026-06-01	1	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT POSTO FISCAL
1006	2	376	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 3 CIA
1007	2	206	1	2026-06-01	1	f	6	192.03	Presente	CPRS	7º BPM	FORÇA TAREFA	FT CPRS 01
1008	2	252	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
1009	2	221	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT VELADA
1010	2	214	1	2026-06-01	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT01
1011	2	243	1	2026-06-02	2	f	6	192.03	Presente	CPE	CPM/I-Faz	FORÇA TAREFA	FT FAZENDARIA
1012	2	247	1	2026-06-01	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT 02
1013	2	379	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FTSUBCOMANDO
1014	2	380	1	2026-06-01	1	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
1015	2	380	1	2026-06-02	2	f	6	192.03	Presente	CPRS	9º BPM	FORÇA TAREFA	FT COMANDO
\.


--
-- Data for Name: tipos_servico; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tipos_servico (id_tipo_servico, descricao, carga_horaria, valor_remuneracao, ativo) FROM stdin;
1	Serviço 6h	6	192.03	t
2	Serviço 8h	8	250.00	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, numero_ordem, password, password_hash, is_admin, status, last_login_at, created_at, updated_at) FROM stdin;
2	1200712	04158269423	$2b$12$QpXoK9Xrd6NJGlFRloxEPORUbFd3DdQJ2ycuHwjy0WzASUy/3UNf6	1	ativo	2026-05-18 15:57:18.656998	2026-04-27 14:18:41.926216	2026-05-18 15:57:18.638454
59	663824	05626561463	\N	1	ativo	\N	2026-04-27 14:18:42.163582	2026-04-27 14:18:42.163582
65	1426060	02715243405	$2b$12$VZP/xJ4c3SVcV7nJ74/8VeqTrZgMdtYzZXU.3OX6V/skaamwqYe9C	1	ativo	2026-05-18 14:42:48.867466	2026-04-27 14:18:42.18942	2026-05-07 16:41:09.906331
1	999999	00000000000	$2b$12$mRukSB7dsW.XvGSLlyqrTOcZAoSLHBQuAfv96.9rjUiK9fFtC1g1S	1	ativo	2026-05-07 16:43:09.080834	2026-04-23 02:20:48.415172	2026-04-23 03:38:08.503858
61	655120	06747113438	$2b$12$WHM5juO7F1x6vvg0.ISAvOXJ/aXBkdZsspkIWH63ng.ahS78r/wky	0	ativo	2026-05-13 15:58:00.904442	2026-04-27 14:18:42.173049	2026-05-13 15:58:00.886683
3	14664	07712466416	\N	0	ativo	\N	2026-04-27 14:18:41.931621	2026-04-27 14:18:41.931621
4	1207490	05829243407	\N	0	ativo	\N	2026-04-27 14:18:41.935373	2026-04-27 14:18:41.935373
5	84913	63607263434	\N	0	ativo	\N	2026-04-27 14:18:41.940267	2026-04-27 14:18:41.940267
6	15199	03666327524	\N	0	ativo	\N	2026-04-27 14:18:41.94387	2026-04-27 14:18:41.94387
7	22624	04949356500	\N	0	ativo	\N	2026-04-27 14:18:41.9476	2026-04-27 14:18:41.9476
8	5916	06895110437	\N	0	ativo	\N	2026-04-27 14:18:41.952554	2026-04-27 14:18:41.952554
9	96644	60515082449	\N	0	ativo	\N	2026-04-27 14:18:41.956385	2026-04-27 14:18:41.956385
10	53880	09601191402	\N	0	ativo	\N	2026-04-27 14:18:41.960179	2026-04-27 14:18:41.960179
11	51829	07242175330	\N	0	ativo	\N	2026-04-27 14:18:41.963746	2026-04-27 14:18:41.963746
12	73261	47256079400	\N	0	ativo	\N	2026-04-27 14:18:41.967336	2026-04-27 14:18:41.967336
13	69027	63538016453	\N	0	ativo	\N	2026-04-27 14:18:41.970945	2026-04-27 14:18:41.970945
14	1205722	03316813403	\N	0	ativo	\N	2026-04-27 14:18:41.974857	2026-04-27 14:18:41.974857
15	112534	92614698415	\N	0	ativo	\N	2026-04-27 14:18:41.978966	2026-04-27 14:18:41.978966
17	1206010	02891372417	\N	0	ativo	\N	2026-04-27 14:18:41.986762	2026-04-27 14:18:41.986762
18	1205560	03528192437	\N	0	ativo	\N	2026-04-27 14:18:41.99069	2026-04-27 14:18:41.99069
19	1206982	03696736465	\N	0	ativo	\N	2026-04-27 14:18:41.994621	2026-04-27 14:18:41.994621
20	115789	74072269468	\N	0	ativo	\N	2026-04-27 14:18:41.998428	2026-04-27 14:18:41.998428
21	1203134	04020579458	\N	0	ativo	\N	2026-04-27 14:18:42.002306	2026-04-27 14:18:42.002306
22	119903	88856437449	\N	0	ativo	\N	2026-04-27 14:18:42.006215	2026-04-27 14:18:42.006215
23	348660	95873902453	\N	0	ativo	\N	2026-04-27 14:18:42.010034	2026-04-27 14:18:42.010034
24	120936	34842063491	\N	0	ativo	\N	2026-04-27 14:18:42.015056	2026-04-27 14:18:42.015056
25	1204130	69343284500	\N	0	ativo	\N	2026-04-27 14:18:42.018818	2026-04-27 14:18:42.018818
26	1204270	03907636406	\N	0	ativo	\N	2026-04-27 14:18:42.023061	2026-04-27 14:18:42.023061
27	99449	55398847449	\N	0	ativo	\N	2026-04-27 14:18:42.026885	2026-04-27 14:18:42.026885
28	1202707	02803393484	\N	0	ativo	\N	2026-04-27 14:18:42.030808	2026-04-27 14:18:42.030808
29	99678	78684706404	\N	0	ativo	\N	2026-04-27 14:18:42.034642	2026-04-27 14:18:42.034642
30	118974	84219734449	\N	0	ativo	\N	2026-04-27 14:18:42.039878	2026-04-27 14:18:42.039878
31	312274	00920580432	\N	0	ativo	\N	2026-04-27 14:18:42.043781	2026-04-27 14:18:42.043781
32	304050	02771615410	\N	0	ativo	\N	2026-04-27 14:18:42.047668	2026-04-27 14:18:42.047668
33	357359	89704843534	\N	0	ativo	\N	2026-04-27 14:18:42.05177	2026-04-27 14:18:42.05177
34	649309	06709505480	\N	0	ativo	\N	2026-04-27 14:18:42.0574	2026-04-27 14:18:42.0574
35	366498	94556229553	\N	0	ativo	\N	2026-04-27 14:18:42.061329	2026-04-27 14:18:42.061329
36	1203100	00475357507	\N	0	ativo	\N	2026-04-27 14:18:42.066014	2026-04-27 14:18:42.066014
37	351245	01920833501	\N	0	ativo	\N	2026-04-27 14:18:42.069708	2026-04-27 14:18:42.069708
38	323845	05297372488	\N	0	ativo	\N	2026-04-27 14:18:42.073105	2026-04-27 14:18:42.073105
39	349305	07024580402	\N	0	ativo	\N	2026-04-27 14:18:42.076998	2026-04-27 14:18:42.076998
40	306550	01173400494	\N	0	ativo	\N	2026-04-27 14:18:42.080654	2026-04-27 14:18:42.080654
41	367494	03989768484	\N	0	ativo	\N	2026-04-27 14:18:42.084648	2026-04-27 14:18:42.084648
42	646512	04580551400	\N	0	ativo	\N	2026-04-27 14:18:42.088379	2026-04-27 14:18:42.088379
43	646555	06511014410	\N	0	ativo	\N	2026-04-27 14:18:42.092041	2026-04-27 14:18:42.092041
44	1202626	69907030597	\N	0	ativo	\N	2026-04-27 14:18:42.095844	2026-04-27 14:18:42.095844
45	652628	86342754420	\N	0	ativo	\N	2026-04-27 14:18:42.100003	2026-04-27 14:18:42.100003
46	334995	02857505507	\N	0	ativo	\N	2026-04-27 14:18:42.103951	2026-04-27 14:18:42.103951
47	336874	03993910451	\N	0	ativo	\N	2026-04-27 14:18:42.109059	2026-04-27 14:18:42.109059
48	335177	03390131418	\N	0	ativo	\N	2026-04-27 14:18:42.112699	2026-04-27 14:18:42.112699
49	1202316	87158043568	\N	0	ativo	\N	2026-04-27 14:18:42.116613	2026-04-27 14:18:42.116613
50	365327	05786696413	\N	0	ativo	\N	2026-04-27 14:18:42.120483	2026-04-27 14:18:42.120483
51	347060	03238212435	\N	0	ativo	\N	2026-04-27 14:18:42.12647	2026-04-27 14:18:42.12647
52	359980	03854071493	\N	0	ativo	\N	2026-04-27 14:18:42.132104	2026-04-27 14:18:42.132104
53	655716	94189862568	\N	0	ativo	\N	2026-04-27 14:18:42.135778	2026-04-27 14:18:42.135778
54	303330	04937992490	\N	0	ativo	\N	2026-04-27 14:18:42.14113	2026-04-27 14:18:42.14113
55	335002	04675737439	\N	0	ativo	\N	2026-04-27 14:18:42.144853	2026-04-27 14:18:42.144853
56	336432	06647595481	\N	0	ativo	\N	2026-04-27 14:18:42.148956	2026-04-27 14:18:42.148956
57	349259	06141549446	\N	0	ativo	\N	2026-04-27 14:18:42.153938	2026-04-27 14:18:42.153938
58	322750	50691775400	\N	0	ativo	\N	2026-04-27 14:18:42.159449	2026-04-27 14:18:42.159449
60	317535	02936774411	\N	0	ativo	\N	2026-04-27 14:18:42.167278	2026-04-27 14:18:42.167278
62	321753	04349408444	\N	0	ativo	\N	2026-04-27 14:18:42.17675	2026-04-27 14:18:42.17675
63	5053	03991256479	\N	0	ativo	\N	2026-04-27 14:18:42.180707	2026-04-27 14:18:42.180707
64	8389	06825409433	\N	0	ativo	\N	2026-04-27 14:18:42.1856	2026-04-27 14:18:42.1856
66	22047	03517069507	\N	0	ativo	\N	2026-04-27 14:18:42.193158	2026-04-27 14:18:42.193158
67	21474	05614697500	\N	0	ativo	\N	2026-04-27 14:18:42.196938	2026-04-27 14:18:42.196938
69	2259	08280330488	\N	0	ativo	\N	2026-04-27 14:18:42.20445	2026-04-27 14:18:42.20445
70	17841	07685533421	\N	0	ativo	\N	2026-04-27 14:18:42.208016	2026-04-27 14:18:42.208016
71	16489	06041363405	\N	0	ativo	\N	2026-04-27 14:18:42.211645	2026-04-27 14:18:42.211645
72	3786	07050017418	\N	0	ativo	\N	2026-04-27 14:18:42.215452	2026-04-27 14:18:42.215452
73	22187	08092284407	\N	0	ativo	\N	2026-04-27 14:18:42.220166	2026-04-27 14:18:42.220166
74	309850	06232107462	\N	0	ativo	\N	2026-04-27 14:18:42.224134	2026-04-27 14:18:42.224134
75	22241	05720954490	\N	0	ativo	\N	2026-04-27 14:18:42.229936	2026-04-27 14:18:42.229936
76	12726	00657269522	\N	0	ativo	\N	2026-04-27 14:18:42.233917	2026-04-27 14:18:42.233917
77	16608	04591473589	\N	0	ativo	\N	2026-04-27 14:18:42.237731	2026-04-27 14:18:42.237731
78	8621	06256653416	\N	0	ativo	\N	2026-04-27 14:18:42.241639	2026-04-27 14:18:42.241639
79	14060	04822405559	\N	0	ativo	\N	2026-04-27 14:18:42.245276	2026-04-27 14:18:42.245276
16	1206044	04512828419	$2b$12$82diug.rQDFuNbs6pvh7BOG72sFKiCVx./ycecGo.jBwxQ8lODCcK	1	ativo	2026-05-28 23:43:38.824826	2026-04-27 14:18:41.982845	2026-05-04 13:33:11.400226
80	12831	07999833495	\N	0	ativo	\N	2026-04-27 14:18:42.248905	2026-04-27 14:18:42.248905
81	5487	04725847402	\N	0	ativo	\N	2026-04-27 14:18:42.252668	2026-04-27 14:18:42.252668
82	657280	05075229409	\N	0	ativo	\N	2026-04-27 14:18:42.25631	2026-04-27 14:18:42.25631
83	10758	08484444422	\N	0	ativo	\N	2026-04-27 14:18:42.259975	2026-04-27 14:18:42.259975
84	12742	07051614479	\N	0	ativo	\N	2026-04-27 14:18:42.264302	2026-04-27 14:18:42.264302
85	949	88858561449	\N	0	ativo	\N	2026-04-27 14:18:42.267814	2026-04-27 14:18:42.267814
86	16179	04146548462	\N	0	ativo	\N	2026-04-27 14:18:42.271534	2026-04-27 14:18:42.271534
87	2313	01564452557	\N	0	ativo	\N	2026-04-27 14:18:42.275211	2026-04-27 14:18:42.275211
88	16691	09694808499	\N	0	ativo	\N	2026-04-27 14:18:42.278938	2026-04-27 14:18:42.278938
89	5410	07758985467	\N	0	ativo	\N	2026-04-27 14:18:42.283405	2026-04-27 14:18:42.283405
90	15377	06867027431	\N	0	ativo	\N	2026-04-27 14:18:42.286922	2026-04-27 14:18:42.286922
91	14265	00973463570	\N	0	ativo	\N	2026-04-27 14:18:42.290344	2026-04-27 14:18:42.290344
92	18872	03681493588	\N	0	ativo	\N	2026-04-27 14:18:42.294017	2026-04-27 14:18:42.294017
93	10901	09078392401	\N	0	ativo	\N	2026-04-27 14:18:42.297779	2026-04-27 14:18:42.297779
94	6025	07466643469	\N	0	ativo	\N	2026-04-27 14:18:42.301667	2026-04-27 14:18:42.301667
95	21199	00744108578	\N	0	ativo	\N	2026-04-27 14:18:42.307047	2026-04-27 14:18:42.307047
96	15423	07723084463	\N	0	ativo	\N	2026-04-27 14:18:42.310615	2026-04-27 14:18:42.310615
97	14206	07652744423	\N	0	ativo	\N	2026-04-27 14:18:42.314158	2026-04-27 14:18:42.314158
98	12718	08916626420	\N	0	ativo	\N	2026-04-27 14:18:42.317898	2026-04-27 14:18:42.317898
99	2585	08993559430	\N	0	ativo	\N	2026-04-27 14:18:42.321531	2026-04-27 14:18:42.321531
100	31046	12207731405	\N	0	ativo	\N	2026-04-27 14:18:42.325149	2026-04-27 14:18:42.325149
101	24902	04573423583	\N	0	ativo	\N	2026-04-27 14:18:42.328825	2026-04-27 14:18:42.328825
102	31100	04159863540	\N	0	ativo	\N	2026-04-27 14:18:42.334573	2026-04-27 14:18:42.334573
103	29033	09414899499	\N	0	ativo	\N	2026-04-27 14:18:42.337768	2026-04-27 14:18:42.337768
104	28495	06382031550	\N	0	ativo	\N	2026-04-27 14:18:42.344147	2026-04-27 14:18:42.344147
105	25593	08741541464	\N	0	ativo	\N	2026-04-27 14:18:42.347793	2026-04-27 14:18:42.347793
106	34223	12954083417	\N	0	ativo	\N	2026-04-27 14:18:42.351499	2026-04-27 14:18:42.351499
107	29904	05772590596	\N	0	ativo	\N	2026-04-27 14:18:42.355074	2026-04-27 14:18:42.355074
108	26310	10529552400	\N	0	ativo	\N	2026-04-27 14:18:42.35871	2026-04-27 14:18:42.35871
109	23655	04793418503	\N	0	ativo	\N	2026-04-27 14:18:42.362305	2026-04-27 14:18:42.362305
110	33812	06244833554	\N	0	ativo	\N	2026-04-27 14:18:42.366261	2026-04-27 14:18:42.366261
111	32115	10102129401	\N	0	ativo	\N	2026-04-27 14:18:42.370186	2026-04-27 14:18:42.370186
112	26158	07410063408	\N	0	ativo	\N	2026-04-27 14:18:42.373942	2026-04-27 14:18:42.373942
113	24287	60078927358	\N	0	ativo	\N	2026-04-27 14:18:42.378547	2026-04-27 14:18:42.378547
114	27448	10036352454	\N	0	ativo	\N	2026-04-27 14:18:42.382373	2026-04-27 14:18:42.382373
115	33316	06492060539	\N	0	ativo	\N	2026-04-27 14:18:42.386157	2026-04-27 14:18:42.386157
116	23930	10417350490	\N	0	ativo	\N	2026-04-27 14:18:42.391209	2026-04-27 14:18:42.391209
117	27065	08989177430	\N	0	ativo	\N	2026-04-27 14:18:42.394742	2026-04-27 14:18:42.394742
118	28550	07620825428	\N	0	ativo	\N	2026-04-27 14:18:42.398373	2026-04-27 14:18:42.398373
119	33693	04583458576	\N	0	ativo	\N	2026-04-27 14:18:42.401933	2026-04-27 14:18:42.401933
120	30830	10677531419	\N	0	ativo	\N	2026-04-27 14:18:42.405594	2026-04-27 14:18:42.405594
121	32271	11723604488	\N	0	ativo	\N	2026-04-27 14:18:42.410243	2026-04-27 14:18:42.410243
122	23213	03349582532	\N	0	ativo	\N	2026-04-27 14:18:42.413889	2026-04-27 14:18:42.413889
123	34312	10032912447	\N	0	ativo	\N	2026-04-27 14:18:42.417507	2026-04-27 14:18:42.417507
124	36854	03152404409	\N	0	ativo	\N	2026-04-27 14:18:42.421269	2026-04-27 14:18:42.421269
125	47864	10851074421	\N	0	ativo	\N	2026-04-27 14:18:42.425062	2026-04-27 14:18:42.425062
126	47988	86492138554	\N	0	ativo	\N	2026-04-27 14:18:42.429395	2026-04-27 14:18:42.429395
127	49492	09456573583	\N	0	ativo	\N	2026-04-27 14:18:42.432942	2026-04-27 14:18:42.432942
128	7889	56471815468	\N	0	ativo	\N	2026-04-27 14:18:42.43662	2026-04-27 14:18:42.43662
129	9440	04834403459	\N	0	ativo	\N	2026-04-27 14:18:42.44022	2026-04-27 14:18:42.44022
130	53562	08799322447	\N	0	ativo	\N	2026-04-27 14:18:42.44376	2026-04-27 14:18:42.44376
131	53686	06628832503	\N	0	ativo	\N	2026-04-27 14:18:42.448795	2026-04-27 14:18:42.448795
132	42480	04008148540	\N	0	ativo	\N	2026-04-27 14:18:42.452715	2026-04-27 14:18:42.452715
133	34959	00850281423	\N	0	ativo	\N	2026-04-27 14:18:42.45628	2026-04-27 14:18:42.45628
134	43567	07133899400	\N	0	ativo	\N	2026-04-27 14:18:42.459633	2026-04-27 14:18:42.459633
135	47899	10124044476	\N	0	ativo	\N	2026-04-27 14:18:42.463315	2026-04-27 14:18:42.463315
136	49689	05123818529	\N	0	ativo	\N	2026-04-27 14:18:42.466542	2026-04-27 14:18:42.466542
137	41939	10136255442	\N	0	ativo	\N	2026-04-27 14:18:42.470094	2026-04-27 14:18:42.470094
138	44512	04094841482	\N	0	ativo	\N	2026-04-27 14:18:42.476051	2026-04-27 14:18:42.476051
139	55301	05827861502	\N	0	ativo	\N	2026-04-27 14:18:42.479609	2026-04-27 14:18:42.479609
140	56090	08000961504	\N	0	ativo	\N	2026-04-27 14:18:42.483094	2026-04-27 14:18:42.483094
141	55808	05430473502	\N	0	ativo	\N	2026-04-27 14:18:42.486774	2026-04-27 14:18:42.486774
142	57207	36392148892	\N	0	ativo	\N	2026-04-27 14:18:42.490388	2026-04-27 14:18:42.490388
143	50881	12133895426	\N	0	ativo	\N	2026-04-27 14:18:42.493853	2026-04-27 14:18:42.493853
144	42978	02829560507	\N	0	ativo	\N	2026-04-27 14:18:42.497344	2026-04-27 14:18:42.497344
145	55441	13190351406	\N	0	ativo	\N	2026-04-27 14:18:42.500632	2026-04-27 14:18:42.500632
146	40231	12803337401	\N	0	ativo	\N	2026-04-27 14:18:42.504142	2026-04-27 14:18:42.504142
147	56936	12607917425	\N	0	ativo	\N	2026-04-27 14:18:42.507619	2026-04-27 14:18:42.507619
148	40606	11700427407	\N	0	ativo	\N	2026-04-27 14:18:42.511173	2026-04-27 14:18:42.511173
149	55999	10111691427	\N	0	ativo	\N	2026-04-27 14:18:42.514663	2026-04-27 14:18:42.514663
150	56014	05423438519	\N	0	ativo	\N	2026-04-27 14:18:42.518271	2026-04-27 14:18:42.518271
151	43680	01196351511	\N	0	ativo	\N	2026-04-27 14:18:42.522366	2026-04-27 14:18:42.522366
152	57100	10353065498	\N	0	ativo	\N	2026-04-27 14:18:42.525733	2026-04-27 14:18:42.525733
153	55727	07309480562	\N	0	ativo	\N	2026-04-27 14:18:42.529438	2026-04-27 14:18:42.529438
154	37702	98859188504	\N	0	ativo	\N	2026-04-27 14:18:42.532964	2026-04-27 14:18:42.532964
155	55794	12387543416	\N	0	ativo	\N	2026-04-27 14:18:42.538049	2026-04-27 14:18:42.538049
156	54941	13568613425	\N	0	ativo	\N	2026-04-27 14:18:42.541529	2026-04-27 14:18:42.541529
157	48330	06815463443	\N	0	ativo	\N	2026-04-27 14:18:42.545258	2026-04-27 14:18:42.545258
158	48909	13774823405	\N	0	ativo	\N	2026-04-27 14:18:42.549032	2026-04-27 14:18:42.549032
159	50385	06647805559	\N	0	ativo	\N	2026-04-27 14:18:42.55266	2026-04-27 14:18:42.55266
160	50520	06728161562	\N	0	ativo	\N	2026-04-27 14:18:42.556313	2026-04-27 14:18:42.556313
161	50911	11646880498	\N	0	ativo	\N	2026-04-27 14:18:42.560064	2026-04-27 14:18:42.560064
162	41122	11283774461	\N	0	ativo	\N	2026-04-27 14:18:42.56393	2026-04-27 14:18:42.56393
163	35629	03497341436	\N	0	ativo	\N	2026-04-27 14:18:42.567967	2026-04-27 14:18:42.567967
164	47830	05527529596	\N	0	ativo	\N	2026-04-27 14:18:42.57164	2026-04-27 14:18:42.57164
165	51241	04491264554	\N	0	ativo	\N	2026-04-27 14:18:42.575134	2026-04-27 14:18:42.575134
166	35661	02322167460	\N	0	ativo	\N	2026-04-27 14:18:42.578575	2026-04-27 14:18:42.578575
167	49867	06473689516	\N	0	ativo	\N	2026-04-27 14:18:42.582184	2026-04-27 14:18:42.582184
168	50636	06407787556	\N	0	ativo	\N	2026-04-27 14:18:42.585934	2026-04-27 14:18:42.585934
169	40800	09609574483	\N	0	ativo	\N	2026-04-27 14:18:42.590947	2026-04-27 14:18:42.590947
170	43664	05965465483	\N	0	ativo	\N	2026-04-27 14:18:42.594623	2026-04-27 14:18:42.594623
171	53279	12441175440	\N	0	ativo	\N	2026-04-27 14:18:42.598417	2026-04-27 14:18:42.598417
172	55549	09181241402	\N	0	ativo	\N	2026-04-27 14:18:42.601911	2026-04-27 14:18:42.601911
173	54267	10604776454	\N	0	ativo	\N	2026-04-27 14:18:42.605573	2026-04-27 14:18:42.605573
174	40010	07517662406	\N	0	ativo	\N	2026-04-27 14:18:42.609264	2026-04-27 14:18:42.609264
175	34835	05414524440	\N	0	ativo	\N	2026-04-27 14:18:42.612959	2026-04-27 14:18:42.612959
176	40100	06462277424	\N	0	ativo	\N	2026-04-27 14:18:42.616563	2026-04-27 14:18:42.616563
177	47473	06546508532	\N	0	ativo	\N	2026-04-27 14:18:42.620266	2026-04-27 14:18:42.620266
178	46523	05422322517	\N	0	ativo	\N	2026-04-27 14:18:42.62386	2026-04-27 14:18:42.62386
179	46515	09409560470	\N	0	ativo	\N	2026-04-27 14:18:42.627312	2026-04-27 14:18:42.627312
180	46426	38731422870	\N	0	ativo	\N	2026-04-27 14:18:42.630927	2026-04-27 14:18:42.630927
181	48836	11969310464	\N	0	ativo	\N	2026-04-27 14:18:42.634538	2026-04-27 14:18:42.634538
182	57622	12147879401	\N	0	ativo	\N	2026-04-27 14:18:42.638209	2026-04-27 14:18:42.638209
183	96536	04020609462	\N	0	ativo	\N	2026-04-27 14:42:58.673918	2026-04-27 14:42:58.673918
184	82232	89411064434	\N	0	ativo	\N	2026-04-27 14:42:59.472704	2026-04-27 14:42:59.472704
185	1205447	04020609462	\N	0	ativo	\N	2026-04-27 15:39:12.287268	2026-04-27 15:39:12.287268
186	118559	89411064434	\N	0	ativo	\N	2026-04-27 15:44:15.17675	2026-04-27 15:44:15.17675
187	16870	01408030500	\N	0	ativo	\N	2026-04-27 15:46:43.156331	2026-04-27 15:46:43.156331
188	96881	49433164415	\N	0	ativo	\N	2026-04-27 16:17:39.391932	2026-04-27 16:17:39.391932
189	1207202 	05359116455	\N	0	ativo	\N	2026-04-27 17:07:37.304294	2026-04-27 17:07:37.304294
257	21946	08867037439	\N	0	ativo	\N	2026-04-28 13:45:04.831656	2026-04-28 13:45:04.831656
278	18252	03137786550	\N	0	ativo	\N	2026-04-28 13:45:04.913475	2026-04-28 13:45:04.913475
377	1207202	05359116455	\N	0	ativo	\N	2026-04-28 16:25:21.736525	2026-04-28 16:25:21.736525
378	14532	07573627459	\N	0	ativo	\N	2026-05-08 14:07:19.017411	2026-05-08 14:07:19.017411
379	11959	05797534410	\N	0	ativo	\N	2026-05-08 14:07:19.172587	2026-05-08 14:07:19.172587
380	177888	08181549422	\N	0	ativo	\N	2026-05-28 18:21:25.842494	2026-05-28 18:21:25.842494
381	149679	05423251443	\N	0	ativo	\N	2026-05-28 19:10:57.640635	2026-05-28 19:10:57.640635
382	309435	02955374423	\N	0	ativo	\N	2026-05-28 19:17:42.506775	2026-05-28 19:17:42.506775
383	327069	00750828455	\N	0	ativo	\N	2026-05-28 19:17:42.528534	2026-05-28 19:17:42.528534
384	21040	10174482485	\N	0	ativo	\N	2026-05-28 19:17:42.560421	2026-05-28 19:17:42.560421
385	11843	06480682424	\N	0	ativo	\N	2026-05-28 19:17:42.585205	2026-05-28 19:17:42.585205
386	10561	05757093404	\N	0	ativo	\N	2026-05-28 19:17:42.625743	2026-05-28 19:17:42.625743
387	38644	07401423480	\N	0	ativo	\N	2026-05-28 19:17:42.709927	2026-05-28 19:17:42.709927
\.


--
-- Name: ciclo_config_id_config_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ciclo_config_id_config_seq', 18, true);


--
-- Name: ciclos_id_ciclo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ciclos_id_ciclo_seq', 4, true);


--
-- Name: disponibilidade_requerimento_id_disponibilidade_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.disponibilidade_requerimento_id_disponibilidade_seq', 38733, true);


--
-- Name: efetivo_id_militar_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.efetivo_id_militar_seq', 393, true);


--
-- Name: escala_efetivo_servico_id_vinculo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.escala_efetivo_servico_id_vinculo_seq', 2627, true);


--
-- Name: escala_planejamento_id_escala_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.escala_planejamento_id_escala_seq', 2460, true);


--
-- Name: feriados_id_feriado_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.feriados_id_feriado_seq', 4104, true);


--
-- Name: importacao_log_id_log_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.importacao_log_id_log_seq', 1, false);


--
-- Name: metas_alocacao_id_meta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.metas_alocacao_id_meta_seq', 2183, true);


--
-- Name: opm_id_opm_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.opm_id_opm_seq', 1, true);


--
-- Name: requerimentos_id_requerimento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.requerimentos_id_requerimento_seq', 303, true);


--
-- Name: servicos_executados_id_execucao_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.servicos_executados_id_execucao_seq', 1015, true);


--
-- Name: tipos_servico_id_tipo_servico_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tipos_servico_id_tipo_servico_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 387, true);


--
-- Name: ciclo_config ciclo_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciclo_config
    ADD CONSTRAINT ciclo_config_pkey PRIMARY KEY (id_config);


--
-- Name: ciclos ciclos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciclos
    ADD CONSTRAINT ciclos_pkey PRIMARY KEY (id_ciclo);


--
-- Name: disponibilidade_requerimento disponibilidade_requerimento_id_requerimento_dia_mes_horari_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidade_requerimento
    ADD CONSTRAINT disponibilidade_requerimento_id_requerimento_dia_mes_horari_key UNIQUE (id_requerimento, dia_mes, horario_turno);


--
-- Name: disponibilidade_requerimento disponibilidade_requerimento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidade_requerimento
    ADD CONSTRAINT disponibilidade_requerimento_pkey PRIMARY KEY (id_disponibilidade);


--
-- Name: efetivo efetivo_cpf_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.efetivo
    ADD CONSTRAINT efetivo_cpf_key UNIQUE (cpf);


--
-- Name: efetivo efetivo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.efetivo
    ADD CONSTRAINT efetivo_pkey PRIMARY KEY (id_militar);


--
-- Name: escala_efetivo_servico escala_efetivo_servico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_efetivo_servico
    ADD CONSTRAINT escala_efetivo_servico_pkey PRIMARY KEY (id_vinculo);


--
-- Name: escala_planejamento escala_planejamento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_planejamento
    ADD CONSTRAINT escala_planejamento_pkey PRIMARY KEY (id_escala);


--
-- Name: feriados feriados_data_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feriados
    ADD CONSTRAINT feriados_data_key UNIQUE (data);


--
-- Name: feriados feriados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feriados
    ADD CONSTRAINT feriados_pkey PRIMARY KEY (id_feriado);


--
-- Name: importacao_log importacao_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.importacao_log
    ADD CONSTRAINT importacao_log_pkey PRIMARY KEY (id_log);


--
-- Name: metas_alocacao metas_alocacao_id_ciclo_data_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_alocacao
    ADD CONSTRAINT metas_alocacao_id_ciclo_data_key UNIQUE (id_ciclo, data);


--
-- Name: metas_alocacao metas_alocacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_alocacao
    ADD CONSTRAINT metas_alocacao_pkey PRIMARY KEY (id_meta);


--
-- Name: opm opm_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opm
    ADD CONSTRAINT opm_pkey PRIMARY KEY (id_opm);


--
-- Name: requerimentos requerimentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requerimentos
    ADD CONSTRAINT requerimentos_pkey PRIMARY KEY (id_requerimento);


--
-- Name: servicos_executados servicos_executados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos_executados
    ADD CONSTRAINT servicos_executados_pkey PRIMARY KEY (id_execucao);


--
-- Name: tipos_servico tipos_servico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tipos_servico
    ADD CONSTRAINT tipos_servico_pkey PRIMARY KEY (id_tipo_servico);


--
-- Name: requerimentos uq_requerimentos_militar_ciclo_mes; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requerimentos
    ADD CONSTRAINT uq_requerimentos_militar_ciclo_mes UNIQUE (id_militar, id_ciclo, mes_referencia);


--
-- Name: users users_numero_ordem_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_numero_ordem_key UNIQUE (numero_ordem);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_importacao_log_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_importacao_log_hash ON public.importacao_log USING btree (arquivo_hash);


--
-- Name: idx_importacao_log_militar; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_importacao_log_militar ON public.importacao_log USING btree (id_militar);


--
-- Name: idx_importacao_log_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_importacao_log_usuario ON public.importacao_log USING btree (id_usuario);


--
-- Name: servicos_executados trg_execucao_after_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_execucao_after_insert AFTER INSERT ON public.servicos_executados FOR EACH ROW EXECUTE FUNCTION public.trg_execucao_ternaria();


--
-- Name: escala_planejamento trg_planejamento_after_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_planejamento_after_insert AFTER INSERT ON public.escala_planejamento FOR EACH ROW EXECUTE FUNCTION public.trg_planejamento_ternaria();


--
-- Name: escala_planejamento trg_valida_escala_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_valida_escala_insert BEFORE INSERT ON public.escala_planejamento FOR EACH ROW EXECUTE FUNCTION public.fn_valida_escala();


--
-- Name: escala_planejamento trg_valida_escala_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_valida_escala_update BEFORE UPDATE ON public.escala_planejamento FOR EACH ROW EXECUTE FUNCTION public.fn_valida_escala();


--
-- Name: escala_efetivo_servico trg_valida_vinculo_planejamento_execucao; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_valida_vinculo_planejamento_execucao BEFORE INSERT OR UPDATE ON public.escala_efetivo_servico FOR EACH ROW EXECUTE FUNCTION public.fn_valida_vinculo_planejamento_execucao();


--
-- Name: ciclo_config ciclo_config_id_opm_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciclo_config
    ADD CONSTRAINT ciclo_config_id_opm_fkey FOREIGN KEY (id_opm) REFERENCES public.opm(id_opm);


--
-- Name: ciclos ciclos_id_opm_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciclos
    ADD CONSTRAINT ciclos_id_opm_fkey FOREIGN KEY (id_opm) REFERENCES public.opm(id_opm);


--
-- Name: disponibilidade_requerimento disponibilidade_requerimento_id_requerimento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidade_requerimento
    ADD CONSTRAINT disponibilidade_requerimento_id_requerimento_fkey FOREIGN KEY (id_requerimento) REFERENCES public.requerimentos(id_requerimento) ON DELETE CASCADE;


--
-- Name: escala_efetivo_servico escala_efetivo_servico_id_escala_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_efetivo_servico
    ADD CONSTRAINT escala_efetivo_servico_id_escala_fkey FOREIGN KEY (id_escala) REFERENCES public.escala_planejamento(id_escala) ON DELETE SET NULL;


--
-- Name: escala_efetivo_servico escala_efetivo_servico_id_execucao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_efetivo_servico
    ADD CONSTRAINT escala_efetivo_servico_id_execucao_fkey FOREIGN KEY (id_execucao) REFERENCES public.servicos_executados(id_execucao) ON DELETE CASCADE;


--
-- Name: escala_efetivo_servico escala_efetivo_servico_id_militar_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_efetivo_servico
    ADD CONSTRAINT escala_efetivo_servico_id_militar_fkey FOREIGN KEY (id_militar) REFERENCES public.efetivo(id_militar) ON DELETE CASCADE;


--
-- Name: escala_planejamento escala_planejamento_id_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_planejamento
    ADD CONSTRAINT escala_planejamento_id_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclos(id_ciclo);


--
-- Name: escala_planejamento escala_planejamento_id_disponibilidade_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_planejamento
    ADD CONSTRAINT escala_planejamento_id_disponibilidade_fkey FOREIGN KEY (id_disponibilidade) REFERENCES public.disponibilidade_requerimento(id_disponibilidade);


--
-- Name: escala_planejamento escala_planejamento_id_militar_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_planejamento
    ADD CONSTRAINT escala_planejamento_id_militar_fkey FOREIGN KEY (id_militar) REFERENCES public.efetivo(id_militar);


--
-- Name: escala_planejamento escala_planejamento_id_tipo_servico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escala_planejamento
    ADD CONSTRAINT escala_planejamento_id_tipo_servico_fkey FOREIGN KEY (id_tipo_servico) REFERENCES public.tipos_servico(id_tipo_servico);


--
-- Name: importacao_log importacao_log_id_militar_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.importacao_log
    ADD CONSTRAINT importacao_log_id_militar_fkey FOREIGN KEY (id_militar) REFERENCES public.efetivo(id_militar) ON DELETE SET NULL;


--
-- Name: importacao_log importacao_log_id_requerimento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.importacao_log
    ADD CONSTRAINT importacao_log_id_requerimento_fkey FOREIGN KEY (id_requerimento) REFERENCES public.requerimentos(id_requerimento) ON DELETE SET NULL;


--
-- Name: importacao_log importacao_log_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.importacao_log
    ADD CONSTRAINT importacao_log_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: metas_alocacao metas_alocacao_id_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_alocacao
    ADD CONSTRAINT metas_alocacao_id_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclos(id_ciclo) ON DELETE CASCADE;


--
-- Name: requerimentos requerimentos_id_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requerimentos
    ADD CONSTRAINT requerimentos_id_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclos(id_ciclo);


--
-- Name: requerimentos requerimentos_id_militar_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requerimentos
    ADD CONSTRAINT requerimentos_id_militar_fkey FOREIGN KEY (id_militar) REFERENCES public.efetivo(id_militar);


--
-- Name: requerimentos requerimentos_id_usuario_criacao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requerimentos
    ADD CONSTRAINT requerimentos_id_usuario_criacao_fkey FOREIGN KEY (id_usuario_criacao) REFERENCES public.users(id);


--
-- Name: servicos_executados servicos_executados_id_ciclo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos_executados
    ADD CONSTRAINT servicos_executados_id_ciclo_fkey FOREIGN KEY (id_ciclo) REFERENCES public.ciclos(id_ciclo);


--
-- Name: servicos_executados servicos_executados_id_militar_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos_executados
    ADD CONSTRAINT servicos_executados_id_militar_fkey FOREIGN KEY (id_militar) REFERENCES public.efetivo(id_militar);


--
-- Name: servicos_executados servicos_executados_id_tipo_servico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos_executados
    ADD CONSTRAINT servicos_executados_id_tipo_servico_fkey FOREIGN KEY (id_tipo_servico) REFERENCES public.tipos_servico(id_tipo_servico);


--
-- PostgreSQL database dump complete
--

\unrestrict 2FCuoF1iXhU5aoOw1YO01WiYonDOteCDfq4hfLTqTZzvG6mhalxNCkW9Ha9JKvo

--
-- Database "postgres" dump
--

\connect postgres

--
-- PostgreSQL database dump
--

\restrict W7nviRdwT2di3tNMHgkeIXtTf8MgufoIYIOKFINopZfmIw3AtVS7NRXUqAIacuE

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict W7nviRdwT2di3tNMHgkeIXtTf8MgufoIYIOKFINopZfmIw3AtVS7NRXUqAIacuE

--
-- PostgreSQL database cluster dump complete
--

