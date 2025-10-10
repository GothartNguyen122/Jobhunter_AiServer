const database = require('../config/database');
const { successResponse, errorResponse, notFoundResponse, validationErrorResponse } = require('../utils/response');
const { validateChatboxData, sanitizeObject } = require('../utils/validation');
const logger = require('../utils/logger');

class ChatboxController {
  // Get all chatboxes
  async getAllChatboxes(req, res) {
    try {
      logger.info('Getting all chatboxes');
      const chatboxes = database.getAllChatboxes();
      
      logger.success(`Retrieved ${chatboxes.length} chatboxes`);
      res.json(successResponse('Chatboxes retrieved successfully', chatboxes));
    } catch (error) {
      logger.error('Error getting all chatboxes', error);
      res.status(500).json(errorResponse('Failed to retrieve chatboxes', 500));
    }
  }

  // Get chatbox by ID
  async getChatboxById(req, res) {
    try {
      const { id } = req.params;
      logger.info(`Getting chatbox: ${id}`);
      
      const chatbox = database.getChatboxById(id);
      if (!chatbox) {
        logger.warn(`Chatbox not found: ${id}`);
        return res.status(404).json(notFoundResponse('Chatbox not found'));
      }

      logger.success(`Retrieved chatbox: ${id}`);
      res.json(successResponse('Chatbox retrieved successfully', chatbox));
    } catch (error) {
      logger.error('Error getting chatbox by ID', error);
      res.status(500).json(errorResponse('Failed to retrieve chatbox', 500));
    }
  }

  // Create new chatbox
  async createChatbox(req, res) {
    try {
      const chatboxData = sanitizeObject(req.body);
      logger.info('Creating new chatbox', chatboxData);

      // Validate chatbox data
      const validation = validateChatboxData(chatboxData);
      if (!validation.isValid) {
        logger.warn('Invalid chatbox data', validation.errors);
        return res.status(400).json(validationErrorResponse('Invalid chatbox data', validation.errors));
      }

      const chatbox = database.createChatbox(chatboxData);
      logger.success(`Created chatbox: ${chatbox.id}`);
      
      res.status(201).json(successResponse('Chatbox created successfully', chatbox, 201));
    } catch (error) {
      logger.error('Error creating chatbox', error);
      res.status(500).json(errorResponse('Failed to create chatbox', 500));
    }
  }

  // Update chatbox
  async updateChatbox(req, res) {
    try {
      const { id } = req.params;
      const updateData = sanitizeObject(req.body);
      logger.info(`Updating chatbox: ${id}`, updateData);

      // Validate update data
      const validation = validateChatboxData(updateData);
      if (!validation.isValid) {
        logger.warn('Invalid update data', validation.errors);
        return res.status(400).json(validationErrorResponse('Invalid update data', validation.errors));
      }

      const chatbox = database.updateChatbox(id, updateData);
      if (!chatbox) {
        logger.warn(`Chatbox not found for update: ${id}`);
        return res.status(404).json(notFoundResponse('Chatbox not found'));
      }

      logger.success(`Updated chatbox: ${id}`);
      res.json(successResponse('Chatbox updated successfully', chatbox));
    } catch (error) {
      logger.error('Error updating chatbox', error);
      res.status(500).json(errorResponse('Failed to update chatbox', 500));
    }
  }

  // Delete chatbox
  async deleteChatbox(req, res) {
    try {
      const { id } = req.params;
      logger.info(`Deleting chatbox: ${id}`);

      const deleted = database.deleteChatbox(id);
      if (!deleted) {
        logger.warn(`Chatbox not found for deletion: ${id}`);
        return res.status(404).json(notFoundResponse('Chatbox not found'));
      }

      logger.success(`Deleted chatbox: ${id}`);
      res.json(successResponse('Chatbox deleted successfully'));
    } catch (error) {
      logger.error('Error deleting chatbox', error);
      res.status(500).json(errorResponse('Failed to delete chatbox', 500));
    }
  }

  // Toggle chatbox enabled/disabled
  async toggleChatbox(req, res) {
    try {
      const { id } = req.params;
      logger.info(`Toggling chatbox: ${id}`);

      const chatbox = database.toggleChatbox(id);
      if (!chatbox) {
        logger.warn(`Chatbox not found for toggle: ${id}`);
        return res.status(404).json(notFoundResponse('Chatbox not found'));
      }

      const status = chatbox.enabled ? 'enabled' : 'disabled';
      logger.success(`Toggled chatbox: ${id} - ${status}`);
      res.json(successResponse(`Chatbox ${status} successfully`, chatbox));
    } catch (error) {
      logger.error('Error toggling chatbox', error);
      res.status(500).json(errorResponse('Failed to toggle chatbox', 500));
    }
  }

  // Get chatbox status
  async getChatboxStatus(req, res) {
    try {
      const { id } = req.params;
      logger.info(`Getting chatbox status: ${id}`);

      const chatbox = database.getChatboxById(id);
      if (!chatbox) {
        logger.warn(`Chatbox not found: ${id}`);
        return res.status(404).json(notFoundResponse('Chatbox not found'));
      }

      const status = {
        id: chatbox.id,
        name: chatbox.name,
        enabled: chatbox.enabled,
        lastUpdated: chatbox.updatedAt
      };

      logger.success(`Retrieved chatbox status: ${id} - ${chatbox.enabled ? 'enabled' : 'disabled'}`);
      res.json(successResponse('Chatbox status retrieved successfully', status));
    } catch (error) {
      logger.error('Error getting chatbox status', error);
      res.status(500).json(errorResponse('Failed to get chatbox status', 500));
    }
  }
}

module.exports = new ChatboxController();
