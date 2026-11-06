# 01. Visão Geral e Regras de Negócio

## 1. Contexto Institucional

O **GSVR (Gestão de Serviço Voluntário Remunerado)** é a plataforma integrada de planejamento operacional, gestão de efetivo militar e controle orçamentário desenvolvida para o **9º Batalhão de Polícia Militar do Estado de Alagoas (9º BPM/PMAL)**, sediado em Delmiro Gouveia/AL e responsável pelo policiamento ostensivo e preservação da ordem pública em múltiplos municípios do Alto Sertão alagoano.

No âmbito da corporação, o **Serviço Voluntário Remunerado (SVR)** — historicamente referenciado como Força-Tarefa (FT) ou escala extraordinária voluntária — constitui um mecanismo legal que possibilita aos policiais militares da ativa prestarem serviço operacional em seus períodos de folga regulamentar, sendo devidamente indenizados pelo Estado de Alagoas com base em diárias e turnos prefixados.

---

## 2. O Problema Operacional e Objetivos do Sistema

Antes da concepção do GSVR, a gestão do SVR enfrentava gargalos complexos:
1. **Conflito de Disponibilidade e Duplicidade**: Militares escalados em dias ou horários em que não haviam manifestado voluntariado ou escalados simultaneamente no serviço ordinário da OPM.
2. **Superação de Limites Legais**: Dificuldade em controlar rigorosamente o teto legal de serviços por policial militar em cada ciclo operacional.
3. **Desequilíbrio Orçamentário**: Descompasso entre a verba mensal destinada pelo Comando Geral e a quantidade diária de equipes em campo, gerando esgotamento prematuro de recursos antes do encerramento do ciclo.
4. **Morosidade na Publicação**: Demora na confecção manual de boletins internos, memorandos e folhas de pagamento do SVR.

O GSVR foi concebido para resolver integralmente esses problemas através de:
- **Reserva de voluntariado com trava sistêmica no banco de dados**;
- **Painel dinâmico Drag-and-Drop** para alocação rápida de equipes e viaturas;
- **Motor de Otimização Orçamentária** diária com respeito a dias ordinários e críticos (finais de semana e feriados);
- **Geração automatizada de Memorandos A4 oficiais** e arquivos de conferência de presença e pagamento.

---

## 3. Conceitos Fundamentais de Negócio

### 3.1. O Ciclo Operacional (Regra dos Dias 16 a 15)

Diferente do mês civil tradicional (dia 01 ao dia 30/31), os ciclos operacionais do SVR no 9º BPM são calculados entre o **dia 16 de um mês civil** e o **dia 15 do mês subsequente**:

```
Mês Civil (Ex: Julho): 01/07 ────────────────────────────── 31/07
                             │                             │
Ciclos Operacionais:         ▼                             ▼
Ciclo Junho/Julho:   [16/06 ──── 15/07]
Ciclo Julho/Agosto:                [16/07 ──── 15/08]
```

#### Motor de Fragmentação de Ciclos (`CycleEngine`)
Como os policiais militares costumeiramente preenchem formulários de voluntariado referentes ao mês civil (ex: "Requerimento de Julho"), o sistema possui um motor dedicado (`CycleEngine.js`) que fragmenta automaticamente a disponibilidade do policial:
- **Dias 01 a 15**: Pertencem ao segmento final do **Ciclo Anterior** (Junho/Julho).
- **Dias 16 a 31**: Pertencem ao segmento inicial do **Ciclo Corrente** (Julho/Agosto).

Isso garante que cada turno assinalado seja contabilizado exatamente no orçamento e nas metas do ciclo correto.

---

### 3.2. Cota Máxima de Serviços (Regra do Limite 8)

Por regulamentação militar e segurança do trabalho policial, vigora o teto estrito:
> **Regra:** Nenhum policial militar pode executar mais de **8 (oito) serviços de SVR** dentro de um mesmo ciclo operacional.

- **Impacto no Sistema:**
  - O banco de dados calcula dinamicamente o somatório de escalas planejadas e serviços executados de cada militar.
  - No painel de planejamento (`AdminDashboardV2.jsx`), quando um policial atinge 8 escalas no ciclo, ele recebe um selo visual de **"Limite Atingido (8/8)"** e é automaticamente omitido da lista de voluntários aptos para novas escalas.
  - Há opção de filtro para administradores visualizarem militares indisponíveis para fins de consulta e auditoria.

---

### 3.3. Composição de Guarnições e Papéis Táticos

Cada equipe (patrulha/guarnição) empenhada em viatura operacional é composta estritamente por funções táticas específicas:

```
┌────────────────────────────────────────────────────────┐
│              GUARNIÇÃO DE FORÇA-TAREFA                 │
├────────────────────────────────────────────────────────┤
│ 1. COMANDANTE   → Oficial, Subtenente ou Sargento mais │
│                   antigo da equipe (Liderança).        │
│ 2. MOTORISTA    → Militar habilitado e credenciado     │
│                   para condução de viatura policial.   │
│ 3. PATRULHEIRO  → Militar responsável pela segurança,  │
│                   comunicações e apoio tático.         │
└────────────────────────────────────────────────────────┘
```

#### Regras de Integridade de Equipe:
1. **Unicidade de Função**: Uma guarnição não pode possuir dois Comandantes ou dois Motoristas. Se um militar for arrastado para uma posição já ocupada, o sistema aciona resolução de colisão ou troca de posições.
2. **Habilitação de Motorista**: O sistema sinaliza no cadastro (`EFETIVO.motorista = true`) quais policiais são legalmente autorizados a assumir a função de condutor.

---

### 3.4. Turnos Operacionais Padronizados

Os turnos de serviço voluntário são divididos em 4 janelas diárias de 6 horas cada:

| Turno | Horário | Classificação Tática |
| :---: | :---: | :--- |
| **T1** | `07:00 ÀS 13:00` | Matutino / Feiras livres e centro comercial |
| **T2** | `13:00 ÀS 19:00` | Vespertino / Trânsito e saída escolar |
| **T3** | `19:00 ÀS 01:00` | Noturno I / Policiamento ostensivo e bares |
| **T4** | `01:00 ÀS 07:00` | Noturno II / Madrugada e áreas bancárias |

---

### 3.5. Modelagem Financeira e Cenários A e B

A remuneração do militar voluntário é regida por valores fixados pelo Governo Estadual:
- **Dia Ordinário (Cenário A)**: Segunda a Quinta-feira (não feriados).
  - Remuneração por Militar: **R$ 192,03**
  - Custo por Equipe (3 militares): **R$ 576,09**
- **Dia Crítico (Cenário B)**: Sexta-feira, Sábado, Domingo ou Feriados estaduais/nacionais.
  - Remuneração por Militar: **R$ 250,00**
  - Custo por Equipe (3 militares): **R$ 750,00**

#### Algoritmo de Otimização Orçamentária (`ScaleOptimizer`):
O motor em `ScaleOptimizationService.js` recebe o saldo orçamentário do ciclo, a lista de feriados cadastrados e o limite diário de viaturas (ex: máximo 6 viaturas/dia). Ele distribui o saldo em **6 camadas estratégicas**:
1. *Garantia Mínima Crítica*: Assegura pelo menos 1 equipe em todos os dias do Cenário B.
2. *Garantia Mínima Ordinária*: Assegura pelo menos 1 equipe em todos os dias do Cenário A.
3. *Reforço em Dias Críticos*: Eleva até 50% do teto diário nos fins de semana e feriados.
4. *Reforço em Dias Ordinários*: Eleva até 40% do teto diário nos dias úteis.
5. *Saturação em Dias Críticos*: Preenche até o limite total diário nos dias de maior incidência criminal (Cenário B).
6. *Saturação em Dias Ordinários*: Aloca o orçamento remanescente nos dias úteis (Cenário A).
