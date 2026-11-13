'use strict';
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');

router.post('/login', loginLimiter, authController.login);
router.post('/auth/mfa/verify', authLimiter, authController.verifyMfa);
router.post('/auth/mfa/setup', authenticate, authController.setupMfa);
router.post('/auth/mfa/confirm', authenticate, authController.confirmMfa);
router.post('/auth/first-access/validate', authLimiter, authController.validateFirstAccess);
router.post('/auth/first-access/set-password', authLimiter, authController.setPasswordFirstAccess);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', authenticate, authController.logout);
router.post('/auth/password/change', authenticate, authController.changePassword);
router.post('/auth/password/forgot', authLimiter, authController.forgotPassword);
router.post('/auth/password/reset', authLimiter, authController.resetPassword);

module.exports = router;
