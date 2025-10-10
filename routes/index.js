const express = require('express');
const router = express.Router();

// Import route modules
const chatboxRoutes = require('./chatboxRoutes');
const chatRoutes = require('./chatRoutes');
const pdfRoutes = require('./pdfRoutes');
const healthRoutes = require('./healthRoutes');

// API version prefix
const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/chatboxes`, chatboxRoutes);
router.use(`${API_VERSION}/chat`, chatRoutes);
router.use(`${API_VERSION}/pdf`, pdfRoutes);
router.use(`${API_VERSION}/health`, healthRoutes);

// Legacy endpoints for backward compatibility
router.use('/api/v1/AiServer', chatRoutes);
router.use('/health', healthRoutes);

// Root endpoint
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
      health: `${API_VERSION}/health`
    }
  });
});

module.exports = router;
