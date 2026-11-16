'use strict';
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

const { authenticate } = require('../middleware/auth');

router.get('/reports/operacional-detalhado', authenticate, reportController.getOperacionalDetalhado);
router.get('/reports/disponibilidade-grid', authenticate, reportController.getDisponibilidadeGrid);
router.get('/reports/escalas-planejadas', authenticate, reportController.getEscalasPlanejadas);
router.get('/reports/conferencia', authenticate, reportController.getConferencia);
router.get('/reports/equidade-orcamento', authenticate, reportController.getEquidadeOrcamento);

module.exports = router;
