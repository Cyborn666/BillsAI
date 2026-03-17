/**
 * Server-side notification service for BillsAI
 * Handles creating and storing notifications
 */

const fs = require('fs');
const path = require('path');

// Get the User model
const User = require('../models/userModel');

// Set up logging directory
const LOG_DIR = path.join(__dirname, '../../logs');
const NOTIFICATION_LOG_FILE = path.join(LOG_DIR, 'notifications.log');

// Ensure log directory exists
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    //console.log(`[NOTIFICATION_SERVICE] Created log directory at ${LOG_DIR}`);
  }
} catch (err) {
  //console.error(`[NOTIFICATION_SERVICE] Error creating log directory: ${err.message}`);
}

/**
 * Write a log entry to the notification log file and //console
 * @param {string} level - Log level (INFO, ERROR, DEBUG, WARNING)
 * @param {string} message - Log message
 * @param {Object} [data] - Optional data to include in the log
 */
const logNotification = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  // Format log string
  const logString = `[${timestamp}] [${level}] ${message} ${JSON.stringify(data)}`;

  // Output to //console
  if (level === 'ERROR') {
    //console.error(logString);
  } else {
    //console.log(logString);
  }

  // Write to log file
  try {
    fs.appendFileSync(NOTIFICATION_LOG_FILE, logString + '\n');
  } catch (err) {
    //console.error(`[NOTIFICATION_SERVICE] Failed to write to log file: ${err.message}`);
  }
};

/**
 * Create a notification for a user
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.user - User ID to send notification to
 * @param {string} notificationData.type - Type of notification
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.message - Notification message
 * @param {Object} notificationData.data - Additional data for the notification
 * @returns {Promise<boolean>} - True if notification was created
 */
exports.createNotification = async (notificationData) => {
  logNotification('INFO', 'Notification request received', {
    type: notificationData?.type,
    userId: notificationData?.user,
  });

  try {
    // Validate notification data
    if (!notificationData) {
      logNotification('ERROR', 'Notification data is null or undefined');
      return false;
    }

    if (!notificationData.user) {
      logNotification('ERROR', 'Missing user ID in notification data', { data: notificationData });
      return false;
    }

    if (!notificationData.title || !notificationData.message) {
      logNotification('ERROR', 'Missing required fields in notification data', {
        hasTitle: !!notificationData.title,
        hasMessage: !!notificationData.message,
        userId: notificationData.user,
      });
      return false;
    }

    // Check if user exists (optional)
    try {
      const user = await User.findById(notificationData.user);
      if (!user) {
        logNotification('WARNING', 'User not found for notification', { userId: notificationData.user });
        // Continue anyway since we might want to queue notifications for users who haven't signed in yet
      } else {
        logNotification('DEBUG', 'User found for notification', { 
          userId: user._id,
          email: user.email,
        });
      }
    } catch (userError) {
      logNotification('WARNING', 'Error checking user existence', { error: userError.message, userId: notificationData.user });
      // Continue anyway
    }

    // Log the full notification data
    logNotification('INFO', 'Creating notification', {
      userId: notificationData.user,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
    });
    
    // In a real app, this would store in database and potentially trigger push notifications
    // For now we just log it
    logNotification('INFO', 'Notification created successfully', { 
      userId: notificationData.user,
      type: notificationData.type,
      timestamp: new Date().toISOString(),
    });
    
    return true;
  } catch (error) {
    logNotification('ERROR', 'Error creating notification', { 
      error: error.message, 
      stack: error.stack,
      userId: notificationData?.user,
    });
    return false;
  }
};
