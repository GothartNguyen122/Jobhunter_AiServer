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
  getOrCreateSession(chatboxId, username, role, sessionInfo = null) {
    const key = buildKey(chatboxId, username, role);
    const now = Date.now();
    const existing = sessionStore.get(key);
    
    // ✅ DEBUG LOGGING
    logger.info(`🔍 SessionService Debug - Key: ${key}`);
    logger.info(`🔍 SessionService Debug - Existing session: ${existing ? existing.conversationId : 'none'}`);
    logger.info(`🔍 SessionService Debug - SessionInfo: ${JSON.stringify(sessionInfo)}`);
    
    // ✅ KIỂM TRA SESSION STORAGE TỪ FRONTEND
    if (sessionInfo) {
      // Trường hợp 1: Frontend không có sessionStorage (logout)
      if (sessionInfo.hasSessionStorage === false) {
        logger.info(`Frontend has no sessionStorage (logout detected), creating new session for ${key}`);
        const newSession = {
          conversationId: uuidv4(),
          lastActivityAt: now,
        };
        sessionStore.set(key, newSession);
        logger.info(`New conversation session created for ${key} -> ${newSession.conversationId}`);
        return { conversationId: newSession.conversationId, isNew: true };
      }
      
      // Trường hợp 2: Frontend có sessionStorage nhưng không có conversationId (logout + login lại)
      if (sessionInfo.hasSessionStorage === true && !sessionInfo.conversationId) {
        logger.info(`Frontend has sessionStorage but no conversationId (logout + login), creating new session for ${key}`);
        const newSession = {
          conversationId: uuidv4(),
          lastActivityAt: now,
        };
        sessionStore.set(key, newSession);
        logger.info(`New conversation session created for ${key} -> ${newSession.conversationId}`);
        return { conversationId: newSession.conversationId, isNew: true };
      }
      
      // Trường hợp 3: Frontend có sessionStorage và có conversationId
      if (sessionInfo.hasSessionStorage === true && sessionInfo.conversationId) {
        // Kiểm tra xem có match với server không
        if (existing && existing.conversationId === sessionInfo.conversationId) {
          // Match với server session -> tiếp tục session cũ
          existing.lastActivityAt = now;
          sessionStore.set(key, existing);
          logger.info(`Frontend conversationId matches server session for ${key} -> ${existing.conversationId}`);
          return { conversationId: existing.conversationId, isNew: false };
        } else {
          // Không match -> tạo session mới với conversationId từ frontend
          logger.info(`Frontend conversationId doesn't match server, creating new session for ${key}`);
          const newSession = {
            conversationId: sessionInfo.conversationId,
            lastActivityAt: now,
          };
          sessionStore.set(key, newSession);
          logger.info(`New conversation session created with frontend conversationId for ${key} -> ${newSession.conversationId}`);
          return { conversationId: newSession.conversationId, isNew: true };
        }
      }
    }
    
    // Logic cũ: kiểm tra session trong server
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



