const fs = require('fs').promises;

/**
 * Layer 1: Kiểm tra Magic Byte và Hex Signature của PDF
 * 
 * @param {string} filePath - Đường dẫn đến file cần kiểm tra
 * @returns {Promise<{isValid: boolean, error?: string, fileBuffer?: Buffer}>}
 * 
 * Magic Bytes cho PDF:
 * - PDF 1.4 trở lên: %PDF-1.4 (hex: 25 50 44 46 2D 31 2E 34)
 * - PDF 1.5: %PDF-1.5 (hex: 25 50 44 46 2D 31 2E 35)
 * - PDF 1.6: %PDF-1.6 (hex: 25 50 44 46 2D 31 2E 36)
 * - PDF 1.7: %PDF-1.7 (hex: 25 50 44 46 2D 31 2E 37)
 * - PDF 2.0: %PDF-2.0 (hex: 25 50 44 46 2D 32 2E 30)
 * 
 * Hex Signature: 25 50 44 46 (tương ứng với "%PDF" trong ASCII)
 */
async function checkMagicByteAndHexSignature(filePath) {
  try {
    // Đọc file buffer
    const fileBuffer = await fs.readFile(filePath);
    
    // Kiểm tra file có đủ kích thước không (ít nhất 4 bytes cho magic byte)
    if (fileBuffer.length < 4) {
      return {
        isValid: false,
        error: 'File quá nhỏ, không phải file PDF hợp lệ'
      };
    }

    // Kiểm tra Magic Byte (4 bytes đầu tiên)
    const magicByte = fileBuffer.slice(0, 4);
    const magicByteHex = magicByte.toString('hex').toUpperCase();
    const magicByteAscii = magicByte.toString('ascii');

    // Hex Signature phải là: 25 50 44 46 (tương ứng "%PDF" trong ASCII)
    const expectedHexSignature = '25504446'; // "%PDF" in hex
    
    if (magicByteHex !== expectedHexSignature) {
      return {
        isValid: false,
        error: `Magic Byte không hợp lệ. Tìm thấy: ${magicByteHex} (${magicByteAscii}), mong đợi: ${expectedHexSignature} (%PDF)`
      };
    }

    // Kiểm tra ASCII signature (đọc thêm để xác nhận version)
    // Đọc thêm 4 bytes để kiểm tra version (ví dụ: "-1.4", "-1.5", etc.)
    if (fileBuffer.length >= 8) {
      const versionBytes = fileBuffer.slice(4, 8);
      const versionString = versionBytes.toString('ascii');
      
      // Kiểm tra format version (phải bắt đầu bằng "-" và có số)
      if (!/^-\d\.\d/.test(versionString)) {
        // Không phải lỗi nghiêm trọng, nhưng log để thông tin
        console.log(`Warning: PDF version format không chuẩn: ${versionString}`);
      }
    }

    // Kiểm tra đuôi file (nếu có)
    const fileExtension = filePath.toLowerCase().split('.').pop();
    if (fileExtension !== 'pdf') {
      return {
        isValid: false,
        error: `Đuôi file không phải .pdf: ${fileExtension}`
      };
    }

    // Tất cả kiểm tra đều pass
    return {
      isValid: true,
      fileBuffer: fileBuffer,
      magicByte: magicByteHex,
      asciiSignature: magicByteAscii
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Lỗi khi đọc file: ${error.message}`
    };
  }
}

module.exports = {
  checkMagicByteAndHexSignature
};
