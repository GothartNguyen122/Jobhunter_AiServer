const axios = require('axios');
const logger = require('../../utils/logger');

// Base URL for Jobhunter Backend API
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;

/**
 * Service để lấy userJobPairs từ Backend API
 * 
 * Flow:
 * 1. Frontend lấy access_token từ localStorage
 * 2. Frontend gửi request đến AI Server với Authorization header chứa access_token
 * 3. Controller gọi setAccessToken() để lưu token vào service
 * 4. Controller gọi getUserJobPairs() không cần tham số
 * 5. Service sử dụng access_token đã lưu để gọi Backend API /api/v1/resumes
 * 6. Backend tự động filter resumes theo HR user dựa trên token
 */
class UserJobPairsService {
  constructor() {
    // Lưu accessToken trong instance
    this.accessToken = null;
  }

  /**
   * Set access token từ request header
   * Controller sẽ gọi method này trước khi gọi getUserJobPairs()
   * 
   * @param {object} req - Express request object (chứa headers với Authorization)
   */
  setAccessToken(req) {
    const authHeader = req?.headers?.authorization;
    this.accessToken = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : null;
    
    if (!this.accessToken) {
      logger.warn('⚠️ [UserJobPairsService] No auth token found in request header.');
    }
  }

  /**
   * Lấy danh sách user-job pairs từ Backend API
   * Gọi API /api/v1/resumes để lấy tất cả resumes và extract ra userJobPairs
   * 
   * Service tự động sử dụng access_token đã được set qua setAccessToken()
   * Không cần truyền tham số vào method này
   * 
   * @returns {Promise<Array>} Array of {userId, jobId, jobName}
   */
  async getUserJobPairs() {
    try {
      if (!BACKEND_BASE_URL) {
        logger.error('⚠️ [UserJobPairsService] BACKEND_BASE_URL is not configured');
        return [];
      }

      // Sử dụng accessToken đã được lưu trong instance
      if (!this.accessToken) {
        logger.warn('⚠️ [UserJobPairsService] No auth token available. Please call setAccessToken() first.');
        return [];
      }

      // Gọi API backend để lấy danh sách resumes
      // Sử dụng page size lớn để lấy tất cả resumes
      // Sử dụng accessToken đã được lưu trong instance
      const response = await axios.get(`${BACKEND_BASE_URL}/resumes`, {
        params: { page: 1, size: 1000 }, // Lấy tối đa 1000 resumes
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
      if (!response.data || !response.data.data || !response.data.data.result) {
        logger.warn('⚠️ [UserJobPairsService] Failed to fetch resumes from backend - invalid response structure');
        return [];
      }

      const resumes = Array.isArray(response.data.data.result) ? response.data.data.result : [];
      
      if (resumes.length === 0) {
        logger.warn('⚠️ [UserJobPairsService] No resumes found in response');
      }

      // Extract userJobPairs từ resumes
      const userJobPairsMap = new Map();
      let skippedCount = 0;
      
      resumes.forEach((resume) => {
        const userId = resume.user?.id || resume.userId;
        const jobId = resume.job?.id;
        const jobName = resume.job?.name;

        if (userId && jobId) {
          // Tạo unique key để tránh duplicate
          const pairKey = `${userId}-${jobId}`;
          
          if (!userJobPairsMap.has(pairKey)) {
            userJobPairsMap.set(pairKey, {
              userId: String(userId),
              jobId: String(jobId),
              jobName: jobName || '-'
            });
          }
        } else {
          skippedCount++;
        }
      });

      const userJobPairs = Array.from(userJobPairsMap.values());
      
      if (skippedCount > 0) {
        logger.warn(`⚠️ [UserJobPairsService] Skipped ${skippedCount} resumes due to missing userId or jobId`);
      }

      return userJobPairs;

    } catch (error) {
      logger.error('❌ [UserJobPairsService] Error fetching userJobPairs:', error.message);
      if (error.response) {
        logger.error('❌ [UserJobPairsService] Response status:', error.response.status);
        logger.error('❌ [UserJobPairsService] Response headers:', error.response.headers);
        logger.error('❌ [UserJobPairsService] Response data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        logger.error('❌ [UserJobPairsService] No response received. Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        });
      } else {
        logger.error('❌ [UserJobPairsService] Error setting up request:', error.message);
      }
      return [];
    }
  }
}

module.exports = new UserJobPairsService();

