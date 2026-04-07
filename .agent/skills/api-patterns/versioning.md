# Versionamento e Governança do Projeto

Este projeto utiliza um sistema de versionamento semântico (SemVer) e governança de contribuições para garantir a rastreabilidade em um ambiente de múltiplos desenvolvedores.

## 1. Regras de Manutenção do `VERSION.md`

Toda alteração significativa (Recurso, Bugfix ou Mudança Estrutural) **DEVE** gerar uma nova entrada no arquivo `VERSION.md`.

### 1.1 Formato do Cabeçalho de Versão
O cabeçalho deve seguir rigorosamente o padrão:
`## [vX.X.X] - YYYY-MM-DD (Descrição Curta) - [Desenvolvedor: Nome]`

- **Nome Padrão**: O nome do desenvolvedor principal logado é **Alan Kleber**.

### 1.2 Categorias de Mudança
As mudanças devem ser agrupadas nos seguintes blocos:
- `### Adicionado (Added)`: Novos recursos.
- `### Modificado (Changed)`: Alterações em lógica ou interface existente.
- `### Corrigido (Fixed)`: Correções de bugs.
- `### Infraestrutura (Infrastructure)`: Mudanças em Docker, Banco de Dados, CI/CD.

## 2. Padrão de Commits e Logs
- Sempre use o idioma **Português (Brasil)** para as descrições em arquivos de documentação.
- O código e os comentários internos do código permanecem em **Inglês**.

## 3. Versionamento de API
- **Mudanças Estéticas**: Não exigem mudança de versão de API, apenas registro no `VERSION.md`.
- **Mudanças que Quebram (Breaking Changes)**: Exigem incremento na versão **Major** (vX.0.0).
- **Novos Endpoints**: Incremento na versão **Minor** (v0.X.0).
- **Refatoração Interna**: Incremento no **Patch** (v0.0.X).
