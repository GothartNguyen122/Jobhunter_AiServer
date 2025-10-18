const OpenAI = require('openai');
const database = require('../config/database');
const config = require('../config/config');
const supabaseService = require('../services/supabaseService');
const sessionService = require('../services/sessionService');
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
      
      // Validate chatboxId
      if (!chatboxId || chatboxId === 'undefined') {
        logger.warn('Invalid chatboxId provided:', chatboxId);
        return res.status(400).json(validationErrorResponse('Invalid chatboxId', ['chatboxId is required']));
      }
      
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
        return res.status(404).json(notFoundResponse(`Chatbox not found: ${chatboxId}`));
      }

      if (!chatbox.enabled) {
        logger.warn(`Chatbox is disabled: ${chatboxId}`);
        return res.status(403).json(errorResponse('Chatbox is currently disabled', 403));
      }

      // Resolve session conversation id based on user & inactivity
      const username = messageData.user?.name || 'anonymous';
      const role = messageData.user?.role || 'user';
      const { conversationId, isNew } = sessionService.getOrCreateSession(chatboxId, username, role);

      // If new session, clear any existing conversation in memory
      if (isNew) {
        database.clearConversation(conversationId);
      }

      // Use conversationId as the key to the in-memory history
      let conversation = database.getConversation(conversationId);
      
      // If no conversation in memory but session is not new, try to restore from Supabase
      if (conversation.length === 0 && !isNew) {
        try {
          logger.info(`Attempting to restore conversation from Supabase: ${conversationId}`);
          const supabaseConversation = await supabaseService.getConversation(conversationId);
          
          if (supabaseConversation && supabaseConversation.messages) {
            // Restore conversation to memory
            const messages = supabaseConversation.messages;
            messages.forEach(msg => {
              database.addMessage(conversationId, {
                role: msg.role,
                content: msg.content,
                time: msg.time
              });
            });
            
            // Get updated conversation
            conversation = database.getConversation(conversationId);
            
            logger.success(`Restored conversation from Supabase: ${conversationId} (${conversation.length} messages)`);
          }
        } catch (supabaseError) {
          logger.warn(`Failed to restore conversation from Supabase: ${supabaseError.message}`);
          // Continue with empty conversation
        }
      }
      
      // Add user message to conversation
      const userMessage = {
        role: 'user',
        content: messageData.user?.name 
          ? `User(${messageData.user.name}${messageData.user.role ? '|' + messageData.user.role : ''}): ${messageData.message}`
          : messageData.message,
        time: new Date().toISOString()
      };
      
      conversation = database.addMessage(conversationId, userMessage);

      // Get system prompt for this chatbox
      let systemPrompt;
      try {
        systemPrompt = await config.systemPrompts.getById(chatbox.systemPromptId || 'default');
      } catch (error) {
        logger.warn(`Failed to get system prompt for chatbox ${chatboxId}:`, error.message);
        // Return fallback response when system prompt is not available
        const chatController = new ChatController();
        const fallbackResponse = chatController.getFallbackResponse(messageData?.message || '', true);
        
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

      // Filter out any messages with null/undefined content
      const validMessages = conversation.filter(msg => 
        msg && msg.content && typeof msg.content === 'string' && msg.content.trim() !== ''
      );

      // Prepare OpenAI request
      const openaiPayload = {
        model: config.openai.model,
        messages: validMessages,
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
        content: aiResponse,
        time: new Date().toISOString()
      };
      
      database.addMessage(conversationId, assistantMessage);

      // Save conversation to Supabase (only when there are actual messages)
      try {
        const finalConversation = database.getConversation(conversationId);
        
        // Only save if there are user/assistant messages (not just system)
        const userMessages = finalConversation.filter(msg => 
          msg.role === 'user' || msg.role === 'assistant'
        );
        
        if (userMessages.length > 0) {
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
        }
      } catch (supabaseError) {
        logger.error('Failed to save conversation to Supabase:', supabaseError);
        // Continue with response even if Supabase save fails
      }

      const processingTime = Date.now() - startTime;
      logger.chatboxResponse(chatboxId, aiResponse, processingTime);

      // Return response
      const response = successResponse('Message processed successfully', {
        message: aiResponse,
        chatboxId: chatboxId,
        conversationId: conversationId,
        newSession: isNew, // true nếu là session mới, false nếu là session cũ
        processingTime: processingTime
      });

      res.json(response);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.chatboxError(req.params.chatboxId, error);
      
      // Return fallback response
      const chatController = new ChatController();
      const fallbackResponse = chatController.getFallbackResponse(messageData?.message || '');
      
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
      const { username, role, conversationId } = req.query;
      
      // Validate chatboxId
      if (!chatboxId || chatboxId === 'undefined') {
        logger.warn('Invalid chatboxId provided:', chatboxId);
        return res.status(400).json(validationErrorResponse('Invalid chatboxId', ['chatboxId is required']));
      }
      
      logger.info(`Getting conversation history for chatbox: ${chatboxId}`);

      // Check if chatbox exists
      const chatbox = database.getChatboxById(chatboxId);
      if (!chatbox) {
        logger.warn(`Chatbox not found: ${chatboxId}`);
        return res.status(404).json(notFoundResponse(`Chatbox not found: ${chatboxId}`));
      }

      // Determine active conversation ID
      let activeConversationId = chatboxId;
      let isNewSession = false;
      
      // Priority: 1. Explicit conversationId, 2. Session-based, 3. Default chatboxId
      if (conversationId && conversationId !== 'undefined') {
        activeConversationId = conversationId;
        logger.info(`Using explicit conversationId: ${conversationId}`);
      } else if (username || role) {
        const session = sessionService.getCurrentSession(chatboxId, username, role);
        if (session) {
          activeConversationId = session.conversationId;
          logger.info(`Using session conversationId: ${activeConversationId}`);
        } else {
          // No active session, create new one
          const { conversationId: newConversationId, isNew } = sessionService.getOrCreateSession(chatboxId, username, role);
          activeConversationId = newConversationId;
          isNewSession = isNew;
          logger.info(`Created new session with conversationId: ${activeConversationId}`);
        }
      }

      // Get conversation history from memory first
      let conversation = database.getConversation(activeConversationId);
      let userHistory = conversation.filter(msg => msg.role !== 'system');
      
      // If no conversation in memory, try to restore from Supabase
      if (userHistory.length === 0) {
        try {
          logger.info(`Attempting to restore conversation from Supabase: ${activeConversationId}`);
          const supabaseConversation = await supabaseService.getConversation(activeConversationId);
          
          if (supabaseConversation && supabaseConversation.messages && supabaseConversation.messages.length > 0) {
            // Restore conversation to memory
            const messages = supabaseConversation.messages;
            messages.forEach(msg => {
              database.addMessage(activeConversationId, {
                role: msg.role,
                content: msg.content,
                time: msg.time
              });
            });
            
            // Get updated conversation
            conversation = database.getConversation(activeConversationId);
            userHistory = conversation.filter(msg => msg.role !== 'system');
            
            logger.success(`Restored conversation from Supabase: ${activeConversationId} (${userHistory.length} messages)`);
          } else {
            logger.info(`No conversation found in Supabase for: ${activeConversationId}`);
          }
        } catch (supabaseError) {
          logger.warn(`Failed to restore conversation from Supabase: ${supabaseError.message}`);
          // Continue with empty conversation
        }
      }
      
      logger.success(`Retrieved conversation history for chatbox: ${chatboxId} (${userHistory.length} messages)`);
      res.json(successResponse('Conversation history retrieved successfully', {
        messages: userHistory,
        conversationId: activeConversationId,
        isNewSession: isNewSession,
        chatboxId: chatboxId,
        source: userHistory.length > 0 ? 'memory' : 'empty'
      }));
    } catch (error) {
      logger.error('Error getting conversation history', error);
      res.status(500).json(errorResponse('Failed to retrieve conversation history', 500));
    }
  }

  // Clear conversation history
  async clearConversationHistory(req, res) {
    try {
      const { chatboxId } = req.params;
      const { username, role, conversationId } = req.query;
      
      // Validate chatboxId
      if (!chatboxId || chatboxId === 'undefined') {
        logger.warn('Invalid chatboxId provided:', chatboxId);
        return res.status(400).json(validationErrorResponse('Invalid chatboxId', ['chatboxId is required']));
      }
      
      logger.info(`Clearing conversation history for chatbox: ${chatboxId}`);

      // Check if chatbox exists
      const chatbox = database.getChatboxById(chatboxId);
      if (!chatbox) {
        logger.warn(`Chatbox not found: ${chatboxId}`);
        return res.status(404).json(notFoundResponse(`Chatbox not found: ${chatboxId}`));
      }

      // Determine which conversation to clear
      let targetConversationId = chatboxId;
      
      if (conversationId && conversationId !== 'undefined') {
        targetConversationId = conversationId;
        logger.info(`Clearing specific conversation: ${conversationId}`);
      } else if (username || role) {
        const session = sessionService.getCurrentSession(chatboxId, username, role);
        if (session) {
          targetConversationId = session.conversationId;
          logger.info(`Clearing session conversation: ${targetConversationId}`);
        }
      }

      // If username/role provided, end the session as well
      if (username || role) {
        sessionService.endSession(chatboxId, username, role);
      }

      // Clear conversation history
      const cleared = database.clearConversation(targetConversationId);
      if (!cleared) {
        logger.warn(`Failed to clear conversation for: ${targetConversationId}`);
        return res.status(500).json(errorResponse('Failed to clear conversation history', 500));
      }

      logger.success(`Cleared conversation history for: ${targetConversationId}`);
      res.json(successResponse('Conversation history cleared successfully', {
        clearedConversationId: targetConversationId,
        chatboxId: chatboxId
      }));
    } catch (error) {
      logger.error('Error clearing conversation history', error);
      res.status(500).json(errorResponse('Failed to clear conversation history', 500));
    }
  }

  // Get all conversations from Supabase
  async getAllConversations(req, res) {
    try {
      logger.info('Getting all conversations from Supabase');
      
      const conversations = await supabaseService.getAllConversations();
      
      const formattedConversations = conversations.map(conv => ({
        id: conv.id,
        conversationId: conv.conversation_id,
        username: conv.username,
        role: conv.role,
        messageCount: conv.messages ? conv.messages.length : 0,
        createdAt: conv.created_at,
        lastMessage: conv.messages && conv.messages.length > 0 
          ? conv.messages[conv.messages.length - 1]?.content || '' 
          : ''
      }));
      
      logger.success(`Retrieved ${conversations.length} conversations from Supabase`);
      res.json(successResponse('Conversations retrieved successfully', formattedConversations));
    } catch (error) {
      logger.error('Error getting all conversations:', error);
      res.status(500).json(errorResponse('Failed to retrieve conversations', 500));
    }
  }

  // Get conversation by ID from Supabase
  async getConversationById(req, res) {
    try {
      const { conversationId } = req.params;
      
      // Validate conversationId
      if (!conversationId || conversationId === 'undefined') {
        logger.warn('Invalid conversationId provided:', conversationId);
        return res.status(400).json(validationErrorResponse('Invalid conversationId', ['conversationId is required']));
      }
      
      logger.info(`Getting conversation from Supabase: ${conversationId}`);
      
      const conversation = await supabaseService.getConversation(conversationId);
      
      if (!conversation) {
        logger.warn(`Conversation not found: ${conversationId}`);
        return res.status(404).json(notFoundResponse(`Conversation not found: ${conversationId}`));
      }
      
      // Format the response with additional metadata
      const formattedConversation = {
        id: conversation.id,
        conversationId: conversation.conversation_id,
        username: conversation.username,
        role: conversation.role,
        messages: conversation.messages || [],
        messageCount: conversation.messages ? conversation.messages.length : 0,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      };
      
      logger.success(`Retrieved conversation: ${conversationId} (${formattedConversation.messageCount} messages)`);
      res.json(successResponse('Conversation retrieved successfully', formattedConversation));
    } catch (error) {
      logger.error('Error getting conversation:', error);
      res.status(500).json(errorResponse('Failed to retrieve conversation', 500));
    }
  }

  // Get conversations by username
  async getConversationsByUsername(req, res) {
    try {
      const { username } = req.params;
      logger.info(`Getting conversations for username: ${username}`);
      
      const conversations = await supabaseService.getConversationsByUsername(username);
      
      logger.success(`Retrieved ${conversations.length} conversations for username: ${username}`);
      res.json(successResponse('Conversations retrieved successfully', conversations));
    } catch (error) {
      logger.error('Error getting conversations by username:', error);
      res.status(500).json(errorResponse('Failed to retrieve conversations', 500));
    }
  }

  // Get conversations by role
  async getConversationsByRole(req, res) {
    try {
      const { role } = req.params;
      logger.info(`Getting conversations for role: ${role}`);
      
      const conversations = await supabaseService.getConversationsByRole(role);
      
      logger.success(`Retrieved ${conversations.length} conversations for role: ${role}`);
      res.json(successResponse('Conversations retrieved successfully', conversations));
    } catch (error) {
      logger.error('Error getting conversations by role:', error);
      res.status(500).json(errorResponse('Failed to retrieve conversations', 500));
    }
  }

  // Delete conversation from Supabase
  async deleteConversation(req, res) {
    try {
      const { conversationId } = req.params;
      logger.info(`Deleting conversation: ${conversationId}`);
      
      await supabaseService.deleteConversation(conversationId);
      
      logger.success(`Conversation deleted: ${conversationId}`);
      res.json(successResponse('Conversation deleted successfully'));
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      res.status(500).json(errorResponse('Failed to delete conversation', 500));
    }
  }

  // Get conversation history for legacy endpoint (without chatboxId)
  async getLegacyConversationHistory(req, res) {
    try {
      const { conversationId, username, role } = req.query;
      
      logger.info(`Getting legacy conversation history with conversationId: ${conversationId}`);
      
      // If conversationId is provided, get conversation directly from Supabase
      if (conversationId && conversationId !== 'undefined') {
        try {
          logger.info(`Attempting to get conversation from Supabase: ${conversationId}`);
          const supabaseConversation = await supabaseService.getConversation(conversationId);
          
          if (supabaseConversation && supabaseConversation.messages && supabaseConversation.messages.length > 0) {
            // Filter out system messages for user display
            const userMessages = supabaseConversation.messages.filter(msg => msg.role !== 'system');
            
            logger.success(`Retrieved conversation from Supabase: ${conversationId} (${userMessages.length} messages)`);
            res.json(successResponse('Conversation history retrieved successfully', {
              messages: userMessages,
              conversationId: conversationId,
              newSession: false, // Đã có conversation, không phải session mới
              chatboxId: 'default',
              source: 'supabase',
              username: supabaseConversation.username,
              role: supabaseConversation.role
            }));
            return;
          } else {
            logger.info(`No conversation found in Supabase for: ${conversationId}`);
            res.json(successResponse('No conversation found', {
              messages: [],
              conversationId: conversationId,
              newSession: true, // Không tìm thấy conversation, tạo session mới
              chatboxId: 'default',
              source: 'empty'
            }));
            return;
          }
        } catch (supabaseError) {
          logger.warn(`Failed to get conversation from Supabase: ${supabaseError.message}`);
          res.status(500).json(errorResponse('Failed to retrieve conversation from database', 500));
          return;
        }
      }
      
      // If no conversationId, this is a new session
      logger.info('No conversationId provided, creating new session');
      res.json(successResponse('New session created', {
        messages: [],
        conversationId: null,
        newSession: true, // Không có conversationId, tạo session mới
        chatboxId: 'default',
        source: 'new'
      }));
    } catch (error) {
      logger.error('Error getting legacy conversation history', error);
      res.status(500).json(errorResponse('Failed to retrieve conversation history', 500));
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
