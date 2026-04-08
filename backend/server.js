process.env.FORCE_COLOR = '0';
process.env.NO_COLOR = '1';
process.env.TERM = 'dumb';

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Fase 4: Segurança avançada
let helmet, rateLimit;
try { helmet = require('helmet'); } catch { console.warn('[WARN] helmet não disponível, pulando headers de segurança.'); }
try { rateLimit = require('express-rate-limit'); } catch { console.warn('[WARN] express-rate-limit não disponível, pulando rate limiting.'); }

let pdfParser;
try { pdfParser = require('pdf-parse'); } catch (e) { console.warn('pdf-parse nao disponivel'); }

const { setupDB } = require('./db');
// Multer configurado para memória (Excel) e disco (avatares)
const uploadMemory = multer({ storage: multer.memoryStorage() });
const upload = uploadMemory; // alias legado
const AVATARS_DIR = '/tmp/avatars';
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });
const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: AVATARS_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Apenas imagens são aceitas'));
    cb(null, true);
  }
});

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'ft_jwt_secret_dev_2026_change_in_prod';
const JWT_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_DAYS = 7;
const BCRYPT_ROUNDS = 12;

const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getCurrentMonthKey() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; }
function getMonthName(monthKey) { const [year, month] = monthKey.split('-'); return `${monthNames[parseInt(month) - 1]} / ${year}`; }
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function generateToken() { return crypto.randomBytes(32).toString('hex'); }

const rankMap = { 
  'CEL': 'CEL PM', 'CEL PM': 'CEL PM',
  'TC': 'TC PM', 'TEN CEL': 'TC PM', 'TC PM': 'TC PM',
  'MAJ': 'MAJ PM', 'MAJ PM': 'MAJ PM',
  'CAP': 'CAP PM', 'CAP PM': 'CAP PM',
  '1º TEN': '1º TEN PM', '1º TEN PM': '1º TEN PM',
  '2º TEN': '2º TEN PM', '2º TEN PM': '2º TEN PM',
  'SUB': 'SUB PM', 'SUB PM': 'SUB PM', 'SUBTEN': 'SUB PM',
  '1º SGT': '1º SGT PM', '1º SGT PM': '1º SGT PM',
  '2º SGT': '2º SGT PM', '2º SGT PM': '2º SGT PM',
  '3º SGT': '3º SGT PM', '3º SGT PM': '3º SGT PM',
  'CB': 'CB PM', 'CABO': 'CB PM', 'CB PM': 'CB PM',
  'SD': 'SD PM', 'SOLDADO': 'SD PM', 'SD PM': 'SD PM',
  'ASP': 'ASP PM', 'ASP PM': 'ASP PM', 'ASP OF': 'ASP PM'
};

function normalizeRank(rank) {
  if (!rank) return 'SD PM';
  const r = String(rank).toUpperCase().trim();
  // Se já é uma sigla padrão do rankMap, retorna a versão mapeada ou a própria r
  return rankMap[r] || r; 
}

function padCpf(cpf) {
  if (!cpf) return '';
  const cleaned = String(cpf).replace(/\D/g, '');
  return cleaned.padStart(11, '0');
}

const ROLES = ['Comandante', 'Motorista', 'Patrulheiro'];

app.use(cors());
app.use(express.json());
// Servir avatares estáticos
app.use('/avatars', express.static(AVATARS_DIR));

// ============================================================
// FASE 4 — SEGURANÇA AVANÇADA: Helmet + Rate Limiting
// ============================================================
if (helmet) {
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' } // permite servir avatares cross-origin
  }));
  console.log('[Security] Helmet ativado — headers HTTP protegidos.');
}

// Rate limit geral para rotas de auth: 15 req/min por IP
const authLimiter = rateLimit ? rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas. Aguarde 1 minuto.' } }
}) : (req, res, next) => next();

// Rate limit estrito para /login: 5 tentativas/min
const loginLimiter = rateLimit ? rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas de login. Aguarde 1 minuto.' } }
}) : (req, res, next) => next();

// Audit log simples (pode ser trocado por Pino/Winston)
function auditLog(userId, action, metadata = {}) {
  const entry = {
    ts: new Date().toISOString(),
    userId,
    action,
    ...metadata
  };
  console.log(`[AUDIT] ${JSON.stringify(entry)}`);
}

// ============================================================
// UTILITÁRIOS RBAC
// ============================================================
async function getUserPermissions(userId) {
  // 1. Buscar permissões via Roles
  const rolesPermissions = await db.query(`
    SELECT DISTINCT p.code
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = $1
  `, [userId]);

  // 2. Buscar permissões diretas do usuário
  const directPermissions = await db.query(`
    SELECT p.code, up.permitido
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = $1
  `, [userId]);

  const permissionsSet = new Set(rolesPermissions.rows.map(r => r.code));

  // 3. Aplicar permissões diretas (Adicionar ou Remover)
  directPermissions.rows.forEach(p => {
    if (p.permitido) {
      permissionsSet.add(p.code);
    } else {
      permissionsSet.delete(p.code);
    }
  });

  return Array.from(permissionsSet);
}

async function getUserRoles(userId) {
  const { rows } = await db.query(`
    SELECT r.nome FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1
  `, [userId]);
  return rows.map(r => r.nome);
}

// ============================================================
// MIDDLEWARES AUTH & RBAC
// ============================================================
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token não fornecido.' } });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Token inválido ou expirado.' } });
  }
}

function authorize(...requiredPermissions) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    try {
      const userPermissions = await getUserPermissions(req.user.id);
      const hasAll = requiredPermissions.every(p => userPermissions.includes(p));
      if (!hasAll) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado.' } });
      next();
    } catch (e) {
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } });
    }
  };
}

let db;
setupDB().then(database => { db = database; app.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`)); }).catch(err => console.error("DB error:", err));

// ============================================================
// AUTH — Login (retrocompatível: texto plano → bcrypt progressivo)
// ============================================================
app.post('/api/login', loginLimiter, async (req, res) => {
  const { numero_ordem, cpf, password } = req.body;
  const plainCred = password || cpf; // suporta campo antigo 'cpf' e novo 'password'
  try {
    const user = await db.get('SELECT * FROM users WHERE numero_ordem = $1', [numero_ordem]);
    if (!user) return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: 'Credenciais inválidas.' } });

    let credOk = false;
    if (user.password_hash) {
      // Senha já migrada para bcrypt
      credOk = await bcrypt.compare(plainCred, user.password_hash);
    } else {
      // Legado: comparação direta com CPF texto plano
      credOk = (user.password === plainCred);
      if (credOk) {
        // Migração progressiva: salva o hash bcrypt silenciosamente
        const hash = await bcrypt.hash(plainCred, BCRYPT_ROUNDS);
        await db.run('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, user.id]);
      }
    }

    if (!credOk) {
      auditLog(null, 'LOGIN_FAILED', { numero_ordem, ip: req.ip });
      return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: 'Credenciais inválidas.' } });
    }

    // Busca dados militares e permissões
    const military = await db.get('SELECT posto_graduacao, nome_guerra, nome_completo, telefone FROM EFETIVO WHERE matricula = $1', [numero_ordem]);
    const permissions = await getUserPermissions(user.id);
    const roles = await getUserRoles(user.id);

    // Emite Access Token (15 min)
    const accessToken = jwt.sign(
      { id: user.id, numero_ordem, is_admin: user.is_admin === 1, roles, permissions },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Emite Refresh Token (7 dias) e salva hash no banco
    const rawRefresh = generateToken();
    const refreshHash = hashToken(rawRefresh);
    const refreshExpires = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await db.run(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_criacao, user_agent) VALUES ($1,$2,$3,$4,$5)',
      [user.id, refreshHash, refreshExpires, req.ip, req.headers['user-agent'] || null]
    );

    // Atualiza last_login e registra audit
    await db.run('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);
    auditLog(user.id, 'LOGIN_SUCCESS', { numero_ordem, ip: req.ip, roles });

    res.json({
      success: true,
      access_token: accessToken,
      refresh_token: rawRefresh,
      user: {
        id: user.id,
        numero_ordem,
        is_admin: user.is_admin === 1,
        roles,
        permissions,
        rank: normalizeRank(military?.posto_graduacao),
        nome_guerra: military?.nome_guerra || '',
        nome_completo: military?.nome_completo || '',
        phone: military?.telefone || ''
      }
    });
  } catch (e) { res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } }); }
});

// Renovar Access Token via Refresh Token
app.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN' } });
  try {
    const hash = hashToken(refresh_token);
    const stored = await db.get(
      'SELECT * FROM refresh_tokens WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > NOW()',
      [hash]
    );
    if (!stored) return res.status(401).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Refresh token inválido ou expirado.' } });

    const user = await db.get('SELECT * FROM users WHERE id=$1', [stored.user_id]);
    const permissions = await getUserPermissions(user.id);
    const roles = await getUserRoles(user.id);

    const accessToken = jwt.sign(
      { id: user.id, numero_ordem: user.numero_ordem, is_admin: user.is_admin === 1, roles, permissions },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({ success: true, access_token: accessToken });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// Logout — revoga o Refresh Token
app.post('/api/auth/logout', authenticate, async (req, res) => {
  const { refresh_token } = req.body;
  try {
    if (refresh_token) {
      const hash = hashToken(refresh_token);
      await db.run('UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1', [hash]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// Alterar própria senha (autenticado)
app.post('/api/auth/password/change', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ success: false, error: { message: 'Senha atual e nova senha são obrigatórias.' } });
  if (new_password.length < 6) return res.status(400).json({ success: false, error: { message: 'A nova senha deve ter no mínimo 6 caracteres.' } });
  try {
    const user = await db.get('SELECT * FROM users WHERE id=$1', [req.user.id]);
    let currentOk = false;
    if (user.password_hash) currentOk = await bcrypt.compare(current_password, user.password_hash);
    else currentOk = (user.password === current_password);
    if (!currentOk) return res.status(401).json({ success: false, error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Senha atual incorreta.' } });

    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await db.run('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [newHash, user.id]);
    // Revogar todos os refresh tokens (força relogin)
    await db.run('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [user.id]);
    res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// Solicitar reset de senha — rate limited: 15/min
app.post('/api/auth/password/forgot', authLimiter, async (req, res) => {
  const { numero_ordem } = req.body;
  if (!numero_ordem) return res.status(400).json({ success: false, error: { message: 'Matrícula obrigatória.' } });
  try {
    const user = await db.get('SELECT id FROM users WHERE numero_ordem=$1', [numero_ordem]);
    // Resposta genérica (não revela se o usuário existe)
    if (!user) return res.json({ success: true, message: 'Se a matrícula existir, um token de reset foi gerado.' });

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12h
    // Invalidar tokens anteriores
    await db.run('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [user.id]);
    await db.run(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_solicitante) VALUES ($1,$2,$3,$4)',
      [user.id, tokenHash, expiresAt, req.ip]
    );
    // Em produção: enviar e-mail. Por ora, retorna token para o admin
    res.json({ success: true, message: 'Token de reset gerado.', reset_token: rawToken, expires_at: expiresAt });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// Redefinir senha com token — rate limited: 15/min
app.post('/api/auth/password/reset', authLimiter, async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) return res.status(400).json({ success: false, error: { message: 'Token e nova senha são obrigatórios.' } });
  if (new_password.length < 6) return res.status(400).json({ success: false, error: { message: 'Mínimo 6 caracteres.' } });
  try {
    const tokenHash = hashToken(token);
    const stored = await db.get(
      'SELECT * FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );
    if (!stored) return res.status(400).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Token inválido, expirado ou já utilizado.' } });

    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await db.run('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [newHash, stored.user_id]);
    await db.run('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1', [stored.id]);
    await db.run('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [stored.user_id]);
    res.json({ success: true, message: 'Senha redefinida com sucesso.' });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// ============================================================
// PERFIL — /me (própria conta)
// ============================================================
app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await db.get('SELECT id, numero_ordem, status, last_login_at, created_at FROM users WHERE id=$1', [req.user.id]);
    const profile = await db.get('SELECT email, telefone, avatar_url, status_ativo FROM user_profiles WHERE user_id=$1', [req.user.id]);
    const military = await db.get('SELECT nome_completo, nome_guerra, posto_graduacao, opm FROM EFETIVO WHERE matricula=$1', [user.numero_ordem]);
    const permissions = await getUserPermissions(req.user.id);
    const roles = await getUserRoles(req.user.id);
    res.json({ success: true, data: { ...user, ...profile, ...military, permissions, roles } });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

app.put('/api/me/profile', authenticate, async (req, res) => {
  const { email, telefone } = req.body;
  try {
    // Upsert user_profiles
    await db.run(`
      INSERT INTO user_profiles (user_id, email, telefone, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        telefone = EXCLUDED.telefone,
        updated_at = NOW()
    `, [req.user.id, email || null, telefone || null]);
    res.json({ success: true, message: 'Perfil atualizado com sucesso.' });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

app.post('/api/me/avatar', authenticate, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { message: 'Nenhum arquivo enviado.' } });
    const avatarUrl = `/avatars/${req.file.filename}`;
    await db.run(`
      INSERT INTO user_profiles (user_id, avatar_url, avatar_filename, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) DO UPDATE SET avatar_url=$2, avatar_filename=$3, updated_at=NOW()
    `, [req.user.id, avatarUrl, req.file.originalname]);
    res.json({ success: true, avatar_url: avatarUrl });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

app.delete('/api/me/avatar', authenticate, async (req, res) => {
  try {
    await db.run('UPDATE user_profiles SET avatar_url=NULL, avatar_filename=NULL, updated_at=NOW() WHERE user_id=$1', [req.user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

app.delete('/api/me', authenticate, async (req, res) => {
  try {
    // Exclusão lógica (soft delete)
    await db.run('UPDATE user_profiles SET deleted_at=NOW(), status_ativo=FALSE, updated_at=NOW() WHERE user_id=$1', [req.user.id]);
    await db.run('UPDATE users SET status=$1, updated_at=NOW() WHERE id=$2', ['inativo', req.user.id]);
    await db.run('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [req.user.id]);
    res.json({ success: true, message: 'Conta desativada.' });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// ============================================================
// RBAC Admin — Roles & Permissions
// ============================================================
app.get('/api/roles', authenticate, authorize('usuarios:admin'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*, COUNT(rp.permission_id) as total_permissions
      FROM roles r LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id ORDER BY r.is_sistema DESC, r.nome
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

app.get('/api/roles/:id', authenticate, authorize('usuarios:admin'), async (req, res) => {
  try {
    const role = await db.get('SELECT * FROM roles WHERE id=$1', [req.params.id]);
    if (!role) return res.status(404).json({ success: false, error: { message: 'Role não encontrada.' } });
    const { rows: perms } = await db.query(
      'SELECT p.* FROM permissions p JOIN role_permissions rp ON p.id=rp.permission_id WHERE rp.role_id=$1 ORDER BY p.modulo, p.code',
      [req.params.id]
    );
    res.json({ success: true, data: { ...role, permissions: perms } });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

app.post('/api/roles', authenticate, authorize('usuarios:admin'), async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome) return res.status(400).json({ success: false, error: { message: 'Nome da role é obrigatório.' } });
  try {
    const r = await db.run(
      'INSERT INTO roles (nome, descricao, is_sistema) VALUES ($1, $2, FALSE)',
      [nome.toUpperCase().trim(), descricao || null]
    );
    res.status(201).json({ success: true, id: r.lastID });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

app.put('/api/roles/:id', authenticate, authorize('usuarios:admin'), async (req, res) => {
  const { descricao, permission_ids } = req.body;
  try {
    const role = await db.get('SELECT is_sistema FROM roles WHERE id=$1', [req.params.id]);
    if (!role) return res.status(404).json({ success: false, error: { message: 'Role não encontrada.' } });
    if (descricao) await db.run('UPDATE roles SET descricao=$1 WHERE id=$2', [descricao, req.params.id]);
    if (Array.isArray(permission_ids)) {
      // Substituição completa das permissões
      await db.run('DELETE FROM role_permissions WHERE role_id=$1', [req.params.id]);
      for (const pid of permission_ids) {
        await db.run('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, pid]);
      }
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

app.delete('/api/roles/:id', authenticate, authorize('usuarios:admin'), async (req, res) => {
  try {
    const role = await db.get('SELECT is_sistema FROM roles WHERE id=$1', [req.params.id]);
    if (!role) return res.status(404).json({ success: false, error: { message: 'Role não encontrada.' } });
    if (role.is_sistema) return res.status(403).json({ success: false, error: { message: 'Roles de sistema não podem ser excluídas.' } });
    await db.run('DELETE FROM roles WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

app.get('/api/permissions', authenticate, authorize('usuarios:admin'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM permissions ORDER BY modulo, code');
    // Agrupa por módulo
    const grouped = rows.reduce((acc, p) => {
      const mod = p.modulo || 'geral';
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(p);
      return acc;
    }, {});
    res.json({ success: true, data: rows, grouped });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// Atribuir roles a um usuário
app.put('/api/usuarios/:id/roles', authenticate, authorize('usuarios:admin'), async (req, res) => {
  const { role_ids } = req.body;
  if (!Array.isArray(role_ids)) return res.status(400).json({ success: false, error: { message: 'role_ids deve ser um array.' } });
  try {
    await db.run('DELETE FROM user_roles WHERE user_id=$1', [req.params.id]);
    for (const rid of role_ids) {
      await db.run(
        'INSERT INTO user_roles (user_id, role_id, atribuido_por) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [req.params.id, rid, req.user.id]
      );
    }
    // Manter is_admin sincronizado com role ADMIN
    const { rows } = await db.query(
      `SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id=r.id WHERE ur.user_id=$1 AND r.nome='ADMIN'`,
      [req.params.id]
    );
    await db.run('UPDATE users SET is_admin=$1 WHERE id=$2', [rows.length > 0 ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// ============================================================
// VOLUNTEERS (Requerimentos - via legacy API)
// ============================================================
app.get('/api/volunteers', async (req, res) => {
  const month = req.query.month || getCurrentMonthKey();
  const q = `
    SELECT r.id_requerimento as id, e.id_militar, e.matricula as numero_ordem, e.nome_guerra as name, 
           e.posto_graduacao as rank, e.telefone as phone, e.motorista, c.referencia_mes_ano as month_key,
           (SELECT json_object_agg(dia_mes, turnos) FROM (
             SELECT dia_mes, json_agg(horario_turno) as turnos 
             FROM DISPONIBILIDADE_REQUERIMENTO 
             WHERE id_requerimento = r.id_requerimento GROUP BY dia_mes
           ) d) as availability_json,
           (SELECT COUNT(*) FROM ESCALA_PLANEJAMENTO ep WHERE ep.id_militar = e.id_militar AND ep.id_ciclo = c.id_ciclo) as service_count
    FROM REQUERIMENTOS r 
    JOIN EFETIVO e ON r.id_militar = e.id_militar 
    JOIN CICLOS c ON r.id_ciclo = c.id_ciclo 
    WHERE c.referencia_mes_ano = $1 
    ORDER BY r.data_solicitacao DESC
  `;
  const { rows } = await db.query(q, [month]);
  res.json(rows.map(v => ({ ...v, availability: v.availability_json || {} })));
});

app.get('/api/months', async (req, res) => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = getMonthName(currentMonth);
  await db.run('INSERT INTO months (month_key, month_name) VALUES (?, ?) ON CONFLICT (month_key) DO NOTHING', [currentMonth, monthName]);
  res.json(await db.all('SELECT month_key, month_name FROM months ORDER BY month_key DESC'));
});

app.post('/api/volunteers', async (req, res) => {
  const { numero_ordem, name, motorista, availability } = req.body;
  if (!numero_ordem || !availability) return res.status(400).json({ error: "Required fields missing" });

  // Atualizar informação de motorista no Efetivo
  await db.run('UPDATE EFETIVO SET motorista = $1 WHERE matricula = $2', [motorista || 'Não', numero_ordem]);

  const military = await db.get('SELECT id_militar FROM EFETIVO WHERE matricula = $1', [numero_ordem]);
  const cycle = await db.get('SELECT id_ciclo FROM CICLOS WHERE referencia_mes_ano = $1', [getCurrentMonthKey()]);
  if (!military || !cycle) return res.status(400).json({ error: "Militar or Ciclo not found" });
  const reqResult = await db.run('INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES ($1, $2)', [military.id_militar, cycle.id_ciclo]);
  for (const [day, shifts] of Object.entries(availability)) {
    for (const shift of shifts) await db.run('INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES ($1, $2, $3, TRUE)', [reqResult.lastID, parseInt(day), shift]);
  }
  res.status(201).json({ id: reqResult.lastID });
});

app.delete('/api/volunteers/:id', async (req, res) => {
  await db.run('DELETE FROM REQUERIMENTOS WHERE id_requerimento = $1', [req.params.id]);
  res.json({ success: true });
});

// ============================================================
// EFETIVO
// ============================================================
app.get('/api/efetivo', async (req, res) => {
  try {
    res.json(await db.all('SELECT * FROM EFETIVO ORDER BY nome_completo ASC'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/efetivo', async (req, res) => {
  try {
    const { nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, motorista, status_ativo } = req.body;
    if (!nome_completo || !posto_graduacao || !matricula || !cpf) return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    
    const formattedCpf = padCpf(cpf);
    const normalizedRankVal = normalizeRank(posto_graduacao);

    const r = await db.run(
      'INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, motorista, status_ativo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [nome_completo, nome_guerra || nome_completo.split(' ')[0], normalizedRankVal, matricula, formattedCpf, rgpm || null, opm || null, telefone || null, motorista || 'Não', status_ativo !== false]
    );
    await db.run('INSERT INTO users (numero_ordem, password, is_admin) VALUES ($1, $2, 0) ON CONFLICT (numero_ordem) DO NOTHING', [matricula, formattedCpf]);
    res.status(201).json({ success: true, id_militar: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/efetivo/:id', async (req, res) => {
  try {
    const { nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, motorista, status_ativo } = req.body;
    const formattedCpf = padCpf(cpf);
    const normalizedRankVal = normalizeRank(posto_graduacao);
    
    await db.run(
      'UPDATE EFETIVO SET nome_completo=$1, nome_guerra=$2, posto_graduacao=$3, matricula=$4, cpf=$5, rgpm=$6, opm=$7, telefone=$8, motorista=$9, status_ativo=$10 WHERE id_militar=$11',
      [nome_completo, nome_guerra, normalizedRankVal, matricula, formattedCpf, rgpm || null, opm || null, telefone || null, motorista || 'Não', status_ativo, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/efetivo/lookup/:matricula', async (req, res) => {
  try {
    const cleanMatricula = req.params.matricula.replace(/\D/g, '');
    let militar = await db.get(
      'SELECT nome_completo, nome_guerra, posto_graduacao, telefone FROM EFETIVO WHERE matricula = $1',
      [req.params.matricula]
    );

    // Se não encontrar pela exata, tenta buscar ignorando formatação no banco
    if (!militar) {
      militar = await db.get(
        'SELECT nome_completo, nome_guerra, posto_graduacao, telefone FROM EFETIVO WHERE REPLACE(REPLACE(matricula, ".", ""), "-", "") = $1',
        [cleanMatricula]
      );
    }

    if (!militar) return res.status(404).json({ error: "Militar não encontrado." });
    res.json(militar);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/efetivo/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM users WHERE numero_ordem = (SELECT matricula FROM EFETIVO WHERE id_militar = $1)', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Função utilitária: decodifica entidades HTML e remove artefatos de borda ASCII (+, -, |)
function deepCleanText(text) {
  if (!text) return "";
  let s = String(text)
    .replace(/&[a-z0-9#]+;/gi, " ") // Remove entidades HTML (&nbsp;, &lt;, etc)
    .replace(/[+\-|]{2,}/g, " ")    // Remove sequências de bordas ASCII (++--, |---|)
    .replace(/\s+/g, " ")           // Normaliza espaços
    .trim();
  // Se a string resultar em apenas caracteres de borda isolados, limpa
  if (s === "+" || s === "|" || s === "-") return "";
  return s;
}

// Função utilitária: normaliza chave de coluna Excel → string sem acentos/espaços para comparação
function normalizeKey(key) {
  const clean = deepCleanText(key);
  return clean.toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

// Função utilitária: formata telefone para (XX)XXXXX-XXXX
function formatPhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1)$2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1)$2-$3');
  }
  return cleaned; // Fallback se não bater formato
}

// Função utilitária: verifica se o valor é vazio/placeholder
function isEmpty(val) {
  const s = String(val ?? '').trim();
  return !s || s === '-' || s === '--' || s === 'null' || s === 'undefined';
}

// Rota de preview: retorna os cabeçalhos e primeira linha para diagnóstico sem importar
app.post('/api/efetivo/import/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    const headers = rawRows[0] || [];
    const firstRow = rawRows[1] || [];
    const preview = headers.map((h, i) => ({
      index: i,
      header: h,
      normalizado: normalizeKey(h),
      exemplo: firstRow[i] ?? ''
    }));
    res.json({ sheet: sheetName, total_rows: rawRows.length - 1, colunas: preview });
  } catch (e) {
    res.status(500).json({ error: "Falha ao ler o arquivo: " + e.message });
  }
});

app.post('/api/efetivo/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      return res.status(400).json({ error: "Arquivo vazio ou sem dados reconhecíveis." });
    }

    // Log das colunas detectadas (ajuda no debug sem travar o sistema)
    const primeiraChave = Object.keys(data[0]);
    console.log('[IMPORT] Colunas detectadas:', primeiraChave.map(k => `"${k}" → "${normalizeKey(k)}"`).join(', '));

    let stats = { imported: 0, existing: 0, skipped: 0, errors: 0 };
    let errorDetails = [];

    for (const row of data) {
      let matricula = '', nrOrdem = '', cpf = '', nome = '', nomeGuerra = '', posto = 'SD PM';
      let rgpm = null, opm = null, telefone = null, statusAtivo = true, motorista = 'Não';

      try {
        // Mapear cada coluna pela chave normalizada
        Object.keys(row).forEach(key => {
          const k = normalizeKey(key);
          const rawVal = row[key];
          if (isEmpty(rawVal)) return;
          const val = String(rawVal).trim();

          // Matrícula (campo principal de identificação)
          if (k === 'MATRICULA' || k.startsWith('MATRICUL'))
            matricula = val;

          // Nº Ordem (campo secundário — usado como fallback se MATRICULA estiver ausente)
          else if (k === 'NORDEM' || k === 'NRORDEM' || k === 'NUMEROORDEM')
            nrOrdem = val;

          // CPF - Garantir limpeza absoluta e padding de 11 dígitos
          else if (k === 'CPF')
            cpf = padCpf(val);

          // Nome completo
          else if (k === 'NOMECOMPLETO' || k === 'NOME')
            nome = val;

          // Nome de Guerra
          else if (k.includes('GUERRA'))
            nomeGuerra = val;

          // Posto/Graduação
          else if (k === 'PG' || k === 'POSTOGRAD' || k === 'POSTOGRADUACAO' ||
            k.startsWith('POSTO') || k.startsWith('GRAD'))
            posto = normalizeRank(val);

          // RGPM
          else if (k === 'RGPM' || k === 'RG' || k === 'RGPOLICIAL' || k === 'REGISTROGERAL')
            rgpm = val;

          // OPM / Lotação
          else if (k === 'OPM' || k === 'LOTACAO' || k === 'UNIDADE' || k === 'SUBUNIDADE')
            opm = val;

          // Telefone
          else if (k === 'TELEFONE' || k === 'CELULAR' || k === 'TEL' || k === 'FONE')
            telefone = val;

          // Status Ativo
          else if (k === 'STATUS' || k === 'SITUACAO' || k === 'CONDICAO') {
            const v = val.toUpperCase();
            statusAtivo = (v === 'ATIVO' || v === 'ATIVA' || v === '1' || v === 'SIM' || v === 'TRUE');
          }

          // Motorista / Condutor
          else if (k === 'MOTORISTA' || k === 'CONDUTOR' || k === 'MOT' || k === 'COND') {
            const v = val.toUpperCase();
            motorista = (v === 'SIM' || v === 'S' || v === 'TRUE' || v === '1' || v === 'MOTORISTA' || v === 'CONDUTOR') ? 'Sim' : 'Não';
          }
        });

        // Nº Ordem como fallback de matrícula (se MATRICULA não existir na planilha)
        if (!matricula && nrOrdem) matricula = nrOrdem;

        // Fallback nome de guerra → primeiro nome do nome completo
        if (!nomeGuerra && nome) {
          nomeGuerra = nome.split(' ')[0];
        }
        // Garante que nomeGuerra não seja hífen vazio
        if (nomeGuerra === '-' || nomeGuerra === '--') {
          nomeGuerra = nome ? nome.split(' ')[0] : '';
        }

        // Validação dos campos obrigatórios
        if (!matricula || !cpf || !nome) {
          stats.skipped++;
          if (nome || matricula) {
            errorDetails.push({
              militar: nome || `Matrícula ${matricula}` || 'Linha sem dados',
              error: `Campos obrigatórios ausentes — Matrícula: "${matricula}", CPF: "${cpf}", Nome: "${nome}"`
            });
            stats.errors++;
          }
          continue;
        }

        // Verifica existência por matrícula OU cpf
        const existing = await db.get(
          'SELECT id_militar, nome_guerra, posto_graduacao FROM EFETIVO WHERE matricula = $1 OR cpf = $2',
          [matricula, cpf]
        );

        if (existing) {
          // UPSERT: atualiza se houver mudanças relevantes no nome de guerra, posto ou motorista
          const needsUpdate =
            (nomeGuerra && existing.nome_guerra !== nomeGuerra) ||
            (posto && existing.posto_graduacao !== posto) ||
            (motorista && existing.motorista !== motorista) ||
            (!existing.rgpm && rgpm) || (!existing.opm && opm);

          if (needsUpdate) {
            await db.run(
              `UPDATE EFETIVO SET
                nome_guerra = COALESCE(NULLIF($1, ''), nome_guerra),
                posto_graduacao = COALESCE(NULLIF($2, ''), posto_graduacao),
                rgpm = COALESCE(NULLIF($3, ''), rgpm),
                opm = COALESCE(NULLIF($4, ''), opm),
                telefone = COALESCE(NULLIF($5, ''), telefone),
                motorista = $7
              WHERE id_militar = $6`,
              [nomeGuerra, posto, rgpm, opm, formatPhone(telefone), existing.id_militar, motorista]
            );
            stats.imported++; // conta como atualizado
          } else {
            stats.existing++;
          }
          continue;
        }

        // Inserção completa com todos os campos da tabela EFETIVO
        await db.run(
          `INSERT INTO EFETIVO
          (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, motorista, status_ativo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [nome, nomeGuerra, posto, matricula, cpf, rgpm, opm, formatPhone(telefone), motorista, statusAtivo]
        );

        // Cria o usuário no sistema com senha padrão = CPF
            await db.run(
              `INSERT INTO users (numero_ordem, password, is_admin)
               VALUES ($1, $2, 0)
               ON CONFLICT (numero_ordem) DO UPDATE SET password = EXCLUDED.password WHERE users.password IS NULL`,
              [matricula, cpf]
            );

        stats.imported++;

      } catch (err) {
        stats.errors++;
        console.error('[IMPORT ERROR]', nome || matricula, err.message);
        errorDetails.push({ militar: nome || `Matrícula ${matricula}` || 'Indefinido', error: err.message });
      }
    }

    res.json({
      success: true,
      message: `${stats.imported} militares importados com sucesso.`,
      stats,
      errorDetails: errorDetails.slice(0, 50) // Limita a 50 erros exibidos
    });
  } catch (e) {
    console.error('[IMPORT FATAL]', e.message);
    res.status(500).json({ error: "Falha ao ler o arquivo Excel: " + e.message });
  }
});


// ============================================================
// OPM
// ============================================================
app.get('/api/opms', async (req, res) => {
  try { res.json(await db.all('SELECT * FROM OPM ORDER BY sigla ASC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/opms', async (req, res) => {
  try {
    const { descricao, sigla, endereco, telefone, email } = req.body;
    if (!descricao || !sigla) return res.status(400).json({ error: "Sigla e descrição são obrigatórios." });
    const r = await db.run(
      'INSERT INTO OPM (descricao, sigla, endereco, telefone, email) VALUES ($1, $2, $3, $4, $5)',
      [descricao, sigla, endereco || null, telefone || null, email || null]
    );
    res.status(201).json({ success: true, id_opm: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/opms/:id', async (req, res) => {
  try {
    const { descricao, sigla, endereco, telefone, email } = req.body;
    if (!descricao || !sigla) return res.status(400).json({ error: "Sigla e descrição são obrigatórios." });
    await db.run(
      'UPDATE OPM SET descricao=$1, sigla=$2, endereco=$3, telefone=$4, email=$5 WHERE id_opm=$6',
      [descricao, sigla, endereco || null, telefone || null, email || null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/opms/:id', async (req, res) => {
  try {
    const hasCiclos = await db.get('SELECT 1 FROM CICLOS WHERE id_opm = $1', [req.params.id]);
    if (hasCiclos) return res.status(400).json({ error: "Não é possível excluir: OPM possui ciclos de escala vinculados." });
    await db.run('DELETE FROM OPM WHERE id_opm = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// CICLOS
// ============================================================
app.get('/api/ciclos', async (req, res) => {
  try { res.json(await db.all('SELECT * FROM vw_detalhes_ciclos ORDER BY referencia_mes_ano DESC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ciclos', async (req, res) => {
  try {
    const { id_opm, referencia_mes_ano, data_inicio, data_fim, status } = req.body;
    if (!referencia_mes_ano || !data_inicio || !data_fim) return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    const r = await db.run(
      'INSERT INTO CICLOS (id_opm, referencia_mes_ano, data_inicio, data_fim, status) VALUES ($1, $2, $3, $4, $5)',
      [id_opm || null, referencia_mes_ano, data_inicio, data_fim, status || 'Aberto']
    );
    res.status(201).json({ success: true, id_ciclo: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/ciclos/:id', async (req, res) => {
  try {
    const { id_opm, referencia_mes_ano, data_inicio, data_fim, status } = req.body;
    if (!referencia_mes_ano || !data_inicio || !data_fim) return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    await db.run(
      'UPDATE CICLOS SET id_opm=$1, referencia_mes_ano=$2, data_inicio=$3, data_fim=$4, status=$5 WHERE id_ciclo=$6',
      [id_opm || null, referencia_mes_ano, data_inicio, data_fim, status || 'Aberto', req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/ciclos/:id', async (req, res) => {
  try {
    const hasReq = await db.get('SELECT 1 FROM REQUERIMENTOS WHERE id_ciclo = $1', [req.params.id]);
    if (hasReq) return res.status(400).json({ error: "Não é possível excluir: Ciclo possui requerimentos ativos." });
    const hasEscala = await db.get('SELECT 1 FROM ESCALA_PLANEJAMENTO WHERE id_ciclo = $1', [req.params.id]);
    if (hasEscala) return res.status(400).json({ error: "Não é possível excluir: Ciclo possui escalas registradas." });
    await db.run('DELETE FROM CICLOS WHERE id_ciclo = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// SERVICOS_EXECUTADOS
// ============================================================
app.get('/api/servicos', async (req, res) => {
  try {
    const { ciclo_id, militar_id } = req.query;
    let q = `
      SELECT se.*, e.nome_guerra, e.matricula, e.posto_graduacao, c.referencia_mes_ano,
             ep.horario_servico, ep.funcao, ep.local_embarque
      FROM SERVICOS_EXECUTADOS se
      JOIN EFETIVO e ON se.id_militar = e.id_militar
      JOIN CICLOS c ON se.id_ciclo = c.id_ciclo
      LEFT JOIN ESCALA_PLANEJAMENTO ep ON se.id_escala = ep.id_escala
      WHERE 1=1
    `;
    const params = [];
    if (ciclo_id) { params.push(ciclo_id); q += ` AND se.id_ciclo = $${params.length}`; }
    if (militar_id) { params.push(militar_id); q += ` AND se.id_militar = $${params.length}`; }
    q += ' ORDER BY se.data_execucao DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/servicos', async (req, res) => {
  try {
    const { id_ciclo, id_militar, id_escala, data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca } = req.body;
    if (!id_ciclo || !id_militar || !data_execucao || !carga_horaria || !status_presenca) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }
    // Calcular valor automaticamente se não informado
    const valor = valor_remuneracao || (parseInt(carga_horaria) === 8 ? 250.00 : 192.03);
    const r = await db.run(
      'INSERT INTO SERVICOS_EXECUTADOS (id_ciclo, id_militar, id_escala, data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id_ciclo, id_militar, id_escala || null, data_execucao, dia_semana || new Date(data_execucao).getDay(), eh_feriado || false, carga_horaria, valor, status_presenca]
    );
    res.status(201).json({ success: true, id_execucao: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/servicos/:id', async (req, res) => {
  try {
    const { data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca } = req.body;
    const valor = valor_remuneracao || (parseInt(carga_horaria) === 8 ? 250.00 : 192.03);
    await db.run(
      'UPDATE SERVICOS_EXECUTADOS SET data_execucao=$1, dia_semana=$2, eh_feriado=$3, carga_horaria=$4, valor_remuneracao=$5, status_presenca=$6 WHERE id_execucao=$7',
      [data_execucao, dia_semana || new Date(data_execucao).getDay(), eh_feriado || false, carga_horaria, valor, status_presenca, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/servicos/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM SERVICOS_EXECUTADOS WHERE id_execucao = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- NOVAS ROTAS DE IMPORTAÇÃO DE SERVIÇOS (FT) ---

app.post('/api/servicos/import/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Detecção de arquivos HTML (Web Page) incompletos/wrappers
    if (rows.length < 5 && rows.some(r => r && r.some(c => String(c).includes('&lt;') || String(c).includes('v:fill')))) {
        return res.status(400).json({ 
            error: "O arquivo enviado parece ser uma página web ou atalho incompleto. " +
                   "Para importar, abra este arquivo no Excel e salve-o como 'Pasta de Trabalho do Excel (.xlsx)' antes de enviar." 
        });
    }

    // Lista de colunas esperadas para identificar o cabeçalho real (muito mais abrangente)
    const targetKeys = [
        'PG', 'POSTO', 'GRADUACAO', 'POSTOGRAD', 'POSTOGRADUACAO', 
        'NOME', 'NOMEDEGUERRA', 'NOMEPARAGUERRA', 
        'CPF', 'DATA', 'CMD', 'OPM', 'UNIDADE', 'UNID', 'REPARTICAO', 'SIGLA',
        'MODALIDADE', 'GUARNICAO', 'DESCRICAO'
    ];

    let bestHeaderIndex = -1;
    let maxMatches = 0;

    // Escaneia as primeiras 30 linhas para achar a que mais se parece com o cabeçalho
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const rowData = rows[i];
        if (!rowData || rowData.length === 0) continue;

        const normalizedRow = rowData.map(cell => normalizeKey(cell));
        const matches = normalizedRow.filter(k => k && targetKeys.includes(k)).length;
        
        // Critério de desempate: preferir a linha que tenha "CPF" e "NOME"
        let bonus = 0;
        if (normalizedRow.includes('CPF')) bonus += 2;
        if (normalizedRow.includes('NOME')) bonus += 1;
        
        const score = matches + bonus;

        if (score > maxMatches) {
            maxMatches = score;
            bestHeaderIndex = i;
        }
    }

    // Se não encontrou cabeçalho minimamente válido, tenta a linha 0
    if (bestHeaderIndex === -1) bestHeaderIndex = 0;

    const headers = rows[bestHeaderIndex] || [];
    const firstDataRow = rows[bestHeaderIndex + 1] || [];

    const preview = headers.map((h, i) => {
      const cleanH = String(h || '')
        .replace(/&[a-z0-9#]+;/gi, ' ') // Limpa qualquer entidade HTML
        .trim();

      return {
        index: i,
        header: cleanH || `Coluna ${i}`,
        normalizado: normalizeKey(cleanH),
        exemplo: firstDataRow[i] ?? ''
      };
    });

    res.json({
      sheet: sheetName,
      total_rows: rows.length - (bestHeaderIndex + 1),
      header_row: bestHeaderIndex,
      colunas: preview
    });
  } catch (e) {
    res.status(500).json({ error: "Falha ao ler o arquivo: " + e.message });
  }
});

app.post('/api/servicos/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rows.length < 5 && rows.some(r => r && r.some(c => String(c).includes('&lt;') || String(c).includes('v:fill')))) {
        return res.status(400).json({ 
            error: "O arquivo enviado parece ser uma página web ou atalho incompleto. " +
                   "Para importar, abra este arquivo no Excel e salve-o como 'Pasta de Trabalho do Excel (.xlsx)' antes de enviar." 
        });
    }

    // Re-calcula o melhor cabeçalho para a importação real (mesma lógica do preview)
    const targetKeys = [
        'PG', 'POSTO', 'GRADUACAO', 'POSTOGRAD', 'POSTOGRADUACAO', 
        'NOME', 'NOMEDEGUERRA', 'NOMEPARAGUERRA', 
        'CPF', 'DATA', 'CMD', 'OPM', 'UNIDADE', 'UNID', 'REPARTICAO', 'SIGLA',
        'MODALIDADE', 'GUARNICAO', 'DESCRICAO'
    ];
    let headerIndex = -1;
    let maxMatches = 0;

    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        if (!rows[i]) continue;
        const normalizedRow = rows[i].map(cell => normalizeKey(cell));
        const matches = normalizedRow.filter(k => k && targetKeys.includes(k)).length;
        let bonus = 0;
        if (normalizedRow.includes('CPF')) bonus += 2;
        if (normalizedRow.includes('NOME')) bonus += 1;
        const score = matches + bonus;
        if (score > maxMatches) {
            maxMatches = score;
            headerIndex = i;
        }
    }
    if (headerIndex === -1) headerIndex = 0;

    const headers = rows[headerIndex].map(h => normalizeKey(h));
    const dataRows = rows.slice(headerIndex + 1);

    let stats = { imported: 0, skipped: 0, errors: 0 };
    let errorDetails = [];

    for (const row of dataRows) {
      if (row.length === 0 || !row.some(c => c !== '')) continue;

      let cpfRaw = '', dataServico = '', pg = '', nome = '', cmd = '', opm = '', modalidade = '', guarnicao = '';

      try {
        headers.forEach((k, i) => {
          let val = row[i];
          if (val === undefined || val === null) return;

          // Tratamento especial para datas (XLSX pode vir como objeto Date)
          if (val instanceof Date) {
            val = val.toISOString().split('T')[0];
          } else {
            val = String(val).trim().replace(/&[a-z0-9#]+;/gi, ' ');
          }

          if (k === 'CPF') cpfRaw = val;
          else if (k === 'DATA') dataServico = val;
          else if (['PG', 'POSTO', 'GRADUACAO', 'POSTOGRAD', 'POSTOGRADUACAO'].includes(k)) pg = val;
          else if (['NOME', 'NOMEDEGUERRA', 'NOMEPARAGUERRA'].includes(k)) nome = val;
          else if (k === 'CMD') cmd = val;
          else if (['OPM', 'UNIDADE', 'UNID', 'REPARTICAO', 'SIGLA'].includes(k)) opm = val;
          else if (k === 'MODALIDADE') modalidade = val;
          else if (['GUARNICAO', 'DESCRICAO'].includes(k)) guarnicao = val;
        });

        const cpf = padCpf(cpfRaw);
        if (!cpf || !dataServico) {
          stats.skipped++;
          continue;
        }

        // 1. Localizar Militar pelo CPF
        const military = await db.get('SELECT id_militar FROM EFETIVO WHERE cpf = $1', [cpf]);
        if (!military) {
          stats.errors++;
          errorDetails.push({ militar: nome || cpf, error: "Militar não cadastrado no sistema (CPF não encontrado)." });
          continue;
        }

        // 2. Localizar Ciclo pela Data
        // Assume-se formato DD-MM-YYYY ou similar. Vamos tentar converter.
        let isoDate;
        if (dataServico.includes('-')) {
          const parts = dataServico.split('-');
          if (parts[0].length === 4) isoDate = dataServico; // YYYY-MM-DD
          else isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
        } else {
          isoDate = dataServico;
        }

        const dateObj = new Date(isoDate);
        if (isNaN(dateObj.getTime())) {
          stats.errors++;
          errorDetails.push({ militar: nome || cpf, error: `Data inválida: ${dataServico}` });
          continue;
        }

        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        const cycle = await db.get('SELECT id_ciclo, valor_total_previsto FROM CICLOS WHERE referencia_mes_ano = $1', [monthKey]);

        if (!cycle) {
          stats.errors++;
          errorDetails.push({ militar: nome || cpf, error: `Ciclo operacional para ${monthKey} não encontrado.` });
          continue;
        }

        // 3. Obter Tipo de Serviço (por default usaremos o primeiro de 6h a menos que especificado, pois antes era fixo)
        // Isso pode ser refinado futuramente criando a seleção de TIPO via frontend/planilha
        const defaultTipo = await db.get("SELECT id_tipo_servico, carga_horaria, valor_remuneracao FROM TIPOS_SERVICO WHERE descricao LIKE '%6h%' AND ativo = true LIMIT 1") || await db.get("SELECT id_tipo_servico, carga_horaria, valor_remuneracao FROM TIPOS_SERVICO LIMIT 1");

        if (!defaultTipo) {
          stats.errors++;
          errorDetails.push({ militar: nome || cpf, error: `Nenhum Tipo de Serviço cadastrado no sistema para referência.` });
          continue;
        }

        const idTipoServico = defaultTipo.id_tipo_servico;
        const cargaHoraria = defaultTipo.carga_horaria;
        const valorRemuneracao = parseFloat(defaultTipo.valor_remuneracao);

        // 4. Conferencia do Teto Financeiro (Valor Total Previsto)
        const { rows: somaRows } = await db.query('SELECT COALESCE(SUM(valor_remuneracao), 0) as total FROM SERVICOS_EXECUTADOS WHERE id_ciclo = $1', [cycle.id_ciclo]);
        const currentTotal = parseFloat(somaRows[0].total);
        const teto = parseFloat(cycle.valor_total_previsto);

        if (teto > 0 && (currentTotal + valorRemuneracao) > teto) {
          stats.errors++;
          errorDetails.push({ militar: nome || cpf, error: `Orçamento Estourado no ciclo ${monthKey}. Teto: ${teto}, Atual + Este: ${currentTotal + valorRemuneracao}` });
          continue;
        }

        // 5. Inserir Serviço Executado preservando os valores históricos do tipo naquele instante
        const diaSemana = dateObj.getDay();

        await db.run(
          `INSERT INTO SERVICOS_EXECUTADOS 
            (id_ciclo, id_militar, data_execucao, dia_semana, carga_horaria, valor_remuneracao, status_presenca, cmd, opm_origem, modalidade, guarnicao, id_tipo_servico)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT DO NOTHING`,
          [cycle.id_ciclo, military.id_militar, isoDate, diaSemana, cargaHoraria, valorRemuneracao, 'Presente', cmd, opm, modalidade, guarnicao, idTipoServico]
        );

        stats.imported++;

      } catch (err) {
        stats.errors++;
        errorDetails.push({ militar: nome || 'Indefinido', error: err.message });
      }
    }

    res.json({ success: true, message: "Importação concluída.", stats, errorDetails: errorDetails.slice(0, 50) });
  } catch (e) {
    res.status(500).json({ error: "Falha ao processar arquivo: " + e.message });
  }
});

// ============================================================
// USUARIOS (Gestão de Acesso)
// ============================================================
app.get('/api/usuarios', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.numero_ordem, u.is_admin, u.created_at,
             e.nome_guerra, e.posto_graduacao, e.nome_completo, e.cpf
      FROM users u
      LEFT JOIN EFETIVO e ON u.numero_ordem = e.matricula
      ORDER BY u.is_admin DESC, e.nome_completo ASC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/militares/not-users', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT e.id_militar, e.matricula, e.nome_guerra, e.posto_graduacao, e.nome_completo
      FROM EFETIVO e
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.numero_ordem = e.matricula)
      ORDER BY e.posto_graduacao, e.nome_completo
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const { matricula, is_admin } = req.body;
    if (!matricula) return res.status(400).json({ error: "Matrícula é obrigatória." });

    // Verifica se o militar existe no efetivo para pegar o CPF (senha padrão)
    const militar = await db.get('SELECT cpf FROM EFETIVO WHERE matricula = $1', [matricula]);
    if (!militar) return res.status(404).json({ error: "Militar não encontrado no sistema de efetivo." });

    const r = await db.run(
      'INSERT INTO users (numero_ordem, password, is_admin) VALUES ($1, $2, $3) ON CONFLICT (numero_ordem) DO UPDATE SET is_admin = $3',
      [matricula, militar.cpf, is_admin ? 1 : 0]
    );
    res.status(201).json({ success: true, id: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    // Evitar deletar a si mesmo ou o admin master (exemplo simplificado)
    const user = await db.get('SELECT numero_ordem FROM users WHERE id = $1', [req.params.id]);
    if (user?.numero_ordem === '999999') return res.status(403).json({ error: "Não é possível excluir o administrador mestre." });

    await db.run('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/usuarios/:id/admin', async (req, res) => {
  try {
    const { is_admin } = req.body;
    await db.run('UPDATE users SET is_admin=$1 WHERE id=$2', [is_admin ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/usuarios/:id/senha', async (req, res) => {
  try {
    // Reset para o CPF do militar (padrão do sistema)
    const user = await db.get('SELECT numero_ordem FROM users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    const efetivo = await db.get('SELECT cpf FROM EFETIVO WHERE matricula = $1', [user.numero_ordem]);
    if (!efetivo) return res.status(404).json({ error: "Militar não encontrado." });
    await db.run('UPDATE users SET password=$1 WHERE id=$2', [efetivo.cpf, req.params.id]);
    res.json({ success: true, message: "Senha resetada para o CPF do militar." });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Gestão de Permissões Diretas do Usuário
app.get('/api/usuarios/:id/permissoes', async (req, res) => {
  try {
    const { id } = req.params;
    // Lista todas as permissões possíveis e marca o estado atual para este usuário
    const { rows } = await db.query(`
      SELECT p.id, p.code, p.descricao, p.modulo,
             up.permitido
      FROM permissions p
      LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = $1
      ORDER BY p.modulo, p.code
    `, [id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/usuarios/:id/permissoes', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { permission_id, permitido } = req.body;
    const permId = parseInt(permission_id);

    if (isNaN(userId) || isNaN(permId)) {
      return res.status(400).json({ error: "IDs inválidos." });
    }

    if (permitido === null) {
      await db.query('DELETE FROM user_permissions WHERE user_id = $1 AND permission_id = $2', [userId, permId]);
    } else {
      await db.query(`
        INSERT INTO user_permissions (user_id, permission_id, permitido, atribuido_por)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, permission_id) DO UPDATE SET permitido = $3
      `, [userId, permId, permitido, req.user?.id || null]);
    }

    // Log de Auditoria
    try {
      await auditLog('PERMISSION_CHANGE', { target_user_id: userId, permission_id: permId, permitted: permitido }, req);
    } catch (auditErr) {
      console.error('[Audit] Erro ao registrar log de permissão:', auditErr);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('[DB] Erro ao atualizar permissão:', e.message);
    res.status(500).json({ error: `Falha no banco de dados: ${e.message}` });
  }
});

// ============================================================
// SCHEDULES (Planejamento de Guarnições)
// ============================================================
app.get('/api/schedules', async (req, res) => {
  try {
    const { date, month } = req.query;
    if (!date || !month) return res.status(400).json({ error: "Date and Month are required" });
    
    const row = await db.get('SELECT patrols FROM schedules WHERE date = $1 AND month_key = $2', [String(date), month]);
    if (!row) return res.json([]);
    
    // As patrulhas são armazenadas como JSON string no campo TEXT
    const patrols = typeof row.patrols === 'string' ? JSON.parse(row.patrols) : row.patrols;
    res.json([{ id: 1, date, month_key: month, patrols }]);
  } catch (e) {
    console.error('[API] Error fetching schedules:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/schedules', async (req, res) => {
  try {
    const { date, month_key, patrols } = req.body;
    if (!date || !month_key || !patrols) return res.status(400).json({ error: "Missing required fields" });
    
    const patrolsJson = JSON.stringify(patrols);
    await db.run(
      'INSERT INTO schedules (date, month_key, patrols) VALUES ($1, $2, $3) ON CONFLICT (date, month_key) DO UPDATE SET patrols = EXCLUDED.patrols',
      [String(date), month_key, patrolsJson]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[API] Error saving schedules:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// FINANCEIRO & TIPOS DE SERVICO
// ============================================================
app.get('/api/tipos-servico', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM TIPOS_SERVICO ORDER BY ativo DESC, carga_horaria ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tipos-servico', async (req, res) => {
  try {
    const { descricao, carga_horaria, valor_remuneracao, ativo } = req.body;
    const { rows } = await db.query(
      'INSERT INTO TIPOS_SERVICO (descricao, carga_horaria, valor_remuneracao, ativo) VALUES ($1, $2, $3, $4) RETURNING *',
      [descricao, carga_horaria, valor_remuneracao, ativo ?? true]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tipos-servico/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, carga_horaria, valor_remuneracao, ativo } = req.body;
    const { rows } = await db.query(
      'UPDATE TIPOS_SERVICO SET descricao = $1, carga_horaria = $2, valor_remuneracao = $3, ativo = $4 WHERE id_tipo_servico = $5 RETURNING *',
      [descricao, carga_horaria, valor_remuneracao, ativo, id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// DASHBOARD FINANCEIRO E ESTATISTICAS (Flexibilizado)
// ============================================================
app.get('/api/financeiro/resumo', async (req, res) => {
    try {
      const month = req.query.month || getCurrentMonthKey();

      // Obter dados globais e do orçamento do Ciclo
      const qGlobal = `
      SELECT
        c.valor_total_previsto as verba_ciclo,
        COUNT(DISTINCT se.id_militar) as militares_unicos,
        COUNT(se.id_execucao) as total_militar_servicos,
        COALESCE(SUM(se.valor_remuneracao), 0) as total_gasto
      FROM CICLOS c
      LEFT JOIN SERVICOS_EXECUTADOS se ON c.id_ciclo = c.id_ciclo
      WHERE c.referencia_mes_ano = $1
      GROUP BY c.valor_total_previsto
    `;
      const resGlobal = await db.query(qGlobal, [month]);

      // Obter agrupamento por Tipos de Serviço
      const qTipos = `
      SELECT
        ts.descricao,
        COUNT(se.id_execucao) as qtd_servicos,
        SUM(se.valor_remuneracao) as total_gasto_tipo
      FROM SERVICOS_EXECUTADOS se
      JOIN TIPOS_SERVICO ts ON se.id_tipo_servico = ts.id_tipo_servico
      JOIN CICLOS c ON se.id_ciclo = c.id_ciclo
      WHERE c.referencia_mes_ano = $1
      GROUP BY ts.descricao
    `;
      const resTipos = await db.query(qTipos, [month]);

      // Se o ciclo ainda nao existe, os dados vem vazios, evitamos crash
      const stats = resGlobal.rows[0] || { verba_ciclo: 0, militares_unicos: 0, total_militar_servicos: 0, total_gasto: 0 };

      const verba_ciclo = parseFloat(stats.verba_ciclo || 0);
      const total_gasto = parseFloat(stats.total_gasto || 0);

      res.json({
        verba_ciclo,
        total_gasto,
        saldo_restante: verba_ciclo - total_gasto,
        percentual_utilizado: verba_ciclo > 0 ? (total_gasto / verba_ciclo) * 100 : 0,
        total_militar_servicos: parseInt(stats.total_militar_servicos),
        total_militares_unicos: parseInt(stats.militares_unicos),
        detalhes_por_tipo: resTipos.rows,
        mes_selecionado: month
      });
    } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.get('/api/financeiro/detalhado', async (req, res) => {
    try {
      const month = req.query.month || getCurrentMonthKey();

      const qDiario = `
      SELECT TO_CHAR(se.data_execucao, 'DD/MM') as data,
             COUNT(*) as servicos,
             SUM(se.valor_remuneracao) as gasto
      FROM SERVICOS_EXECUTADOS se
      JOIN CICLOS c ON se.id_ciclo = c.id_ciclo
      WHERE c.referencia_mes_ano = $1
      GROUP BY se.data_execucao ORDER BY se.data_execucao ASC
    `;
      const resDiario = await db.query(qDiario, [month]);
      let acumuladoTotal = 0;
      const detalhes_diarios = resDiario.rows.map(row => {
        const gasto = parseFloat(row.gasto);
        acumuladoTotal += gasto;
        return { data: row.data, servicos: parseInt(row.servicos), gasto, acumulado: acumuladoTotal };
      });

      const qTop = `
      SELECT e.matricula as id, e.nome_guerra as name,
             COUNT(*) as servicos,
             SUM(se.valor_remuneracao) as gasto
      FROM SERVICOS_EXECUTADOS se
      JOIN EFETIVO e ON se.id_militar = e.id_militar
      JOIN CICLOS c ON se.id_ciclo = c.id_ciclo
      WHERE c.referencia_mes_ano = $1
      GROUP BY e.matricula, e.nome_guerra
      ORDER BY gasto DESC LIMIT 10
    `;
      const resTop = await db.query(qTop, [month]);
      res.json({
        detalhes_diarios,
        top_militares: resTop.rows.map(r => ({ ...r, servicos: parseInt(r.servicos), gasto: parseFloat(r.gasto) }))
      });
    } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ============================================================
  // PDF IMPORT (Requerimentos via PDF)
  // ============================================================
  function processMarksLine(line, shiftCode, data) {
    if (!line || line.length === 0) return;

    // NÃO usar trim() - preservar todos os espaços para manter posições
    const chars = line.split('');

    console.log(`  processMarksLine: "${line.trim()}"`);
    console.log(`    Total caracteres: ${chars.length}`);

    // Posição 0 = MOTORISTA
    const motoristChar = chars[0];
    data.motorist = (motoristChar && motoristChar.toUpperCase() === 'X') ? 'Sim' : 'Nao';
    console.log(`    Motorista: ${data.motorist}`);

    // Posição 1 = Dia 01, Posição 2 = Dia 02, ... Posição 31 = Dia 31
    let dayCounter = 0;

    for (let pos = 1; pos < chars.length && dayCounter < 31; pos++) {
      const char = chars[pos];
      dayCounter++;
      const dayStr = String(dayCounter).padStart(2, '0');

      // Disponível: "X". Não disponível: " " (espaço) ou "S"
      const isAvailable = (char && char.toUpperCase() === 'X');

      if (isAvailable) {
        if (!data.availability[dayStr]) data.availability[dayStr] = [];
        if (!data.availability[dayStr].includes(shiftCode)) {
          data.availability[dayStr].push(shiftCode);
          console.log(`    Dia ${dayStr}: disponível`);
        }
      }
    }

    console.log(`    Total dias processados: ${dayCounter}`);
  }

  async function parseRequerimentoPDF(text, db) {
    const data = { numero_ordem: '', name: '', rank: '', phone: '', motorist: 'Nao', availability: {}, month_key: '' };

    // Extrair Nº de Ordem
    const ordMatch = text.match(/N\.ORD\.\s*(\d{5,6})/);
    if (ordMatch) data.numero_ordem = ordMatch[1];

    // Tentar extrair Posto/Graduação (ex: SD PM, CB PM, 1º SGT PM, etc)
    const rankRegex = /(CEL|TC|MAJ|CAP|1º TEN|2º TEN|SUB|1º SGT|2º SGT|3º SGT|CB|SD)\s+PM/i;
    const rankMatch = text.match(rankRegex);
    if (rankMatch) {
      data.rank = rankMatch[0].toUpperCase();
    } else {
      // Tentar match mais generico sem o PM no final se falhar
      const rankRegexAlt = /(CORONEL|TENENTE CORONEL|MAJOR|CAPITÃO|CAPITAO|TENENTE|SUBTENENTE|SARGENTO|CABO|SOLDADO)/i;
      const rankMatchAlt = text.match(rankRegexAlt);
      if (rankMatchAlt) data.rank = rankMatchAlt[0].toUpperCase();
    }

    if (data.numero_ordem && db) {
      try {
        const cleanMatricula = data.numero_ordem.replace(/\D/g, '');
        // Busca flexível: exata ou ignorando formatação
        const militar = await db.get(`
        SELECT posto_graduacao, nome_guerra, telefone 
        FROM EFETIVO 
        WHERE numero_ordem = $1 OR matricula = $1
           OR REPLACE(REPLACE(matricula, '.', ''), '-', '') = $1
           OR REPLACE(REPLACE(numero_ordem, '.', ''), '-', '') = $1
      `, [cleanMatricula]);

        if (militar) {
          // Se extraiu do PDF, usa o do PDF (mais atual), senão usa o do banco
          if (!data.rank) data.rank = militar.posto_graduacao;
          data.name = militar.nome_guerra;
          data.phone = militar.telefone || '';
        }
      } catch (e) { console.error('Erro no lookup do militar via PDF:', e); }
    }
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      const nl = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
      if (l === '07:00 ÀS' && nl === '13:00') { console.log('Turno manha detectado'); processMarksLine(lines[i + 2] || '', '07:00 ÀS 13:00', data); }
      if (l === '13:00 ÀS' && nl === '19:00') { console.log('Turno tarde detectado'); processMarksLine(lines[i + 2] || '', '13:00 ÀS 19:00', data); }
      if (l === '19:00 ÀS' && nl === '01:00') { console.log('Turno noite detectada'); processMarksLine(lines[i + 2] || '', '19:00 ÀS 01:00', data); }
      if (l === '01:00 ÀS' && nl === '07:00') { console.log('Turno madrugada detectada'); processMarksLine(lines[i + 2] || '', '01:00 ÀS 07:00', data); }
    }
    if (Object.keys(data.availability).length === 0) {
      console.log('Nenhum turno detectado no primeiro método, tentando método alternativo');
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (l.includes('07:00') && l.includes('13:00') && l.length < 20) {
          const nextLine = lines[i + 1] || '';
          if (nextLine.trim().length > 10) processMarksLine(nextLine, '07:00 ÀS 13:00', data);
        }
        if (l.includes('13:00') && l.includes('19:00') && l.length < 20) {
          const nextLine = lines[i + 1] || '';
          if (nextLine.trim().length > 10) processMarksLine(nextLine, '13:00 ÀS 19:00', data);
        }
        if (l.includes('19:00') && l.includes('01:00') && l.length < 20) {
          const nextLine = lines[i + 1] || '';
          if (nextLine.trim().length > 10) processMarksLine(nextLine, '19:00 ÀS 01:00', data);
        }
        if (l.includes('01:00') && l.includes('07:00') && l.length < 20) {
          const nextLine = lines[i + 1] || '';
          if (nextLine.trim().length > 10) processMarksLine(nextLine, '01:00 ÀS 07:00', data);
        }
      }
    }
    return data;
  }

  app.post('/api/import/volunteers/files', upload.array('files', 100), async (req, res) => {
    const { month_key } = req.body;
    console.log('Import request:', { month_key, filesCount: req.files?.length });
    if (!req.files || !month_key) return res.status(400).json({ error: "Invalid request" });
    try {
      const volunteers = [], errors = [];
      for (const file of req.files) {
        try {
          console.log('Processing file:', file.originalname);
          const pdf = await pdfParser(file.buffer);
          console.log('PDF text length:', pdf.text.length);
          const parsed = await parseRequerimentoPDF(pdf.text, db);
          console.log('Parsed data:', JSON.stringify(parsed));
          parsed.month_key = month_key;
          if (parsed.numero_ordem) volunteers.push(parsed);
          else errors.push({ file: file.originalname, error: "Nao encontrou numero" });
        } catch (e) { console.error('Error processing file:', e); errors.push({ file: file.originalname, error: e.message }); }
      }
      console.log('Volunteers parsed:', volunteers.length, 'Errors:', errors.length);
      const results = [];
      for (const item of volunteers) {
        try {
          console.log('Saving volunteer:', item.numero_ordem, item.month_key);
          const m = await db.get('SELECT id_militar FROM EFETIVO WHERE numero_ordem = $1 OR matricula = $1', [item.numero_ordem]);
          console.log('Militar found:', m);
          if (!m) { results.push({ numero_ordem: item.numero_ordem, success: false, error: "Militar nao encontrado" }); continue; }

          // Atualizar informação de motorista e POSTO vinda do PDF
          await db.run('UPDATE EFETIVO SET motorista = $1, posto_graduacao = COALESCE(NULLIF($2, \'\'), posto_graduacao) WHERE id_militar = $3', [item.motorist, item.rank, m.id_militar]);
          let c = await db.get('SELECT id_ciclo FROM CICLOS WHERE referencia_mes_ano = $1', [item.month_key]);
          if (!c) {
            const [year, month] = item.month_key.split('-');
            const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
            const lastDay = new Date(parseInt(year), parseInt(month), 0);
            await db.run('INSERT INTO CICLOS (id_opm, referencia_mes_ano, data_inicio, data_fim, status) VALUES (1, $1, $2, $3, $4)', [item.month_key, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0], 'Aberto']);
            c = await db.get('SELECT id_ciclo FROM CICLOS WHERE referencia_mes_ano = $1', [item.month_key]);
          }
          console.log('Ciclo found:', c);
          const existing = await db.get('SELECT id_requerimento FROM REQUERIMENTOS r JOIN CICLOS c ON r.id_ciclo = c.id_ciclo WHERE r.id_militar = $1 AND c.referencia_mes_ano = $2', [m.id_militar, item.month_key]);
          let id_req;
          if (existing) {
            id_req = existing.id_requerimento;
            await db.run('DELETE FROM DISPONIBILIDADE_REQUERIMENTO WHERE id_requerimento = $1', [id_req]);
          } else {
            const r = await db.run('INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES ($1, $2)', [m.id_militar, c.id_ciclo]);
            id_req = r.lastID;
          }
          for (const [day, shifts] of Object.entries(item.availability)) {
            for (const shift of shifts) await db.run('INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES ($1, $2, $3, TRUE)', [id_req, parseInt(day), shift]);
          }
          results.push({ numero_ordem: item.numero_ordem, success: true });
        } catch (e) { results.push({ numero_ordem: item.numero_ordem, success: false, error: e.message }); }
      }
      res.json({ success: true, processed: volunteers.length, results, errors: errors.slice(0, 20) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });