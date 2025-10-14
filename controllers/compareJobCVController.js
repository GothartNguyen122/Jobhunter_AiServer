const getCompatibleService = require('../services/get_compatible');

/**
 * Controller để xử lý so sánh CV với Job
 */
class CompareJobCVController {
  
  /**
   * API endpoint để so sánh CV với Job
   * POST /api/v1/cv_compatible
   */
  async compareCVWithJob(req, res) {
    try {
      console.log('=== CV COMPATIBLE API CALLED ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Request headers:', req.headers);
      console.log('================================');
      
      const { resumeData, jobData } = req.body;
      
      // Validate input data
      if (!resumeData) {
        return res.status(400).json({
          success: false,
          message: 'Resume data is required'
        });
      }
      
      if (!jobData) {
        return res.status(400).json({
          success: false,
          message: 'Job data is required'
        });
      }
      
      // Call service to process comparison
      const result = await getCompatibleService.compareCVWithJob(resumeData, jobData);
      
      res.json({
        success: true,
        message: 'CV comparison completed successfully',
        data: result
      });
      
    } catch (error) {
      console.error('Error in compareCVWithJob:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  /**
   * Health check endpoint
   * GET /api/v1/cv_compatible/health
   */
  async healthCheck(req, res) {
    res.json({
      success: true,
      message: 'CV Comparison service is running',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new CompareJobCVController();
