/**
 * Standard response utility functions
 */

const createResponse = (success, message, data = null, statusCode = 200) => {
  const response = {
    success,
    message,
    statusCode,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  return response;
};

const successResponse = (message, data = null, statusCode = 200) => {
  return createResponse(true, message, data, statusCode);
};

const errorResponse = (message, statusCode = 500, data = null) => {
  return createResponse(false, message, data, statusCode);
};

const validationErrorResponse = (message, errors = null) => {
  return createResponse(false, message, errors, 400);
};

const notFoundResponse = (message = 'Resource not found') => {
  return createResponse(false, message, null, 404);
};

const unauthorizedResponse = (message = 'Unauthorized access') => {
  return createResponse(false, message, null, 401);
};

const forbiddenResponse = (message = 'Forbidden access') => {
  return createResponse(false, message, null, 403);
};

const conflictResponse = (message = 'Resource conflict') => {
  return createResponse(false, message, null, 409);
};

const tooManyRequestsResponse = (message = 'Too many requests') => {
  return createResponse(false, message, null, 429);
};

module.exports = {
  createResponse,
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  tooManyRequestsResponse
};
