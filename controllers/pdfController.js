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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = config.upload.allowedTypes;
    const mimetype = allowedTypes.includes(file.mimetype);

    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

class PDFController {
  constructor() {
    this.pdfExtractor = new PDFExtractor();
  }

  // Extract content from PDF
  async extractFromPdf(req, res) {
    try {
      if (!req.file) {
        logger.warn('No file uploaded for PDF extraction');
        return res.status(400).json(errorResponse('No file uploaded', 400));
      }

      // Validate uploaded file
      const validation = validateFileUpload(req.file);
      if (!validation.isValid) {
        logger.warn('Invalid file upload', validation.errors);
        return res.status(400).json(validationErrorResponse('Invalid file', validation.errors));
      }

      const { pageNumber = 0 } = req.body;
      const pdfPath = req.file.path;
      
      logger.pdfExtractionStart(pdfPath, pageNumber);

      // Extract content using PDF extractor
      const extractedData = await this.pdfExtractor.extractFromPdf(
        pdfPath, 
        parseInt(pageNumber)
      );

      logger.pdfExtractionSuccess(pdfPath, extractedData);

      // Clean up uploaded file
      try {
        await fs.unlink(pdfPath);
        logger.info(`Cleaned up file: ${pdfPath}`);
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
module.exports = {
  controller: new PDFController(),
  upload: upload.single('file')
};
