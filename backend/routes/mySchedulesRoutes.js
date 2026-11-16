'use strict';
const express = require('express');
const router = express.Router();
const mySchedulesController = require('../controllers/mySchedulesController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/my-schedules', authenticate, mySchedulesController.getMySchedules);
router.get('/my-schedules/:id', authenticate, mySchedulesController.getMyScheduleById);
router.post('/my-schedules/:id/ciente', authenticate, mySchedulesController.confirmarCiente);
router.post('/my-schedules/:id/permuta', authenticate, mySchedulesController.solicitarPermuta);
router.get('/permutas', authenticate, mySchedulesController.listPermutas);
router.put('/permutas/:id/responder', authenticate, authorize('permuta:aprovar'), mySchedulesController.responderPermuta);

module.exports = router;
