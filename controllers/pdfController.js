const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const PDFExtractor = require('../services/pdf_extractor');
const config = require('../config');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/response');
const { validateFileUpload } = require('../utils/validation');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    // Create uploads directory if it doesn't exist
    fs.mkdir(uploadDir, { recursive: true }).then(() => {
      cb(null, uploadDir);
    }).catch(err => {
      cb(err);
    });
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

console.log('=== MULTER CONFIG DEBUG ===');
console.log('Config upload:', config.upload);
console.log('Max file size:', config.upload.maxFileSize);
console.log('Allowed types:', config.upload.allowedTypes);

// Simple multer config for testing
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage for testing
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter called for:', file.originalname, file.mimetype);
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain' // Allow text files for testing
    ];
    const mimetype = allowedTypes.includes(file.mimetype);
    console.log('Allowed types:', allowedTypes);
    console.log('File mimetype:', file.mimetype);
    console.log('Is allowed:', mimetype);

    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

class PDFController {
  constructor() {
    console.log('=== PDF CONTROLLER CONSTRUCTOR START ===');
    try {
      console.log('🔄 Initializing PDFExtractor...');
      this.pdfExtractor = new PDFExtractor();
      console.log('✅ PDFExtractor initialized successfully');
      console.log('📋 PDFExtractor instance:', typeof this.pdfExtractor);
    } catch (error) {
      console.error('❌ Failed to initialize PDFExtractor:', error);
      console.error('❌ Error details:', error.message);
      this.pdfExtractor = null;
    }
    console.log('=== PDF CONTROLLER CONSTRUCTOR END ===');
  }

  // Extract content from PDF
  async extractFromPdf(req, res) {
    try {
      console.log('=== PDF CONTROLLER START ===');
      console.log('📁 File received in Controller:', req.file ? req.file.originalname : 'No file');
      console.log('📊 Request body:', req.body);
      console.log('📄 Request file details:', req.file);
      console.log('🔍 PDF Extractor status:', this.pdfExtractor ? 'Available' : 'Not available');
      console.log('🔍 PDF Extractor type:', typeof this.pdfExtractor);
      console.log('🔍 This context:', this);
      console.log('🔍 This pdfExtractor:', this.pdfExtractor);
      
      if (!req.file) {
        console.log('❌ No file uploaded to Controller');
        logger.warn('No file uploaded for PDF extraction');
        return res.status(400).json(errorResponse('No file uploaded', 400));
      }

      console.log('✅ File details in Controller:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      // Validate uploaded file
      const validation = validateFileUpload(req.file);
      console.log('Validation result:', validation);
      if (!validation.isValid) {
        console.log('Validation failed:', validation.errors);
        logger.warn('Invalid file upload', validation.errors);
        return res.status(400).json(validationErrorResponse('Invalid file', validation.errors));
      }

      const { pageNumber = 0 } = req.body;
      const filePath = req.file.path;
      const fileType = req.file.mimetype;
      
      logger.pdfExtractionStart(filePath, pageNumber);

      let extractedData;
      
      // Handle different file types
      if (fileType === 'application/pdf') {
        console.log('🔍 Processing PDF file in Controller');
        
        // Check if PDFExtractor is available
        if (!this.pdfExtractor || this.pdfExtractor === null) {
          console.log('❌ PDFExtractor not available, using fallback');
          extractedData = {
            type: 'pdf_fallback',
            message: 'PDF file detected but PDFExtractor not available. Ghostscript may not be installed.',
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimetype: fileType,
            error: 'PDFExtractor not initialized'
          };
        } else {
          try {
            console.log('🚀 Calling PDF Extractor from Controller...');
            console.log('📂 File path:', filePath);
            console.log('📄 Page number:', parseInt(pageNumber));
            
            // Extract content from PDF using PDF extractor
            // Nếu dùng memoryStorage, req.file.buffer có dữ liệu PDF
            const tempPath = path.join(__dirname, `../uploads/${Date.now()}_${req.file.originalname}`);
            await fs.writeFile(tempPath, req.file.buffer);

            extractedData = await this.pdfExtractor.extractFromPdf(
              tempPath, 
              parseInt(pageNumber)
            );

            // Sau khi xong, xóa file tạm
            await fs.unlink(tempPath);

        
            console.log('✅ PDF Extractor completed successfully');
            console.log('📋 Extracted data from PDF Extractor:', JSON.stringify(extractedData, null, 2));
          } catch (pdfError) {
            console.error('❌ PDF extraction error in Controller:', pdfError);
            // Fallback: return basic file info if PDF extraction fails
            extractedData = {
              type: 'pdf_fallback',
              message: 'PDF file detected but extraction failed. Ghostscript may not be installed.',
              fileName: req.file.originalname,
              fileSize: req.file.size,
              mimetype: fileType,
              error: pdfError.message
            };
          }
        }
      } else if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For Word documents, return a simple message for now
        // TODO: Implement Word document extraction
        extractedData = {
          type: 'word_document',
          message: 'Word document detected. PDF extraction only supported for now.',
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimetype: fileType
        };
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      logger.pdfExtractionSuccess(filePath, extractedData);

      // DEBUG: Log extracted content to console
      console.log('=== CV EXTRACTION DEBUG ===');
      console.log('File:', req.file.originalname);
      console.log('Size:', req.file.size, 'bytes');
      console.log('MIME Type:', req.file.mimetype);
      console.log('Page Number:', parseInt(pageNumber));
      console.log('Extracted Content:');
      console.log(JSON.stringify(extractedData, null, 2));
      console.log('=== END CV EXTRACTION DEBUG ===');

      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
        logger.info(`Cleaned up file: ${filePath}`);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup file:', cleanupError.message);
      }

      res.json(successResponse('PDF content extracted successfully', {
        extractedData,
        fileInfo: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          pageNumber: parseInt(pageNumber)
        }
      }));

    } catch (error) {
      console.error('=== PDF EXTRACT ERROR ===');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      console.error('=== END PDF EXTRACT ERROR ===');
      
      logger.pdfExtractionError(req.file?.path || 'unknown', error);
      
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup file on error:', cleanupError.message);
        }
      }

      res.status(500).json(errorResponse('PDF extraction failed', 500, {
        error: error.message
      }));
    }
  }

  // Extract content from multiple pages
  async extractMultiplePages(req, res) {
    try {
      if (!req.file) {
        logger.warn('No file uploaded for multi-page PDF extraction');
        return res.status(400).json(errorResponse('No file uploaded', 400));
      }

      // Validate uploaded file
      const validation = validateFileUpload(req.file);
      if (!validation.isValid) {
        logger.warn('Invalid file upload for multi-page extraction', validation.errors);
        return res.status(400).json(validationErrorResponse('Invalid file', validation.errors));
      }

      const { maxPages = 3 } = req.body;
      const pdfPath = req.file.path;
      
      logger.pdfExtractionStart(pdfPath, 'multiple');

      // Extract content from multiple pages
      const extractedData = await this.pdfExtractor.extractMultiplePages(
        pdfPath, 
        parseInt(maxPages)
      );

      logger.pdfExtractionSuccess(pdfPath, extractedData);

      // Clean up uploaded file
      try {
        await fs.unlink(pdfPath);
        logger.info(`Cleaned up file: ${pdfPath}`);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup file:', cleanupError.message);
      }

      res.json(successResponse('PDF content extracted successfully from multiple pages', {
        extractedData,
        fileInfo: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          maxPages: parseInt(maxPages)
        }
      }));

    } catch (error) {
      logger.pdfExtractionError(req.file?.path || 'unknown', error);
      
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup file on error:', cleanupError.message);
        }
      }

      res.status(500).json(errorResponse('Multi-page PDF extraction failed', 500, {
        error: error.message
      }));
    }
  }

  // Get PDF extractor configuration
  async getConfig(req, res) {
    try {
      const config = {
        allowedFileTypes: config.upload.allowedTypes,
        maxFileSize: config.upload.maxFileSize,
        supportedFormats: ['PDF', 'PNG', 'JPG', 'JPEG', 'GIF', 'BMP', 'WEBP'],
        maxPages: 10
      };

      res.json(successResponse('PDF extractor configuration retrieved successfully', config));
    } catch (error) {
      logger.error('Error getting PDF extractor configuration', error);
      res.status(500).json(errorResponse('Failed to retrieve configuration', 500));
    }
  }
}

// Export both controller and multer middleware
console.log('=== CREATING PDF CONTROLLER INSTANCE ===');
const pdfControllerInstance = new PDFController();
console.log('=== PDF CONTROLLER INSTANCE CREATED ===');
console.log('PDF Controller instance:', typeof pdfControllerInstance);
console.log('PDF Extractor in instance:', typeof pdfControllerInstance.pdfExtractor);

module.exports = {
  controller: pdfControllerInstance,
  upload: upload.single('file')
};
