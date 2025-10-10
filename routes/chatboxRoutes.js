const express = require('express');
const router = express.Router();
const chatboxController = require('../controllers/chatboxController');

// Get all chatboxes
router.get('/', chatboxController.getAllChatboxes);

// Get chatbox by ID
router.get('/:id', chatboxController.getChatboxById);

// Create new chatbox
router.post('/', chatboxController.createChatbox);

// Update chatbox
router.put('/:id', chatboxController.updateChatbox);

// Delete chatbox
router.delete('/:id', chatboxController.deleteChatbox);

// Toggle chatbox enabled/disabled
router.patch('/:id/toggle', chatboxController.toggleChatbox);

// Get chatbox status
router.get('/:id/status', chatboxController.getChatboxStatus);

module.exports = router;
