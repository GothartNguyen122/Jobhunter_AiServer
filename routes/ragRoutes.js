const express = require('express');
const router = express.Router();
const { controller: ragController, upload } = require('../controllers/ragController');

/**
 * @swagger
 * tags:
 *   - name: RAG
 *     description: RAG (Retrieval-Augmented Generation) management endpoints for admin
 */

/**
 * @swagger
 * /admin/chatbox-admin/rag/upload:
 *   post:
 *     summary: Upload file for RAG processing
 *     description: Upload a PDF file for RAG processing and embedding generation
 *     tags: [RAG]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 */
router.post('/upload', upload, (req, res) => {
  ragController.uploadFile(req, res);
});

/**
 * @swagger
 * /admin/chatbox-admin/rag/files:
 *   get:
 *     summary: Get list of uploaded RAG files
 *     description: Retrieve a list of all uploaded RAG files
 *     tags: [RAG]
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 */
router.get('/files', (req, res) => {
  ragController.getFiles(req, res);
});

/**
 * @swagger
 * /admin/chatbox-admin/rag/files/{filename}:
 *   delete:
 *     summary: Delete a RAG file
 *     description: Delete an uploaded RAG file
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
router.delete('/files/:filename', (req, res) => {
  ragController.deleteFile(req, res);
});

/**
 * @swagger
 * /admin/chatbox-admin/rag/train:
 *   post:
 *     summary: Train RAG model
 *     description: Process all uploaded files and store embeddings in Pinecone vector database
 *     tags: [RAG]
 *     responses:
 *       200:
 *         description: Model trained successfully
 */
router.post('/train', (req, res) => {
  ragController.trainModel(req, res);
});

/**
 * @swagger
 * /admin/chatbox-admin/rag/sync:
 *   post:
 *     summary: Sync vector store
 *     description: Check which files are indexed in Pinecone vector database
 *     tags: [RAG]
 *     responses:
 *       200:
 *         description: Vector store synced successfully
 */
router.post('/sync', (req, res) => {
  ragController.syncVectorStore(req, res);
});

/**
 * @swagger
 * /admin/chatbox-admin/rag/model:
 *   get:
 *     summary: Get model statistics
 *     description: Get information about trained model from Pinecone
 *     tags: [RAG]
 *     responses:
 *       200:
 *         description: Model statistics retrieved successfully
 */
router.get('/model', (req, res) => {
  ragController.getModelStats(req, res);
});

module.exports = router;

