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
- **[Back-end] Correção no Agrupamento de Guarnições**: Resolvido o bug crítico onde equipes diferentes com o mesmo nome (ex: duas "FORÇA TAREFA") eram mescladas em um único card no dashboard.
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
  - Micro-animações e feedbacks visuais nos slots vazios para uma experiência mais fluida.

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

## v1.19.0 — 2026-04-12

## v1.18.2 — 2026-04-12

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
