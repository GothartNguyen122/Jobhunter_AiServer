const express = require('express');
const router = express.Router();
const resumeController = require('../../controllers/hr/resumeController');

/**
 * @swagger
 * /api/v1/resumes/by-job/{jobId}:
 *   get:
 *     summary: Get AI analysis of resumes by job ID
 *     description: |
 *       Retrieve resumes for a specific job from Backend API, then analyze them using OpenAI.
 *       The API will return only the AI analysis response from OpenAI.
 *       
 *       Flow:
 *       1. Controller receives request from Frontend
 *       2. Controller calls Backend API to get resumes
 *       3. Controller calls service to process with OpenAI
 *       4. Controller returns OpenAI response only
 *     tags: [HR Resumes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The job ID
 *         example: 108
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination (used for Backend API call)
 *         example: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page (used for Backend API call)
 *         example: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field and direction (used for Backend API call)
 *         example: createdAt
 *     responses:
 *       200:
 *         description: Successfully analyzed resumes with OpenAI - returns AI analysis only
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "AI analysis completed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: integer
 *                       example: 108
 *                     resumeCount:
 *                       type: integer
 *                       example: 2
 *                       description: Number of resumes analyzed
 *                     aiAnalysis:
 *                       type: string
 *                       description: AI analysis response from OpenAI
 *                       example: "Based on the analysis of 2 resumes for job ID 108..."
 *       400:
 *         description: Invalid jobId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid jobId"
 *       401:
 *         description: Unauthorized - Bearer token required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized - Bearer token required"
 *       500:
 *         description: Internal server error or OpenAI processing failed
 */
router.get('/by-job/:jobId', resumeController.getResumesByJob);

module.exports = router;

