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
