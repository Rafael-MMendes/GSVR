'use strict';
const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const { authenticate } = require('../middleware/auth');

router.get('/volunteers', authenticate, volunteerController.getVolunteers);
router.get('/months', authenticate, volunteerController.getMonths);
router.post('/volunteers', authenticate, volunteerController.createVolunteer);
router.delete('/volunteers/:id', authenticate, volunteerController.deleteVolunteer);
router.put('/volunteers/:id', authenticate, volunteerController.updateVolunteer);
router.put('/volunteers/:id/cancel-availability', authenticate, volunteerController.cancelAvailability);

module.exports = router;
