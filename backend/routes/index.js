'use strict';

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const userRoutes = require('./userRoutes');
const rbacRoutes = require('./rbacRoutes');
const mySchedulesRoutes = require('./mySchedulesRoutes');
const volunteerRoutes = require('./volunteerRoutes');
const efetivoRoutes = require('./efetivoRoutes');
const opmRoutes = require('./opmRoutes');
const cicloRoutes = require('./cicloRoutes');
const servicoRoutes = require('./servicoRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const reportRoutes = require('./reportRoutes');
const financeiroRoutes = require('./financeiroRoutes');
const importRoutes = require('./importRoutes');

// Montagem de todos os módulos de rotas sob o roteador central /api
router.use(authRoutes);
router.use(adminRoutes);
router.use(userRoutes);
router.use(rbacRoutes);
router.use(mySchedulesRoutes);
router.use(volunteerRoutes);
router.use(efetivoRoutes);
router.use(opmRoutes);
router.use(cicloRoutes);
router.use(servicoRoutes);
router.use(scheduleRoutes);
router.use(reportRoutes);
router.use(financeiroRoutes);
router.use(importRoutes);

module.exports = router;
