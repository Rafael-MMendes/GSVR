'use strict';

const jwt = require('jsonwebtoken');
const db = require('../db');
const { formatCPF } = require('../utils/cpf');
const { generateToken, hashToken, normalizeRank, auditLog } = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET || 'ft_jwt_secret_dev_2026_change_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const REFRESH_EXPIRES_DAYS = 7;
const BCRYPT_ROUNDS = 12;

async function getUserRoles(userId) {
  const { rows } = await db.query(`
    SELECT r.nome FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1
  `, [userId]);
  return rows.map(r => r.nome);
}

async function getUserPermissions(userId) {
  const roles = await getUserRoles(userId);
  if (roles.includes('SUPERUSER')) {
    const allPerms = await db.query('SELECT code FROM permissions');
    return allPerms.rows.map(p => p.code);
  }

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

async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token não fornecido.' } });
  }
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
      const roles = req.user.roles || await getUserRoles(req.user.id);
      // SUPERUSER possui acesso irrestrito a todos os módulos autorizados
      if (roles.includes('SUPERUSER')) {
        return next();
      }
      const userPermissions = await getUserPermissions(req.user.id);
      const hasAll = requiredPermissions.every(p => userPermissions.includes(p));
      if (!hasAll) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado. Permissões insuficientes.' } });
      next();
    } catch (e) {
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } });
    }
  };
}

async function issueSessionTokens(user, req, res) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || null;

  const military = await db.get(
    'SELECT posto_graduacao, nome_guerra, nome_completo, telefone, motorista, opm FROM EFETIVO WHERE matricula = $1 OR cpf = $2',
    [user.numero_ordem, user.cpf]
  );
  const permissions = await getUserPermissions(user.id);
  const roles = await getUserRoles(user.id);
  const isSuperuser = roles.includes('SUPERUSER');
  const isAdmin = user.is_admin === 1 || isSuperuser || roles.includes('ADMIN');

  // Emite Access Token (15 min / JWT_EXPIRES_IN)
  const accessToken = jwt.sign(
    {
      id: user.id,
      cpf: user.cpf,
      numero_ordem: user.numero_ordem,
      is_admin: isAdmin,
      is_superuser: isSuperuser,
      roles,
      permissions
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Emite Refresh Token rotativo (7 dias) e salva hash
  const rawRefresh = generateToken();
  const refreshHash = hashToken(rawRefresh);
  const refreshExpires = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await db.run(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_criacao, user_agent) VALUES ($1,$2,$3,$4,$5)',
    [user.id, refreshHash, refreshExpires, ip, userAgent]
  );

  await db.run('UPDATE users SET last_login_at=NOW(), tentativas_falhas=0, bloqueado_ate=NULL WHERE id=$1', [user.id]);
  auditLog(user.id, 'LOGIN_SUCCESS', { cpf: user.cpf, numero_ordem: user.numero_ordem, ip, userAgent, roles });

  return res.json({
    success: true,
    access_token: accessToken,
    refresh_token: rawRefresh,
    user: {
      id: user.id,
      cpf: user.cpf,
      cpf_formatado: formatCPF(user.cpf),
      numero_ordem: user.numero_ordem,
      is_admin: isAdmin,
      is_superuser: isSuperuser,
      mfa_enabled: Boolean(user.mfa_enabled),
      roles,
      permissions,
      rank: normalizeRank(military?.posto_graduacao),
      nome_guerra: military?.nome_guerra || (isSuperuser ? 'Desenvolvedor' : ''),
      nome_completo: military?.nome_completo || (isSuperuser ? 'Superusuário GSVR' : ''),
      opm_sigla: military?.opm || '9º BPM',
      phone: military?.telefone || '',
      motorista: (military?.motorista === true || military?.motorista === 1 || military?.motorista === 'Sim') ? 'Sim' : 'Não'
    }
  });
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REFRESH_EXPIRES_DAYS,
  BCRYPT_ROUNDS,
  getUserRoles,
  getUserPermissions,
  authenticate,
  authorize,
  issueSessionTokens
};
