/**
 * Subscription Data Verifier
 * Provides verification utilities to ensure subscription data integrity
 */
// Simple hash function using string operations
const simpleHash = (str) => {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

// Generate random string for security purposes
const generateSecureString = (length = 32) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const VERIFICATION_SALT_KEY = 'subscription_verification_salt';
const MAX_SUBSCRIPTION_AGE = 60 * 60 * 1000; // 1 hour max age for cached subscription

/**
 * Generate verification signature for subscription data
 * @param {Object} subscriptionData - Subscription data to sign
 * @returns {Promise<string>} - Signature for verification
 */
export const generateSignature = async (subscriptionData) => {
  try {
    // Get or create a verification salt
    let salt = await AsyncStorage.getItem(VERIFICATION_SALT_KEY);
    if (!salt) {
      // Generate a random salt string
      salt = generateSecureString(32);
      await AsyncStorage.setItem(VERIFICATION_SALT_KEY, salt);
    }

    // Create a string to hash from critical subscription properties
    const dataToHash = JSON.stringify({
      id: subscriptionData._id || subscriptionData.id,
      planId: subscriptionData.planId,
      status: subscriptionData.status,
      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
      timestamp: subscriptionData.verificationTimestamp || Date.now(),
    }) + salt;

    // Generate hash using our simple implementation
    const signature = simpleHash(dataToHash);

    return signature;
  } catch (error) {
    //console.warn('Failed to generate subscription signature:', error.message);
    return null;
  }
};

/**
 * Add verification signature to subscription data
 * @param {Object} subscriptionData - Subscription data to sign
 * @returns {Promise<Object>} - Subscription data with verification
 */
export const signSubscriptionData = async (subscriptionData) => {
  if (!subscriptionData) return null;

  try {
    // Clone the data to avoid modifying the original
    const verifiedData = { ...subscriptionData };
    
    // Add verification timestamp
    verifiedData.verificationTimestamp = Date.now();
    
    // Generate and add signature
    const signature = await generateSignature(verifiedData);
    if (signature) {
      verifiedData.verificationSignature = signature;
    }
    
    return verifiedData;
  } catch (error) {
    //console.warn('Failed to sign subscription data:', error.message);
    return subscriptionData; // Return original data if signing fails
  }
};

/**
 * Verify subscription data integrity
 * @param {Object} subscriptionData - Subscription data to verify
 * @returns {Promise<boolean>} - True if verified, false if modified or expired
 */
export const verifySubscriptionData = async (subscriptionData) => {
  if (!subscriptionData || !subscriptionData.verificationSignature) {
    return false;
  }

  try {
    // Check if data is expired
    const timestamp = subscriptionData.verificationTimestamp || 0;
    const age = Date.now() - timestamp;
    
    if (age > MAX_SUBSCRIPTION_AGE) {
      //console.log('Subscription data expired');
      return false;
    }
    
    // Generate expected signature
    const expectedSignature = await generateSignature(subscriptionData);
    
    // Compare signatures
    return expectedSignature === subscriptionData.verificationSignature;
  } catch (error) {
    //console.warn('Subscription verification failed:', error.message);
    return false;
  }
};

/**
 * Safely access premium features based on verified subscription
 * @param {Object} subscriptionData - Subscription data to check
 * @param {Function} onUnverified - Callback when verification fails
 * @returns {Promise<boolean>} - True if premium access is allowed
 */
export const canAccessPremiumFeatures = async (subscriptionData, onUnverified) => {
  // Check if data exists and has premium plan
  if (!subscriptionData || subscriptionData.planId !== 'premium') {
    return false;
  }
  
  // For local development, always allow premium without verification
  if (__DEV__) {
    return true;
  }
  
  // Verify data integrity
  const isVerified = await verifySubscriptionData(subscriptionData);
  
  if (!isVerified) {
    // Call the unverified callback if provided
    if (onUnverified && typeof onUnverified === 'function') {
      onUnverified();
    }
    return false;
  }
  
  // Check additional conditions
  return (
    subscriptionData.status === 'active' || 
    subscriptionData.status === 'trialing'
  );
};
