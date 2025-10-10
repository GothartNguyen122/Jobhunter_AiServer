const OpenAI = require('openai');
const database = require('../config/database');
const config = require('../config/config');
const { successResponse, errorResponse, notFoundResponse, validationErrorResponse } = require('../utils/response');
const { validateMessageData, sanitizeObject } = require('../utils/validation');
const logger = require('../utils/logger');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

class ChatController {
  // Send message to chatbox
  async sendMessage(req, res) {
    const startTime = Date.now();
    try {
      // Handle legacy endpoint (no chatboxId in params)
      const chatboxId = req.params.chatboxId || 'default';
      const messageData = sanitizeObject(req.body);
      
      logger.chatboxRequest(chatboxId, messageData.message, messageData.user);

      // Validate message data
      const validation = validateMessageData(messageData);
      if (!validation.isValid) {
        logger.warn('Invalid message data', validation.errors);
        return res.status(400).json(validationErrorResponse('Invalid message data', validation.errors));
      }

      // Check if chatbox exists and is enabled
      const chatbox = database.getChatboxById(chatboxId);
      if (!chatbox) {
        logger.warn(`Chatbox not found: ${chatboxId}`);
        return res.status(404).json(notFoundResponse('Chatbox not found'));
      }

      if (!chatbox.enabled) {
        logger.warn(`Chatbox is disabled: ${chatboxId}`);
        return res.status(403).json(errorResponse('Chatbox is currently disabled', 403));
      }

      // Get conversation history
      let conversation = database.getConversation(chatboxId);
      
      // Add user message to conversation
      const userMessage = {
        role: 'user',
        content: messageData.user?.name 
          ? `User(${messageData.user.name}${messageData.user.role ? '|' + messageData.user.role : ''}): ${messageData.message}`
          : messageData.message
      };
      
      conversation = database.addMessage(chatboxId, userMessage);

      // Get system prompt for this chatbox
      let systemPrompt;
      try {
        systemPrompt = await config.systemPrompts.getById(chatbox.systemPromptId || 'default');
      } catch (error) {
        logger.warn(`Failed to get system prompt for chatbox ${chatboxId}:`, error.message);
        // Return fallback response when system prompt is not available
        const fallbackResponse = this.getFallbackResponse(messageData?.message || '', true);
        
        const response = successResponse('Chat hiện tại Available', {
          message: fallbackResponse,
          chatboxId: chatboxId,
          processingTime: Date.now() - startTime,
          fallback: true,
          reason: 'System prompt not available'
        });

        return res.json(response);
      }
      
      // Add system prompt to conversation if not already present
      if (!conversation.some(msg => msg.role === 'system')) {
        conversation.unshift({
          role: 'system',
          content: systemPrompt
        });
      }

      // Prepare OpenAI request
      const openaiPayload = {
        model: config.openai.model,
        messages: conversation,
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      };

      logger.debug('OpenAI request payload', openaiPayload);

      // Call OpenAI API
      const completion = await openai.chat.completions.create(openaiPayload);
      const aiResponse = completion.choices[0].message.content;
      
      // Add AI response to conversation
      const assistantMessage = {
        role: 'assistant',
        content: aiResponse
      };
      
      database.addMessage(chatboxId, assistantMessage);

      const processingTime = Date.now() - startTime;
      logger.chatboxResponse(chatboxId, aiResponse, processingTime);

      // Return response
      const response = successResponse('Message processed successfully', {
        message: aiResponse,
        chatboxId: chatboxId,
        processingTime: processingTime
      });

      res.json(response);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.chatboxError(req.params.chatboxId, error);
      
      // Return fallback response
      const fallbackResponse = this.getFallbackResponse(messageData?.message || '');
      
      const response = successResponse('Message processed with fallback', {
        message: fallbackResponse,
        chatboxId: req.params.chatboxId,
        processingTime: processingTime,
        fallback: true
      });

      res.json(response);
    }
  }

  // Get conversation history
  async getConversationHistory(req, res) {
    try {
      const { chatboxId } = req.params;
      logger.info(`Getting conversation history for chatbox: ${chatboxId}`);

      // Check if chatbox exists
      const chatbox = database.getChatboxById(chatboxId);
      if (!chatbox) {
        logger.warn(`Chatbox not found: ${chatboxId}`);
        return res.status(404).json(notFoundResponse('Chatbox not found'));
      }

      // Get conversation history (excluding system message)
      const conversation = database.getConversation(chatboxId);
      const userHistory = conversation.filter(msg => msg.role !== 'system');
      
      logger.success(`Retrieved conversation history for chatbox: ${chatboxId} (${userHistory.length} messages)`);
      res.json(successResponse('Conversation history retrieved successfully', userHistory));
    } catch (error) {
      logger.error('Error getting conversation history', error);
      res.status(500).json(errorResponse('Failed to retrieve conversation history', 500));
    }
  }

  // Clear conversation history
  async clearConversationHistory(req, res) {
    try {
      const { chatboxId } = req.params;
      logger.info(`Clearing conversation history for chatbox: ${chatboxId}`);

      // Check if chatbox exists
      const chatbox = database.getChatboxById(chatboxId);
      if (!chatbox) {
        logger.warn(`Chatbox not found: ${chatboxId}`);
        return res.status(404).json(notFoundResponse('Chatbox not found'));
      }

      // Clear conversation history
      const cleared = database.clearConversation(chatboxId);
      if (!cleared) {
        logger.warn(`Failed to clear conversation for chatbox: ${chatboxId}`);
        return res.status(500).json(errorResponse('Failed to clear conversation history', 500));
      }

      logger.success(`Cleared conversation history for chatbox: ${chatboxId}`);
      res.json(successResponse('Conversation history cleared successfully'));
    } catch (error) {
      logger.error('Error clearing conversation history', error);
      res.status(500).json(errorResponse('Failed to clear conversation history', 500));
    }
  }

  // Get fallback response
  getFallbackResponse(userMessage, isSystemPromptUnavailable = false) {
    // If system prompt is not available, show specific message
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

    // Simple keyword-based responses
    if (userMessage.toLowerCase().includes('xin chào') || userMessage.toLowerCase().includes('hello')) {
      return 'Xin chào! Tôi là AI Assistant. Tôi có thể giúp gì cho bạn?';
    }

    if (userMessage.toLowerCase().includes('cảm ơn') || userMessage.toLowerCase().includes('thank')) {
      return 'Không có gì! Tôi rất vui được giúp đỡ bạn.';
    }

    if (userMessage.toLowerCase().includes('tạm biệt') || userMessage.toLowerCase().includes('bye')) {
      return 'Tạm biệt! Chúc bạn một ngày tốt lành!';
    }

    // Return random fallback response
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

module.exports = new ChatController();
