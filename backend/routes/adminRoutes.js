'use strict';
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/admin/audit-logs', authenticate, authorize('sistema:audit'), adminController.getAuditLogs);
router.get('/admin/diagnostics', authenticate, authorize('sistema:diagnostics'), adminController.getDiagnostics);
router.get('/admin/migrate-fix', authenticate, authorize('sistema:admin'), adminController.runMigrateFix);

module.exports = router;
