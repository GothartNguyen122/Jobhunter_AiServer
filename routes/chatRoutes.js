const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Send message to specific chatbox
router.post('/:chatboxId/message', chatController.sendMessage);

// Get conversation history for specific chatbox
router.get('/:chatboxId/history', chatController.getConversationHistory);

// Clear conversation history for specific chatbox
router.delete('/:chatboxId/history', chatController.clearConversationHistory);

// Legacy endpoints for backward compatibility
router.post('/', chatController.sendMessage); // Legacy POST /api/v1/AiServer
router.get('/history', chatController.getConversationHistory); // Legacy GET /api/v1/AiServer/history
router.delete('/history', chatController.clearConversationHistory); // Legacy DELETE /api/v1/AiServer/history

module.exports = router;
