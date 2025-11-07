const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const chatControllerWithResume = require('../controllers/chatControllerWithResume');

// Send message to specific chatbox
router.post('/:chatboxId/message', (req, res) => {
  console.log('req.body:', req.body);
  return req.body?.hasExtractedData
    ? chatControllerWithResume.sendMessage(req, res)
    : chatController.sendMessage(req, res);
});

// Get conversation history for specific chatbox
router.get('/:chatboxId/history', chatController.getConversationHistory);

// Session management endpoints
router.get('/:chatboxId/session/current', (req, res) => {
  // proxy through controller methods if needed later
  return chatController.getConversationHistory(req, res);
});
// End session can be proxied via delete history semantics or explicit endpoint in future

// Clear conversation history for specific chatbox
router.delete('/:chatboxId/history', chatController.clearConversationHistory);

// Clear user session (for logout)
router.post('/:chatboxId/session/clear', chatController.clearUserSession);

// Supabase conversation management endpoints
router.get('/conversations', chatController.getAllConversations);
router.get('/conversations/:conversationId', chatController.getConversationById);
router.get('/conversations/user/:username', chatController.getConversationsByUsername);
router.get('/conversations/role/:role', chatController.getConversationsByRole);
router.delete('/conversations/:conversationId', chatController.deleteConversation);

// Legacy endpoints for backward compatibility
router.post('/', (req, res) => { // Legacy POST /api/v1/AiServer
  if (req.body && req.body.hasExtractedData) {
    return chatControllerWithResume.sendMessage(req, res);
  }
  return chatController.sendMessage(req, res);
});
router.get('/history', chatController.getLegacyConversationHistory); // Legacy GET /api/v1/AiServer/history
router.delete('/history', chatController.clearConversationHistory); // Legacy DELETE /api/v1/AiServer/history

module.exports = router;
