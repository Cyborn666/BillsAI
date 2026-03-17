/**
 * Platform-specific payment service
 * Handles platform-specific payment methods (Stripe for Android/Web, StoreKit for iOS)
 */
import { Platform, Linking } from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import * as iapService from './iapService';
import { SUBSCRIPTION_PRODUCTS, getProductIdFromInternalPlan } from '../constants/subscriptionConstants';

// Map between internal plan IDs and platform-specific product IDs
const PLAN_TO_PRODUCT_MAP = {
  premium: {
    ios: 'com.billsai.subscription.monthly', // Default to monthly for backward compatibility
  },
  monthly: {
    ios: 'com.billsai.subscription.monthly',
  },
  yearly: {
    ios: 'com.billsai.subscription.yearly',
  }
};

/**
 * Get the platform-appropriate payment mechanism for a given plan
 * @param {string} planId - Internal plan ID (e.g., 'premium', 'monthly', 'yearly')
 * @returns {Object} Payment mechanism details
 */
export const getPaymentMechanism = (planId) => {
  // iOS uses StoreKit
  if (Platform.OS === 'ios') {
    // Get product ID from constants for better maintainability
    const productId = getProductIdFromInternalPlan(planId) || PLAN_TO_PRODUCT_MAP[planId]?.ios;
    
    return {
      type: 'apple',
      productId,
    };
  }
  
  // All other platforms use Stripe
  return {
    type: 'stripe',
  };
};

/**
 * Purchase a subscription using the platform-appropriate payment system
 * @param {string} planId - Internal plan ID (e.g., 'premium', 'monthly', 'yearly')
 * @returns {Promise<Object>} Result of the purchase attempt
 */
export const purchaseSubscription = async (planId) => {
  try {
    const mechanism = getPaymentMechanism(planId);
    
    if (mechanism.type === 'apple') {
      if (!mechanism.productId) {
        throw new Error(`No Apple product ID found for plan: ${planId}`);
      }
      
      return await iapService.purchaseSubscription(mechanism.productId);
    }
    
    // For non-iOS platforms, return data to indicate Stripe should be used
    return { success: true, useStripe: true };
  } catch (error) {
    //console.error(`[PlatformPaymentService] Purchase error for plan ${planId}:`, error.message);
    return { 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
};

/**
 * Restore previous purchases (iOS only)
 * @returns {Promise<Object>} Result of the restore attempt
 */
export const restorePurchases = async () => {
  try {
    if (Platform.OS === 'ios') {
      return await iapService.restorePurchases();
    }
    
    throw new Error('Restore purchases is only available on iOS');
  } catch (error) {
    //console.error('[PlatformPaymentService] Restore error:', error.message);
    return { 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
};

/**
 * Open platform-specific subscription management
 * @returns {Promise<boolean>} Whether the subscription management was opened
 */
export const openSubscriptionManagement = async () => {
  try {
    if (Platform.OS === 'ios') {
      return await Linking.openURL('https://apps.apple.com/account/subscriptions');
    }
    
    // On other platforms, return false to indicate management should be handled in-app
    return false;
  } catch (error) {
    //console.error('[PlatformPaymentService] Failed to open subscription management:', error.message);
    return false;
  }
};

/**
 * Initialize the payment service for the current platform
 * @returns {Promise<boolean>} Whether initialization was successful
 */
export const initializePaymentService = async () => {
  try {
    if (Platform.OS === 'ios') {
      const initialized = await iapService.initializeIAP();
      
      if (initialized) {
        // Set up purchase listeners which emit events that components can listen to
        iapService.setupPurchaseListeners();
        return true;
      }
      return false;
    }
    
    // Other platforms don't need special initialization
    return true;
  } catch (error) {
    //console.error('[PlatformPaymentService] Initialization error:', error.message);
    return false;
  }
};

/**
 * Toggle auto-renewal status for a subscription
 * Currently only supported in-app for non-iOS platforms
 * iOS users must manage subscriptions through App Store
 * @param {boolean} enableAutoRenewal - Whether to enable auto-renewal
 * @returns {Promise<Object>} Result of the operation
 */
export const toggleAutoRenewal = async (enableAutoRenewal) => {
  try {
    if (Platform.OS === 'ios') {
      // For iOS, redirect to App Store subscription management
      const opened = await openSubscriptionManagement();
      return { 
        success: opened, 
        message: opened ? 
          'Please manage your subscription in the App Store' : 
          'Could not open App Store subscription management'
      };
    }
    
    // For other platforms (implementation would be different, likely using Stripe)
    // This is just a placeholder - actual implementation would call a backend endpoint
    return { 
      success: false, 
      error: 'Not implemented for this platform',
      needsServerImplementation: true 
    };
  } catch (error) {
    //console.error('[PlatformPaymentService] ToggleAutoRenewal error:', error.message);
    return { success: false, error: error.message };
  }
};

// Register for purchase events
export const registerPurchaseListener = (callback) => {
  if (typeof callback !== 'function') {
    //console.error('[PlatformPaymentService] Invalid purchase listener callback');
    return () => {};
  }
  
  const subscription = DeviceEventEmitter.addListener('purchaseEvent', callback);
  return () => subscription.remove();
};

export default {
  getPaymentMechanism,
  purchaseSubscription,
  restorePurchases,
  openSubscriptionManagement,
  initializePaymentService,
  toggleAutoRenewal,
  registerPurchaseListener
};
