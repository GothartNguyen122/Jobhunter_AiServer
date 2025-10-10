const App = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

// Create app instance
const appInstance = new App();
const app = appInstance.getApp();

// Start server
const server = app.listen(config.port, () => {
  logger.success(`🤖 Jobhunter AI Server is running on port ${config.port}`);
  logger.info(`📡 API endpoints:`);
  logger.info(`   GET  / - API information`);
  logger.info(`   GET  /api/v1/health - Health check`);
  logger.info(`   GET  /api/v1/chatboxes - Manage chatboxes`);
  logger.info(`   POST /api/v1/chat/:chatboxId/message - Send message`);
  logger.info(`   POST /api/v1/pdf/extract - Extract PDF content`);
  logger.info(`   Legacy endpoints for backward compatibility:`);
  logger.info(`   POST /api/v1/AiServer - Chat with AI (legacy)`);
  logger.info(`   GET  /api/v1/AiServer/history - Get chat history (legacy)`);
  logger.info(`   DELETE /api/v1/AiServer/history - Clear chat history (legacy)`);
  
  if (!config.openai.apiKey) {
    logger.warn('⚠️  WARNING: OPENAI_API_KEY not set. Please configure your OpenAI API key.');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
