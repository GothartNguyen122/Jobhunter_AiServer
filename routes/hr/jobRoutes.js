const express = require('express');
const router = express.Router();
const jobController = require('../../controllers/hr/jobController');

/**
 * @swagger
 * tags:
 *   - name: HR Jobs
 *     description: HR job management endpoints
 */

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   get:
 *     summary: Get job by ID
 *     description: Retrieve job details by job ID from Backend API
 *     tags: [HR Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The job ID
 *         example: 108
 *     responses:
 *       200:
 *         description: Successfully retrieved job details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       description: Job description (may contain HTML)
 *       400:
 *         description: Invalid job ID
 *       401:
 *         description: Unauthorized - Bearer token required
 *       500:
 *         description: Internal server error
 */
router.get('/:id', jobController.getJobById);

module.exports = router;

