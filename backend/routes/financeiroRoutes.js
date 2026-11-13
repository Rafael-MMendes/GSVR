'use strict';
const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');

router.get('/tipos-servico', financeiroController.getTiposServico);
router.post('/tipos-servico', financeiroController.createTipoServico);
router.put('/tipos-servico/:id', financeiroController.updateTipoServico);
router.get('/financeiro/resumo', financeiroController.getFinanceiroResumo);
router.get('/financeiro/detalhado', financeiroController.getFinanceiroDetalhado);

module.exports = router;
