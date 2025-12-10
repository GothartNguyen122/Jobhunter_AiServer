const axios = require('axios');
const logger = require('../../utils/logger');

// Base URL for Jobhunter Backend API
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;

/**
 * Service để lấy resumes của HR từ Backend API
 * 
 * Flow:
 * 1. Frontend lấy access_token từ localStorage
 * 2. Frontend gửi request đến AI Server với Authorization header chứa access_token
 * 3. Controller gọi setAccessToken() để lưu token vào service
 * 4. Controller gọi getHrResumes(hrId, pageable) với hrId và pagination params
 * 5. Service sử dụng access_token đã lưu để gọi Backend API /api/v1/resumes/hr/{hrId}
 * 6. Backend tự động filter resumes theo HR user và company jobs
 */
class HrResumesService {
  constructor() {
    // Lưu accessToken trong instance
    this.accessToken = null;
  }

  /**
   * Set access token từ request header
   * Controller sẽ gọi method này trước khi gọi getHrResumes()
   * 
   * @param {object} req - Express request object (chứa headers với Authorization)
   */
  setAccessToken(req) {
    const authHeader = req?.headers?.authorization;
    this.accessToken = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : null;
    
    if (!this.accessToken) {
      logger.warn('⚠️ [HrResumesService] No auth token found in request header.');
    }
  }

  /**
   * Lấy danh sách resumes của HR từ Backend API
   * Gọi API /api/v1/resumes/hr/{hrId} để lấy tất cả resumes của HR
   * 
   * Service tự động sử dụng access_token đã được set qua setAccessToken()
   * 
   * @param {number|string} hrId - HR user ID
   * @param {object} pageable - Pagination params { page, size }
   * @returns {Promise<object>} Response với structure { meta, result }
   */
  async getHrResumes(hrId, pageable = { page: 1, size: 100 }) {
    try {
      if (!BACKEND_BASE_URL) {
        logger.error('⚠️ [HrResumesService] BACKEND_BASE_URL is not configured');
        return {
          meta: { page: 1, pageSize: 10, pages: 0, total: 0 },
          result: []
        };
      }

      // Sử dụng accessToken đã được lưu trong instance
      if (!this.accessToken) {
        logger.warn('⚠️ [HrResumesService] No auth token available. Please call setAccessToken() first.');
        return {
          meta: { page: 1, pageSize: 100, pages: 0, total: 0 },
          result: []
        };
      }

      if (!hrId) {
        logger.warn('⚠️ [HrResumesService] hrId is required');
        return {
          meta: { page: 1, pageSize: 10, pages: 0, total: 0 },
          result: []
        };
      }

      // Gọi API backend để lấy danh sách resumes của HR
      const response = await axios.get(`${BACKEND_BASE_URL}/api/v1/resumes/hr/${hrId}`, {
        params: { 
          page: pageable.page || 1, 
          size: pageable.size || 10 
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Backend trả về response với structure:
      // {
      //   "statusCode": 200,
      //   "error": null,
      //   "message": "...",
      //   "data": {
      //     "meta": {...},
      //     "result": [...]
      //   }
      // }
      if (!response.data || !response.data.data) {
        logger.warn('⚠️ [HrResumesService] Failed to fetch resumes from backend - invalid response structure');
        return {
          meta: { page: 1, pageSize: 10, pages: 0, total: 0 },
          result: []
        };
      }

      const resumesData = response.data.data;
      const resumes = Array.isArray(resumesData.result) ? resumesData.result : [];
      const meta = resumesData.meta || { page: 1, pageSize: 10, pages: 0, total: 0 };
      
      if (resumes.length === 0) {
        logger.warn(`⚠️ [HrResumesService] No resumes found for HR id: ${hrId}`);
      } else {
        logger.info(`✅ [HrResumesService] Retrieved ${resumes.length} resumes for HR id: ${hrId}`);
      }

      return {
        meta,
        result: resumes
      };

    } catch (error) {
      logger.error('❌ [HrResumesService] Error fetching HR resumes:', error.message);
      if (error.response) {
        logger.error('❌ [HrResumesService] Response status:', error.response.status);
        logger.error('❌ [HrResumesService] Response data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        logger.error('❌ [HrResumesService] No response received. Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        });
      } else {
        logger.error('❌ [HrResumesService] Error setting up request:', error.message);
      }
      return {
        meta: { page: 1, pageSize: 10, pages: 0, total: 0 },
        result: []
      };
    }
  }
}

module.exports = new HrResumesService();
