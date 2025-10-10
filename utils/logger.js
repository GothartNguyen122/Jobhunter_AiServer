/**
 * Logging utility
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message}\n${JSON.stringify(data, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  info(message, data = null) {
    const formattedMessage = this.formatMessage('info', message, data);
    console.log(this.isDevelopment ? `${colors.blue}${formattedMessage}${colors.reset}` : formattedMessage);
  }

  success(message, data = null) {
    const formattedMessage = this.formatMessage('success', message, data);
    console.log(this.isDevelopment ? `${colors.green}${formattedMessage}${colors.reset}` : formattedMessage);
  }

  warn(message, data = null) {
    const formattedMessage = this.formatMessage('warn', message, data);
    console.log(this.isDevelopment ? `${colors.yellow}${formattedMessage}${colors.reset}` : formattedMessage);
  }

  error(message, data = null) {
    const formattedMessage = this.formatMessage('error', message, data);
    console.error(this.isDevelopment ? `${colors.red}${formattedMessage}${colors.reset}` : formattedMessage);
  }

  debug(message, data = null) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('debug', message, data);
      console.log(`${colors.magenta}${formattedMessage}${colors.reset}`);
    }
  }

  // API specific logging
  apiRequest(method, url, body = null) {
    this.info(`API Request: ${method} ${url}`, body);
  }

  apiResponse(method, url, statusCode, response = null) {
    const level = statusCode >= 400 ? 'error' : 'success';
    const message = `API Response: ${method} ${url} - ${statusCode}`;
    
    if (level === 'error') {
      this.error(message, response);
    } else {
      this.success(message, response);
    }
  }

  // Chatbox specific logging
  chatboxRequest(chatboxId, message, user = null) {
    const userInfo = user ? `User(${user.name}${user.role ? '|' + user.role : ''})` : 'Anonymous';
    this.info(`[Chatbox: ${chatboxId}] Request from ${userInfo}: ${message}`);
  }

  chatboxResponse(chatboxId, response, processingTime = null) {
    const timeInfo = processingTime ? ` (${processingTime}ms)` : '';
    this.success(`[Chatbox: ${chatboxId}] Response sent${timeInfo}`, response);
  }

  chatboxError(chatboxId, error) {
    this.error(`[Chatbox: ${chatboxId}] Error: ${error.message}`, error);
  }

  // PDF Extractor specific logging
  pdfExtractionStart(pdfPath, pageNumber = 0) {
    this.info(`[PDF Extractor] Starting extraction: ${pdfPath} (page ${pageNumber})`);
  }

  pdfExtractionSuccess(pdfPath, extractedData) {
    this.success(`[PDF Extractor] Extraction completed: ${pdfPath}`, extractedData);
  }

  pdfExtractionError(pdfPath, error) {
    this.error(`[PDF Extractor] Extraction failed: ${pdfPath}`, error);
  }
}

module.exports = new Logger();
