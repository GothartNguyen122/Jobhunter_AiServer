require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
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
   * Extract plain text from PDF file using pdf-parse (similar to ragServices.js)
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<string>} Plain text content extracted from PDF
   */
  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const textContent = (pdfData?.text || '').trim();
      if (!textContent) {
        throw new Error('No textual content detected in PDF.');
      }
      return textContent;
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
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
        // Find Ghostscript command - try common paths
        let gsCommand = 'gs'; // Default: use PATH
        
        // Try to find Ghostscript in common locations
        const possiblePaths = [
          '/usr/bin/gs',           // Linux (Debian/Ubuntu)
          '/opt/homebrew/bin/gs',  // macOS (Apple Silicon)
          '/usr/local/bin/gs',     // macOS (Intel) / Linux (custom install)
          'gs'                     // Fallback: use PATH
        ];
        
        // Find first available Ghostscript
        for (const gsPath of possiblePaths) {
          try {
            if (gsPath === 'gs') {
              // For 'gs', just try to use it (will fail in spawn if not found)
              gsCommand = 'gs';
              break;
            } else {
              // Check if file exists
              await fs.access(gsPath);
              gsCommand = gsPath;
              break;
            }
          } catch (err) {
            // Continue to next path
            continue;
          }
        }
        
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
   * Extract content from PDF using pdf-parse for text extraction and OpenAI for structured parsing
   * @param {string} pdfPath - Path to the PDF file
   * @param {number} pageNumber - Page number to process (0-indexed, ignored when using text extraction)
   * @param {boolean} useVisionAPI - Optional flag to use Vision API instead of text extraction (default: false)
   * @returns {Promise<Object>} Extracted data as object 
   */
  async extractFromPdf(pdfPath, pageNumber = null, useVisionAPI = false) {
    try {
      // Use Vision API if explicitly requested (fallback for complex PDFs)
      if (useVisionAPI) {
        return await this.extractFromPdfWithVision(pdfPath, pageNumber);
      }

      // Extract text from PDF using pdf-parse (similar to ragServices.js)
      console.log("Extracting text from PDF using pdf-parse...");
      const textContent = await this.extractTextFromPDF(pdfPath);
      
      if (!textContent || textContent.trim().length === 0) {
        throw new Error('No textual content extracted from PDF. PDF may be image-based or corrupted.');
      }

      console.log(`Extracted ${textContent.length} characters from PDF`);

      // Get system prompt for PDF extraction
      const systemPrompt = await config.pdfExtractor.getPrompt();
      const userPrompt = `Extract structured JSON from the following PDF text content. Return ONLY a valid JSON object.\n\nPDF Content:\n${textContent}`;

      // Call OpenAI API to parse text into structured JSON
      const response = await this.client.chat.completions.create({
        model: config.pdfExtractor.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: config.pdfExtractor.maxTokens,
        temperature: config.pdfExtractor.temperature
      });

      let extractedText = response.choices[0].message.content.trim();

      // Remove markdown code blocks if present
      if (extractedText.startsWith('```json')) {
        extractedText = extractedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (extractedText.startsWith('```')) {
        extractedText = extractedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Parse JSON
      let extractedData;
      try {
        extractedData = JSON.parse(extractedText);
      } catch (parseError) {
        // Try to extract JSON from the response using regex
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

      // Check if the response contains an error
      if (extractedData.error) {
        throw new Error(extractedData.error);
      }

      return extractedData;

    } catch (err) {
      console.error("PDF extraction error:", err);
      throw new Error("PDF Extraction failed: " + err.message);
    }
  }

  /**
   * Extract content from PDF using OpenAI Vision API (fallback method for image-based PDFs)
   * @param {string} pdfPath - Path to the PDF file
   * @param {number} pageNumber - Page number to process (0-indexed)
   * @returns {Promise<Object>} Extracted data as object 
   */
  async extractFromPdfWithVision(pdfPath, pageNumber = null) {
    try {
      // 1. Get total number of PDF pages
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
      const data = new Uint8Array(await fs.readFile(pdfPath));
      const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
      const totalPages = pdfDoc.numPages;
  
      console.log("Total PDF pages:", totalPages);
  
      // 2. Convert all pages to PNG images
      const imageBuffers = [];
      for (let i = 0; i < totalPages; i++) {
        const buf = await this.convertPdfToImage(pdfPath, i);
        imageBuffers.push(buf);
      }
  
      // 3. Convert all images to base64
      const imageDataArray = imageBuffers.map((buffer) => ({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${buffer.toString("base64")}`
        }
      }));
  
      // 4. Get prompt
      const systemPrompt = await config.pdfExtractor.getPrompt();
      const userPrompt = "Extract structured JSON from ALL PAGES of this PDF. Return ONLY a valid JSON object.";
  
      // 5. Call OpenAI Vision API with all pages in one request
      const response = await this.client.chat.completions.create({
        model: config.pdfExtractor.model,
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
        max_tokens: config.pdfExtractor.maxTokens,
        temperature: config.pdfExtractor.temperature
      });
  
      let extractedText = response.choices[0].message.content.trim();

      // Remove markdown code blocks if present
      if (extractedText.startsWith('```json')) {
        extractedText = extractedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (extractedText.startsWith('```')) {
        extractedText = extractedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Parse JSON
      let extractedData;
      try {
        extractedData = JSON.parse(extractedText);
      } catch (parseError) {
        // Try to extract JSON from the response using regex
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

      // Check if the response contains an error
      if (extractedData.error) {
        throw new Error(extractedData.error);
      }

      return extractedData;

    } catch (err) {
      console.error("Vision API PDF extraction error:", err);
      throw new Error("PDF Extraction with Vision API failed: " + err.message);
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
