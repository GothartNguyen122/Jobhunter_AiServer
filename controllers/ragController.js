const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/response');
const { validateFileUpload } = require('../utils/validation');
const logger = require('../utils/logger');
const ragServices = require('../services/ragServices');
const { describeIndexStats, isPineconeAvailable, deleteIndex, createIndex, PINECONE_INDEX } = require('../config/pinecone');

// Custom storage using Object.assign() instead of util._extend
// Configure multer for RAG file uploads
// Files will be stored in uploads/rags/ directory
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/rags');
    try {
      // Create uploads/rags directory if it doesn't exist
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      logger.error('Error creating uploads/rags directory:', err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomNumber-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Multer configuration for RAG uploads
// Using Object.assign() pattern for configuration merging
const multerConfig = {
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size per file
    files: 20 // Maximum 20 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF files and other document types for RAG
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const mimetype = allowedTypes.includes(file.mimetype);
    
    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
};

// Create multer instance using Object.assign() pattern
// This ensures we use Object.assign() instead of util._extend internally
const upload = multer(Object.assign({}, multerConfig));

class RAGController {
  /**
   * Upload file(s) for RAG processing
   * POST /admin/chatbox-admin/rag/upload
   * Supports single or multiple file uploads
   */
  async uploadFile(req, res) {
    try {
      // Check if files were uploaded
      const files = req.files || (req.file ? [req.file] : []);
      
      if (!files || files.length === 0) {
        logger.warn('No files uploaded for RAG');
        return res.status(400).json(errorResponse('No files uploaded', 400));
      }

      const uploadedFiles = [];
      const errors = [];

      // Process each file
      for (const file of files) {
        try {
          // Validate uploaded file
          const validation = validateFileUpload(file);
          if (!validation.isValid) {
            logger.warn('Invalid file upload for RAG', validation.errors);
            errors.push({
              filename: file.originalname,
              errors: validation.errors
            });
            // Clean up invalid file
            try {
              await fs.unlink(file.path);
            } catch (cleanupError) {
              logger.warn(`Failed to cleanup invalid file: ${file.path}`);
            }
            continue;
          }

          // Get file information
          const fileInfo = {
            id: path.basename(file.filename, path.extname(file.filename)),
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date().toISOString()
          };

          if (file.mimetype === 'application/pdf') {
            try {
              const previewText = await ragServices.extractTextFromPDF(file.path);
              fileInfo.preview = previewText.slice(0, 500);
            } catch (parseError) {
              logger.warn('Failed to parse uploaded PDF before chunking', {
                filename: file.originalname,
                error: parseError.message
              });
            }
          }

          uploadedFiles.push(fileInfo);

          logger.info('RAG file uploaded successfully', {
            filename: fileInfo.filename,
            originalName: fileInfo.originalName,
            size: fileInfo.size
          });
        } catch (fileError) {
          logger.error(`Error processing file ${file.originalname}:`, fileError);
          errors.push({
            filename: file.originalname,
            error: fileError.message
          });
          // Clean up file on error
          try {
            await fs.unlink(file.path);
          } catch (cleanupError) {
            logger.warn(`Failed to cleanup file on error: ${file.path}`);
          }
        }
      }

      // If no files were successfully uploaded
      if (uploadedFiles.length === 0) {
        return res.status(400).json(errorResponse('No valid files were uploaded', 400, {
          errors
        }));
      }

      // Return success response with file information
      const message = uploadedFiles.length === 1 
        ? 'File uploaded successfully for RAG processing'
        : `${uploadedFiles.length} files uploaded successfully for RAG processing`;

      res.json(successResponse(message, {
        files: uploadedFiles,
        count: uploadedFiles.length,
        errors: errors.length > 0 ? errors : undefined
      }));

    } catch (error) {
      logger.error('RAG file upload error:', error);
      
      // Clean up all uploaded files on error
      const files = req.files || (req.file ? [req.file] : []);
      for (const file of files) {
        if (file && file.path) {
          try {
            await fs.unlink(file.path);
            logger.info(`Cleaned up file on error: ${file.path}`);
          } catch (cleanupError) {
            logger.warn('Failed to cleanup file on error:', cleanupError.message);
          }
        }
      }

      res.status(500).json(errorResponse('File upload failed', 500, {
        error: error.message
      }));
    }
  }

  /**
   * Get list of uploaded RAG files with indexed status
   * GET /admin/chatbox-admin/rag/files
   */
  async getFiles(req, res) {
    try {
      const ragsDir = path.join(__dirname, '../uploads/rags');
      
      // Check if directory exists
      try {
        await fs.access(ragsDir);
      } catch {
        // Directory doesn't exist, return empty array
        return res.json(successResponse('RAG files retrieved successfully', {
          files: []
        }));
      }

      // Read directory contents
      const files = await fs.readdir(ragsDir);
      
      // Filter only PDF files for indexing check
      const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
      
      // Get indexed namespaces from Pinecone
      const fileNamesWithoutExt = pdfFiles.map(file => path.basename(file, path.extname(file)));
      const indexedNamespaces = await ragServices.getIndexedNamespaces(fileNamesWithoutExt);
      
      // Get file details with indexed status
      const fileList = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(ragsDir, filename);
          const stats = await fs.stat(filePath);
          const fileNameWithoutExt = path.basename(filename, path.extname(filename));
          const isIndexed = indexedNamespaces.includes(fileNameWithoutExt);
          
          return {
            filename,
            path: filePath,
            size: stats.size,
            uploadedAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            indexed: isIndexed
          };
        })
      );

      logger.info(`Retrieved ${fileList.length} RAG files, ${indexedNamespaces.length} indexed`);
      
      res.json(successResponse('RAG files retrieved successfully', {
        files: fileList,
        count: fileList.length,
        indexedCount: indexedNamespaces.length
      }));

    } catch (error) {
      logger.error('Error retrieving RAG files:', error);
      res.status(500).json(errorResponse('Failed to retrieve RAG files', 500, {
        error: error.message
      }));
    }
  }

  /**
   * Delete a RAG file
   * DELETE /admin/chatbox-admin/rag/files/:filename
   */
  async deleteFile(req, res) {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        return res.status(400).json(errorResponse('Filename is required', 400));
      }

      // Decode filename in case it's URL encoded
      const decodedFilename = decodeURIComponent(filename);
      
      // Security: Prevent directory traversal
      if (decodedFilename.includes('..') || decodedFilename.includes('/') || decodedFilename.includes('\\')) {
        return res.status(400).json(errorResponse('Invalid filename', 400));
      }

      const ragsDir = path.join(__dirname, '../uploads/rags');
      const filePath = path.join(ragsDir, decodedFilename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json(errorResponse('File not found', 404));
      }

      // Delete the file
      await fs.unlink(filePath);

      logger.info(`RAG file deleted: ${decodedFilename}`);

      res.json(successResponse('File deleted successfully', {
        filename: decodedFilename
      }));

    } catch (error) {
      logger.error('Error deleting RAG file:', error);
      res.status(500).json(errorResponse('Failed to delete file', 500, {
        error: error.message
      }));
    }
  }

  /**
   * Train RAG model - Process all uploaded PDF files and store embeddings in Pinecone
   * POST /admin/chatbox-admin/rag/train
   */
  async trainModel(req, res) {
    try {
      const ragsDir = path.join(__dirname, '../uploads/rags');
      
      // Check if directory exists
      try {
        await fs.access(ragsDir);
      } catch {
        return res.status(404).json(errorResponse('No RAG files directory found. Please upload files first.', 404));
      }

      // Get all files in the directory
      const files = await fs.readdir(ragsDir);
      
      // Filter only PDF files
      const pdfFiles = files.filter(file => 
        path.extname(file).toLowerCase() === '.pdf'
      );

      if (pdfFiles.length === 0) {
        return res.status(400).json(errorResponse('No PDF files found to train. Please upload PDF files first.', 400));
      }

      logger.info(`Starting RAG model training with ${pdfFiles.length} PDF file(s)`);

      // Delete existing index and create new one for fresh training
      try {
        logger.info('Deleting existing Pinecone index for fresh training...');
        await deleteIndex();
        logger.info('Existing index deleted successfully');
        
        // Wait a moment to ensure index is fully deleted
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create new index
        logger.info('Creating new Pinecone index...');
        await createIndex(PINECONE_INDEX, 3072);
        logger.info('New Pinecone index created successfully');
      } catch (indexError) {
        logger.error('Error managing Pinecone index:', indexError);
        
        // Provide more helpful error message
        let errorMessage = indexError.message;
        if (errorMessage.includes('Pinecone is not configured')) {
          errorMessage = 'Pinecone is not configured. Please create a .env file from env.template and set PINECONE_API_KEY, PINECONE_INDEX, and PINECONE_NAMESPACE.';
        }
        
        return res.status(500).json(errorResponse('Failed to manage Pinecone index', 500, {
          error: errorMessage,
          hint: 'Make sure you have created a .env file with PINECONE_API_KEY, PINECONE_INDEX, and PINECONE_NAMESPACE configured. See env.template for reference.'
        }));
      }

      const results = [];
      const errors = [];
      let totalChunks = 0;
      let totalEmbeddings = 0;
      let totalStored = 0;

      // Process each PDF file
      for (const filename of pdfFiles) {
        const filePath = path.join(ragsDir, filename);
        
        try {
          logger.info(`Processing file: ${filename}`);

          // Process PDF: extract text, chunk, and create embeddings
          const { chunks, embeddings, chunkCount, embeddingCount } = await ragServices.processPDFWithEmbeddings(
            filePath,
            1000, // chunkSize
            200,  // overlapSize
            'text-embedding-3-large' // embeddingModel
          );

          totalChunks += chunkCount;
          totalEmbeddings += embeddingCount;

          logger.info(`Created ${embeddingCount} embeddings for ${filename}`);

          // Store embeddings in Pinecone
          // Use filename (without extension) as namespace to separate documents
          const namespace = path.basename(filename, path.extname(filename));
          const storeResult = await ragServices.storeEmbeddings(embeddings, namespace);

          totalStored += storeResult.storedCount;

          results.push({
            filename,
            chunkCount,
            embeddingCount,
            storedCount: storeResult.storedCount,
            namespace,
            status: 'success'
          });

          logger.info(`Successfully stored ${storeResult.storedCount} embeddings for ${filename} in namespace "${namespace}"`);

        } catch (fileError) {
          logger.error(`Error processing file ${filename}:`, fileError);
          errors.push({
            filename,
            error: fileError.message,
            status: 'failed'
          });
        }
      }

      // Prepare response
      const successCount = results.length;
      const failedCount = errors.length;

      const responseData = {
        summary: {
          totalFiles: pdfFiles.length,
          successCount,
          failedCount,
          totalChunks,
          totalEmbeddings,
          totalStored
        },
        results,
        errors: errors.length > 0 ? errors : undefined
      };

      if (successCount === 0) {
        return res.status(500).json(errorResponse('Training failed for all files', 500, responseData));
      }

      const message = failedCount > 0
        ? `Training completed: ${successCount} file(s) successful, ${failedCount} file(s) failed`
        : `Training completed successfully: ${successCount} file(s) processed, ${totalStored} embeddings stored`;

      logger.info(`RAG model training completed: ${successCount} success, ${failedCount} failed`);

      res.json(successResponse(message, responseData));

    } catch (error) {
      logger.error('RAG model training error:', error);
      res.status(500).json(errorResponse('Training failed', 500, {
        error: error.message
      }));
    }
  }

  /**
   * Sync vector store - Check and sync files with Pinecone
   * POST /admin/chatbox-admin/rag/sync
   */
  async syncVectorStore(req, res) {
    try {
      const ragsDir = path.join(__dirname, '../uploads/rags');
      
      // Check if directory exists
      try {
        await fs.access(ragsDir);
      } catch {
        return res.status(404).json(errorResponse('No RAG files directory found. Please upload files first.', 404));
      }

      // Get all files in the directory
      const files = await fs.readdir(ragsDir);
      
      // Filter only PDF files
      const pdfFiles = files.filter(file => 
        path.extname(file).toLowerCase() === '.pdf'
      );

      if (pdfFiles.length === 0) {
        return res.status(400).json(errorResponse('No PDF files found to sync. Please upload PDF files first.', 400));
      }

      logger.info(`Starting vector store sync with ${pdfFiles.length} PDF file(s)`);

      // Get file names without extension (these are the namespaces)
      const fileNamesWithoutExt = pdfFiles.map(file => path.basename(file, path.extname(file)));
      
      // Check which files are indexed in Pinecone
      const indexedNamespaces = await ragServices.getIndexedNamespaces(fileNamesWithoutExt);
      
      // Determine which files need to be indexed
      const filesToIndex = pdfFiles.filter(file => {
        const fileNameWithoutExt = path.basename(file, path.extname(file));
        return !indexedNamespaces.includes(fileNameWithoutExt);
      });

      const syncResults = {
        totalFiles: pdfFiles.length,
        indexedFiles: indexedNamespaces.length,
        filesToIndex: filesToIndex.length,
        files: pdfFiles.map(filename => {
          const fileNameWithoutExt = path.basename(filename, path.extname(filename));
          return {
            filename,
            indexed: indexedNamespaces.includes(fileNameWithoutExt),
            namespace: fileNameWithoutExt
          };
        })
      };

      logger.info(`Vector store sync completed: ${syncResults.indexedFiles} indexed, ${syncResults.filesToIndex} need indexing`);

      const message = syncResults.filesToIndex > 0
        ? `Sync completed: ${syncResults.indexedFiles} file(s) indexed, ${syncResults.filesToIndex} file(s) need indexing`
        : `Sync completed: All ${syncResults.indexedFiles} file(s) are indexed`;

      res.json(successResponse(message, syncResults));

    } catch (error) {
      logger.error('Vector store sync error:', error);
      res.status(500).json(errorResponse('Sync failed', 500, {
        error: error.message
      }));
    }
  }

  /**
   * Get model statistics - Information about trained model from Pinecone
   * GET /admin/chatbox-admin/rag/model
   */
  async getModelStats(req, res) {
    try {
      if (!isPineconeAvailable()) {
        return res.status(503).json(errorResponse('Pinecone is not configured', 503, {
          hint: 'Please set PINECONE_API_KEY in .env'
        }));
      }

      // Get index statistics from Pinecone
      let indexStats = null;
      try {
        indexStats = await describeIndexStats();
      } catch (statsError) {
        logger.warn('Could not get index stats:', statsError.message);
        // Continue even if stats fail
      }

      // Get list of files and their indexed status
      const ragsDir = path.join(__dirname, '../uploads/rags');
      let files = [];
      let indexedNamespaces = [];

      try {
        await fs.access(ragsDir);
        const fileList = await fs.readdir(ragsDir);
        const pdfFiles = fileList.filter(file => path.extname(file).toLowerCase() === '.pdf');
        const fileNamesWithoutExt = pdfFiles.map(file => path.basename(file, path.extname(file)));
        
        // Get indexed namespaces
        indexedNamespaces = await ragServices.getIndexedNamespaces(fileNamesWithoutExt);

        // Get file details
        files = await Promise.all(
          pdfFiles.map(async (filename) => {
            const filePath = path.join(ragsDir, filename);
            const stats = await fs.stat(filePath);
            const fileNameWithoutExt = path.basename(filename, path.extname(filename));
            
            return {
              filename,
              size: stats.size,
              uploadedAt: stats.birthtime.toISOString(),
              indexed: indexedNamespaces.includes(fileNameWithoutExt),
              namespace: fileNameWithoutExt
            };
          })
        );
      } catch (dirError) {
        logger.warn('Could not read files directory:', dirError.message);
        // Continue even if directory doesn't exist
      }

      // Prepare response
      const modelInfo = {
        indexName: PINECONE_INDEX,
        indexStats: indexStats ? {
          totalVectors: indexStats.totalRecordCount || 0,
          dimension: indexStats.dimension || 3072,
          namespaces: indexStats.namespaces ? Object.keys(indexStats.namespaces).length : 0,
          namespaceStats: indexStats.namespaces || {}
        } : null,
        files: {
          total: files.length,
          indexed: indexedNamespaces.length,
          notIndexed: files.length - indexedNamespaces.length,
          list: files
        },
        summary: {
          totalFiles: files.length,
          indexedFiles: indexedNamespaces.length,
          totalVectors: indexStats?.totalRecordCount || 0,
          totalNamespaces: indexStats?.namespaces ? Object.keys(indexStats.namespaces).length : indexedNamespaces.length
        }
      };

      logger.info(`Model stats retrieved: ${modelInfo.summary.indexedFiles} indexed files, ${modelInfo.summary.totalVectors} total vectors`);

      res.json(successResponse('Model statistics retrieved successfully', modelInfo));

    } catch (error) {
      logger.error('Error getting model stats:', error);
      res.status(500).json(errorResponse('Failed to get model statistics', 500, {
        error: error.message
      }));
    }
  }
}

// Export both controller instance and multer middleware
const ragControllerInstance = new RAGController();

module.exports = {
  controller: ragControllerInstance,
  upload: upload.array('files', 20) // Support up to 20 files, field name: 'files'
};

