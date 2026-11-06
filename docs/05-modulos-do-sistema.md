# 05. Módulos Funcionais e Telas do Sistema

## 1. Visão Geral da Interface

O **GSVR** disponibiliza uma interface rica, responsiva e de alta densidade de informação construída em React 18, segmentada por permissões de acesso:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          GSVR — 9º BPM / PMAL                          │
├─────────────────┬──────────────────────────────────────────────────────┤
│ 1. OPERACIONAL  │ • Minhas Escalas (Pessoal)                           │
│                 │ • Planejamento de Escala (AdminDashboardV2)          │
│                 │ • Histórico do Militar & Dossiê                      │
│                 │ • Gestão de Requerimentos & Importação PDF           │
│                 │ • Serviços Executados & Faturamento                  │
│                 │ • Conferência Operacional (Planejado x Executado)    │
├─────────────────┼──────────────────────────────────────────────────────┤
│ 2. DASHBOARDS   │ • Estatísticas Analíticas & Gráficos Operacionais    │
│                 │ • Dashboard Financeiro & Previsão Orçamentária       │
│                 │ • Metas de Alocação (Cenários A/B)                   │
│                 │ • Quantitativo e Gastos da Força-Tarefa              │
├─────────────────┼──────────────────────────────────────────────────────┤
│ 3. CONFIGURAÇÃO │ • Configuração de OPMs Subordinadas                  │
│                 │ • Gerenciamento de Ciclos (16 a 15)                  │
│                 │ • Tipos de Serviço & Valores de Diárias              │
│                 │ • Gestão de Efetivo & Importação Excel               │
│                 │ • Gestão de Usuários & Bloqueio                      │
│                 │ • Controle de Acesso (RBAC Roles e Permissões)       │
├─────────────────┼──────────────────────────────────────────────────────┤
│ 4. TÉCNICO      │ • Painel Técnico Superuser (Auditoria & Diagnóstico) │
│                 │ • Perfil Pessoal & Troca de Senha                    │
└─────────────────┴──────────────────────────────────────────────────────┘
```

---

## 2. Detalhamento dos Módulos Principais

### 2.1. Planejamento de Escala (`AdminDashboardV2.jsx`)
O coração operacional do sistema para a Seção de Planejamento (P/3):
- **Painel Drag-and-Drop (DND)**:
  - Permite arrastar militares do "Banco de Voluntários" lateral e soltá-los diretamente nos slots de guarnição (Comandante, Motorista, Patrulheiro).
  - Algoritmo de resolução de colisão: previne que um militar seja inserido em duas viaturas no mesmo turno.
  - Indicadores de cota: Militares que atingem o teto de 8 serviços recebem a badge `(8/8)` e são destacados em cinza.
- **Banco de Voluntários com Filtros Avançados**:
  - Filtro por disponibilidade real no dia/turno selecionado.
  - Toggle para "Mostrar Indisponíveis" para permitir alocações de contingência excepcional por administradores autorizados.
  - Busca nominal dinâmica por Nome Completo, Nome de Guerra, Posto/Graduação ou Matrícula.
- **Modal de Detalhes do Militar**:
  - Matriz visual completa de 30/31 dias com os 4 turnos diários (T1 a T4), destacando em Azul (Disponível), Verde (Executado) e Vermelho (Desistência).
  - Tabela com rolagem horizontal e coluna de turnos congelada à esquerda (`position: sticky`).
- **Publicação Oficial & Memorando SVR**:
  - Botão de publicação com geração de pré-visualização A4 no padrão formal da PMAL.
  - Exportação direta para **PDF** de alta resolução e layout de impressão otimizado via CSS media print.

### 2.2. Portal do Militar — "Minhas Escalas" (`MinhasEscalas.jsx`)
Área privativa acessível a todos os militares da corporação:
- **Quadro de Próximos Serviços**: Exibe data, turno, prefixo da viatura, equipe escalada e local de embarque.
- **Extrato do Ciclo**: Acompanhamento da contagem de escalas realizadas vs. cota restante (ex: `4/8 serviços utilizados`).
- **Declaração de Voluntariado**: Visualização e atesto dos turnos assinalados no requerimento vigente.

### 2.3. Gestão de Ciclos (`CicloManager.jsx`)
Configuração e controle dos períodos operacionais:
- Definição das datas de início e término (padrão dia 16 a 15).
- Entrada do orçamento global previsto (ex: R$ 85.000,00) e reserva de contingência (ex: 5%).
- Ajuste do limite máximo diário de guarnições (ex: teto de 6 viaturas/dia).
- Bloqueio e encerramento de ciclos para impedir edições retroativas após homologação da folha.

### 2.4. Metas de Alocação (`MetasAlocacaoManager.jsx`)
Interface de visualização e calibração do motor de otimização orçamentária:
- Exibição do calendário do ciclo com classificação automática dos dias entre **Cenário A** (R$ 576,09/equipe) e **Cenário B** (R$ 750,00/equipe).
- Botão para acionar a função `recalculateMetas(id_ciclo)`: recalcula instantaneamente a distribuição de viaturas para os dias restantes com base no orçamento real executado até a data atual.

### 2.5. Gestão de Efetivo & Importação (`EfetivoManager.jsx` & `EfetivoImport.jsx`)
- **Cadastro Individual**: Registro de postos, matrículas, CPFs, nomes de guerra, contatos e habilitação para viatura (`motorista`).
- **Importação em Lote via Excel**:
  - Leitor inteligente de planilhas `.xlsx` e `.xls` fornecidas pela Diretoria de Pessoal da PMAL.
  - Sanitização automática de postos e graduações com a função `normalizeRank()` (ex: conversão uniforme de variações como "1 SGT", "1º Sargento", "PRIMEIRO SGT" para "1º SGT PM").

### 2.6. Importação e Extração de Requerimentos PDF (`RequerimentosAdmin.jsx`)
- Módulo integrado com `PdfExtractor.js` e `RequirementImporter.js`.
- Upload de arquivos PDF individuais ou em lote (requerimentos de voluntariado).
- Extração automática via heurística de texto: identifica o militar, a competência e lê a matriz de "X" nos dias 1 a 31 nos 4 turnos.
- Validação criptográfica contra arquivos duplicados via hash **SHA-256**.

### 2.7. Conferência Operacional (`ConferenciaOperacional.jsx`)
Cruzamento analítico entre a escala que foi **Planejada** e o serviço que foi efetivamente **Cumprido**:
- Detecção de substituições e permutas de serviço em campo.
- Registro de faltas justificadas (atestados) e faltas não justificadas.
- Conciliação para atesto da folha de pagamento pelo Comandante da OPM.

### 2.8. Dashboards Financeiros e Analíticos (`FinanceiroDashboard.jsx` & `AnalyticsDashboard.jsx`)
- **Curva de Consumo Orçamentário**: Gráficos demonstrando a queima financeira real vs. prevista ao longo do ciclo.
- **Distribuição de Recursos por Subunidade**: Comparativo de custos entre companhias e pelotões destacados.
- **Estatísticas de Voluntários**: Ranking de policiais mais empenhados, turnos com maior demanda e dias com déficit de voluntários.

### 2.9. Gestão de Usuários & RBAC (`UserManager.jsx` & `RolesManager.jsx`)
- Controle de contas com filtros por status (`ativo`, `bloqueado`, `pendente_primeiro_acesso`).
- Ferramenta para **desbloqueio manual de contas** travadas por excesso de tentativas incorretas.
- Ação administrativa de **Reset de Primeiro Acesso**: permite que o operador autorize a redefinição segura de senha de um policial que perdeu acesso.
- Editor de Papéis: criação e customização de papéis com marcação modular de permissões.

### 2.10. Painel Técnico Superuser (`SuperUserDashboard.jsx`)
Console restrito a administradores técnicos com papel `SUPERUSER`:
- **Observabilidade de Infraestrutura**: Monitoramento em tempo real do uso de memória RAM do processo Node.js, tempo de atividade (uptime) e conexões ativas no pool do PostgreSQL.
- **Visualizador de Trilha de Auditoria**: Leitor de eventos da tabela `audit_logs` com filtros por período, tipo de evento (`LOGIN_FAILED`, `SUPERUSER_ACTION`, etc.) e CPF.
- **Diagnóstico do Banco**: Verificação de integridade referencial, contagem de registros por tabela e detecção de registros órfãos.
