'use strict';
const express = require('express');
const router = express.Router();
const efetivoController = require('../controllers/efetivoController');
const { uploadMemory } = require('../middleware/upload');

router.get('/efetivo', efetivoController.getEfetivo);
router.get('/efetivo/desenvolvedores', efetivoController.getDesenvolvedores);
router.post('/efetivo', efetivoController.createEfetivo);
router.put('/efetivo/:id', efetivoController.updateEfetivo);
router.get('/efetivo/lookup/:matricula', efetivoController.lookupEfetivo);
router.delete('/efetivo/:id', efetivoController.deleteEfetivo);
router.post('/efetivo/import/preview', uploadMemory.single('file'), efetivoController.importEfetivoPreview);
router.post('/efetivo/import', uploadMemory.single('file'), efetivoController.importEfetivo);

module.exports = router;
