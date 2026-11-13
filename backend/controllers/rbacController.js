'use strict';
const db = require('../db');
const { auditLog } = require('../utils/helpers');

const rbacController = {};

/**
 * GET /roles
 */
rbacController.getRoles = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*, COUNT(rp.permission_id) as total_permissions
      FROM roles r LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id ORDER BY r.is_sistema DESC, r.nome
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * GET /roles/:id
 */
rbacController.getRoleById = async (req, res, next) => {
  try {
    const role = await db.get('SELECT * FROM roles WHERE id=$1', [req.params.id]);
    if (!role) return res.status(404).json({ success: false, error: { message: 'Role não encontrada.' } });
    const { rows: perms } = await db.query(
      'SELECT p.* FROM permissions p JOIN role_permissions rp ON p.id=rp.permission_id WHERE rp.role_id=$1 ORDER BY p.modulo, p.code',
      [req.params.id]
    );
    res.json({ success: true, data: { ...role, permissions: perms } });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * POST /roles
 */
rbacController.createRole = async (req, res, next) => {
  const { nome, descricao } = req.body;
  if (!nome) return res.status(400).json({ success: false, error: { message: 'Nome da role é obrigatório.' } });
  try {
    const r = await db.run(
      'INSERT INTO roles (nome, descricao, is_sistema) VALUES ($1, $2, FALSE)',
      [nome.toUpperCase().trim(), descricao || null]
    );
    res.status(201).json({ success: true, id: r.lastID });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * PUT /roles/:id
 */
rbacController.updateRole = async (req, res, next) => {
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
};

/**
 * DELETE /roles/:id
 */
rbacController.deleteRole = async (req, res, next) => {
  try {
    const role = await db.get('SELECT is_sistema FROM roles WHERE id=$1', [req.params.id]);
    if (!role) return res.status(404).json({ success: false, error: { message: 'Role não encontrada.' } });
    if (role.is_sistema) return res.status(403).json({ success: false, error: { message: 'Roles de sistema não podem ser excluídas.' } });
    await db.run('DELETE FROM roles WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * GET /permissions
 */
rbacController.getPermissions = async (req, res, next) => {
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
};

/**
 * PUT /usuarios/:id/roles
 */
rbacController.updateUserRoles = async (req, res, next) => {
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
};

module.exports = rbacController;
