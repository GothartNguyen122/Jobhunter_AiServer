require('dotenv').config();
const OpenAI = require('openai');
const config = require('../../config');
const logger = require('../../utils/logger');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// System prompt có thể điều chỉnh trực tiếp trong code (hardcode)
// Bạn có thể thay đổi nội dung này theo nhu cầu
const SYSTEM_PROMPT = `This is the resume submission data for a job.

All candidate data, job information, and the JobDescription will be provided inside the userMessage.

Your tasks:

Analyze the candidate data provided in the userMessage.

Report the total number of applicants who applied for the job.

Evaluate whether this number is low, average, or high compared to typical hiring trends.

The userMessage contains a JobDescription.

👉 You must NOT modify or change any content inside the JobDescription.

Based on the job information and the applicant data:

Suggest how to create a more impressive and attractive Job Posting to attract more high-quality applicants.

Provide recommendations for improving sections such as:

Job Title

Company Introduction

Benefits

Additional enhancements

(but without modifying the JobDescription).

Provide an overall assessment, including:

How attractive the job currently is

Strengths and weaknesses of the posting

How well the applicants match the role

I want reponse by vietnamese language.'
`;

/**
 * Service để xử lý dữ liệu resumes và gọi OpenAI API
 */
class ResumeService {
  constructor() {
    this.client = openai;
  }

  /**
   * Chuẩn hóa dữ liệu: loại bỏ dấu xuống dòng và dấu cách thừa để chuẩn bị gọi OpenAI API
   * @param {any} data - Dữ liệu cần chuẩn hóa
   * @returns {string} JSON string đã được chuẩn hóa
   */
  normalizeDataForOpenAI(data) {
    try {
      // Convert to JSON string
      const jsonString = JSON.stringify(data);
      // Remove all newlines, carriage returns, and normalize spaces
      const normalized = jsonString
        .replace(/\r?\n|\r/g, '')  // Remove newlines
        .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
        .trim();                    // Remove leading/trailing spaces
      
      logger.debug('Data normalized for OpenAI', { 
        originalLength: jsonString.length, 
        normalizedLength: normalized.length 
      });
      
      return normalized;
    } catch (error) {
      logger.error('Error normalizing data:', error);
      // Fallback: return stringified data without normalization
      return JSON.stringify(data);
    }
  }

  /**
   * Loại bỏ HTML tags từ text
   * @param {string} html - Text chứa HTML tags
   * @returns {string} Text đã loại bỏ HTML tags
   */
  removeHTMLTags(html) {
    if (!html || typeof html !== 'string') {
      return '';
    }
    // Remove HTML tags
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Loại bỏ khoảng trắng và dấu xuống hàng từ text
   * @param {string} text - Text cần chuẩn hóa
   * @returns {string} Text đã được chuẩn hóa
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return text
      .replace(/\r?\n|\r/g, '')  // Remove newlines
      .replace(/\s+/g, ' ')       // Replace multiple spaces with single space
      .trim();                    // Remove leading/trailing spaces
  }

  /**
   * Xử lý dữ liệu resumes và job description từ Backend và gọi OpenAI API
   * @param {Array} resumes - Mảng các resume objects từ Backend API (đã được chuẩn hóa)
   * @param {string} jobDescription - Job description đã được chuẩn hóa (loại bỏ HTML và khoảng trắng)
   * @param {number} jobId - Job ID
   * @returns {Promise<string>} Kết quả trả lời từ OpenAI API
   */
  async processResumesWithOpenAI(resumes, jobDescription, jobId) {
    try {
      if (!resumes || !Array.isArray(resumes) || resumes.length === 0) {
        throw new Error('Resumes data is required and must be a non-empty array');
      }

      if (!jobDescription || typeof jobDescription !== 'string') {
        throw new Error('Job description is required');
      }

      logger.info(`Processing ${resumes.length} resumes with OpenAI for jobId: ${jobId}`);

      // Chuẩn hóa dữ liệu resumes (loại bỏ khoảng trắng và dấu xuống hàng)
      const normalizedResumes = this.normalizeDataForOpenAI(resumes);
      
      logger.debug('Normalized data:', { 
        jobId, 
        resumeCount: resumes.length,
        normalizedResumesLength: normalizedResumes.length,
        jobDescriptionLength: jobDescription.length
      });

      // Sử dụng system prompt được hardcode trong file này
      const systemPrompt = SYSTEM_PROMPT;
      logger.info('Using hardcoded system prompt');
      
      // Tạo user prompt với cả 2 giá trị: job description và resumes
      // Format phù hợp với SYSTEM_PROMPT mới - tất cả thông tin trong userMessage
      const userPrompt = `Job ID: ${jobId}
        JobDescription:
        ${jobDescription}
        Candidate Data (Resume Data):
        ${normalizedResumes}
        Hãy phân tích và báo cáo số lượng và cung câp gợi ý để cải thiện bài đăng tuyển dụng của tôi`;

      logger.info('Calling OpenAI API...');

      // Gọi OpenAI API
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature
      });

      const aiResponse = response.choices[0].message.content;
      
      logger.success(`OpenAI processing completed for jobId: ${jobId}`, {
        responseLength: aiResponse.length,
        tokensUsed: response.usage?.total_tokens
      });

      // Trả về kết quả trả lời từ OpenAI API
      return aiResponse;

    } catch (error) {
      logger.error('Error processing resumes with OpenAI:', error);
      
      // Handle specific OpenAI errors
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else if (error.message && error.message.includes('rate_limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`OpenAI processing failed: ${error.message}`);
    }
  }
}

module.exports = new ResumeService();
