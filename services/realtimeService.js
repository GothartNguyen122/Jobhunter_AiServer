const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

class RealtimeService {
  constructor() {
    this.subscriptions = new Map(); // Store active SSE connections
    this.supabaseChannel = null;
    this.isSubscribed = false;
  }

  // Initialize Supabase realtime subscription
  initializeRealtimeSubscription() {
    if (this.isSubscribed) {
      logger.info('Supabase realtime subscription already initialized');
      return;
    }

    try {
      // Subscribe to changes in conversations table
      this.supabaseChannel = supabase
        .channel('conversations-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'conversations'
          },
          (payload) => {
            logger.info('Supabase realtime event received:', payload.eventType);
            this.broadcastToAllClients(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.success('✅ Supabase realtime subscription active');
            this.isSubscribed = true;
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('❌ Supabase realtime subscription error');
            this.isSubscribed = false;
          }
        });

      logger.info('Supabase realtime subscription initialized');
    } catch (error) {
      logger.error('Error initializing Supabase realtime subscription:', error);
    }
  }

  // Broadcast changes to all connected SSE clients
  broadcastToAllClients(payload) {
    // Format conversation data similar to getAllConversations format
    const conversation = payload.new || payload.old;
    let formattedData = null;

    if (conversation) {
      formattedData = {
        id: conversation.id,
        conversationId: conversation.conversation_id,
        username: conversation.username,
        role: conversation.role,
        messageCount: conversation.messages ? conversation.messages.length : 0,
        createdAt: conversation.created_at,
        lastMessage: conversation.messages && conversation.messages.length > 0 
          ? conversation.messages[conversation.messages.length - 1]?.content || '' 
          : ''
      };
    }

    const message = JSON.stringify({
      type: 'conversation_update',
      event: payload.eventType, // INSERT, UPDATE, DELETE
      data: formattedData,
      timestamp: new Date().toISOString()
    });

    let activeConnections = 0;
    this.subscriptions.forEach((client, clientId) => {
      try {
        client.write(`data: ${message}\n\n`);
        activeConnections++;
      } catch (error) {
        logger.error(`Error sending to client ${clientId}:`, error);
        // Remove dead connection
        this.subscriptions.delete(clientId);
      }
    });

    if (activeConnections > 0) {
      logger.info(`Broadcasted ${payload.eventType} update to ${activeConnections} client(s)`);
    }
  }

  // Add SSE client connection
  addClient(clientId, response) {
    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    response.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

    // Store connection
    this.subscriptions.set(clientId, response);

    logger.info(`SSE client connected: ${clientId} (Total: ${this.subscriptions.size})`);

    // Handle client disconnect
    response.on('close', () => {
      this.removeClient(clientId);
    });
  }

  // Remove SSE client connection
  removeClient(clientId) {
    if (this.subscriptions.has(clientId)) {
      this.subscriptions.delete(clientId);
      logger.info(`SSE client disconnected: ${clientId} (Total: ${this.subscriptions.size})`);
    }
  }

  // Get active connections count
  getActiveConnectionsCount() {
    return this.subscriptions.size;
  }

  // Cleanup: Unsubscribe from Supabase
  cleanup() {
    if (this.supabaseChannel) {
      supabase.removeChannel(this.supabaseChannel);
      this.supabaseChannel = null;
      this.isSubscribed = false;
      logger.info('Supabase realtime subscription cleaned up');
    }
  }
}

module.exports = new RealtimeService();

