const pdfParse = require('pdf-parse');

/**
 * Layer 2: Kiểm tra kích thước file và số trang
 * 
 * @param {Buffer} fileBuffer - Buffer của file PDF (từ Layer 1)
 * @param {string} filePath - Đường dẫn đến file (optional, dùng để check size nếu không có buffer)
 * @returns {Promise<{isValid: boolean, error?: string, pageCount?: number, fileSize?: number}>}
 * 
 * Yêu cầu:
 * - Kích thước file: không lớn hơn 5 MB
 * - Số trang: không quá 5 trang
 */
async function checkFileSizeAndPages(fileBuffer, filePath = null) {
  try {
    // Kiểm tra kích thước file
    let fileSize;
    if (fileBuffer) {
      fileSize = fileBuffer.length;
    } else if (filePath) {
      const fs = require('fs').promises;
      const stats = await fs.stat(filePath);
      fileSize = stats.size;
    } else {
      return {
        isValid: false,
        error: 'Cần fileBuffer hoặc filePath để kiểm tra kích thước'
      };
    }

    const maxFileSize = 5 * 1024 * 1024; // 5 MB
    if (fileSize > maxFileSize) {
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      return {
        isValid: false,
        error: `Kích thước file quá lớn: ${fileSizeMB} MB (giới hạn: 5 MB)`,
        fileSize: fileSize
      };
    }

    // Đếm số trang bằng pdf-parse
    let pageCount;
    try {
      const pdfData = await pdfParse(fileBuffer || (filePath ? await require('fs').promises.readFile(filePath) : null));
      pageCount = pdfData.numpages;
    } catch (parseError) {
      return {
        isValid: false,
        error: `Không thể đọc PDF để đếm số trang: ${parseError.message}`
      };
    }

    // Kiểm tra số trang
    const maxPages = 5;
    if (pageCount > maxPages) {
      return {
        isValid: false,
        error: `Số trang quá nhiều: ${pageCount} trang (giới hạn: ${maxPages} trang)`,
        pageCount: pageCount,
        fileSize: fileSize
      };
    }

    // Tất cả kiểm tra đều pass
    return {
      isValid: true,
      pageCount: pageCount,
      fileSize: fileSize,
      fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2)
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Lỗi khi kiểm tra kích thước và số trang: ${error.message}`
    };
  }
}

module.exports = {
  checkFileSizeAndPages
};
