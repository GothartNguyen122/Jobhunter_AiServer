const express = require('express');
const router = express.Router();
const { controller: pdfController, upload } = require('../controllers/pdfController');

/**
 * @swagger
 * tags:
 *   - name: PDF
 *     description: PDF extraction and processing endpoints
 */

/**
 * @swagger
 * /api/v1/pdf/extract:
 *   post:
 *     summary: Extract content from PDF
 *     description: Extract structured data from PDF file (CV/Resume) using AI
 *     tags: [PDF]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to extract
 *               pageNumber:
 *                 type: integer
 *                 default: 0
 *                 description: Page number to extract (0-indexed)
 *     responses:
 *       200:
 *         description: PDF content extracted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     extractedData:
 *                       type: object
 *                     fileInfo:
 *                       type: object
 */
router.post('/extract', upload, (req, res) => {
  pdfController.extractFromPdf.call(pdfController, req, res);
});

// Test extract endpoint without upload
router.post('/test-extract', (req, res) => {
  try {
    console.log('Test extract endpoint called');
    res.json({ 
      success: true, 
      message: 'Test extract working',
      extractedData: {
        type: 'test',
        message: 'This is a test response',
        fileName: 'test.txt',
        fileSize: 100,
        mimetype: 'text/plain'
      }
    });
  } catch (error) {
    console.error('Test extract error:', error);
    res.status(500).json({ success: false, message: 'Test extract failed', error: error.message });
  }
});

// Test controller method
router.get('/test-controller', (req, res) => {
  try {
    console.log('Testing PDF Controller...');
    console.log('PDF Controller type:', typeof pdfController);
    console.log('PDF Extractor in controller:', pdfController.pdfExtractor ? 'Available' : 'Not available');
    console.log('PDF Extractor type:', typeof pdfController.pdfExtractor);
    
    res.json({ 
      success: true, 
      message: 'Controller test successful',
      controllerType: typeof pdfController,
      extractorAvailable: !!pdfController.pdfExtractor,
      extractorType: typeof pdfController.pdfExtractor
    });
  } catch (error) {
    console.error('Controller test error:', error);
    res.status(500).json({ success: false, message: 'Controller test failed', error: error.message });
  }
});

// Test extractFromPdf method directly
router.post('/test-method', (req, res) => {
  try {
    console.log('Testing extractFromPdf method...');
    console.log('PDF Controller:', pdfController);
    console.log('PDF Extractor in controller:', pdfController.pdfExtractor);
    
    // Create a mock request object
    const mockReq = {
      file: {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 100,
        path: './test_cv.txt'
      },
      body: { pageNumber: 0 }
    };
    
    // Create a mock response object
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log('Mock response:', data);
          res.json({ success: true, message: 'Method test completed', mockResponse: data });
        }
      }),
      json: (data) => {
        console.log('Mock response:', data);
        res.json({ success: true, message: 'Method test completed', mockResponse: data });
      }
    };
    
    // Call the method with proper binding
    pdfController.extractFromPdf.call(pdfController, mockReq, mockRes);
    
  } catch (error) {
    console.error('Method test error:', error);
    res.status(500).json({ success: false, message: 'Method test failed', error: error.message });
  }
});

// Test upload middleware
router.post('/test-upload', upload, (req, res) => {
  try {
    console.log('Test upload middleware called');
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);
    
    res.json({ 
      success: true, 
      message: 'Upload middleware test successful',
      file: req.file,
      body: req.body
    });
  } catch (error) {
    console.error('Upload middleware test error:', error);
    res.status(500).json({ success: false, message: 'Upload middleware test failed', error: error.message });
  }
});

// Test simple endpoint without multer
router.post('/test-simple', (req, res) => {
  try {
    console.log('Test simple endpoint called');
    res.json({ 
      success: true, 
      message: 'Simple endpoint test successful'
    });
  } catch (error) {
    console.error('Simple endpoint test error:', error);
    res.status(500).json({ success: false, message: 'Simple endpoint test failed', error: error.message });
  }
});

// Extract content from PDF (single page)
router.post('/extract', upload, (req, res) => {
  pdfController.extractFromPdf.call(pdfController, req, res);
});

/**
 * @swagger
 * /api/v1/pdf/extract-multiple:
 *   post:
 *     summary: Extract content from multiple PDF pages
 *     description: Extract content from multiple pages of a PDF file
 *     tags: [PDF]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               maxPages:
 *                 type: integer
 *                 default: 3
 *     responses:
 *       200:
 *         description: PDF content extracted successfully
 */
router.post('/extract-multiple', upload, pdfController.extractMultiplePages);

/**
 * @swagger
 * /api/v1/pdf/config:
 *   get:
 *     summary: Get PDF extractor configuration
 *     description: Get configuration for PDF extractor
 *     tags: [PDF]
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 */
router.get('/config', pdfController.getConfig);

module.exports = router;
