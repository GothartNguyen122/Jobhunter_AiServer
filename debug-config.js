// Debug config loading
const config = require('./config');

console.log('Config loaded:');
console.log('OpenAI config:', config.openai);
console.log('PDF Extractor config:', config.pdfExtractor);
console.log('System Prompts config:', config.systemPrompts);

// Test PDF extractor prompt
config.pdfExtractor.getPrompt().then(prompt => {
  console.log('PDF Extractor prompt loaded:', prompt.substring(0, 100) + '...');
}).catch(err => {
  console.error('Error loading PDF extractor prompt:', err);
});

