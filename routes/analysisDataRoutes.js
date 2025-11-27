const express = require('express');
const router = express.Router();
const analysisDataController = require('../controllers/analysisDataController');

// GET /api/v1/analysis_datas?userId=&jobId=
router.get('/', analysisDataController.getLatestAnalysisData);

// GET /api/v1/analysis_datas/users?jobId=
router.get('/users', analysisDataController.getAnalysisDataByJobUniqueUsers);

// POST /api/v1/analysis_datas
router.post('/', analysisDataController.createAnalysisData);

// GET /api/v1/analysis_datas/health
router.get('/health', analysisDataController.healthCheck);

module.exports = router;

