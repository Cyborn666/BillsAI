/**
 * Authentication Service for BillsAI
 * Handles all API calls related to authentication
 */

import { apiRequest, storeAuthToken, removeAuthToken, getAuthToken } from '../utils/apiUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as businessApiService from '../business/services/businessApiService';

/**
 * Login with email/username and password
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User email (optional if username provided)
 * @param {string} credentials.username - Username (optional if username provided)
 * @param {string} credentials.password - User password
 * @param {string} credentials.accountType - Account type ('personal' or 'business')
 * @returns {Promise<Object>} - User data
 */
export const login = async (credentials) => {
  try {
    if ((!credentials.email && !credentials.username) || !credentials.password) {
      throw new Error('Email/username and password are required');
    }
    if (!credentials.accountType) {
      throw new Error('Account type is required');
    }
    const { email, username, password, accountType } = credentials;
    //console.log('Login credentials:', credentials);

    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store JWT token
    if (response.token) {
      try {
        // Even if token storage fails, we'll continue with the login
        await storeAuthToken(response.token);
      } catch (tokenError) {
        // Log the error but don't fail the login
        ////console.warn('Token storage failed, but continuing login:', tokenError.message);
      }
    }

    return response.user;
  } catch (error) {
    // Case 1: Handle authentication token expiration
    if (error.message === 'AUTH_TOKEN_EXPIRED') {
      // Pass through the auth error directly without wrapping it
      throw error;
    }

    // Case 2: API returned a response with data
    if (error.response && error.response.data) {
      // Case 2a: Email verification required
      if (error.response.data.needsVerification || 
          error.response.data.errorType === 'email_not_verified' || 
          error.response.data.verificationRequired === true) {
        
        const verificationError = new Error(error.response.data.message || 'Email not verified');
        verificationError.needsVerification = true;
        verificationError.email = error.response.data.email || credentials?.email;
        verificationError.errorType = error.response.data.errorType || 'email_not_verified';
        verificationError.verificationRequired = error.response.data.verificationRequired || true;
        //console.error('Throwing verification error:', verificationError);
        throw verificationError;
      }

      // Case 2b: Invalid credentials
      if (error.response.data.message && error.response.data.message.includes('Invalid credentials')) {
        const credentialsError = new Error('Invalid username or password');
        throw credentialsError;
      }
      // Case 2c: Other API errors with response data
      throw new Error(error.response.data.message || 'Login failed');
    }
    // Case 3: Errors that were passed through from apiUtils.js
    if (error.response) {
      throw error; // Preserve the original error with its properties
    }
    // Case 4: Clean up generic error messages for better user experience
    const errorMessage = error.message?.includes('manifest.json')
      ? 'Login failed: Please try again'
      : `Login failed: ${error.message || 'Unknown error'}`;
    // Don't //console.error here to avoid unnecessary //console errors
    throw new Error(errorMessage);
  }
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.name - Full name or business name
 * @param {string} userData.email - Email
 * @param {string} userData.password - Password
 * @param {string} userData.username - Username
 * @param {string} userData.accountType - Account type ('personal' or 'business')
 * @param {Object} userData.businessData - Business data (required if accountType is 'business')
 * @returns {Promise<Object>} - User data
 */
export const register = async (userData) => {
  try {
    // Very simple registration path based on account type
    if (userData.accountType === 'business') {
      // BUSINESS ACCOUNT PATH
      //console.log('Registering business user');
      
      // Business registration sends ONLY business data, completely separate from user data
      const data = {
        email: userData.businessEmail,
        password: userData.password,
        accountType: 'business',
        fullName: userData.businessName, // Not used but kept for schema validation
        businessData: {
          businessName: userData.businessName,
          businessEmail: userData.businessEmail,
          ownerName: userData.businessOwner || userData.fullName || '', // Map to ownerName field in backend model
          taxId: userData.taxId || '000000000',
          businessType: userData.businessType || 'Other',
          industry: userData.industry || 'Other',
          phone: userData.phone || '',
          businessDescription: userData.businessDescription || '',
          address: userData.address || {},
        }
      };

      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      return response;
    } else {
      // PERSONAL ACCOUNT PATH
      //console.log('Registering personal user');
      
      if (!userData.fullName || !userData.email || !userData.password || !userData.username) {
        throw new Error('All fields are required');
      }
      
      // Simple data structure for personal accounts
      const data = {
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        username: userData.username,
        accountType: 'personal'
      };

      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    }
  } catch (error) {
    ////console.error('Registration failed:', error);
    throw error;
  }
};

/**
 * Logout current user
 * @returns {Promise<boolean>} - Success status
 */
export const logout = async () => {
  try {
    // No need to call the server for logout in JWT auth
    // Just remove the token from AsyncStorage
    await removeAuthToken();
    return true;
  } catch (error) {
    ////console.error('Logout failed:', error);
    throw error;
  }
};

/**
 * Get current user from the server
 * @returns {Promise<Object|null>} - User data or null if not logged in
 */
export const getCurrentUser = async () => {
  try {
    // Check if we have a token
    const token = await getAuthToken();
    if (!token) {
      return null;
    }

    // Check account type to determine which endpoint to use
    const accountType = await AsyncStorage.getItem('accountType');
    
    let userData;
    if (accountType === 'business') {
      // Use business profile endpoint for business accounts
      const businessProfileData = await businessApiService.getBusinessProfile();
      if (businessProfileData) {
        // Format business profile data to match the expected user structure
        userData = {
          ...businessProfileData,
          accountType: 'business',
          role: 'business',
        };
      }
    } else {
      // Default path for personal accounts
      const response = await apiRequest('/auth/me', {
        method: 'GET',
      });
      userData = response.user;
      
      if (userData) {
        userData.accountType = 'personal';
      }
    }

    return userData;
  } catch (error) {
    //console.error('Failed to get current user:', error);
    // If there's an error (like an expired token), remove the token
    await removeAuthToken();
    return null;
  }
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} - Reset information
 */
export const requestPasswordReset = async (email, accountType) => {
  // Include account type in request if provided
  const requestData = accountType ? { email, accountType } : { email };
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    const response = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    return response;
  } catch (error) {
    ////console.error('Password reset request failed:', error);
    throw error;
  }
};

/**
 * Complete password reset with token and new password
 * @param {string} token - Reset token from email
 * @param {string} password - New password
 * @returns {Promise<Object>} - Reset confirmation
 */
export const completePasswordReset = async (token, password) => {
  try {
    if (!token || !password) {
      throw new Error('Token and password are required');
    }

    const response = await apiRequest(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    return response;
  } catch (error) {
    ////console.error('Password reset failed:', error);
    throw error;
  }
};

/**
 * Update user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Update confirmation
 */
export const updatePassword = async (currentPassword, newPassword) => {
  try {
    if (!currentPassword || !newPassword) {
      throw new Error('Current and new passwords are required');
    }

    const response = await apiRequest('/auth/update-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    return response;
  } catch (error) {
    ////console.error('Password update failed:', error);
    throw error;
  }
};

/**
 * Resend verification email
 * @param {string} email - User email
 * @returns {Promise<Object>} - Response
 */
export const resendVerificationEmail = async (email, accountType = 'personal') => {
  try {
    if (!email) {
      throw new Error('Email is required');
    }
    
    if (!accountType) {
      throw new Error('Account type is required');
    }

    const response = await apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email, accountType }),
    });

    return response;
  } catch (error) {
    ////console.error('Failed to resend verification email:', error);
    throw error;
  }
};
