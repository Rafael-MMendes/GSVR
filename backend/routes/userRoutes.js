'use strict';
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

router.get('/me', authenticate, userController.getMe);
router.put('/me/profile', authenticate, userController.updateProfile);
router.post('/me/avatar', authenticate, uploadAvatar.single('avatar'), userController.uploadAvatar);
router.delete('/me/avatar', authenticate, userController.deleteAvatar);
router.delete('/me', authenticate, userController.deleteMe);
router.get('/usuarios', authenticate, authorize('usuarios:read'), userController.getUsers);
router.get('/militares/not-users', authenticate, authorize('usuarios:read'), userController.getMilitaresNotUsers);
router.post('/usuarios', authenticate, authorize('usuarios:admin'), userController.createUser);
router.delete('/usuarios/:id', authenticate, authorize('usuarios:admin'), userController.deleteUser);
router.put('/usuarios/:id/status', authenticate, authorize('usuarios:bloquear'), userController.updateUserStatus);
router.put('/usuarios/:id/reset-first-access', authenticate, authorize('usuarios:reset'), userController.resetFirstAccess);
router.put('/usuarios/:id/admin', authenticate, authorize('usuarios:admin'), userController.updateUserAdmin);
router.put('/usuarios/:id/senha', authenticate, authorize('usuarios:reset'), userController.updateUserPassword);
router.get('/usuarios/:id/permissoes', authenticate, authorize('usuarios:admin'), userController.getUserPermissionsDirect);
router.put('/usuarios/:id/permissoes', authenticate, authorize('usuarios:admin'), userController.updateUserPermissionsDirect);

module.exports = router;
