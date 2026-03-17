/**
 * Support Service
 * Handles API requests for the support system, including message retrieval and sending
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/constants';
import { getUserFriendlyErrorMessage } from '../../utils/errorUtils';

// Cache key for storing support messages
const SUPPORT_MESSAGES_CACHE_KEY = 'subscription_support_messages_cache';

/**
 * Get support messages for the current user
 * @param {Object} options - Options for fetching messages
 * @param {Function} options.onError - Callback for error handling
 * @param {boolean} options.forceRefresh - Whether to bypass cache and force a fresh API call
 * @returns {Promise<Array>} Array of support message objects
 */
export const getSupportMessages = async ({ onError, forceRefresh = false } = {}) => {
  try {
    // Check cached data first if not forcing refresh
    if (!forceRefresh) {
      const cachedData = await AsyncStorage.getItem(SUPPORT_MESSAGES_CACHE_KEY);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    }

    // For demo purposes, we'll simulate an API call with dummy data
    // In a real app, this would be a fetch call to your support API endpoint
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Demo messages
    const messages = [
      {
        id: 'm1',
        type: 'system',
        content: 'Welcome to 24/7 subscription support! How can we assist you today?',
        timestamp: new Date(new Date().getTime() - 60 * 60000).toISOString(),
        read: true,
      },
      {
        id: 'm2',
        type: 'agent',
        agentName: 'Sarah',
        //agentAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        content: 'I see you\'re on our premium plan. Is there anything specific about your subscription you need help with?',
        timestamp: new Date(new Date().getTime() - 45 * 60000).toISOString(),
        read: true,
      },
      {
        id: 'm3',
        type: 'user',
        content: 'I have a question about changing my billing cycle from monthly to annual.',
        timestamp: new Date(new Date().getTime() - 30 * 60000).toISOString(),
        read: true,
      },
      {
        id: 'm4',
        type: 'agent',
        agentName: 'Sarah',
        //agentAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        content: 'Great question! You can switch from monthly to annual billing in your subscription settings. Annual billing gives you a 15% discount compared to monthly payments. Would you like me to guide you through the process?',
        timestamp: new Date(new Date().getTime() - 20 * 60000).toISOString(),
        read: true,
      }
    ];

    // Cache the messages
    await AsyncStorage.setItem(SUPPORT_MESSAGES_CACHE_KEY, JSON.stringify(messages));
    
    return messages;
  } catch (error) {
    //console.error('Error fetching support messages:', error);
    if (onError) {
      onError(getUserFriendlyErrorMessage(error, 'Unable to load support messages'));
    }
    // Return empty array on error
    return [];
  }
};

/**
 * Send a new support message
 * @param {Object} messageData - The message data to send
 * @param {string} messageData.content - Message content
 * @param {string} messageData.category - Message category/type
 * @param {Object} options - Options for sending message
 * @param {Function} options.onError - Callback for error handling
 * @returns {Promise<Object>} The created message object
 */
export const sendSupportMessage = async (messageData, { onError } = {}) => {
  try {
    // Validate message data
    if (!messageData.content) {
      throw new Error('Message content is required');
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create new message object
    const newMessage = {
      id: `m${Date.now()}`,
      type: 'user',
      content: messageData.content,
      category: messageData.category,
      timestamp: new Date().toISOString(),
      read: true,
    };

    // Get existing messages from cache
    const cachedData = await AsyncStorage.getItem(SUPPORT_MESSAGES_CACHE_KEY);
    const existingMessages = cachedData ? JSON.parse(cachedData) : [];
    
    // Add new message to messages array
    const updatedMessages = [...existingMessages, newMessage];
    
    // Update cache
    await AsyncStorage.setItem(SUPPORT_MESSAGES_CACHE_KEY, JSON.stringify(updatedMessages));

    // Simulate automated response (in a real app this would come from the server)
    setTimeout(async () => {
      const autoResponse = {
        id: `m${Date.now()}`,
        type: 'agent',
        agentName: 'David',
        //agentAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        content: `Thanks for reaching out about "${messageData.category}". A support specialist will review your message and respond shortly. Our average response time is under 30 minutes during business hours.`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      
      // Get latest messages again (in case they changed)
      const latestData = await AsyncStorage.getItem(SUPPORT_MESSAGES_CACHE_KEY);
      const latestMessages = latestData ? JSON.parse(latestData) : [];
      
      // Add auto-response
      const withAutoResponse = [...latestMessages, autoResponse];
      await AsyncStorage.setItem(SUPPORT_MESSAGES_CACHE_KEY, JSON.stringify(withAutoResponse));
    }, 2000);
    
    return newMessage;
  } catch (error) {
    //console.error('Error sending support message:', error);
    if (onError) {
      onError(getUserFriendlyErrorMessage(error, 'Unable to send message'));
    }
    throw error;
  }
};

/**
 * Mark messages as read
 * @param {Array} messageIds - Array of message IDs to mark as read
 * @returns {Promise<boolean>} Success indicator
 */
export const markMessagesAsRead = async (messageIds) => {
  try {
    // Get existing messages
    const cachedData = await AsyncStorage.getItem(SUPPORT_MESSAGES_CACHE_KEY);
    if (!cachedData) return false;
    
    const messages = JSON.parse(cachedData);
    
    // Mark specified messages as read
    const updatedMessages = messages.map(msg => 
      messageIds.includes(msg.id) ? { ...msg, read: true } : msg
    );
    
    // Update cache
    await AsyncStorage.setItem(SUPPORT_MESSAGES_CACHE_KEY, JSON.stringify(updatedMessages));
    
    return true;
  } catch (error) {
    //console.error('Error marking messages as read:', error);
    return false;
  }
};


{/*export const sendSubscriptionSupportMessage = async (messageData) => {
  try {
    // Validate message data
    if (!messageData.content) {
      throw new Error('Message content is required');
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create new message object
    const newMessage = {
      id: `m${Date.now()}`,
      type: 'user',
      content: messageData.content,
      category: messageData.category,
      timestamp: new Date().toISOString(),
      read: true,
    };
    
    // Get existing messages from cache
    const cachedData = await AsyncStorage.getItem(SUPPORT_MESSAGES_CACHE_KEY);
    const existingMessages = cachedData ? JSON.parse(cachedData) : [];
    
    // Add new message to messages array
    const updatedMessages = [...existingMessages, newMessage];
    
    // Update cache
    await AsyncStorage.setItem(SUPPORT_MESSAGES_CACHE_KEY, JSON.stringify(updatedMessages));
    
    // Simulate automated response (in a real app this would come from the server)
    setTimeout(async () => {
      const autoResponse = {
        id: `m${Date.now()}`,
        type: 'agent',
        agentName: 'David',
        //agentAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        content: `Thanks for reaching out about "${messageData.category}". A support specialist will review your message and respond shortly. Our average response time is under 30 minutes during business hours.`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      
      // Get latest messages again (in case they changed)
      const latestData = await AsyncStorage.getItem(SUPPORT_MESSAGES_CACHE_KEY);
      const latestMessages = latestData ? JSON.parse(latestData) : [];
      
      // Add auto-response
      const withAutoResponse = [...latestMessages, autoResponse];
      await AsyncStorage.setItem(SUPPORT_MESSAGES_CACHE_KEY, JSON.stringify(withAutoResponse));
    }, 2000);
    
    return newMessage;
  } catch (error) {
    //console.error('Error sending support message:', error);
    throw error;
  }
}; */}