'use strict';
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('../db');
const { cleanCPF, isValidCPF, formatCPF } = require('../utils/cpf');
const { validatePasswordRules, auditLog, normalizeRank } = require('../utils/helpers');
const { BCRYPT_ROUNDS } = require('../middleware/auth');
const { AVATARS_DIR } = require('../middleware/upload');

const userController = {};

/**
 * GET /me
 */
userController.getMe = async (req, res, next) => {
  try {
    const user = await db.get('SELECT id, numero_ordem, status, last_login_at, created_at FROM users WHERE id=$1', [req.user.id]);
    const profile = await db.get('SELECT email, telefone, avatar_url, status_ativo FROM user_profiles WHERE user_id=$1', [req.user.id]);
    const military = await db.get('SELECT nome_completo, nome_guerra, posto_graduacao, opm FROM EFETIVO WHERE matricula=$1', [user.numero_ordem]);
    const permissions = await getUserPermissions(req.user.id);
    const roles = await getUserRoles(req.user.id);
    res.json({ success: true, data: { ...user, ...profile, ...military, permissions, roles } });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * PUT /me/profile
 */
userController.updateProfile = async (req, res, next) => {
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
};

/**
 * POST /me/avatar
 */
userController.uploadAvatar = async (req, res, next) => {
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
};

/**
 * DELETE /me/avatar
 */
userController.deleteAvatar = async (req, res, next) => {
  try {
    await db.run('UPDATE user_profiles SET avatar_url=NULL, avatar_filename=NULL, updated_at=NOW() WHERE user_id=$1', [req.user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * DELETE /me
 */
userController.deleteMe = async (req, res, next) => {
  try {
    // Exclusão lógica (soft delete)
    await db.run('UPDATE user_profiles SET deleted_at=NOW(), status_ativo=FALSE, updated_at=NOW() WHERE user_id=$1', [req.user.id]);
    await db.run('UPDATE users SET status=$1, updated_at=NOW() WHERE id=$2', ['inativo', req.user.id]);
    await db.run('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [req.user.id]);
    res.json({ success: true, message: 'Conta desativada.' });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * GET /usuarios
 */
userController.getUsers = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.cpf, u.numero_ordem, u.is_admin, u.status, u.bloqueado,
             u.senha_definida, u.primeiro_acesso_concluido, u.mfa_enabled,
             u.last_login_at, u.created_at,
             COALESCE(e.nome_guerra, 'Militar') as nome_guerra,
             COALESCE(e.posto_graduacao, 'PM') as posto_graduacao,
             COALESCE(e.nome_completo, 'Militar GSVR') as nome_completo,
             COALESCE(e.opm, '9º BPM') as opm,
             COALESCE(
               (SELECT string_agg(r.nome, ', ') FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = u.id),
               'MILITAR'
             ) as roles_list
      FROM users u
      LEFT JOIN EFETIVO e ON (u.cpf = e.cpf OR u.numero_ordem = e.matricula)
      ORDER BY u.is_admin DESC, e.nome_completo ASC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * GET /militares/not-users
 */
userController.getMilitaresNotUsers = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT e.id_militar, e.matricula, e.cpf, e.nome_guerra, e.posto_graduacao, e.nome_completo
      FROM EFETIVO e
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.cpf = e.cpf OR u.numero_ordem = e.matricula)
      ORDER BY e.posto_graduacao, e.nome_completo
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /usuarios
 */
userController.createUser = async (req, res, next) => {
  try {
    const { matricula, is_admin } = req.body;
    if (!matricula) return res.status(400).json({ error: "Matrícula é obrigatória." });

    const militar = await db.get('SELECT cpf, matricula FROM EFETIVO WHERE matricula = $1', [matricula]);
    if (!militar) return res.status(404).json({ error: "Militar não encontrado no sistema de efetivo." });

    const cleanedCpf = cleanCPF(militar.cpf);
    const r = await db.run(`
      INSERT INTO users (
        cpf, numero_ordem, password, is_admin, status,
        senha_definida, primeiro_acesso_concluido
      ) VALUES ($1, $2, $3, $4, 'ativo', FALSE, FALSE)
      ON CONFLICT (cpf) DO UPDATE SET is_admin = $4, numero_ordem = $2
    `, [cleanedCpf, militar.matricula, cleanedCpf, is_admin ? 1 : 0]);

    const newUserId = r.lastID;
    if (newUserId) {
      const roleNome = is_admin ? 'ADMIN' : 'MILITAR';
      await db.run(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id FROM roles WHERE nome = $2
        ON CONFLICT DO NOTHING
      `, [newUserId, roleNome]);
    }

    auditLog(req.user.id, 'USER_CREATED', { target_matricula: matricula, is_admin, ip: req.ip });
    res.status(201).json({ success: true, id: newUserId });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * DELETE /usuarios/:id
 */
userController.deleteUser = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    const user = await db.get('SELECT id, numero_ordem, cpf FROM users WHERE id = $1', [targetId]);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    if (user.id === req.user.id) {
      return res.status(400).json({ error: "Não é permitido excluir sua própria conta de acesso." });
    }

    const targetRoles = await getUserRoles(targetId);
    const callerRoles = req.user.roles || await getUserRoles(req.user.id);
    if (targetRoles.includes('SUPERUSER') && !callerRoles.includes('SUPERUSER')) {
      return res.status(403).json({ error: "Apenas desenvolvedores SUPERUSER podem excluir contas de desenvolvedores." });
    }

    await db.run('DELETE FROM users WHERE id = $1', [targetId]);
    auditLog(req.user.id, 'USER_DELETED', { target_user_id: targetId, cpf: user.cpf, ip: req.ip });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /usuarios/:id/status
 */
userController.updateUserStatus = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { bloqueado } = req.body;
    const targetUser = await db.get('SELECT * FROM users WHERE id = $1', [userId]);
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Proteção: não permitir que usuário comum bloqueie um SUPERUSER
    const targetRoles = await getUserRoles(userId);
    const callerRoles = req.user.roles || await getUserRoles(req.user.id);
    if (targetRoles.includes('SUPERUSER') && !callerRoles.includes('SUPERUSER')) {
      return res.status(403).json({ error: 'Apenas desenvolvedores SUPERUSER podem alterar contas de desenvolvedores.' });
    }

    const newStatus = bloqueado ? 'bloqueado' : 'ativo';
    await db.run('UPDATE users SET bloqueado = $1, status = $2, tentativas_falhas = 0, bloqueado_ate = NULL, updated_at = NOW() WHERE id = $3', [Boolean(bloqueado), newStatus, userId]);

    if (bloqueado) {
      await db.run('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
    }

    auditLog(req.user.id, bloqueado ? 'USER_BLOCKED' : 'USER_UNBLOCKED', { target_user_id: userId, ip: req.ip });
    res.json({ success: true, message: `Usuário ${bloqueado ? 'bloqueado' : 'desbloqueado'} com sucesso.` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /usuarios/:id/reset-first-access
 */
userController.resetFirstAccess = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const targetUser = await db.get('SELECT * FROM users WHERE id = $1', [userId]);
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado.' });

    await db.run(`
      UPDATE users
      SET senha_definida = FALSE,
          primeiro_acesso_concluido = FALSE,
          password_hash = NULL,
          tentativas_falhas = 0,
          bloqueado = FALSE,
          bloqueado_ate = NULL,
          updated_at = NOW()
      WHERE id = $1
    `, [userId]);

    await db.run('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
    await db.run('UPDATE first_access_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);

    auditLog(req.user.id, 'USER_FIRST_ACCESS_RESET', { target_user_id: userId, ip: req.ip });
    res.json({ success: true, message: 'Conta redefinida para Primeiro Acesso com sucesso.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /usuarios/:id/admin
 */
userController.updateUserAdmin = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    const { is_admin } = req.body;

    const targetRoles = await getUserRoles(targetId);
    const callerRoles = req.user.roles || await getUserRoles(req.user.id);
    if (targetRoles.includes('SUPERUSER') && !callerRoles.includes('SUPERUSER')) {
      return res.status(403).json({ error: "Não é permitido alterar o status de um desenvolvedor SUPERUSER." });
    }

    await db.run('UPDATE users SET is_admin=$1, updated_at=NOW() WHERE id=$2', [is_admin ? 1 : 0, targetId]);

    // Atualiza role no user_roles
    if (is_admin) {
      await db.run(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id FROM roles WHERE nome = 'ADMIN'
        ON CONFLICT DO NOTHING
      `, [targetId]);
    } else {
      await db.run(`
        DELETE FROM user_roles
        WHERE user_id = $1 AND role_id IN (SELECT id FROM roles WHERE nome = 'ADMIN')
      `, [targetId]);
    }

    auditLog(req.user.id, 'USER_ROLE_ADMIN_TOGGLED', { target_user_id: targetId, is_admin, ip: req.ip });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /usuarios/:id/senha
 */
userController.updateUserPassword = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    const user = await db.get('SELECT id, cpf, numero_ordem FROM users WHERE id = $1', [targetId]);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    // Redefine para primeiro acesso seguro
    await db.run(`
      UPDATE users
      SET senha_definida = FALSE,
          primeiro_acesso_concluido = FALSE,
          password_hash = NULL,
          tentativas_falhas = 0,
          bloqueado = FALSE,
          bloqueado_ate = NULL,
          updated_at = NOW()
      WHERE id = $1
    `, [targetId]);

    await db.run('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [targetId]);
    await db.run('UPDATE first_access_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [targetId]);

    auditLog(req.user.id, 'USER_PASSWORD_RESET_TO_FIRST_ACCESS', { target_user_id: targetId, cpf: user.cpf, ip: req.ip });
    res.json({ success: true, message: "Conta redefinida para Primeiro Acesso. O militar definirá sua senha no primeiro acesso." });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * GET /usuarios/:id/permissoes
 */
userController.getUserPermissionsDirect = async (req, res, next) => {
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
};

/**
 * PUT /usuarios/:id/permissoes
 */
userController.updateUserPermissionsDirect = async (req, res, next) => {
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
};

module.exports = userController;
