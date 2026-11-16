'use strict';
const express = require('express');
const router = express.Router();
const efetivoController = require('../controllers/efetivoController');
const { uploadMemory } = require('../middleware/upload');

const { authenticate, authorize } = require('../middleware/auth');

router.get('/efetivo', authenticate, efetivoController.getEfetivo);
router.get('/efetivo/desenvolvedores', authenticate, efetivoController.getDesenvolvedores);
router.post('/efetivo', authenticate, authorize('efetivo:create'), efetivoController.createEfetivo);
router.put('/efetivo/:id', authenticate, authorize('efetivo:update'), efetivoController.updateEfetivo);
router.get('/efetivo/lookup/:matricula', authenticate, efetivoController.lookupEfetivo);
router.delete('/efetivo/:id', authenticate, authorize('efetivo:delete'), efetivoController.deleteEfetivo);
router.post('/efetivo/import/preview', authenticate, authorize('efetivo:import'), uploadMemory.single('file'), efetivoController.importEfetivoPreview);
router.post('/efetivo/import', authenticate, authorize('efetivo:import'), uploadMemory.single('file'), efetivoController.importEfetivo);

module.exports = router;
