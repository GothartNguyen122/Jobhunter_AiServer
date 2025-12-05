const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const chatControllerWithResume = require('../controllers/chatControllerWithResume');
const realtimeService = require('../services/realtimeService');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: Chat and conversation management endpoints
 */

/**
 * @swagger
 * /api/v1/chat/{chatboxId}/message:
 *   post:
 *     summary: Send message to chatbox
 *     description: Send a message to a specific chatbox and get AI response. Supports both regular messages and messages with extracted resume data.
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatboxId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chatbox ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: User message
 *               user:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   role:
 *                     type: string
 *               sessionInfo:
 *                 type: object
 *               hasExtractedData:
 *                 type: boolean
 *                 description: Set to true if message includes extracted resume data
 *               extractedData:
 *                 type: object
 *                 description: Extracted resume data (required if hasExtractedData is true)
 *     responses:
 *       200:
 *         description: Message processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     chatboxId:
 *                       type: string
 *                     conversationId:
 *                       type: string
 *                     processingTime:
 *                       type: number
 */
router.post('/:chatboxId/message', (req, res) => {
  console.log('req.body:', req.body);
  return req.body?.hasExtractedData
    ? chatControllerWithResume.sendMessage(req, res)
    : chatController.sendMessage(req, res);
});

/**
 * @swagger
 * /api/v1/chat/{chatboxId}/history:
 *   get:
 *     summary: Get conversation history
 *     description: Retrieve conversation history for a specific chatbox
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatboxId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation history retrieved successfully
 */
router.get('/:chatboxId/history', chatController.getConversationHistory);

/**
 * @swagger
 * /api/v1/chat/{chatboxId}/session/current:
 *   get:
 *     summary: Get current session
 *     description: Get current conversation session for a chatbox
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatboxId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current session retrieved successfully
 */
router.get('/:chatboxId/session/current', (req, res) => {
  return chatController.getConversationHistory(req, res);
});

/**
 * @swagger
 * /api/v1/chat/{chatboxId}/history:
 *   delete:
 *     summary: Clear conversation history
 *     description: Clear conversation history for a specific chatbox
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatboxId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation history cleared successfully
 */
router.delete('/:chatboxId/history', chatController.clearConversationHistory);

/**
 * @swagger
 * /api/v1/chat/{chatboxId}/session/clear:
 *   post:
 *     summary: Clear user session
 *     description: Clear user session for logout
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: chatboxId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               role:
 *                 type: string
 *               conversationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User session cleared successfully
 */
router.post('/:chatboxId/session/clear', chatController.clearUserSession);

/**
 * @swagger
 * /api/v1/chat/conversations:
 *   get:
 *     summary: Get all conversations
 *     description: Retrieve all conversations from Supabase
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 */
router.get('/conversations', chatController.getAllConversations);
/**
 * @swagger
 * /api/v1/chat/conversations/realtime:
 *   get:
 *     summary: Realtime conversation updates (SSE)
 *     description: Server-Sent Events endpoint for real-time conversation updates
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: SSE connection established
 */
router.get('/conversations/realtime', (req, res) => {
  const clientId = uuidv4();
  realtimeService.addClient(clientId, res);
  
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeatInterval);
      realtimeService.removeClient(clientId);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    realtimeService.removeClient(clientId);
  });
});

/**
 * @swagger
 * /api/v1/chat/conversations/{conversationId}:
 *   get:
 *     summary: Get conversation by ID
 *     description: Retrieve a specific conversation by its ID
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
 *       404:
 *         description: Conversation not found
 */
router.get('/conversations/:conversationId', chatController.getConversationById);

/**
 * @swagger
 * /api/v1/chat/conversations/user/{username}:
 *   get:
 *     summary: Get conversations by username
 *     description: Retrieve all conversations for a specific username
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 */
router.get('/conversations/user/:username', chatController.getConversationsByUsername);

/**
 * @swagger
 * /api/v1/chat/conversations/role/{role}:
 *   get:
 *     summary: Get conversations by role
 *     description: Retrieve all conversations for a specific role
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 */
router.get('/conversations/role/:role', chatController.getConversationsByRole);

/**
 * @swagger
 * /api/v1/chat/conversations/{conversationId}:
 *   delete:
 *     summary: Delete conversation
 *     description: Delete a conversation by its ID
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 */
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
