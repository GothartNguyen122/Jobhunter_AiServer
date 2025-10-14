require('dotenv').config();
const OpenAI = require('openai');
const config = require('../config');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Service để xử lý logic so sánh CV với Job sử dụng OpenAI
 */
class GetCompatibleService {
  
  constructor() {
    this.client = openai;
  }

  /**
   * So sánh CV với Job và trả về kết quả tương thích sử dụng OpenAI
   * @param {Object} resumeData - Dữ liệu CV đã được trích xuất
   * @param {Object} jobData - Dữ liệu Job từ backend
   * @returns {Object} Kết quả so sánh từ OpenAI
   */
  async compareCVWithJob(resumeData, jobData) {
    try {
      console.log('=== PROCESSING CV COMPARISON WITH OPENAI ===');
      console.log('Resume Data:', JSON.stringify(resumeData, null, 2));
      console.log('Job Data:', JSON.stringify(jobData, null, 2));
      
      // Chuẩn bị dữ liệu đầu vào theo format của prompt
      const inputData = {
        job: jobData,
        cv: resumeData
      };
      
      // Lấy system prompt từ config
      const systemPrompt = await config.systemPrompts.getById('cv_compatible_prompt');
      
      // User prompt
      const userPrompt = "Please analyze and give recommendations the following data";
      
      // Chuẩn bị nội dung user message
      const userMessage = `${userPrompt}\n\n${JSON.stringify(inputData, null, 2)}`;
      
      console.log('Calling OpenAI API with CV Compatible prompt...');
      
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
            content: userMessage
          }
        ],
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature
      });
      
      const aiResponse = response.choices[0].message.content;
      console.log('OpenAI Response:', aiResponse);
      
      // Clean và parse JSON response
      let cleanedResponse = aiResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Parse JSON response
      let result;
      try {
        result = JSON.parse(cleanedResponse);
      } catch (parseError) {
        // Try to extract JSON from the response using regex
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
          } catch (secondParseError) {
            throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
          }
        } else {
          throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
        }
      }
      
      // Thêm metadata
      result.timestamp = new Date().toISOString();
      result.source = 'openai_analysis';
      
      console.log('Final Result:', JSON.stringify(result, null, 2));
      console.log('================================');
      
      return result;
      
    } catch (error) {
      console.error('Error in compareCVWithJob service:', error);
      
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else if (error.message.includes('rate_limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`CV comparison failed: ${error.message}`);
    }
  }
}

module.exports = new GetCompatibleService();