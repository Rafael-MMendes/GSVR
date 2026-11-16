'use strict';
const express = require('express');
const router = express.Router();
const servicoController = require('../controllers/servicoController');
const { uploadMemory } = require('../middleware/upload');

const { authenticate, authorize } = require('../middleware/auth');

router.get('/servicos', authenticate, servicoController.getServicos);
router.post('/servicos', authenticate, authorize('escalas:update'), servicoController.createServico);
router.put('/servicos/:id', authenticate, authorize('escalas:update'), servicoController.updateServico);
router.delete('/servicos/:id', authenticate, authorize('escalas:update'), servicoController.deleteServico);
router.post('/servicos/corrigir-cargas', authenticate, authorize('escalas:update'), servicoController.corrigirCargas);
router.delete('/servicos/ciclo/:cicloId', authenticate, authorize('escalas:update'), servicoController.deleteServicosCiclo);
router.post('/servicos/import/preview', authenticate, authorize('escalas:update'), uploadMemory.single('file'), servicoController.importServicosPreview);
router.post('/servicos/import', authenticate, authorize('escalas:update'), uploadMemory.single('file'), servicoController.importServicos);
router.post('/servicos/conferencia-digital', authenticate, authorize('conferencia:executar'), servicoController.conferenciaDigital);

module.exports = router;
