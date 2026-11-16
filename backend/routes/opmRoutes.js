'use strict';
const express = require('express');
const router = express.Router();
const opmController = require('../controllers/opmController');

const { authenticate, authorize } = require('../middleware/auth');

router.get('/opms', authenticate, opmController.getOpms);
router.post('/opms', authenticate, authorize('efetivo:update'), opmController.createOpm);
router.put('/opms/:id', authenticate, authorize('efetivo:update'), opmController.updateOpm);
router.delete('/opms/:id', authenticate, authorize('efetivo:update'), opmController.deleteOpm);

module.exports = router;
