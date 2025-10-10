// PDF Extractor Test UI JavaScript

let selectedFile = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

// Initialize all event listeners
function initializeEventListeners() {
    // File input change handler
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
    // Extract button click handler
    document.getElementById('extractBtn').addEventListener('click', extractPDF);
    
    // Copy button click handler
    document.querySelector('.copy-btn').addEventListener('click', copyToClipboard);
    
    // Drag and drop functionality
    setupDragAndDrop();
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        showFileInfo(file);
        document.getElementById('extractBtn').style.display = 'inline-block';
    }
}

// Show file information
function showFileInfo(file) {
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').style.display = 'block';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Extract PDF data
async function extractPDF() {
    if (!selectedFile) {
        showStatus('Please select a PDF file first', 'error');
        return;
    }

    // Show loading
    showLoading(true);
    hideResult();
    hideStatus();

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.PDF_EXTRACT), {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        // Hide loading
        showLoading(false);

        if (result.success) {
            showStatus('Data extracted successfully!', 'success');
            displayResult(result.data);
        } else {
            showStatus(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        showLoading(false);
        showStatus(`Network error: ${error.message}`, 'error');
        console.error('Extraction error:', error);
    }
}

// Show/hide loading spinner
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// Hide result section
function hideResult() {
    document.getElementById('resultSection').style.display = 'none';
}

// Hide status message
function hideStatus() {
    document.getElementById('status').classList.remove('show');
}

// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type} show`;
}

// Display extracted data
function displayResult(data) {
    const jsonDisplay = document.getElementById('jsonDisplay');
    jsonDisplay.textContent = JSON.stringify(data, null, 2);
    document.getElementById('resultSection').style.display = 'block';
}

// Copy to clipboard
async function copyToClipboard() {
    const jsonText = document.getElementById('jsonDisplay').textContent;
    try {
        await navigator.clipboard.writeText(jsonText);
        showStatus('JSON copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = jsonText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showStatus('JSON copied to clipboard!', 'success');
    }
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    const uploadArea = document.querySelector('.upload-area');
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.background = '#f0f8ff';
        uploadArea.style.borderColor = '#4facfe';
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.background = '';
        uploadArea.style.borderColor = '#dee2e6';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.background = '';
        uploadArea.style.borderColor = '#dee2e6';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                selectedFile = file;
                showFileInfo(file);
                document.getElementById('extractBtn').style.display = 'inline-block';
                showStatus('PDF file selected successfully!', 'success');
            } else {
                showStatus('Please select a PDF file', 'error');
            }
        }
    });
}

// Utility function to validate PDF file
function validatePDFFile(file) {
    const allowedTypes = ['application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, message: 'Please select a PDF file' };
    }
    
    if (file.size > maxSize) {
        return { valid: false, message: 'File size must be less than 10MB' };
    }
    
    return { valid: true };
}

// Enhanced file selection with validation
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const validation = validatePDFFile(file);
        if (validation.valid) {
            selectedFile = file;
            showFileInfo(file);
            document.getElementById('extractBtn').style.display = 'inline-block';
            showStatus('PDF file selected successfully!', 'success');
        } else {
            showStatus(validation.message, 'error');
            selectedFile = null;
            document.getElementById('extractBtn').style.display = 'none';
        }
    }
}
