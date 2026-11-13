'use strict';
const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const { authenticate } = require('../middleware/auth');
const { uploadPdf, handleUploadError } = require('../middleware/uploadValidation');

router.post('/import/volunteers/files', authenticate, uploadPdf.array('files'), handleUploadError, importController.importVolunteersFiles);
router.post('/import/preview', authenticate, uploadPdf.single('file'), handleUploadError, importController.importPreview);
router.get('/import/logs', authenticate, importController.getImportLogs);

module.exports = router;
