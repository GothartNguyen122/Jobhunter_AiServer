// API Configuration for PDF Extractor Test UI

const API_CONFIG = {
    // AI Server URL
    BASE_URL: 'http://localhost:3001',
    
    // API Endpoints
    ENDPOINTS: {
        HEALTH: '/api/v1/health',
        PDF_EXTRACT: '/api/v1/pdf/extract',
        PDF_EXTRACT_MULTIPLE: '/api/v1/pdf/extract-multiple',
        CHATBOXES: '/api/v1/chatboxes',
        CHAT_MESSAGE: '/api/v1/chat'
    },
    
    // Request timeout (milliseconds)
    TIMEOUT: 30000,
    
    // File upload settings
    UPLOAD: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: ['application/pdf']
    }
};

// Helper function to get full API URL
function getApiUrl(endpoint) {
    return API_CONFIG.BASE_URL + endpoint;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, getApiUrl };
}
