const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');

const promptsPath = path.resolve(__dirname, 'prompts.json5');

function loadPrompts(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON5.parse(content);
}

try {
  if (!fs.existsSync(promptsPath)) {
    console.error(`File not found: ${promptsPath}`);
    process.exit(1);
  }
  const prompts = loadPrompts(promptsPath);
  if (typeof prompts !== 'object' || prompts === null) {
    console.error('Invalid prompts content: not an object');
    process.exit(1);
  }
  const keys = Object.keys(prompts);
  console.log('prompts.json5 loaded successfully.');
  console.log(`Top-level keys (${keys.length}):`, keys.join(', '));
  // Print a couple of sample entries if present
  ['default', 'pdf_extractor_prompt', 'cv_score_chat'].forEach((k) => {
    if (prompts[k]) {
      const preview = String(prompts[k]).slice(0, 120).replace(/\s+/g, ' ').trim();
      console.log(`- ${k}: ${preview}${prompts[k].length > 120 ? '…' : ''}`);
    }
  });
  process.exit(0);
} catch (err) {
  console.error('Failed to load prompts.json5:', err.message);
  process.exit(1);
}

