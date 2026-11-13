'use strict';
const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const { authenticate } = require('../middleware/auth');

router.get('/volunteers', volunteerController.getVolunteers);
router.get('/months', volunteerController.getMonths);
router.post('/volunteers', authenticate, volunteerController.createVolunteer);
router.delete('/volunteers/:id', authenticate, volunteerController.deleteVolunteer);
router.put('/volunteers/:id', authenticate, volunteerController.updateVolunteer);
router.put('/volunteers/:id/cancel-availability', volunteerController.cancelAvailability);

module.exports = router;
