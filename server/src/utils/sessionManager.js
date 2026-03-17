/**
 * Session Manager for handling user login sessions
 * Provides utilities for managing active sessions across 
 * both personal and business accounts
 */
const crypto = require('crypto');
const UAParser = require('ua-parser-js');

/**
 * Generate a unique session ID
 * @returns {String} - Unique session ID
 */
const generateSessionId = () => {
  return crypto.randomBytes(24).toString('hex');
};

/**
 * Get device information from user agent
 * @param {Object} req - Express request object
 * @returns {Object} Device information
 */
const getDeviceInfo = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  return {
    device: `${result.device.vendor || ''} ${result.device.model || ''} ${result.device.type || 'Unknown'}`.trim() || 'Unknown Device',
    browser: `${result.browser.name || ''} ${result.browser.version || ''}`.trim() || 'Unknown Browser',
    os: `${result.os.name || ''} ${result.os.version || ''}`.trim() || 'Unknown OS',
    userAgent: userAgent
  };
};

/**
 * Create a new session for a user
 * @param {Object} user - User document (personal or business)
 * @param {Object} req - Express request object
 * @returns {Object} Session info including ID for token
 */
const createSession = async (user, req) => {
  try {
    const sessionId = generateSessionId();
    const deviceInfo = getDeviceInfo(req);
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    
    // Create new session object
    const newSession = {
      sessionId,
      device: deviceInfo.device,
      ipAddress,
      userAgent: deviceInfo.userAgent,
      lastActive: new Date(),
      createdAt: new Date()
    };
    
    // Check if user has reached maximum allowed sessions
    if (user.activeSessions && user.activeSessions.length >= user.maxSessions) {
      // Remove oldest session
      user.activeSessions.sort((a, b) => a.lastActive - b.lastActive);
      user.activeSessions.shift();
    }
    
    // Add new session to user's active sessions
    if (!user.activeSessions) {
      user.activeSessions = []; // Initialize if not exists
    }
    
    user.activeSessions.push(newSession);
    await user.save();
    
    return {
      sessionId,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os
    };
  } catch (error) {
    //console.error('Failed to create session:', error);
    throw error;
  }
};

/**
 * Verify if a session is valid and active
 * @param {Object} user - User document
 * @param {String} sessionId - Session ID to verify
 * @returns {Boolean} Whether session is valid
 */
const verifySession = (user, sessionId) => {
  if (!user || !user.activeSessions || !sessionId) {
    return false;
  }
  
  return user.activeSessions.some(session => session.sessionId === sessionId);
};

/**
 * Update the last active timestamp for a session
 * @param {Object} user - User document
 * @param {String} sessionId - Session ID to update
 */
const updateSessionActivity = async (user, sessionId) => {
  if (!user || !user.activeSessions || !sessionId) {
    return;
  }
  
  const sessionIndex = user.activeSessions.findIndex(
    session => session.sessionId === sessionId
  );
  
  if (sessionIndex !== -1) {
    user.activeSessions[sessionIndex].lastActive = new Date();
    await user.save();
  }
};

/**
 * Remove a session (logout)
 * @param {Object} user - User document
 * @param {String} sessionId - Session ID to remove
 * @returns {Boolean} Whether removal was successful
 */
const removeSession = async (user, sessionId) => {
  if (!user || !user.activeSessions || !sessionId) {
    return false;
  }
  
  const initialCount = user.activeSessions.length;
  user.activeSessions = user.activeSessions.filter(
    session => session.sessionId !== sessionId
  );
  
  if (initialCount !== user.activeSessions.length) {
    await user.save();
    return true;
  }
  
  return false;
};

/**
 * Get all active sessions for a user
 * @param {Object} user - User document
 * @returns {Array} List of active sessions
 */
const getActiveSessions = (user) => {
  if (!user || !user.activeSessions) {
    return [];
  }
  
  return user.activeSessions.map(session => ({
    id: session.sessionId,
    device: session.device,
    ipAddress: session.ipAddress,
    lastActive: session.lastActive,
    createdAt: session.createdAt
  }));
};

/**
 * Remove all sessions for a user (full logout)
 * @param {Object} user - User document
 * @param {String} currentSessionId - Optional current session to keep
 * @returns {Number} Number of sessions removed
 */
const removeAllSessions = async (user, currentSessionId = null) => {
  if (!user || !user.activeSessions) {
    return 0;
  }
  
  const initialCount = user.activeSessions.length;
  
  if (currentSessionId) {
    // Keep current session if provided
    user.activeSessions = user.activeSessions.filter(
      session => session.sessionId === currentSessionId
    );
  } else {
    // Clear all sessions
    user.activeSessions = [];
  }
  
  await user.save();
  return initialCount - user.activeSessions.length;
};

module.exports = {
  createSession,
  verifySession,
  updateSessionActivity,
  removeSession,
  getActiveSessions,
  removeAllSessions
};
