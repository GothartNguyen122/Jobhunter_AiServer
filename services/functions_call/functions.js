/**
 * OpenAI Function Definitions for Jobhunter Backend APIs
 * These functions define the structure for calling Jobhunter Backend APIs
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

