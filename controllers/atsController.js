const atsService = require('../services/ats_pipeline/atsService');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/response');
const { validateFileUpload } = require('../utils/validation');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class ATSController {
  /**
   * Validate Resume PDF từ file upload
   * POST /api/v1/ats/validate
   * 
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async validateResume(req, res) {
    try {
      // Kiểm tra file đã upload
      if (!req.file) {
        logger.warn('[ATS Controller] No file uploaded');
        return res.status(400).json(validationErrorResponse('No file uploaded', ['File is required']));
      }

      // Validate file upload
      const validation = validateFileUpload(req.file);
      if (!validation.isValid) {
        logger.warn('[ATS Controller] Invalid file upload', validation.errors);
        return res.status(400).json(validationErrorResponse('Invalid file', validation.errors));
      }

      // Chỉ chấp nhận PDF
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json(validationErrorResponse('Invalid file type', ['Only PDF files are allowed']));
      }

      logger.info(`[ATS Controller] Validating resume: ${req.file.originalname}`);

      // Nếu file được lưu trong memory (multer memoryStorage)
      let result;
      if (req.file.buffer) {
        // Sử dụng buffer
        result = await atsService.validateResumeFromBuffer(req.file.buffer, req.file.originalname);
      } else if (req.file.path) {
        // Sử dụng file path
        result = await atsService.validateResumeFromPath(req.file.path);
        
        // Cleanup file sau khi xử lý
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          logger.warn('[ATS Controller] Failed to cleanup file:', cleanupError.message);
        }
      } else {
        return res.status(400).json(errorResponse('File data not available', 400));
      }

      // Trả về kết quả
      if (result.success) {
        if (result.isValid) {
          return res.json(successResponse('Resume validation passed', {
            isValid: true,
            details: result.details
          }));
        } else {
          return res.status(400).json(successResponse('Resume validation failed', {
            isValid: false,
            error: result.error,
            details: result.details
          }));
        }
      } else {
        return res.status(500).json(errorResponse(result.error || 'Validation service error', 500));
      }

    } catch (error) {
      logger.error('[ATS Controller] Error validating resume:', error);
      
      // Cleanup file nếu có lỗi
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }

      return res.status(500).json(errorResponse('Internal server error during validation', 500, {
        error: error.message
      }));
    }
  }

  /**
   * Health check endpoint
   * GET /api/v1/ats/health
   */
  async healthCheck(req, res) {
    try {
      return res.json(successResponse('ATS Pipeline service is healthy', {
        service: 'ATS Pipeline',
        status: 'operational',
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('[ATS Controller] Health check error:', error);
      return res.status(500).json(errorResponse('Health check failed', 500));
    }
  }
}

module.exports = new ATSController();
