'use strict';
const express = require('express');
const router = express.Router();
const mySchedulesController = require('../controllers/mySchedulesController');
const { authenticate } = require('../middleware/auth');

router.get('/my-schedules', authenticate, mySchedulesController.getMySchedules);
router.get('/my-schedules/:id', authenticate, mySchedulesController.getMyScheduleById);

module.exports = router;
