'use strict';
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

router.get('/schedules', scheduleController.getSchedules);
router.post('/schedules', scheduleController.createSchedule);
router.delete('/schedules/patrol', scheduleController.deletePatrol);

module.exports = router;
