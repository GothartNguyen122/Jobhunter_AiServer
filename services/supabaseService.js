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

  /**
   * Save analysis data record to Supabase
   * @param {Object} payload
   */
  async saveAnalysisData(payload = {}) {
    try {
      const {
        id,
        user_id,
        job_id,
        job_name,
        extractedData,
        final_result,
        analysis_result,
        matching_score
      } = payload;

      const record = {
        user_id,
        job_id,
        job_name,
        extracted_data:extractedData,
        final_result,
        analysis_result,
        matching_score :Number((matching_score || '').replace('%', '')),
      };

      if (id) {
        record.id = id;
      }

      const { data, error } = await supabase
        .from('analysics_datas')
        .insert(record)
        .select()
        .single();

      if (error) {
        logger.error('Error saving analysis data to Supabase:', error);
        throw error;
      }

      logger.info(`Analysis data saved to Supabase for job: ${job_id}`);
      return data;
    } catch (error) {
      logger.error('Error in saveAnalysisData:', error);
      throw error;
    }
  }

  /**
   * Get latest analysis data for a user/job pair
   * @param {string|number} userId
   * @param {string|number} jobId
   */
  async getLatestAnalysisDataByUserAndJob(userId, jobId) {
    try {
      // Convert to number to ensure type matching with database
      const userIdNum = Number(userId);
      const jobIdNum = Number(jobId);

      // Validate conversion
      if (isNaN(userIdNum) || isNaN(jobIdNum)) {
        logger.error(`Invalid userId or jobId: userId=${userId}, jobId=${jobId}`);
        throw new Error(`Invalid userId or jobId: userId=${userId}, jobId=${jobId}`);
      }

      logger.info(`[Supabase] Querying analysis_datas for userId: ${userIdNum} (${typeof userIdNum}), jobId: ${jobIdNum} (${typeof jobIdNum})`);

      const { data, error } = await supabase
        .from('resume_infos')
        .select('*')
        .eq('user_id', userIdNum)
        .eq('job_id', jobIdNum)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        logger.error('Error fetching analysis data from Supabase:', error);
        logger.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      logger.info(`[Supabase] Query result: found ${data?.length || 0} record(s)`);
      if (data && data.length > 0) {
        logger.info(`[Supabase] Found record with id: ${data[0].id}`);
      } else {
        logger.warn(`[Supabase] No analysis data found for userId: ${userIdNum}, jobId: ${jobIdNum}`);
      }

      return data?.[0] || null;
    } catch (error) {
      logger.error('Error in getLatestAnalysisDataByUserAndJob:', error);
      throw error;
    }
  }

  /**
   * Get latest analysis data per user for a given job
   * @param {string|number} jobId
   */
  async getAnalysisDataByJobUniqueUsers(jobId) {
    try {
      const { data, error } = await supabase
        .from('analysics_datas')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching analysis data list from Supabase:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      const seenUsers = new Set();
      const uniqueRecords = [];

      for (const record of data) {
        const userId = record.user_id;
        if (!userId) continue;
        if (seenUsers.has(userId)) continue;
        seenUsers.add(userId);
        uniqueRecords.push(record);
      }

      return uniqueRecords;
    } catch (error) {
      logger.error('Error in getAnalysisDataByJobUniqueUsers:', error);
      throw error;
    }
  }

  /**
   * Save resume info to Supabase
   * @param {Object} payload - { user_id, job_id, resume (JSONB) }
   */
  async saveResumeInfo(payload = {}) {
    try {
      const {
        user_id,
        job_id,
        resume
      } = payload;

      if (!user_id) {
        throw new Error('user_id is required');
      }

      if (!job_id) {
        throw new Error('job_id is required');
      }

      if (!resume) {
        throw new Error('resume is required');
      }

      const record = {
        user_id: Number(user_id),
        job_id: Number(job_id),
        resume: resume // JSONB - already an object
      };

      const { data, error } = await supabase
        .from('resume_infos')
        .upsert(record, {
          onConflict: 'user_id,job_id' // Update if exists, insert if not
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving resume info to Supabase:', error);
        throw error;
      }

      logger.info(`Resume info saved to Supabase for user: ${user_id}, job: ${job_id}`);
      return data;
    } catch (error) {
      logger.error('Error in saveResumeInfo:', error);
      throw error;
    }
  }

  /**
   * Get resume info by user_id and job_id
   * @param {string|number} userId
   * @param {string|number} jobId
   */
  async getResumeInfo(userId, jobId) {
    try {
      const { data, error } = await supabase
        .from('resume_infos')
        .select('*')
        .eq('user_id', Number(userId))
        .eq('job_id', Number(jobId))
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        logger.error('Error getting resume info from Supabase:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error in getResumeInfo:', error);
      throw error;
    }
  }

  /**
   * Get all resume infos for a job
   * @param {string|number} jobId
   */
  async getResumeInfosByJob(jobId) {
    try {
      const { data, error } = await supabase
        .from('resume_infos')
        .select('*')
        .eq('job_id', Number(jobId))
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error getting resume infos by job from Supabase:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getResumeInfosByJob:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseService();
