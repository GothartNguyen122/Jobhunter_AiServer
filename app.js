const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;

// Import configurations and utilities
const config = require('./config');
const logger = require('./utils/logger');
const { errorResponse } = require('./utils/response');

// Import routes
const routes = require('./routes');

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupDirectories();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        statusCode: 429
      }
    });
    this.app.use('/api/', limiter);

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.apiRequest(req.method, req.url, req.body);
      next();
    });

    // Response logging middleware
    this.app.use((req, res, next) => {
      const originalSend = res.send;
      res.send = function(data) {
        logger.apiResponse(req.method, req.url, res.statusCode, data);
        originalSend.call(this, data);
      };
      next();
    });
  }

  setupRoutes() {
    // Mount API routes
    this.app.use('/', routes);

    // Serve static files (if needed)
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json(errorResponse('Route not found', 404));
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);
      
      // Handle specific error types
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json(errorResponse('File too large', 400));
      }
      
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json(errorResponse('Unexpected file field', 400));
      }

      // Default error response
      res.status(500).json(errorResponse('Internal server error', 500));
    });
  }

  async setupDirectories() {
    try {
      await fs.mkdir('uploads/', { recursive: true });
      await fs.mkdir('temp/', { recursive: true });
      logger.success('Created necessary directories');
    } catch (error) {
      logger.error('Failed to create directories:', error.message);
    }
  }

  getApp() {
    return this.app;
  }
}

module.exports = App;
