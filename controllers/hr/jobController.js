const axios = require('axios');
const { successResponse, errorResponse, validationErrorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

// Base URL for Jobhunter Backend API
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;

class JobController {

  /**
   * Get job by ID
   * GET /api/v1/jobs/{id}
   */
  async getJobById(req, res) {
    try {
      const { id } = req.params;

      // Validate jobId
      if (!id || isNaN(parseInt(id))) {
        logger.warn(`Invalid job ID provided: ${id}`);
        return res.status(400).json(validationErrorResponse('Invalid job ID', ['Job ID must be a valid number']));
      }

      // Get Authorization token from request header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Missing or invalid Authorization header');
        return res.status(401).json(errorResponse('Unauthorized - Bearer token required', 401));
      }

      const token = authHeader.replace('Bearer ', '');

      logger.info(`Fetching job details for jobId: ${id}`);

      // Forward request to Backend API
      try {
        const response = await axios.get(`${BACKEND_BASE_URL}/jobs/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        // Return Backend response
        return res.status(response.status).json(response.data);

      } catch (backendError) {
        // Handle Backend API errors
        const statusCode = backendError.response?.status || 500;
        const backendResponse = backendError.response?.data;
        
        // If Backend returns structured error response, use it
        if (backendResponse && typeof backendResponse === 'object') {
          logger.error(`Backend API error for jobId ${id}:`, {
            status: statusCode,
            response: backendResponse
          });
          return res.status(statusCode).json(backendResponse);
        }

        // Otherwise, create standard error response
        const errorMessage = backendError.message || 'Backend API error';
        logger.error(`Backend API error for jobId ${id}:`, {
          status: statusCode,
          message: errorMessage
        });

        return res.status(statusCode).json({
          statusCode: statusCode,
          error: errorMessage,
          message: errorMessage,
          data: null
        });
      }

    } catch (error) {
      logger.error('Error in getJobById:', error);
      return res.status(500).json(errorResponse('Internal server error', 500));
    }
  }
}

module.exports = new JobController();

