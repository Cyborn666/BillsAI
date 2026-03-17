/**
 * Business Subscription Service
 * Handles all business subscription-related operations
 */
import { apiRequest } from '../../utils/apiUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleSubscriptionError, getUserFriendlyErrorMessage } from '../../utils/errorUtils';
import { signSubscriptionData, verifySubscriptionData, canAccessPremiumFeatures } from '../../utils/subscriptionVerifier';

// Constants
const SUBSCRIPTION_STORAGE_KEY = 'business_subscription_data';
const SUBSCRIPTION_LAST_FETCH_KEY = 'business_subscription_last_fetch';

/**
 * Get current business subscription details
 * @returns {Promise<Object>} Current subscription data
 */
export const getSubscription = async (options = {}) => {
  const { onError, forceRefresh = false } = options;

  try {
    // Check if we have recently fetched data and it's not a forced refresh
    if (!forceRefresh) {
      try {
        const lastFetchTime = await AsyncStorage.getItem(SUBSCRIPTION_LAST_FETCH_KEY);
        const cachedData = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);

        // Use cached data if it exists and was fetched in the last 5 minutes
        if (lastFetchTime && cachedData) {
          const timeSinceFetch = Date.now() - parseInt(lastFetchTime, 10);
          if (timeSinceFetch < 5 * 60 * 1000) { // 5 minutes
            return JSON.parse(cachedData);
          }
        }
      } catch (cacheError) {
        // If there's an error reading from cache, we'll continue with the fetch
      }
    }

    // Create timeout promise to handle network timeouts gracefully
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), 15000)
    );

    // Race the API request against the timeout
    const response = await Promise.race([
      apiRequest('/business/subscription', { method: 'GET' }),
      timeoutPromise
    ]);

    //console.log('Subscription response:', response);

    // If we got a valid response, sign and cache it for offline use
    if (response && !response.error) {
      // Sign the data for security verification
      const signedData = await signSubscriptionData(response);
      
      await Promise.all([
        AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(signedData)),
        AsyncStorage.setItem(SUBSCRIPTION_LAST_FETCH_KEY, Date.now().toString())
      ]);
      return response; // Return original response to maintain API compatibility
    } else if (response && response.error) {
      throw new Error(response.error);
    }

    throw new Error('Invalid response format');
  } catch (error) {
    // Handle and classify the error
    if (onError && typeof onError === 'function') {
      onError(getUserFriendlyErrorMessage(error));
    }

    // Try to get cached subscription data
    try {
      const cachedData = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (cachedData) {
        // Parse the cached data
        const parsedData = JSON.parse(cachedData);
        
        // Verify the data integrity
        const isVerified = await verifySubscriptionData(parsedData);
        
        if (isVerified) {
          // Log that we're using cached data due to error
          //console.log('Using verified cached subscription data due to fetch error');
          return parsedData;
        }
        
        //console.log('Cached subscription data failed verification, using default');
      }
    } catch (cacheError) {
      // Silent fail when reading from cache as a fallback
    }
    // Return a default free subscription if all else fails
    return {
      planId: 'free',
      status: 'active',
      isPremium: false,
    };
  }
};

/**
 * Check if user has premium subscription with verification
 * @returns {Promise<boolean>} True if user has active premium subscription
 */
export const hasPremiumSubscription = async () => {
  const subscription = await getSubscription();
  
  // Use the verification utility for additional security
  return await canAccessPremiumFeatures(subscription, () => {
    // This callback is executed if verification fails
    // Force a fresh subscription data fetch next time
    AsyncStorage.removeItem(SUBSCRIPTION_LAST_FETCH_KEY);
  });
};

/**
 * Toggle subscription auto-renewal setting
 * @param {string} subscriptionId The ID of the subscription to update
 * @param {boolean} autoRenewal True to enable auto-renewal, false to disable
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Updated subscription data
 */
export const toggleAutoRenewal = async (subscriptionId, autoRenewal, options = {}) => {
  const { onError, retryCount = 2 } = options;

  let attempts = 0;
  let lastError = null;

  while (attempts <= retryCount) {
    try {
      // Implement exponential backoff for retries
      if (attempts > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000); // Max 5 second delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      attempts++;

      // Create timeout promise to handle network timeouts gracefully
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 10000)
      );

      // Race the API request against the timeout
      const response = await Promise.race([
        apiRequest(`/business/subscription/${subscriptionId}/auto-renewal`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ autoRenewal })
        }),
        timeoutPromise
      ]);

      // If response has error property, throw it to trigger the catch block
      if (response && response.error) {
        throw new Error(response.error);
      }

      // If successful, sign and update the cached subscription data and fetch timestamp
      if (response) {
        // Sign the data for security verification
        const signedData = await signSubscriptionData(response);
        
        await Promise.all([
          AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(signedData)),
          AsyncStorage.setItem(SUBSCRIPTION_LAST_FETCH_KEY, Date.now().toString())
        ]);
        return response; // Return original response to maintain API compatibility
      }

      throw new Error('Invalid response format');
    } catch (error) {
      lastError = error;

      // Only retry on network errors or timeouts
      if (!error.message?.includes('network') && !error.message?.includes('time')) {
        break;
      }
    }
  }

  // Handle the error using our utility
  const errorMessage = getUserFriendlyErrorMessage('auto_renewal_toggle_failed');

  if (onError && typeof onError === 'function') {
    onError(errorMessage);
  }

  // Try to get and return cached data so UI isn't broken
  try {
    const cachedData = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      return {
        ...data,
        error: errorMessage
      };
    }
  } catch (cacheError) {
    // Silent fail when reading from cache as a fallback
  }

  // Return error object that can be handled by the UI
  return { error: errorMessage };
};

/**
 * Create a new business subscription or get payment sheet data
 * @param {Object} subscriptionData Subscription details and payment options
 * @param {string} subscriptionData.planId - The plan ID to subscribe to
 * @param {string} [subscriptionData.paymentMethodId] - Payment method ID for direct payments
 * @param {boolean} [subscriptionData.setupIntent] - True to get a setup intent for PaymentSheet
 * @param {boolean} [subscriptionData.setupIntentCompleted] - True when PaymentSheet is completed
 * @returns {Promise<Object>} Created subscription or payment intent details
 */
export const createSubscription = async (subscriptionData) => {
  try {
    // Create subscription on the server - all payment handling happens on backend
    const response = await apiRequest('/business/subscription', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Only store in cache if it's a completed subscription (not just a setup intent)
    if (!subscriptionData.setupIntent) {
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(response));
    }

    // Return the response (either subscription data or payment intent data)
    return response;
  } catch (error) {
    //console.error('Subscription creation error:', error);
    return { error: error.message };
  }
};


/**
 * Update an existing business subscription
 * @param {string} subscriptionId - Subscription ID
 * @param {Object} updateData - { planId }
 * @returns {Promise<Object>} Updated subscription
 */
export const updateSubscription = async (subscriptionId, updateData) => {
  try {
    const response = await apiRequest(`/business/subscription/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // All payment processing is handled on the backend
    
    return response;
  } catch (error) {
    //console.error('Subscription update error:', error);
    return { error: error.message };
  }
};

/**
 * Cancel a business subscription
 * @param {string} subscriptionId - Subscription ID
 * @returns {Promise<Object>} Cancellation result
 */
export const cancelSubscription = async (subscriptionId) => {
  const response = await apiRequest(`/business/subscription/${subscriptionId}`, {
    method: 'DELETE',
  });
  
  // Update local cache if needed
  if (response && !response.error) {
    // Get current data to modify
    const currentData = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (currentData) {
      const data = JSON.parse(currentData);
      data.status = 'canceled';
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(data));
    }
  }
  
  return response;
};

/**
 * Get subscription plans available for business users
 * @returns {Promise<Array>} List of available subscription plans
 */
export const getSubscriptionPlans = async () => {
  return apiRequest('/business/subscription/plans', { method: 'GET' });
};

/**
 * Check if user can access premium feature
 * @param {string} featureType - Type of premium feature (e.g., 'invoiceGenerator', 'reports')
 * @returns {Promise<boolean>} Whether the user can access this premium feature
 */
export const canAccessPremiumFeature = async (featureType) => {
  try {
    const hasPremium = await hasPremiumSubscription();
    
    // If user has premium access, they can access all premium features
    if (hasPremium) {
      return true;
    }
    
    // TODO: Add logic for feature-specific free tier allowances
    // This could be extended to check specific feature limits
    // But for now we'll just use the premium status
    return false;
  } catch (error) {
    //console.error('Error checking feature access:', error);
    return false;
  }
};


