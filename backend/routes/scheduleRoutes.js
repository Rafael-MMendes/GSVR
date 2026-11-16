'use strict';
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

const { authenticate, authorize } = require('../middleware/auth');

router.get('/schedules', authenticate, scheduleController.getSchedules);
router.post('/schedules', authenticate, authorize('escalas:create'), scheduleController.createSchedule);
router.post('/schedules/suggest', authenticate, authorize('escala:sugerir'), scheduleController.suggestSchedule);
router.delete('/schedules/patrol', authenticate, authorize('escalas:update'), scheduleController.deletePatrol);

module.exports = router;
