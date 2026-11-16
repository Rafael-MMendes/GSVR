'use strict';
const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');

const { authenticate, authorize } = require('../middleware/auth');

router.get('/tipos-servico', authenticate, financeiroController.getTiposServico);
router.post('/tipos-servico', authenticate, authorize('ciclos:update'), financeiroController.createTipoServico);
router.put('/tipos-servico/:id', authenticate, authorize('ciclos:update'), financeiroController.updateTipoServico);
router.get('/financeiro/resumo', authenticate, financeiroController.getFinanceiroResumo);
router.get('/financeiro/detalhado', authenticate, financeiroController.getFinanceiroDetalhado);

module.exports = router;
