/**
 * Error Utilities for BillsAI
 * Central location for error handling and user-friendly messages
 */

// Map of internal error codes to user-friendly messages
const ERROR_MESSAGES = {
  // Network errors
  'network_error': 'Unable to connect to the server. Please check your internet connection and try again.',
  'timeout': 'The request took too long to complete. Please try again.',
  
  // Auth errors
  'auth_error': 'Your session has expired. Please sign in again.',
  
  // Subscription errors
  'subscription_creation_failed': 'We couldn\'t create your subscription at this time. Please try again later.',
  'payment_method_error': 'There was an issue with your payment method. Please check your card details and try again.',
  'insufficient_funds': 'Your payment couldn\'t be processed. Please check with your bank and try again.',
  'card_declined': 'Your card was declined. Please try a different payment method.',
  'invalid_card': 'The card information appears to be invalid. Please double-check your details.',
  'expired_card': 'Your card appears to be expired. Please update your payment method.',
  'invoice_payment_failed': 'We couldn\'t process your payment. Please check your payment details and try again.',
  'auto_renewal_toggle_failed': 'We couldn\'t update your auto-renewal settings. Please try again later.',
  
  // Data errors
  'missing_data': 'Some information appears to be missing. Please refresh the page or contact support if this continues.',
  'invalid_data': 'There was an issue with the data provided. Please try again.',
  
  // Server errors
  'server_error': 'Our system is experiencing technical difficulties. Please try again in a few minutes.',
  
  // Default error
  'default': 'Something went wrong. Please try again later or contact customer support if this persists.'
};

/**
 * Classify Stripe errors with user-friendly messages without exposing technical details
 * @param {Error|Object} error - The raw error from Stripe or other source
 * @returns {string} - A user-friendly error message code
 */
export const classifyStripeError = (error) => {
  // Handle null or undefined error
  if (!error) return 'default';
  
  const errorMessage = error.message || '';
  const errorCode = error.code || '';
  const errorType = error.type || '';
  
  // Map common Stripe error types to user-friendly message codes
  if (errorCode === 'card_declined' || errorMessage.includes('card was declined')) {
    return 'card_declined';
  }
  
  if (errorType === 'card_error' || errorMessage.includes('card')) {
    if (errorMessage.includes('expired')) return 'expired_card';
    if (errorMessage.includes('invalid')) return 'invalid_card';
    return 'payment_method_error';
  }
  
  if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient_funds')) {
    return 'insufficient_funds';
  }
  
  if (errorMessage.includes('invoice') || errorMessage.includes('payment')) {
    return 'invoice_payment_failed';
  }
  
  if (errorMessage.includes('network') || errorType === 'network_error' || error.name === 'NetworkError') {
    return 'network_error';
  }
  
  if (errorMessage.includes('timeout') || error.name === 'TimeoutError') {
    return 'timeout';
  }
  
  // Default to generic error
  return 'default';
};

/**
 * Get user-friendly error message
 * @param {string|Error|Object} error - Error object or error code
 * @returns {string} - User-friendly error message
 */
export const getUserFriendlyErrorMessage = (error) => {
  if (!error) return ERROR_MESSAGES.default;
  
  // If error is already a string, check if it's a known error code
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || ERROR_MESSAGES.default;
  }
  
  // If it's an error object, classify it first
  const errorCode = classifyStripeError(error);
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default;
};

/**
 * Handle API errors with consistent approach
 * @param {Error|Object} error - Error from API call
 * @param {Function} setErrorState - Function to set error state if applicable
 * @param {boolean} showAlert - Whether to show alert dialog (using Alert from react-native)
 * @returns {string} - User-friendly error message
 */
export const handleApiError = (error, setErrorState = null, showAlert = false) => {
  // Remove technical details from error logs in production

  
  const friendlyMessage = getUserFriendlyErrorMessage(error);
  
  // Update state if setter function provided
  if (setErrorState && typeof setErrorState === 'function') {
    setErrorState(friendlyMessage);
  }
  
  // Show alert if requested
  if (showAlert && require('react-native').Alert) {
    const Alert = require('react-native').Alert;
    Alert.alert('Error', friendlyMessage);
  }
  
  return friendlyMessage;
};

/**
 * Enhanced error handling specifically for subscription operations
 * @param {Error|Object} error - Error from subscription operation
 * @param {Object} options - Options object
 * @param {Function} options.setErrorState - Function to set error state
 * @param {Function} options.setIsLoading - Function to set loading state
 * @param {Function} options.onComplete - Function to call when handling is complete
 * @param {boolean} options.showAlert - Whether to show alert
 * @returns {string} - User-friendly error message
 */
export const handleSubscriptionError = (error, options = {}) => {
  const { 
    setErrorState = null, 
    setIsLoading = null, 
    onComplete = null, 
    showAlert = true 
  } = options;
  
  // Turn off loading state if provided
  if (setIsLoading && typeof setIsLoading === 'function') {
    setIsLoading(false);
  }
  
  // Get user-friendly message
  const friendlyMessage = getUserFriendlyErrorMessage(error);
  
  // Handle error display
  if (setErrorState && typeof setErrorState === 'function') {
    setErrorState(friendlyMessage);
  }
  
  // Show alert if requested
  if (showAlert && require('react-native').Alert) {
    const Alert = require('react-native').Alert;
    Alert.alert('Subscription Error', friendlyMessage);
  }
  
  // Call completion handler if provided
  if (onComplete && typeof onComplete === 'function') {
    onComplete(friendlyMessage);
  }
  
  return friendlyMessage;
};
