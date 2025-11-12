require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const logger = require('../utils/logger');

// Pinecone configuration from environment variables
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_HOST = process.env.PINECONE_HOST || process.env.PINECONE_URL;
const PINECONE_INDEX = process.env.PINECONE_INDEX ;
const PINECONE_DEFAULT_NAMESPACE = process.env.PINECONE_NAMESPACE ;

// Initialize Pinecone client
let pineconeClient = null;

if (PINECONE_API_KEY) {
  try {
    const pineconeConfig = {
      apiKey: PINECONE_API_KEY,
    };

    // Add host/url if provided
    if (PINECONE_HOST) {
      pineconeConfig.host = PINECONE_HOST;
    }

    pineconeClient = new Pinecone(pineconeConfig);
    logger.info('Pinecone client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Pinecone client:', error.message);
  }
} else {
  logger.warn('PINECONE_API_KEY not set. Pinecone features will be disabled.');
}

/**
 * Get Pinecone client instance
 * @returns {Pinecone|null} Pinecone client or null if not configured
 */
function getPineconeClient() {
  return pineconeClient;
}

/**
 * Check if Pinecone is configured and available
 * @returns {boolean} True if Pinecone is available
 */
function isPineconeAvailable() {
  return pineconeClient !== null;
}

/**
 * Get Pinecone index
 * @param {string} indexName - Name of the index (default: from env)
 * @returns {Object|null} Pinecone index or null if not available
 */
function getIndex(indexName = PINECONE_INDEX) {
  if (!isPineconeAvailable()) {
    throw new Error('Pinecone is not configured. Please set PINECONE_API_KEY in .env');
  }
  return pineconeClient.index(indexName);
}

/**
 * Check if Pinecone index exists
 * @param {string} indexName - Name of the index (default: from env)
 * @returns {Promise<Object|null>} Index object if exists, null otherwise
 */
async function checkIndexExists(indexName = PINECONE_INDEX) {
  if (!isPineconeAvailable()) {
    throw new Error('Pinecone is not configured. Please set PINECONE_API_KEY in .env');
  }

  if (!indexName) {
    throw new Error('Index name is required. Please set PINECONE_INDEX in .env');
  }

  try {
    // List all indexes
    const response = await pineconeClient.listIndexes();
    const indexes = response.indexes || [];
    
    logger.info(`Available indexes: ${indexes.map(idx => idx.name).join(', ') || 'none'}`);
    
    // Check if the desired index is in the list
    const indexExists = indexes.find(item => item.name === indexName);
    
    return indexExists || null;
  } catch (error) {
    logger.error(`Error checking if index "${indexName}" exists:`, error.message);
    throw new Error(`Failed to check index existence: ${error.message}`);
  }
}

/**
 * Create Pinecone index with dimension 3072 (for text-embedding-3-large)
 * This function will check if index exists first, and only create if it doesn't exist
 * @param {string} indexName - Name of the index (default: from env)
 * @param {number} dimension - Vector dimension (default: 3072)
 * @param {boolean} forceCreate - Force create even if index exists (default: false)
 * @returns {Promise<boolean>} True if index exists or was created successfully
 */
async function createIndex(indexName = PINECONE_INDEX, dimension = 3072, forceCreate = false) {
  if (!isPineconeAvailable()) {
    throw new Error('Pinecone is not configured. Please set PINECONE_API_KEY in .env');
  }

  if (!indexName) {
    throw new Error('Index name is required. Please set PINECONE_INDEX in .env');
  }

  try {
    // Check if index already exists
    const existingIndex = await checkIndexExists(indexName);
    
    if (existingIndex && !forceCreate) {
      logger.info(`Pinecone index "${indexName}" already exists. Skipping creation.`);
      return true;
    }

    if (existingIndex && forceCreate) {
      logger.warn(`Pinecone index "${indexName}" already exists, but forceCreate is true. This may cause an error.`);
    }

    logger.info(`Creating Pinecone index "${indexName}" with dimension ${dimension}`);
    
    await pineconeClient.createIndex({
      name: indexName,
      // should match embedding model name, e.g. 3072 for OpenAI text-embedding-3-large and 1536 for OpenAI text-embedding-ada-002
      dimension: dimension,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    logger.info(`Pinecone index "${indexName}" created successfully`);
    return true;
  } catch (error) {
    // If index already exists, that's okay
    if (error.message && error.message.includes('already exists')) {
      logger.info(`Pinecone index "${indexName}" already exists`);
      return true;
    }
    
    logger.error(`Error creating Pinecone index "${indexName}":`, error.message);
    throw new Error(`Failed to create index: ${error.message}`);
  }
}

/**
 * Initialize Pinecone index - Check if exists, create if not
 * This is a convenience function that combines checkIndexExists and createIndex
 * @param {string} indexName - Name of the index (default: from env)
 * @param {number} dimension - Vector dimension (default: 3072)
 * @returns {Promise<boolean>} True if index exists or was created successfully
 */
async function initializeIndex(indexName = PINECONE_INDEX, dimension = 3072) {
  if (!isPineconeAvailable()) {
    throw new Error('Pinecone is not configured. Please set PINECONE_API_KEY in .env');
  }

  if (!indexName) {
    throw new Error('Index name is required. Please set PINECONE_INDEX in .env');
  }

  try {
    const existingIndex = await checkIndexExists(indexName);
    
    if (existingIndex) {
      logger.info(`Pinecone index "${indexName}" already exists. No need to create.`);
      return true;
    }

    // Index doesn't exist, create it
    logger.info(`Pinecone index "${indexName}" not found. Creating new index...`);
    return await createIndex(indexName, dimension);
  } catch (error) {
    logger.error(`Error initializing Pinecone index "${indexName}":`, error.message);
    throw new Error(`Failed to initialize index: ${error.message}`);
  }
}

/**
 * Test Pinecone connection
 * @returns {Promise<boolean>} True if connection is successful
 */
async function testConnection() {
  if (!isPineconeAvailable()) {
    logger.warn('Pinecone is not configured');
    return false;
  }

  try {
    const indexes = await pineconeClient.listIndexes();
    logger.info('Pinecone connection test successful', {
      indexesCount: indexes.indexes?.length || 0
    });
    return true;
  } catch (error) {
    logger.error('Pinecone connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  getPineconeClient,
  isPineconeAvailable,
  getIndex,
  checkIndexExists,
  createIndex,
  initializeIndex,
  testConnection,
  PINECONE_INDEX,
  PINECONE_DEFAULT_NAMESPACE
};

