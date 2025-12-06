const express = require('express');
const router = express.Router();
const resumeInfoController = require('../controllers/resumeInfoController');
const logger = require('../utils/logger');

// Debug middleware để log requests
router.use((req, res, next) => {
  logger.info(`[ResumeInfoRoutes] ${req.method} ${req.path}`);
  next();
});

/**
 * @swagger
 * tags:
 *   name: Resume Info
 *   description: Resume information management endpoints
 */

/**
 * @swagger
 * /api/v1/resume-infos:
 *   post:
 *     summary: Save resume info
 *     description: Save extracted resume information to Supabase
 *     tags: [Resume Info]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - jobId
 *               - resume
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID
 *                 example: 1
 *               jobId:
 *                 type: integer
 *                 description: Job ID
 *                 example: 108
 *               resume:
 *                 type: object
 *                 description: Extracted resume data (JSONB)
 *                 example:
 *                   full_name: "Nguyen Van A"
 *                   email: "nguyenvana@example.com"
 *                   phone_number: "0123456789"
 *     responses:
 *       201:
 *         description: Resume info saved successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/', resumeInfoController.saveResumeInfo);

/**
 * @swagger
 * /api/v1/resume-infos/job/{jobId}:
 *   get:
 *     summary: Get resume infos by job
 *     description: Get all resume information for a specific job
 *     tags: [Resume Info]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Resume infos retrieved successfully
 *       500:
 *         description: Internal server error
 */
// Route cụ thể phải đặt TRƯỚC route có params động
router.get('/job/:jobId', resumeInfoController.getResumeInfosByJob);

/**
 * @swagger
 * /api/v1/resume-infos/{userId}/{jobId}:
 *   get:
 *     summary: Get resume info
 *     description: Get resume information by user ID and job ID
 *     tags: [Resume Info]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Resume info retrieved successfully
 *       404:
 *         description: Resume info not found
 *       500:
 *         description: Internal server error
 */
router.get('/:userId/:jobId', resumeInfoController.getResumeInfo);

module.exports = router;

