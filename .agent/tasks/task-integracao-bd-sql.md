# Plano de Implementação: Integração de Novo Esquema de Banco de Dados

Este plano descreve a integração do arquivo `bd.sql` ao projeto, convertendo-o para PostgreSQL e adaptando o backend para manter a compatibilidade total com o frontend existente.

## 🎯 Objetivos
- Integrar a estrutura de `bd.sql` (OPM, EFETIVO, CICLOS, etc).
- Converter a sintaxe de MySQL para PostgreSQL.
- **Impacto Zero no Frontend**: Manter os contratos de API intactos.
- Aplicar padrões de excelência (Logs, Triggers de Negócio, Conexão Robusta).

## 🛠️ Alterações Sugeridas

### 1. Camada de Dados (`backend/db.js`)
- Converter o esquema de `bd.sql` para PostgreSQL.
- Implementar Triggers para validação de regras de negócio (disponibilidade).
- Adicionar suporte a `OPM` padrão e Mês Corrente (Ciclo).

### 2. Camada de Aplicação (`backend/server.js`)
- **Mapeamento de Endpoints**:
  - `/api/login`: Buscar em `EFETIVO`.
  - `/api/volunteers`: Mapear para `REQUERIMENTOS` + `DISPONIBILIDADE_REQUERIMENTO`.
  - `/api/schedules`: Mapear para `ESCALA_PLANEJAMENTO`.
- **Simplificação de Dados**: Garantir que as queries complexas retornem o JSON no formato esperado pelo frontend (compatibilidade retroativa).

### 3. Scripts de Apoio
- Atualizar `import_military.js` para popular a tabela `EFETIVO`.
- Criar script de inicialização para garantir a existência de uma OPM padrão.

## 🚀 Cronograma de Execução

| Fase | Atividade | Status |
| :--- | :--- | :--- |
| **P1** | Conversão e Inicialização do SQL em `db.js` | ⏳ Pendente |
| **P2** | Refatoração de Queries no `server.js` | ⏳ Pendente |
| **P3** | Atualização de Scripts de Importação | ⏳ Pendente |
| **P4** | Auditoria de Qualidade e Versionamento | ⏳ Pendente |

## ⚠️ Questões Estratégicas (Socratic Gate)
1. **Migração de Dados**: Deseja manter o histórico de `schedules` e `volunteers` atuais ou podemos resetar para a nova arquitetura?
2. **Autenticação**: O login permanecerá sendo `matricula` + `cpf`? (No `bd.sql`, `matricula` é a chave).
3. **OPM**: Qual o nome da Unidade Militar padrão para o cadastro inicial?

---
> [!IMPORTANT]
> Nenhuma linha de código do Frontend será alterada. Toda a mágica acontecerá na refatoração da camada de acesso a dados.
