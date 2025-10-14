const express = require('express');
const router = express.Router();
const { controller: pdfController, upload } = require('../controllers/pdfController');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'PDF routes working' });
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

// Extract content from PDF (multiple pages)
router.post('/extract-multiple', upload, pdfController.extractMultiplePages);

// Get PDF extractor configuration
router.get('/config', pdfController.getConfig);

module.exports = router;
