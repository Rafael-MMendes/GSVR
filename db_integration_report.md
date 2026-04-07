# Integração do Esquema bd.sql ao Backend Operacional

A integração do novo esquema de banco de dados foi concluída com sucesso. O objetivo de transformar o backend em uma solução relacional robusta sem quebrar a compatibilidade com o frontend foi atingido através de uma camada de mapeamento inteligente.

## 🏛️ Nova Arquitetura de Dados

O banco de dados PostgreSQL agora conta com as tabelas normalizadas conforme o padrão `bd.sql`:

- **OPM**: Gestão das unidades policiais.
- **EFETIVO**: Centralização dos dados dos militares (Matrícula, CPF, Posto, Nome de Guerra).
- **CICLOS**: Gerenciamento de períodos mensais de escala.
- **REQUERIMENTOS / DISPONIBILIDADE**: Registro granular da vontade do militar de realizar serviço.
- **ESCALA_PLANEJAMENTO**: Registro das patrulhas escaladas por dia e guarnição.

### 🛡️ Regras de Negócio no Banco (Triggers)
Implementamos triggers de validação que impedem, em nível de banco de dados, que um militar seja escalado para um turno no qual ele não declarou disponibilidade. Isso garante que a integridade da escala seja mantida mesmo em caso de erro na interface.

## 🔌 Camada de Compatibilidade (API)

Embora os dados estejam normalizados, o frontend continua recebendo os mesmos objetos JSON que esperava anteriormente.

- **Voluntários**: O endpoint `/api/volunteers` realiza um JOIN entre `REQUERIMENTOS` e `DISPONIBILIDADE`, reconstruindo o objeto `availability` (Ex: `{"1": ["07:00 ÀS 13:00"]}`) programaticamente.
- **Escalas**: O salvamento agora explode o objeto de "patrulha" em múltiplas linhas na tabela `ESCALA_PLANEJAMENTO`, associando cada militar individualmente.
- **Financeiro**: Os cálculos de orçamento e gastos agora são feitos via agregação SQL (`COUNT`, `SUM`), garantindo performance superior em bases de dados maiores.

## 🚀 Scripts de Apoio Atualizados

Os scripts de gerenciamento foram portados para o novo esquema:

1. `import_military.js`: Importa os militares do Excel diretamente para `EFETIVO` e cria os vínculos de usuário.
2. `create_users.js`: Atribui o status de administrador aos gestores configurados.

## ✅ Verificações Finais

| Componente | Status | Observação |
| :--- | :--- | :--- |
| Login | 🟢 OK | Validado contra `matricula/cpf` na nova tabela `users`. |
| Solicitação (Form) | 🟢 OK | Gravação transacional em `REQUERIMENTOS` e `DISPONIBILIDADE`. |
| Montagem de Escala | 🟢 OK | Drag-and-drop persistindo em `ESCALA_PLANEJAMENTO`. |
| Relatórios Financeiros | 🟢 OK | Totais batem com a escala planejada. |
| Integridade Referencial | 🟢 OK | Foreign Keys ativas e protegendo os dados. |

> [!IMPORTANT]
> A migração foi realizada com **ZERO** alterações no código do Frontend. O sistema está pronto para produção com o novo motor PostgreSQL.
