const supabaseService = require('../services/supabaseService');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/response');
const logger = require('../utils/logger');

class ResumeInfoController {
  /**
   * Save resume info to Supabase
   * POST /api/v1/resume-infos
   */
  async saveResumeInfo(req, res) {
    try {
      logger.info('[ResumeInfoController] saveResumeInfo called', {
        body: req.body,
        method: req.method,
        path: req.path
      });
      
      const { userId, jobId, resume } = req.body;

      // Validation
      if (!userId) {
        return res.status(400).json(validationErrorResponse('userId is required', ['userId must be provided']));
      }

      if (!jobId) {
        return res.status(400).json(validationErrorResponse('jobId is required', ['jobId must be provided']));
      }

      if (!resume) {
        return res.status(400).json(validationErrorResponse('resume is required', ['resume must be provided']));
      }

      // Validate resume is an object (for JSONB)
      if (typeof resume !== 'object' || Array.isArray(resume)) {
        return res.status(400).json(validationErrorResponse('resume must be an object', ['resume must be a valid JSON object']));
      }

      const record = await supabaseService.saveResumeInfo({
        user_id: userId,
        job_id: jobId,
        resume: resume
      });

      return res.status(201).json(successResponse('Resume info saved successfully', record));
    } catch (error) {
      logger.error('Error in saveResumeInfo:', error);
      return res.status(500).json(errorResponse('Failed to save resume info', 500, {
        error: error.message
      }));
    }
  }

  /**
   * Get resume info by user_id and job_id
   * GET /api/v1/resume-infos/:userId/:jobId
   */
  async getResumeInfo(req, res) {
    try {
      const { userId, jobId } = req.params;

      if (!userId || !jobId) {
        return res.status(400).json(validationErrorResponse('userId and jobId are required', ['Both userId and jobId must be provided']));
      }

      const data = await supabaseService.getResumeInfo(userId, jobId);

      if (!data) {
        return res.status(404).json(errorResponse('Resume info not found', 404));
      }

      return res.json(successResponse('Resume info retrieved successfully', data));
    } catch (error) {
      logger.error('Error in getResumeInfo:', error);
      return res.status(500).json(errorResponse('Failed to get resume info', 500, {
        error: error.message
      }));
    }
  }

  /**
   * Get all resume infos for a job
   * GET /api/v1/resume-infos/job/:jobId
   */
  async getResumeInfosByJob(req, res) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json(validationErrorResponse('jobId is required', ['jobId must be provided']));
      }

      const data = await supabaseService.getResumeInfosByJob(jobId);

      return res.json(successResponse('Resume infos retrieved successfully', data));
    } catch (error) {
      logger.error('Error in getResumeInfosByJob:', error);
      return res.status(500).json(errorResponse('Failed to get resume infos', 500, {
        error: error.message
      }));
    }
  }
}

module.exports = new ResumeInfoController();

