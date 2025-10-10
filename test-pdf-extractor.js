// Test PDF Extractor
const PDFExtractor = require('./services/pdf_extractor');
const config = require('./config');

async function testPDFExtractor() {
  try {
    console.log('Testing PDF Extractor...');
    
    // Test config
    console.log('Config pdfExtractor:', config.pdfExtractor);
    
    // Test prompt loading
    const prompt = await config.pdfExtractor.getPrompt();
    console.log('Prompt loaded:', prompt.substring(0, 100) + '...');
    
    // Test PDF extractor
    const extractor = new PDFExtractor();
    console.log('PDF Extractor created successfully');
    
    // Test with our test PDF
    const result = await extractor.extractFromPdf('./test.pdf', 0);
    console.log('Extraction result:', result);
    
  } catch (error) {
    console.error('Error testing PDF extractor:', error);
  }
}

testPDFExtractor();
