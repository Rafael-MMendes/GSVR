# 🛡️ GSVR — Gestão de Serviço Voluntário Remunerado
### 9º Batalhão de Polícia Militar do Estado de Alagoas (9º BPM / PMAL)

[![Versão](https://img.shields.io/badge/versão-v1.37.0-blue.svg)](file:///VERSION.md)
[![Node.js](https://img.shields.io/badge/Node.js-21+-339933.svg?logo=nodedotjs)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg?logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose_v2-2496ED.svg?logo=docker)](https://www.docker.com/)

O **GSVR** é a plataforma corporativa integrada de planejamento operacional, gestão de efetivo voluntário e controle orçamentário desenvolvida para o **9º BPM/PMAL**. O sistema automatiza a formação de guarnições policiais em viaturas, gerencia períodos de serviço operacional (ciclos do dia 16 a 15), aplica travas de segurança em banco de dados para evitar duplicidade de escalas e controla o teto legal de 8 serviços por policial militar.

---

## 📚 Documentação Completa do Sistema

A documentação detalhada e modular do GSVR está disponível no diretório [`docs/`](file:///docs/README.md):

| Volume | Tópico | Conteúdo Principal |
| :---: | :--- | :--- |
| **01** | [**Visão Geral e Negócio**](file:///docs/01-visao-geral.md) | Conceito de SVR, regra dos ciclos (16 a 15), cotas de 8 serviços, papéis de guarnição (Comandante, Motorista, Patrulheiro), turnos T1-T4 e cenários financeiros A e B. |
| **02** | [**Arquitetura e Stack**](file:///docs/02-arquitetura-e-stack.md) | Arquitetura 3-Tier desacoplada, SPA React 18 + Vite, API Express 5, PostgreSQL 16, persistência manual sem persistência prematura, topologia Docker e diagramas Mermaid. |
| **03** | [**Modelagem de Dados**](file:///docs/03-modelo-de-dados.md) | DDL completo em 3ª Forma Normal, Dicionário de Dados, Diagrama Entidade-Relacionamento (ERD), gatilhos de integridade (triggers) e auditoria imutável. |
| **04** | [**Segurança e Autenticação**](file:///docs/04-seguranca-e-autenticacao.md) | Login exclusivo por CPF (algoritmo da Receita Federal), 1º Acesso anti-sequestro de contas, bcrypt (salt 12), RBAC granular, perfil SUPERUSER com 2FA TOTP (RFC 6238) e Helmet. |
| **05** | [**Módulos e Telas**](file:///docs/05-modulos-do-sistema.md) | Detalhamento dos 26 componentes: AdminDashboardV2 (Drag-and-Drop), Minhas Escalas, Inscrição de Voluntários, Ciclos, Metas, Conferência, Dashboards e Memorando SVR. |
| **06** | [**Catálogo de APIs REST**](file:///docs/06-catalogo-de-apis.md) | Especificação exaustiva de todos os endpoints REST, autenticação JWT Bearer, payloads de requisição/resposta, códigos de status e exemplos práticos. |
| **07** | [**Guia de Implantação e Operação**](file:///docs/07-guia-de-implantacao-e-operacao.md) | Manual de instalação (Docker vs Local Windows), variáveis de ambiente `.env`, CLI de provisionamento de superusuários, migrações, rotinas de backup e solução de problemas. |
| **08** | [**Manual do Usuário**](file:///docs/08-manual-do-usuario.md) | Passo a passo operacional para os 4 perfis: Policial Militar Voluntário, Operador P/3, Gestor Operacional/Financeiro e Administrador/TI. |

> 🌐 **Portal Web Integrado:** Acesse o portal interativo e responsivo em [manual-e-documentacao.html](file:///frontend/public/manual-e-documentacao.html) ou no menu superior da aplicação logada.

---

## 🚀 Início Rápido

### 1. Pré-requisitos
- [Docker Desktop](https://www.docker.com/) 24+ ou [Node.js](https://nodejs.org/) 21+ com [PostgreSQL](https://www.postgresql.org/) 16+.

### 2. Executando com Docker (Recomendado)
```bash
# Modo de desenvolvimento padrão:
docker compose up --build

# Modo de produção com hot reload:
docker compose -f docker-compose.prod.yml up --build
```

### 3. Executando Localmente no Windows (Sem Docker)
- Dê um duplo clique em [iniciar-sistema.bat](file:///iniciar-sistema.bat) para subir o backend e frontend automaticamente.
- Para encerrar os processos, execute [encerrar-sistema.bat](file:///encerrar-sistema.bat).

---

## 🌐 Endereços e Portas dos Serviços

| Serviço | Endereço Padrão | Descrição |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | Interface gráfica dos operadores e militares |
| **Backend API** | [http://localhost:3001](http://localhost:3001) | Servidor REST com endpoints operacionais |
| **pgAdmin 4** | [http://localhost:5050](http://localhost:5050) | Interface web de gerenciamento do PostgreSQL |
| **Portainer** | [http://localhost:9000](http://localhost:9000) | Gestão e monitoramento dos containers Docker |

---

## 🔑 Credenciais e Variáveis de Ambiente

Configure os arquivos de ambiente antes de iniciar:
- **Backend**: `backend/.env` (veja modelo no [07. Guia de Implantação](file:///docs/07-guia-de-implantacao-e-operacao.md))
- **Frontend**: `frontend/.env` (`VITE_API_URL=http://localhost:3001`)

---

## 📜 Histórico de Atualizações

Consulte o arquivo [VERSION.md](file:///VERSION.md) para o registro completo de versões, melhorias e correções implementadas no GSVR.
