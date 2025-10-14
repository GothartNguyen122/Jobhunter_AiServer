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

        console.log('Running Ghostscript with args:', gsArgs);

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
              console.error('Ghostscript error output:', errorOutput);
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
              console.warn('Failed to cleanup temporary image file:', cleanupError.message);
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
  async extractFromPdf(pdfPath, pageNumber = 0) {
    try {
      console.log('=== PDF EXTRACTOR START ===');
      console.log(`📁 PDF Extractor received file: ${pdfPath}`);
      console.log(`📄 Processing page: ${pageNumber}`);
      console.log(`🔄 Converting page ${pageNumber} to image...`);
      
      // Convert PDF to image
      const imageBuffer = await this.convertPdfToImage(pdfPath, pageNumber);
      console.log(`✅ Image conversion completed. Size: ${imageBuffer.length} bytes`);
      
      // Convert to base64
      const base64Data = this.imageToBase64(imageBuffer);
      console.log("✅ Image converted to base64");
      
      // Prepare image data for OpenAI API
      const imageData = {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${base64Data}`
        }
      };
      
      // Get system prompt from promptManager
      const systemPrompt = await config.pdfExtractor.getPrompt();
      console.log("📝 System prompt loaded from config");
      
      // User prompt
      const userPrompt = "Extract the content from this document. Return ONLY the JSON object with no additional formatting or text.";
      
      console.log("🤖 Calling OpenAI Vision API...");
      console.log("📋 User prompt:", userPrompt);
      
      // Call OpenAI Vision API
      const response = await this.client.chat.completions.create({
        model: config.pdfExtractor.model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt
              },
              imageData
            ]
          }
        ],
        max_tokens: config.pdfExtractor.maxTokens,
        temperature: config.pdfExtractor.temperature
      });
      
      const extractedText = response.choices[0].message.content;
      console.log("✅ OpenAI API response received");
      console.log("📄 Raw OpenAI response:", extractedText);
      
      // Clean the response text to extract JSON
      let cleanedText = extractedText.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log("🧹 Cleaned text:", cleanedText);
      
      // Parse the JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(cleanedText);
        console.log("✅ Successfully parsed JSON response");
        console.log("📋 Final extracted data:", JSON.stringify(extractedData, null, 2));
      } catch (parseError) {
        // Try to extract JSON from the response using regex
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            extractedData = JSON.parse(jsonMatch[0]);
            console.log("Successfully extracted JSON from response");
          } catch (secondParseError) {
            console.error('Raw OpenAI response:', extractedText);
            console.error('Cleaned text:', cleanedText);
            console.error('Extracted JSON attempt:', jsonMatch[0]);
            throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
          }
        } else {
          console.error('Raw OpenAI response:', extractedText);
          console.error('Cleaned text:', cleanedText);
          throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
        }
      }

      // Check if the response contains an error
      if (extractedData.error) {
        throw new Error(extractedData.error);
      }

      console.log("🎉 Successfully extracted data from PDF");
      console.log("=== PDF EXTRACTOR END ===");
      return extractedData;
      
    } catch (error) {
      console.error('❌ Error processing PDF in Extractor:', error);
      
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else if (error.message.includes('rate_limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`PDF extraction failed: ${error.message}`);
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
