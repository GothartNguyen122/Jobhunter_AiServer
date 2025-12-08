const express = require('express');
const router = express.Router();
const analysisDataController = require('../controllers/analysisDataController');

/**
 * @swagger
 * tags:
 *   - name: Analysis Data
 *     description: Analysis data management endpoints
 */

/**
 * @swagger
 * /api/v1/analysis_datas:
 *   get:
 *     summary: Get latest analysis data
 *     description: Get the latest analysis data for a user and job pair
 *     tags: [Analysis Data]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Analysis data retrieved successfully
 *   post:
 *     summary: Create analysis data
 *     description: Create a new analysis data record
 *     tags: [Analysis Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *               job_id:
 *                 type: integer
 *               job_name:
 *                 type: string
 *               extractedData:
 *                 type: object
 *               final_result:
 *                 type: object
 *               analysis_result:
 *                 type: object
 *               matching_score:
 *                 type: string
 *     responses:
 *       201:
 *         description: Analysis data created successfully
 */
router.get('/', analysisDataController.getLatestAnalysisData);
router.post('/', analysisDataController.createAnalysisData);

/**
 * @swagger
 * /api/v1/analysis_datas/users:
 *   get:
 *     summary: Get analysis data by job (unique users)
 *     description: Get analysis data for a job, with unique users only
 *     tags: [Analysis Data]
 *     parameters:
 *       - in: query
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Analysis data retrieved successfully
 */
router.get('/users', analysisDataController.getAnalysisDataByJobUniqueUsers);

/**
 * @swagger
 * /api/v1/analysis_datas/health:
 *   get:
 *     summary: Analysis data health check
 *     description: Check if analysis data service is healthy
 *     tags: [Analysis Data]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', analysisDataController.healthCheck);

/**
 * @swagger
 * /api/v1/analysis_datas/stats:
 *   get:
 *     summary: Get AI statistics
 *     description: Get statistics about AI analysis (total CVs analyzed, matching score distribution)
 *     tags: [Analysis Data]
 *     responses:
 *       200:
 *         description: AI statistics retrieved successfully
 */
router.get('/stats', analysisDataController.getAIStatistics);

module.exports = router;

