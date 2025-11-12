const fs = require('fs').promises;
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const OpenAI = require('openai');
const config = require('../config');
const { getIndex, isPineconeAvailable, initializeIndex, PINECONE_INDEX, PINECONE_DEFAULT_NAMESPACE } = require('../config/pinecone');
const logger = require('../utils/logger');

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * RAG Services
 * Internal functions for processing PDF files, text chunking, and embeddings
 */

/**
 * Extract plain text from PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<string>} Plain text content extracted from PDF
 */
async function extractTextFromPDF(filePath) {
  try {
    // Read PDF file as buffer
    const dataBuffer = await fs.readFile(filePath);
    
    // Convert Buffer to Uint8Array as required by pdfjs-dist
    const uint8Array = new Uint8Array(dataBuffer);
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    
    const numPages = pdfDocument.numPages;
    const textContents = [];
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      textContents.push(pageText);
    }
    
    // Join all pages with newline
    const fullText = textContents.join('\n\n');
    
    return fullText;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Split text into chunks with overlap
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Size of each chunk in characters (default: 1000)
 * @param {number} overlapSize - Overlap size between chunks in characters (default: 200)
 * @returns {Array<string>} Array of text chunks
 */
function chunkText(text, chunkSize , overlapSize ) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Remove extra whitespace and normalize
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  if (normalizedText.length === 0) {
    return [];
  }
  
  const chunks = [];
  let start = 0;
  
  while (start < normalizedText.length) {
    const end = start + chunkSize;
    const chunk = normalizedText.slice(start, end).trim();
    
    // Only add non-empty chunks
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Move forward by chunkSize minus overlap
    start += chunkSize - overlapSize;
    
    // Prevent infinite loop if overlapSize >= chunkSize
    if (overlapSize >= chunkSize) {
      start += 1;
    }
  }
  
  return chunks;
}

/**
 * Create embeddings for text chunks using OpenAI
 * @param {Array<string>} textChunks - Array of text chunks to embed
 * @param {string} model - OpenAI embedding model (default: 'text-embedding-3-large')
 * @returns {Promise<Array<Object>>} Array of objects with embedding and chunk: [{embedding: [vector], chunk: "text"}, ...]
 */
async function createEmbeddings(textChunks, model = 'text-embedding-3-large') {
  if (!textChunks || !Array.isArray(textChunks) || textChunks.length === 0) {
    return [];
  }
  const embeddingsDataArr = [];
  // Process each chunk to create embedding
  for (const chunk of textChunks) {
    try {
      if (!chunk || typeof chunk !== 'string' || chunk.trim().length === 0) {
        continue; // Skip empty chunks
      }
      // Call OpenAI API to create embedding
      const response = await openai.embeddings.create({
        model: model,
        input: chunk.trim(),
      });
      // Extract embedding vector from response
      const embedding = response.data[0].embedding;
      // Store embedding with original chunk
      embeddingsDataArr.push({
        embedding,  // Array of numbers (vector) - 3072 dimensions for text-embedding-3-large
        chunk       // Original text chunk
      });
    } catch (error) {
      // Log error but continue with other chunks
      console.error(`Error creating embedding for chunk: ${error.message}`);
      // Optionally, you can throw error to stop processing
      // throw new Error(`Failed to create embedding: ${error.message}`);
    }
  }
  return embeddingsDataArr;
}

/**
 * Process PDF file: extract text and chunk it
 * @param {string} filePath - Path to the PDF file
 * @param {number} chunkSize - Size of each chunk (default: 1000)
 * @param {number} overlapSize - Overlap size between chunks (default: 200)
 * @returns {Promise<Object>} Object containing extracted text and chunks
 */
async function processPDF(filePath, chunkSize , overlapSize ) {
  try {
    // Extract text from PDF
    const text = await extractTextFromPDF(filePath);
    
    // Chunk the text
    const chunks = chunkText(text, chunkSize, overlapSize);
    
    return {
      text,
      chunks,
      chunkCount: chunks.length,
      textLength: text.length
    };
  } catch (error) {
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
}

/**
 * Store embeddings in Pinecone Vector Database
 * @param {Array<Object>} embeddings - Array of objects with embedding and chunk: [{embedding: [vector], chunk: "text"}, ...]
 * @param {string} namespace - Namespace in Pinecone (default: from config)
 * @param {string} indexName - Index name (default: from config)
 * @returns {Promise<Object>} Object with stored count and details
 */
async function storeEmbeddings(embeddings, namespace = PINECONE_DEFAULT_NAMESPACE, indexName = PINECONE_INDEX) {
  if (!isPineconeAvailable()) {
    throw new Error('Pinecone is not configured. Please set PINECONE_API_KEY in .env');
  }

  if (!embeddings || !Array.isArray(embeddings) || embeddings.length === 0) {
    throw new Error('Embeddings array is required and must not be empty');
  }

  try {
    const index = getIndex(indexName);
    let storedCount = 0;
    const errors = [];

    // Process embeddings in batches for better performance
    const batchSize = 100; // Pinecone supports up to 100 vectors per upsert

    for (let i = 0; i < embeddings.length; i += batchSize) {
      const batch = embeddings.slice(i, i + batchSize);
      
      try {
        // Prepare vectors for Pinecone
        const vectors = batch.map((item, batchIndex) => ({
          id: `chunk-${i + batchIndex}`,  // Unique ID: chunk-0, chunk-1, ...
          values: item.embedding,          // Vector array (3072 dimensions)
          metadata: { 
            chunk: item.chunk,             // Store original text in metadata
            chunkIndex: i + batchIndex     // Store index for reference
          }
        }));

        // Upsert vectors to Pinecone namespace
        await index.namespace(namespace).upsert(vectors);
        storedCount += vectors.length;

        logger.info(`Stored ${vectors.length} embeddings to Pinecone (batch ${Math.floor(i / batchSize) + 1})`);
      } catch (batchError) {
        logger.error(`Error storing batch ${Math.floor(i / batchSize) + 1}:`, batchError.message);
        errors.push({
          batch: Math.floor(i / batchSize) + 1,
          error: batchError.message
        });
      }
    }

    return {
      storedCount,
      totalCount: embeddings.length,
      namespace,
      indexName,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    logger.error('Error storing embeddings to Pinecone:', error);
    throw new Error(`Failed to store embeddings: ${error.message}`);
  }
}

/**
 * Check if Pinecone index exists, create if not
 * This function uses initializeIndex from pinecone config which handles checking and creating automatically
 * @param {string} indexName - Index name (default: from config)
 * @param {number} dimension - Vector dimension (default: 3072 for text-embedding-3-large)
 * @returns {Promise<boolean>} True if index exists or was created
 */
async function ensureIndexExists(indexName = PINECONE_INDEX, dimension = 3072) {
  if (!isPineconeAvailable()) {
    throw new Error('Pinecone is not configured. Please set PINECONE_API_KEY in .env');
  }

  // Check if indexName is provided
  const finalIndexName = indexName || PINECONE_INDEX;
  if (!finalIndexName) {
    throw new Error('Pinecone index name is required. Please set PINECONE_INDEX in .env');
  }

  try {
    // Use initializeIndex which automatically checks if index exists and creates if not
    return await initializeIndex(finalIndexName, dimension);
  } catch (error) {
    logger.error('Error ensuring Pinecone index exists:', error);
    throw new Error(`Failed to ensure index exists: ${error.message}`);
  }
}

/**
 * Check if a namespace exists in Pinecone (has data)
 * @param {string} namespace - Namespace to check
 * @param {string} indexName - Index name (default: from config)
 * @returns {Promise<boolean>} True if namespace exists and has data
 */
async function checkNamespaceExists(namespace, indexName = PINECONE_INDEX) {
  if (!isPineconeAvailable()) {
    return false;
  }

  if (!namespace) {
    return false;
  }

  try {
    const index = getIndex(indexName);
    
    // Try to query the namespace with a dummy vector to check if it has data
    // We use a zero vector of correct dimension (3072 for text-embedding-3-large)
    const dummyVector = new Array(3072).fill(0);
    
    const result = await index.namespace(namespace).query({
      vector: dummyVector,
      topK: 1,
      includeMetadata: false,
      includeValues: false
    });

    // If we get any matches, namespace exists
    return result.matches && result.matches.length > 0;
  } catch (error) {
    // If namespace doesn't exist, query will throw an error
    logger.debug(`Namespace "${namespace}" check failed: ${error.message}`);
    return false;
  }
}

/**
 * Get list of indexed namespaces from Pinecone
 * Note: Pinecone doesn't provide a direct API to list namespaces, so we check against known files
 * @param {Array<string>} fileNames - Array of file names (without extension) to check
 * @param {string} indexName - Index name (default: from config)
 * @returns {Promise<Array<string>>} Array of namespace names that exist in Pinecone
 */
async function getIndexedNamespaces(fileNames, indexName = PINECONE_INDEX) {
  if (!isPineconeAvailable()) {
    return [];
  }

  const indexedNamespaces = [];
  
  for (const fileName of fileNames) {
    const namespace = fileName; // Namespace is filename without extension
    const exists = await checkNamespaceExists(namespace, indexName);
    if (exists) {
      indexedNamespaces.push(namespace);
    }
  }

  return indexedNamespaces;
}

/**
 * Process PDF and create embeddings: extract text, chunk, and create embeddings
 * @param {string} filePath - Path to the PDF file
 * @param {number} chunkSize - Size of each chunk (default: 1000)
 * @param {number} overlapSize - Overlap size between chunks (default: 200)
 * @param {string} embeddingModel - OpenAI embedding model (default: 'text-embedding-3-large')
 * @returns {Promise<Object>} Object containing text, chunks, and embeddings
 */
async function processPDFWithEmbeddings(filePath, chunkSize, overlapSize, embeddingModel) {
  try {
    // Extract text and chunk
    const { text, chunks, chunkCount, textLength } = await processPDF(filePath, chunkSize, overlapSize);
    
    // Create embeddings for chunks
    const embeddings = await createEmbeddings(chunks, embeddingModel);
    
    return {
      text,
      chunks,
      embeddings,
      chunkCount: chunks.length,
      embeddingCount: embeddings.length,
      textLength
    };
  } catch (error) {
    throw new Error(`Failed to process PDF with embeddings: ${error.message}`);
  }
}

// Export functions for internal use within this service
// These functions can be used by other modules that import this service
module.exports = {
  extractTextFromPDF,
  chunkText,
  createEmbeddings,
  storeEmbeddings,
  ensureIndexExists,
  checkNamespaceExists,
  getIndexedNamespaces,
  processPDF,
  processPDFWithEmbeddings
};

