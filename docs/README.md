# 📚 Documentação Oficial do Sistema GSVR
### Sistema de Gestão de Serviço Voluntário Remunerado — 9º BPM / PMAL

Bem-vindo à documentação técnica e operacional do **GSVR**. Este repositório centraliza todas as especificações de arquitetura, modelagem de banco de dados, fluxos de segurança, catálogo de APIs e guias de implantação do sistema utilizado pelo **9º Batalhão de Polícia Militar de Alagoas (9º BPM/PMAL)**.

---

## 🗺️ Mapa da Documentação

A documentação está estruturada em 8 volumes modulares para facilitar a navegação por desenvolvedores, administradores de rede, operadores de planejamento e auditores:

| Volume | Documento | Descrição e Conteúdo |
| :--- | :--- | :--- |
| **00** | [Análise Técnica Completa do Sistema](file:///docs/ANALISE_TECNICA_COMPLETA_SISTEMA.md) | Relatório exaustivo de engenharia: levantamento de 90 APIs, 27 componentes, modelo de dados (25 tabelas, 5 triggers), segurança RBAC/MFA, infraestrutura e diagnóstico técnico priorizado. |
| **01** | [01. Visão Geral e Negócio](file:///docs/01-visao-geral.md) | Contexto operacional do 9º BPM, conceito do SVR, ciclos de 16 a 15, cotas de 8 serviços, regras de voluntariado e composição de guarnições. |
| **02** | [02. Arquitetura e Stack](file:///docs/02-arquitetura-e-stack.md) | Visão sistêmica, stack tecnológica (React 18 + Vite, Express 5 + Node.js 21, PostgreSQL 16, Docker Compose), diagramas de comunicação e fluxos de dados. |
| **03** | [03. Modelagem de Dados](file:///docs/03-modelo-de-dados.md) | DDL completo, diagrama Entidade-Relacionamento (ER), tabelas relacionais, integridade referencial, triggers de validação e views analíticas. |
| **04** | [04. Segurança e Autenticação](file:///docs/04-seguranca-e-autenticacao.md) | Autenticação primária por CPF (algoritmo da Receita Federal), 1º Acesso anti-sequestro de contas, bcrypt, RBAC granular, perfil SUPERUSER com 2FA TOTP, Helmet e auditoria imutável. |
| **05** | [05. Módulos e Funcionalidades](file:///docs/05-modulos-do-sistema.md) | Detalhamento tela a tela: Planejamento Drag-and-Drop (AdminDashboardV2), Inscrição de Voluntários, Ciclos, Metas, Conferência, Dashboards Financeiro/Analítico e Publicação Oficial. |
| **06** | [06. Catálogo de APIs REST](file:///docs/06-catalogo-de-apis.md) | Especificação detalhada de todos os endpoints REST: rotas de autenticação, usuários, perfil, efetivo, ciclos, escalas, relatórios, métricas e diagnóstico. |
| **07** | [07. Implantação e Operação](file:///docs/07-guia-de-implantacao-e-operacao.md) | Guia de instalação passo a passo (Docker vs Local Windows), variáveis de ambiente, migrações, CLI de provisionamento, rotinas de backup e solução de problemas. |
| **08** | [08. Manual do Usuário](file:///docs/08-manual-do-usuario.md) | Manual prático passo a passo para os 4 perfis: Policial Militar Voluntário, Operador P/3, Gestor Operacional/Financeiro e Administrador/Suporte. |

---

## ⚡ Guia Rápido de Acesso

- **Versão Atual do Sistema:** `v1.37.0` (consulte o [VERSION.md](file:///VERSION.md) para o histórico de revisões)
- **Portal Web Integrado de Documentação & Manual:** Disponível no menu superior da aplicação ou no arquivo [manual-e-documentacao.html](file:///frontend/public/manual-e-documentacao.html).
- **Portas Padrão:**
  - Aplicação Web (Frontend): [http://localhost:5173](http://localhost:5173)
  - API de Serviços (Backend): [http://localhost:3001](http://localhost:3001)
  - Gerenciador de Banco (pgAdmin 4): [http://localhost:5050](http://localhost:5050)
  - Gestão de Containers (Portainer): [http://localhost:9000](http://localhost:9000)

---

## 🏛️ Convenções e Diretrizes

- **Codificação:** UTF-8 nativo em todas as camadas (banco de dados, arquivos fonte e respostas HTTP).
- **Fuso Horário:** Horário Oficial de Brasília (`America/Maceio` / `UTC-3`).
- **Autenticação:** Baseada em JSON Web Tokens (JWT) com Access Token (15 minutos) e Refresh Token rotativo (7 dias).
- **Segurança de Dados:** Princípio do menor privilégio através de RBAC, sanitização estrita de CPFs e proteção contra força bruta.
