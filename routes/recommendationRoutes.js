const express = require('express');
const router = express.Router();
const recommendForPageController = require('../controllers/recommendForPageController');

/**
 * @swagger
 * tags:
 *   - name: Recommendations
 *     description: Job recommendation endpoints
 */

/**
 * @swagger
 * /api/v1/recommendations:
 *   get:
 *     summary: Get job recommendations (GET)
 *     description: Get job recommendations based on resume data (resumeData in query params)
 *     tags: [Recommendations]
 *     parameters:
 *       - in: query
 *         name: resumeData
 *         schema:
 *           type: string
 *         description: JSON stringified resume data
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *   post:
 *     summary: Get job recommendations (POST)
 *     description: Get job recommendations based on resume data (resumeData in request body)
 *     tags: [Recommendations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resumeData:
 *                 type: object
 *                 description: Resume/CV data
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 */
router.get('/', recommendForPageController.getRecommendations);
router.post('/', recommendForPageController.getRecommendations);

module.exports = router;

