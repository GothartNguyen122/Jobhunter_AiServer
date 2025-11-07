require('dotenv').config();
const OpenAI = require('openai');
const config = require('../../config');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Tính điểm CV so với job
 * @param {string} extractedData - Dữ liệu CV đã được trích xuất (string)
 * @param {string} jobInfo - Thông tin job cần so sánh (string)
 * @returns {Promise<object>} Object chứa scoreResult
 */
async function getCVScoreChat(extractedData, jobInfo) {
  try {
    // Validate input
    if (!extractedData || typeof extractedData !== 'string') {
      throw new Error('Extracted data (string) is required');
    }

    if (!jobInfo || typeof jobInfo !== 'string') {
      throw new Error('Job info (string) is required');
    }

    // Lấy system prompt từ config
    const systemPrompt = await config.systemPrompts.getById('cv_score_chat');
    
    // User prompt
    const userPrompt = "Please analyze the CV against this job and provide a matching score (0-100)";

    // Gộp tất cả vào 1 message duy nhất
    // Gộp tất cả vào 1 message duy nhất
    const userMessage = `${userPrompt}\n\n---\nJob Information:\n${jobInfo}\n\n---\n\n${extractedData}`;
    // Gọi OpenAI API
    const secondResponse = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 256,
      temperature: 0.2
    });

    console.log('✅ secondResponse:', secondResponse);

    // // Lấy nội dung trả về
    const reply = secondResponse.choices?.[0]?.message?.content?.trim() || '';
    console.log('🎯 CV Score Chat Output:', reply);
    return reply;


  } catch (error) {
    console.error('Error in getCVScoreChat:', error);
    
    // Handle specific errors
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your billing.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    } else if (error.message.includes('rate_limit')) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    }

    throw new Error(`CV score calculation failed: ${error.message}`);
  }
}

module.exports = {
  getCVScoreChat
};

