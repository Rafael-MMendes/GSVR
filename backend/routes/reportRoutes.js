'use strict';
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/reports/operacional-detalhado', reportController.getOperacionalDetalhado);
router.get('/reports/disponibilidade-grid', reportController.getDisponibilidadeGrid);
router.get('/reports/escalas-planejadas', reportController.getEscalasPlanejadas);
router.get('/reports/conferencia', reportController.getConferencia);

module.exports = router;
