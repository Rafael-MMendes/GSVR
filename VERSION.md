## v1.32.39 — 2026-06-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Correção de Duplicação e Alinhamento de Páginas no PDF do Relatório Executivo**:
  - **[Frontend]** Corrigido o bug que causava a duplicação ou corte errôneo de títulos e elementos nas quebras de página do PDF em `FinanceiroDashboard.jsx`.
  - **[Frontend]** Ajustada a geração para forçar uma largura fixa temporária de `900px` (`windowWidth: 900`) e sincronizada a constante de altura de página A4 para `1270` pixels, garantindo um cálculo de espaçadores dinâmicos 100% alinhado com o renderizador `html2canvas`.

---

## v1.32.38 — 2026-06-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Nova Fórmula de Custo Médio por Militar**:
  - **[Frontend]** Implementada nova fórmula de cálculo para o Custo Médio por Militar no Dashboard e no PDF do Relatório Executivo: `(Soma dos valores dos serviços de 8h e 6h) ÷ (Quantidade de serviços executados × 3)`.
  - **[Frontend]** Atualizado o subtítulo explicativo do card para refletir a nova fórmula matemática de forma explícita.

---

## v1.32.37 — 2026-06-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Ajustes de Layout e Metadados do Relatório Executivo SVR**:
  - **[Frontend]** Implementado algoritmo de cálculo de espaçadores dinâmicos no PDF em `FinanceiroDashboard.jsx` (adicionando a classe `bloco-relatorio` a todas as seções) para prevenir quebras e cortes de elementos entre páginas.
  - **[Frontend]** Removido o campo "Responsável:" dos metadados da capa.
  - **[Frontend]** Alterado o campo "Órgão:" para "Setor: P1 - {OPM do ciclo}", utilizando a sigla da unidade do ciclo ativo dinamicamente.

---

## v1.32.36 — 2026-06-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Correção dos Indicadores Financeiros e Quantidade de Serviços**:
  - **[Backend]** Ajustados os endpoints `/api/financeiro/resumo` e `/api/financeiro/detalhado` para realizar a divisão por 3 da quantidade de serviços e nos detalhes por tipo, mantendo o valor total pago inalterado. A listagem de militares individuais manteve a contagem original de escalas.
  - **[Frontend]** Atualizadas as fórmulas dos cartões de custo médio: Custo Médio por Serviço (`total_gasto ÷ (total_registros ÷ 3)`) e Custo Médio por Militar (`total_gasto ÷ militares_unicos`), acompanhados de subtítulos descritivos e coerentes.
  - **[Frontend]** Revisado o painel de visualização e exportação do Relatório Executivo e o PDF exportado, garantindo o recálculo automático e a consistência de todas as contagens de serviço divididas por 3.

---

## v1.32.35 — 2026-06-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Validação de Cadastro e Status de Atividade na Importação de SVR**:
  - **[Backend]** Adicionadas validações no processamento de planilhas de SVR em `server.js` para rejeitar escalas direcionadas a militares inativos (`status_ativo = false`) ou não cadastrados (CPF inexistente).
  - **[Frontend]** Desenvolvido o resumo executivo detalhado de importação (processados, importados, inativos rejeitados, não cadastrados rejeitados, erros gerais) com banners informativos em `ServicosImport.jsx`.
  - **[Frontend]** Criado o Relatório de Inconsistências oficial na tela de resultados da importação, exibindo de forma clara o nome do militar, matrícula, unidade de origem, data e o motivo da rejeição do registro descartado.

---

## v1.32.34 — 2026-06-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Exibição Integral dos Gastos Diários no Relatório Executivo**:
  - **[Frontend]** Modificado o Relatório Executivo no `FinanceiroDashboard.jsx` para apresentar a totalidade da evolução diária dos gastos no ciclo, eliminando o limite anterior de 10 dias.
  - **[Frontend]** Integradas as novas métricas estratégicas (Horas Totais, Custo Médio e Projeção de Gastos) diretamente nas conclusões e tabelas do Relatório Executivo.

---

## v1.32.33 — 2026-06-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Resolução da Limitação de Serviços de 6 Horas e Melhorias Financeiras**:
  - **[Banco de Dados]** Adicionado script de migração corretivo que mapeia retroativamente a `carga_horaria` e resolve o `id_tipo_servico` correspondente na tabela `SERVICOS_EXECUTADOS` (corrigindo o vínculo errôneo que marcava escalas de 8h como tipo 6h).
  - **[Backend]** Corrigidos os endpoints de importação, inserção manual e edição de serviços para resolver dinamicamente o `id_tipo_servico` a partir da `carga_horaria` informada.
  - **[Frontend]** Enriquecida a visualização da aba "Visão Geral" do painel financeiro com gráficos CSS de distribuição das modalidades, projeção do final do ciclo com balanço estimado (economia/déficit previsto) e alertas gerenciais automatizados.
  - **[Frontend]** Adicionados novos indicadores estratégicos de Custo Médio por Serviço, Custo Médio por Militar e Horas Totais Trabalhadas.

---

## v1.32.32 — 2026-06-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Correção na Exclusão de Militares (CRUD Efetivo)**:
  - **[Backend]** Corrigida a rota `DELETE /api/efetivo/:id` em `server.js` para de fato executar a deleção na tabela `EFETIVO` após excluir o login correspondente da tabela `users`.

---

## v1.32.31 — 2026-06-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Relatório Executivo Financeiro do SVR**:
  - **[Frontend]** Adicionado o novo painel de visualização e exportação "Relatório Executivo" no `FinanceiroDashboard.jsx`.
  - **[Frontend]** Implementado layout A4 institucional contendo Capa, Sumário, Resumo Executivo, Visão Geral Consolidada, Análise Detalhada, Achados Relevantes, Recomendações Estratégicas, Conclusão e Anexos.
  - **[Frontend]** Adicionada funcionalidade de exportação dinâmica em PDF de alta qualidade e com quebras de página controladas via `html2canvas` e `jsPDF`.

---

## v1.32.30 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Formatação Monetária no Memorando SVR**:
  - **[Frontend]** Substituídas as formatações manuais de valor por chamadas à função `formatarValor` no layout A4 do memorando em `AnalyticsDashboard.jsx`. Isso assegura que todos os montantes financeiros (valores individuais de serviço, total acumulado de cada militar, débitos por OPM, recurso geral utilizado e limite orçamentário) sejam exibidos no formato oficial de Real Brasileiro (`R$ 1.234,56`) com separadores de milhares e decimais corretos.

---

## v1.32.29 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Correção de Sobreposição nos Metadados do Memorando SVR**:
  - **[Frontend]** Reestruturado o cabeçalho de metadados em `AnalyticsDashboard.jsx` (Número do Memorando e Data/Localização) para ocupar linhas individuais sequenciais em vez de colunas flexíveis horizontais. Isso evita completamente a colisão e sobreposição de textos quando o número do memorando é muito extenso.

---

## v1.32.28 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Prevenção de Quebras de Página no Bloco Final do Memorando SVR**:
  - **[Frontend]** Envelopado todo o bloco final do memorando (relação de débitos, parágrafo orçamentário adicional, termo de encerramento e assinaturas) em uma única `div` com a classe `bloco-militar-memo`. Isso garante que o bloco final seja analisado em conjunto pelo script de cálculo de limites da folha A4 e seja empurrado para a próxima página integralmente caso ultrapasse a borda, evitando a quebra indesejada do encerramento e da assinatura como mostrado na imagem.

---

## v1.32.27 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Refinamento do Memorando SVR**:
  - **[Frontend]** Removida a coluna `CMD` da tabela de serviços executados no memorando SVR em `AnalyticsDashboard.jsx`.
  - **[Frontend]** Removido o botão "Imprimir Memorando" dos controles laterais do gerador.
  - **[Frontend]** Implementado algoritmo de quebra de página dinâmico no `handleDownloadPDF` para calcular a altura dos blocos militares (`bloco-militar-memo`) e inserir espaçadores transparentes temporários, prevenindo que uma tabela fique cortada ao meio entre duas páginas no arquivo PDF final.

---

## v1.32.26 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Padronização Visual do Memorando SVR**:
  - **[Frontend]** Padronizado o estilo visual, fontes (`Inter`), linhas e tabelas do gerador de memorando em `AnalyticsDashboard.jsx` para seguir os padrões do módulo de publicação de escala (`EscalaPublicacaoOficial.jsx`).
  - **[Frontend]** Substituído o logotipo provisório em CSS do memorando pelo brasão oficial da Polícia Militar (`/pmal.png`).

---

## v1.32.25 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Correção da Identificação de OPM no Memorando SVR**:
  - **[Frontend]** Normalizado o filtro de OPMs no `AnalyticsDashboard.jsx` para aceitar tanto a grafia com o caractere "º" (`9º BPM`) quanto com o caractere "o" (`9o BPM`). Isso corrige a listagem de militares no memorando SVR quando executam serviço em outras unidades.

---

## v1.32.24 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Resolução de Erro de Execução no Print do Memorando**:
  - **[Frontend]** Corrigido erro de referência `handlePrint is not defined` no componente `AnalyticsDashboard.jsx` ao declarar a função `handlePrint` que aciona a impressão da folha.

---

## v1.32.23 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Resolução de Tela Branca no Publicador de Memorando**:
  - **[Frontend]** Corrigido erro de referência `selectedCicloText is not defined` no componente `AnalyticsDashboard.jsx` ao declarar e unificar a constante com os seletores da interface.

---

## v1.32.22 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Publicador de Memorando SVR Oficial**:
  - **[Frontend]** Adicionado botão "Publicar Memorando SVR" no cabeçalho do `AnalyticsDashboard.jsx`.
  - **[Frontend]** Desenvolvido modal interativo com painel de visualização A4 do memorando oficial para consolidação de serviços executados fora do 9º BPM.
  - **[Frontend]** Implementado suporte a edição in-line (contentEditable) das informações no próprio layout da folha, geração de PDF nativa (via jsPDF/html2canvas) e formatação otimizada para impressão.

---

## v1.32.21 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Reorganização de Colunas em Serviços Executados**:
  - **[Frontend]** Invertidas as posições das colunas "Militar" (Nome) e "Posto" em `ServicosExecutadosManager.jsx` para exibir a patente primeiro, renomeando o cabeçalho para "Posto/Grad".

---

## v1.32.20 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Ordenação padrão por Posto/Graduação**:
  - **[Frontend]** Alterada a ordenação padrão inicial da grade de requerimentos em `RequerimentosAdmin.jsx` para ordenar por senioridade militar (Posto/Grad).
  - **[Frontend]** Ajustada a ordenação primária no `HistoricoMilitar.jsx` para priorizar a senioridade militar (Posto/Grad) e usar a quantidade de serviços executados como critério secundário.

---

## v1.32.19 — 2026-06-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Ajuste na contagem e exibição de disponibilidade**:
  - **[Frontend]** Modificado o grid no componente RequerimentosAdmin.jsx para exibir "Dias Disponíveis" no cabeçalho.
  - **[Frontend]** Alterada a lógica de contagem e ordenação da grade para considerar dias únicos de disponibilidade (cada dia com 1 a 4 turnos selecionados conta como exatamente 1 dia de disponibilidade).

---

## v1.32.18 — 2026-06-03
**Autor:** Alan Kleber
**Email:** alan.kms@gmail.com

### Mudanças:
- **Exibição de Serviços Executados sem Disponibilidade Registrada**:
  - **[Backend]** Modificado o endpoint `/api/reports/disponibilidade-grid` para gerar sinteticamente os 4 turnos diários na cor verde para qualquer dia contendo serviços executados (planejados ou não planejados), mesmo que o militar não tenha cadastrado disponibilidade para esse dia.
  - **[Backend]** Atualizado o campo `availability_completa_json` no relatório de voluntários para incluir turnos gerados dinamicamente para dias com serviço executado sem disponibilidade registrada.

---

## v1.32.17 — 2026-06-03
**Autor:** Alan Kleber
**Email:** alan.kms@gmail.com

### Mudanças:
- **Correção da Grade de Disponibilidade**:
  - **[Database/Backend]** Correção do script de migração em `backend/db.js` para alinhar as datas de disponibilidade com os limites de início/fim do ciclo operacional correspondente.
  - **[Database]** Executado script corretivo `corrigir_datas.sql` diretamente no contêiner do banco de dados no servidor VPS, corrigindo retroativamente **621 registros** de disponibilidade com datas corrompidas.

---

## v1.32.16 — 2026-06-03
**Autor:** Alan Kleber
**Email:** alan.kms@gmail.com

### Mudanças:
- **Resolução de Requerimentos Duplicados**:
  - **[Database]** Adicionada a constraint de unicidade `uq_requerimentos_militar_ciclo` (`UNIQUE(id_militar, id_ciclo)`) na tabela `REQUERIMENTOS` para impedir a existência de múltiplas grades de disponibilidade para o mesmo militar no mesmo ciclo.
  - **[Database]** Executado script de migração para fundir automaticamente as disponibilidades e redirecionar escalas planejadas dos requerimentos duplicados existentes para o registro principal, eliminando as redundâncias no banco de dados.

---

## v1.32.15 — 2026-06-03
**Autor:** Alan Kleber
**Email:** alan.kms@gmail.com

### Mudanças:
- **Refatoração estrutural de datas de disponibilidade (SVR)**:
  - **[Database] Migração para data completa**: Alterado o tipo de `disponibilidade_requerimento.dia_mes` de `INTEGER` para `DATE` para representação temporal absoluta de cada turno de disponibilidade. Criado script de migração segura e automatizada que converte os inteiros legados para datas reais baseado no `mes_referencia` e data de solicitação dos requerimentos existentes.
  - **[Database] Remoção da coluna redundante**: Removida a coluna `requerimentos.mes_referencia` do banco de dados, eliminando dados duplicados.
  - **[Backend] Motor de ciclos absoluto**: `CycleEngine.js` e `RequirementImporter.js` atualizados para trabalhar nativamente com chaves de data absoluta (`YYYY-MM-DD`).
  - **[Backend] Adaptação de Queries e APIs**: Atualizadas as queries de desistências, relatórios operacionais, grade de disponibilidade e cadastro manual para realizar comparações nativas de data (`DATE`), mantendo as agregações retrocompatíveis com chaves de dia do mês para o frontend.
  - **[Database] Views atualizadas**: Ajustado `db_views_relacionais.sql` para suportar o novo tipo de dado das views.

---

## v1.32.14 — 2026-06-03
**Autor:** Alan Kleber
**Email:** alan.kms@gmail.com

### Mudanças:
- **Redesenho completo do módulo de importação de Requerimentos SVR via PDF**:
  - **[NEW] `backend/services/CycleEngine.js`**: Motor parametrizável de ciclos operacionais. Implementa a regra de fragmentação de disponibilidade entre ciclos (dias 01–15 → ciclo anterior; dias 16–31 → ciclo corrente) sem hardcode. Configurável via tabela `CICLO_CONFIG` no banco.
  - **[NEW] `backend/services/PdfExtractor.js`**: Extrator resiliente com 4 estratégias de detecção do mês de referência em cascata e 2 estratégias de parsing de marcações de disponibilidade. Elimina a dependência de regex única frágil.
  - **[NEW] `backend/services/RequirementImporter.js`**: Orquestrador de pipeline de 7 estágios (validação, extração, parsing, disponibilidade, negócio, fragmentação, auditoria). Implementa auto-registro **removido** por segurança, validação de ciclos fechados e deduplicação via SHA-256.
  - **[NEW] `backend/middleware/uploadValidation.js`**: Middleware multer restrito a PDFs (MIME type, 10MB, 50 arquivos/req) com handler de erro padronizado.
  - **[MOD] `backend/server.js`**: Rotas de importação PDF completamente refatoradas. Adicionadas: `POST /api/import/volunteers/files` (com autenticação), `POST /api/import/preview` (dry-run), `GET /api/import/logs` (auditoria), `GET /api/ciclo-config`, `PUT /api/ciclo-config` (admin). Removido código legado (`parseRequerimentoPDF`, `processMarksLine`, `distribuirDisponibilidadeEmCiclos`, `upsertRequerimentoFragmento`).
  - **[MOD] `backend/db.js`**: Adicionadas tabelas `CICLO_CONFIG` (motor parametrizável, seed com `dia_inicio=16`) e `IMPORTACAO_LOG` (rastreabilidade completa de importações com índices).

---

## v1.32.13 — 2026-06-03
**Autor:** Alan Kleber
**Email:** alan.kms@gmail.com

### Mudanças:
- **Correção de Duplicação de Guarnições**:
  - **Backend (server.js)**: Corrigido o bug na rota `GET /api/schedules` que causava a duplicação de guarnições no painel administrativo (`AdminDashboardV2`). A duplicação ocorria porque a junção com a tabela de requerimentos (`LEFT JOIN REQUERIMENTOS`) gerava registros duplicados quando um militar possuía mais de um requerimento ativo no mesmo ciclo operacional. A consulta foi otimizada para utilizar um `LEFT JOIN LATERAL` limitando o resultado a 1 registro por militar, e foi adicionada uma validação de unicidade (`seenEscalas`) durante o agrupamento de escalas no JavaScript.

---

## v1.32.12 — 2026-05-18
**Autor:** Alan Kleber
**Email:** alan.kms@gmail.com

### Mudanças:
- **Controle de Publicação de Guarnições**:
  - **Interface Administrativa (AdminDashboardV2)**: Adicionado um botão interativo (ícones `Eye` / `EyeOff`) e um status pill ("Publicada" / "Não Publicada") em cada cartão de guarnição no painel de planejamento. Guarnições marcadas como não publicadas ganham um estilo visual diferenciado (borda tracejada vermelha e leve transparência) para feedback visual imediato.
  - **Publicação Oficial (EscalaPublicacaoOficial)**: Filtrada a lista de patrulhas para ocultar automaticamente equipes marcadas com `publicado === false` do layout de publicação oficial e da geração do PDF.
  - **Persistência de Dados (Backend & DB)**: Adicionada a coluna `publicado` na tabela `ESCALA_PLANEJAMENTO` no banco de dados PostgreSQL (via schema inicial e script de migração no `db.js`) e ajustados os endpoints de listagem e salvamento no `server.js` para garantir que o estado de publicação seja persistido no banco de dados.

---

## v1.32.11 — 2026-05-18
**Autor:** Alan Kleber
**Email:** alan.kms@gmail.com

### Mudanças:
- **Exportação e Diagramação de Escalas em PDF**:
  - **Identidade Visual**: Refatorada o brasão oficial da Polícia Militar de Alagoas (`pmal.png`) no cabeçalho do documento de publicação de escalas, com proporções nativas preservadas (`objectFit: 'contain'`) para evitar achatamento.
  - **Paginação Dinâmica e Precisa**: Refatorada a função `handleExportPDF` para aplicar temporariamente `width: '900px'` no contêiner durante a exportação, alinhando de forma 100% precisa os cálculos de `getBoundingClientRect()` e `offsetHeight` com o motor de renderização do `html2canvas` independente da resolução ou zoom do navegador do usuário.
  - **Recuo de Margem Superior**: Implementado recuo dinâmico de `35px` no topo da segunda e terceira páginas do PDF para garantir que o título do turno (`TURNO: DIURNO...`) não fique colado no corte físico superior da folha, mantendo a harmonia visual idêntica à da primeira página.

---

## v1.32.10 — 2026-05-12
**Autor:** Alan Kleber
**Email:** alan.kms@gmail.com

### Mudanças:
- **Correção de Renderização (White Screen)**: Identificada e resolvida a causa da tela branca no index do sistema. O erro ocorria devido ao cabeçalho restritivo de Content Security Policy (`default-src 'none'`) injetado por padrão pelo middleware `helmet` no backend, que bloqueava a aplicação de estilos inline e a execução de scripts do React/Vite.
  - **Backend**: Desativada a diretiva `contentSecurityPolicy` nas configurações do `helmet` em `backend/server.js`.
  - **Infraestrutura**: Reinicializados os contêineres `ft-backend` e `ft-frontend` via Portainer para aplicar as alterações em ambiente Docker sem suporte nativo a polling de arquivos do host.
- **Identidade Visual**: Confirmada a reinserção e o correto dimensionamento do brasão oficial da Polícia Militar de Alagoas (`pmal.png`) no cabeçalho institucional da publicação oficial de escalas.

---

## v1.32.9 — 2026-05-12
**Autor:** Alan Kleber
**Email:** alan.kms@gmail.com

### Mudanças:
- **Sanitização de Dados (Database)**: Implementada conversão automática de strings vazias (`''`) para `NULL` no campo `observacoes` em todas as rotas de criação e cancelamento de requerimentos. Isso garante que filtros de banco de dados (`IS NOT NULL`) funcionem conforme o esperado.
- **Resiliência de Infraestrutura**: Atualização do sistema para o novo IP do servidor (`192.168.1.119`).
  - **Nginx Proxy Manager**: Reconfiguração dos Proxy Hosts para os novos domínios `nip.io`.
  - **Configuração**: Sincronização do `.env` do frontend com o novo endpoint da API.
- **Identidade Visual (Escala Oficial)**: Adicionado o brasão oficial da Polícia Militar de Alagoas (`pmal.png`) ao cabeçalho do componente de exportação de escalas, reforçando o padrão institucional dos documentos gerados.

---

## v1.32.8 — 2026-05-12
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Reversão de Mudanças (v1.32.4)**: Revertida a lógica de UPSERT na importação de PDFs e a validação de segurança na exclusão de requerimentos, retornando ao modelo de "Excluir e Reinserir" físico.

---

## v1.32.7 — 2026-05-12
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Resiliência na Sincronização (AdminDashboardV2)**: Resolvida inconsistência onde dados desapareciam após refresh ou troca de ciclo.
  - **Sincronização de Data**: Agora o dashboard ajusta automaticamente a `selectedDate` para o início do ciclo caso a data atual (Hoje) esteja fora do intervalo permitido.
  - **Prevenção de Race Conditions**: Implementada atualização de estado funcional (`setState(prev => ...)`) no carregamento de escalas para evitar que atualizações simultâneas de voluntários e patrulhas se sobreponham.
  - **Estabilidade no Seletor**: O seletor de ciclos agora garante que a data seja validada e ajustada imediatamente após a troca manual.

---

## v1.32.6 — 2026-05-12
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Correção de Sincronização de Estado (AdminDashboard)**: Corrigido problema onde novas escalas salvas não apareciam imediatamente na interface.
  - **Backend**: Refatorada a rota `POST /api/schedules` para utilizar `db.transaction`, garantindo que todas as operações (delete/insert) ocorram na mesma conexão do PostgreSQL e sejam confirmadas corretamente no pool.
  - **Frontend**: Removida restrição na função `loadSchedule` que impedia o carregamento de escalas se a lista de voluntários estivesse vazia (útil para escalas compulsórias ou ciclos novos).

---

## v1.32.5 — 2026-05-12
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Seletor de Ciclo Dinâmico**: Adicionado seletor de ciclos no `AdminDashboardV2.jsx`, permitindo que o gestor alterne manualmente entre ciclos operacionais para planejar escalas futuras ou auditar passadas.
- **Filtro 'Mostrar Todos'**: Implementada funcionalidade de exibir voluntários indisponíveis no dia selecionado. Isso permite localizar militares que não marcaram disponibilidade no requerimento original, mas que podem ser escalados manualmente.
- **Melhoria UX no Pool**: Novo design para o cabeçalho do pool de voluntários e mensagens de "Empty State" orientando o usuário sobre como encontrar militares.
- **Hardening no Backend**: Adicionados logs de auditoria e conversão explícita de tipos no gatilho de recálculo de metas diárias, garantindo que a ativação de um ciclo gere corretamente o planejamento financeiro/equipes.

---

## v1.32.3 — 2026-05-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Busca Multicritério**: Expandida a funcionalidade de busca no `ServicosExecutadosManager.jsx` para incluir a coluna **Guarnição**. Agora o gestor pode localizar registros pesquisando simultaneamente por Nome de Guerra, Matrícula ou Nome da Equipe.

---

## v1.32.2 — 2026-05-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Filtro por OPM no Agrupamento**: A visão de guarnições agrupadas agora filtra automaticamente os resultados para exibir apenas as equipes vinculadas à OPM do ciclo operacional selecionado.
- **Precisão Operacional**: Garantia de que guarnições de unidades distintas (ex: CPM/I-Faz vs 9º BPM) não sejam misturadas na visualização quando múltiplos contextos de serviço coexistem no mesmo período.

---

## v1.32.1 — 2026-05-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Visão por Guarnição**: Implementado sistema de abas no `ServicosExecutadosManager.jsx`, permitindo alternar entre a lista individual de serviços e uma nova visão agrupada por equipe (guarnição).
- **Agrupamento Dinâmico**: Nova lógica de processamento que agrupa militares que prestaram serviço na mesma guarnição e data, facilitando a conferência de equipes formadas.
- **Tabela de Equipes**: Exibição consolidada com lista de integrantes, quantidade de militares por equipe, carga horaria comum e valor total de remuneração da guarnição.
- **UX/UI**: Adição de indicadores visuais para militares ausentes/justificados dentro do agrupamento de guarnição (nome tachado).

---

## v1.32.0 — 2026-05-11
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Contingência de Orçamento**: Implementada a funcionalidade de definir um valor de contingência (reserva de segurança) por ciclo operacional.
- **Cálculo de Saldo Real**: Atualizada a lógica do sistema para que o saldo disponível para planejamento seja calculado como `Teto - Contingência - Executado`, garantindo maior transparência e segurança financeira.
- **Automação de Metas**: O motor de otimização (`ScaleOptimizationService.js`) agora abate automaticamente o valor contingenciado antes de distribuir as metas diárias, evitando o empenho total do orçamento previsto.
- **Interface de Gestão**: Inclusão de campo específico para Valor de Contingência no cadastro de ciclos (`CicloManager.jsx`) com indicadores visuais nos cards de resumo.
- **Painel de Planejamento**: Adicionado card de "Contingência" no `MetasAlocacaoManager.jsx` e expansão do sumário financeiro para 5 colunas, detalhando a composição do saldo.

---

## v1.31.0 — 2026-05-09
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Padronização Global de Grids (Premium)**: Implementação de um novo sistema de contêiner para tabelas (`.table-premium-wrapper`) em todo o sistema.
- **Sticky Headers**: Todos os cabeçalhos das tabelas administrativas e dashboards agora permanecem fixos no topo durante a rolagem, garantindo a visibilidade do contexto das colunas em grandes volumes de dados.
- **Rolagem Interna & UX**: Implementação de rolagem vertical interna (`overflow-y: auto`) com altura máxima otimizada (`65vh`), permitindo que a navegação principal e o rodapé institucional permaneçam sempre visíveis.
- **Scrollbar Premium**: Adição de barra de rolagem customizada, minimalista e com estética institucional, melhorando o acabamento visual das tabelas.
- **Refatoração de Componentes**: Atualização de 11 módulos operacionais, incluindo `HistoricoMilitar`, `EfetivoManager`, `RequerimentosAdmin`, `ServicosExecutadosManager`, `UserManager`, `MetasAlocacaoManager`, `TiposServicoManager`, `RelatorioOperacional`, `AnalyticsDashboard` e `FinanceiroDashboard`.
- **Integridade de Documentos**: Exclusão explícita de componentes de impressão/PDF da lógica de sticky headers para preservar a fidelidade na geração de documentos oficiais.

---

## v1.30.0 — 2026-05-08
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Trava de Segurança Financeira**: Implementada lógica de bloqueio no `MetasAlocacaoManager.jsx` que impede o salvamento de metas que excedam o saldo disponível do ciclo, garantindo a integridade orçamentária.
- **Métricas Operacionais**: Inclusão da contagem de "Equipes Planejadas (Restante)" no card de resumo financeiro, permitindo visualizar o potencial de escala dentro do orçamento.
- **Admin Dashboard Pro**: Integração da "Meta do Dia" no sidebar do `AdminDashboardV2.jsx`, com indicadores visuais de progresso (escalado vs meta) e alertas de estouro em tempo real.
- **Navegação Inteligente**: Reorganização do menu global (`App.jsx`), movendo a gestão de Metas de Alocação para a categoria de "Dashboards" para facilitar o monitoramento financeiro.
- **Identidade Visual Premium**: Integração do componente `Footer` em todo o sistema e no gerador de PDF oficial, padronizando os créditos de desenvolvimento e informações institucionais.
- **Layout & UX**: Ajustes finos de grid e espaçamento nas tabelas administrativas para eliminar espaços em branco laterais e melhorar a legibilidade em alta resolução.

---

## v1.29.0 — 2026-05-08
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Automação de Metas**: Implementação de motor de otimização guloza que realiza o 'upsert' automático na tabela `METAS_ALOCACAO` sempre que um ciclo é criado ou atualizado.
- **Backend**: Criação do `ScaleOptimizationService.js` e adição de helper de transações no `db.js` para garantir a integridade referencial dos dados planejados.
- **Frontend**: Inclusão do campo "Limite de Equipes por Dia" no `CicloManager.jsx`, permitindo que o gestor ajuste a capacidade operacional do ciclo.
- **Frontend**: Novo módulo "Metas de Alocação" (`MetasAlocacaoManager.jsx`) para visualização detalhada, edição manual e exclusão de metas diárias.
- **Database**: Adição da coluna `limite_equipes_diario` na tabela `CICLOS`.

---

## v1.28.51 — 2026-05-07
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Padronização Hierárquica**: Centralização da lógica de hierarquia militar no utilitário `formatters.js`, definindo uma ordem canônica (`MILITARY_RANK_ORDER`) do Coronel ao Soldado.
- **Ordenação Global**: Implementação de ordenação baseada em postos e graduações em todo o sistema. Militares agora são listados e agrupados respeitando a senioridade por padrão nos módulos de Efetivo, Requerimentos, Gestão de Escalas e Relatórios.
- **UI/UX**: O gerenciador de efetivo (`EfetivoManager.jsx`) e a gestão de usuários (`UserManager.jsx`) agora iniciam ordenados por hierarquia (índice 0 = CEL PM), facilitando a localização de oficiais e praças.
- **UI/UX**: A barra de navegação principal (`App.jsx`) tornou-se dinâmica, exibindo a sigla da OPM (`opm.sigla`) vinda do banco de dados no título do sistema, em substituição ao texto estático.

---

## v1.28.50 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **UI/UX**: Reorganização das ações principais na tela de gerenciamento de guarnições (`AdminDashboardV2.jsx`). O botão "Imprimir Escala", que usava a função nativa do navegador, foi removido da barra lateral de ações.
- **UI/UX**: O botão que leva à view oficial da escala foi transferido do cabeçalho principal para o final da lista de "Ações de Escala" na barra lateral e renomeado de "Publicação Oficial" para "Publicar Escala". O botão foi estilizado com o tom escuro institucional, agilizando o fluxo de trabalho do administrador (Nova Guarnição -> Salvar -> Publicar).

---

## v1.28.49 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Funcionalidade**: Ajuste no padrão de nomenclatura do arquivo PDF exportado. A data no nome do arquivo foi alterada do formato ISO (`AAAA-MM-DD`) para o padrão brasileiro (`DD-MM-AAAA`), facilitando a organização e identificação dos arquivos pelos usuários.

---

## v1.28.48 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **UI/UX**: O botão e a função de impressão padrão ("Imprimir Escala") foram removidos da tela `EscalaPublicacaoOficial.jsx`. A exportação direta em PDF passa a ser o fluxo primário e exclusivo para salvar e imprimir o documento oficial, garantindo que o padrão visual não sofra interferência dos navegadores.

---

## v1.28.47 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Funcionalidade**: Adicionada a funcionalidade de "Exportar PDF" diretamente na tela de Publicação Oficial da Escala.
- **Frontend**: Instalação das bibliotecas `html2canvas` e `jspdf` no projeto React para permitir a renderização perfeita da DOM em formato PDF.
- **UI/UX**: O botão de exportação foi posicionado estrategicamente ao lado do botão de impressão tradicional. O novo gerador de PDF clona todo o bloco oficial da escala, oculta os seletores de cores (`.no-print`) e força a resolução e dimensões adequadas ao papel A4, preservando fielmente todas as fontes, cores e tabelas centralizadas.

---

## v1.28.46 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **UI/UX**: Alinhamento de todos os dados e cabeçalhos da tabela de guarnições ao centro (`textAlign: 'center'`) na visualização de `EscalaPublicacaoOficial.jsx`, proporcionando um visual mais simétrico e padronizado para a impressão.

---

## v1.28.45 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Frontend**: Inclusão do local e horário de embarque na tela de publicação oficial (`EscalaPublicacaoOficial.jsx`). A informação agora é renderizada logo à frente do turno de cada guarnição, consumindo o dado do banco (`horario_embarque`) ou exibindo o texto padrão, garantindo que o local de encontro esteja claramente visível no momento da impressão da escala.

---

## v1.28.44 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Frontend**: Inserção do campo de texto `horario_embarque` diretamente no card da guarnição dentro do componente `AdminDashboardV2`. 
- **Funcionalidade**: O campo já vem pré-preenchido com o texto padrão de embarque ("local de embarque; 30 minutios de antecedencia na sede do 9º BPM") caso esteja vazio. Os dados inseridos ou editados neste campo são vinculados ao estado da guarnição e preparados para serem persistidos na tabela `escala_planejamento` durante o salvamento da escala.

---

## v1.28.43 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Frontend**: Ajustes no layout de impressão e visualização da tela `EscalaPublicacaoOficial`.
- **UI/UX**: O cabeçalho de "TURNO" deixou de ser um agrupador genérico e passou a ser exibido isoladamente **acima de cada tabela** de guarnição, facilitando a identificação rápida e o recorte da escala, caso necessário.
- **UI/UX**: Substituição da coluna "Matrícula" pela coluna "Telefone" nas tabelas de serviço, permitindo o acionamento direto e facilitado do efetivo escalado através da visualização impressa ou digital.

---

## v1.28.42 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Frontend**: Aprimoramento da tabela de guarnições no componente `EscalaPublicacaoOficial` para incluir novas informações vitais para a operação.
- **Frontend**: Adicionada a coluna "Função", que identifica automaticamente o papel do militar na guarnição (Comandante, Motorista ou Patrulheiro) com base em seu índice de alocação.
- **UI/UX**: Incluído o "Número de Ordem" de cada voluntário. Este dado é agora renderizado abaixo do Nome de Guerra com uma tipografia atenuada, evitando a criação de novas colunas e mantendo a legibilidade da escala para o formato A4.
- **UI/UX**: Rebalanceamento automático das larguras percentuais do cabeçalho da tabela para comportar perfeitamente a nova coluna de Função.

---

## v1.28.41 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Frontend**: Refatoração estrutural da tela `EscalaPublicacaoOficial`. As guarnições deixaram de ser agrupadas em uma única tabela por turno e passaram a ser renderizadas em tabelas individuais e isoladas para cada equipe.
- **Frontend**: O seletor de cores da tabela foi transferido do nível de "Turno" para o nível de "Guarnição", permitindo que cada equipe tenha uma cor de fundo estritamente independente.
- **UI/UX**: Remoção da coluna lateral "Guarnição" (`rowSpan`) da tabela, substituindo-a por um cabeçalho exclusivo para cada tabela contendo o nome da equipe, duração e as ferramentas de cor.
- **UI/UX**: Implementada propriedade de layout (`page-break-inside: avoid`) para garantir que as novas tabelas individuais não sejam cortadas em páginas diferentes durante a impressão.

---

## v1.28.40 — 2026-05-06
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Frontend**: Refatorada a customização de cores no componente `EscalaPublicacaoOficial` para permitir cores independentes por turno (tabela).
- **Frontend**: Implementados seletores de cores individuais nos cabeçalhos de cada bloco de turno.
- **UI/UX**: Migrada a aplicação de cores para estilos inline, garantindo suporte a múltiplas cores na mesma página de visualização e impressão.

---

## v1.28.39 — 2026-05-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Frontend**: Criado o componente `EscalaPublicacaoOficial` para visualização e impressão de escalas em layout institucional (A4), com agrupamento inteligente por turnos.
- **Frontend**: Adicionado botão de acesso rápido à "Publicação Oficial" no cabeçalho do `AdminDashboardV2`.
- **UI/UX**: Aumentado o tamanho da fonte e melhorada a legibilidade das tags de horário e duração nos cartões de serviço do painel administrativo.
- **Fix**: Corrigido erro de referência e crash de "tela branca" ao abrir o banco de voluntários no AdminDashboardV2.
- **Fix**: Normalizada a busca de ciclos operacionais para garantir compatibilidade entre tipos de dados (String/Number).

---

## v1.28.38 — 2026-05-05
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Backend**: Refatorada a rota de cancelamento de disponibilidade (`/api/volunteers/:id/cancel-availability`) para suportar operações cirúrgicas por turno e dia, eliminando o bug de persistência que causava modificações indesejadas em registros vizinhos.
- **Backend**: Adicionado suporte ao campo `availability_completa` no endpoint de voluntários, garantindo a integridade dos dados históricos de turnos ativos e inativos.
- **Frontend**: Corrigida a lógica de envio de parâmetros no componente `RequerimentosAdmin`, assegurando que o `dia_mes` e `horario_turno` sejam propagados corretamente para a API de cancelamento.
- **Frontend**: Ajustada a lógica de contagem de desistências nos componentes `HistoricoMilitar` e `RelatorioIndividual` para considerar dias únicos em vez de somar turnos individuais (ex: múltiplos turnos cancelados no mesmo dia agora contam como apenas 1 dia de desistência).
- **UI/UX**: Implementada sinalização visual distinta para turnos cancelados na grade de disponibilidade (fundo vermelho e ícone de exclusão), melhorando o feedback para o gestor de escalas.

---

## v1.28.37 — 2026-05-01
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Backend**: Atualizada a rota `/api/usuarios` para retornar o campo `opm` do efetivo, permitindo a visualização da unidade vinculada no painel de Gestão de Usuários.
- **Frontend**: O grid de usuários agora exibe corretamente a OPM do militar (administradores e usuários padrão).

---

## v1.28.36 — 2026-05-01
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **UI/UX**: Adicionados filtros manuais de "Data Início" e "Data Fim" no componente `ServicosExecutadosManager`, permitindo maior flexibilidade na consulta de serviços além do intervalo automático do ciclo.
- **Iconografia**: Implementados ícones de calendário nos novos campos de data para manter a consistência visual premium do sistema.

---

## v1.28.35 — 2026-04-29
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **Analytics Dashboard**: Implementadas abas de navegação dinâmicas que se adaptam automaticamente às OPMs de origem encontradas nos dados de serviços executados.
- **Filtragem Inteligente**: O grid de estatísticas agora pode ser filtrado clicando na aba respectiva de cada OPM (ex: 9º BPM, CPM/I-Faz, etc.), enquanto a aba "Geral" mantém a visão consolidada por militar para controle do limite de serviços.
- **UX**: Melhorada a navegabilidade do painel analítico com suporte a múltiplas unidades operacionais de forma automática, eliminando botões estáticos e hardcoded.

---

## v1.28.34 — 2026-04-29
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **UX/UI**: Refinamento da barra de filtros no `ServicosExecutadosManager`. Removidos os seletores manuais de "Data Início" e "Data Fim" para simplificar a interface, mantendo a filtragem automática baseada no Ciclo Operacional selecionado.
- **Ajuste de Layout**: O campo de busca no módulo de serviços executados foi movido de volta para a barra de filtros principal (após o ciclo/militar) para melhor ergonomia de uso local.
- **Estabilidade**: Correção de erro de sintaxe JSX no componente de serviços executados, restaurando a funcionalidade do módulo.

---

## v1.28.33 — 2026-04-29
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **Design System Global**: Implementação de um padrão visual premium para todos os inputs de busca do sistema, utilizando bordas institucionais (#0D3878) de 1.5px, efeito glassmorphism (backdrop-filter) e sombras de foco aprimoradas.
- **Padronização de Localização**: Reposicionamento estratégico dos campos de busca para ficarem imediatamente acima dos grids de dados em todos os módulos administrativos (`UserManager`, `EfetivoManager`, `RequerimentosAdmin`, `HistoricoMilitar` e `AnalyticsDashboard`), garantindo consistência e foco contextual.

---

## v1.28.32 — 2026-04-29
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **UI/UX**: Atualizada a cor do cabeçalho do grid no componente `HistoricoMilitar.jsx` para `#0D3878` (Azul Institucional GSVR) com texto em branco, garantindo consistência visual com os demais módulos do sistema.

---

## v1.28.31 — 2026-04-29
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **Frontend**: No componente `ServicosExecutadosManager.jsx`, a coluna **Status** (Presença) foi substituída pela coluna **OPM**, exibindo o dado `opm_origem` da tabela de serviços executados. O status de presença permanece acessível via tooltip (title) ao passar o mouse sobre a sigla da OPM.
- **UX**: Adicionada funcionalidade de ordenação por OPM no grid de serviços executados.

---

## v1.28.30 — 2026-04-29
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Configuração**: Integrado o arquivo `frontend/.env` com o `docker-compose.yml` utilizando a diretiva `env_file`. 
- **Melhoria**: Removido o IP hardcoded do `docker-compose.yml`, permitindo que o arquivo `.env` seja a única fonte de verdade para a variável `VITE_API_URL`. Isso evita que as configurações do Docker sobrescrevam as configurações locais e facilita futuras mudanças de IP.

---

## v1.28.29 — 2026-04-29
**Autor:** pmal-daten
**Email:** unknown

### Mudanças:
- **Infraestrutura**: Atualizado o IP do servidor de `192.168.1.134`/`144` para `192.168.1.123` (novo IP detectado após desligamento do servidor).
- **Configuração**: Atualizada a variável `VITE_API_URL` em `docker-compose.yml` e `.env` para apontar corretamente para o novo IP, restabelecendo a comunicação entre o frontend e a API backend.
- **Docker**: Ajustadas as configurações de ambiente para garantir que os contêineres utilizem o novo endereço de rede.

---

## v1.28.28 — 2026-04-28
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **Frontend**: Removido `window.confirm` do fluxo de cancelamento em `RequerimentosAdmin.jsx` para evitar bloqueios de navegadores e garantir que o botão "Sim, Cancelar" funcione instantaneamente conforme o esperado pelo usuário.

---

## v1.28.27 — 2026-04-28
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **Backend**: Corrigido erro de sintaxe Postgres no lookup de efetivo (aspas duplas trocadas por simples), eliminando o erro "zero-length delimited identifier".
- **Backend**: Melhorada a busca de militar no POST /api/volunteers para aceitar tanto matrícula quanto número de ordem, resolvendo falhas na criação manual de requerimentos.
- **Backend**: Adicionado log detalhado de requisições e erros de autenticação para depuração.
- **Frontend**: Adicionado interceptor global de 401 para deslogar usuários com sessão expirada, prevenindo falhas silenciosas de autorização.
- **Frontend**: Garantido que o ciclo ativo e o ID do usuário da sessão sejam vinculados corretamente ao criar requerimentos.

---

## v1.28.26 — 2026-04-28
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Backend] Vínculo de Auditoria em Requerimentos**: Atualizada a tabela `REQUERIMENTOS` para incluir a coluna `id_usuario_criacao`. A rota `POST /api/volunteers` agora utiliza o middleware de autenticação e registra automaticamente o ID do usuário logado que realizou a inserção manual.
- **[Backend] Estabilidade no Salvamento**: Refatorada a lógica de criação de voluntários para aceitar `id_ciclo` explícito via corpo da requisição, prevenindo erros de "Ciclo não encontrado" quando a data atual do servidor não coincide com a janela de um ciclo aberto.
- **[Frontend] Requerimentos Admin**: Atualizado o componente `RequerimentosAdmin` para receber dados da sessão do usuário e enviar o ID do ciclo ativo durante o salvamento de novos registros, corrigindo a causa raiz da falha no botão "Novo".
- **[Database] Migração**: Adicionadas colunas `id_usuario_criacao` e `observacao` à tabela `REQUERIMENTOS` via script de migração automática no `db.js`.

---

## v1.28.25 — 2026-04-28
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Database] Correção de Falsos Positivos**: Refatorado o trigger `trg_planejamento_ternaria` no banco de dados para distinguir entre escalas futuras e passadas. Serviços planejados para datas posteriores a hoje são agora categorizados com o novo status `'Planejado'`, evitando que sejam contabilizados incorretamente como "Faltas" (Planejado e não Executado).
- **[Backend] API de Relatórios**: Atualizado o endpoint `/api/reports/operacional-detalhado` para aplicar a mesma lógica condicional de data na classificação do `status_op`, garantindo consistência entre o banco e a API.
- **[Frontend] Relatório Individual e Histórico**: Implementado suporte ao status `'Planejado'` nos componentes de visualização. O status é exibido com cor azul e ícone de calendário, indicando um agendamento futuro legítimo, sem impactar negativamente os indicadores de eficiência ou produtividade do militar.

---

## v1.28.24 — 2026-04-28
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Backend] Importação de Efetivo (Excel)**: Corrigido bug no mapeamento de colunas que permitia que colunas com nomes como "Sub Unidade" sobrescrevessem o valor da coluna "OPM". A prioridade agora é garantida para a coluna "OPM" nativa, evitando vinculações incorretas de lotação.
- **[Backend] Atualização de OPM em Lote**: Adicionada a capacidade de atualizar o campo OPM de militares já existentes no banco de dados durante novas importações de planilhas.

---

## v1.28.23 — 2026-04-27
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Database] Campo de Observação**: Adicionada a coluna `observacao` à tabela `REQUERIMENTOS` para permitir anotações gerais sobre a solicitação do militar.
- **[Backend] API de Voluntários**: Atualizada a rota `PUT /api/volunteers/:id` para persistir as observações e o `GET /api/volunteers` para retorná-las ao frontend.
- **[UI/UX] Edição de Requerimento**: Implementado campo de texto (textarea) no modal de edição de requerimentos, permitindo que administradores registrem e visualizem observações importantes.
- **[Database] Observações por Turno**: Suporte a observações individuais para cada turno selecionado na grade de disponibilidade (tabela `DISPONIBILIDADE_REQUERIMENTO`).
- **[UI/UX] Notas na Grade**: Adicionada funcionalidade de "Botão Direito" na grade de disponibilidade para inserir notas em turnos específicos. Um marcador visual (ponto amarelo) indica turnos com observações.
- **[Estabilidade] Sincronização de Dados**: Refatoração da estrutura de disponibilidade para suportar objetos complexos sem quebrar o preenchimento de novos requerimentos.
- **[Bug Fix] Estabilidade da Interface**: Corrigido erro de "tela branca" e falha na lógica de ordenação.
- **[Security/Estabilidade] Sessão do Usuário**: Adicionado `try-catch` na restauração de sessão do `App.jsx`.

---

## v1.28.22 — 2026-04-27
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Backend] Importação de PDFs**: Implementada a extração automática do "Número do Requerimento" (ex: 17566/2026) diretamente do texto do PDF.
- **[Backend] Persistência de Requerimento**: Atualizadas as funções de banco de dados (`upsertRequerimentoFragmento` e `distribuirDisponibilidadeEmCiclos`) para salvar o número do requerimento na tabela `REQUERIMENTOS`, garantindo que o campo não fique nulo após a importação.

---

## v1.28.21 — 2026-04-27
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Backend] Correção na Importação de PDFs**: Corrigida a lógica de parsing da biblioteca `pdf-parse` em `server.js` (`parseRequerimentoPDF`). O algoritmo agora aplica `.toUpperCase()` nas linhas e turnos extraídos, resolvendo a falha onde horários com minúsculas (ex: "07:00 às") não eram reconhecidos, o que resultava no registro do ciclo mas deixava a grade com "0" turnos selecionados para o militar. O sistema agora lê com sucesso todos os turnos marcados.

---

## v1.28.20 — 2026-04-27
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Serviços Executados] Dinamismo nas Cargas Horárias**: A constante hardcoded `CARGA_OPTIONS` foi substituída por dados dinâmicos buscados no endpoint `/api/tipos-servico`.
- **[UI/UX] Atualização Dinâmica**: As opções do seletor e os _placeholders_ automáticos de valor de remuneração agora refletem instantaneamente as parametrizações da tabela `TIPOS_SERVICO` persistida no banco de dados.

---

## v1.28.19 — 2026-04-27
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Importação] Tratamento de Exceção de Datas**: Implementada regra de negócio na rotina de fragmentação de disponibilidade (`distribuirDisponibilidadeEmCiclos`) que ignora automaticamente dias inválidos no mês de referência (ex: 31 de Abril, 30/31 de Fevereiro) detectados no PDF. Isso previne o erro "out of range" no banco de dados e assegura a importação do restante do requerimento normalmente.

---

## v1.28.18 — 2026-04-23
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Feature] Gestão de Ciclos — Controle de Ativação**: Implementado interruptor (*toggle switch*) no `CicloManager.jsx` para ativação/desativação rápida de ciclos operacionais diretamente nos cards, com sincronização automática do status ('Aberto'/'Fechado') e do campo booleano `ativo`.
- **[Logic] Orçamento Dinâmico no Analytics**: Substituída a constante estática `ORCAMENTO_MENSAL` por lógica de cálculo dinâmico baseada no campo `valor_total_previsto` da tabela de ciclos, garantindo precisão financeira em tempo real no `AnalyticsDashboard.jsx`.
- **[Feature] Detalhes de Escalas no Planejamento**: Adicionado modal de informações militares no `AdminDashboardV2.jsx` que exibe o histórico completo de escalas planejadas e executadas para o militar selecionado no ciclo atual.
- **[UI/UX] Unificação de Indicadores de Carga**: Padronizada a exibição de contadores de serviço no modal de voluntários utilizando o formato "X/8" tanto para escalas planejadas (PLAN) quanto executadas (EXEC), com estilização harmonizada e selos identificadores.
- **[UI/UX] Redesign de Cards de Ciclo**: Reestruturado o layout dos cards no gerenciador de ciclos para agrupar status, controle de ativação e ações de edição no topo, melhorando a escaneabilidade e acessibilidade.
- **[Backend] Evolução do Esquema de Dados**: Adicionado campo `ativo` (BOOLEAN) à tabela `CICLOS` e otimizado o endpoint `/api/volunteers` para retornar contagens segregadas de planejamentos e execuções por militar.

---

## v1.28.17 — 2026-04-22
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Rebranding] Identidade Visual**: Atualizado o título da aba do navegador de "frontend" para **GSVR**.
- **[UI/UX] Favicon Institucional**: Implementado novo favicon baseado no **Brasão do 9º BPM**, ajustado para formato quadrado e otimizado para visualização em navegadores.

---

## v1.28.16 — 2026-04-21
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Feature] Relatório Individual — Layout A4 e Impressão**: Otimizado o layout para modo retrato e implementado suporte nativo à impressão A4, removendo dependências de geração programática de PDF em favor de `window.print()`.
- **[UI/UX] Grade de Disponibilidade Mensal**: Ajustada para exibir sempre os 31 dias do mês e os 4 turnos fixos do GSVR, eliminando a necessidade de scroll horizontal e garantindo visualização integral na tela. Células sem dados agora são exibidas em branco.
- **[Logic] Índice de Produtividade Operacional**: Corrigido o cálculo de produtividade para refletir a relação real entre serviços executados e planejados, com contagem dinâmica de dias disponíveis baseada na grade de requerimentos.
- **[Cleanup] Refatoração Administrativa**: Removido o componente `AdminDashboard` legado e todas as suas referências no `App.jsx`, centralizando o planejamento de escalas exclusivamente no `AdminDashboardV2`.
- **[UX] Seleção Automática de Ciclo Ativo**: Implementada lógica que pré-seleciona o ciclo com status 'Aberto' tanto no Histórico Militar quanto no Relatório Individual, otimizando o acesso aos dados vigentes.
- **[UI] Simplificação e Polimento**: Removidos filtros redundantes de status e indicadores de eficiência duplicados no relatório individual para uma interface mais focada e profissional.

---

## v1.28.15 — 2026-04-21
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Bugfix] Backend — CTE Desistencias**: Corrigida referência de coluna inexistente `dr.id_militar` → `r.id_militar` na CTE `Desistencias` do endpoint `/api/reports/operacional-detalhado`, eliminando crash do servidor.
- **[Feature] Relatório Individual do Militar**: Criado componente `RelatorioIndividual.jsx` com KPIs consolidados (Dias Disponíveis, Executados, Planejados, Match, Faltas, Extras, Desistências), barra de progresso de eficiência, filtros por ciclo/status e botão de impressão.
- **[Feature] Grade de Disponibilidade Visual**: Implementada grade interativa no relatório individual exibindo quadrados coloridos por turno/dia — 🟩 verde (serviço executado), 🟦 azul (disponível), 🟥 vermelho (indisponível) — com legenda e scroll horizontal.
- **[Backend] Endpoint `disponibilidade-grid`**: Adicionado `GET /api/reports/disponibilidade-grid?id_militar&ciclo_id` que cruza `DISPONIBILIDADE_REQUERIMENTO` com `SERVICOS_EXECUTADOS` para alimentar a grade visual.
- **[Feature] Coluna Dias Disponíveis no Grid**: Adicionada coluna "Dias Disponíveis" no `HistoricoMilitar.jsx` contando dias únicos (`COUNT(DISTINCT dia_mes)`) do requerimento, ignorando múltiplos turnos por dia.
- **[UI] Ícone de Acesso ao Relatório Individual**: Adicionado botão `ExternalLink` em cada linha do grid de `HistoricoMilitar.jsx` que abre o relatório individual do militar mantendo o ciclo selecionado.
- **[UI] Renomeação de Coluna**: Coluna "Militar" renomeada para "Nome" no grid do `HistoricoMilitar.jsx`; removido avatar circular com iniciais.
- **[Backend] Contagem de Dias Únicos**: Subquery de `dias_disponiveis` alterada de `COUNT(*)` para `COUNT(DISTINCT dia_mes)` e corrigida para referenciar `f.id_militar` / `f.id_ciclo` (alias da CTE Final) em vez de aliases externos, resolvendo resultado zero nas colunas.

---

## v1.28.14 — 2026-04-21
**Autor:** Alan Kleber
**Email:** alan.kleber@example.com

### Mudanças:
- **[Backend] Report de Escalas com Ciclo**: Adicionado `id_ciclo` à query do endpoint `/api/reports/escalas-planejadas` para permitir filtragem precisa no frontend.
- **[Frontend] Seletor de Ciclo Operacional**: Implementado dropdown no `EscalasPlanejadas.jsx` que permite filtrar a base de dados por ciclos específicos carregados dinamicamente.
- **[UI/UX] Visualização em Grade (Grid)**: Adicionada nova modalidade de exibição em tabela flat com detalhes completos do militar, recurso e tipo de serviço, facilitando auditorias e conferências rápidas.
- **[UI] Toggle de ViewMode**: Habilitada alternância entre visão de "Cards" (agrupados por VTR) e "Grade" (militares individuais), com persistência em estado de memória.

---

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
- **UI/UX**: Atualizada a cor do cabeçalho do grid no componente `HistoricoMilitar.jsx` para `#0D3878` (Azul GSVR) com texto em branco, padronizando a identidade visual com o restante do sistema.
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
