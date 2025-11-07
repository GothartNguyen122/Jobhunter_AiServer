const fs = require('fs').promises;
const path = require('path');
const JSON5 = require('json5');
const logger = require('./logger');

class PromptManager {
  constructor() {
    this.prompts = {};
    this.promptsPath = path.join(__dirname, '..', 'prompts.json5');
    this.isLoaded = false;
  }

  /**
   * Load prompts from JSON file
   */
  async loadPrompts() {
    try {
      if (this.isLoaded) {
        return this.prompts;
      }

      const data = await fs.readFile(this.promptsPath, 'utf8');
      this.prompts = JSON5.parse(data);
      this.isLoaded = true;
      
      logger.success(`Loaded ${Object.keys(this.prompts).length} prompts from prompts.json`);
      return this.prompts;
    } catch (error) {
      logger.error('Failed to load prompts:', error.message);
      // Return default prompts if file doesn't exist
      this.prompts = this.getDefaultPrompts();
      this.isLoaded = true;
      return this.prompts;
    }
  }

  /**
   * Get a specific prompt by ID
   */
  async getPrompt(promptId) {
    await this.loadPrompts();
    if (!this.prompts[promptId]) {
      throw new Error(`Prompt with ID '${promptId}' not found`);
    }
    return this.prompts[promptId];
  }

  /**
   * Get default prompt
   */
  async getDefaultPrompt() {
    return await this.getPrompt('default');
  }

  /**
   * Get PDF extractor prompt
   */
  async getPDFExtractorPrompt() {
    return await this.getPrompt('pdf_extractor_prompt');
  }

  /**
   * Get career counselor prompt
   */
  async getCareerCounselorPrompt() {
    return await this.getPrompt('careerCounselor');
  }

  /**
   * Get technical interviewer prompt
   */
  async getTechnicalInterviewerPrompt() {
    return await this.getPrompt('technicalInterviewer');
  }

  /**
   * Get CV reviewer prompt
   */
  async getCVReviewerPrompt() {
    return await this.getPrompt('cvReviewer');
  }

  /**
   * Get job matcher prompt
   */
  async getJobMatcherPrompt() {
    return await this.getPrompt('jobMatcher');
  }

  /**
   * Get skill analyzer prompt
   */
  async getSkillAnalyzerPrompt() {
    return await this.getPrompt('skillAnalyzer');
  }

  /**
   * Get interview coach prompt
   */
  async getInterviewCoachPrompt() {
    return await this.getPrompt('interviewCoach');
  }

  /**
   * Get salary negotiator prompt
   */
  async getSalaryNegotiatorPrompt() {
    return await this.getPrompt('salaryNegotiator');
  }

  /**
   * Get network builder prompt
   */
  async getNetworkBuilderPrompt() {
    return await this.getPrompt('networkBuilder');
  }

  /**
   * Get CV compatible prompt
   */
  async getCVCompatiblePrompt() {
    return await this.getPrompt('cv_compatible_prompt');
  }
  /**
   * Get CV score chat prompt
   */
  async getCVScoreChatPrompt() {
    return await this.getPrompt('cv_score_chat');
  }

  /**
   * Get all prompts
   */
  async getAllPrompts() {
    await this.loadPrompts();
    return this.prompts;
  }

  /**
   * Get available prompt IDs
   */
  async getPromptIds() {
    await this.loadPrompts();
    return Object.keys(this.prompts);
  }

  /**
   * Update a prompt
   */
  async updatePrompt(promptId, newPrompt) {
    await this.loadPrompts();
    this.prompts[promptId] = newPrompt;
    
    try {
      await fs.writeFile(this.promptsPath, JSON5.stringify(this.prompts, null, 2), 'utf8');
      logger.success(`Updated prompt: ${promptId}`);
      return true;
    } catch (error) {
      logger.error('Failed to update prompt:', error.message);
      return false;
    }
  }

  /**
   * Add a new prompt
   */
  async addPrompt(promptId, prompt) {
    await this.loadPrompts();
    this.prompts[promptId] = prompt;
    
    try {
      await fs.writeFile(this.promptsPath, JSON5.stringify(this.prompts, null, 2), 'utf8');
      logger.success(`Added new prompt: ${promptId}`);
      return true;
    } catch (error) {
      logger.error('Failed to add prompt:', error.message);
      return false;
    }
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(promptId) {
    await this.loadPrompts();
    
    if (promptId === 'default') {
      logger.warn('Cannot delete default prompt');
      return false;
    }
    
    delete this.prompts[promptId];
    
    try {
      await fs.writeFile(this.promptsPath, JSON5.stringify(this.prompts, null, 2), 'utf8');
      logger.success(`Deleted prompt: ${promptId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete prompt:', error.message);
      return false;
    }
  }

  /**
   * Reload prompts from file
   */
  async reloadPrompts() {
    this.isLoaded = false;
    return await this.loadPrompts();
  }

  /**
   * Get default prompts (fallback)
   */
  getDefaultPrompts() {
    return {
      default: "Bạn là AI Assistant chuyên về tư vấn nghề nghiệp và tìm việc làm. Hãy trả lời một cách thân thiện, chuyên nghiệp và hữu ích.",
      pdfExtractor: "You are an expert at extracting information from job application documents..."
    };
  }
}

module.exports = new PromptManager();
