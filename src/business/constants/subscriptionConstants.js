/**
 * Subscription Plan Constants
 * Centralized source of truth for subscription plans across client and server
 */

// Product ID mapping constants
export const SUBSCRIPTION_PRODUCTS = {
  MONTHLY: {
    id: 'com.billsai.subscription.monthly',
    type: 'monthly',
    durationMonths: 1,
    planId: 'premium',
    internal: 'monthly'
  },
  YEARLY: {
    id: 'com.billsai.subscription.yearly',
    type: 'yearly', 
    durationMonths: 12,
    planId: 'premium',
    internal: 'yearly'
  },
  FREE: {
    id: null,
    type: 'free',
    durationMonths: 0,
    planId: 'free',
    internal: 'free'
  }
};

// Convert external product ID to internal plan details
export const getInternalPlanFromProductId = (productId) => {
  if (!productId) return SUBSCRIPTION_PRODUCTS.FREE;
  
  // Find the matching product
  for (const key in SUBSCRIPTION_PRODUCTS) {
    if (SUBSCRIPTION_PRODUCTS[key].id === productId) {
      return SUBSCRIPTION_PRODUCTS[key];
    }
  }
  
  // Default to free if not found
  return SUBSCRIPTION_PRODUCTS.FREE;
};

// Convert internal plan ID to external product ID
export const getProductIdFromInternalPlan = (internalPlanId) => {
  // Find the matching plan
  for (const key in SUBSCRIPTION_PRODUCTS) {
    if (SUBSCRIPTION_PRODUCTS[key].internal === internalPlanId) {
      return SUBSCRIPTION_PRODUCTS[key].id;
    }
  }
  
  // Return null if not found
  return null;
};

// List of all product IDs for StoreKit
export const SUBSCRIPTION_SKUS = Object.values(SUBSCRIPTION_PRODUCTS)
  .filter(product => product.id)
  .map(product => product.id);

// Default export for backward compatibility
export default {
  SUBSCRIPTION_PRODUCTS,
  SUBSCRIPTION_SKUS,
  getInternalPlanFromProductId,
  getProductIdFromInternalPlan
};
