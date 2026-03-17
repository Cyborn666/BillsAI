/**
 * API Utilities for BillsAI
 * Handles API configuration and common fetch patterns
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform, DeviceEventEmitter} from 'react-native';
import { secureGet, secureSet, secureRemove, initSecureStorage } from './secureStorage';

// Initialize secure storage when module is imported
(async () => {
  try {
    await initSecureStorage();
  } catch (error) {
    // Silent fail - we'll fallback to AsyncStorage if secure storage fails
  }
})();

// Determine if we're in production build
//const isProduction = !__DEV__;

// Production API URL - secure HTTPS endpoint
//const PROD_API = 'http://billsai-production.eba-kqudkcms.us-east-2.elasticbeanstalk.com/api';

// Development API base URL configuration with platform-specific handling
//const DEV_API = 'http://172.20.13.148:5002/api';
//const DEV_API = 'http://localhost:5002/api';

//const PROD_API = 'https://api.billsai.org/api';

// Use production or development API based on build mode
//export const API_BASE_URL = PROD_API;
export const API_BASE_URL = 'http://localhost:5002/api';

/**
 * Helper function to make API requests with proper headers
 *
 * @param {string} endpoint - API endpoint (without the base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - Parsed response data
 */
export const apiRequest = async (endpoint, options = {}) => {
  const token = await getAuthToken();

  // Get user's local timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    'x-user-timezone': userTimezone, // Include user timezone in all requests
    ...options.headers,
  };

  // Add authentication token if available
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Prepare full URL and fetch options
  const url = `${API_BASE_URL}${endpoint}`;
  const fetchOptions = {
    ...options,
    headers,
  };

  // Debug: Log the request body
  if (options.body && options.method !== 'GET') {
    try {
      // Skip JSON parsing if body is FormData
      if (!(options.body instanceof FormData)) {
        const bodyObj = JSON.parse(options.body);
        //console.log('Request body:', JSON.stringify(bodyObj, null, 2));
      } else {
        //console.log('Request body: [FormData object - cannot display]');
      }
    } catch (e) {
      //console.error('Failed to parse request body:', e);
    }
  }

  try {
    // Debug request details
    //console.log(`Making API request to: ${url}`);
    //console.log(`Request method: ${options.method || 'GET'}`);

    // Set up fetch with timeout - increase to 30 seconds for production environment
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      //console.log('Request timeout reached');
      controller.abort();
    }, 30000); // 30 second timeout

    // Add abort signal to fetch options
    const fetchWithTimeout = {
      ...fetchOptions,
      signal: controller.signal,
    };

    // Make the request
    const response = await fetch(url, fetchWithTimeout)
      .finally(() => clearTimeout(timeoutId));

    // First log the raw response status
    //console.log(`API response status: ${response.status} ${response.statusText}`);
    
    // Log headers for debugging
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    //console.log('Response headers:', responseHeaders);

    // Create a result object that includes status and ok properties
    const result = {
      status: response.status,
      ok: response.ok,
      data: {},
    };

    // Try to parse JSON response
    try {
      // Get text response first to log it
      const textResponse = await response.clone().text();
      //console.log('Raw response text:', textResponse.substring(0, 200) + (textResponse.length > 200 ? '...' : ''));

      // Check if response is empty or not valid JSON
      if (!textResponse || textResponse.trim() === '') {
        //console.error('Empty response received from server');
        
        return result; // Return result object with empty data
      }

      // Check if response is not JSON (starts with '<' indicates HTML)
      if (textResponse.trim().startsWith('<')) {
        //console.error('Received HTML instead of JSON');
        
        return result; // Return result object with empty data
      }

      // Try to parse JSON
      try {
        result.data = JSON.parse(textResponse);
        //console.log('Parsed API response data:', JSON.stringify(result.data, null, 2).substring(0, 200));
      } catch (parseError) {
        //console.error('Invalid JSON format:', parseError);
        
        // Result already has empty data object
      }
    } catch (responseError) {
      //console.error('Failed to process response:', responseError);
     
      // Result already has empty data object
    }

    // Handle API errors - make sure response exists first
    if (response && !response.ok) {
      //console.error(`API error: ${response.status} ${response.statusText}`, result.data || 'No data');

      // Handle 401 Unauthorized errors
      if (response.status === 401) {
        // Check for specific error conditions
        if (result.data) {
          // Case 1: Email verification issue
          if (result.data.needsVerification ||
              result.data.errorType === 'email_not_verified' ||
              result.data.verificationRequired === true) {
            const verificationError = new Error(result.data.message || 'Email not verified');
            verificationError.response = { data: result.data };
            verificationError.needsVerification = true;
            verificationError.errorType = result.data.errorType || 'email_not_verified';
            verificationError.verificationRequired = result.data.verificationRequired || true;
            throw verificationError;
          }

          // Case 2: Invalid credentials (wrong password/email)
          if (result.data.message && (result.data.message.includes('Invalid credentials') ||
              result.data.message.includes('credentials'))) {
            const credentialsError = new Error(result.data.message || 'Invalid credentials');
            credentialsError.response = { data: result.data };
            throw credentialsError;
          }

          // Case 3: Any other error with a specific message
          if (result.data.message) {
            const genericError = new Error(result.data.message);
            genericError.response = { data: result.data };
            throw genericError;
          }
        }

        // Case 4: Default - assume it's a token expiration issue
        // Only if we couldn't determine a more specific error type
        const authError = new Error('AUTH_TOKEN_EXPIRED');
        authError.isAuthError = true;
        authError.statusCode = 401;
        authError.originalMessage = result.data?.message || 'Not authorized';

        // Emit an event that components can listen for
        DeviceEventEmitter.emit('AUTH_ERROR', { message: 'Session expired' });

        throw authError;
      }

      // Special handling for 404 errors - check if this is a bill deletion
      if (response.status === 404) {
        // If this is a DELETE request, assume it's successful (bill was already gone)
        if (options.method === 'DELETE') {
          //console.log('404 on DELETE - considering operation successful');
          return { success: true, message: 'Resource already deleted' };
        }
      }

      // Handle 403 errors (often subscription/plan limits)
      if (response.status === 403) {
        // Return the error data with additional flags to identify it as an error
        return {
          error: true,
          status: response.status,
          ...result.data
        };
      }
      
      // Return error data for all other errors instead of just an empty object
      return {
        error: true,
        status: response.status,
        message: result.data?.message || 'An error occurred',
        ...result.data
      };
    }

    // Check if data is null or undefined
    if (!result.data) {
      //console.error('Response data is null or undefined');
     
      return {};
    }

    return result.data;
  } catch (error) {
    //console.error('API Request failed:', error.message);
   
    
    // Check if error and error.message exist before trying to access them
    if (error && error.message && (error.message === 'Network request failed' || error.message === 'Aborted')) {
      //console.log('Network issue detected. This could be due to connection problems, CORS, or server timeout');
      
      // For aborted requests, return a more graceful error response instead of throwing
      if (error.message === 'Aborted') {
        return {
          error: true,
          message: 'Request timed out. Please check your connection and try again.',
          isTimeout: true,
        };
      }
    }
    
    // Add more context to the error for better debugging
    const enhancedError = new Error(error.message || 'API request failed');
    enhancedError.originalError = error;
    enhancedError.endpoint = endpoint;
    enhancedError.url = url;
    throw enhancedError;
  }
};

/**
 * Store authentication token securely
 * @param {string} token - JWT token
 */
export const storeAuthToken = async (token) => {
  if (token) {
    try {
      // First try to store using secure storage
      const secureResult = await secureSet('authToken', token);
      
      if (!secureResult) {
        // Fall back to regular AsyncStorage if secure storage fails
        await AsyncStorage.setItem('authToken', token);
      }
      
      return true;
    } catch (error) {
      // Handle all storage errors gracefully
      //console.warn('Failed to store authentication token:', error.message);
      // Return true to allow login flow to continue even if token storage fails
      return true;
    }
  }
  return false;
};

/**
 * Remove authentication token from secure storage and fallback
 * @returns {Promise<boolean>} - Success status
 */
export const removeAuthToken = async () => {
  try {
    // Try to remove from secure storage first
    const secureRemoveResult = await secureRemove('authToken');
    
    // Also remove from AsyncStorage as fallback
    await AsyncStorage.removeItem('authToken');
    
    return true;
  } catch (error) {
    // Handle storage errors gracefully
    //console.warn('Failed to remove authentication token:', error.message);
    // Return true to allow logout flow to continue even if token removal fails
    return true;
  }
};

/**
 * Get stored authentication token from secure storage with fallback
 * @returns {string|null} - Stored token or null
 */
export const getAuthToken = async () => {
  try {
    // First try to get from secure storage
    const secureToken = await secureGet('authToken');
    if (secureToken) {
      return secureToken;
    }
    
    // Fallback to AsyncStorage if not found in secure storage
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    // Silently fall back to AsyncStorage on secure storage error
    return await AsyncStorage.getItem('authToken');
  }
};

/**
 * Check if user is logged in based on token
 * @returns {boolean} - User login status
 */
export const isLoggedIn = () => {
  return !!getAuthToken();
};
