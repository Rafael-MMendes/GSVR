'use strict';
const express = require('express');
const router = express.Router();
const servicoController = require('../controllers/servicoController');
const { uploadMemory } = require('../middleware/upload');

router.get('/servicos', servicoController.getServicos);
router.post('/servicos', servicoController.createServico);
router.put('/servicos/:id', servicoController.updateServico);
router.delete('/servicos/:id', servicoController.deleteServico);
router.post('/servicos/corrigir-cargas', servicoController.corrigirCargas);
router.delete('/servicos/ciclo/:cicloId', servicoController.deleteServicosCiclo);
router.post('/servicos/import/preview', uploadMemory.single('file'), servicoController.importServicosPreview);
router.post('/servicos/import', uploadMemory.single('file'), servicoController.importServicos);

module.exports = router;
