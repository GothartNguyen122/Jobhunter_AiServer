const express = require('express');
const router = express.Router();
const hrChatController = require('../../controllers/hr/hrChatController');

/**
 * @swagger
 * tags:
 *   - name: HR Chat
 *     description: HR chatbox endpoints for resume analysis
 */

/**
 * @swagger
 * /api/v1/AiServer/hr/chat/message:
 *   post:
 *     summary: Send message to HR chatbox
 *     description: |
 *       Send a message to HR chatbox. The AI Server will automatically fetch user-job pairs from Backend API.
 *       The AI will automatically call functions to query Supabase when needed.
 *       
 *       Flow:
 *       1. Controller receives message from Frontend
 *       2. AI Server automatically fetches userJobPairs from Backend API (/api/v1/resumes)
 *       3. Builds system prompt with available user-job pairs
 *       4. Uses while True loop to handle tool calls
 *       5. AI automatically calls get_resume_info_supabase when needed
 *       6. Returns final AI response
 *     tags: [HR Chat]
 *     security:
 *       - BearerAuth: []
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
 *                 description: User message/question
 *                 example: "Cho tôi xem phân tích resume của user 1 cho job Frontend Developer"
 *               user:
 *                 type: object
 *                 description: User information (optional)
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "1"
 *                   name:
 *                     type: string
 *                     example: "HR User"
 *                   email:
 *                     type: string
 *                     example: "hr@jobhunter.com"
 *                   role:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "HR"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Message processed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       description: AI response message
 *                       example: "Dựa trên phân tích resume..."
 *                     processingTime:
 *                       type: number
 *                       description: Processing time in milliseconds
 *                       example: 1234
 *                     toolCallsCount:
 *                       type: number
 *                       description: Number of tool calls made
 *                       example: 2
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid message data"
 *       401:
 *         description: Unauthorized - Bearer token required
 *       500:
 *         description: Internal server error
 */
router.post('/message', hrChatController.sendMessage);

module.exports = router;

