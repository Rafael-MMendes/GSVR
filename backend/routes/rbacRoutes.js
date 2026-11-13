'use strict';
const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbacController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/roles', authenticate, authorize('usuarios:admin'), rbacController.getRoles);
router.get('/roles/:id', authenticate, authorize('usuarios:admin'), rbacController.getRoleById);
router.post('/roles', authenticate, authorize('usuarios:admin'), rbacController.createRole);
router.put('/roles/:id', authenticate, authorize('usuarios:admin'), rbacController.updateRole);
router.delete('/roles/:id', authenticate, authorize('usuarios:admin'), rbacController.deleteRole);
router.get('/permissions', authenticate, authorize('usuarios:admin'), rbacController.getPermissions);
router.put('/usuarios/:id/roles', authenticate, authorize('usuarios:admin'), rbacController.updateUserRoles);

module.exports = router;
