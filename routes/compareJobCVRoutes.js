const express = require('express');
const router = express.Router();
const compareJobCVController = require('../controllers/compareJobCVController');

/**
 * @swagger
 * tags:
 *   - name: CV Comparison
 *     description: CV and Job comparison endpoints
 */

/**
 * @swagger
 * /api/v1/cv_compatible:
 *   post:
 *     summary: Compare CV with Job
 *     description: Compare a candidate's CV with a job description and get compatibility analysis
 *     tags: [CV Comparison]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resumeData
 *               - jobData
 *             properties:
 *               resumeData:
 *                 type: object
 *                 description: Extracted resume/CV data
 *               jobData:
 *                 type: object
 *                 description: Job description data
 *     responses:
 *       200:
 *         description: CV comparison completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 matching:
 *                   type: string
 *                   example: "90%"
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                 timeline:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post('/', compareJobCVController.compareCVWithJob);

/**
 * @swagger
 * /api/v1/cv_compatible/health:
 *   get:
 *     summary: CV Comparison health check
 *     description: Check if CV comparison service is healthy
 *     tags: [CV Comparison]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', compareJobCVController.healthCheck);

module.exports = router;
