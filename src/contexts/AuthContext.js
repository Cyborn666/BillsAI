/**
 * Authentication Context for BillsAI
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/authService';

// Create the auth context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component to wrap the app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accountType, setAccountType] = useState(null); // 'personal' or 'business'

  // Global handler for auth errors - memoized with useCallback to avoid dependency issues
  const handleAuthError = useCallback((err) => {
    if (err?.message === 'AUTH_TOKEN_EXPIRED') {
      ////console.log('Authentication token expired, logging out automatically');
      // Since we can't reference logout here (would create circular dependency)
      // we'll just clear the user state directly
      setUser(null);
      Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
      return true;
    }
    return false;
  }, []);

  // Load user on initial mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        // First retrieve the account type from AsyncStorage
        const storedAccountType = await AsyncStorage.getItem('accountType');
        if (storedAccountType) {
          setAccountType(storedAccountType);
        }
        
        // Check for a token in AsyncStorage and try to authenticate the user
        const userData = await authService.getCurrentUser();
        if (userData) {
          // Ensure account type is set on user data
          if (storedAccountType && !userData.accountType) {
            userData.accountType = storedAccountType;
          }
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err) {
        //console.error('Error loading user:', err);
        handleAuthError(err) || setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [handleAuthError]);

  // Login user
  const login = async (credentials,type='personal') => {
    setLoading(true);
    setError(null);

    try {
      // Add account type to credentials for backend to use
      const loginData = {
        ...credentials,
        accountType: type,
      };
      const userData = await authService.login(loginData);
      // Set the account type based on the selected option
      setAccountType(type);
      userData.accountType = type;
      // Store account type in AsyncStorage for persistence across app restarts
      await AsyncStorage.setItem('accountType', type);
      setUser(userData);
      return userData;
     
    } catch (err) {
      //console.log(err);
      // Case 1: Email verification required
      if (err.needsVerification ||
          (err.errorType === 'email_not_verified') ||
          (err.verificationRequired === true) ||
          (err.message && err.message.includes('Email not verified'))) {
        // Extract email from credentials since API doesn't return it in the error
        const email = credentials.email;

        setError({
          message: 'Email not verified',
          needsVerification: true,
          email: email,
        });

        // IMPORTANT: We need to rethrow the error to ensure it propagates to the LoginScreen
        // Don't show the alert here - we'll let the LoginScreen component handle it
        // This ensures we don't have duplicate alerts
        
        // Make sure the error has all the properties needed for detection
        const verificationError = new Error('Email not verified. Please check your email for a verification link.');
        verificationError.needsVerification = true;
        verificationError.email = email;
        verificationError.errorType = 'email_not_verified';
        verificationError.verificationRequired = true;
        
        throw verificationError;
      }
      // Case 2: Authentication token expired
      else if (err.message === 'AUTH_TOKEN_EXPIRED') {
        return handleAuthError(err); // This will handle token expiration
      }
      // Case 3: Invalid credentials
      else if (err.message && (err.message.includes('Invalid') || err.message.includes('credentials'))) {
        setError(err.message);
        Alert.alert('Invalid Credentials', 'Please check your email and password and try again.');
      }
      // Case 4: Other errors
      else  {
        setError(err.message || 'Failed to login');
        Alert.alert('Login Failed', err.message || 'An error occurred. Please try again.');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Show a resend verification alert that can be called from anywhere
  const showResendVerificationAlert = (email) => {
    Alert.alert(
      'Email Verification Required',
      'Your email has not been verified. Please check your email for a verification link.',
      [
        { text: 'Cancel' },
        {
          text: 'Resend Verification Email',
          onPress: () => resendVerificationEmail(email),
        },
      ]
    );
  };

  // Resend verification email
  const resendVerificationEmail = async (email) => {
    setLoading(true);
    try {
      // Pass both email and account type to the resend verification endpoint
      await authService.resendVerificationEmail(email, accountType || 'personal');
      Alert.alert(
        'Verification Email Sent',
        'Please check your email for the verification link.'
      );
      return true;
    } catch (err) {
      if (!handleAuthError(err)) {
        Alert.alert('Error', err.message || 'Failed to send verification email');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register a new user
  const register = async (userData) => {
    setLoading(true);
    setError(null);

    try {
      // userData should already contain the accountType and businessData if applicable
      const result = await authService.register(userData);
      // We don't set the user here since the API requires email verification
      // after which the user can log in
      Alert.alert(
        'Registration Successful',
        'Please check your email to verify your account before logging in.'
      );
      return result;
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.message || 'Failed to register');
        Alert.alert('Registration Failed', err.message || 'Please check your information and try again');
      }
      //console.error('Registration error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setError(null);
      setAccountType(null);
      // Clear account type from AsyncStorage
      await AsyncStorage.removeItem('accountType');
    } catch (err) {
      //console.error('Error during logout:', err);
      setError('Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    setLoading(true);
    setError(null);

    try {
      await authService.resetPassword(email);
      Alert.alert('Password Reset', 'If your email exists in our system, you will receive password reset instructions.');
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.message || 'Failed to reset password');
        Alert.alert('Error', err.message || 'An error occurred while trying to reset your password');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auth context value
  const contextValue = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    resetPassword,
    resendVerificationEmail,
    showResendVerificationAlert,
    isAuthenticated: !!user,
    accountType,
    setAccountType,
    isBusinessAccount: accountType === 'business',
    isPersonalAccount: accountType === 'personal'
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
