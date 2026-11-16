'use strict';
const express = require('express');
const router = express.Router();
const cicloController = require('../controllers/cicloController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/ciclos', authenticate, cicloController.getCiclos);
router.get('/ciclos/:id', authenticate, cicloController.getCicloById);
router.post('/ciclos', authenticate, authorize('ciclos:create'), cicloController.createCiclo);
router.put('/ciclos/:id', authenticate, authorize('ciclos:update'), cicloController.updateCiclo);
router.delete('/ciclos/:id', authenticate, authorize('ciclos:delete'), cicloController.deleteCiclo);
router.get('/ciclos/:id/metas', authenticate, cicloController.getCicloMetas);
router.put('/metas/:id', authenticate, authorize('ciclos:update'), cicloController.updateMeta);
router.delete('/metas/:id', authenticate, authorize('ciclos:delete'), cicloController.deleteMeta);
router.get('/ciclos/:id/gastos-matriz', authenticate, cicloController.getGastosMatriz);
router.post('/ciclos/:id/gastos-matriz', authenticate, authorize('ciclos:update'), cicloController.saveGastosMatriz);
router.get('/ciclos/:id/gastos-matriz/sync-escala', authenticate, cicloController.syncGastosEscala);
router.get('/ciclo-config', authenticate, cicloController.getCicloConfig);
router.put('/ciclo-config', authenticate, authorize('ciclos:update'), cicloController.updateCicloConfig);

module.exports = router;
