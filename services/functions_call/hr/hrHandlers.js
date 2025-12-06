/**
 * HR Function Handlers
 * Implementation of HR-specific functions for OpenAI Function Calling
 */

const logger = require('../../../utils/logger');
const supabaseService = require('../../supabaseService');
const userJobPairsService = require('../../hr/userJobPairsService');

/**
 * Get resume analysis data from Supabase for a specific user-job pair
 * @param {object} params - { userId, jobId }
 * @returns {Promise<object>} - { success, data, message/error }
 */
async function get_resume_info_supabase(params) {
  try {
    const { userId, jobId } = params;

    if (!userId || !jobId) {
      logger.warn(`[HR Function] Missing required params: userId=${userId}, jobId=${jobId}`);
      return {
        success: false,
        error: 'userId and jobId are required'
      };
    }

    logger.info(`[HR Function] Querying Supabase for userId: ${userId} (type: ${typeof userId}), jobId: ${jobId} (type: ${typeof jobId})`);

    const result = await supabaseService.getLatestAnalysisDataByUserAndJob(userId, jobId);

    if (!result) {
      logger.warn(`[HR Function] No analysis data found for userId: ${userId}, jobId: ${jobId}`);
      return {
        success: true,
        data: null,
        message: `No analysis data found for user ${userId} and job ${jobId}`
      };
    }

    logger.info(`[HR Function] Successfully retrieved analysis data for userId: ${userId}, jobId: ${jobId}`);
    logger.debug(`[HR Function] Analysis data keys: ${Object.keys(result).join(', ')}`);

    return {
      success: true,
      data: result,
      message: 'Analysis data retrieved successfully'
    };

  } catch (error) {
    logger.error('[HR Function] Error in get_resume_info_supabase:', error);
    logger.error('[HR Function] Error stack:', error.stack);
    return {
      success: false,
      error: error.message || 'Failed to retrieve analysis data'
    };
  }
}

/**
 * Get list of user-job pairs from Backend API
 * Returns all available user-job pairs that HR can query for resume analysis
 * @param {object} params - No parameters required (uses token already set in service)
 * @returns {Promise<object>} - { success, data, message/error }
 */
async function get_user_job_pairs(params) {
  try {
    logger.info('[HR Function] Getting user-job pairs from Backend API');

    // Service đã được set accessToken từ controller trước đó
    // Chỉ cần gọi getUserJobPairs() mà không cần tham số
    const userJobPairs = await userJobPairsService.getUserJobPairs();

    if (!userJobPairs || userJobPairs.length === 0) {
      return {
        success: true,
        data: [],
        message: 'No user-job pairs found. This could mean HR user has no resumes in their company.'
      };
    }

    logger.info(`[HR Function] Retrieved ${userJobPairs.length} user-job pairs`);

    return {
      success: true,
      data: userJobPairs,
      message: `Successfully retrieved ${userJobPairs.length} user-job pairs`
    };

  } catch (error) {
    logger.error('[HR Function] Error in get_user_job_pairs:', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve user-job pairs'
    };
  }
}

module.exports = {
  get_resume_info_supabase,
  get_user_job_pairs
};

