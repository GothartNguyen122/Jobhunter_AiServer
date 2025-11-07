const axios = require('axios');
const mysqlConnection = require('../config/mysql');
const { getCVScoreChat } = require('./functions_call/get_cv_score_chat');

// Base URL for Jobhunter Backend API
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8080/api/v1';

// JWT Token storage
let authToken = null;
let tokenExpiry = null;

/**
 * Get or refresh JWT token
 */
async function getAuthToken() {
  // Check if token is still valid
  if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
    return authToken;
  }

  // Try to get token from environment or use default credentials
  const username = process.env.BACKEND_USERNAME || 'admin@gmail.com';
  const password = process.env.BACKEND_PASSWORD || '123456';

  try {
    const response = await axios.post(`${BACKEND_BASE_URL}/auth/login`, {
      username: username,
      password: password
    });

    if (response.data && response.data.data && response.data.data.access_token) {
      authToken = response.data.data.access_token;
      // Set token expiry (assuming 24 hours, adjust as needed)
      tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
      console.log('✅ JWT token obtained successfully');
      return authToken;
    } else {
      throw new Error('No access_token in response');
    }
  } catch (error) {
    console.error('❌ Failed to get JWT token:');
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.message);
    console.error('Error response:', error.response?.data);
    return null;
  }
}

/**
 * Make HTTP request to Backend API with JWT authentication
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body data
 * @param {object} params - Query parameters
 * @param {object} headers - Request headers
 * @param {boolean} requireAuth - Whether this request requires authentication
 */
async function makeApiRequest(method, endpoint, data = null, params = null, headers = {}, requireAuth = true) {
  try {
    // Get auth token if required
    let authHeaders = {};
    if (requireAuth) {
      const token = await getAuthToken();
      if (token) {
        authHeaders = {
          'Authorization': `Bearer ${token}`
        };
      } else {
        return {
          success: false,
          error: 'Authentication failed - unable to get JWT token',
          status: 401
        };
      }
    }

    const config = {
      method,
      url: `${BACKEND_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    if (params) {
      config.params = params;
    }

    const response = await axios(config);
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    console.error(`API Request Error [${method} ${endpoint}]:`, error.message);
    
    // If 401 error, try to refresh token and retry once
    if (error.response?.status === 401 && requireAuth) {
      console.log('🔄 401 error detected, refreshing token and retrying...');
      authToken = null; // Clear invalid token
      tokenExpiry = null;
      
      // Retry with fresh token
      const token = await getAuthToken();
      if (token) {
        try {
          const retryConfig = {
            method,
            url: `${BACKEND_BASE_URL}${endpoint}`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              ...headers
            }
          };

          if (data) {
            retryConfig.data = data;
          }

          if (params) {
            retryConfig.params = params;
          }

          const retryResponse = await axios(retryConfig);
          return {
            success: true,
            data: retryResponse.data,
            status: retryResponse.status
          };
        } catch (retryError) {
          console.error(`Retry failed:`, retryError.message);
        }
      }
    }

    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Job Management Functions
 */
async function get_jobs(params = {}) {
  const { page = 0, size = 10, sort } = params;
  
  const queryParams = {
    page,
    size,
    ...(sort && { sort })
  };

  return await makeApiRequest('GET', '/jobs', null, queryParams, {}, true);
}

async function get_job_by_id(params) {
  const { id } = params;
  return await makeApiRequest('GET', `/jobs/${id}`, null, null, {}, true);
}

async function create_job(params) {
  return await makeApiRequest('POST', '/jobs', params, null, {}, true);
}

async function update_job(params) {
  const { id, ...updateData } = params;
  return await makeApiRequest('PUT', '/jobs', { id, ...updateData }, null, {}, true);
}

async function delete_job(params) {
  const { id } = params;
  return await makeApiRequest('DELETE', `/jobs/${id}`, null, null, {}, true);
}

/**
 * Get resumes of a specific job, including count
 * Matches backend API: GET /api/v1/jobs/resumes/{job_id}
 */
async function get_job_resumes(params) {
  const { id } = params; // job id
  return await makeApiRequest('GET', `/jobs/resumes/${id}`, null, null, {}, true);
}

/**
 * Search Jobs (user-search)
 * Matches backend API: /api/v1/jobs/user-search
 */
async function search_job(params = {}) {
  const {
    page = 1,
    size = 5,
    sort = 'updatedAt,desc',
    keyword = '',
    minSalary = 0,
    maxSalary = 100000000,
    location,
    skills,
    level
  } = params;

  // Hard limit size to 5 regardless of callergr input
  const limitedSize = 5;

  const queryParams = {
    page,
    size: limitedSize,
    sort,
    keyword,
    minSalary,
    maxSalary,
    ...(location ? { location } : {}),
    ...(skills ? { skills } : {}),
    ...(level ? { level } : {})
  };

  return await makeApiRequest('GET', '/jobs/user-search', null, queryParams, {}, true);
}

/**
 * Company Management Functions
 */
async function get_companies(params = {}) {
  const { page = 0, size = 10, sort, filter } = params;
  
  const queryParams = {
    page,
    size,
    ...(sort && { sort }),
    ...(filter && { filter })
  };

  return await makeApiRequest('GET', '/companies', null, queryParams, {}, true);
}

async function get_company_by_id(params) {
  const { id } = params;
  return await makeApiRequest('GET', `/companies/${id}`, null, null, {}, true);
}

async function create_company(params) {
  return await makeApiRequest('POST', '/companies', params, null, {}, true);
}

async function update_company(params) {
  const { id, ...updateData } = params;
  return await makeApiRequest('PUT', '/companies', { id, ...updateData }, null, {}, true);
}

async function delete_company(params) {
  const { id } = params;
  return await makeApiRequest('DELETE', `/companies/${id}`, null, null, {}, true);
}

/**
 * User Management Functions
 */
async function get_users(params = {}) {
  const { page = 0, size = 10, sort, filter } = params;
  
  const queryParams = {
    page,
    size,
    ...(sort && { sort }),
    ...(filter && { filter })
  };

  return await makeApiRequest('GET', '/users', null, queryParams, {}, true);
}

async function get_user_by_id(params) {
  const { id } = params;
  return await makeApiRequest('GET', `/users/${id}`, null, null, {}, true);
}

async function create_user(params) {
  return await makeApiRequest('POST', '/users', params, null, {}, true);
}

async function delete_user(params) {
  const { id } = params;
  return await makeApiRequest('DELETE', `/users/${id}`, null, null, {}, true);
}

/**
 * Authentication Functions
 */
async function login(params) {
  const { email, password } = params;
  return await makeApiRequest('POST', '/auth/login', { email, password }, null, {}, false);
}

async function register(params) {
  const { name, email, password } = params;
  return await makeApiRequest('POST', '/auth/register', { name, email, password }, null, {}, false);
}

/**
 * Resume Management Functions
 */
async function get_resumes(params = {}) {
  const { page = 0, size = 10, sort, filter } = params;
  
  const queryParams = {
    page,
    size,
    ...(sort && { sort }),
    ...(filter && { filter })
  };

  return await makeApiRequest('GET', '/resumes', null, queryParams, {}, true);
}

async function get_resume_by_id(params) {
  const { id } = params;
  return await makeApiRequest('GET', `/resumes/${id}`, null, null, {}, true);
}

async function create_resume(params) {
  return await makeApiRequest('POST', '/resumes', params, null, {}, true);
}

/**
 * Skill Management Functions
 */
async function get_skills(params = {}) {
  const { page = 0, size = 10, sort, filter } = params;
  
  const queryParams = {
    page,
    size,
    ...(sort && { sort }),
    ...(filter && { filter })
  };

  return await makeApiRequest('GET', '/skills', null, queryParams, {}, true);
}

async function get_skill_by_id(params) {
  const { id } = params;
  return await makeApiRequest('GET', `/skills/${id}`, null, null, {}, true);
}

async function create_skill(params) {
  return await makeApiRequest('POST', '/skills', params, null, {}, true);
}

/**
 * Role Management Functions
 */
async function get_roles(params = {}) {
  const { page = 0, size = 10, sort, filter } = params;
  
  const queryParams = {
    page,
    size,
    ...(sort && { sort }),
    ...(filter && { filter })
  };

  return await makeApiRequest('GET', '/roles', null, queryParams, {}, true);
}

async function get_role_by_id(params) {
  const { id } = params;
  return await makeApiRequest('GET', `/roles/${id}`, null, null, {}, true);
}

async function create_role(params) {
  return await makeApiRequest('POST', '/roles', params, null, {}, true);
}

/**
 * MySQL Database Functions
 */
async function query_database(sql, params = []) {
  try {
    const results = await mysqlConnection.query(sql, params);
    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Database query error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function get_jobs_from_db(params = {}) {
  const { page = 0, size = 10, companyId, location } = params;
  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const queryParams = [];

  if (companyId) {
    sql += ' AND company_id = ?';
    queryParams.push(companyId);
  }

  if (location) {
    sql += ' AND location LIKE ?';
    queryParams.push(`%${location}%`);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(size, page * size);

  return await query_database(sql, queryParams);
}

async function get_companies_from_db(params = {}) {
  const { page = 0, size = 10, name } = params;
  let sql = 'SELECT * FROM companies WHERE 1=1';
  const queryParams = [];

  if (name) {
    sql += ' AND name LIKE ?';
    queryParams.push(`%${name}%`);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(size, page * size);

  return await query_database(sql, queryParams);
}

async function get_users_from_db(params = {}) {
  const { page = 0, size = 10, email, name } = params;
  let sql = 'SELECT id, name, email, age, gender, address, created_at FROM users WHERE 1=1';
  const queryParams = [];

  if (email) {
    sql += ' AND email LIKE ?';
    queryParams.push(`%${email}%`);
  }

  if (name) {
    sql += ' AND name LIKE ?';
    queryParams.push(`%${name}%`);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(size, page * size);

  return await query_database(sql, queryParams);
}

/**
 * Ensure JWT authentication before making API calls
 */
async function ensureAuth() {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('JWT authentication failed - unable to get valid token');
    }
    return token;
  } catch (error) {
    console.error('❌ JWT authentication failed:', error.message);
    throw error;
  }
}

/**
 * Get CV Score Chat function
 * Calculate CV score against a job
 */
async function get_resumes_score_against_jobs(params) {
  const { extractedData, jobInfo } = params;
  
  if (!extractedData || typeof extractedData !== 'string') {
    return {
      success: false,
      error: 'Extracted data (string) is required'
    };
  }

  if (!jobInfo || typeof jobInfo !== 'string') {
    return {
      success: false,
      error: 'Job info (string) is required'
    };
  }

  try {
    const result = await getCVScoreChat(extractedData, jobInfo);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error in get_cv_score_chat:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test JWT authentication
 */
async function test_auth() {
  try {
    const token = await getAuthToken();
    if (token) {
      console.log('✅ JWT authentication test successful');
      return {
        success: true,
        message: 'Authentication successful',
        token: token.substring(0, 20) + '...' // Show only first 20 chars
      };
    } else {
      return {
        success: false,
        error: 'Failed to get JWT token'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function dispatcher
 * @param {string} functionName - Name of the function to call
 * @param {object} arguments - Function arguments
 */
async function call_function(functionName, arguments) {
  console.log(`🔧 Calling function: ${functionName} with args:`, arguments);

  try {
    // Ensure JWT authentication for all backend API calls (except auth functions and CV score chat)
    const requiresAuth = !['login', 'register', 'test_auth', 'get_cv_score_chat'].includes(functionName);
    
    if (requiresAuth) {
      console.log(`🔐 Ensuring JWT authentication for function: ${functionName}`);
      await ensureAuth();
    }

    switch (functionName) {
      // Job functions
      case 'get_jobs':
        return await get_jobs(arguments);
      case 'get_job_by_id':
        return await get_job_by_id(arguments);
      case 'search_job':
        return await search_job(arguments);
      case 'create_job':
        return await create_job(arguments);
      case 'update_job':
        return await update_job(arguments);
      case 'delete_job':
        return await delete_job(arguments);
      case 'get_job_resumes':
        return await get_job_resumes(arguments);

      // Company functions
      case 'get_companies':
        return await get_companies(arguments);
      case 'get_company_by_id':
        return await get_company_by_id(arguments);
      case 'create_company':
        return await create_company(arguments);
      case 'update_company':
        return await update_company(arguments);
      case 'delete_company':
        return await delete_company(arguments);

      // User functions
      case 'get_users':
        return await get_users(arguments);
      case 'get_user_by_id':
        return await get_user_by_id(arguments);
      case 'create_user':
        return await create_user(arguments);
      case 'delete_user':
        return await delete_user(arguments);

      // Auth functions
      case 'login':
        return await login(arguments);
      case 'register':
        return await register(arguments);

      // Resume functions
      case 'get_resumes':
        return await get_resumes(arguments);
      case 'get_resume_by_id':
        return await get_resume_by_id(arguments);
      case 'create_resume':
        return await create_resume(arguments);

      // Skill functions
      case 'get_skills':
        return await get_skills(arguments);
      case 'get_skill_by_id':
        return await get_skill_by_id(arguments);
      case 'create_skill':
        return await create_skill(arguments);

      // Role functions
      case 'get_roles':
        return await get_roles(arguments);
      case 'get_role_by_id':
        return await get_role_by_id(arguments);
      case 'create_role':
        return await create_role(arguments);

      // Database functions
      case 'query_database':
        return await query_database(arguments.sql, arguments.params);
      case 'get_jobs_from_db':
        return await get_jobs_from_db(arguments);
      case 'get_companies_from_db':
        return await get_companies_from_db(arguments);
      case 'get_users_from_db':
        return await get_users_from_db(arguments);

      // CV Score functions
      case 'get_cv_score_chat':
        return await get_cv_score_chat(arguments);

      // Test functions
      case 'test_auth':
        return await test_auth();

      default:
        return {
          success: false,
          error: `Function '${functionName}' not implemented`
        };
    }
  } catch (error) {
    console.error(`Error executing function ${functionName}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  call_function,
  // Export individual functions for direct use
  get_jobs,
  get_job_by_id,
  search_job,
  create_job,
  update_job,
  delete_job,
  get_job_resumes,
  get_companies,
  get_company_by_id,
  create_company,
  update_company,
  delete_company,
  get_users,
  get_user_by_id,
  create_user,
  delete_user,
  login,
  register,
  get_resumes,
  get_resume_by_id,
  create_resume,
  get_skills,
  get_skill_by_id,
  create_skill,
  get_roles,
  get_role_by_id,
  create_role,
  query_database,
  get_jobs_from_db,
  get_companies_from_db,
  get_users_from_db,
  get_resumes_score_against_jobs,
};

