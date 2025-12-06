const express = require('express');
const router = express.Router();

// Import route modules
const chatboxRoutes = require('./chatboxRoutes');
const chatRoutes = require('./chatRoutes');
const pdfRoutes = require('./pdfRoutes');
const healthRoutes = require('./healthRoutes');
const compareJobCVRoutes = require('./compareJobCVRoutes');
const ragRoutes = require('./ragRoutes');
const recommendationRoutes = require('./recommendationRoutes');
const analysisDataRoutes = require('./analysisDataRoutes');
const resumeInfoRoutes = require('./resumeInfoRoutes');
const hrResumeRoutes = require('./hr/resumeRoutes');
const hrJobRoutes = require('./hr/jobRoutes');
const hrChatRoutes = require('./hr/hrChatRoutes');

// API version prefix
const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/chatboxes`, chatboxRoutes);
router.use(`${API_VERSION}/chat`, chatRoutes);
router.use(`${API_VERSION}/pdf`, pdfRoutes);
router.use(`${API_VERSION}/health`, healthRoutes);
router.use(`${API_VERSION}/cv_compatible`, compareJobCVRoutes);
router.use(`${API_VERSION}/recommendations`, recommendationRoutes);
router.use(`${API_VERSION}/analysis_datas`, analysisDataRoutes);
router.use(`${API_VERSION}/resume-infos`, resumeInfoRoutes);
router.use(`${API_VERSION}/resumes`, hrResumeRoutes);
router.use(`${API_VERSION}/jobs`, hrJobRoutes);
// HR Chat routes - /api/v1/AiServer/hr/chat
// Route này sẽ nhận request từ /api/v1/AiServer/hr/chat và dẫn đến routes/hr/hrChatRoutes.js
router.use(`${API_VERSION}/AiServer/hr/chat`, hrChatRoutes);

// RAG routes for frontend admin panel
router.use('/admin/chatbox-admin/rag', ragRoutes);

// Legacy endpoints for backward compatibility
router.use('/api/v1/AiServer', chatRoutes);
router.use('/health', healthRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information
 *     description: Get API information and available endpoints
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 version:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 endpoints:
 *                   type: object
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Jobhunter AI Server API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      chatboxes: `${API_VERSION}/chatboxes`,
      chat: `${API_VERSION}/chat`,
      pdf: `${API_VERSION}/pdf`,
      health: `${API_VERSION}/health`,
      cv_compatible: `${API_VERSION}/cv_compatible`,
      recommendations: `${API_VERSION}/recommendations`,
      analysis_datas: `${API_VERSION}/analysis_datas`,
      resume_infos: `${API_VERSION}/resume-infos`,
      resumes: `${API_VERSION}/resumes`,
      rag: '/admin/chatbox-admin/rag',
      swagger: '/api-docs'
    }
  });
});

module.exports = router;
