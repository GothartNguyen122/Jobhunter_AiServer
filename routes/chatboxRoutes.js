const express = require('express');
const router = express.Router();
const chatboxController = require('../controllers/chatboxController');

/**
 * @swagger
 * tags:
 *   - name: Chatboxes
 *     description: Chatbox management endpoints
 */

/**
 * @swagger
 * /api/v1/chatboxes:
 *   get:
 *     summary: Get all chatboxes
 *     description: Retrieve a list of all available chatboxes
 *     tags: [Chatboxes]
 *     responses:
 *       200:
 *         description: Successfully retrieved chatboxes
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       enabled:
 *                         type: boolean
 */
router.get('/', chatboxController.getAllChatboxes);

/**
 * @swagger
 * /api/v1/chatboxes/{id}:
 *   get:
 *     summary: Get chatbox by ID
 *     description: Retrieve a specific chatbox by its ID
 *     tags: [Chatboxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Chatbox ID
 *     responses:
 *       200:
 *         description: Successfully retrieved chatbox
 *       404:
 *         description: Chatbox not found
 */
router.get('/:id', chatboxController.getChatboxById);

/**
 * @swagger
 * /api/v1/chatboxes:
 *   post:
 *     summary: Create a new chatbox
 *     description: Create a new chatbox with specified configuration
 *     tags: [Chatboxes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               systemPromptId:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Chatbox created successfully
 */
router.post('/', chatboxController.createChatbox);

/**
 * @swagger
 * /api/v1/chatboxes/{id}:
 *   put:
 *     summary: Update chatbox
 *     description: Update an existing chatbox
 *     tags: [Chatboxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Chatbox updated successfully
 */
router.put('/:id', chatboxController.updateChatbox);

/**
 * @swagger
 * /api/v1/chatboxes/{id}:
 *   delete:
 *     summary: Delete chatbox
 *     description: Delete a chatbox by ID
 *     tags: [Chatboxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chatbox deleted successfully
 */
router.delete('/:id', chatboxController.deleteChatbox);

/**
 * @swagger
 * /api/v1/chatboxes/{id}/toggle:
 *   patch:
 *     summary: Toggle chatbox enabled/disabled
 *     description: Enable or disable a chatbox
 *     tags: [Chatboxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chatbox status toggled successfully
 */
router.patch('/:id/toggle', chatboxController.toggleChatbox);

/**
 * @swagger
 * /api/v1/chatboxes/{id}/status:
 *   get:
 *     summary: Get chatbox status
 *     description: Get the current status of a chatbox
 *     tags: [Chatboxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chatbox status retrieved successfully
 */
router.get('/:id/status', chatboxController.getChatboxStatus);

module.exports = router;
