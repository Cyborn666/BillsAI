/**
 * Waitlist Service
 * Handles API requests related to waitlist operations
 */
import apiClient from '../utils/apiClient';

/**
 * Add a user to the waitlist
 * @param {Object} data - User data for waitlist (firstName, lastName, email, phone, reason)
 * @returns {Promise} - API response
 */
export const addToWaitlist = async (data) => {
  try {
    // Enhanced logging - include timestamp and URL info
    const timestamp = new Date().toISOString();
    //console.log(`[${timestamp}] Sending waitlist data to server:`, JSON.stringify(data));
    
    // Add a retry mechanism for network issues
    let retries = 0;
    const maxRetries = 2;
    let response;
    
    while (retries <= maxRetries) {
      try {
        response = await apiClient.post('/waitlist', data);
        //console.log(`[${timestamp}] Server response:`, JSON.stringify(response.data));
        return response.data;
      } catch (retryError) {
        retries++;
        if (retries > maxRetries) { throw retryError; } // Re-throw if max retries reached
        //console.warn(`Retry ${retries}/${maxRetries} after error:`, retryError.message);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
  } catch (error) {
    // More detailed error logging
    //console.error('Error adding to waitlist:', error.response?.data || error.message);
    //console.error('Error status:', error.response?.status);
    //console.error('Error headers:', error.response?.headers);
    
    // Create a more user-friendly error
    const userFriendlyError = new Error(
      error.response?.data?.message || 'Unable to submit waitlist form. Please try again.'
    );
    throw userFriendlyError;
  }
};

/**
 * Check if a user is already on the waitlist
 * @param {string} email - Email to check
 * @returns {Promise} - API response with status information
 */
export const checkWaitlistStatus = async (email) => {
  try {
    //console.log('Checking waitlist status for email:', email);
    const response = await apiClient.get(`/waitlist/check/${email}`);
    //console.log('Check response:', JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    //console.error('Error checking waitlist status:', error.response?.data || error.message);
    throw error;
  }
};

export default {
  addToWaitlist,
  checkWaitlistStatus,
};
