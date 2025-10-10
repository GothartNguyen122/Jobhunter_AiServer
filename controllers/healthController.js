const { successResponse } = require('../utils/response');
const logger = require('../utils/logger');

class HealthController {
  // Health check endpoint
  async healthCheck(req, res) {
    try {
      const healthData = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        },
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      };

      logger.info('Health check requested', healthData);
      res.json(successResponse('AI Server is running', healthData));
    } catch (error) {
      logger.error('Error in health check', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        statusCode: 500,
        timestamp: new Date().toISOString()
      });
    }
  }

  // System status endpoint
  async systemStatus(req, res) {
    try {
      const statusData = {
        server: {
          status: 'running',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          nodeEnv: process.env.NODE_ENV || 'development'
        },
        timestamp: new Date().toISOString()
      };

      logger.info('System status requested', statusData);
      res.json(successResponse('System status retrieved successfully', statusData));
    } catch (error) {
      logger.error('Error getting system status', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system status',
        statusCode: 500,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new HealthController();
