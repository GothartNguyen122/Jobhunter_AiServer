const express = require('express');
const router = express.Router();
const compareJobCVController = require('../controllers/compareJobCVController');

/**
 * Routes cho CV Comparison API
 */

// POST /api/v1/cv_compatible - So sánh CV với Job
router.post('/', compareJobCVController.compareCVWithJob);

// GET /api/v1/cv_compatible/health - Health check
router.get('/health', compareJobCVController.healthCheck);

module.exports = router;
