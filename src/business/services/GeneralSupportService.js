/**
 * General Support Service
 * Simple utility to send support messages
 */
import { apiRequest } from '../../utils/apiUtils';

/**
 * Simple function to send a general support message
 * @param {Object} messageData - Basic message data with content, category and subject
 * @returns {Promise<Object>} Success status
 */
export const sendGeneralSupportMessage = async (messageData) => {
  try {
    // Basic validation
    if (!messageData.content || !messageData.category) {
      throw new Error('Message content and category are required');
    }

    // Use the apiRequest utility which already handles auth tokens
    const response = await apiRequest('/business/support/messages', {
      method: 'POST',
      body: JSON.stringify({
        content: messageData.content,
        category: messageData.category,
        subject: messageData.subject || '',
      }),
    });

    // Return success response
    return { success: true, message: response };
  } catch (error) {
    //console.error('Error sending support message:', error);
    throw error;
  }
};


