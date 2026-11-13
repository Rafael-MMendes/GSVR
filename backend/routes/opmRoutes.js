'use strict';
const express = require('express');
const router = express.Router();
const opmController = require('../controllers/opmController');

router.get('/opms', opmController.getOpms);
router.post('/opms', opmController.createOpm);
router.put('/opms/:id', opmController.updateOpm);
router.delete('/opms/:id', opmController.deleteOpm);

module.exports = router;
