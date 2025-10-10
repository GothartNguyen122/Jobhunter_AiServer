const express = require('express');
const router = express.Router();
const { controller: pdfController, upload } = require('../controllers/pdfController');

// Extract content from PDF (single page)
router.post('/extract', upload, pdfController.extractFromPdf);

// Extract content from PDF (multiple pages)
router.post('/extract-multiple', upload, pdfController.extractMultiplePages);

// Get PDF extractor configuration
router.get('/config', pdfController.getConfig);

module.exports = router;
