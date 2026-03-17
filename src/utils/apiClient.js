/**
 * API Client for BillsAI
 * Provides simplified methods for API requests
 */
import { apiRequest } from './apiUtils';

const apiClient = {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint (without the base URL)
   * @param {Object} options - Additional fetch options
   * @returns {Promise<any>} - Parsed response data
   */
  get: async (endpoint, options = {}) => {
    ////console.log(`[API] GET Request to: ${endpoint}`);
    try {
      const result = await apiRequest(endpoint, {
        method: 'GET',
        ...options,
      });
      ////console.log(`[API] GET Response from ${endpoint}:`, result);
      return result;
    } catch (error) {
      ////console.error(`[API] GET Error for ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint (without the base URL)
   * @param {Object} data - Request body
   * @param {Object} options - Additional fetch options
   * @returns {Promise<any>} - Parsed response data
   */
  post: async (endpoint, data, options = {}) => {
    return apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint (without the base URL)
   * @param {Object} data - Request body
   * @param {Object} options - Additional fetch options
   * @returns {Promise<any>} - Parsed response data
   */
  put: async (endpoint, data, options = {}) => {
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  },

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint (without the base URL)
   * @param {Object} options - Additional fetch options
   * @returns {Promise<any>} - Parsed response data
   */
  delete: async (endpoint, options = {}) => {
    return apiRequest(endpoint, {
      method: 'DELETE',
      ...options,
    });
  },
};

export default apiClient;
