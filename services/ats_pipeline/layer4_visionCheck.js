require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { spawn } = require('child_process');
const config = require('../../config');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Layer 4: Chuyển file PDF thành hình ảnh và sử dụng Vision API để kiểm tra
 * 
 * @param {Buffer} fileBuffer - Buffer của file PDF (từ Layer 1)
 * @param {string} filePath - Đường dẫn đến file PDF (cần để convert sang image)
 * @param {number} pageCount - Số trang PDF (từ Layer 2, để tối ưu)
 * @returns {Promise<{isValid: boolean, error?: string, isResume?: boolean, confidence?: string}>}
 * 
 * Yêu cầu:
 * - Chuyển PDF thành hình ảnh
 * - Sử dụng Vision API để phân tích
 * - Prompt: "Analyze the following these pictures. Return TRUE if it looks like a Curriculum Vitae or Resume. Return FALSE if it is an invoice, book, essay, or generic document"
 */
async function checkWithVisionAPI(fileBuffer, filePath, pageCount = null) {
  try {
    // Validate inputs
    if (!filePath && !fileBuffer) {
      return {
        isValid: false,
        error: 'Cần filePath hoặc fileBuffer để chuyển đổi PDF thành hình ảnh'
      };
    }

    // Nếu chỉ có buffer, cần lưu tạm vào file để convert
    let tempFilePath = filePath;
    let shouldDeleteTemp = false;

    if (!tempFilePath && fileBuffer) {
      const tempDir = path.join(__dirname, '../../temp');
      await fs.mkdir(tempDir, { recursive: true });
      tempFilePath = path.join(tempDir, `pdf_${Date.now()}.pdf`);
      await fs.writeFile(tempFilePath, fileBuffer);
      shouldDeleteTemp = true;
    }

    try {
      // 1. Lấy số trang nếu chưa có
      let totalPages = pageCount;
      if (!totalPages) {
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
        const data = new Uint8Array(await fs.readFile(tempFilePath));
        const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        totalPages = pdfDoc.numPages;
      }

      // Giới hạn số trang xử lý (tối đa 5 trang theo Layer 2)
      const maxPagesToProcess = Math.min(totalPages, 5);

      // 2. Convert tất cả các trang thành PNG images
      const imageBuffers = [];
      for (let i = 0; i < maxPagesToProcess; i++) {
        const imageBuffer = await convertPdfPageToImage(tempFilePath, i);
        imageBuffers.push(imageBuffer);
      }

      // 3. Convert images sang base64
      const imageDataArray = imageBuffers.map((buffer) => ({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${buffer.toString("base64")}`
        }
      }));

      // 4. Chuẩn bị prompt
      const systemPrompt = "You are an expert document analyzer. Analyze images and determine if they are CVs/Resumes.";
      const userPrompt = "Analyze the following these pictures. Return TRUE if it looks like a Curriculum Vitae or Resume. Return FALSE if it is an invoice, book, essay, or generic document. Only respond with TRUE or FALSE.";

      // 5. Gọi OpenAI Vision API
      const response = await openai.chat.completions.create({
        model: config.pdfExtractor.model, // Sử dụng model có vision capability
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...imageDataArray
            ]
          }
        ],
        max_tokens: 10, // Chỉ cần TRUE/FALSE
        temperature: 0.1
      });

      // 6. Parse kết quả
      const resultText = response.choices[0].message.content.trim().toUpperCase();
      const isResume = resultText.includes('TRUE');

      // 7. Cleanup temp file nếu cần
      if (shouldDeleteTemp && tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError.message);
        }
      }

      return {
        isValid: isResume,
        isResume: isResume,
        error: isResume ? undefined : 'File không phải là CV/Resume theo phân tích của Vision API',
        confidence: resultText,
        pagesAnalyzed: maxPagesToProcess
      };

    } catch (visionError) {
      // Cleanup temp file nếu có lỗi
      if (shouldDeleteTemp && tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file after error:', cleanupError.message);
        }
      }
      throw visionError;
    }

  } catch (error) {
    return {
      isValid: false,
      error: `Lỗi khi kiểm tra bằng Vision API: ${error.message}`
    };
  }
}

/**
 * Convert một trang PDF thành image buffer
 * Sử dụng Ghostscript tương tự như trong pdf_extractor.js
 * 
 * @param {string} pdfPath - Đường dẫn đến file PDF
 * @param {number} pageNumber - Số trang (0-indexed)
 * @returns {Promise<Buffer>} Image buffer
 */
async function convertPdfPageToImage(pdfPath, pageNumber = 0) {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate unique output filename
      const timestamp = Date.now();
      const outputPath = path.join(__dirname, '../../temp', `pdf_page_${timestamp}_${pageNumber}.png`);
      
      // Ensure temp directory exists
      await fs.mkdir(path.join(__dirname, '../../temp'), { recursive: true });

      // Ghostscript command for PDF to PNG conversion
      const gsArgs = [
        '-dNOPAUSE',
        '-dBATCH',
        '-sDEVICE=png16m',
        '-r200', // 200 DPI for good quality
        `-dFirstPage=${pageNumber + 1}`,
        `-dLastPage=${pageNumber + 1}`,
        `-sOutputFile=${outputPath}`,
        pdfPath
      ];

      // Find Ghostscript command
      let gsCommand = 'gs';
      const possiblePaths = [
        '/usr/bin/gs',
        '/opt/homebrew/bin/gs',
        '/usr/local/bin/gs',
        'gs'
      ];
      
      for (const gsPath of possiblePaths) {
        try {
          if (gsPath === 'gs') {
            gsCommand = 'gs';
            break;
          } else {
            await fs.access(gsPath);
            gsCommand = gsPath;
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      const gsProcess = spawn(gsCommand, gsArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let errorOutput = '';

      gsProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      gsProcess.on('close', async (code) => {
        try {
          if (code !== 0) {
            throw new Error(`Ghostscript failed with code ${code}: ${errorOutput}`);
          }

          // Check if output file was created
          try {
            await fs.access(outputPath);
          } catch (accessError) {
            throw new Error('Output image file was not created');
          }

          // Read the converted image
          const imageBuffer = await fs.readFile(outputPath);
          
          // Clean up temporary file
          try {
            await fs.unlink(outputPath);
          } catch (cleanupError) {
            // Ignore cleanup errors
          }

          // Optimize the image with Sharp
          const optimizedBuffer = await sharp(imageBuffer)
            .resize(2048, 2048, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .png()
            .toBuffer();

          resolve(optimizedBuffer);

        } catch (processError) {
          reject(processError);
        }
      });

      gsProcess.on('error', (error) => {
        if (error.code === 'ENOENT') {
          reject(new Error('Ghostscript not found. Please install Ghostscript.'));
        } else {
          reject(new Error(`Ghostscript process error: ${error.message}`));
        }
      });

      // Set timeout
      setTimeout(() => {
        if (!gsProcess.killed) {
          gsProcess.kill();
          reject(new Error('PDF conversion timeout (30 seconds)'));
        }
      }, 30000);

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  checkWithVisionAPI
};
