## v1.13.2 — 2026-04-10
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **Redesign da Gestão de Efetivo**: Interface administrativa do efetivo totalmente modernizada com novo cabeçalho, badges de status em estilo "pill" e tipografia otimizada.
- **Importação Integrada (Modal)**: O módulo de importação via Excel foi movido de um menu separado para dentro da tela de Gestão de Efetivo, acessível via botão modal para um fluxo de trabalho mais ágil.
- **Importação Ativa Obrigatória**: Removida a verificação de status na importação via Excel, garantindo agora que 100% dos militares importados sejam marcados como "Ativo" por padrão, independentemente do conteúdo da planilha.
- **Limpeza de Navegação**: Removido item redundante do menu de configurações, simplificando a arquitetura de informação do sistema.

---

## v1.13.1 — 2026-04-10
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **Correção da Importação de Nº de Ordem**: Ajustada a lógica de importação do Efetivo via Excel para capturar e salvar corretamente a coluna "Nº de Ordem" (mapeada a partir de headers como "NORDEM", "ORDEM", "NRORDEM").
- **UI de Cadastro Otimizada**: Atualizada a tela de Gestão de Efetivo para exibir a coluna "Nº Ordem" na tabela e permitir a edição individual deste campo no formulário de cadastro, separando-o visualmente da Matrícula de login.
- **Normalização de Cabeçalhos**: Adicionadas novas variantes de nomes de colunas no processador de Excel para garantir compatibilidade com diferentes modelos de planilhas de efetivo.

---

## v1.13.0 — 2026-04-09
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **Auto-Registro de Militares no Importador**: Implementada funcionalidade que cadastra automaticamente militares novos no banco de dados durante a importação de requerimentos em PDF (caso possuam CPF válido no documento). Isso elimina falhas de identificação por falta de cadastro prévio no Efetivo.
- **Sincronização Automática de Usuários**: Militares auto-cadastrados agora recebem automaticamente uma conta de acesso ao sistema com senha padrão (CPF), permitindo login imediato.
- **Refinamento do OCR de Nomes**: Aprimorada a extração de nomes em PDFs da PMAL, com limpeza agressiva de "lixo" vindo de cabeçalhos institucionais (ex: "POLÍCIA MILITAR", "COMANDO").
- **Busca Ultra-Robusta**: O motor de busca de militares foi expandido para consultar as colunas `Matrícula`, `Nº de Ordem` e `RGPM` simultaneamente, com suporte a `TRIM` e tratamento de variantes de zeros à esquerda.
- **Estabilização da UI de Importação**: 
  - Corrigida a cor do botão "Iniciar Importação" para Verde Militar (`#166534`) com alta visualizacão.
  - Otimizada a lógica do botão para garantir que ele seja liberado automaticamente assim que os arquivos são carregados para o Ciclo Ativo.

---

## v1.12.17 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Ajuste do Planejamento de Escala**: Reorganizado o dashboard administrativo para manter o painel lateral `Planejamento` e remover menus duplicados do topo.
- **Guarnições Mais Legíveis**: Os cards das guarnições agora ocupam mais espaço na grade e exibem os componentes em linhas verticais para melhorar a leitura dos nomes.
- **Padrão de Nome Atualizado**: O nome padrão das guarnições foi normalizado para `FORÇA TAREFA`, com compatibilidade para dados antigos carregados do backend.
- **Ações no Sidebar**: Os botões `Salvar`, `Nova Guarnição` e `Imprimir` foram movidos para o menu lateral direito.

---

## v1.12.16 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Correção de Contagem de Serviços no Planejamento**: O campo "Militares Disponíveis" no AdminDashboard agora exibe a contagem correta de serviços tirados pelo militar no ciclo. A query foi alterada de `ESCALA_PLANEJAMENTO` para `SERVICOS_EXECUTADOS`, garantindo que a contagem reflita os serviços efetivamente executados/importados.

---

## v1.12.15 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Integração Planejamento ↔ Analítico**: O módulo "Analítico FT" agora lê dados da tabela `SERVICOS_EXECUTADOS` (dados reais de execução) em vez da tabela antiga `schedules` (planejamento).
- **Filtro por Ciclo no Analítico**: Adicionado seletor de ciclo no AnalyticsDashboard para filtrar serviços por período.
- **Correção Verb no Financeiro**: Corrigida a rota `/api/financeiro/resumo` para buscar corretamente o `valor_total_previsto` do ciclo selecionado. Implementada verificação mais robusta do tipo de dados (number vs string).
- **Rota GET ciclos/:id**: Adicionada nova rota para buscar ciclo específico por ID.
- **Ajuste na View vw_detalhes_ciclos**: A view agora retorna o campo `valor_total_previsto` corretamente na listagem de ciclos.

---

## v1.12.14 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Correção de Fuso Horário na Importação FT**: Implementada solução definitiva para leitura de datas do Excel. O código agora usa métodos UTC (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`) para extrair os valores reais independentemente do fuso horário do servidor.
- **Blindagem de Datas no Backend**: Adicionada função helper `formatDateToISO()` no `server.js` para formatar datas de forma segura em todas as rotas de ciclos (POST, PUT) e criação automática.
- **Rota de Limpeza**: Adicionada nova rota `DELETE /api/servicos/ciclo/:cicloId` para limpar serviços de um ciclo específico durante testes de importação.
- **Correção de Fuso no Frontend**: Implementada função `formatDateDisplay()` em todos os componentes React para exibir datas vindas do PostgreSQL corretamente. Aplicada em:
  - `CicloManager.jsx` - Cards de ciclos e modal de edição
  - `ServicosExecutadosManager.jsx` - Listagem de serviços
  - `VolunteerForm.jsx` - Vigência do ciclo
  - `RelatorioOperacional.jsx` - Datas de escalas e execuções
- **Ajuste na Exibição de Datas**: Substituído `new Date().toLocaleDateString()` por parsing manual de strings YYYY-MM-DD, evitando que o JavaScript interprete datas UTC de forma incorreta no fuso de Brasília (UTC-3).

---

## v1.12.13 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Suporte a Sinônimos (FT)**: Adicionado suporte a múltiplos nomes de colunas (ex: `Posto/Grad`, `Unidade`, `Nome de Guerra`) para facilitar a importação de diferentes formatos de planilhas.
- **Robustez na Importação FT**: Implementada limpeza profunda de caracteres (`deepCleanText`) para ignorar bordas de tabelas ASCII (ex: `+--`, `|`) e decodificar entidades HTML. Aprimorado o algoritmo de detecção de cabeçalhos para localizar a tabela real em planilhas com cabeçalhos decorados.
- **Estabilização da Importação FT**: Corrigida a leitura de CPF na planilha de serviços executados, ignorando prefixos como "CPF:" e garantindo a padronização para 11 dígitos.
- **Correção Crítica na Importação de Efetivo**: Resolvido o erro `motorista is not defined` que interrompia a leitura da planilha Excel.
- **Mapeamento de Postos Dinâmico**: Aprimorada a detecção de colunas de Posto/Graduação e a lógica de atualização (UPSERT) para garantir que promoções de patente sejam refletidas no sistema.
- **Padronização de CPF Geral**: Implementado preenchimento automático (*padding*) com zeros à esquerda em todo o sistema (entrada manual, edição e importação).
- **Normalização de Siglas**: Garantido o uso exclusivo de siglas militares oficiais (ex: `SD PM`, `TC PM`) em todos os módulos.

---

## v1.12.12 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Restauração de Rotas Críticas**: Recuperadas as rotas `/api/schedules` (GET/POST) que foram acidentalmente removidas, restabelecendo a funcionalidade de salvar e carregar o planejamento de guarnições.
- **Correção da Visibilidade de Voluntários**: Resolvido o bug onde militares com requerimento não apareciam no menu "Compor Guarnições". Implementada normalização de IDs e flexibilização na busca por turnos (case-insensitive).
- **Estabilização Estrutural**: Refatorada a estrutura do `server.js` para remover aninhamentos redundantes e garantir o fechamento correto de todos os blocos de rota.

---

## v1.12.11 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Resolução de Erro de Sintaxe**: Corrigido erro crítico no `server.js` (`Unexpected end of input`) causado por aninhamento acidental de rotas e chaves não fechadas.
- **Padronização de Telefones**: Implementada formatação automática para o padrão `(DDD)xxxxx-xxxx` durante a importação do efetivo.
- **Inteligência na Importação de PDF**: Refinada a extração de Posto/Graduação dos requerimentos em PDF, garantindo que o banco de dados seja atualizado com a graduação correta do militar.
- **Melhoria no Efetivo Import**: Otimizado o mapeamento de colunas Excel para capturar melhor os campos de matrícula e graduação, evitando o placeholder genérico "Militar".

---

## v1.12.10 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Correção de Crash (Tela Branca)**: Resolvido erro crítico no Planejamento de Escala que ocorria ao remover militares de guarnições. O erro era causado pela tentativa de acessar a disponibilidade de "nomes antigos" ou membros já escalados que não possuíam dados de turno carregados.
- **Robustez no Drag and Drop**: Implementadas verificações de segurança no sistema de movimentação de militares para evitar falhas de índice e garantir compatibilidade entre diferentes formatos de IDs (legado vs. novo).
- **Tratamento de Dados Nulos**: O dashboard agora lida graciosamente com militares que não possuem informações de disponibilidade no sistema, permitindo sua movimentação sem travar a interface.

---

## v1.12.9 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Inteligência na Importação de PDF**: O sistema agora extrai automaticamente o Posto/Graduação diretamente do texto do requerimento em PDF.
- **Sincronização de Efetivo**: Durante a importação de requerimentos, o cadastro do militar (Efetivo) é atualizado automaticamente com o posto identificado no PDF, eliminando o valor genérico "Militar".
- **Busca Flexível no Importador**: O importador de PDF agora ignora pontos e traços na matrícula ao associar o requerimento ao militar no banco de dados.
- **Ajuste no Importador de Excel**: Alterado o valor padrão de postos não identificados de "Militar" para "SD PM" para manter a consistência do efetivo.

---

## v1.12.8 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Correção de Preenchimento**: Corrigido o erro que impedia a associação automática do Posto/Graduação nos requerimentos devido a divergência de nomenclaturas (siglas vs. nomes extensos).
- **Busca Flexível**: O sistema de lookup agora ignora formatações (pontos e traços) na matrícula, facilitando a busca do militar idependente de como os dados foram inseridos originalmente.
- **Padronização de Siglas**: Unificadas as siglas de Postos/Graduações em todo o sistema (SD PM, CB PM, etc.).

---

## v1.12.7 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Associação de Postos**: Implementada busca automática de Posto/Graduação e Nome ao digitar o Nº de Ordem na Gestão de Requerimentos.
- **Padronização de Telefones**: Implementada máscara de input `(XX) XXXXX-XXXX` nos módulos de Requerimentos, Efetivo e Cadastro Público.
- **Utilitário de Formatação**: Criado sistema centralizado de máscaras para garantir consistência visual em todo o sistema.
- **Nova API**: Adicionado endpoint de lookup para militares via matrícula.

---

## v1.12.6 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Expansão de Grade**: Aumentado o número padrão de guarnições de 6 para 8.
- **Gestão Dinâmica**: Adicionado botão para criar novas guarnições sob demanda (Guarnição 9, 10, etc.).
- **Exclusão de Grupos**: Implementado botão para remover guarnições desnecessárias, com retorno automático de militares alocados para a lista de disponíveis.
- **Sincronização Backend**: Ajustado o fallback do servidor para garantir consistência com a nova grade de 8 grupos.
- **Hotfix de UI**: Corrigido erro de referência (`handlePrint`) que causava tela branca ao carregar o dashboard após a última atualização.

---

## v1.12.5 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Correção Crítica**: Resolvido erro de "coluna inexistente" que impedia a visualização dos requerimentos no dashboard.
- **Persistência de Atributos**: Implementada a gravação do status de motorista na tabela `EFETIVO` através de formulários e importação de PDF.
- **Migração de Dados**: Adicionada migração automática para compatibilidade da tabela de militares com as novas funcionalidades.

---

## v1.12.4 — 2026-04-08
**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Consistência do Grade de Planejamento**: Corrigido o problema onde guarnições vazias desapareciam após o salvamento. Agora o sistema garante a exibição das 6 guarnições padrão independentemente do número de militares escalados.
- **Contador de Serviços (0/8)**: Adicionado um contador visual no card de cada militar informando quantos serviços ele já possui no ciclo atual.
- **Destaque de Limite de Carga Horária**: Implementado alerta visual (cor vermelha e ícone de aviso) para militares que atingiram o limite de 8 serviços no ciclo.
- **Persistência Refinada**: O backend agora mantém as configurações de turno e duração das guarnições mesmo quando elas estão vazias.

---

**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Restauração do Planejamento de Escala**: Implementados os endpoints `GET` e `POST /api/schedules` que estavam ausentes, permitindo a persistência das guarnições no banco de dados.
- **Integração com ESCALA_PLANEJAMENTO**: O backend agora traduz corretamente o estado do frontend (lista de guarnições) para registros normalizados no banco de dados, incluindo suporte a carga horária (6h/8h) e funções (Comandante, Motorista, Patrulheiro).
- **Robustez na Filtragem de Disponibilidade**: Ajustada a lógica no `AdminDashboard.jsx` para lidar consistentemente com diferentes formatos de dia (ex: `"1"`, `1`, `"01"`), garantindo que todos os voluntários aptos apareçam na lista de escalação.
- **Log de Depuração**: Adicionada telemetria básica no console do frontend para monitorar o carregamento de voluntários e escalas.

---

**Autor:** Rafael Monteiro
**Email:** rafael.monteiro@example.com

### Mudanças:
- **Correção Definitiva no Parser de PDF**: Resolvido bug crítico onde chamadas de `.trim()` nas linhas de disponibilidade causavam o deslocamento dos marcadores 'X' para dias incorretos quando o mês iniciava com dias vazios.
- **Preservação de Alinhamento Posicional**: O sistema agora preserva rigorosamente todos os espaços extraídos do PDF, garantindo que a posição de cada caractere mapeie com precisão o dia do mês correspondente (ex: caractere na posição 4 sempre corresponderá ao dia 04).
- **Tratamento de Strings Vazias**: Melhorada a robustez da função `processMarksLine` para lidar com linhas inconsistentes sem perder a referência posicional.

---

## v1.12.0 — 2026-04-07
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **Integração Completa BD ↔ Frontend**: Análise profunda e integração das 7 tabelas do banco de dados PostgreSQL com o frontend React, eliminando todos os GAPs identificados.
- **Backend — Reescrita Completa do server.js**: Corrigidos todos os placeholders SQL `?` (SQLite) para `$n` (PostgreSQL) em todas as rotas (login, volunteers POST/DELETE, efetivo, ciclos, OPM). Adicionadas rotas `PUT` e `DELETE` para OPM e CICLOS que estavam completamente ausentes.
- **Novo Módulo: SERVICOS_EXECUTADOS**: Implementação completa com 4 endpoints REST (`GET`, `POST`, `PUT`, `DELETE`). O frontend recebeu o novo componente `ServicosExecutadosManager.jsx` com listagem filtrada, cards de resumo e formulário de registro de execução de serviços.
- **Novo Módulo: Gestão de Usuários**: Implementado `UserManager.jsx` com listagem de todos os usuários do sistema divididos por nível de acesso (admin/regular), ações de promoção/rebaixamento de administrador e reset de senha para o CPF padrão.
- **Correção de Bug no Import de Efetivo**: Corrigido mapeamento de colunas para suportar cabeçalhos como `P/G`, `NOME GUERRA` e `Nº ORDEM`. Implementado fallback automático para o primeiro nome quando o nome de guerra não for informado na planilha, garantindo consistência nos dados importados.
- **Navbar Expandida**: Adicionados os novos módulos "Serviços Executados" e "Gestão de Usuários" no menu de navegação do sistema com ícones correspondentes.

---

## v1.11.2 — 2026-04-07
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **Correção de Loop Infinito**: Resolvida a falha no `FinanceiroDashboard.jsx` que causava travamento na tela de carregamento (percebido como loop) devido à falta de tratamento de erro em chamadas de API paralelas e estado inicial de loading.
- **Correção de Tela Branca na Importação**: Resolvido o crash (Runtime Error) no módulo `EfetivoImport.jsx` ao clicar em "Iniciar Importação", causado pela ausência das estatísticas esperadas (`stats`) na resposta do backend e uso incorreto de placeholders SQL.
- **Backend - Rotas Financeiras**: Implementada a rota `/api/financeiro/detalhado` (que estava faltando) e corrigida a rota `/api/financeiro/resumo` para retornar todos os campos esperados pelo frontend (verba, saldo, percentual, etc).
- **Correção de Placeholders SQL**: Corrigidos erros de sintaxe SQL em consultas brutas (`db.query`) que utilizavam o placeholder `?` (SQLite) em vez de `$1` (PostgreSQL) na rota de voluntários e financeira.
- **Robustez UI/UX**: Adicionado tratamento de erro visual no Dashboard Financeiro para informar ao usuário sobre falhas na comunicação com o servidor, em vez de exibir um spinner infinito.

---

## [v1.11.1] - 2026-04-07 (Limpeza de Tabelas Legacy e SQLite) - [Desenvolvedor: Sistema]
### Modificado (Changed)
- **Limpeza de Arquivos**: Banco de dados legado `backend/escalas.sqlite` removido definitivamente do projeto.
- **Refatoração do Banco de Dados**: Docker PostgreSQL limpo com o descarte das tabelas legadas (`users` e `months`), finalizando a extinção de vínculos com estruturais pregressas (`military_personnel`, `shedules`, `sqlite_sequence` e `volunteers`).

---

## [v1.11.0] - 2026-04-07 (Remoção do Menu Inscrição FT + Importação PDF) - [Desenvolvedor: Rafael Monteiro]
- **Remoção do Menu**: O menu "Inscrição FT" foi removido da barra de navegação para todos os usuários.
- **Importação de Requerimentos via PDF**: Adicionado novo botão "Importar PDF" no módulo de Gestão de Requerimentos. O sistema permite selecionar uma pasta contendo arquivos PDF de requerimentos, faz a leitura automática do conteúdo (OCR via pdf-parse), extraindo o Número de Ordem do militar e a disponibilidade (dias e turnos marcados com "X"), e popula o banco de dados no novo schema (REQUERIMENTOS + DISPONIBILIDADE_REQUERIMENTO).
- **Backend**: Novos endpoints `/api/import/volunteers/folder` (importação em lote) e `/api/pdf-folders` (listagem de pastas disponíveis).
- **Frontend**: Modal de seleção de pasta e mês para importação, com feedback de erros e resultados.

---
- **Arquitetura RBAC (Proposta)**: Especificada a modelagem de dados para permissões em níveis (Admin, Gerente, Militar) e integração com a tabela `EFETIVO`.
- **Módulo de Perfil (Proposta)**: Planejada a expansão dos dados biográficos no banco de dados, incluindo suporte a avatar, e-mail e recuperação de senha.
- **Admin Automático**: Implementada rotina de *Auto-Seed* no `db.js` que garante a existência de um usuário administrador (`999999`) na inicialização do sistema.
- **Segurança**: Definidas as premissas de segurança baseadas em Argon2/Bcrypt e JWT (HTTP-Only Cookies) para futura implementação.

---

## [v1.9.3] - 2026-04-07 (Otimização da Importação de Efetivo) - [Desenvolvedor: Alan Kleber]
- **Mapeamento Flexível**: Corrigida a captura das colunas `POSTO/GRAD` e `NOME DE GUERRA` no Excel, garantindo a integridade dos dados militares.
- **Inteligência Anti-Duplicidade**: O sistema agora valida automaticamente se o militar já existe (pela Matrícula) antes de inserir, evitando registros redundantes e mantendo o histórico intacto.
- **Feedback de Erros Detalhado**: Implementada lista de diagnóstico post-importação que exibe o motivo exato de falha para cada registro (ex: CPF inválido, campo obrigatório ausente).
- **Estatísticas de Processamento**: Nova interface de resultados com contagem separada para Novos Registros, Registros Ignorados (já existentes) e Erros.

---

## [v1.9.2] - 2026-04-07 (Correção Dropdown Navbar) - [Desenvolvedor: Alan Kleber]
- **Robustez na Navegação**: Substituído o comportamento de hover CSS dos menus dropdown por controle de estado manual no React (`activeDropdown`).
- **UX Consistente**: Menus agora fecham automaticamente ao selecionar uma página ou ao alternar entre categorias.
- **Ajuste Visual**: Adicionada rotação animada no ícone de seta (`ChevronDown`) ao abrir/fechar as categorias.
- **Prevenção de Bugs Mobile**: Resolvida a falha onde menus ficavam "presos" em modo visível em telas de toque.

---

## [v1.9.1] - 2026-04-07 (CRUD de Efetivo) - [Desenvolvedor: Alan Kleber]
- **Gestão de Efetivo (CRUD)**: Implementada interface completa para Gerenciamento de Militares (`EfetivoManager.jsx`), permitindo Criar, Editar, Visualizar e Excluir registros diretamente pelo sistema.
- **API RESTful**: Adicionados novos endpoints no backend para suporte total às operações do efetivo (`GET`, `POST`, `PUT`, `DELETE` /api/efetivo).
- **Sincronização de Credenciais**: O sistema agora atualiza automaticamente a tabela de usuários ao modificar ou criar um militar, garantindo que o login (Nº de Ordem/Matrícula) permaneça sempre sincronizado.
- **Integridade de Dados**: Implementadas travas de segurança que impedem a exclusão de militares que possuem requerimentos ativos ou que já foram escalados em ciclos operacionais.
- **Interface Intuitiva**: Lista de efetivo com busca em tempo real, badges de status (Ativo/Inativo) e formulário modal responsivo.

---

## [v1.9.0] - 2026-04-07 (Responsividade Mobile e Refatoração UI/UX) - [Desenvolvedor: Alan Kleber]
- **Design Mobile-First**: O projeto agora é totalmente responsivo, adaptando-se automaticamente a smartphones, tablets e desktops.
- **Formulários Adaptativos**:
  - `VolunteerForm.jsx` refatorado para usar grids flexíveis e matriz de horários com scroll horizontal fixo (sticky headers) em telas pequenas.
  - Alvos de toque otimizados para seleção de turnos em dispositivos móveis.
- **Dashboard Administrativo Responsivo**:
  - `AdminDashboard.jsx` atualizado com controles (`AdminControlsHeader`) que utilizam `flex-wrap` para evitar quebras de layout em telas menores.
  - Ajuste na escala visual do PDF e das guarnições para melhor legibilidade em diferentes resoluções.
- **Listagem de Requerimentos**: `RequerimentosAdmin.jsx` recebeu containers de rolagem lateral (`responsive-table-container`) e modais que empilham campos (`form-grid-stack`) automaticamente.
- **Sistema de Design Global**: Atualizado `index.css` com tokens de design para responsividade, novos breakpoints e utilitários de grid adaptativo.
- **Navegação Mobile**: Menu lateral (Navbar) agora colapsa em um ícone de hambúrguer em telas pequenas, melhorando a área útil de trabalho.
- **Correções Estruturais**: Resolvidos problemas de fechamento de tags JSX no `AdminDashboard` e padronização de paddings nos módulos de importação.

---

## [v1.8.5] - 2026-04-07 (Módulo de Gestão de Ciclos) - [Desenvolvedor: Alan Kleber]
- **Gestão de Ciclos Operacionais**: Implementado o componente `CicloManager.jsx` para controle total dos períodos de escala (início, fim e status).
- **Backend Integrado**: Criados endpoints `/api/ciclos` (CRUD) e `/api/efetivo/import` (Upload) com suporte a PostgreSQL.
- **Importação de Efetivo**: Implementada interface visual (`EfetivoImport.jsx`) com suporte a drag-and-drop para integração automática de militares a partir de planilhas Excel.
- **Navegação e UX**: Navbar estruturada em categorias com menus suspensos, incluindo o novo módulo de importação em "Configurações".
- **View de Inteligência**: Adicionada a view `vw_detalhes_ciclos` no banco para exibir estatísticas em tempo real (total de inscritos e escalados) por ciclo.
- **Inscrição por Período**: O formulário do militar (`VolunteerForm.jsx`) agora permite a seleção de ciclos abertos, garantindo que as inscrições sejam vinculadas ao período correto.
- **Modernização UI/UX**: Redesenhado o formulário de novos ciclos com foco em hierarquia visual, acessibilidade (ARIA labels), feedback dinâmico de erros e micro-animações (shake effects).
- **Integridade de Dados**: Implementada validação que impede a exclusão de ciclos com requerimentos ativos.

---

## [v1.8.2] - 2026-04-06 (Módulo de Gestão de OPM) - [Desenvolvedor: Alan Kleber]
- **Interface de Gestão OPM**: Criado o componente `OpmManager.jsx` para administração completa das unidades da corporação (CRUD).
- **Extensão da API**: Implementados endpoints RESTful (`/api/opms`) para suporte à persistência de dados das OPMs.
- **Segurança e Integridade**: Adicionada proteção no backend que impede a exclusão de OPMs com ciclos de escala ativos ou vinculados.
- **Navegação Administrativa**: Integrado o novo módulo à barra de navegação principal para usuários com privilégios de administrador.

---

## [v1.8.0] - 2026-04-06 (Integração de Esquema Relacional bd.sql) - [Desenvolvedor: Alan Kleber]
- **Migração Relacional Completa**: Integrado o esquema `bd.sql` ao PostgreSQL, substituindo a estrutura simplificada por um modelo normalizado de alta integridade.
- **Normalização de Efetivo**: Dados de militares agora residem na tabela `EFETIVO`, com suporte a Matrícula (Nº de Ordem), CPF, Posto/Graduação e Nome de Guerra.
- **Gestão de Ciclos e OPM**: Implementadas tabelas de `OPM` e `CICLOS` para suporte a múltiplas unidades e períodos de escala organizados.
- **Requerimentos Granulares**: Sistema de disponibilidade refatorado para as tabelas `REQUERIMENTOS` e `DISPONIBILIDADE_REQUERIMENTO`, permitindo histórico auditável de solicitações.
- **Escalabilidade de Planejamento**: Refatorada a tabela `ESCALA_PLANEJAMENTO` para armazenar registros individuais por militar/serviço, eliminando o uso de JSON blobs para dados operacionais críticos.
- **Triggers de Segurança**: Adicionados gatilhos PostgreSQL (`trg_valida_escala`) que impedem a escala de militares sem disponibilidade confirmada ou em períodos inativos.
- **Compatibilidade Retroativa Zero-Touch**: Toda a lógica de reconstrução de dados (JSON mapping) foi implementada no Backend, garantindo o funcionamento perfeito do Frontend atual sem necessidade de recompilação ou alteração de código cliente.
- **Scripts de Migração Sincronizados**: Atualizados `import_military.js` e `create_users.js` para popular as novas tabelas relacionais a partir do Excel institucional.
- **Refatoração Financeira**: Endpoints de resumo e detalhamento financeiro agora utilizam agregações SQL nativas, aumentando a precisão e velocidade dos relatórios de gastos.

---

## [v1.7.2] - 2026-04-05 (Dockerização e Migração PostgreSQL) - [Desenvolvedor: Alan Kleber]
- **Governança de Skill**: Criado arquivo `versioning.md` na skill `api-patterns` para consolidar as regras de documentação e múltiplos desenvolvedores.
- **Suporte ao Docker**: Implementados arquivos `Dockerfile` e `docker-compose.yml` para ambientes de desenvolvimento e produção.
- **Ambientes Isolados**: Configurados para rodar em VPS com redes Docker internas seguindo boas práticas de segurança e desempenho.
- **Painéis de Administração**: Integrados containers oficiais do **pgAdmin** (gestão de banco) e **Portainer** (gestão de containers).
- **Migração PostgreSQL**: Substituído o banco de dados SQLite pelo PostgreSQL 16 Alpine, garantindo escalabilidade e robustez.
- **Resiliência de Banco**: Adicionada lógica de retry (5 tentativas com intervalo de 5s) no `db.js` para aguardar a prontidão do container PostgreSQL.
- **Otimização de Build**: Criados arquivos `.dockerignore` tanto para Backend quanto Frontend, evitando corrupção por cópia de `node_modules` locais do Windows para imagens Linux Alpine.
- **Fix Conexão Pool**: Corrigido uso indevido de `client` após liberação, migrando todas as chamadas do wrapper para o `Pool` global.
- **Segurança de Cópia**: Dockerfiles ajustados para garantir build limpo independente do estado local da máquina do desenvolvedor.

### Modificado (Changed)
- **Backend Architecture**: Migração de drivers nativos para suporte a banco de dados relacional robusto.
- **Segurança**: Containers configurados para rodar como usuários não-root e isolamento de rede interna.

---

## [v1.7.1] - 2026-04-05 (Padronização de Histórico e Novo Recurso de Autor) - [Desenvolvedor: Alan Kleber]
### Adicionado (Added)
- **Identificação de Desenvolvedor**: A partir desta versão, todas as entradas no `VERSION.md` passam a incluir obrigatoriamente o nome do desenvolvedor responsável pelas alterações, visando maior transparência em projetos colaborativos.

### Modificado (Changed)
- **Limpeza de Histórico**: Removida a identificação de desenvolvedor das versões anteriores (até v1.7.0) para manter o padrão histórico original antes da implementação oficial desta regra.

---

## [v1.7.0] - 2026-04-05 (Módulo Financeiro)
### Adicionado (Added)
- **Novo menu "Financeiro"**: Quarto item de navegação adicionado ao painel do administrador, com ícone de cifrão.
- **Verba por Ciclo**: Configuração fixa de R$ 850.000,00 por ciclo (mês) para pagamento dos serviços.
- **Valores por Serviço**: 
  - Serviço de 6 horas: R$ 192,03 por militar
  - Serviço de 8 horas: R$ 250,00 por militar
- **Backend API**: Novos endpoints `/api/financeiro/resumo` e `/api/financeiro/detalhado` para cálculo automático de gastos.
- **Painel Financeiro com 3 abas**:
  - **Visão Geral**: Cards com verbo do ciclo, total gasto, saldo restante, percentual utilizado, barra de progresso colorida (verde/amarelo/vermelho), alerta quando >90% utilizado, serviços 6h/8h separados, total de militar/serviço e média por militar.
  - **Detalhado**: Evolução diária de gastos com acumulado ao longo do período.
  - **Militares**: Top 10 militares por serviços executados com valor recebido, ranking com medalhas para os 3 primeiros.
- **Filtro por Ciclo**: Seleção de mês/ciclo para filtrar os dados financeiros exibidos.

### Modificado (Changed)
- **App.jsx**: Nova importação e rota para o componente `FinanceiroDashboard`.
- **Barra de navegação**: Adicionado link "Financeiro" visível apenas para administradores.

---

## [v1.6.3] - 2026-04-05 (Correção - Militares Disponíveis no Painel Admin)
### Corrigido (Fixed)
- **Militares não apareciam no Painel Admin**: Após implementação do filtro por mês, os militares com requerimentos disponíveis não apareciam na lista lateral para escalação.
- **Causa raiz**: A tabela `schedules` não possuía a coluna `month_key`, causando erro 500 na API ao buscar escalas filtradas por mês e data.
- **Correção no banco de dados**: Adicionada coluna `month_key` à tabela `schedules` e atualizados os registros existentes.
- **Correção no código frontend**: Ajustada a lógica de filtragem de disponibilidade para verificar tanto chaves string quanto number no objeto `availability` (ex: "1" e 1).
- **Duplicação de militares**: Ao retornar à aba Painel Admin, militares já escalados estavam novamente disponíveis para escalação em outra guarnição. Corrigido com lógica que remove os militares já atribuídos do pool de disponíveis ao carregar os dados.

---

## [v1.6.2] - 2026-04-05 (Correção de Códigos de Escape ANSI)
### Corrigido (Fixed)
- **Códigos ANSI no Terminal**: Ao iniciar ou encerrar o backend, códigos de escape ANSI (sequências de controle de terminal) apareciam como texto cru na tela. Correção aplicada em três pontos:
  - `iniciar-sistema.bat`: Adicionadas variáveis de ambiente `NO_COLOR=1` e `TERM=dumb` ao iniciar o backend.
  - `backend/.npmrc`: Novo arquivo de configuração do npm para desabilitar cores globally.
  - `backend/server.js`: Variáveis de ambiente `FORCE_COLOR`, `NO_COLOR` e `TERM` definidas no início do código.

---

## [v1.6.1] - 2026-04-05 (Renomeação do Projeto)
### Modificado (Changed)
- **Nome do Projeto**: A pasta raiz do projeto foi renomeada de "Gerado de Escala - FT" para "Gestão de Força Tarefa".
- Os nomes de exibição no sistema permanecem como "9º BPM - Força Tarefa" em todas as interfaces.

---

## [v1.6.0] - 2026-04-05 (Sistema de Login e Banco de Dados Militar)
### Adicionado (Added)
- **Banco de Dados de Militares**: Importação automática dos 183 militares do 9º BPM a partir do arquivo Excel `USUARIOS9BPM.xls`, incluindo: Nº de Ordem, Posto/Graduação, Nome de Guerra e Telefone.
- **Tabela `military_personnel`**: Dados institucionais dos militares para autocomplete no formulário.
- **Tabela `users`**: Sistema de autenticação com 176 usuários criados automaticamente (login: nº de ordem, senha: CPF).
- **4 Administradores**: CPFs 05626561463, 07712466416, 02715243405 e 04512828419 (nº ordem: 151197, 97037, 140787, 142423) com acesso completo ao sistema.
- **Tela de Login**: Nova interface de autenticação com validação de credenciais.
- **Restrição de Acesso**: Usuários comuns acessam apenas o menu "Requerimento FT"; administradores têm acesso a todos os menus (Painel Admin e Analítico FT).
- **Autocomplete no Formulário**: Ao realizar login, os campos são preenchidos automaticamente com os dados do militar.

### Modificado (Changed)
- **Frontend**: Reformulação do `App.jsx` para renderizar a tela de login antes do sistema principal.
- **VolunteerForm**: Recebe `userData` como prop para pré-preencher dados do militar logado.
- **Backend API**: Novo endpoint `POST /api/login` para autenticação e `GET /api/military/:numero_ordem` para consulta de dados.

---

## [v1.5.1] - 2026-04-05 (Cálculo de Recurso por Militar na Aba Analítico FT)
### Modificado (Changed)
- **KPI "Recurso Utilizado" substituído por "Recurso Restante"**: O quarto cartão de KPI agora exibe o valor remaining do orçamento mensal de R$ 85.000,00 menos o valor já utilizado pelos militares.
- **Orçamento mensal configurável**: Adicionada constante `ORCAMENTO_MENSAL = 85000` para referência do cálculo.
- **Cálculo**: Recurso Restante = R$ 85.000,00 - (total de FTs de 6h × R$ 192,03 + total de FTs de 8h × R$ 250,00).

---

## [v1.5.0] - 2026-04-05 (Executável de Inicialização)
### Adicionado (Added)
- **Script de Inicialização (`iniciar-sistema.bat`)**: Novo arquivo executável que automatiza completamente a inicialização do sistema com um único clique. Executa verificação de Node.js, instalação automática de dependências (se necessário), inicia o Backend na porta 3001 e o Frontend na porta 5173, e exibe instruções de acesso.
- **Script de Encerramento (`encerrar-sistema.bat`)**: Script auxiliares para encerrar todos os processos Node.js de forma organizada.

---

## [v1.4.0] - 2026-04-05 (Módulo Analítico FT)
### Adicionado (Added)
- **Novo menu "Analítico FT"**: Terceiro item de navegação adicionado à barra superior, com ícone de gráfico de barras.
- **Painel de KPIs**: Quatro cartões de destaque exibindo: Total de Serviços no mês, quantidade de FTs de 6h, quantidade de FTs de 8h e o maior número de FTs de um único militar.
- **Tabela Analítica por Militar**: Exibe cada voluntário cadastrado com as colunas: Nº de Ordem, Posto/Nome, Motorista, FTs de 6h, FTs de 8h, Total, Restantes (máx: 8/mês), Situação (badge colorido: "Em dia", "Quase no limite", "Limite atingido", "Sem serviços") e uma barra de progresso visual proporcional ao limite mensal.
- A contagem é derivada automaticamente das escalas salvas no Painel Admin (cruzamento de `schedules` × `volunteers`).

---

## [v1.3.3] - 2026-04-05 (Bordas reforçadas nas caixas de guarnição)
### Modificado (Changed)
- **Borda das Guarnições (UI)**: Borda lateral elevada para `2px` em azul translúcido (`#b8cde8`) e borda superior destacada para `3px` em Azul PMAL sólido, com sombra suave ampliada para dar profundidade visual e separar nitidamente cada caixa de guarnição na tela.
- **Borda das Guarnições (PDF)**: Nas exportações, as caixas passam a ter borda de `2px` e topo com `4px` em Azul PMAL `#0D3878`, garantindo separação clara e legível no documento impresso.

---

## [v1.3.2] - 2026-04-05 (Correção do cabeçalho institucional no PDF)
### Corrigido (Fixed)
- **Cabeçalho PDF em duas camadas**: O cabeçalho do documento exportado é agora desenhado diretamente via comandos nativos do `jsPDF` (retângulos, texto e imagens em base64), eliminando a dependência de posicionamento CSS que causava quebras e desalinhamentos ao ser processado pelo `html2canvas`. Os brasões são buscados dinamicamente e posicionados matematicamente um em cada extremidade, com textos institucionais centralizados entre eles. As faixas decorativas verde e amarela são desenhadas como retângulos sólidos precisos logo abaixo do retângulo azul PMAL.

---

## [v1.3.1] - 2026-04-05 (PDF inteligente - apenas guarnições preenchidas)
### Modificado (Changed)
- **Exportação de PDF filtrada**: O botão "Exportar PDF" agora gera um documento contendo apenas as guarnições que possuam ao menos um militar alocado. Guarnições completamente vazias são suprimidas automaticamente, resultando num PDF mais limpo e compacto, sem espaços em branco desnecessários. A grade de edição na tela continua inalterada com todas as 6 guarnições disponíveis para arrastar e soltar.

---

## [v1.3.0] - 2026-04-05 (Filtro de Turno no Painel Admin)
### Adicionado (Added)
- **Filtro de Turno**: Novo dropdown "Turno" adicionado ao lado do seletor de Dia na barra de controles do Painel Admin. As opções são: `07:00 ÀS 13:00`, `13:00 ÀS 19:00`, `19:00 ÀS 01:00`, `01:00 ÀS 07:00` e `Todos os Turnos`. Quando um turno específico é selecionado, apenas os militares que marcaram disponibilidade para aquele dia **e** aquele turno são exibidos na lista lateral, facilitando a montagem das guarnições por horário.
- **Badge MOTORISTA**: Na lista de militares disponíveis, o militares que sinalizaram "Sim" no campo Motorista passam a exibir um badge verde destacado para facilitar a identificação visual durante a escalação.
- **Contador inteligente**: O contador de militares no cabeçalho da lista reflete dinamicamente a quantidade filtrada, alterando conforme o turno selecionado.

---

## [v1.2.0] - 2026-04-05 (Melhorias no Requerimento FT e Painel Admin)
### Adicionado (Added)
- **Campo Motorista**: O formulário de requerimento agora inclui seleção "Sim / Não" para identificar militares habilitados a conduzir viaturas, armazenado no banco de dados e exibido no painel do escalante.
- **Sobrescrita por Nº de Ordem**: Ao tentar confirmar um requerimento com um Nº de Ordem já cadastrado, o sistema exibe um modal de confirmação solicitando autorização para substituir os dados existentes, evitando duplicatas.
- **Novos Endpoints da API**: `GET /api/volunteers/check/:numero_ordem` (verificação) e `PUT /api/volunteers/:id` (atualização) adicionados ao backend.

### Modificado (Changed)
- Renomeado o menu "Inscrição Diária" para **"Requerimento FT"**, adequando a nomenclatura ao contexto militar institucional.
- O cabeçalho do formulário foi atualizado para refletir a nova nomenclatura.

---

## [v1.1.0] - 2026-04-04 (Refatoração Institucional & Lógica de Horários)
### Adicionado (Added)
- **Tema Institucional Light**: Removido o design genérico escuro, implementando as cores Azul Petróleo, branco e cinza, que remetem aos sistemas oficiais da Polícia Militar de Alagoas, com inclusão do brasão de armas na navegação e nos documentos gerados.
- **Nº de Ordem**: O sistema passa a coletar, armazenar e exibir o Número de Ordem do militar em todas as interfaces e impressões em PDF.
- **Matriz de Interseção de Turnos**: A inscrição mudou de uma seleção simples de dias, para uma matriz onde o militar escolhe qual bloco de horários quer ingressar cruzando turnos (07-13h, 13-19h, 19-01h, 01-07h) com os dias do mês.
- **Layout Gerencial Editável**: O administrador agora pode renomear livremente as guarnições.
- **Gestão de Carga Horária**: Inserido um seletor que autoriza as escalas de 6 e 8 horas. No exato momento em que são escolhidas, a calculadora gera as respectivas chaves de preenchimento (Dropdown) de todos os intervalos daquele dia.

### Modificado (Changed)
- Redução e otimização da quantidade de Força Tarefas visíveis simultaneamente para 6.
- Adequação explícita de "Posição Assumida" em cada Guarnição: Comandante, Motorista e Patrulheiro definidos de acordo com a ordem do Drag & Drop.

### Problemas Solucionados (Fixed)
- **Corte no PDF**: Ajuste feito na montagem vetorial do `html2canvas` trocando botões de Background por Textos Semânticos no rodapé da Guarnição, assegurando que o horário das escalas nunca seja mutilado ao exportar e imprimir a folha A4.
- **Bug de Memória no Arrastar (Drop)**: Resolução do Shallow Copying da árvore de Nodes no React, que tornava militares comissionados invísiveis ao serem puxados individualmente para a Pool secundária.

---

## [v1.0.0] - 2026-04-04 (Gênese do Sistema)
### Adicionado (Added)
- **Estruturação do Projeto**: Criação da arquitetura separando Front-end (React.js/Vite) e Back-end (Node.js/Express).
- **Backend (API)**:
  - Criação do banco de dados relacional interno utilizando SQLite (`escalas.sqlite`).
  - Endpoints para cadastro e listagem de militares (`/api/volunteers`).
  - Endpoints para salvamento e listagem das escalas prontas (`/api/schedules`).
- **Frontend (Interface do Usuário)**:
  - Implementação de um formulário interativo de inscrições para coleta de Nome, Posto/Graduação, Telefone e seleção de calendário para dias úteis (disponibilidade da Força Tarefa).
  - Implementação do painel **"Admin"** super dinâmico utilizando funções nativas de _Drag & Drop_ (Arraste e Solte).
  - Capacidade de estruturar até 10 guarnições simultâneas e uma restrição automatizada de máximo 3 componentes por guarnição.
  - Implementação do **Exportador de PDF** usando `html2canvas` e `jspdf` focado no padrão para impressão e publicação em boletim interno.
- **Folhas de Estilo (Estética)**: Implementação de "_Glassmorphism_" na tela com UI baseada no padrão militar Premium e adaptação ao modo escuro inteligente.

### Problemas Solucionados (Fixed)
- Correção na inicialização do backend associada à ausência inicial de módulos via `npm install` (Erro `MODULE_NOT_FOUND`).

---

**Nota Técnica para uso futuro:**
As atualizações devem ser registradas aqui seguindo o padrão SemVer (Semantic Versioning):
- Major.Minor.Patch (ex: 1.0.0 para primeira versão oficial; 1.0.1 para correção de bugs; 1.1.0 para novas ferramentas).
