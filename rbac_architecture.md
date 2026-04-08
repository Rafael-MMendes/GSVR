# 🏗️ Arquitetura — Módulos de Perfil de Usuário & Controle de Acesso (RBAC)

> **Sistema:** Gestão de Força Tarefa — 9º BPM/PMAL  
> **Arquiteto:** Antigravity (Senior Full-Stack)  
> **Skills Aplicadas:** `@[architecture]` `@[database-design]` `@[api-patterns]`  
> **Data:** 2026-04-07

---

## 1. Contexto & Decisões de Arquitetura

### Stack Atual (Referência)
| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Express |
| Banco | PostgreSQL 14+ (Docker) |
| Auth Atual | Matrícula + CPF em texto plano |
| Frontend | React + Vite |

### 🔴 Problema Identificado na Auth Atual
A tabela `users` atual armazena senhas em **texto plano** (CPF sem hash), e o controle de acesso é binário (`is_admin = 0/1`). Isso é inaceitável em produção.

### ADR-001 — Manter retrocompatibilidade
> **Decisão:** Evoluir a tabela `users` com `ALTER TABLE` em vez de recriá-la.  
> **Justificativa:** Há usuários cadastrados. Uma reescrita destruiria os dados.  
> **Trade-off:** Migração cuidadosa requerida para adicionar `password_hash` e `password_salt`.

### ADR-002 — JWT com Refresh Token (Stateless)
> **Decisão:** Usar JWT de curta duração (15 min) + Refresh Token em banco (rotativo).  
> **Justificativa:** Sem servidor de sessão; escala horizontalmente; revogação possível.  
> **Trade-off:** Complexidade maior vs. segurança real.

### ADR-003 — RBAC Flat (sem hierarquia nativa)
> **Decisão:** Roles predefinidas com permissões M:N, sem herança de roles.  
> **Justificativa:** O sistema é pequeno; herança adiciona complexidade sem benefício imediato.  
> **Trade-off:** Fácil de implementar, mas pode precisar evoluir para ABAC no futuro.

---

## 2. Modelagem do Banco de Dados

### 2.1 Diagrama de Entidades e Relacionamentos

```
EFETIVO (1) ──────────── (1) users
                                │
                    ┌───────────┴────────────┐
                    │                        │
               user_profiles           user_roles (N:M)
               (1:1 com users)              │
                                       roles (1)
                                            │
                                   role_permissions (N:M)
                                            │
                                      permissions (1)
                    
users (1) ──── (N) password_reset_tokens
users (1) ──── (N) refresh_tokens
```

---

### 2.2 DDL Completo — PostgreSQL

```sql
-- ============================================================
-- MIGRAÇÃO: Evolução da tabela users existente
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash  TEXT,
  ADD COLUMN IF NOT EXISTS password_salt  TEXT,
  ADD COLUMN IF NOT EXISTS status         VARCHAR(20) NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Remover is_admin após migração de dados para user_roles
-- (manter temporariamente para rollback)

-- ============================================================
-- MÓDULO 1: PERFIL DE USUÁRIO
-- ============================================================

-- Perfil estendido do usuário (1:1 com users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Dados pessoais
  email           VARCHAR(255) UNIQUE,
  telefone        VARCHAR(30),
  
  -- Avatar
  avatar_url      TEXT,                    -- URL para arquivo no storage
  avatar_filename TEXT,                    -- Nome original do arquivo
  
  -- Status da conta
  status_ativo    BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at      TIMESTAMP,               -- Exclusão lógica (soft delete)
  
  -- Auditoria
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tokens para redefinição de senha (12h de validade)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  token_hash      TEXT NOT NULL UNIQUE,    -- SHA-256 do token (nunca o token bruto)
  expires_at      TIMESTAMP NOT NULL,      -- CURRENT_TIMESTAMP + INTERVAL '12 hours'
  used_at         TIMESTAMP,              -- Nulo = não usado; data = já consumido
  ip_solicitante  INET,
  
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens para renovação de JWT
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  token_hash      TEXT NOT NULL UNIQUE,    -- SHA-256 do token
  expires_at      TIMESTAMP NOT NULL,      -- 7 dias
  revoked_at      TIMESTAMP,              -- Nulo = válido; data = revogado
  ip_criacao      INET,
  user_agent      TEXT,
  
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MÓDULO 2: CONTROLE DE ACESSO (RBAC)
-- ============================================================

-- Roles do sistema
CREATE TABLE IF NOT EXISTS roles (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(50) NOT NULL UNIQUE,  -- 'ADMIN', 'GERENTE', 'MILITAR'
  descricao       TEXT,
  is_sistema      BOOLEAN NOT NULL DEFAULT FALSE, -- Roles padrão não podem ser excluídas
  
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Catálogo de permissões granulares
CREATE TABLE IF NOT EXISTS permissions (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(100) NOT NULL UNIQUE,  -- Ex: 'efetivo:read', 'ciclos:create'
  descricao       TEXT,
  modulo          VARCHAR(50),                   -- 'efetivo', 'ciclos', 'usuarios', etc.
  
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Associação N:M — Roles ↔ Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id         INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id   INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Associação N:M — Users ↔ Roles
CREATE TABLE IF NOT EXISTS user_roles (
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id         INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  atribuido_por   INTEGER REFERENCES users(id),  -- Auditoria de quem concedeu
  atribuido_em    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id        ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email          ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at     ON user_profiles(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prt_token_hash               ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_expires_used             ON password_reset_tokens(expires_at, used_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash          ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id           ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id     ON role_permissions(role_id);

-- ============================================================
-- SEED — Roles e Permissões Padrão
-- ============================================================
INSERT INTO roles (nome, descricao, is_sistema) VALUES
  ('ADMIN',   'Administrador do Sistema — acesso total',             TRUE),
  ('GERENTE', 'Gerente Operacional — acesso a escalas e ciclos',     TRUE),
  ('MILITAR', 'Militar — acesso básico ao próprio perfil e requerimentos', TRUE)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO permissions (code, descricao, modulo) VALUES
  -- Módulo Efetivo
  ('efetivo:read',   'Visualizar efetivo',              'efetivo'),
  ('efetivo:create', 'Cadastrar militar',               'efetivo'),
  ('efetivo:update', 'Editar dados de militar',        'efetivo'),
  ('efetivo:delete', 'Excluir militar do sistema',     'efetivo'),
  ('efetivo:import', 'Importar efetivo via planilha',  'efetivo'),
  -- Módulo Ciclos
  ('ciclos:read',    'Visualizar ciclos',               'ciclos'),
  ('ciclos:create',  'Criar ciclo de escala',           'ciclos'),
  ('ciclos:update',  'Editar ciclo',                    'ciclos'),
  ('ciclos:delete',  'Encerrar/excluir ciclo',          'ciclos'),
  -- Módulo Escalas
  ('escalas:read',   'Visualizar escalas',              'escalas'),
  ('escalas:create', 'Criar escala',                    'escalas'),
  ('escalas:update', 'Editar escala',                   'escalas'),
  -- Módulo Usuários
  ('usuarios:read',  'Visualizar usuários',             'usuarios'),
  ('usuarios:admin', 'Gerenciar contas e permissões',  'usuarios'),
  -- Módulo Financeiro
  ('financeiro:read','Visualizar financeiro',           'financeiro'),
  -- Módulo Perfil (próprio usuário — sempre liberado)
  ('perfil:read',    'Ver próprio perfil',              'perfil'),
  ('perfil:update',  'Editar próprio perfil',           'perfil')
ON CONFLICT (code) DO NOTHING;

-- Atribuir permissões às roles
-- ADMIN: todas as permissões
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p WHERE r.nome = 'ADMIN'
ON CONFLICT DO NOTHING;

-- GERENTE: leitura/escrita em ciclos, escalas, efetivo (não exclui)
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.nome = 'GERENTE'
    AND p.code IN (
      'efetivo:read', 'efetivo:create', 'efetivo:update',
      'ciclos:read',  'ciclos:create',  'ciclos:update',
      'escalas:read', 'escalas:create', 'escalas:update',
      'financeiro:read',
      'perfil:read',  'perfil:update'
    )
ON CONFLICT DO NOTHING;

-- MILITAR: acesso mínimo
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.nome = 'MILITAR'
    AND p.code IN ('escalas:read', 'perfil:read', 'perfil:update')
ON CONFLICT DO NOTHING;

-- Migração: converter is_admin para roles
INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, r.id
  FROM users u, roles r
  WHERE u.is_admin = 1 AND r.nome = 'ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, r.id
  FROM users u, roles r
  WHERE (u.is_admin IS NULL OR u.is_admin = 0) AND r.nome = 'MILITAR'
ON CONFLICT DO NOTHING;
```

---

## 3. API REST — Endpoints

> Prefixo base: `/api/v1`  
> Autenticação: `Authorization: Bearer <jwt_access_token>` em todos os endpoints protegidos.

### 3.1 Autenticação

| Método | Rota | Descrição | Auth? |
|--------|------|-----------|-------|
| `POST` | `/auth/login` | Login com matrícula + senha | ❌ |
| `POST` | `/auth/logout` | Revoga o refresh token | ✅ |
| `POST` | `/auth/refresh` | Renova o access token via refresh token | ❌ |
| `POST` | `/auth/password/forgot` | Solicita e-mail de redefinição | ❌ |
| `POST` | `/auth/password/reset` | Redefine senha com token | ❌ |
| `POST` | `/auth/password/change` | Altera senha (usuário autenticado) | ✅ |

### 3.2 Perfil de Usuário (própria conta)

| Método | Rota | Descrição | Permissão |
|--------|------|-----------|-----------|
| `GET` | `/me` | Retorna dados completos do usuário logado | `perfil:read` |
| `PUT` | `/me/profile` | Atualiza dados pessoais (email, telefone) | `perfil:update` |
| `POST` | `/me/avatar` | Upload de foto de perfil (multipart) | `perfil:update` |
| `DELETE` | `/me/avatar` | Remove foto de perfil | `perfil:update` |
| `DELETE` | `/me` | Exclusão lógica da própria conta | `perfil:update` |

### 3.3 Gestão de Usuários (Admin)

| Método | Rota | Descrição | Permissão |
|--------|------|-----------|-----------|
| `GET` | `/usuarios` | Lista todos os usuários | `usuarios:read` |
| `GET` | `/usuarios/:id` | Detalhe de um usuário | `usuarios:read` |
| `POST` | `/usuarios` | Cria conta de acesso para um militar | `usuarios:admin` |
| `PUT` | `/usuarios/:id` | Atualiza dados de usuário | `usuarios:admin` |
| `DELETE` | `/usuarios/:id` | Remove conta de acesso | `usuarios:admin` |
| `PUT` | `/usuarios/:id/roles` | Define roles de um usuário | `usuarios:admin` |
| `POST` | `/usuarios/:id/password/reset` | Reset de senha (admin) | `usuarios:admin` |
| `GET` | `/militares/not-users` | Militares sem conta de acesso | `usuarios:admin` |

### 3.4 Roles & Permissões (RBAC Admin)

| Método | Rota | Descrição | Permissão |
|--------|------|-----------|-----------|
| `GET` | `/roles` | Lista todos os roles | `usuarios:admin` |
| `GET` | `/roles/:id` | Detalhe de um role com suas permissões | `usuarios:admin` |
| `POST` | `/roles` | Cria novo role customizado | `usuarios:admin` |
| `PUT` | `/roles/:id` | Edita role (não é_sistema) | `usuarios:admin` |
| `DELETE` | `/roles/:id` | Remove role (não é_sistema) | `usuarios:admin` |
| `PUT` | `/roles/:id/permissions` | Atualiza permissões de um role | `usuarios:admin` |
| `GET` | `/permissions` | Lista todas as permissões disponíveis | `usuarios:admin` |

### 3.5 Formato de Resposta Padrão

```json
// ✅ Sucesso
{ "success": true, "data": { ... } }

// ❌ Erro
{ "success": false, "error": { "code": "AUTH_INVALID_TOKEN", "message": "Token expirado." } }

// 📋 Lista com paginação
{
  "success": true,
  "data": [ ... ],
  "meta": { "total": 183, "page": 1, "limit": 20, "pages": 10 }
}
```

---

## 4. Boas Práticas de Segurança

### 4.1 Armazenamento de Senha

```javascript
// ✅ CORRETO — bcrypt com salt rounds ≥ 12
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}
```

> **Migração de senhas existentes:** Na primeira vez que o usuário logar após a migração, o sistema deve comparar com CPF (texto plano), e se correto, salvar o hash bcrypt automaticamente. Após isso, a coluna `password` legada pode ser apagada.

### 4.2 JWT — Dois Tokens

```javascript
const jwt = require('jsonwebtoken');

// Access Token: curta duração, stateless
function issueAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
}

// Refresh Token: longa duração, salvo no banco (hash SHA-256)
const crypto = require('crypto');
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

| Token | Duração | Onde fica | Como revogar |
|-------|---------|-----------|--------------|
| Access Token | 15 min | Memória JS (frontend) | Expiração natural |
| Refresh Token | 7 dias | HttpOnly Cookie + BD | DELETE na tabela `refresh_tokens` |

### 4.3 Middleware de Autorização (Backend)

```javascript
// Middleware reutilizável
function authorize(...requiredPermissions) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });

    const userPermissions = await getUserPermissions(req.user.id);

    const hasAll = requiredPermissions.every(p => userPermissions.includes(p));
    if (!hasAll) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Acesso negado.' } });
    }
    next();
  };
}

// Uso nos endpoints
app.get('/api/v1/usuarios', authenticate, authorize('usuarios:read'), handleGetUsuarios);
app.post('/api/v1/roles', authenticate, authorize('usuarios:admin'), handleCreateRole);
```

### 4.4 Validação de Autorização (Frontend — React)

```jsx
// Hook para verificar permissões no cliente
function useHasPermission(...perms) {
  const { user } = useAuth();
  return perms.every(p => user?.permissions?.includes(p));
}

// Componente guardião de rotas
function ProtectedRoute({ permission, children }) {
  const allowed = useHasPermission(permission);
  return allowed ? children : <Navigate to="/unauthorized" />;
}

// Uso nos componentes
<ProtectedRoute permission="usuarios:admin">
  <UserManager />
</ProtectedRoute>
```

> ⚠️ **Importante:** Validação no frontend é apenas **UX**, não segurança. A autorização real sempre ocorre no backend.

### 4.5 Fluxo de Password Reset

```
1. Usuário solicita reset → POST /auth/password/forgot { matricula }
2. Backend gera token aleatório (32 bytes): crypto.randomBytes(32).toString('hex')
3. Salva SHA-256(token) na tabela password_reset_tokens (validade 12h)
4. Envia e-mail com link: /reset-password?token={RAW_TOKEN}
5. Usuário clica → Frontend envia: POST /auth/password/reset { token, newPassword }
6. Backend verifica SHA-256(token) no banco, validade, se já usado
7. Atualiza senha com bcrypt.hash(newPassword, 12)
8. Marca token como usado (used_at = NOW())
```

### 4.6 Checklist de Segurança

| Item | Status / Ação |
|------|--------------|
| Senhas hash com bcrypt (rounds ≥ 12) | 🔴 Implementar |
| JWT de curta duração (15 min) | 🔴 Implementar |
| Refresh Token rotativo com blacklist | 🔴 Implementar |
| Password reset com token descartável | 🔴 Implementar |
| HTTPS em produção | 🟡 Configurar no Nginx/proxy |
| Rate limiting em `/auth/login` | 🔴 Adicionar (3 tentativas/min) |
| Headers de segurança (Helmet.js) | 🔴 Adicionar |
| Sanitização de inputs | 🟡 Verificar |
| Logs de auditoria de acesso | 🔴 Implementar |
| Exclusão lógica de contas | 🔴 Implementar (soft delete) |

---

## 5. Plano de Evolução (Fases)

### Fase 1 — Fundação (Urgente)
- [ ] Rodar DDL das novas tabelas via migração controlada
- [ ] Implementar bcrypt para novas senhas
- [ ] Migrar `is_admin` para `user_roles`
- [ ] Implementar JWT (15min) + Refresh Token (7 dias)

### Fase 2 — RBAC Ativo
- [ ] Criar middleware `authorize()` baseado em permissions
- [ ] Aplicar `authorize()` em todos os endpoints existentes
- [ ] Criar tela de gerenciamento de Roles/Permissions no Admin
- [ ] Implementar `ProtectedRoute` e `useHasPermission` no React

### Fase 3 — Perfil Completo
- [ ] Implementar endpoints `/me` e `/me/profile`
- [ ] Criar componente `ProfilePage` no frontend
- [ ] Upload de avatar (armazenar localmente ou Cloudinary)
- [ ] Implementar fluxo de password reset (com e-mail via Nodemailer)

### Fase 4 — Segurança Avançada
- [ ] Rate limiting com express-rate-limit
- [ ] Helmet.js para headers HTTP
- [ ] Logs de auditoria de ações sensíveis
- [ ] Testes automatizados dos fluxos de auth

---

## 6. Dependências NPM Necessárias

```bash
npm install bcrypt jsonwebtoken crypto express-rate-limit helmet multer
```

| Pacote | Finalidade |
|--------|-----------|
| `bcrypt` | Hash de senhas |
| `jsonwebtoken` | Emissão e verificação de JWT |
| `express-rate-limit` | Rate limiting nas rotas de auth |
| `helmet` | Headers de segurança HTTP |
| `multer` | Upload de avatar (multipart/form-data) |

---

## 7. Questões em Aberto

> [!IMPORTANT]
> Responda antes de iniciar a implementação:

1. **E-mail:** O sistema dispõe de SMTP configurado para enviar o e-mail de password reset? Ou deve usar um link copiável?
2. **Avatar:** Onde armazenar imagens? Local (volume Docker) ou serviço externo (S3, Cloudinary)?
3. **2FA:** há interesse em autenticação de dois fatores no futuro? Isso afeta a modelagem do token.
4. **Roles Customizados:** Admins poderão criar roles personalizados? Ou apenas usar os 3 predefinidos?
