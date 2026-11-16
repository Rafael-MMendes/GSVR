# DIAGNÓSTICO, OTIMIZAÇÃO E EVOLUÇÃO DO SISTEMA GSVR
**Sistema de Gestão de Serviço Voluntário Remunerado — 9º BPM / PMAL**

> **Data do Diagnóstico:** 13 de Novembro de 2026  
> **Versão Base Avaliada:** `v1.40.0` (pós-modularização do backend, decomposição do `AdminDashboardV2`, migrações DDL estruturadas e suíte de testes unitários)  
> **Documento de Referência Anterior:** [ANALISE_TECNICA_COMPLETA_SISTEMA.md](file:///c:/Users/PMAL-DATEN/Desktop/projetos/GSVR/docs/ANALISE_TECNICA_COMPLETA_SISTEMA.md)  
> **Escopo:** Análise arquitetural, segurança, banco de dados, performance, UX/UI, tecnologias, plano estratégico em fases e propostas de evolução funcional (sem alterações em código ou banco nesta etapa).

---

## 1. RESUMO EXECUTIVO DO DIAGNÓSTICO

O **GSVR** evoluiu de forma expressiva desde a versão `v1.37.0`:
- O antigo monólito `backend/server.js` (~4.700 linhas) foi modularizado em **14 controllers**, **14 arquivos de rotas** e **4 middlewares** (`v1.39.0`), com **92 rotas auditadas** por testes automatizados (`backend/test_modular_routes.js`).
- O componente `AdminDashboardV2.jsx` (antes com 2.801 linhas) foi decomposto (`v1.40.0`) em subcomponentes coesos (`ScheduleSidebar.jsx`, `PatrolCard.jsx`, `VolunteerSelectionModal.jsx`, `MilitarDetailsModal.jsx`), acompanhado de tipagem progressiva TypeScript (`frontend/src/types/gsvr.types.ts`), suíte de testes unitários para `CycleEngine` e `PdfExtractor` (`18/18` aprovados), runner de migrações DDL (`backend/scripts/migrate.js`) e expurgo de 24 arquivos órfãos.

Contudo, a inspeção direta do código-fonte atual revela **lacunas críticas de segurança, infraestrutura e escalabilidade** que precisam ser endereçadas antes de expandir o sistema ou submetê-lo a auditoria externa:
1. **Exposição de rotas sem autenticação/autorização no backend:** diversas rotas de leitura, escrita, importação e administração (ex.: `GET /api/admin/migrate-fix`, `GET/PUT /api/usuarios/:id/permissoes`, `cicloRoutes.js`, `efetivoRoutes.js`, `servicoRoutes.js`, `scheduleRoutes.js`, `reportRoutes.js`, `financeiroRoutes.js`, `opmRoutes.js`) não possuem os middlewares `authenticate` e `authorize`.
2. **Containers de produção executando em modo `development`:** o `docker-compose.yml` roda `ft-backend` com `nodemon` (`npm run dev`) e `ft-frontend` com Vite Dev Server (`npm run dev -- --host 0.0.0.0`), além de manter fallback previsível para `JWT_SECRET` e credenciais padrão no `ft-pgadmin`.
3. **Monolitos remanescentes no frontend e ausência de camada de dados:** cinco telas ainda concentram entre 1.012 e 1.889 linhas (`AnalyticsDashboard.jsx`, `RequerimentosAdmin.jsx`, `MinhasEscalas.jsx`, `QuantitativoGastosFT.jsx`, `FinanceiroDashboard.jsx`), duplicando chamadas `axios` e lógica de exportação PDF/XLSX.
4. **Ausência de paginação server-side e cache:** endpoints como `GET /api/servicos` trafegam payloads acima de 1,2 MB (2.824+ registros) em uma única resposta JSON.

---

## 2. PONTOS FORTES QUE DEVEM SER PRESERVADOS

- **Domínio de Negócio Bem Modelado (Ciclos 16 a 15):** o `CycleEngine` resolve com precisão matemática a fragmentação de requerimentos entre dois ciclos operacionais, anos bissextos e viradas de ano, agora protegido por testes unitários.
- **Parser Resiliente de PDFs (`PdfExtractor` + `RequirementImporter`):** múltiplas estratégias em cascata para extração de dados de requerimentos SVR em PDF, preservando compatibilidade com formulários oficiais da PMAL.
- **Arquitetura Modular do Backend (`v1.39.0`):** separação clara entre `routes/`, `controllers/`, `middleware/`, `services/` e `utils/`, com suíte de paridade de 92 rotas.
- **Autenticação Moderna por CPF + 2FA TOTP:** fluxo de Primeiro Acesso sem senha padrão inicial, validação estrita de CPF, `bcrypt`, Refresh Token rotativo com hash SHA-256, bloqueio por força bruta e logs de auditoria (`audit_logs`).
- **Migrações Estruturadas (`v1.40.0`):** `backend/scripts/migrate.js` com tabela `schema_migrations` e verificação de checksum SHA-256.
- **Stack Enxuta e Adequada ao Time:** React 18 + Vite + Node.js/Express 5 + PostgreSQL 16 em Docker atende perfeitamente ao porte do 9º BPM (~400 militares), sem necessidade de reescrita ou adoção de microsserviços.

---

## 3. ANÁLISE E DIAGNÓSTICO POR DIMENSÃO

### 3.1. Arquitetura e Organização
- **Problemas comprovados no código:**
  - **Componentes frontend ainda monolíticos:** `AnalyticsDashboard.jsx` (1.889 linhas), `RequerimentosAdmin.jsx` (1.633 linhas), `MinhasEscalas.jsx` (1.563 linhas), `QuantitativoGastosFT.jsx` (1.413 linhas) e `FinanceiroDashboard.jsx` (1.012 linhas) concentram estado, chamadas HTTP, regras de negócio e renderização.
  - **Ausência de camada `services/` no frontend:** todos os componentes importam `axios` e `API_URL` diretamente, repetindo URLs, tratamento de erros e montagem de `params`.
  - **Controllers com SQL embutido (`backend/controllers/`):** `authController.js` (555 linhas), `servicoController.js` (522 linhas), `mySchedulesController.js` (447 linhas) e `efetivoController.js` (440 linhas) misturam regras HTTP (`req`/`res`), lógica de negócio e queries SQL brutas.
  - **DDL legado em `backend/db.js`:** o arquivo ainda possui 61.532 bytes (1.206 linhas) executando `CREATE TABLE` / `ALTER TABLE` no `setupDB()` na inicialização, coexistindo com `backend/migrations/`.
  - **Arquivo `ScaleOptimizationService.js` subutilizado:** existe em `backend/services/`, mas sem integração completa no fluxo principal da UI de planejamento.
- **Oportunidades de melhoria:**
  - Extrair serviços API tipados no frontend (`frontend/src/services/*.api.ts`) e hooks customizados (`useCiclos`, `useEfetivo`).
  - Consolidar `setupDB()` de `backend/db.js` em migração baseline única em `backend/migrations/`, deixando `db.js` exclusivamente para pool, helpers transacionais e healthcheck.
  - Decompor os 5 componentes frontend >1.000 linhas seguindo o mesmo padrão aplicado ao `AdminDashboardV2.jsx`.

### 3.2. Interface e Experiência do Usuário (UX/UI)
- **Problemas e oportunidades identificados:**
  - **Inconsistência visual:** coexistência de estilos inline extensos (ex.: `AdminDashboardV2.jsx` e subcomponentes), classes CSS globais (`App.css`/`index.css`) e modais customizados sem padronização única de tokens (botões, alertas `window.alert`/`window.confirm` nativos bloqueantes).
  - **Feedback de erro silencioso:** em `AdminDashboardV2.jsx` (`loadSchedule`), erros de API caíam silenciosamente em `catch` retornando lista vazia sem toast/alerta visível ao operador.
  - **Navegação e produtividade:** ausência de toasts não-bloqueantes, skeletons de carregamento padronizados, atalhos de teclado na montagem da escala e filtros persistidos na URL/sessão.
  - **Responsividade mobile:** embora `AdminDashboardV2` possua media queries até `480px`, telas densas como `AnalyticsDashboard`, `QuantitativoGastosFT` e `RequerimentosAdmin` possuem tabelas largas com rolagem horizontal difícil em smartphones (perfil voluntário acessando `MinhasEscalas` e `VolunteerForm`).
  - **Acessibilidade (a11y):** uso de `<div>` clicáveis sem `role="button"`, `tabIndex` ou `aria-label` (ex.: slots vazios no `PatrolCard.jsx`), e baixa padronização de foco visível para navegação por teclado.

### 3.3. Funcionalidades e Processos
- **Processos manuais e oportunidades:**
  - **Montagem manual de guarnições:** o operador P/3 monta cada viatura manualmente mesmo existindo `ScaleOptimizationService.js` no backend.
  - **Conferência de execução via planilha (`Importar FT`):** exige exportação/preenchimento manual de planilha para registrar `SERVICOS_EXECUTADOS`, sujeito a atrasos e erros de digitação.
  - **Comunicação de escala publicada:** após clicar em "Publicar Escala", não há notificação ativa nem registro de "Ciente" do policial escalado.
  - **Substituições/desistências de última hora:** feitas informalmente fora do sistema (WhatsApp/telefone) e depois ajustadas manualmente na tela.

### 3.4. Banco de Dados
- **Diagnóstico baseado em `db.js`, `migrations/` e controllers:**
  - **Consultas volumosas sem paginação:** `servicoController.getServicos` retorna todos os registros sem `LIMIT`/`OFFSET` quando filtros estão abertos (observado em produção: 2.824 linhas / 1,21 MB JSON).
  - **Subqueries correlacionadas:** `scheduleController.getSchedules` executa `(SELECT COUNT(*) FROM SERVICOS_EXECUTADOS ...)` linha a linha no `SELECT`, além de `LEFT JOIN LATERAL` por militar.
  - **Ausência de Constraints/Triggers documentadas via Migração:** regras críticas (como teto de 8 serviços no ciclo e unicidade de matrícula/CPF no `EFETIVO`) dependem majoritariamente de validação na aplicação ou DDL legado disperso em `db.js`.
  - **Índices adicionados recentemente (`002_baseline_integrity.sql`),** porém tabelas de histórico/auditoria (`audit_logs`, `SERVICOS_EXECUTADOS`) crescerão continuamente e precisarão de índice composto por `(id_militar, id_ciclo)` e política de arquivamento/retenção.

### 3.5. Desempenho e Escalabilidade
- **Gargalos comprovados:**
  - **Frontend servido via Vite Dev Server (`docker-compose.yml:84`):** em vez de bundle minificado com gzip/brotli e cache HTTP longo (`Cache-Control: immutable`) via Nginx (`frontend/Dockerfile.prod` já existe no projeto, mas não é usado no `docker-compose.yml`!).
  - **Bundle JS monolítico (~1,97 MB sem code splitting):** observado na saída do `vite build` (`assets/index-*.js 1,970.04 kB`), pois todas as telas (`AnalyticsDashboard`, `jspdf`, `html2canvas`, `xlsx`) são importadas estaticamente em `App.jsx` sem `React.lazy()`.
  - **Upload/Importação em lote síncrona:** importação de até 50 PDFs (`importVolunteersFiles`) bloqueia a requisição HTTP até processar todos os arquivos.
  - **Falta de cache para catálogos:** `/api/opms`, `/api/tipos-servico`, `/api/ciclos` e permissões RBAC (`getUserRoles`/`getUserPermissions` consultam o PostgreSQL a cada requisição autenticada com `authorize(...)`).

### 3.6. Segurança e Confiabilidade (PRIORIDADE CRÍTICA)
- **Vulnerabilidades comprovadas diretamente no código:**
  1. **Rotas sem autenticação (`authenticate`) e autorização (`authorize`):**
     - `backend/routes/adminRoutes.js:9` — `GET /api/admin/migrate-fix` totalmente aberto!
     - `backend/routes/userRoutes.js:21-22` — `GET /api/usuarios/:id/permissoes` e `PUT /api/usuarios/:id/permissoes` totalmente abertos! Permite leitura e alteração de permissões diretas de usuários sem token!
     - `backend/routes/efetivoRoutes.js` (todas as 8 rotas), `cicloRoutes.js` (12 de 13 rotas), `financeiroRoutes.js` (5 rotas), `opmRoutes.js` (4 rotas), `reportRoutes.js` (4 rotas), `scheduleRoutes.js` (3 rotas), `servicoRoutes.js` (8 rotas) e `volunteerRoutes.js` (4 de 5 rotas) operam sem `authenticate` no roteador!
  2. **Fallback inseguro de `JWT_SECRET` (`backend/middleware/auth.js:8`):**
     - `process.env.JWT_SECRET || 'ft_jwt_secret_dev_2026_change_in_prod'` — em produção, o sistema deve falhar na inicialização se `JWT_SECRET` não estiver definido, nunca usar chave fixa de fallback.
  3. **CORS irrestrito e CSP desativado (`backend/server.js:31, 47`):**
     - `app.use(cors())` aceita requisições de qualquer origem.
     - `contentSecurityPolicy: false` no Helmet.
  4. **Credenciais padrão no `pgAdmin` (`docker-compose.yml:24-25`):**
     - `admin@mil.br` / `admin` exposto na porta `5050`.
  5. **Ausência de backup automatizado de banco:**
     - O volume `pgdata` não possui rotina agendada de `pg_dump` nem replicação/exportação externa automatizada no `docker-compose.yml`.
  6. **Ausência de endpoint `/api/health` estruturado** para monitoramento de disponibilidade (`HEALTHCHECK` do Docker).

### 3.7. Tecnologias e Dependências
- **Avaliação da Stack Atual:**
  - `React 18.3.1`, `Vite 6.0.1`, `Express 5.2.1`, `PostgreSQL 16-alpine`, `pg 8.12.0`, `bcrypt 5.1.1`, `jsonwebtoken 9.0.2`, `helmet 8.0.0`, `axios 1.7.9`, `lucide-react 0.460.0`: stack **atualizada, estável e adequada**. Não há justificativa técnica para troca de framework (ex.: migrar para Next.js ou NestJS não traria benefício proporcional ao custo).
  - **Pontos de atenção em dependências:**
    - `pdf-parse 1.1.1` (pacote antigo, mantido estável, isolado atrás de `PdfExtractor.js` — baixo risco enquanto encapsulado).
    - `xlsx 0.18.5` (versão comunitária antiga com alertas históricos de prototype pollution para planilhas não confiáveis; considerar migrar futuramente para `exceljs` ou restringir estritamente a usuários autenticados com validação de tamanho/MIME).
    - `typescript` ainda não instalado em `devDependencies` do `frontend/package.json` para rodar `tsc --noEmit` no pipeline de CI/deploy.

---

## 4. PROPOSTAS DE NOVAS FUNCIONALIDADES (EVOLUÇÃO DO GSVR)

### 4.1. Motor de Sugestão Automática de Escala ("Auto-Escala Inteligente")
- **Objetivo:** gerar automaticamente uma proposta de escalas do dia/ciclo com 1 clique no `AdminDashboardV2`.
- **Problema solucionado:** elimina horas de montagem manual pela P/3 e reduz viés na distribuição de cotas entre voluntários.
- **Funcionamento na prática:** o operador clica em **"Sugerir Guarnições"** no `ScheduleSidebar`. O backend aciona `ScaleOptimizationService` considerando: disponibilidade no dia/turno, habilitação de motorista, hierarquia (Comandante > Motorista > Patrulheiro), menor número de serviços no ciclo (equidade), e trava de teto legal (8 serviços). O operador revisa no Drag-and-Drop e salva.
- **Benefícios:** redução estimada de 70–80% no tempo de planejamento da P/3 e distribuição justa de diárias.
- **Complexidade:** Média.
- **Impactos Arquitetura/BD:** novo endpoint `POST /api/schedules/suggest`; reutiliza tabelas `REQUERIMENTOS`, `DISPONIBILIDADE_REQUERIMENTO`, `ESCALA_PLANEJAMENTO`, `SERVICOS_EXECUTADOS` e `METAS_ALOCACAO`.
- **Dependências:** `ScaleOptimizationService.js` já existente (necessita ajustes de contrato e testes unitários).

### 4.2. Confirmação de Ciência da Escala e Central de Notificações
- **Objetivo:** notificar o militar escalado e registrar confirmação digital de ciência ("Ciente").
- **Problema solucionado:** falhas de comunicação sobre alterações de escala e ausência de comprovação de ciência formal.
- **Funcionamento na prática:** ao publicar a escala, `MinhasEscalas` exibe destaque com botão **"Confirmar Ciência"** (registrando timestamp + IP). Opcionalmente dispara webhook para n8n/WhatsApp já presente na infraestrutura (`argos-n8n` visível no servidor).
- **Benefícios:** rastreabilidade jurídica/disciplinar e redução de faltas por desconhecimento.
- **Complexidade:** Média.
- **Impactos Arquitetura/BD:** nova coluna `ciente_em TIMESTAMP`, `ciente_ip VARCHAR(45)` em `ESCALA_PLANEJAMENTO` + integração opcional via webhook.
- **Dependências:** n8n (já disponível no host) ou serviço SMTP institucional.

### 4.3. Fluxo Digital de Permuta / Substituição de Serviço
- **Objetivo:** permitir que um militar escalado solicite troca ou substituição por outro voluntário apto, com aprovação da P/3.
- **Problema solucionado:** trocas informais em grupos de mensagens que geram divergência entre a escala publicada e quem comparece ao serviço.
- **Funcionamento na prática:** no painel `MinhasEscalas`, o militar solicita substituição indicando motivo e/ou militar substituto disponível; o substituto aceita e a P/3 aprova com 1 clique, atualizando `ESCALA_PLANEJAMENTO` e gravando em `audit_logs`.
- **Benefícios:** fim das discrepâncias entre planejado e executado e auditoria completa de substituições.
- **Complexidade:** Média-Alta.
- **Impactos Arquitetura/BD:** nova tabela `SOLICITACOES_PERMUTA` + endpoints REST dedicados + card de pendências na P/3.
- **Dependências:** rotas autenticadas de usuário e RBAC.

### 4.4. Check-in / Conferência Digital pelo Comandante ou Oficial de Dia
- **Objetivo:** registrar presença/falta da guarnição diretamente no sistema no início/término do turno.
- **Problema solucionado:** dependência exclusiva de importação posterior de planilhas (`Importar FT`) para alimentar `SERVICOS_EXECUTADOS` e o módulo financeiro.
- **Funcionamento na prática:** tela simplificada mobile-first para o Oficial de Dia listar as guarnições do dia e marcar `Presente` / `Ausente` / `Justificado`, gerando ou conciliando automaticamente `SERVICOS_EXECUTADOS`.
- **Benefícios:** fechamento financeiro em tempo real e eliminação de retrabalho de digitação.
- **Complexidade:** Média.
- **Impactos Arquitetura/BD:** nova permissão RBAC (`conferencia:executar`) e reutilização da tabela ternária `ESCALA_EFETIVO_SERVICO`.
- **Dependências:** proteção RBAC consolidada nas rotas de serviço.

### 4.5. Painel Executivo de Equidade, Fadiga e Previsão Orçamentária
- **Objetivo:** entregar indicadores gerenciais ao Comando do 9º BPM sobre concentração de diárias, taxa de desistência por militar e projeção de estouro orçamentário no ciclo.
- **Problema solucionado:** falta de visibilidade preditiva sobre militares próximos do teto de 8 serviços, alto índice de desistências e desvios entre orçamento previsto e executado.
- **Funcionamento na prática:** aba gerencial no `FinanceiroDashboard` / `AnalyticsDashboard` com ranking de equidade (Gini/desvio de cotas), taxa de absenteísmo e alerta automático quando o ritmo diário projeta ultrapassar o teto do ciclo.
- **Benefícios:** governança transparente das cotas do SVR e prevenção de glosas orçamentárias.
- **Complexidade:** Baixa-Média.
- **Impactos Arquitetura/BD:** 2 endpoints agregadores SQL otimizados (sem novas tabelas).
- **Dependências:** nenhuma nova biblioteca (pode usar SVG/CSS leve ou componentes já existentes).

---

## 5. CLASSIFICAÇÃO DAS MELHORIAS E ANÁLISE DE VIABILIDADE

| ID | Melhoria Proposta | Prioridade | Natureza | Benefício Técnico / Operacional | Complexidade | Tempo Estimado | Riscos & Impacto no BD |
|----|-------------------|------------|----------|----------------------------------|--------------|----------------|------------------------|
| **M01** | Proteger rotas sem `authenticate`/`authorize` (`adminRoutes`, `userRoutes`, `efetivo`, `ciclos`, `servicos`, `schedules`, `reports`, `financeiro`, `opms`, `volunteers`) | **Crítica** | Segurança | Fecha acesso anônimo a dados pessoais (CPF, matrículas) e alterações administrativas | Baixa | 4–8h | Baixo risco; exige garantir que todo fluxo do frontend envie `Bearer token` (já configurado via `axiosSetup.js`). Sem alteração de BD. |
| **M02** | Remover fallback hardcoded de `JWT_SECRET`, restringir `CORS` por allowlist e fortalecer `pgAdmin` | **Crítica** | Segurança | Impede forjamento de JWT e acesso cross-origin indevido | Baixa | 2–4h | Risco de bloquear origem não listada no CORS se `.env` estiver incompleto; sem alteração de BD. |
| **M03** | Configurar `docker-compose.prod.yml` com Nginx (`Dockerfile.prod`) no frontend e `NODE_ENV=production` no backend (sem `nodemon`) | **Crítica** | Otimização / Infra | Reduz tempo de carga, ativa gzip/cache estático e elimina instabilidade de dev server em produção | Média | 4–6h | Risco baixo se validado em porta paralela antes da virada; sem alteração de BD. |
| **M04** | Implantar rotina automatizada de backup `pg_dump` com retenção e `/api/health` | **Crítica** | Segurança / Confiabilidade | Elimina ponto único de falha e perda de dados em caso de falha de disco/container | Baixa | 3–4h | Zero impacto na aplicação; script cron + volume de backup. |
| **M05** | Paginação server-side e filtros obrigatórios em `GET /api/servicos`, `efetivo` e relatórios | **Alta** | Otimização de Desempenho | Reduz payloads de >1,2 MB para ~30 KB e evita travamentos no navegador | Média | 8–12h | Médio risco de compatibilidade se UI esperar array completo; mitigado com parâmetro opcional `?page=`/`?limit=`. Índice adicional no BD. |
| **M06** | Code Splitting com `React.lazy()` + `Suspense` em `App.jsx` | **Alta** | Otimização de Desempenho | Reduz bundle inicial (~1,97 MB) quebrando módulos pesados sob demanda | Baixa | 3–5h | Baixo risco; zero impacto em BD. |
| **M07** | Cache em memória (TTL curto) para `getUserRoles`/`getUserPermissions`, `OPM`, `TIPOS_SERVICO` e `FERIADOS` | **Alta** | Otimização de Desempenho | Reduz carga repetitiva de queries RBAC e catálogos no PostgreSQL | Baixa | 4–6h | Exige invalidação de cache ao atualizar papéis/permissões/feriados; zero alteração de BD. |
| **M08** | Eliminar `setupDB()` legado de `backend/db.js` consolidando DDL em `backend/migrations/` | **Alta** | Refatoração | Fonte única de verdade para schema do banco via `migrate.js` | Média | 6–10h | Exige validação rigorosa com `baseline` em produção para não reaplicar DDL antigo. |
| **M09** | Decompor os 5 componentes frontend >1.000 linhas + criar `frontend/src/services/*.api.ts` | **Média** | Refatoração | Reduz acoplamento, facilita manutenção e habilita reuso de lógica HTTP | Média-Alta | 16–24h | Baixo risco funcional se feito componente por componente com `vite build`; zero impacto no BD. |
| **M10** | Substituir `alert`/`confirm` nativos por sistema unificado de Toast e Modal de Confirmação + feedback de erro em `catch` | **Média** | Usabilidade | Melhora UX, evita bloqueio da thread da aba e elimina erros silenciosos | Baixa-Média | 6–8h | Zero impacto em API/BD. |
| **M11** | Instalar `typescript` no frontend/CI (`npm run typecheck`) e expandir tipagem para `services/` e novos componentes | **Média** | Modernização Tecnológica | Previne bugs de contrato API ↔ UI em tempo de build | Baixa | 4–6h | Zero impacto em runtime/BD. |
| **M12** | Migrar `xlsx` para alternativa mantida (`exceljs`) ou isolar parser com validação estrita | **Média** | Segurança / Dependências | Reduz exposição a vulnerabilidades conhecidas em parsers legados de planilhas | Média | 6–8h | Requer testes de regressão nos arquivos `.xlsx` reais do 9º BPM. |
| **M13** | Integrar `ScaleOptimizationService` à UI ("Sugerir Escala Automática") | **Alta** | Nova Funcionalidade | Reduz trabalho operacional da P/3 em ~70% na montagem diária | Média | 10–14h | Zero alteração de BD; requer revisão humana antes de salvar. |
| **M14** | Confirmação de Ciência da Escala + Notificações (n8n/WhatsApp/E-mail) | **Média** | Nova Funcionalidade | Rastreabilidade de ciência do militar e redução de faltas | Média | 8–12h | Requer 2 novas colunas em `ESCALA_PLANEJAMENTO` (via migração `003`). |
| **M15** | Fluxo Digital de Permuta / Substituição de Serviço | **Média** | Nova Funcionalidade | Elimina trocas informais e mantém escala oficial fidedigna | Média-Alta | 14–20h | Requer nova tabela `SOLICITACOES_PERMUTA` e aprovação P/3. |
| **M16** | Check-in / Conferência Digital pelo Oficial de Dia | **Média** | Nova Funcionalidade | Alimenta execução e financeiro em tempo real sem depender só de planilhas | Média | 12–16h | Usa tabela existente `ESCALA_EFETIVO_SERVICO` + nova permissão RBAC. |
| **M17** | Painel de Equidade, Fadiga e Previsão Orçamentária | **Baixa** | Nova Funcionalidade | Visibilidade gerencial para o Comando sobre cotas e orçamento | Baixa-Média | 8–10h | Apenas queries agregadas; sem alteração de BD. |
| **M18** | Ajustes de acessibilidade (a11y: `aria-label`, navegação por teclado) e responsividade mobile das tabelas | **Baixa** | Usabilidade | Inclusão e melhor uso em smartphones pelos voluntários | Baixa-Média | 6–10h | Zero impacto em API/BD. |

---

## 6. PLANO ESTRATÉGICO DE EVOLUÇÃO (POR FASES)

### Fase 1 — Correções Críticas, Segurança e Infraestrutura de Produção (Semana 1)
- **Objetivo:** blindar o sistema em produção antes de qualquer nova feature.
- **Escopo:** **M01** (autenticação/autorização em 100% das rotas privadas), **M02** (`JWT_SECRET` obrigatório + CORS allowlist + senha forte no `pgAdmin`), **M03** (`docker-compose` de produção usando `Dockerfile.prod` Nginx + Node em `NODE_ENV=production`), **M04** (backup diário automatizado `pg_dump` + `/api/health`).
- **Critério de Saída:** nenhuma rota mutável ou com dados pessoais acessível sem JWT válido; testes de regressão de rotas atualizados cobrindo `401`/`403` em todos os módulos.

### Fase 2 — Otimização, Banco de Dados e Refatoração Estrutural (Semanas 2–3)
- **Objetivo:** eliminar gargalos de rede/BD e consolidar a manutenibilidade do código.
- **Escopo:** **M05** (paginação server-side), **M06** (`React.lazy` code splitting), **M07** (cache TTL de RBAC/catálogos), **M08** (mover DDL residual de `db.js` para `migrations/`), **M09** (decompor `AnalyticsDashboard`, `RequerimentosAdmin`, `MinhasEscalas`, `QuantitativoGastosFT`, `FinanceiroDashboard` + camada `services/*.api.ts`), **M11** (`typecheck` automatizado).
- **Critério de Saída:** bundle inicial < 500 KB por chunk, payloads de listagem paginados, 0 componentes > 600 linhas e pipeline de testes unitários + `tsc --noEmit` + `vite build` verde.

### Fase 3 — Experiência do Usuário (UX/UI) e Confiabilidade Operacional (Semana 4)
- **Objetivo:** tornar a operação diária mais ágil, previsível e acessível em desktop e mobile.
- **Escopo:** **M10** (Toasts, modais de confirmação acessíveis e tratamento visível de erros), **M12** (revisão/substituição segura do parser `xlsx`), **M18** (responsividade de tabelas em telas de voluntários e acessibilidade básica).

### Fase 4 — Evolução Funcional e Automação Operacional (Semanas 5–7)
- **Objetivo:** multiplicar produtividade da P/3, Oficial de Dia e voluntários.
- **Escopo:** **M13** (Auto-Escala Inteligente com `ScaleOptimizationService`), **M14** (Ciência da Escala + Notificações), **M16** (Conferência Digital pelo Oficial de Dia), **M15** (Fluxo de Permutas) e **M17** (Painel de Equidade e Previsão Orçamentária).

### Fase 5 — Escalabilidade e Observabilidade Contínua (Contínuo / Pós-Fase 4)
- **Escopo:** processamento assíncrono em fila leve (ex.: worker/job interno para lotes de 50+ PDFs), métricas estruturadas de latência/erro por endpoint e retenção/arquivamento periódico de `audit_logs` e ciclos antigos.

---

## 7. ARQUIVOS, MÓDULOS E COMPONENTES AFETADOS

| Área | Arquivos / Módulos Impactados |
|------|-------------------------------|
| **Segurança & Rotas Backend** | `backend/routes/adminRoutes.js`, `userRoutes.js`, `efetivoRoutes.js`, `cicloRoutes.js`, `financeiroRoutes.js`, `opmRoutes.js`, `reportRoutes.js`, `scheduleRoutes.js`, `servicoRoutes.js`, `volunteerRoutes.js`, `backend/middleware/auth.js`, `backend/server.js`, `backend/test_modular_routes.js` |
| **Banco & Migrações** | `backend/db.js`, `backend/migrations/*`, `backend/scripts/migrate.js`, `backend/controllers/servicoController.js`, `scheduleController.js` |
| **Infraestrutura Docker** | `docker-compose.yml`, `frontend/Dockerfile.prod`, `backend/Dockerfile`, novo script de backup `pg_dump` |
| **Frontend — Arquitetura & Perf.** | `frontend/src/App.jsx`, nova pasta `frontend/src/services/`, `frontend/src/components/AnalyticsDashboard.jsx`, `RequerimentosAdmin.jsx`, `MinhasEscalas.jsx`, `QuantitativoGastosFT.jsx`, `FinanceiroDashboard.jsx`, `frontend/package.json` |
| **Novas Funcionalidades** | `backend/services/ScaleOptimizationService.js`, `frontend/src/components/AdminDashboardV2.jsx`, `MinhasEscalas.jsx`, `ConferenciaOperacional.jsx`, `AnalyticsDashboard.jsx` |

---

## 8. RESPOSTAS OBJETIVAS ÀS QUESTÕES-CHAVE DO DIAGNÓSTICO

1. **O que precisa ser corrigido?**  
   A ausência de `authenticate`/`authorize` na maior parte das rotas de negócio (`adminRoutes`, `userRoutes`, `efetivo`, `ciclos`, `servicos`, `schedules`, `reports`, `financeiro`, `opms`, `volunteers`), o fallback hardcoded de `JWT_SECRET`, o CORS totalmente aberto (`*`), as credenciais padrão do `pgAdmin` e o uso de `NODE_ENV=development` (`nodemon` + Vite Dev Server) em produção.
2. **O que pode ser melhorado?**  
   A organização modular dos 5 componentes frontend >1.000 linhas, a centralização de chamadas HTTP em `frontend/src/services/`, a consolidação do DDL de `db.js` em `migrations/` e a substituição de `alert`/`confirm` nativos por feedback não-bloqueante.
3. **O que pode ser otimizado?**  
   O tamanho do bundle inicial (via `React.lazy`), o volume de payload em listagens (via paginação server-side), o uso de Nginx estático com compressão para o frontend e o cache de permissões RBAC/tabelas auxiliares.
4. **O que pode ser modernizado?**  
   A execução do pipeline com `tsc --noEmit` (TypeScript progressivo já iniciado), build de produção estático no Docker, healthchecks automáticos e processamento assíncrono para importações pesadas de PDF.
5. **Quais novas funcionalidades agregariam valor?**  
   Auto-Escala Inteligente (usando `ScaleOptimizationService`), Confirmação de Ciência da Escala com notificações, Fluxo Digital de Permutas, Conferência Digital pelo Oficial de Dia e Painel de Equidade/Fadiga/Previsão Orçamentária.
6. **O que deve ser priorizado?**  
   **Imediatamente a Fase 1 (Segurança + Infraestrutura de Produção + Backup Automatizado)** — são correções rápidas (baixo esforço) que eliminam os maiores riscos de segurança e disponibilidade do sistema.
7. **Qual a melhor estratégia para evoluir sem comprometer o funcionamento?**  
   Executar entregas incrementais por fase (preservando a stack atual sem reescritas), manter 100% de compatibilidade com os dados e contratos existentes, expandir a suíte `node --test` + `test_modular_routes.js` a cada alteração e validar sempre o build completo antes do deploy via `deploy_ssh.py`.

---

> **Próximo passo:** Este documento é exclusivamente analítico e estratégico. Nenhuma alteração foi realizada no código-fonte ou no banco de dados nesta etapa. Aguardando autorização expressa para iniciar a execução da **Fase 1**.

