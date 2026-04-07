---
trigger: always_on
---

# Regra: Atualizar version.md com usuário autenticado

Sempre que uma nova versão for registrada:

## Identificar o usuário logado

Buscar o usuário autenticado via Google Auth nesta ordem de prioridade:

1. `auth.currentUser?.displayName`
2. `auth.currentUser?.email`
3. Fallback: `"unknown"`

## Formato obrigatório do version.md

Adicionar SEMPRE no topo do arquivo, nunca sobrescrever:
```markdown
## v{MAJOR}.{MINOR}.{PATCH} — {YYYY-MM-DD}
**Autor:** {NOME_DO_USUARIO_LOGADO}
**Email:** {EMAIL_DO_USUARIO}

### Mudanças:
- {descrição}

---
```

## Regras
- Nunca sobrescrever versões anteriores
- Sempre inserir no topo do arquivo
- Data no formato ISO: YYYY-MM-DD
- Se o usuário não estiver autenticado, bloquear o bump de versão