const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// Health check endpoint
router.get('/', healthController.healthCheck);

// System status endpoint
router.get('/status', healthController.systemStatus);

module.exports = router;
