# 08. Manual do Usuário e Guia de Operação

Bem-vindo ao **Manual Oficial do Usuário do GSVR (Sistema de Gestão de Serviço Voluntário Remunerado)** do **9º Batalhão de Polícia Militar de Alagoas (9º BPM/PMAL)**. Este guia foi elaborado para orientar detalhadamente cada categoria de usuário no cumprimento de suas rotinas operacionais e administrativas.

---

## 🎯 Índice dos Perfis de Usuário

Selecione o perfil correspondente para ir diretamente às instruções:

1. [👨‍✈️ Perfil 1: Policial Militar Voluntário](#1-perfil-1--policial-militar-voluntário) (Soldados, Cabos, Sargentos e Oficiais voluntários)
2. [📋 Perfil 2: Operador e Planejador da P/3](#2-perfil-2--operador-e-planejador-da-p3) (Montagem de escalas e emissão de memorando)
3. [💼 Perfil 3: Gestor Operacional e Financeiro](#3-perfil-3--gestor-operacional-e-financeiro) (Comando, Fiscal de Contrato e P/4)
4. [🛡️ Perfil 4: Administrador do Sistema e Suporte](#4-perfil-4--administrador-do-sistema-e-suporte) (Gestão de acessos, RBAC e superusuários)

---

## 1. Perfil 1 — Policial Militar Voluntário

### 1.1. Primeiro Acesso ao Sistema (Definição de Senha)
Se este é o seu primeiro acesso ao GSVR ou se o administrador efetuou o reset da sua conta, siga estes passos para definir sua senha pessoal:

```
Passo 1: Acesse a tela de login (http://localhost:5173).
Passo 2: Clique no link "Primeiro Acesso? Cadastre sua senha".
Passo 3: Digite seu CPF (apenas números ou com máscara).
Passo 4: Digite sua Matrícula Funcional ou Nº de Ordem (exatamente como cadastrado no Batalhão).
Passo 5: O sistema efetuará a validação de segurança. Se os dados coincidirem, você será levado à tela de senha.
Passo 6: Digite sua nova senha respeitando a política de segurança:
         • Mínimo de 8 caracteres
         • Ao menos uma letra maiúscula (A-Z)
         • Ao menos uma letra minúscula (a-z)
         • Ao menos um número (0-9)
         • Ao menos um símbolo especial (!@#$%...)
Passo 7: Confirme a nova senha e clique em "Concluir Cadastro". Pronto! Você já pode efetuar o login.
```

> [!IMPORTANT]
> **Defesa Anti-Sequestro de Contas:** O sistema não permite cadastrar senha apenas com o CPF. A exigência simultânea da Matrícula impede que terceiros cadastrem senhas em seu nome.

---

### 1.2. Como Fazer o Login Diário
1. No campo **CPF**, insira os 11 dígitos do seu documento. A máscara `000.000.000-00` será aplicada automaticamente.
2. No campo **Senha**, insira sua senha cadastrada.
3. Clique em **"Entrar no Sistema"**.

> [!WARNING]
> **Bloqueio por Tentativas Incorretas:** Se você errar sua senha por **5 vezes consecutivas**, sua conta será bloqueada temporariamente por 15 minutos por proteção contra ataques cibernéticos. Se não lembrar a senha, procure a P/3 ou administrador do sistema.

---

### 1.3. Consultando "Minhas Escalas"
Após entrar no sistema, você será direcionado para o portal **Minhas Escalas**:
- **Próximos Serviços:** Mostra a data, o turno (ex: `07:00 ÀS 13:00`), o prefixo da viatura (ex: `VTR-9102`) e o local de apresentação/embarque.
- **Contador do Ciclo:** Exibe quantos serviços você já executou ou tem planejados no ciclo operacional vigente (ex: `4/8 serviços utilizados`). Lembre-se que o limite máximo legal é de **8 serviços por ciclo**.
- **Equipe:** Permite visualizar quem são os companheiros da sua guarnição (Comandante e Motorista ou Patrulheiro).

---

### 1.4. Inscrição e Envio de Requerimento de Voluntariado
Caso sua subunidade utilize o preenchimento digital de requerimento:
1. No menu superior, clique em **"Inscrição / Voluntariado"**.
2. Selecione o mês de referência pretendido.
3. Na matriz de calendário, assinale com **"X"** os turnos em que você estará de folga e voluntário para o serviço.
4. Revise os dias marcados e clique em **"Enviar Requerimento"**.

---

### 1.5. Atualização de Perfil e Contato
1. Clique no círculo com suas iniciais no canto superior direito e selecione **"Meu Perfil"**.
2. Você pode atualizar seu telefone celular com WhatsApp (essencial para acionamentos da P/3) e seu e-mail.
3. Se desejar, faça o envio de sua foto de identificação clicando em **"Alterar Foto"** (formato JPG ou PNG de até 5MB).
4. Para alterar sua senha atual, preencha o bloco "Alterar Senha", inserindo a senha antiga e a nova senha forte.

---

## 2. Perfil 2 — Operador e Planejador da P/3

### 2.1. Acessando o Planejamento de Escala (`AdminDashboardV2`)
1. No menu superior, passe o mouse em **"Gestão Operacional"** e selecione **"Planejamento de Escala"**.
2. Selecione o **Ciclo Operacional Vigente** (ex: `2026-07 (16/06 a 15/07)`).
3. Selecione a **Data do Serviço** e o **Turno Operacional** desejado:
   - `T1: 07:00 ÀS 13:00`
   - `T2: 13:00 ÀS 19:00`
   - `T3: 19:00 ÀS 01:00`
   - `T4: 01:00 ÀS 07:00`

---

### 2.2. Montagem de Equipes via Drag-and-Drop (Arrastar e Soltar)
1. **Banco de Voluntários (Coluna Lateral):**
   - Lista todos os policiais militares aptos e que declararam disponibilidade para o dia e turno selecionados.
   - Policiais que atingiram o limite de 8 serviços aparecem identificados com `(8/8)` e não podem ser alocados.
   - Use o campo de busca para localizar militares por Nome Completo, Nome de Guerra, Posto ou Matrícula.
2. **Alocação na Guarnição:**
   - Clique e arraste o card do policial da coluna lateral até o slot correspondente na viatura:
     - 🎖️ **Slot Comandante:** Oficial, Subtenente ou Sargento mais antigo.
     - 🚗 **Slot Motorista:** O sistema só permite alocar militares credenciados como condutores (`motorista = true`).
     - 🛡️ **Slot Patrulheiro:** Policial militar de apoio operacional.
3. **Resolução de Conflitos:**
   - Se tentar arrastar um policial já escalado em outra guarnição no mesmo horário, o sistema impedirá a duplicidade.

---

### 2.3. Consulta da Matriz Panorâmica de Disponibilidade
Para analisar o histórico completo de um policial antes de escalá-lo:
1. No card do voluntário, clique no ícone da **Lupa (Detalhes)**.
2. O modal panorâmico exibirá:
   - O nome completo e nome de guerra sem cortes;
   - Indicadores de total de dias disponíveis e serviços cumpridos no ciclo;
   - A **Grade de Disponibilidade Mensal**, demonstrando dia a dia (1 a 31) todos os 4 turnos assinalados pelo policial;
   - Histórico de viaturas e funções em que atuou.

---

### 2.4. Persistência Manual de Escala (Regra Fundamental)
> [!CAUTION]
> **Atenção:** As alterações realizadas na tela de planejamento são mantidas na memória do seu navegador para que você possa reorganizar as patrulhas livremente sem salvar dados incompletos.
> 
> Para efetivar a escala no banco de dados, você **DEVE** clicar no botão **"Salvar Escala"** (com ícone de disquete) na barra superior do planejamento!

---

### 2.5. Emissão do Memorando Oficial do SVR (A4 / PDF)
1. Com a escala salva, clique no botão **"Publicar Memorando SVR"** no topo da tela.
2. Uma janela de pré-visualização em alta resolução será aberta, formatando automaticamente o documento nos moldes formais da Polícia Militar de Alagoas:
   - Brasão do Estado de Alagoas e do 9º BPM;
   - Tabela diagramada das viaturas, prefixos, horários, postos, matrículas e nomes de guerra;
   - Despacho de autorização do Comandante de Batalhão;
   - Rodapé de paginação e data oficial.
3. Clique em **"Baixar PDF"** para gerar o arquivo `.pdf` pronto para assinatura digital no SEI ou impressão física em folha A4.

---

## 3. Perfil 3 — Gestor Operacional e Financeiro

### 3.1. Gerenciamento de Ciclos Operacionais (`CicloManager`)
1. Acesse **Configurações → Gerenciamento de Ciclos**.
2. Para abrir um novo ciclo:
   - Informe a sigla da OPM (`9º BPM`).
   - Defina as datas de vigência (seguindo o padrão institucional: início em dia **16** e encerramento em dia **15**).
   - Insira o **Valor Total Previsto** (ex: R$ 80.000,00).
   - Insira o **Valor de Contingência** (reserva para eventos extraordinários, ex: R$ 4.000,00).
   - Defina o **Limite Diário de Equipes** (ex: máximo de 6 equipes por dia).
3. Para encerrar um ciclo após a conclusão da folha, clique em **"Encerrar Ciclo"**. Ciclos fechados ficam protegidos contra alterações indevidas.

---

### 3.2. Metas de Alocação e Recálculo Automático (`MetasAlocacaoManager`)
O sistema classifica cada dia do ciclo entre:
- **Cenário A (Dia Ordinário):** Segunda a Quinta-feira (R$ 576,09 por equipe de 3 militares).
- **Cenário B (Dia Crítico):** Sexta, Sábado, Domingo e Feriados (R$ 750,00 por equipe de 3 militares).

**Como Recalcular o Orçamento Restante:**
Se houve cancelamento de equipes por chuva ou necessidade de reforço em dias de feira livre:
1. Acesse **Dashboards → Metas de Alocação**.
2. Clique no botão **"Recalcular Metas do Ciclo"**.
3. O algoritmo `ScaleOptimizer` avaliará a verba já gasta nos serviços executados até a data presente e recalculará automaticamente a quantidade ideal de equipes para os dias restantes, garantindo que o ciclo encerre sem déficit orçamentário.

---

### 3.3. Importação de Efetivo em Lote (Excel)
1. Acesse **Configurações → Gestão de Efetivo**.
2. Clique no botão **"Importar Planilha Excel"**.
3. Arraste ou selecione a planilha fornecida pela DP (`.xlsx` ou `.xls`).
4. O sistema lerá os cabeçalhos (`POSTO/GRAD`, `NOME COMPLETO`, `MATRÍCULA`, `CPF`, `OPM`) e atualizará a base cadastral de forma transparente.

---

### 3.4. Conferência Operacional de Presença (`ConferenciaOperacional`)
Ao término do serviço operacional:
1. Acesse **Gestão Operacional → Conferência Operacional**.
2. O sistema lista os policiais planejados para aquele dia.
3. Marque a presença real:
   - ✅ **Presente:** Gera o atesto para faturamento da diária.
   - 🔄 **Permuta:** Registra o militar substituto devidamente autorizado.
   - ⚠️ **Falta Justificada:** Anexa o comprovante médico/legal sem gerar faturamento indevido.
   - ❌ **Falta Não Justificada:** Registra ausência para fins disciplinares da OPM.

---

## 4. Perfil 4 — Administrador do Sistema e Suporte

### 4.1. Gestão de Contas e Desbloqueio de Usuários (`UserManager`)
1. Acesse **Configurações → Gestão de Usuários**.
2. Utilize a barra de pesquisa para buscar pelo CPF ou nome do policial.
3. **Desbloquear Conta:**
   - Se um usuário errar a senha e for travado, ele aparecerá com o status `BLOQUEADO`.
   - Clique no botão **"Desbloquear"** para restabelecer o acesso imediato.
4. **Reset de Primeiro Acesso:**
   - Se o policial esqueceu completamente a senha ou alega perda de credenciais, clique em **"Resetar 1º Acesso"**.
   - O sistema anulará a senha anterior e marcará a conta para que o policial realize novamente o fluxo de definição de senha com validação cruzada por Matrícula.

---

### 4.2. Gestão de Papéis e Permissões RBAC (`RolesManager`)
1. Acesse **Configurações → Controle de Acesso (RBAC)**.
2. Visualize os papéis cadastrados: `MILITAR`, `GERENTE`, `ADMIN`, `SUPERUSER`.
3. Para conceder ou revogar permissões granulares de um papel:
   - Clique em **"Editar Papel"**;
   - Marque ou desmarque os módulos desejados (ex: `financeiro:export`, `escalas:publish`, `usuarios:bloquear`);
   - Salve as alterações. Todos os usuários daquele papel passam a obedecer às novas regras instantaneamente.

---

### 4.3. Monitoramento Técnico e Trilha de Auditoria (`SuperUserDashboard`)
Acessível a desenvolvedores e operadores com perfil `SUPERUSER`:
1. Acesse **Configurações → Painel Técnico (Superuser)** ou clique no menu de perfil → **Painel Superuser**.
2. **Métricas de Infraestrutura:** Acompanhe o consumo de memória RAM do backend, uso de CPU e saturação de conexões do pool do PostgreSQL.
3. **Auditoria de Eventos:**
   - Monitore em tempo real as tentativas de login (com IP e User-Agent);
   - Filtre eventos por tipo: `LOGIN_FAILED`, `ACCOUNT_LOCKED`, `PASSWORD_RESET`, `SUPERUSER_ACTION`;
   - Identifique imediatamente eventuais tentativas de força bruta ou ações administrativas atípicas.
4. **Linha de Comando no Servidor (CLI):**
   - Utilize o utilitário nativo em `backend/scripts/provision_superuser.js` para adicionar novos operadores técnicos ou configurar autenticação em dois fatores (TOTP / Google Authenticator).

---

## 📞 Suporte e Contatos Internos

- **Unidade Responsável:** 9º Batalhão de Polícia Militar — Seção de Planejamento e Operações (P/3)
- **Sede:** Delmiro Gouveia — AL
- **Suporte de TI / Desenvolvimento:** Equipe Técnica GSVR / DATEN PMAL
