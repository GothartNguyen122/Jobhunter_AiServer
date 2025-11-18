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
const { formatSearchJobResults, stripHtmlTags } = require('../services/functions_call/support_functions');
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Sample payload to mimic user-search filters from JobController (Backend)
const SAMPLE_SEARCH_FILTERS = {
  keyword: '',
  location: 'HOCHIMINH',
  skills: '.NET Core',
  minSalary: 0,
  maxSalary: 100000000,
  level: 'JUNIOR',
  page: 1,
  size: 10,
  sort: 'updatedAt,desc'
};

// Sample resume data to demonstrate expected structure
const SAMPLE_RESUME_DATA = {
  full_name: 'Nguyen Van A',
  objective: 'Kỹ sư phần mềm với 3 năm kinh nghiệm về Frontend và Backend.',
  phone_number: '0123456789',
  email: 'nguyenvana@example.com',
  github: 'https://github.com/nguyenvana',
  university: 'Posts and Telecommunications Institute of Technology',
  technical_skills: ['JavaScript', 'ReactJS', 'NodeJS', 'HTML/CSS', 'SQL'],
  certificate: 'IELTS 7.0',
  projects: [
    {
      project_name: 'Job Portal Website',
      languages: ['ReactJS', 'NodeJS', 'MongoDB'],
      description: 'Xây dựng nền tảng tìm kiếm việc làm với tính năng gợi ý công việc.',
      team_size: 5,
      role: 'Fullstack Developer',
      duration: '01/2023 - 06/2023'
    }
  ]
};

class recommendForPageController {
  // async sendMessage(req, res) {
  //   const startTime = Date.now();
  //   try {
  //     const chatboxId = req.params.chatboxId || 'default';
  //     const messageData = sanitizeObject(req.body);

  //     if (!chatboxId || chatboxId === 'undefined') {
  //       return res.status(400).json(validationErrorResponse('Invalid chatboxId', ['chatboxId is required']));
  //     }

  //     const validation = validateMessageData(messageData);
  //     if (!validation.isValid) {
  //       return res.status(400).json(validationErrorResponse('Invalid message data', validation.errors));
  //     }

  //     const chatbox = database.getChatboxById(chatboxId);
  //     if (!chatbox) {
  //       return res.status(404).json(notFoundResponse(`Chatbox not found: ${chatboxId}`));
  //     }
  //     if (!chatbox.enabled) {
  //       return res.status(403).json(errorResponse('Chatbox is currently disabled', 403));
  //     }

  //     const username = messageData.user?.name || 'anonymous';
  //     const role = messageData.user?.role || 'user';
  //     const sessionInfo = messageData.sessionInfo;

  //     let { conversationId, isNew } = sessionService.getOrCreateSession(chatboxId, username, role, sessionInfo);
  //     if (isNew) {
  //       database.clearConversation(conversationId);
  //     }

  //     let conversation = database.getConversation(conversationId);
  //     if (conversation.length === 0 && !isNew) {
  //       try {
  //         const supabaseConversation = await supabaseService.getConversation(conversationId);
  //         if (supabaseConversation && supabaseConversation.messages) {
  //           const messages = supabaseConversation.messages;
  //           messages.forEach(msg => {
  //             database.addMessage(conversationId, {
  //               role: msg.role,
  //               content: msg.content,
  //               time: msg.time
  //             });
  //           });
  //           conversation = database.getConversation(conversationId);
  //         }
  //       } catch (_) {}
  //     }

  //     // Use message directly (extracted data already embedded in userMessage by frontend)
  //     let messageForOpenAI = messageData.message;

  //     const userMessage = {
  //       role: 'user',
  //       content: messageData.user?.name
  //         ? `User(${messageData.user.name}${messageData.user.role ? '|' + messageData.user.role : ''}): ${messageForOpenAI}`
  //         : messageForOpenAI,
  //       time: new Date().toISOString()
  //     };

  //     conversation = database.addMessage(conversationId, userMessage);

  //     let systemPrompt;
  //     try {
  //       systemPrompt = await config.systemPrompts.getById(chatbox.systemPromptId || 'default');
  //     } catch (error) {
  //       const fallback = this.getFallbackResponse(messageData?.message || '', true);
  //       return res.json(successResponse('Chat hiện tại Available', {
  //         message: fallback,
  //         chatboxId,
  //         processingTime: Date.now() - startTime,
  //         fallback: true,
  //         reason: 'System prompt not available'
  //       }));
  //     }

  //     if (!conversation.some(msg => msg.role === 'system')) {
  //       conversation.unshift({ role: 'system', content: systemPrompt });
  //     }

  //     const validMessages = filterValidMessages(conversation);

  //     //Frist Request OpenAI API 
  //     //Start xử lý theo quy trình mới:
  //     // 1) Gọi OpenAI để trích xuất keyword việc làm từ user input (đã chứa Resumes Information)
  //     const keywordInstruction = 'Extract job-related keywords (e.g., Front_End). Return only a short keyword string without additional explanation.';
  //     const keywordPrompt = `${keywordInstruction}\n\n${messageForOpenAI}`;

  //     const keywordResponse = await openai.chat.completions.create({
  //       model: config.openai.model,
  //       messages: [
  //         { role: 'system', content: 'You are a job-keyword extraction assistant. Always return 1 to 3 short keywords, separated by commas.' },
  //         { role: 'user', content: keywordPrompt }
  //       ],
  //       max_tokens: 64,
  //       temperature: 0.1
  //     });

  //     const keywordText = (keywordResponse.choices?.[0]?.message?.content || '').trim();
  //     // Chuẩn hóa: lấy từ khóa đầu tiên làm keyword chính để search
  //     const keywords = keywordText.split(',').map(k => k.trim()).filter(k => k.length > 0);
  //     const primaryKeyword = keywords[0] || keywordText;

  //     console.log('keywordText:', keywordText);

  //     // 2) Gọi function search_job với keyword vừa tạo, lấy mảng id của job
  //     const searchArgs = { keyword: primaryKeyword, page: 1, size: 5 };
  //     const searchResult = await call_function('search_job', searchArgs);
  //     const toolData = searchResult?.data?.data ?? searchResult?.data ?? searchResult;

  //     console.log("toolData:", toolData);
  //     // Lấy danh sách id và name
  //     const jobList = toolData?.result?.map(({ id, name }) => ({ id, name })) || [];

  //     console.log("jobList:", jobList);

  //    for (const job of jobList) {       
  //       const result = await call_function('get_job_by_id', { id: job.id });
  //       const data = result?.data?.data;
  //       if (!data) continue;
  //       // Trích xuất thông tin cần thiết
  //       const jobInfo = {
  //           name: data.name,
  //           location: data.location,
  //           level: data.level,
  //           description: stripHtmlTags(data.description),
  //           companyName: data.company?.name || null,
  //           skills: data.skills?.map(skill => skill.name) || []
  //       };
  //       const jobInfoString = JSON.stringify(jobInfo, null, 0);

  //       console.log("jobInfoString:", jobInfoString);

  //       // assign secondeRequest OpenAI API combine jobInfoString and messageForOpenAI to messageForOpenAI
  //       const resumesInfo = messageData.message;

  //       //call get_resumes_score_against_jobs from get_cv_score_chat.js file
  //       const cvScoreResult = await getCVScoreChat(resumesInfo, jobInfoString);

  //       // Giải mã kết quả trả về (dạng {"score":45})
  //       let score = null;
  //       try {
  //           const parsed = typeof cvScoreResult === 'string' ? JSON.parse(cvScoreResult) : cvScoreResult;
  //           score = parsed?.score ?? null;
  //       } catch (err) {
  //           console.error(`Error parsing score for job ${job.id}:`, err);
  //       }

  //       // Gán score vào jobList
  //       job.score = score;
  //     }
  //     console.log('jobList:', jobList);
  //     const formattedJobList = formatSearchJobResults(jobList);
      
  //     // Thêm score vào từng job trong formattedJobList
  //     const jobListWithScore = formattedJobList.map(formattedJob => {
  //       const originalJob = jobList.find(job => 
  //         (job.id ?? job.jobId) === formattedJob.id
  //       );
  //       return {
  //         ...formattedJob,
  //         score: originalJob?.score ?? null
  //       };
  //     });
      
  //     console.log('formattedJobList with score:', jobListWithScore);

  //     // Format message thành string cho mỗi job với danh sách có thứ tự và in đậm bằng markdown
  //     const messageLines = jobListWithScore.map((job, index) => {
  //       const name = job.name || 'N/A';
  //       const score = job.score !== null && job.score !== undefined ? job.score : 'N/A';
  //       const url = job.url || 'N/A';
  //       // Sử dụng markdown syntax: **text** để in đậm
  //       return `${index + 1}. **${name}**\n   **Điểm đánh giá:** ${score}\n   **Chi tiết:** ${url}`;
  //     });
  //     const message = messageLines.join('\n\n');

  //     // Add assistant message to conversation
  //     const assistantMessage = {
  //       role: 'assistant',
  //       content: message,
  //       time: new Date().toISOString()
  //     };
      
  //     database.addMessage(conversationId, assistantMessage);

  //     // Save conversation to Supabase (only when there are actual messages)
  //     try {
  //       const finalConversation = database.getConversation(conversationId);
        
  //       // Only save if there are user/assistant messages (not just system)
  //       const userMessages = filterUserMessages(finalConversation);
        
  //       if (userMessages.length > 0) {
  //         // ✅ KIỂM TRA XEM ĐÃ LƯU CHƯA ĐỂ TRÁNH LƯU TRÙNG LẶP
  //         const existingConversation = await supabaseService.getConversation(conversationId);
          
  //         // Chỉ lưu nếu chưa có hoặc có thay đổi
  //         if (!existingConversation || existingConversation.messages.length !== userMessages.length) {
  //           // Format messages for Supabase with timestamps
  //           const formattedMessages = finalConversation.map(msg => ({
  //             role: msg.role,
  //             content: msg.content,
  //             time: msg.time || new Date().toISOString()
  //           }));

  //           await supabaseService.saveConversation(
  //             conversationId,
  //             username,
  //             role,
  //             formattedMessages
  //           );
            
  //           logger.info(`Conversation saved to Supabase: ${conversationId}`);
  //         } else {
  //           logger.info(`Conversation already exists in Supabase: ${conversationId}, skipping save`);
  //         }
  //       }
  //     } catch (supabaseError) {
  //       logger.error('Failed to save conversation to Supabase:', supabaseError);
  //       // Continue with response even if Supabase save fails
  //     }

  //     const processingTime = Date.now() - startTime;
  //     return res.json(successResponse('Message processed successfully', {
  //       message: message,
  //       chatboxId: chatboxId,
  //       conversationId: conversationId,
  //       newSession: isNew,
  //       processingTime: processingTime
  //     }));

  //   } catch (error) {
  //     const processingTime = Date.now() - startTime;
  //     console.error('❌ AI Server Error:', error.message);
  //     console.error('📍 Error Stack:', error.stack);
  //     console.error('⏱️ Processing Time:', processingTime + 'ms');
  //     console.error('🆔 Chatbox ID:', req.params.chatboxId);
  //     const response = errorResponse('Lỗi Ai Server', {
  //       chatboxId: req.params.chatboxId,
  //       processingTime,
  //       error: true
  //     });
  //     return res.json(response);
  //   }
  // }

  async getRecommendations(req, res) {
    const startTime = Date.now();
    try {
      // Determine data source: prefer POST body (form submission), fallback to query params
      const source = req.method === 'POST' ? req.body : req.query;

      // Extract filter fields coming from the frontend form, fallback to sample payload
      const {
        keyword = SAMPLE_SEARCH_FILTERS.keyword,
        location = SAMPLE_SEARCH_FILTERS.location,
        skills = SAMPLE_SEARCH_FILTERS.skills,
        minSalary = SAMPLE_SEARCH_FILTERS.minSalary,
        maxSalary = SAMPLE_SEARCH_FILTERS.maxSalary,
        level = SAMPLE_SEARCH_FILTERS.level,
        page = SAMPLE_SEARCH_FILTERS.page,
        size = SAMPLE_SEARCH_FILTERS.size,
        sort = SAMPLE_SEARCH_FILTERS.sort,
        resumeData
      } = source || SAMPLE_SEARCH_FILTERS;

      // Get resume data from request body/form first, fallback to sample resume data
      let resumesInfo = resumeData || req.body?.resumeData || req.query?.resumeData || SAMPLE_RESUME_DATA;

      // If no resume data, return error
      if (!resumesInfo) {
        return res.status(400).json(validationErrorResponse('Resume data is required', ['resumeData is required']));
      }

      // Parse resume data if it's a string
      let parsedResumeData = resumesInfo;
      if (typeof resumesInfo === 'string') {
        try {
          parsedResumeData = JSON.parse(resumesInfo);
        } catch (e) {
          // If not JSON, use as string
          parsedResumeData = resumesInfo;
        }
      }

      // Convert resume data to string for processing
      const resumeDataString = typeof parsedResumeData === 'string' 
        ? parsedResumeData 
        : JSON.stringify(parsedResumeData);

      logger.info('Getting recommendations with filters:', {
        keyword,
        location,
        skills,
        minSalary,
        maxSalary,
        level,
        page,
        size
      });

      // Build search arguments with filters
      const searchArgs = {
        keyword: keyword || '',
        page: parseInt(page),
        size: parseInt(size),
        sort: sort || 'updatedAt,desc'
      };

      // Add optional filters
      if (location) {
        searchArgs.location = location;
      }
      if (skills) {
        searchArgs.skills = skills;
      }
      if (minSalary !== undefined && minSalary !== null) {
        searchArgs.minSalary = parseFloat(minSalary);
      }
      if (maxSalary !== undefined && maxSalary !== null) {
        searchArgs.maxSalary = parseFloat(maxSalary);
      }
      if (level) {
        searchArgs.level = level;
      }

      // Call search_job function with filters
      const searchResult = await call_function('search_job', searchArgs);
      const toolData = searchResult?.data?.data ?? searchResult?.data ?? searchResult;

      logger.info("Search result:", toolData);
      return res.json(successResponse('Recommendations retrieved successfully', toolData));

    //   // Get job list from search results
    //   const jobList = toolData?.result?.map(({ id, name }) => ({ id, name })) || [];

    //   logger.info("Job list:", jobList);

    //   // Process each job to calculate CV score
    //  for (const job of jobList) {       
    //     const result = await call_function('get_job_by_id', { id: job.id });
    //     const data = result?.data?.data;
    //     if (!data) continue;

    //     // Extract job information
    //     const jobInfo = {
    //         name: data.name,
    //         location: data.location,
    //         level: data.level,
    //         description: stripHtmlTags(data.description),
    //         companyName: data.company?.name || null,
    //         skills: data.skills?.map(skill => skill.name) || []
    //     };
    //     const jobInfoString = JSON.stringify(jobInfo, null, 0);

    //     logger.info(`Processing job ${job.id}:`, jobInfo.name);

    //     // Calculate CV score for this job
    //     try {
    //       const cvScoreResult = await getCVScoreChat(resumeDataString, jobInfoString);

    //       // Parse score result
    //     let score = null;
    //     try {
    //         const parsed = typeof cvScoreResult === 'string' ? JSON.parse(cvScoreResult) : cvScoreResult;
    //         score = parsed?.score ?? null;
    //     } catch (err) {
    //         logger.error(`Error parsing score for job ${job.id}:`, err);
    //       }

    //       job.score = score;
    //       job.jobInfo = jobInfo; // Store full job info for response
    //     } catch (scoreError) {
    //       logger.error(`Error calculating score for job ${job.id}:`, scoreError);
    //       job.score = null;
    //       job.jobInfo = jobInfo;
    //     }
    //   }

    //   // Format job results
    //   const formattedJobList = formatSearchJobResults(jobList);
      
    //   // Add score to each job
    //   const jobListWithScore = formattedJobList.map(formattedJob => {
    //     const originalJob = jobList.find(job => 
    //       (job.id ?? job.jobId) === formattedJob.id
    //     );
    //     return {
    //       ...formattedJob,
    //       score: originalJob?.score ?? null,
    //       jobInfo: originalJob?.jobInfo || null
    //     };
    //   });
      
    //   // Sort by score (descending) - jobs with higher scores first
    //   jobListWithScore.sort((a, b) => {
    //     const scoreA = a.score !== null && a.score !== undefined ? a.score : -1;
    //     const scoreB = b.score !== null && b.score !== undefined ? b.score : -1;
    //     return scoreB - scoreA;
    //   });

    //   logger.info('Final job list with scores:', jobListWithScore);

    //   const processingTime = Date.now() - startTime;

    //   // Return response in pagination format similar to Backend
    //   return res.json(successResponse('Recommendations retrieved successfully', {
    //     result: jobListWithScore,
    //     meta: {
    //       page: parseInt(page) || 1,
    //       pageSize: parseInt(size) || 5,
    //       total: jobListWithScore.length,
    //       pages: Math.ceil(jobListWithScore.length / (parseInt(size) || 5))
    //     },
    //     processingTime: processingTime
    //   }));

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ Recommendation Error:', error.message);
      logger.error('📍 Error Stack:', error.stack);
      logger.error('⏱️ Processing Time:', processingTime + 'ms');
      
      return res.status(500).json(errorResponse('Failed to get recommendations', 500, {
        error: error.message,
        processingTime: processingTime
      }));
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

module.exports = new recommendForPageController();


