'use strict';
const express = require('express');
const router = express.Router();
const cicloController = require('../controllers/cicloController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/ciclos', cicloController.getCiclos);
router.get('/ciclos/:id', cicloController.getCicloById);
router.post('/ciclos', cicloController.createCiclo);
router.put('/ciclos/:id', cicloController.updateCiclo);
router.delete('/ciclos/:id', cicloController.deleteCiclo);
router.get('/ciclos/:id/metas', cicloController.getCicloMetas);
router.put('/metas/:id', cicloController.updateMeta);
router.delete('/metas/:id', cicloController.deleteMeta);
router.get('/ciclos/:id/gastos-matriz', cicloController.getGastosMatriz);
router.post('/ciclos/:id/gastos-matriz', cicloController.saveGastosMatriz);
router.get('/ciclos/:id/gastos-matriz/sync-escala', cicloController.syncGastosEscala);
router.get('/ciclo-config', cicloController.getCicloConfig);
router.put('/ciclo-config', authenticate, authorize('ciclos:update'), cicloController.updateCicloConfig);

module.exports = router;
