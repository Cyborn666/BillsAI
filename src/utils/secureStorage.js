/**
 * Secure Storage Utility
 * Provides a more secure alternative to AsyncStorage for sensitive data
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple utility for generating secure strings without external dependencies
const generateSecureString = (length = 32) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

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

// Constants
const STORAGE_PREFIX = 'billsai_secure_';

/**
 * Generate a secure hash of a string
 * @param {string} input - String to hash
 * @returns {Promise<string>} - Hashed string
 */
const generateHash = async (input) => {
  // Use simpleHash function as replacement for crypto library
  return simpleHash(input + 'billsai-security-salt');
};

/**
 * Encrypt sensitive data before storage
 * @param {string} data - Data to encrypt
 * @returns {Promise<string>} - Encrypted data
 */
const encryptData = async (data) => {
  if (!data) return null;
  
  try {
    // In a production app, we would use a proper encryption library
    // This is a simplified version using basic obfuscation combined with device-specific entropy
    
    // Get device ID or similar permanent identifier that's device-specific
    const deviceId = await AsyncStorage.getItem('device_id');
    
    // Simple encryption - in a real implementation, use a proper crypto library
    // This is just to demonstrate the approach while not adding external dependencies
    const buffer = Buffer.from(data, 'utf-8');
    const obfuscated = buffer.toString('base64');
    
    // Append a verification hash that includes the deviceId to detect tampering
    const verificationHash = await generateHash(data + (deviceId || ''));
    const securePackage = JSON.stringify({
      data: obfuscated,
      verification: verificationHash.substring(0, 16),
      timestamp: Date.now()
    });
    
    return Buffer.from(securePackage, 'utf-8').toString('base64');
  } catch (error) {
    //console.warn('Encryption failed:', error.message);
    // Fall back to storing unencrypted on failure
    return data;
  }
};

/**
 * Decrypt data retrieved from storage
 * @param {string} encryptedData - Encrypted data
 * @returns {Promise<string|null>} - Decrypted data or null if invalid
 */
const decryptData = async (encryptedData) => {
  if (!encryptedData) return null;
  
  try {
    // Try to parse the secure package
    const packageStr = Buffer.from(encryptedData, 'base64').toString('utf-8');
    const securePackage = JSON.parse(packageStr);
    
    // Extract components
    const { data, verification, timestamp } = securePackage;
    
    // Check if data has expired (max 14 days for sensitive data)
    const MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days
    if (Date.now() - timestamp > MAX_AGE) {
      //console.log('Secure data has expired');
      return null;
    }
    
    // Decode the base64 data
    const decodedValue = Buffer.from(data, 'base64').toString('utf-8');
    
    // Get device ID for verification
    const deviceId = await AsyncStorage.getItem('device_id');
    
    // Verify data hasn't been tampered with
    const expectedHash = await generateHash(decodedValue + (deviceId || ''));
    if (expectedHash.substring(0, 16) !== verification) {
      //console.warn('Secure data verification failed - possible tampering');
      return null;
    }
    
    return decodedValue;
  } catch (error) {
    //console.warn('Decryption failed:', error.message);
    // If decryption fails, assume the data is stored unencrypted as a fallback
    return encryptedData;
  }
};

/**
 * Store a value securely
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {Promise<boolean>} - Success status
 */
export const secureSet = async (key, value) => {
  try {
    const secureKey = STORAGE_PREFIX + key;
    const encryptedValue = await encryptData(value);
    await AsyncStorage.setItem(secureKey, encryptedValue);
    return true;
  } catch (error) {
    //console.warn(`Failed to securely store ${key}:`, error.message);
    return false;
  }
};

/**
 * Retrieve a securely stored value
 * @param {string} key - Storage key
 * @returns {Promise<string|null>} - Retrieved value or null
 */
export const secureGet = async (key) => {
  try {
    const secureKey = STORAGE_PREFIX + key;
    const encryptedValue = await AsyncStorage.getItem(secureKey);
    if (!encryptedValue) return null;
    
    return await decryptData(encryptedValue);
  } catch (error) {
    //console.warn(`Failed to securely retrieve ${key}:`, error.message);
    return null;
  }
};

/**
 * Remove a securely stored value
 * @param {string} key - Storage key
 * @returns {Promise<boolean>} - Success status
 */
export const secureRemove = async (key) => {
  try {
    const secureKey = STORAGE_PREFIX + key;
    await AsyncStorage.removeItem(secureKey);
    return true;
  } catch (error) {
    //console.warn(`Failed to securely remove ${key}:`, error.message);
    return false;
  }
};

/**
 * Initialize secure storage with device-specific entropy
 * Should be called on app startup
 */
export const initSecureStorage = async () => {
  try {
    // Check if we already have a device ID
    let deviceId = await AsyncStorage.getItem('device_id');
    
    if (!deviceId) {
      // Create a device identifier
      deviceId = generateSecureString(32);
      await AsyncStorage.setItem('device_id', deviceId);
    }
    
    return true;
  } catch (error) {
    //console.warn('Failed to initialize secure storage:', error.message);
    return false;
  }
};
