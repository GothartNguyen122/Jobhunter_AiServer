const axios = require('axios');
const { successResponse, errorResponse, validationErrorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const resumeService = require('../../services/hr/resumeService');

// Base URL for Jobhunter Backend API
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;

class ResumeController {

  /**
   * Get resumes by job ID with pagination and matching score
   * GET /api/v1/resumes/by-job/{jobId}
   */
  async getResumesByJob(req, res) {
    try {
      const { jobId } = req.params;
      const { page = 1, size = 10, sort = 'createdAt' } = req.query;

      // Validate jobId
      if (!jobId || isNaN(parseInt(jobId))) {
        logger.warn(`Invalid jobId provided: ${jobId}`);
        return res.status(400).json(validationErrorResponse('Invalid jobId', ['jobId must be a valid number']));
      }

      // Get Authorization token from request header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Missing or invalid Authorization header');
        return res.status(401).json(errorResponse('Unauthorized - Bearer token required', 401));
      }

      const token = authHeader.replace('Bearer ', '');

      // Prepare query parameters
      const queryParams = {
        page: parseInt(page),
        size: parseInt(size),
        sort: sort
      };

      logger.info(`Fetching resumes and job details for jobId: ${jobId}`, queryParams);

      // Forward request to Backend API - Get resumes
      try {
        // Step 1: Call Backend API to get resumes
        const resumesResponse = await axios.get(`${BACKEND_BASE_URL}/resumes/by-job/${jobId}`, {
          params: queryParams,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        console.log("Backend resumes response:", resumesResponse.data);
        const resumesData = resumesResponse.data;
        const resumes = resumesData?.data?.result || [];

        if (resumes.length === 0) {
          logger.info(`No resumes found for jobId: ${jobId}`);
          return res.status(200).json(successResponse('No resumes found for this job', {
            message: 'No resumes available for analysis',
            jobId: parseInt(jobId),
            aiAnalysis: null
          }));
        }

        // Step 2: Call Backend API to get job details
        let jobDescription = '';
        try {
          const jobResponse = await axios.get(`${BACKEND_BASE_URL}/jobs/${jobId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });

          console.log("Backend job response:", jobResponse.data);
          const jobData = jobResponse.data;
          jobDescription = jobData?.data?.description || '';
          
          if (!jobDescription) {
            logger.warn(`Job description is empty for jobId: ${jobId}`);
          }
        } catch (jobError) {
          logger.error(`Failed to fetch job details for jobId ${jobId}:`, jobError.message);
          // Continue with empty job description if job API fails
          jobDescription = '';
        }

        // Step 3: Normalize data
        // Loại bỏ HTML tags và khoảng trắng từ job description
        const normalizedJobDescription = resumeService.removeHTMLTags(jobDescription);
        const cleanedJobDescription = resumeService.normalizeText(normalizedJobDescription);

        // Resumes sẽ được normalize trong service, chỉ cần truyền mảng gốc
        logger.info('Data prepared for OpenAI:', {
          jobId,
          resumeCount: resumes.length,
          jobDescriptionLength: cleanedJobDescription.length
        });

        // Step 4: Process with OpenAI using service
        try {
          // Call service để gọi OpenAI API với cả 2 giá trị
          // Service sẽ tự động normalize resumes (loại bỏ khoảng trắng và dấu xuống hàng)
          const aiResponse = await resumeService.processResumesWithOpenAI(
            resumes, 
            cleanedJobDescription, 
            jobId
          );
          
          // Trả về chỉ câu trả lời của OpenAI
          logger.success(`OpenAI analysis completed for jobId: ${jobId}`);
          return res.status(200).json(successResponse('AI analysis completed successfully', {
            jobId: parseInt(jobId),
            resumeCount: resumes.length,
            aiAnalysis: aiResponse
          }));

        } catch (openAIError) {
          // If OpenAI fails, return error response
          logger.error(`OpenAI processing failed for jobId ${jobId}:`, openAIError.message);
          return res.status(500).json(errorResponse(`OpenAI processing failed: ${openAIError.message}`, 500));
        }

      } catch (backendError) {
        // Handle Backend API errors
        const statusCode = backendError.response?.status || 500;
        const backendResponse = backendError.response?.data;
        
        // If Backend returns structured error response, use it
        if (backendResponse && typeof backendResponse === 'object') {
          logger.error(`Backend API error for jobId ${jobId}:`, {
            status: statusCode,
            response: backendResponse
          });
          return res.status(statusCode).json(backendResponse);
        }

        // Otherwise, create standard error response
        const errorMessage = backendError.message || 'Backend API error';
        logger.error(`Backend API error for jobId ${jobId}:`, {
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
      logger.error('Error in getResumesByJob:', error);
      return res.status(500).json(errorResponse('Internal server error', 500));
    }
  }
}

module.exports = new ResumeController();

