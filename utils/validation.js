/**
 * Validation utility functions
 */

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const validateChatboxData = (data) => {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }

  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  }

  if (data.systemPrompt && typeof data.systemPrompt !== 'string') {
    errors.push('System prompt must be a string');
  }

  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
    errors.push('Enabled must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateMessageData = (data) => {
  const errors = [];

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    errors.push('Message is required and must be a non-empty string');
  }

  if (data.message && data.message.length > 10000) {
    errors.push('Message must be less than 1000 characters');
  }

  if (data.user && typeof data.user !== 'object') {
    errors.push('User must be an object');
  }

  if (data.user && data.user.name && typeof data.user.name !== 'string') {
    errors.push('User name must be a string');
  }

  if (data.user && data.user.role && typeof data.user.role !== 'string') {
    errors.push('User role must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateFileUpload = (file) => {
  const errors = [];
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/bmp',
    'image/webp'
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  if (file.size > maxSize) {
    errors.push(`File size ${file.size} bytes exceeds maximum allowed size of ${maxSize} bytes`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Filter conversation messages to ensure valid content for OpenAI API
 * @param {Array} messages - Array of conversation messages
 * @returns {Array} Filtered messages with valid content
 */
const filterValidMessages = (messages) => {
  return messages.filter(msg => {
    if (!msg || !msg.role) return false;
  
    // System và user messages phải có content dạng string
    if (msg.role === 'system' || msg.role === 'user') {
      return msg.content && typeof msg.content === 'string' && msg.content.trim() !== '';
    }
  
    // Assistant messages: chỉ chấp nhận nếu có content là string KHÔNG null
    // hoặc có tool_calls hợp lệ (và khi đó phải bỏ content null)
    if (msg.role === 'assistant') {
      if (msg.tool_calls && !msg.content) {
        msg.content = ''; // 🔧 đảm bảo luôn là string
      }
      return typeof msg.content === 'string';
    }
  
    // Tool messages phải có string content
    if (msg.role === 'tool') {
      return msg.content && typeof msg.content === 'string' && msg.content.trim() !== '';
    }
  
    return false;
  });
};

/**
 * Filter conversation messages for frontend display (remove system and tool messages)
 * @param {Array} messages - Array of conversation messages
 * @returns {Array} Filtered messages for user display
 */
const filterUserMessages = (messages) => {
  return messages.filter(msg => {
    if (!msg || !msg.role) return false;
    
    // Chỉ giữ lại user và assistant messages
    return msg.role === 'user' || msg.role === 'assistant';
  });
};

module.exports = {
  validateEmail,
  validatePhoneNumber,
  validateUrl,
  validateChatboxData,
  validateMessageData,
  validateFileUpload,
  sanitizeString,
  sanitizeObject,
  filterValidMessages,
  filterUserMessages
};
