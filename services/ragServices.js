const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const config = require('../config');
const { getIndex, isPineconeAvailable, initializeIndex, PINECONE_INDEX, PINECONE_DEFAULT_NAMESPACE } = require('../config/pinecone');
const logger = require('../utils/logger');
const namespaceManager = require('../utils/namespaceManager');

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
 * @param {Array<Object>} embeddings - Array of objects with embedding and chunk: [{embedding: [vector], chunk: "text", ...metadata}, ...]
 * @param {string} namespace - Namespace in Pinecone (default: from config)
 * @param {string} indexName - Index name (default: from config)
 * @param {number} startIdIndex - Starting index for chunk IDs (default: 0)
 * @returns {Promise<Object>} Object with stored count and details
 */
async function storeEmbeddings(embeddings, namespace = PINECONE_DEFAULT_NAMESPACE, indexName = PINECONE_INDEX, startIdIndex ) {
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
        const vectors = batch.map((item, batchIndex) => {
          const globalIndex = startIdIndex + i + batchIndex;
          // Build metadata object - include chunk and any additional metadata from item
          const metadata = { 
            chunk: item.chunk,             // Store original text in metadata
            chunkIndex: globalIndex       // Store global index for reference
          };
          
          // Add any additional metadata fields (e.g., filename, source, etc.)
          if (item.filename) metadata.filename = item.filename;
          if (item.source) metadata.source = item.source;
          // Copy any other custom metadata fields
          Object.keys(item).forEach(key => {
            if (key !== 'embedding' && key !== 'chunk' && !metadata[key]) {
              metadata[key] = item[key];
            }
          });

          return {
            id: `chunk-${globalIndex}`,  // Unique ID: chunk-0, chunk-1, ...
            values: item.embedding,          // Vector array (3072 dimensions)
            metadata
          };
        });

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

/**
 * Retrieve contextual chunks from Pinecone vector database and return an answer string
 * @param {string} queryText - User query to embed and search with
 * @param {Object} options - Optional settings such as namespace/index overrides
 * @returns {Promise<string>} Answer generated strictly from retrieved context
 */
async function generateAnswerFromChunks(question, chunks, {
  llmModel = 'gpt-4o-mini',
  temperature = 0.2,
  maxTokens = 512
} = {}) {
  const context = chunks.join('\n\n').trim();
  const systemMessage = 'You are an AI that answers questions strictly based on the provided context. If the context does not contain enough information, respond with "I do not have enough info to answer this question."';
  const userMessage = `Context: ${context}\n\nQuestion: ${question.trim()}`;

  try {
    const completion = await openai.chat.completions.create({
      model: llmModel,
      temperature: Number.isFinite(temperature) ? temperature : 0.2,
      max_tokens: parseInt(maxTokens, 10) || 512,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ]
    });

    return completion?.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    logger.error('Failed to generate answer from chunks:', error);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
}

async function retrieveContextFromVector(queryText, options = {}) {
  if (!isPineconeAvailable()) {
    throw new Error('Pinecone is not configured. Please set PINECONE_API_KEY in .env');
  }

  if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) {
    throw new Error('A non-empty query/question string is required.');
  }

  const {
    namespace: namespaceOption,
    indexName: indexNameOption,
    topK: topKOption,
    embeddingModel = 'text-embedding-3-large',
    llmModel = 'gpt-4o-mini',
    temperature = 0.2,
    maxTokens = 512
  } = options;

  // Get namespace from option, storage file, or env (in that order)
  let namespace = namespaceOption;
  if (!namespace) {
    // Try to get from storage file
    try {
      namespace = await namespaceManager.getNamespace();
    } catch (error) {
      logger.debug('Could not get namespace from storage, using env fallback:', error.message);
    }
  }
  
  // Fallback to env if still not found
  if (!namespace) {
    namespace = PINECONE_DEFAULT_NAMESPACE || 'default';
  }
  
  namespace = namespace.trim();
  if (!namespace) {
    throw new Error('Namespace is required. Provide namespace in options, storage file, or configure PINECONE_NAMESPACE.');
  }

  const indexName = (indexNameOption || PINECONE_INDEX || '').trim();
  if (!indexName) {
    throw new Error('Index name is required. Provide indexName in options or configure PINECONE_INDEX.');
  }

  let topK = typeof topKOption === 'number' ? topKOption : parseInt(topKOption || 5, 10);
  if (Number.isNaN(topK) || topK <= 0) {
    topK = 5;
  }
  topK = Math.min(Math.max(topK, 1), 20);

  await ensureIndexExists(indexName, 3072);

  const namespaceExists = await checkNamespaceExists(namespace, indexName);
  if (!namespaceExists) {
    throw new Error(`Namespace "${namespace}" does not exist in Pinecone index "${indexName}".`);
  }
  console.log("queryText:"+ queryText);
  let queryVector;
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: embeddingModel,
      input: queryText.trim()
    });
    queryVector = embeddingResponse.data[0].embedding;
  } catch (error) {
    logger.error('Failed to create embedding for query:', error);
    throw new Error(`Failed to create embedding for query: ${error.message}`);
  }

  const index = getIndex(indexName);

  let pineconeResponse;
  try {
    pineconeResponse = await index.namespace(namespace).query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      includeValues: false
    });
  } catch (error) {
    logger.error('Failed to query Pinecone for context:', error);
    throw new Error(`Failed to query Pinecone: ${error.message}`);
  }

  const matches = Array.isArray(pineconeResponse?.matches) ? pineconeResponse.matches : [];
  const segments = matches
    .map(match => match?.metadata?.chunk)
    .filter(chunk => typeof chunk === 'string' && chunk.trim().length > 0);

  if (segments.length === 0) {
    return 'I do not have enough info to answer this question.';
  }

  return generateAnswerFromChunks(queryText, segments, {
    llmModel,
    temperature,
    maxTokens
  });
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
  processPDFWithEmbeddings,
  retrieveContextFromVector,
  generateAnswerFromChunks
};

