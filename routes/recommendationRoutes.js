const express = require('express');
const router = express.Router();
const recommendForPageController = require('../controllers/recommendForPageController');

// GET /api/v1/recommendations - Get job recommendations with filters (resumeData in query)
// POST /api/v1/recommendations - Get job recommendations with filters (resumeData in body)
router.get('/', recommendForPageController.getRecommendations);
router.post('/', recommendForPageController.getRecommendations);

module.exports = router;

