const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// 30 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

// Keyed by `${chatboxId}|${username}|${role}`
const sessionStore = new Map();

function buildKey(chatboxId, username, role) {
  return `${chatboxId}|${username || 'anonymous'}|${role || 'user'}`;
}

class SessionService {
  getCurrentSession(chatboxId, username, role) {
    const key = buildKey(chatboxId, username, role);
    const session = sessionStore.get(key);
    if (!session) return null;

    const isExpired = Date.now() - session.lastActivityAt > INACTIVITY_TIMEOUT_MS;
    if (isExpired) return null;
    return { ...session };
  }

  endSession(chatboxId, username, role) {
    const key = buildKey(chatboxId, username, role);
    const existed = sessionStore.delete(key);
    if (existed) {
      logger.info(`Conversation session ended for ${key}`);
    }
    return existed;
  }

  /**
   * Get or create a conversation session. If expired or missing, create a new one.
   * Returns { conversationId, isNew }
   */
  getOrCreateSession(chatboxId, username, role) {
    const key = buildKey(chatboxId, username, role);
    const now = Date.now();
    const existing = sessionStore.get(key);
    if (existing) {
      const isExpired = now - existing.lastActivityAt > INACTIVITY_TIMEOUT_MS;
      if (!isExpired) {
        // refresh last activity and return
        existing.lastActivityAt = now;
        sessionStore.set(key, existing);
        return { conversationId: existing.conversationId, isNew: false };
      }
    }

    // Create fresh session
    const newSession = {
      conversationId: uuidv4(),
      lastActivityAt: now,
    };
    sessionStore.set(key, newSession);
    logger.info(`New conversation session created for ${key} -> ${newSession.conversationId}`);
    return { conversationId: newSession.conversationId, isNew: true };
  }
}

module.exports = new SessionService();



