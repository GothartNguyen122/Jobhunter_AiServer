/**
 * HR Function Definitions for OpenAI Function Calling
 * These functions are specific to HR operations and resume analysis
 */

const hrFunctions = [
  // HR Resume Analysis Functions
  {
    "type": "function",
    "function": {
      "name": "get_resume_info_supabase",
      "description": "Get resume analysis data from Supabase for a specific user and job pair.Both userId and jobId are required fields and must be obtained from the result of get_user_job_pairs().",
      "parameters": {
        "type": "object",
        "properties": {
          "userId": {
            "type": "string",
            "description": "User ID (can be string or number)"
          },
          "jobId": {
            "type": "string",
            "description": "Job ID (can be string or number)"
          }
        },
        "required": ["userId", "jobId"]
      }
    }
  },
  // HR User-Job Pairs Functions
  {
    "type": "function",
    "function": {
      "name": "get_user_job_pairs",
      "description": "Get list of all available user-job pairs from Backend API.Strictly use this before calling get_resume_info_supabase().",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  },
  // HR Resumes Functions
  {
    "type": "function",
    "function": {
      "name": "get_hr_resumes",
      "description": "Get list of resumes for a specific HR user from Backend API. Returns all resumes from jobs managed by the HR user_id.",
      "parameters": {
        "type": "object",
        "properties": {
          "hrId": {
            "type": "string",
            "description": "HR user ID (can be string or number)"
          },
          "page": {
            "type": "integer",
            "description": "Page number for pagination (default: 1)",
            "default": 1
          },
          "size": {
            "type": "integer",
            "description": "Number of items per page (default: 10)",
            "default": 100
          }
        },
        "required": ["hrId"]
      }
    }
  },
];

module.exports = hrFunctions;

