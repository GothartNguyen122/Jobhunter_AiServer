const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the AI server is running and healthy
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
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
 *                   example: "AI Server is running"
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "OK"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                     memory:
 *                       type: object
 *                     environment:
 *                       type: string
 */
router.get('/', healthController.healthCheck);

/**
 * @swagger
 * /api/v1/health/status:
 *   get:
 *     summary: Get system status
 *     description: Get detailed system status information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System status retrieved successfully
 */
router.get('/status', healthController.systemStatus);

module.exports = router;
