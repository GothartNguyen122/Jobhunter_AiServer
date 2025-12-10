const pdfParse = require('pdf-parse');

/**
 * Layer 3: Kiểm tra file PDF không được chứa chỉ toàn hình ảnh
 * 
 * @param {Buffer} fileBuffer - Buffer của file PDF (từ Layer 1)
 * @param {string} filePath - Đường dẫn đến file (optional)
 * @returns {Promise<{isValid: boolean, error?: string, textLength?: number, hasText?: boolean}>}
 * 
 * Yêu cầu:
 * - PDF phải chứa text content (không chỉ toàn hình ảnh)
 * - Text content phải có độ dài tối thiểu (ví dụ: ít nhất 50 ký tự)
 */
async function checkTextContent(fileBuffer, filePath = null) {
  try {
    // Đọc PDF và extract text
    let pdfData;
    try {
      const bufferToParse = fileBuffer || (filePath ? await require('fs').promises.readFile(filePath) : null);
      if (!bufferToParse) {
        return {
          isValid: false,
          error: 'Cần fileBuffer hoặc filePath để kiểm tra text content'
        };
      }
      pdfData = await pdfParse(bufferToParse);
    } catch (parseError) {
      return {
        isValid: false,
        error: `Không thể parse PDF: ${parseError.message}`
      };
    }

    // Extract text content
    const textContent = (pdfData?.text || '').trim();
    const textLength = textContent.length;

    // Kiểm tra xem có text content không
    if (textLength === 0) {
      return {
        isValid: false,
        error: 'PDF chỉ chứa hình ảnh, không có text content',
        textLength: 0,
        hasText: false
      };
    }

    // Kiểm tra độ dài text tối thiểu (ít nhất 50 ký tự để đảm bảo có nội dung thực sự)
    const minTextLength = 50;
    if (textLength < minTextLength) {
      return {
        isValid: false,
        error: `Text content quá ngắn: ${textLength} ký tự (tối thiểu: ${minTextLength} ký tự). Có thể file chỉ chứa hình ảnh với ít text.`,
        textLength: textLength,
        hasText: true
      };
    }

    // Kiểm tra xem text có phải chỉ là whitespace không
    const nonWhitespaceLength = textContent.replace(/\s+/g, '').length;
    if (nonWhitespaceLength < 20) {
      return {
        isValid: false,
        error: `Text content chủ yếu là khoảng trắng. Số ký tự thực tế: ${nonWhitespaceLength} (tối thiểu: 20)`,
        textLength: textLength,
        hasText: true
      };
    }

    // Tất cả kiểm tra đều pass
    return {
      isValid: true,
      textLength: textLength,
      hasText: true,
      textPreview: textContent.substring(0, 100) // Preview 100 ký tự đầu
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Lỗi khi kiểm tra text content: ${error.message}`
    };
  }
}

module.exports = {
  checkTextContent
};
