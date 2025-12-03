const promptManager = require('../utils/promptManager');

const config = {
  // Server configuration
  port: process.env.PORT || 3005,
  
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.1
  },

  // PDF Extractor configuration
  pdfExtractor: {
    getPrompt: () => promptManager.getPDFExtractorPrompt(),
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    temperature: 0.1
  },

  // PDF Extractor configuration
  pdfExtractor: {
    getPrompt: () => promptManager.getPDFExtractorPrompt(),
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    temperature: 0.1
  },

  // Prompt Manager
  promptManager: promptManager,

  // System prompts - now using PromptManager
  systemPrompts: {
    getDefault: () => promptManager.getDefaultPrompt(),
    getPDFExtractor: () => promptManager.getPDFExtractorPrompt(),
    getCareerCounselor: () => promptManager.getCareerCounselorPrompt(),
    getTechnicalInterviewer: () => promptManager.getTechnicalInterviewerPrompt(),
    getCVReviewer: () => promptManager.getCVReviewerPrompt(),
    getJobMatcher: () => promptManager.getJobMatcherPrompt(),
    getSkillAnalyzer: () => promptManager.getSkillAnalyzerPrompt(),
    getInterviewCoach: () => promptManager.getInterviewCoachPrompt(),
    getSalaryNegotiator: () => promptManager.getSalaryNegotiatorPrompt(),
    getNetworkBuilder: () => promptManager.getNetworkBuilderPrompt(),
    getCVScoreChat: () => promptManager.getCVScoreChatPrompt(),
    getAll: () => promptManager.getAllPrompts(),
    getById: async (id) => {
      try {
        return await promptManager.getPrompt(id);
      } catch (error) {
        throw error; // Re-throw to be caught by chatController
      }
    }
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:5500',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5500',
      'https://jobhunter-front-end-j5t3.vercel.app',
      'https://www.jobs-network.website',
      'https://jobs-network.website'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },

  // File upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp']
  }
};

module.exports = config;
