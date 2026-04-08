# Task — RBAC & Perfil de Usuário

> Última atualização: 2026-04-08 | Status geral: **✅ Concluído**

## Fase 1 — Banco de Dados ✅ COMPLETA
- [x] Criar DDL das novas tabelas (user_profiles, password_reset_tokens, refresh_tokens, roles, permissions, role_permissions, user_roles)
- [x] Atualizar db.js com o schema novo, índices e seeds (roles + permissões + migração is_admin)

## Fase 2 — Backend Auth ✅ COMPLETA
- [x] Instalar dependências: bcrypt, jsonwebtoken → `backend/package.json`
- [x] Criar middleware `authenticate` (verifica JWT via Bearer token)
- [x] Criar middleware `authorize(...perms)` (verifica permissões RBAC granulares)
- [x] Implementar `POST /api/login` (retrocompatível: legado + bcrypt progressivo + JWT + Refresh)
- [x] Implementar `POST /api/auth/refresh` (renova access token)
- [x] Implementar `POST /api/auth/logout` (revoga refresh token no banco)
- [x] Implementar `POST /api/auth/password/change`
- [x] Implementar `POST /api/auth/password/forgot` (token SHA-256 descartável 12h)
- [x] Implementar `POST /api/auth/password/reset`

## Fase 3 — Backend Perfil & RBAC Admin ✅ COMPLETA
- [x] Implementar `GET /api/me`
- [x] Implementar `PUT /api/me/profile` (email, telefone via upsert)
- [x] Implementar `POST /api/me/avatar` (multer disk, 5MB max)
- [x] Implementar `DELETE /api/me/avatar`
- [x] Implementar `DELETE /api/me` (soft delete — deleted_at + status=inativo)
- [x] Implementar `GET/POST/PUT/DELETE /api/roles` (CRUD com proteção de roles de sistema)
- [x] Implementar `GET /api/permissions` (agrupadas por módulo)
- [x] Implementar `PUT /api/usuarios/:id/roles` (atribuir roles a usuário)
- [x] Aplicar `authorize()` nos endpoints de roles e permissions

## Fase 4 — Frontend ✅ COMPLETA
- [x] Criar `ProfilePage.jsx` (avatar, dados pessoais, alterar senha com indicador de força)
- [x] Criar `RolesManager.jsx` (listagem, expansão, modal criar/editar role + permissões por módulo)
- [x] Criar `hooks/useAuth.js` (JWT, refresh, hasPermission, hasRole, localStorage)
- [x] Implementar hasPermission no `App.jsx` (proteção de rotas e menus)
- [x] Atualizar `LoginScreen.jsx` (JWT storage, olho na senha, shake animation)
- [x] Atualizar `App.jsx` (restauração de sessão, logout com revogação, menu Perfil, rota `roles`)

## Fase 5 — Segurança Avançada ✅ COMPLETA
- [x] Rate limiting: `loginLimiter` (5/min) em `/api/login`
- [x] Rate limiting: `authLimiter` (15/min) em `/auth/password/forgot` e `/auth/password/reset`
- [x] Helmet.js: headers HTTP de segurança (com try/catch para graceful fallback)
- [x] Audit log: `auditLog()` em LOGIN_SUCCESS, LOGIN_FAILED, com userId, IP e timestamp
- [x] Adicionar `helmet` e `express-rate-limit` ao `backend/package.json`

## Pendências Opcionais (Futuro)
- [ ] Implementar logs de auditoria em banco (tabela `audit_logs`) no lugar do console
- [ ] Testes automatizados E2E dos fluxos de auth (Jest/Playwright)
- [ ] Configurar SMTP para envio real de e-mail no password/forgot
- [ ] Validar e aplicar `authorize()` em TODOS os endpoints existentes (escalas, ciclos, efetivo)
- [ ] Página de "Acesso Negado" dedicada no frontend (atualmente apenas esconde menus)
