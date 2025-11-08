// Database configuration
// In production, you would use a real database like MongoDB, PostgreSQL, etc.
// For now, we'll use in-memory storage

class Database {
  constructor() {
    this.chatboxes = new Map();
    this.conversations = new Map();
    this.users = new Map();
    
    // Initialize with default data
    this.initializeDefaultData();
  }

  initializeDefaultData() {
    // Default chatbox
    this.chatboxes.set('default', {
      id: 'default',
      name: 'Default AI Assistant',
      description: 'Main AI chatbox for general assistance',
      enabled: true,
      systemPromptId: 'default',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // PDF Extractor chatbox
    this.chatboxes.set('pdfextractor', {
      id: 'pdfextractor',
      name: 'PDF Extractor',
      description: 'Chatbox for extracting information from PDF documents (CVs, Resumes)',
      enabled: true,
      systemPromptId: 'pdf_extractor_prompt',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Default conversation history
    this.conversations.set('default', [
      {
        role: 'system',
        content: process.env.SYSTEM_PROMPT || 'Bạn là AI Assistant chuyên về tư vấn nghề nghiệp và tìm việc làm. Hãy trả lời một cách thân thiện, chuyên nghiệp và hữu ích.'
      }
    ]);

    // PDF Extractor conversation history
    this.conversations.set('pdfextractor', []);
  }

  // Chatbox methods
  getAllChatboxes() {
    return Array.from(this.chatboxes.values());
  }

  getChatboxById(id) {
    return this.chatboxes.get(id);
  }

  createChatbox(chatboxData) {
    const id = chatboxData.id || `chatbox_${Date.now()}`;
    const chatbox = {
      id,
      name: chatboxData.name,
      description: chatboxData.description,
      enabled: chatboxData.enabled !== undefined ? chatboxData.enabled : true,
      systemPromptId: chatboxData.systemPromptId || 'default',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.chatboxes.set(id, chatbox);
    this.conversations.set(id, []);
    
    return chatbox;
  }

  updateChatbox(id, updateData) {
    const chatbox = this.chatboxes.get(id);
    if (!chatbox) return null;

    const updatedChatbox = {
      ...chatbox,
      ...updateData,
      updatedAt: new Date()
    };

    this.chatboxes.set(id, updatedChatbox);
    
    // Note: systemPromptId changes will be handled by the chat controller
    // when it loads the new system prompt from the prompt manager

    return updatedChatbox;
  }

  deleteChatbox(id) {
    const chatbox = this.chatboxes.get(id);
    if (!chatbox) return false;

    this.chatboxes.delete(id);
    this.conversations.delete(id);
    return true;
  }

  toggleChatbox(id) {
    const chatbox = this.chatboxes.get(id);
    if (!chatbox) return null;

    chatbox.enabled = !chatbox.enabled;
    chatbox.updatedAt = new Date();
    
    this.chatboxes.set(id, chatbox);
    return chatbox;
  }

  // Conversation methods
  getConversation(chatboxId) {
    return this.conversations.get(chatboxId) || [];
  }

  addMessage(chatboxId, message) {
    if (!this.conversations.has(chatboxId)) {
      this.conversations.set(chatboxId, [
        {
          role: 'system',
          content: this.chatboxes.get(chatboxId)?.systemPrompt || process.env.SYSTEM_PROMPT
        }
      ]);
    }

    const conversation = this.conversations.get(chatboxId);
    conversation.push(message);
    return conversation;
  }

  clearConversation(chatboxId) {
    const chatbox = this.chatboxes.get(chatboxId);
    if (!chatbox) return false;

    this.conversations.set(chatboxId, [
      {
        role: 'system',
        content: chatbox.systemPrompt
      }
    ]);
    return true;
  }
}

// Export singleton instance
module.exports = new Database();
