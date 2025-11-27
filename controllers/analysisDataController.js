const supabaseService = require('../services/supabaseService');

class AnalysisDataController {
  static normalizeMatchingScore(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const numeric = parseFloat(value.replace('%', '').trim());
      return Number.isFinite(numeric) ? numeric : null;
    }

    return null;
  }

  async createAnalysisData(req, res) {
    try {
      const {
        id,
        analysisId,
        userId,
        jobId,
        jobName,
        extractedData,
        finalResult,
        analysisResult,
        matchingScore
      } = req.body || {};

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId is required'
        });
      }

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required'
        });
      }

      const derivedMatchingScore =
        matchingScore ??
        AnalysisDataController.normalizeMatchingScore(
          finalResult?.matching || analysisResult?.matching
        );

      const record = await supabaseService.saveAnalysisData({
        id: analysisId || id,
        user_id: userId,
        job_id: jobId,
        job_name: jobName,
        extractedData,
        final_result: finalResult,
        analysis_result: analysisResult,
        matching_score: derivedMatchingScore
      });

      return res.status(201).json({
        success: true,
        message: 'Analysis data saved successfully',
        data: record
      });
    } catch (error) {
      console.error('Error in createAnalysisData:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save analysis data',
        error: error.message
      });
    }
  }

  async getLatestAnalysisData(req, res) {
    try {
      const { userId, jobId } = req.query || {};

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId query parameter is required'
        });
      }

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId query parameter is required'
        });
      }

      const record = await supabaseService.getLatestAnalysisDataByUserAndJob(
        userId,
        jobId
      );

      return res.json({
        success: true,
        message: record ? 'Analysis data retrieved successfully' : 'No analysis data found',
        data: record
      });
    } catch (error) {
      console.error('Error in getLatestAnalysisData:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch analysis data',
        error: error.message
      });
    }
  }

  async getAnalysisDataByJobUniqueUsers(req, res) {
    try {
      const { jobId } = req.query || {};

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId query parameter is required'
        });
      }

      const records = await supabaseService.getAnalysisDataByJobUniqueUsers(jobId);

      return res.json({
        success: true,
        message: records.length ? 'Analysis data retrieved successfully' : 'No analysis data found',
        data: records
      });
    } catch (error) {
      console.error('Error in getAnalysisDataByJobUniqueUsers:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch analysis data list',
        error: error.message
      });
    }
  }

  async healthCheck(req, res) {
    return res.json({
      success: true,
      message: 'Analysis data endpoint is running',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new AnalysisDataController();

