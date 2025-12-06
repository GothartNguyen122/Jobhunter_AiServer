/**
 * OpenAI Function Definitions for Jobhunter Backend APIs
 * These functions define the structure for calling Jobhunter Backend APIs
 * 
 * NOTE: These functions are for CANDIDATE/CLIENT use only.
 * HR functions are in ./hr/hrFunctions.js and should NOT be merged here.
 */

const functions = [
  // Job Management Functions
  {
    "type": "function",
    "function": {
      "name": "get_jobs",
      "description": "Get all jobs with pagination and filtering",
      "parameters": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "description": "Page number for pagination"
          },
          "size": {
            "type": "integer", 
            "description": "Number of items per page"
          },
          "sort": {
            "type": "string",
            "description": "Sort field and direction (e.g., 'name,asc')"
          },
          "filter": {
            "type": "string",
            "description": "Filter criteria for jobs"
          }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_job_resumes",
      "description": "Get resumes for a specific job, returns count and resumes[]",
      "parameters": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "Job ID"
          }
        },
        "required": ["id"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_job_by_id",
      "description": "Get a specific job by ID",
      "parameters": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "Job ID"
          }
        },
        "required": ["id"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "search_job",
      "description": "Search and filter jobs by keyword, location, skills, salary range, level, company name, and categories with pagination",
      "parameters": {
        "type": "object",
        "properties": {
          "keyword": {
            "type": "string",
            "description": "Search text for job name (case-insensitive)",
            "default": ""
          },
          "location": {
            "type": "string",
            "description": "Comma-separated list of locations to include"
          },
          "skills": {
            "type": "string",
            "description": "Comma-separated list of skill names to include"
          },
          "minSalary": {
            "type": "number",
            "description": "Minimum salary filter (inclusive)",
            "default": 0
          },
          "maxSalary": {
            "type": "number",
            "description": "Maximum salary filter (inclusive)",
            "default": 100000000
          },
          "level": {
            "type": "string",
            "description": "Comma-separated list of levels (must match LevelEnum names)"
          },
          "companyName": {
            "type": "string",
            "description": "Company name to filter jobs"
          },
          "categories": {
            "type": "string",
            "description": "Comma-separated list of categories to filter jobs"
          },
          "page": {
            "type": "integer",
            "description": "Page number for pagination (1-based by default)",
            "default": 1
          },
          "size": {
            "type": "integer",
            "description": "Number of items per page",
            "default": 10
          },
          "pageIsZeroBased": {
            "type": "boolean",
            "description": "Set true if the provided page number is already zero-based",
            "default": false
          },
          "sort": {
            "type": "string",
            "description": "Sort field and direction, e.g. 'name,asc'",
            "default": "updatedAt,desc"
          }
        }
      }
    }
  },
  
  // Company Management Functions
  {
    "type": "function",
    "function": {
      "name": "get_companies",
      "description": "Get all companies with pagination and filtering",
      "parameters": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "description": "Page number for pagination"
          },
          "size": {
            "type": "integer",
            "description": "Number of items per page"
          },
          "sort": {
            "type": "string",
            "description": "Sort field and direction"
          },
          "filter": {
            "type": "string",
            "description": "Filter criteria for companies"
          }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_company_by_id",
      "description": "Get a specific company by ID",
      "parameters": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "Company ID"
          }
        },
        "required": ["id"]
      }
    }
  },
 
  // User Management Functions
  {
    "type": "function",
    "function": {
      "name": "get_users",
      "description": "Get all users with pagination and filtering",
      "parameters": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "description": "Page number for pagination"
          },
          "size": {
            "type": "integer",
            "description": "Number of items per page"
          },
          "sort": {
            "type": "string",
            "description": "Sort field and direction"
          },
          "filter": {
            "type": "string",
            "description": "Filter criteria for users"
          }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_user_by_id",
      "description": "Get a specific user by ID",
      "parameters": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "User ID"
          }
        },
        "required": ["id"]
      }
    }
  },
  // Resume Management Functions
  {
    "type": "function",
    "function": {
      "name": "get_resumes",
      "description": "Get all resumes with pagination and filtering",
      "parameters": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "description": "Page number for pagination"
          },
          "size": {
            "type": "integer",
            "description": "Number of items per page"
          },
          "sort": {
            "type": "string",
            "description": "Sort field and direction"
          },
          "filter": {
            "type": "string",
            "description": "Filter criteria for resumes"
          }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_resume_by_id",
      "description": "Get a specific resume by ID",
      "parameters": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "Resume ID"
          }
        },
        "required": ["id"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "create_resume",
      "description": "Create a new resume",
      "parameters": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "description": "Resume file URL"
          },
          "status": {
            "type": "string",
            "description": "Resume status"
          },
          "userId": {
            "type": "integer",
            "description": "User ID who owns the resume"
          }
        },
        "required": ["url", "userId"]
      }
    }
  },

  // Skill Management Functions
  {
    "type": "function",
    "function": {
      "name": "get_skills",
      "description": "Get all skills with pagination and filtering",
      "parameters": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "description": "Page number for pagination"
          },
          "size": {
            "type": "integer",
            "description": "Number of items per page"
          },
          "sort": {
            "type": "string",
            "description": "Sort field and direction"
          },
          "filter": {
            "type": "string",
            "description": "Filter criteria for skills"
          }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_skill_by_id",
      "description": "Get a specific skill by ID",
      "parameters": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "Skill ID"
          }
        },
        "required": ["id"]
      }
    }
  },
 
  // Role Management Functions
  {
    "type": "function",
    "function": {
      "name": "get_roles",
      "description": "Get all roles with pagination and filtering",
      "parameters": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "description": "Page number for pagination"
          },
          "size": {
            "type": "integer",
            "description": "Number of items per page"
          },
          "sort": {
            "type": "string",
            "description": "Sort field and direction"
          },
          "filter": {
            "type": "string",
            "description": "Filter criteria for roles"
          }
        }
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_role_by_id",
      "description": "Get a specific role by ID",
      "parameters": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "Role ID"
          }
        },
        "required": ["id"]
      }
    }
  },
];

module.exports = functions;

