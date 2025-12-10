/**
 * HR Tools Call Service
 * Centralized service for calling HR-specific functions
 * 
 * This file provides a unified interface for calling HR functions
 * and can be used as a router/dispatcher for HR-specific operations
 */

const logger = require('../utils/logger');
const hrHandlers = require('./functions_call/hr/hrHandlers');

/**
 * Call HR-specific function
 * Routes HR function calls to appropriate handlers
 * 
 * @param {string} functionName - Name of the HR function to call
 * @param {object} arguments - Function arguments/parameters
 * @returns {Promise<object>} - Function execution result
 */
async function call_hr_function(functionName, arguments) {
  try {
    logger.info(`[HR Tools Call] Calling HR function: ${functionName}`, arguments);

    // Route to appropriate HR handler
    switch (functionName) {
      case 'get_resume_info_supabase':
        return await hrHandlers.get_resume_info_supabase(arguments);
      
      case 'get_user_job_pairs':
        return await hrHandlers.get_user_job_pairs(arguments);
      
      case 'get_hr_resumes':
        return await hrHandlers.get_hr_resumes(arguments);
      
      default:
        logger.warn(`[HR Tools Call] Unknown HR function: ${functionName}`);
        return {
          success: false,
          error: `HR function '${functionName}' not found`
        };
    }
  } catch (error) {
    logger.error(`[HR Tools Call] Error calling HR function ${functionName}:`, error);
    return {
      success: false,
      error: error.message || `Failed to execute HR function: ${functionName}`
    };
  }
}

module.exports = {
  call_hr_function
};

