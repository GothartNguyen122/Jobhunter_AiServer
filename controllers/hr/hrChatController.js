const OpenAI = require('openai');
const config = require('../../config/config');
const { successResponse, errorResponse, validationErrorResponse } = require('../../utils/response');
const { validateMessageData, sanitizeObject } = require('../../utils/validation');
const logger = require('../../utils/logger');
// Import HR functions riêng - KHÔNG dùng functions chung của candidate
const hrFunctions = require('../../services/functions_call/hr/hrFunctions');
const { call_function } = require('../../services/tools_call');
const userJobPairsService = require('../../services/hr/userJobPairsService');
const hrResumesService = require('../../services/hr/hrResumesService');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

class HrChatController {
  /**
   * Send message to HR chatbox
   * POST /api/v1/hr/chat/message
   * 
   * Kiến trúc với while True loop để xử lý tool calls
   */
  async sendMessage(req, res) {
    const startTime = Date.now();
    try {
      const messageData = sanitizeObject(req.body);
      
      logger.info('📥 [HR Chat] Received request:', JSON.stringify(messageData, null, 2));

      // Validate message data
      const validation = validateMessageData(messageData);
      if (!validation.isValid) {
        logger.warn('Invalid message data', validation.errors);
        return res.status(400).json(validationErrorResponse('Invalid message data', validation.errors));
      }

      const userMessage = messageData.message;
      const user = messageData.user || { name: 'HR User', role: 'HR' };

      // Set access token vào services từ request header
      // Services sẽ tự động lưu token và sử dụng khi gọi các methods
      userJobPairsService.setAccessToken(req);
      hrResumesService.setAccessToken(req);

      // Gọi service để lấy userJobPairs từ backend API
      // Không cần truyền tham số, service tự động sử dụng token đã lưu
      logger.info('📥 [HR Chat] Fetching userJobPairs from backend API...');
      const userJobPairs = await userJobPairsService.getUserJobPairs();
      logger.info(`✅ [HR Chat] Retrieved ${userJobPairs.length} user-job pairs from backend`);

      // System prompt - tạm thời để rỗng, sẽ được cập nhật sau
      const systemPrompt = '';

      // Khởi tạo messages array với system prompt và user message
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ];

      // Sử dụng HR functions riêng - KHÔNG merge với candidate functions
      const tools = hrFunctions;

      // Vòng lặp while True để xử lý tool calls (theo pattern mẫu)
      while (true) {
        try {
          // Gọi OpenAI API
          // model: load từ env, các tham số khác hardcode
          const response = await openai.chat.completions.create({
            model: config.openai.model || 'gpt-4o',
            messages: messages,
            tools: tools.length > 0 ? tools : undefined,
            temperature: 0.7, // Hardcode
            max_tokens: 2000  // Hardcode
          });

          const msg = response.choices[0].message;
          
          logger.info('🤖 [HR Chat] OpenAI response:', {
            hasToolCalls: !!msg.tool_calls,
            content: msg.content,
            toolCallsCount: msg.tool_calls?.length || 0
          });

          // Nếu có tool_calls, xử lý từng tool call
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            // Lưu lại message của AI (có tool_calls) - theo pattern mẫu
            messages.push(msg);

            // Xử lý từng tool call
            for (const tool_call of msg.tool_calls) {
              const fn_name = tool_call.function.name;
              let args;
              
              try {
                args = JSON.parse(tool_call.function.arguments);
              } catch (parseError) {
                logger.error(`Error parsing tool arguments for ${fn_name}:`, parseError);
                args = {};
              }

              logger.info(`🔧 [HR Chat] AI gọi tool: ${fn_name} với tham số:`, args);

              // Thực thi function từ hrHandlers thông qua call_function
              let result;
              try {
                result = await call_function(fn_name, args);
                
                // Format result để trả về cho AI
                // Theo pattern mẫu: content là string (JSON stringified)
                let resultContent;
                if (result.success) {
                  // Nếu result có data, lấy data; nếu không, lấy toàn bộ result
                  resultContent = JSON.stringify(result.data || result);
                } else {
                  resultContent = JSON.stringify({ error: result.error || 'Unknown error' });
                }

                // Đưa kết quả vào messages với role "tool" - theo pattern mẫu
                messages.push({
                  role: "tool",
                  tool_call_id: tool_call.id,
                  name: fn_name,
                  content: resultContent
                });

                logger.info(`✅ [HR Chat] Tool ${fn_name} executed successfully`);

              } catch (functionError) {
                logger.error(`❌ [HR Chat] Error executing function ${fn_name}:`, functionError);
                
                // Đưa error vào messages
                messages.push({
                  role: "tool",
                  tool_call_id: tool_call.id,
                  name: fn_name,
                  content: JSON.stringify({ 
                    error: functionError.message || 'Function execution failed' 
                  })
                });
              }
            }

            // Tiếp tục vòng lặp để AI xử lý kết quả từ tools
            continue;

          } else {
            // Không có tool_calls, AI đã trả lời xong - theo pattern mẫu
            logger.info('💬 [HR Chat] AI trả lời:', msg.content);

            const processingTime = Date.now() - startTime;

            // Trả về response cho frontend - chỉ trả về msg.content từ OpenAI
            return res.status(200).json(successResponse('Message processed successfully', {
              message: msg.content,
              processingTime: processingTime,
              toolCallsCount: 0
            }));
          }

        } catch (openAIError) {
          logger.error('❌ [HR Chat] OpenAI API error:', openAIError);
          
          // Nếu lỗi trong vòng lặp, break và trả về error
          return res.status(500).json(errorResponse(
            `OpenAI API error: ${openAIError.message}`,
            500
          ));
        }
      }

    } catch (error) {
      logger.error('❌ [HR Chat] Error in sendMessage:', error);
      return res.status(500).json(errorResponse('Internal server error', 500));
    }
  }
}

module.exports = new HrChatController();

