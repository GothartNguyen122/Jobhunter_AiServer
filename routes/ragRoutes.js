const express = require('express');
const router = express.Router();
const { controller: ragController, upload } = require('../controllers/ragController');

// Upload file for RAG processing
// POST /admin/chatbox-admin/rag/upload
router.post('/upload', upload, (req, res) => {
  ragController.uploadFile(req, res);
});

// Get list of uploaded RAG files
// GET /admin/chatbox-admin/rag/files
router.get('/files', (req, res) => {
  ragController.getFiles(req, res);
});

// Delete a RAG file
// DELETE /admin/chatbox-admin/rag/files/:filename
router.delete('/files/:filename', (req, res) => {
  ragController.deleteFile(req, res);
});

// Train RAG model - Process all uploaded files and store embeddings in Pinecone
// POST /admin/chatbox-admin/rag/train
router.post('/train', (req, res) => {
  ragController.trainModel(req, res);
});

// Sync vector store - Check which files are indexed in Pinecone
// POST /admin/chatbox-admin/rag/sync
router.post('/sync', (req, res) => {
  ragController.syncVectorStore(req, res);
});

module.exports = router;

