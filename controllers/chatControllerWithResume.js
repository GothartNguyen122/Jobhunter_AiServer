const OpenAI = require('openai');
const database = require('../config/database');
const config = require('../config/config');
const supabaseService = require('../services/supabaseService');
const sessionService = require('../services/sessionService');
const { successResponse, errorResponse, notFoundResponse, validationErrorResponse } = require('../utils/response');
const { validateMessageData, sanitizeObject, filterValidMessages, filterUserMessages } = require('../utils/validation');
const logger = require('../utils/logger');
const functions = require('../services/functions_call/functions');
const { call_function } = require('../services/tools_call');
const { getCVScoreChat } = require('../services/functions_call/get_cv_score_chat');
const { formatSearchJobResults } = require('../services/functions_call/support_functions');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

class ChatControllerWithResume {
  async sendMessage(req, res) {
    const startTime = Date.now();
    try {
      const chatboxId = req.params.chatboxId || 'default';
      const messageData = sanitizeObject(req.body);

      if (!chatboxId || chatboxId === 'undefined') {
        return res.status(400).json(validationErrorResponse('Invalid chatboxId', ['chatboxId is required']));
      }

      const validation = validateMessageData(messageData);
      if (!validation.isValid) {
        return res.status(400).json(validationErrorResponse('Invalid message data', validation.errors));
      }

      const chatbox = database.getChatboxById(chatboxId);
      if (!chatbox) {
        return res.status(404).json(notFoundResponse(`Chatbox not found: ${chatboxId}`));
      }
      if (!chatbox.enabled) {
        return res.status(403).json(errorResponse('Chatbox is currently disabled', 403));
      }

      const username = messageData.user?.name || 'anonymous';
      const role = messageData.user?.role || 'user';
      const sessionInfo = messageData.sessionInfo;

      let { conversationId, isNew } = sessionService.getOrCreateSession(chatboxId, username, role, sessionInfo);
      if (isNew) {
        database.clearConversation(conversationId);
      }

      let conversation = database.getConversation(conversationId);
      if (conversation.length === 0 && !isNew) {
        try {
          const supabaseConversation = await supabaseService.getConversation(conversationId);
          if (supabaseConversation && supabaseConversation.messages) {
            const messages = supabaseConversation.messages;
            messages.forEach(msg => {
              database.addMessage(conversationId, {
                role: msg.role,
                content: msg.content,
                time: msg.time
              });
            });
            conversation = database.getConversation(conversationId);
          }
        } catch (_) {}
      }

      // Use message directly (extracted data already embedded in userMessage by frontend)
      let messageForOpenAI = messageData.message;

      const userMessage = {
        role: 'user',
        content: messageData.user?.name
          ? `User(${messageData.user.name}${messageData.user.role ? '|' + messageData.user.role : ''}): ${messageForOpenAI}`
          : messageForOpenAI,
        time: new Date().toISOString()
      };

      conversation = database.addMessage(conversationId, userMessage);

      let systemPrompt;
      try {
        systemPrompt = await config.systemPrompts.getById(chatbox.systemPromptId || 'default');
      } catch (error) {
        const fallback = this.getFallbackResponse(messageData?.message || '', true);
        return res.json(successResponse('Chat hiện tại Available', {
          message: fallback,
          chatboxId,
          processingTime: Date.now() - startTime,
          fallback: true,
          reason: 'System prompt not available'
        }));
      }

      if (!conversation.some(msg => msg.role === 'system')) {
        conversation.unshift({ role: 'system', content: systemPrompt });
      }

      const validMessages = filterValidMessages(conversation);

      //Frist Request OpenAI API 
      //Start xử lý theo quy trình mới:
      // 1) Gọi OpenAI để trích xuất keyword việc làm từ user input (đã chứa Resumes Information)
      const keywordInstruction = 'Hãy trích xuất keyWord liên quan việc làm (ví dụ: Front_End). Chỉ trả về chuỗi keyword ngắn gọn, không giải thích thêm.';
      const keywordPrompt = `${keywordInstruction}\n\n${messageForOpenAI}`;

      const keywordResponse = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: 'Bạn là trợ lý trích xuất từ khóa công việc. Luôn trả về 1-3 từ khóa ngắn gọn, cách nhau bởi dấu phẩy.' },
          { role: 'user', content: keywordPrompt }
        ],
        max_tokens: 64,
        temperature: 0.1
      });

      const keywordText = (keywordResponse.choices?.[0]?.message?.content || '').trim();
      // Chuẩn hóa: lấy từ khóa đầu tiên làm keyword chính để search
      const keywords = keywordText.split(',').map(k => k.trim()).filter(k => k.length > 0);
      const primaryKeyword = keywords[0] || keywordText;

      // 2) Gọi function search_job với keyword vừa tạo, lấy mảng id của job
      const searchArgs = { keyword: primaryKeyword, page: 1, size: 5 };
      const searchResult = await call_function('search_job', searchArgs);
      const toolData = searchResult?.data?.data ?? searchResult?.data ?? searchResult;
      // Lấy danh sách id và name
      const jobList = toolData?.result?.map(({ id, name }) => ({ id, name })) || [];

     for (const job of jobList) {
        // console.log(`Fetching job id: ${job.id} (${job.name})`);
        
        const result = await call_function('get_job_by_id', { id: job.id });
        
        const data = result?.data?.data;

        if (!data) continue;

        // Trích xuất thông tin cần thiết
        const jobInfo = {
            name: data.name,
            location: data.location,
            level: data.level,
            description: data.description,
            companyName: data.company?.name || null,
            skills: data.skills?.map(skill => skill.name) || []
        };
        const jobInfoString = JSON.stringify(jobInfo, null, 0);

        // assign secondeRequest OpenAI API combine jobInfoString and messageForOpenAI to messageForOpenAI
        const resumesInfo = messageData.message;

        //call get_resumes_score_against_jobs from get_cv_score_chat.js file
        const cvScoreResult = await getCVScoreChat(resumesInfo, jobInfoString);

        // Giải mã kết quả trả về (dạng {"score":45})
        let score = null;
        try {
            const parsed = typeof cvScoreResult === 'string' ? JSON.parse(cvScoreResult) : cvScoreResult;
            score = parsed?.score ?? null;
        } catch (err) {
            console.error(`Error parsing score for job ${job.id}:`, err);
        }

        // Gán score vào jobList
        job.score = score;
      }
      console.log('jobList:', jobList);
      const formattedJobList = formatSearchJobResults(jobList);
      
      // Thêm score vào từng job trong formattedJobList
      const jobListWithScore = formattedJobList.map(formattedJob => {
        const originalJob = jobList.find(job => 
          (job.id ?? job.jobId) === formattedJob.id
        );
        return {
          ...formattedJob,
          score: originalJob?.score ?? null
        };
      });
      
      console.log('formattedJobList with score:', jobListWithScore);

      // Format message thành string cho mỗi job
      const messageLines = jobListWithScore.map(job => {
        const name = job.name || 'N/A';
        const score = job.score !== null && job.score !== undefined ? job.score : 'N/A';
        const url = job.url || 'N/A';
        return `"Tên Công Việc": ${name}\n"Điểm đánh giá": ${score}\n"Links": ${url}`;
      });
      const message = messageLines.join('\n\n');

      // Add assistant message to conversation
      const assistantMessage = {
        role: 'assistant',
        content: message,
        time: new Date().toISOString()
      };
      
      database.addMessage(conversationId, assistantMessage);

      // Save conversation to Supabase (only when there are actual messages)
      try {
        const finalConversation = database.getConversation(conversationId);
        
        // Only save if there are user/assistant messages (not just system)
        const userMessages = filterUserMessages(finalConversation);
        
        if (userMessages.length > 0) {
          // ✅ KIỂM TRA XEM ĐÃ LƯU CHƯA ĐỂ TRÁNH LƯU TRÙNG LẶP
          const existingConversation = await supabaseService.getConversation(conversationId);
          
          // Chỉ lưu nếu chưa có hoặc có thay đổi
          if (!existingConversation || existingConversation.messages.length !== userMessages.length) {
            // Format messages for Supabase with timestamps
            const formattedMessages = finalConversation.map(msg => ({
              role: msg.role,
              content: msg.content,
              time: msg.time || new Date().toISOString()
            }));

            await supabaseService.saveConversation(
              conversationId,
              username,
              role,
              formattedMessages
            );
            
            logger.info(`Conversation saved to Supabase: ${conversationId}`);
          } else {
            logger.info(`Conversation already exists in Supabase: ${conversationId}, skipping save`);
          }
        }
      } catch (supabaseError) {
        logger.error('Failed to save conversation to Supabase:', supabaseError);
        // Continue with response even if Supabase save fails
      }

      const processingTime = Date.now() - startTime;
      return res.json(successResponse('Message processed successfully', {
        message: message,
        chatboxId: chatboxId,
        conversationId: conversationId,
        newSession: isNew,
        processingTime: processingTime
      }));

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ AI Server Error:', error.message);
      console.error('📍 Error Stack:', error.stack);
      console.error('⏱️ Processing Time:', processingTime + 'ms');
      console.error('🆔 Chatbox ID:', req.params.chatboxId);
      const response = errorResponse('Lỗi Ai Server', {
        chatboxId: req.params.chatboxId,
        processingTime,
        error: true
      });
      return res.json(response);
    }
  }

  getFallbackResponse(userMessage, isSystemPromptUnavailable = false) {
    if (isSystemPromptUnavailable) {
      return 'Chat hiện tại Available - Hệ thống đang được cấu hình. Vui lòng thử lại sau.';
    }
    const fallbackResponses = [
      'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
      'Hiện tại hệ thống đang bận. Bạn có thể thử lại sau một chút không?',
      'Tôi không thể xử lý yêu cầu của bạn ngay bây giờ. Vui lòng thử lại sau.',
      'Xin lỗi vì sự bất tiện này. Hệ thống đang được bảo trì.',
      'Tôi đang gặp khó khăn trong việc xử lý yêu cầu của bạn. Vui lòng thử lại sau.'
    ];
    if (userMessage.toLowerCase().includes('xin chào') || userMessage.toLowerCase().includes('hello')) {
      return 'Xin chào! Tôi là AI Assistant. Tôi có thể giúp gì cho bạn?';
    }
    if (userMessage.toLowerCase().includes('cảm ơn') || userMessage.toLowerCase().includes('thank')) {
      return 'Không có gì! Tôi rất vui được giúp đỡ bạn.';
    }
    if (userMessage.toLowerCase().includes('tạm biệt') || userMessage.toLowerCase().includes('bye')) {
      return 'Tạm biệt! Chúc bạn một ngày tốt lành!';
    }
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

module.exports = new ChatControllerWithResume();


