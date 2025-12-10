/**
 * Example: Sử dụng ATS Pipeline để kiểm tra CV/Resume
 */

const { validateResumePDF, validateResumePDFFromBuffer } = require('./atsPipeline');
const fs = require('fs').promises;
const path = require('path');

async function example1_WithFilePath() {
  console.log('\n=== Example 1: Sử dụng với file path ===\n');
  
  const filePath = path.join(__dirname, '../../resumes/Data_Engineer.pdf');
  
  try {
    const result = await validateResumePDF(filePath);
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.isValid) {
      console.log('\n✅ File là CV/Resume hợp lệ!');
      console.log('Summary:', result.details.summary);
    } else {
      console.log('\n❌ File không hợp lệ:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example2_WithFileBuffer() {
  console.log('\n=== Example 2: Sử dụng với file buffer ===\n');
  
  const filePath = path.join(__dirname, '../../resumes/Front_End_Developer.pdf');
  
  try {
    const fileBuffer = await fs.readFile(filePath);
    const result = await validateResumePDFFromBuffer(fileBuffer, 'Front_End_Developer.pdf');
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.isValid) {
      console.log('\n✅ File là CV/Resume hợp lệ!');
      console.log('Summary:', result.details.summary);
    } else {
      console.log('\n❌ File không hợp lệ:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example3_CheckInvalidFile() {
  console.log('\n=== Example 3: Kiểm tra file không hợp lệ ===\n');
  
  // Giả sử có một file không phải PDF hoặc quá lớn
  const filePath = path.join(__dirname, '../../test.txt'); // File text không phải PDF
  
  try {
    const result = await validateResumePDF(filePath);
    
    if (result.isValid) {
      console.log('✅ File hợp lệ');
    } else {
      console.log('❌ File không hợp lệ:', result.error);
      console.log('Failed at layer:', {
        layer1: result.details.layer1?.isValid,
        layer2: result.details.layer2?.isValid,
        layer3: result.details.layer3?.isValid,
        layer4: result.details.layer4?.isValid
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Chạy examples
async function runExamples() {
  try {
    // await example1_WithFilePath();
    // await example2_WithFileBuffer();
    await example3_CheckInvalidFile(); // Uncomment để test với file không hợp lệ
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment để chạy
runExamples();

module.exports = {
  example1_WithFilePath,
  example2_WithFileBuffer,
  example3_CheckInvalidFile
};
