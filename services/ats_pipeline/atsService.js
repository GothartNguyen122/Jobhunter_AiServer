const { validateResumePDF, validateResumePDFFromBuffer } = require('./atsPipeline');
const logger = require('../../utils/logger');

/**
 * ATS Service - Wrapper cho ATS Pipeline
 * Service layer để xử lý business logic và error handling
 */
class ATSService {
  /**
   * Validate Resume PDF từ file path
   * 
   * @param {string} filePath - Đường dẫn đến file PDF
   * @returns {Promise<{success: boolean, isValid: boolean, error?: string, details?: object}>}
   */
  async validateResumeFromPath(filePath) {
    try {
      logger.info(`[ATS Service] Validating resume from path: ${filePath}`);
      
      const result = await validateResumePDF(filePath);
      
      if (result.isValid) {
        logger.info('[ATS Service] Resume validation passed');
      } else {
        logger.warn(`[ATS Service] Resume validation failed: ${result.error}`);
      }
      
      return {
        success: true,
        isValid: result.isValid,
        error: result.error || null,
        details: result.details || {}
      };
    } catch (error) {
      logger.error('[ATS Service] Error validating resume:', error);
      return {
        success: false,
        isValid: false,
        error: `Service error: ${error.message}`,
        details: null
      };
    }
  }

  /**
   * Validate Resume PDF từ file buffer
   * 
   * @param {Buffer} fileBuffer - Buffer của file PDF
   * @param {string} originalFileName - Tên file gốc
   * @returns {Promise<{success: boolean, isValid: boolean, error?: string, details?: object}>}
   */
  async validateResumeFromBuffer(fileBuffer, originalFileName = 'resume.pdf') {
    try {
      logger.info(`[ATS Service] Validating resume from buffer: ${originalFileName}`);
      
      const result = await validateResumePDFFromBuffer(fileBuffer, originalFileName);
      
      if (result.isValid) {
        logger.info('[ATS Service] Resume validation passed');
      } else {
        logger.warn(`[ATS Service] Resume validation failed: ${result.error}`);
      }
      
      return {
        success: true,
        isValid: result.isValid,
        error: result.error || null,
        details: result.details || {}
      };
    } catch (error) {
      logger.error('[ATS Service] Error validating resume:', error);
      return {
        success: false,
        isValid: false,
        error: `Service error: ${error.message}`,
        details: null
      };
    }
  }
}

module.exports = new ATSService();
