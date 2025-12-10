const { checkMagicByteAndHexSignature } = require('./layer1_magicByte');
const { checkFileSizeAndPages } = require('./layer2_fileSizeAndPages');
const { checkTextContent } = require('./layer3_textContent');
const { checkWithVisionAPI } = require('./layer4_visionCheck');

/**
 * ATS Pipeline - Kiểm tra file PDF có phải là CV/Resume không
 * 
 * Flow:
 * 1. Layer 1: Kiểm tra Magic Byte và Hex Signature
 * 2. Layer 2: Kiểm tra kích thước file (≤5MB) và số trang (≤5)
 * 3. Layer 3: Kiểm tra file có text content (không chỉ toàn hình ảnh)
 * 4. Layer 4: Chuyển PDF thành hình ảnh và dùng Vision API để phân tích
 * 
 * @param {string} filePath - Đường dẫn đến file PDF cần kiểm tra
 * @returns {Promise<{isValid: boolean, error?: string, details?: object}>}
 */
async function validateResumePDF(filePath) {
  const result = {
    isValid: false,
    error: null,
    details: {
      layer1: null,
      layer2: null,
      layer3: null,
      layer4: null
    }
  };

  try {
    // ============================================
    // LAYER 1: Kiểm tra Magic Byte và Hex Signature
    // ============================================
    console.log('🔍 [Layer 1] Kiểm tra Magic Byte và Hex Signature...');
    const layer1Result = await checkMagicByteAndHexSignature(filePath);
    result.details.layer1 = layer1Result;

    if (!layer1Result.isValid) {
      result.error = `Layer 1 failed: ${layer1Result.error}`;
      return result;
    }

    // Lưu fileBuffer để sử dụng cho các layer sau
    const fileBuffer = layer1Result.fileBuffer;
    console.log('✅ [Layer 1] Pass - Magic Byte và Hex Signature hợp lệ');

    // ============================================
    // LAYER 2: Kiểm tra kích thước file và số trang
    // ============================================
    console.log('🔍 [Layer 2] Kiểm tra kích thước file và số trang...');
    const layer2Result = await checkFileSizeAndPages(fileBuffer, filePath);
    result.details.layer2 = layer2Result;

    if (!layer2Result.isValid) {
      result.error = `Layer 2 failed: ${layer2Result.error}`;
      return result;
    }

    const pageCount = layer2Result.pageCount;
    console.log(`✅ [Layer 2] Pass - File size: ${layer2Result.fileSizeMB} MB, Pages: ${pageCount}`);

    // ============================================
    // LAYER 3: Kiểm tra text content
    // ============================================
    console.log('🔍 [Layer 3] Kiểm tra text content...');
    const layer3Result = await checkTextContent(fileBuffer, filePath);
    result.details.layer3 = layer3Result;

    if (!layer3Result.isValid) {
      result.error = `Layer 3 failed: ${layer3Result.error}`;
      return result;
    }

    console.log(`✅ [Layer 3] Pass - Text content: ${layer3Result.textLength} ký tự`);

    // ============================================
    // LAYER 4: Kiểm tra bằng Vision API
    // ============================================
    console.log('🔍 [Layer 4] Kiểm tra bằng Vision API...');
    const layer4Result = await checkWithVisionAPI(fileBuffer, filePath, pageCount);
    result.details.layer4 = layer4Result;

    if (!layer4Result.isValid) {
      result.error = `Layer 4 failed: ${layer4Result.error}`;
      return result;
    }

    console.log(`✅ [Layer 4] Pass - Vision API xác nhận đây là CV/Resume`);

    // ============================================
    // TẤT CẢ LAYERS ĐỀU PASS
    // ============================================
    result.isValid = true;
    result.details.summary = {
      fileSize: `${layer2Result.fileSizeMB} MB`,
      pageCount: pageCount,
      textLength: layer3Result.textLength,
      isResume: layer4Result.isResume,
      pagesAnalyzed: layer4Result.pagesAnalyzed
    };

    console.log('✅ [ATS Pipeline] Tất cả layers đều pass - File là CV/Resume hợp lệ');
    return result;

  } catch (error) {
    result.error = `Lỗi trong pipeline: ${error.message}`;
    console.error('❌ [ATS Pipeline] Error:', error);
    return result;
  }
}

/**
 * Validate Resume PDF từ file buffer (không cần file path)
 * 
 * @param {Buffer} fileBuffer - Buffer của file PDF
 * @param {string} originalFileName - Tên file gốc (để check extension)
 * @returns {Promise<{isValid: boolean, error?: string, details?: object}>}
 */
async function validateResumePDFFromBuffer(fileBuffer, originalFileName = 'file.pdf') {
  const fs = require('fs').promises;
  const path = require('path');
  
  // Tạo file tạm
  const tempDir = path.join(__dirname, '../../temp');
  await fs.mkdir(tempDir, { recursive: true });
  const tempFilePath = path.join(tempDir, `ats_check_${Date.now()}_${originalFileName}`);
  
  try {
    // Ghi buffer vào file tạm
    await fs.writeFile(tempFilePath, fileBuffer);
    
    // Chạy pipeline
    const result = await validateResumePDF(tempFilePath);
    
    // Cleanup
    try {
      await fs.unlink(tempFilePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError.message);
    }
    
    return result;
  } catch (error) {
    // Cleanup on error
    try {
      await fs.unlink(tempFilePath);
    } catch (cleanupError) {
      // Ignore
    }
    throw error;
  }
}

module.exports = {
  validateResumePDF,
  validateResumePDFFromBuffer
};
