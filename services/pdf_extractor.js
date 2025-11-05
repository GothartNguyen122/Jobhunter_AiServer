require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { spawn } = require('child_process');
const config = require('../config');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

class PDFExtractor {
  constructor() {
    this.client = openai;
  }

  /**
   * Convert PDF page to image using Ghostscript
   * @param {string} pdfPath - Path to the PDF file
   * @param {number} pageNumber - Page number to convert (0-indexed)
   * @returns {Promise<Buffer>} Image buffer
   */
  async convertPdfToImage(pdfPath, pageNumber = 0) {
    return new Promise(async (resolve, reject) => {
      try {
        // Generate unique output filename
        const timestamp = Date.now();
        const outputPath = path.join('./temp', `pdf_page_${timestamp}.png`);
        
        // Ensure temp directory exists
        await fs.mkdir('./temp', { recursive: true });

        // Ghostscript command for PDF to PNG conversion
        const gsArgs = [
          '-dNOPAUSE',
          '-dBATCH',
          '-sDEVICE=png16m',
          '-r200',                    // 200 DPI for good quality
          `-dFirstPage=${pageNumber + 1}`,
          `-dLastPage=${pageNumber + 1}`,             // Only convert specified page
          `-sOutputFile=${outputPath}`,
          pdfPath
        ];


        // Spawn Ghostscript process

        // Ensure PATH includes Homebrew binaries
        process.env.PATH = process.env.PATH + ':/opt/homebrew/bin';

        // Use correct Ghostscript command for macOS/Linux
        const gsCommand = '/opt/homebrew/bin/gs';
        const gsProcess = spawn(gsCommand, gsArgs, {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let errorOutput = '';

        // Collect error output
        gsProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        // Handle process completion
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
              // Failed to cleanup temporary image file
            }

            // Optimize the image with Sharp
            const optimizedBuffer = await sharp(imageBuffer)
              .resize(2048, 2048, { 
                fit: 'inside',
                withoutEnlargement: true 
              })
              .png()
              .toBuffer();

            console.log('PDF successfully converted to image');
            resolve(optimizedBuffer);

          } catch (processError) {
            reject(processError);
          }
        });

        // Handle process errors
        gsProcess.on('error', (error) => {
          if (error.code === 'ENOENT') {
            reject(new Error('Ghostscript not found. Please install Ghostscript and ensure it\'s in your PATH.'));
          } else {
            reject(new Error(`Ghostscript process error: ${error.message}`));
          }
        });

        // Set timeout for the conversion process
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

  /**
   * Convert image buffer to base64 string
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {string} Base64 encoded string
   */
  imageToBase64(imageBuffer) {
    return imageBuffer.toString('base64');
  }

  /**
   * Extract content from PDF using OpenAI Vision API
   * @param {string} pdfPath - Path to the PDF file
   * @param {number} pageNumber - Page number to process (0-indexed)
   * @returns {Promise<Object>} Extracted data as object 
   */
  async extractFromPdf(pdfPath ,pageNumber = null) {
    try {
      // 1. Lấy tổng số trang PDF
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');  // build NodeJS mới
      const data = new Uint8Array(await fs.readFile(pdfPath));
      const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
      const totalPages = pdfDoc.numPages;

  
      console.log("Total PDF pages:", totalPages);
  
      // 2. Convert toàn bộ trang sang ảnh PNG
      const imageBuffers = [];
      for (let i = 0; i < totalPages; i++) {
        const buf = await this.convertPdfToImage(pdfPath, i);
        imageBuffers.push(buf);
      }
  
      // 3. Convert tất cả ảnh → base64
      const imageDataArray = imageBuffers.map((buffer) => ({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${buffer.toString("base64")}`
        }
      }));
  
      // 4. Prompt
      const systemPrompt = await config.pdfExtractor.getPrompt();
      const userPrompt =
        "Extract structured JSON from ALL PAGES of this PDF. Return ONLY a valid JSON object.";
  
      // 5. Gọi OpenAI Vision API với N trang trong 1 request
      const response = await this.client.chat.completions.create({
        model: config.pdfExtractor.model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...imageDataArray  // ✅ Gửi nhiều ảnh ở đây!
            ]
          }
        ],
        max_tokens: config.pdfExtractor.maxTokens,
        temperature: config.pdfExtractor.temperature
      });
  
      let extractedText = response.choices[0].message.content.trim();

      // 1. Remove markdown code blocks if present
      if (extractedText.startsWith('```json')) {
        extractedText = extractedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (extractedText.startsWith('```')) {
        extractedText = extractedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // 2. Parse JSON
      let extractedData;
      try {
        extractedData = JSON.parse(extractedText);
      } catch (parseError) {
        // 3. Try to extract JSON from the response using regex
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            extractedData = JSON.parse(jsonMatch[0]);
          } catch (secondParseError) {
            throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
          }
        } else {
          throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
        }
      }

      // 4. Check if the response contains an error
      if (extractedData.error) {
        throw new Error(extractedData.error);
      }

      // 5. Return JSON in same structure
      return extractedData;

    } catch (err) {
      console.error("Multi-page PDF extraction error:", err);
      throw new Error("PDF Extraction failed: " + err.message);
    }
  }
  

  /**
   * Extract content from multiple pages of a PDF
   * @param {string} pdfPath - Path to the PDF file
   * @param {number} maxPages - Maximum number of pages to process (null for all pages)
   * @returns {Promise<Array>} List of extracted data from each page
   */
  async extractMultiplePages(pdfPath, maxPages = null) {
    try {
      // For now, we'll process one page at a time
      // In a more advanced implementation, you could get page count from PDF metadata
      console.log(`Processing PDF: ${pdfPath}`);
      
      const results = [];
      const pagesToProcess = maxPages || 1; // Default to 1 page for now
      
      for (let pageNum = 0; pageNum < pagesToProcess; pageNum++) {
        console.log(`\n--- Processing page ${pageNum + 1}/${pagesToProcess} ---`);
        try {
          const pageData = await this.extractFromPdf(pdfPath, pageNum);
          pageData.page_number = pageNum + 1;
          results.push(pageData);
        } catch (error) {
          console.log(`Error processing page ${pageNum + 1}: ${error.message}`);
          results.push({
            page_number: pageNum + 1,
            error: error.message
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error processing multiple pages:', error);
      throw error;
    }
  }
}

module.exports = PDFExtractor;
