const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

class SupabaseService {
  // Save conversation to Supabase
  async saveConversation(conversationId, username, role, messages) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .upsert({
          conversation_id: conversationId,
          username: username,
          role: role,
          messages: messages
        }, {
          onConflict: 'conversation_id'
        });
      
      if (error) {
        logger.error('Error saving conversation to Supabase:', error);
        throw error;
      }
      
      logger.info(`Conversation saved to Supabase: ${conversationId}`);
      return data;
    } catch (error) {
      logger.error('Error in saveConversation:', error);
      throw error;
    }
  }

  // Get conversation from Supabase
  async getConversation(conversationId) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        logger.error('Error getting conversation from Supabase:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Error in getConversation:', error);
      throw error;
    }
  }

  // Get all conversations
  async getAllConversations() {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('Error getting all conversations from Supabase:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Error in getAllConversations:', error);
      throw error;
    }
  }

  // Update conversation messages
  async updateConversationMessages(conversationId, messages) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          messages: messages
        })
        .eq('conversation_id', conversationId);
      
      if (error) {
        logger.error('Error updating conversation messages:', error);
        throw error;
      }
      
      logger.info(`Conversation messages updated: ${conversationId}`);
      return data;
    } catch (error) {
      logger.error('Error in updateConversationMessages:', error);
      throw error;
    }
  }

  // Delete conversation
  async deleteConversation(conversationId) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .delete()
        .eq('conversation_id', conversationId);
      
      if (error) {
        logger.error('Error deleting conversation:', error);
        throw error;
      }
      
      logger.info(`Conversation deleted: ${conversationId}`);
      return data;
    } catch (error) {
      logger.error('Error in deleteConversation:', error);
      throw error;
    }
  }

  // Get conversations by username
  async getConversationsByUsername(username) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('Error getting conversations by username:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Error in getConversationsByUsername:', error);
      throw error;
    }
  }

  // Get conversations by role
  async getConversationsByRole(role) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('Error getting conversations by role:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Error in getConversationsByRole:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseService();
