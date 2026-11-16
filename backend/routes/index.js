'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');

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

// Endpoint público de Healthcheck
router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'ok',
      db: 'connected',
      uptime_seconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

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

