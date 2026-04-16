## v1.28.13 — 2026-04-16
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Frontend] Identificação por Nome de Guerra**: Atualizada a função de construção de estatísticas no `AnalyticsDashboard.jsx` para priorizar a exibição do `nome_guerra` em vez do nome completo, alinhando-se ao padrão operacional.

---

**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Frontend] Aba Geral no Analytics**: Adicionada a 3ª aba "Geral" ao `AnalyticsDashboard.jsx`, que consolida os totais de serviços de todas as fontes (Unidade + CPM).
- **[Logic] Agregação por ID**: Refatorada a função `buildStats` para permitir a soma de serviços provenientes de múltiplas OPMs em um único registro quando visualizado na aba Geral.
- **[UI] Navegação Tripartida**: Interface de abas agora permite alternar entre visão consolidada, visão local da unidade e visão específica do comando superior (CPM/I-Faz).

---

**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Design Premium e Responsivo**: Reformulado o `AnalyticsDashboard.jsx` com suporte completo a dispositivos móveis e tablets usando Media Queries.
- **[UI] Abas Destacadas**: Implementado estilo de abas com indicadores visuais modernos e transições suaves.
- **[UX] Grid Adaptativo**: Os KPIs e controles de cabeçalho agora se auto-ajustam conforme o tamanho da tela, otimizando o espaço de trabalho em qualquer dispositivo.

---

**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Hotfix] Analytics White Screen**: Corrigido erro de referência `matchingCycle is not defined` no `AnalyticsDashboard.jsx`.
- **[Refactor] Escopo de Componente**: Movida a lógica de identificação do ciclo ativo para o escopo global do componente, garantindo que as abas de navegação exibam corretamente a sigla da OPM.

---

**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Frontend] Navegação por Abas no Analytics**: Implementado sistema de abas no `AnalyticsDashboard.jsx` para alternar entre "OPM Unidade" e "CPM/I-Faz".
- **[Logic] Filtro de Abas**: A lógica de agregação agora reage à aba ativa, filtrando os serviços executados pela `opm_origem` específica de cada contexto (Ciclo OPM vs CPM/I-Faz).
- **[UI] Workspace Otimizado**: O gestor agora pode visualizar separadamente a produtividade local e a do comando superior dentro do mesmo ciclo operacional.

---

**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Frontend] Interface Simplificada**: Removidos os seletores manuais de data (DatePicker) do `AnalyticsDashboard.jsx`.
- **[UX] Foco em Ciclos**: O dashboard agora depende inteiramente da seleção do Ciclo Operacional para definir o período de análise, reduzindo a complexidade visual para o gestor.

---

**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Frontend] Analytics focado em Execução**: Ajustado o `AnalyticsDashboard.jsx` para exibir apenas militares com ao menos 1 serviço executado (`total > 0`).
- **[UI] Limpeza de Dashboard**: Removida a exibição de voluntários sem serviços no dashboard analítico, otimizando a visualização para conferência de produtividade e financeira.

---

**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Frontend] Precisão Analítica por OPM**: Ajustada a lógica de agregação do `AnalyticsDashboard.jsx` para filtrar serviços executados pela OPM de origem do ciclo selecionado.
- **[UI] Coluna OPM**: Adicionada nova coluna na tabela do dashboard para facilitar a identificação da origem dos militares (home OPM vs OPM de serviço).
- **[UX] Agregação de Ciclo**: Melhorada a consolidação de dados de militares externos, garantindo que o limite de serviços seja verificado corretamente dentro do contexto da unidade analizada.

---

**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Frontend] Sincronismo de Datas no Analytics**: Adicionados filtros de data início/fim no `AnalyticsDashboard.jsx` que se sincronizam automaticamente com a seleção do ciclo operacional.
- **[UX] Melhoria na Filtragem**: Usuários agora podem refinar manualmente o período de análise no dashboard analítico, preservando a facilidade de preenchimento automático via ciclos.

---

**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Frontend] Filtro de Ciclo em Serviços Executados**: Adicionado seletor de Ciclo Operacional no `ServicosExecutadosManager`.
- **[UX] Sincronização de Datas**: Implementada lógica que preenche automaticamente os filtros de 'Data Início' e 'Data Fim' ao selecionar um ciclo, facilitando a visualização por período operacional.
- **[Fix] Parâmetro de API**: Corrigido o nome do parâmetro enviado ao backend de `id_ciclo` para `ciclo_id` na rota `/api/servicos`.

---

**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Architecture] Fragmentação de Ciclos na Importação**: Implementada lógica de distribuição inteligente que fragmenta automaticamente a disponibilidade do requerimento nos ciclos operacionais corretos, resolvendo o conflito entre o mês civil (dias 1–31) e o ciclo operacional (dia 16 ao dia 15).
- **[Backend] Helpers `distribuirDisponibilidadeEmCiclos` e `upsertRequerimentoFragmento`**: Para cada dia de disponibilidade do PDF, o sistema constrói a data real e consulta qual ciclo a cobre via `BETWEEN data_inicio AND data_fim`, criando um requerimento separado por ciclo com idempotência garantida.
- **[Backend] Extração de Mês do PDF**: `parseRequerimentoPDF` agora detecta o mês de referência civil diretamente do texto do PDF, com fallback para o mês enviado pelo frontend.
- **[Database] Constraint de Unicidade**: Adicionada `UNIQUE(id_requerimento, dia_mes, horario_turno)` em `DISPONIBILIDADE_REQUERIMENTO` para garantir integridade e permitir `ON CONFLICT DO NOTHING` nas reinserções.
- **[Frontend] Envio de `mes_referencia`**: A importação de PDFs agora envia o mês de referência do ciclo ativo para auxiliar a fragmentação server-side.

---

## v1.28.2 — 2026-04-16
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Prevenção de Duplicidade em Tempo Real**: Implementada validação dinâmica no `RequerimentosAdmin` que detecta matrículas duplicadas no ciclo atual, exibindo alertas visuais e bloqueando o salvamento preventivamente.

---

## v1.28.1 — 2026-04-16
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Humanização de Ciclos**: Implementada exibição de meses por extenso ("Abril / Maio") no gerenciador de ciclos para melhorar a legibilidade e reconhecimento do período operacional.

---

## v1.28.0 — 2026-04-15
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Analytics] Seletor de Ciclos Premium**: Implementado novo seletor de ciclos com design glassmorphism e integração dupla (Header e Título Contextual).
- **[UI/UX] Micro-interações de Dados**: Adicionada animação de carregamento suave (fade/scale) nos KPIs ao trocar de ciclo, proporcionando feedback instantâneo de processamento.
- **[Core] Sincronização de Estado**: Refatorada a lógica de filtragem para garantir reatividade imediata entre a seleção do ciclo e a reconstrução das estatísticas de produtividade.

---

## v1.27.5 — 2026-04-13
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Hotfix] Correção Crítica no Título de Ciclo**: Resolvido o erro "undefined NaN" que ocorria no `ServicosExecutadosManager` devido a incompatibilidades de formato de data e fuso horário.
- **[Core] Inteligência de Formatação Multinível**: O sistema agora prioriza o `period_name` já processado pelo backend e utiliza um parsing de fallback resiliente, garantindo que o ciclo ("Maio/Junho 2026") seja exibido corretamente em todos os cenários.
- **[UI/UX] Robustez Visual**: Implementadas proteções contra dados nulos ou malformados na exibição do contexto operacional da página.

---

## v1.27.4 — 2026-04-13
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Refinamento de Título de Ciclo**: Ajustada a formatação do ciclo no cabeçalho da página de `ServicosExecutadosManager`.
- **[UI/UX] Padronização de Data**: Implementada a conversão automática das datas de início e fim do ciclo para o formato amigável "Mês/Mês Ano" (ex: "Maio/Junho 2026"), seguindo a identidade visual premium do sistema.
- **[Core] Formatter Robusto**: Desenvolvida lógica baseada em nomes de meses em português para garantir exibição correta independente do fuso horário local.

---

## v1.27.3 — 2026-04-13
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Evolução do Gerenciamento de Ciclos**: Migrada a seleção de ciclo do dropdown de filtros para o título principal da página no `ServicosExecutadosManager`.
- **[UI/UX] Design Minimalista e Focado**: O ciclo agora é exibido como um rótulo textual elegante (ex: "Maio/Junho 2026") integrado ao título, reduzindo a carga cognitiva e seguindo o padrão premium de navegação por contexto.
- **[Core] Inteligência de Seleção Inicial**: Aprimorada a lógica de carregamento para selecionar automaticamente o ciclo com status 'Aberto' na inicialização do módulo.

---

## v1.27.2 — 2026-04-13
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Iconografia de Ações Premium**: Implementado um novo sistema global de botões de ação (`.action-btn`) com design sofisticado, estados de hover dinâmicos e cores semânticas suaves.
- **[UI/UX] Padronização Global de Dashboards**: Aplicada a nova iconografia em todos os módulos de gestão (`UserManager`, `EfetivoManager`, `ServicosExecutadosManager`, `TiposServicoManager`, `RequerimentosAdmin`, `OpmManager` e `CicloManager`), garantindo uma experiência de usuário coesa e profissional em todo o ecossistema GSVR.
- **[Clean Code] Centralização de Estilos**: Migrados os estilos de botões de ação para o `index.css`, eliminando duplicação de código e facilitando manutenções visuais futuras.

---

## v1.27.1 — 2026-04-13
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Padronização de Cabeçalhos de Grid**: Implementado o fundo azul institucional (`var(--primary)`) e texto branco em todos os cabeçalhos (`th`) das tabelas de gestão (`UserManager`, `ServicosExecutadosManager`, `RequerimentosAdmin`, `TiposServicoManager`).
- **[UI/UX] Consistência Estrita**: Reforçada a especificidade dos estilos inline nos cabeçalhos para garantir a identidade visual "Premium" e evitar conflitos com o CSS global, removendo bordas redundantes e padronizando o padding.
- **[UI/UX] Refinamento dos Modais de Requerimentos**: Grade de disponibilidade nos modais de edição e visualização agora seguem o padrão visual do cabeçalho principal.

---

## v1.27.0 — 2026-04-13
**Autor:** Rafael Mendes
**Email:** rafael.mendes@example.com

### Mudanças:
- **[UI/UX] Padronização Global Premium**: Refatoração integral de todos os módulos administrativos (OPM, Efetivo, Usuários, Serviços Executados, Ciclos, Tipos de Serviço e Roles) para o novo design system unificado.
- **[UI/UX] Consolidação Visual**: Implementado uso consistente de modais premium (`.modal-content-premium`), formulários estilizados (`.form-control`) e tabelas administrativas padronizadas (`.admin-table`) em todo o sistema.
- **[UI/UX] Refinamento de Contraste**: Atualizado o cabeçalho do grid de efetivo para utilizar o azul institucional (`var(--primary)`), garantindo melhor hierarquia visual e harmonia com os botões principais.
- **[Clean Code] Otimização de CSS**: Removidos estilos redundantes e blocos `<style>` locais em favor de classes utilitárias globais no `index.css`, resultando em um código mais limpo e fácil de manter.

---

## v1.26.3 — 2026-04-13
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Analytics] Padronização de Ciclos**: Implementada exibição humanizada dos ciclos operacionais no Dashboard Analítico utilizando o formato "Mês / Mês - Ano".
- **[UI/UX] Filtros e Ordenação Inteligente**: Implementada barra de busca em tempo real e ordenação por quantidade de turnos no painel administrativo de requerimentos.
- **[BackOffice] Cancelamento Cirúrgico**: Nova funcionalidade de cancelamento de disponibilidade que permite selecionar especificamente quais turnos desativar (ativo=false) via interface interativa, em vez de cancelar todo o requerimento.

---

## v1.26.2 — 2026-04-13
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Analytics] Visibilidade Total de Dados**: Refatorada a lógica do Dashboard Analítico para incluir todos os militares com serviços prestados no ciclo, independentemente de possuírem requerimento prévio.
- **[Analytics] Consistência de Motoristas**: Ajustada a agregação de dados para priorizar o status de motorista informado no requerimento (voluntariado) em relação ao cadastro geral.
- **[Core] Fallback de Efetivo**: Implementada integração com a lista completa do efetivo para preenchimento de metadados em registros de produtividade sem vínculo de voluntariado.

---

## v1.26.1 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Analytics] Correção de Corte Lateral (Layout Responsivo)**:
  - Expandida a largura máxima do container para **1350px**.
  - Habilitado **scroll horizontal nativo** no painel da tabela para evitar corte de conteúdo.
  - Compactação de colunas (redução de padding de `1rem` para `0.75rem`) e redução do tamanho da fonte para melhor adequação de dados.

---

## v1.26.0 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Rebranding]**: Concluída a transição de toda a identidade visual e textual de "Força Tarefa" para **GSVR** em todo o ecossistema (frontend, backend, documentação e scripts).
- **[Analytics] Otimização da Coluna de Progresso**: Ajustado o layout, alinhamento e espaçamento da barra de progresso para melhorar a legibilidade.

---

## v1.25.0 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Core] Integração Granular de Motoristas**: Suporte ao status de condutor por turno de disponibilidade.
- **[Importação] Refatoração da Rotina de PDFs**: Identificação automática de condutores e correção de bug no ID do ciclo.
- **[UI/UX] Inteligência de Escala**: Selo "MOT" dinâmico e formatação humanizada de ciclos operacionais.

---

## v1.24.0 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Requerimentos] Cancelamento de Disponibilidade**: Implementada nova funcionalidade para cancelar a disponibilidade de militares no gerenciador de requerimentos.
  - **Botão de Cancelar**: Adicionado ícone `Ban` na coluna de ações para desativar disponibilidade de voluntários.
  - **Modal de Confirmação Completo**: Replicada a lógica do modal de edição para exibir dados completos do militar (Nº Ordem, Posto, Nome, Telefone, Motorista) e a grade visual de disponibilidade que será cancelada.
  - **Indicadores Visuais Distintos**:
    - Turnos ativos a serem cancelados: fundo vermelho com "X" branco.
    - Turnos já cancelados: fundo vermelho claro com "X" riscado (`line-through`) e opacidade reduzida.
    - Linhas de requerimentos cancelados na tabela: fundo avermelhado, borda inferior vermelha e opacidade 0.7.
  - **Badge "CANCELADO"**: Selo vermelho exibido na coluna de turnos para requerimentos com disponibilidade inativa.
  - **Backend Aprimorado**:
    - Endpoint `PUT /api/volunteers/:id/cancel-availability` com validação de existência do requerimento.
    - Query otimizada para retornar `availability_completa` (array de objetos com `turno` + `ativo`) além da `availability` ativa.
    - Campo `ativo` calculado via `COALESCE(BOOL_OR(ativo), TRUE)` para correta identificação do estado.
  - **Atualização Local**: Após cancelamento bem-sucedido, a lista é recarregada automaticamente sem refresh da página.
  - **Endpoint PUT para Edição**: Adicionado `PUT /api/volunteers/:id` para suportar edição completa de requerimentos (atualiza efetivo e reconstrói disponibilidade).

---

## v1.23.4 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Otimização Espacial do Modal**:
  - Ajuste de preenchimento (padding) do cabeçalho de filtros para `0.5rem 2rem`, reduzindo o espaço vertical e permitindo maior visibilidade do grid de militares.
  - Consolidação final do layout de duas linhas no modal de voluntários (Busca superior + Filtros inferiores).

---

## v1.23.3 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Identificação de Motoristas no Modal**:
  - Ajustada a lógica de exibição do badge "MOT" no modal de seleção para considerar o campo `motorista` proveniente do banco de dados.
  - Sincronização de dados garantida ao verificar múltiplas propriedades (`motorista` e `id_funcao`) para identificar militares qualificados como condutores.

---

## v1.23.2 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Reestruturação de Filtros no Modal**:
  - Barra de busca movida para uma linha superior exclusiva (Full Width).
  - Agrupamento de filtros operacionais (Dia, Turno, Duração, Horário) em uma segunda linha horizontal.
  - Alinhamento do selo de disponibilidade militar ("Disponíveis") na mesma linha dos filtros.
  - Inclusão de rótulos (labels) informativos para cada seletor de filtro no modal.

---

## v1.23.1 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Realocação de Controles de Escala**:
  - Seletores de "Duração" e "Horário" movidos do corpo do card para o modal de seleção/edição.
  - No dashboard principal, as informações de Duração e Horário são agora exibidas apenas como badges estáticos no cabeçalho do card, limpando a interface.
  - Sincronização de estado aprimorada para permitir edição de guarnições existentes diretamente pelo modal.

---

## v1.23.0 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Otimização de Densidade (Cards Compactos)**:
  - Redução de paddings e fontes nos cards de guarnição para melhor aproveitamento de tela.
  - Ajuste da grade (Grid) para `minmax(320px)` permitindo mais guarnições por linha.
  - Design dos slots militares refinado para ser mais denso:
    - Redução de altura mínima de slots vazios (`80px` -> `60px`).
    - Redução de ícones e espaçamentos internos.
  - Harmonização de raios de borda (`borderRadius`) para um visual mais coeso e compacto.

---

## v1.22.1 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Refinamento da Sidebar**:
  - Reagrupamento dos botões de ação: "Imprimir" agora está próximo de "Salvar" e "Nova Guarnição".
  - Atualização cromática semântica:
    - Botão "Nova Guarnição" alterado para **Verde** (Linear Gradient).
    - Botão "Imprimir Escala" alterado para **Cinza Neutro** operacional.
  - Ajustes de margem e padding para melhor equilíbrio visual.

---

## v1.22.0 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Layout] Evolução para Sidebar Lateral**:
  - Transformação do cabeçalho horizontal em uma Sidebar fixa moderna (`v2-sidebar`).
  - Reorganização vertical de controles (Filtros, Ciclos, Disponibilidade).
  - Agrupamento de ações principais ("Nova Guarnição", "Salvar Escala") lateralmente.
  - Implementação de área de conteúdo principal independente com scroll próprio.
  - Ajustes de responsividade para transição suave entre Sidebar e Top Header em telas menores.

---

## v1.21.0 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Modal de Seleção e Header Responsivo**:
  - Implementação de cabeçalho totalmente responsivo com agrupamento inteligente de controles.
  - Adição de dropdowns de Duração e Horário diretamente no modal de criação de guarnição.
  - Introdução de etiquetas visuais nos cards de militares: "FORA DO TURNO" e "MOT" (motorista).
  - Escala de cores dinâmica para contagem de serviços: Verde (seguro), Laranja (alerta) e Vermelho (limite).
  - Correção de erro de sintaxe no cabeçalho do modal.

---

## v1.20.2 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Bug Fix Central] Remoção da Persistência Precoce**: Corrigido bug crítico onde o sistema realizava o `INSERT` no banco de dados automaticamente após confirmar seleções no modal ou trocar funções.
  - Removidas as chamadas automáticas de `saveSchedule` que ocorriam "nos bastidores" sem autorização do usuário.
  - O fluxo agora é estritamente manual: as alterações ficam apenas em memória até que o botão principal **"Salvar"** seja clicado.
  - Resolvido o problema de duplicação de registros causado pelo salvamento automático seguido do salvamento manual.

---

## v1.20.1 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Fix] Correção de Erro de Estrutura Circular**: Resolvido o erro `Converting circular structure to JSON` que impedia o salvamento das guarnições no banco.
  - A falha ocorria porque o objeto de evento do clique no botão "Salvar" era passado por engano para a função de persistência, que tentava serializá-lo para o servidor.
  - Implementada uma camada defensiva na função `saveSchedule` que valida o tipo de dado recebido antes de processar.
  - Corrigido o handler `onClick` no dashboard para garantir chamadas limpas sem objetos de evento.

---

## v1.20.0 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Core] Refatoração da Integridade de Dados e Tabela Ternária**: Correção crítica nos relacionamentos entre Planejamento e Execução.

  - **Fim da Perda de Dados no Startup**: Removido o comando `DROP TABLE` que reiniciava a tabela `ESCALA_EFETIVO_SERVICO` a cada reinicialização do servidor. Agora utiliza `CREATE TABLE IF NOT EXISTS`.
  - **Relacionamentos Atômicos**: Implementadas transações SQL (`BEGIN`/`COMMIT`) na rota de salvamento de escalas para garantir que o planejamento e seus vínculos ternários sejam criados de forma indissociável.
  - **Triggers Inteligentes (Merge)**: Aprimorada a trigger `trg_planejamento_ternaria` no banco de dados para detectar e vincular execuções pré-existentes ao novo planejamento, evitando registros duplicados ou órfãos.
  - **Persistência de Histórico**: Alterada a regra de exclusão para `ON DELETE SET NULL` em vínculos de escala, garantindo que registros de serviço já executados não sejam apagados acidentalmente ao se alterar o planejamento diário.

---

## v1.19.10 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Back-end] Correção no Agrupamento de Guarnições**: Resolvido o bug crítico onde equipes diferentes com o mesmo nome (ex: duas "GSVR") eram mescladas em um único card no dashboard.
  - Agrupamento Inteligente: O sistema agora detecta colisões de cargos (ex: dois comandantes para o mesmo recurso) e separa automaticamente as equipes em cards distintos.
  - Sincronização Precisa: Garante que 100% dos militares escalados no banco de dados sejam visíveis no dashboard, preservando a autonomia de cada equipe planejada.

---

## v1.19.9 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Design] Refinamento Premium do Card de Guarnição**: Atualizado o layout dos cards para uma estética moderna, profissional e "Wowed".
  - Implementada transição suave com elevação (`translateY`) e sombras profundas dinâmicas ao interagir com o card.
  - Header modernizado com o novo `primaryGradient` e botões de ação (Lixeira) em estilo glassmorphism (vidro fosco).
  - Escaneabilidade Aprimorada: Ajustes em tipografia, bordas (28px) e espaçamentos para uma leitura mais confortável da equipe.
  - Micro-animações e feedbacks visuais nos slots vazios para uma experiênca mais fluida.

---

## v1.19.8 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Sincronização] Integridade Total com o Banco**: Refatorada a lógica de salvamento para garantir que o dashboard sempre reflita exatamente o estado persistido no banco de dados.
  - Implementada recarga automática dos dados (`loadSchedule`) imediatamente após qualquer salvamento (troca de função ou substituição de integrante).
  - Otimização do fluxo de dados: As atualizações agora passam os dados diretamente para a persistência, eliminando delays e garantindo que o que você vê é o que foi salvo.
  - Sincronização em tempo real: Qualquer alteração no banco de dados é refletida no dashboard após cada ação administrativa.

---

## v1.19.7 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Usabilidade] Data Inicial Dinâmica**: O dashboard administrativo agora inicializa automaticamente na data atual do sistema, facilitando o gerenciamento imediato da escala do dia.

---

## v1.19.6 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Ações Rápidas] Substituição Direta de Integrante**: Implementada a funcionalidade de substituição individual de militares diretamente nos cards de guarnição.
  - O ícone "X" (Remover) foi ressignificado para "Substituir", disparando o modal de seleção de voluntários para a vaga específica.
  - Inteligência de Seleção: No modo de substituição, o modal limita a escolha a apenas 1 militar, simplificando o fluxo de troca.
  - Persistência Instantânea: A substituição realiza o UPDATE automático no banco de dados, mantendo a função e o id_escala originais.
  - Feedback de Processamento: O card exibe o indicador de salvamento durante a troca para garantir a confirmação visual.

---

## v1.19.5 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UX/Interatividade] Gestão Dinâmica de Funções**: Implementada a funcionalidade de alteração de funções (Comandante, Motorista, Patrulheiro) diretamente nos cards de guarnição.
  - Rótulos de função transformados em dropdowns interativos para agilizar ajustes.
  - Sistema de salvamento automático disparado instantaneamente ao alterar uma função.
  - Proteção visual: Adicionado indicador de carregamento (overlay com blur e spinner) em cada card individual durante o processo de sincronização com o banco.
  - Integridade: Lógica de troca (swap) automática que mantém sempre um profissional exclusivo por função na guarnição.

---

## v1.19.4 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Escalabilidade] Exclusão de Guarnições**: Implementada a exclusão física de guarnições planejadas diretamente no banco de dados.
  - Adicionado endpoint `DELETE /api/schedules/patrol` para remoção atômica de todos os membros de uma guarnição.
  - Implementada validação de integridade referencial: o sistema impede a exclusão se houver serviços já executados ou finalizados vinculados à guarnição.
  - Integração no frontend com retorno automático dos militares ao banco de voluntários após a exclusão bem-sucedida.

---

## v1.19.3 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Regra de Negócio] Limite de Serviços**: Implementada validação para exibir no pool apenas militares que possuam até 7 serviços executados no ciclo selecionado. Aqueles que atingiram o limite de 8 serviços são automaticamente ocultados para respeitar a cota operacional.

---

## v1.19.2 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI] Dropdown de Datas**: Adicionado o nome do mês abreviado ao seletor de datas do dashboard administrativo (ex: "Dia 02/Abr (Qui.)"), facilitando a identificação de dias em ciclos que abrangem mais de um mês.
- **[Bug Fix] Erro de Tela Branca**: Corrigido um `ReferenceError` que causava tela branca ao abrir o modal de seleção de voluntários devido a uma referência obsoleta a `selectedMonth`.

---

## v1.19.1 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UX] Meses por Extenso**: Refinada a exibição de ciclos para utilizar nomes de meses por extenso (ex: "Março / Abril - 2026") em vez de numéricos, melhorando a clareza para os gestores.
- **[Backend] Lógica SQL Nativa**: Implementada tradução de meses utilizando `CASE` nativo no PostgreSQL para garantir performance e consistência de idioma.

---

## v1.16.0 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[UI/UX] Redesign Premium do Dashboard Administrativo**: Refatoração completa da interface `AdminDashboardV2` com estética moderna (glassmorphism), paleta de cores harmonizada e tipografia aprimorada.
- **[Frontend] Otimização de Guarnições**: Novos cartões de guarnição com sombras suaves, gradientes e indicadores de status refinados.
- **[Frontend] Melhoria no 'Drag and Drop'**: Feedback visual aprimorado durante o arraste de militares e slots de destino mais intuitivos.
- **[UI] Modal de Seleção Renovado**: Interface de busca de voluntários modernizada com cartões informativos e contadores de serviço integrados.

---

## v1.15.3 — 2026-04-12
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Database] Reversão de Ciclos Opcionais**: Restaurada a obrigatoriedade da coluna `id_ciclo` na tabela `SERVICOS_EXECUTADOS`, garantindo que todo serviço executado esteja vinculado a um ciclo operacional validado.
- **[Backend] Validação de Ciclo em Importação**: Revertida a flexibilidade da rota `/api/servicos/import`. Agora o sistema exige um ciclo de referência válido e interrompe a importação de registros sem correspondência.
- **[Frontend] Bloqueio de Importação sem Ciclo**: Atualizada a interface `ServicosImport.jsx` para exigir obrigatoriamente a seleção do ciclo de referência antes de permitir o upload de planilhas.

---
