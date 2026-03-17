/**
 * In-App Purchase Service for iOS
 * Provides secure handling of StoreKit transactions with robust error handling
 * and protection against duplicate transaction processing
 */
import {
  initConnection,
  getSubscriptions,
  requestSubscription,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
} from 'react-native-iap';
import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../../utils/apiUtils';

// Import centralized subscription constants
import { SUBSCRIPTION_SKUS } from '../constants/subscriptionConstants';

// Storage keys for persistence
const STORAGE_KEYS = {
  PROCESSED_TRANSACTIONS: 'iap_processed_transactions',
  PENDING_COMPLETIONS: 'iap_pending_completions',
  LAST_VALIDATION_TIME: 'iap_last_validation_time',
  VALIDATION_CACHE: 'iap_validation_cache',
};

// Configuration constants
const CONFIG = {
  // Initialization retry settings
  MAX_INIT_ATTEMPTS: 3,
  INIT_RETRY_DELAY: 2000, // Base delay in ms

  // Transaction caching settings
  MAX_CACHED_TRANSACTIONS: 100,
  
  // Receipt validation
  RECEIPT_VALIDATION_DEBOUNCE: 5000, // Avoid sending duplicate validation requests
  VALIDATION_CACHE_TTL: 60 * 60 * 1000, // 1 hour in ms
};

// State management
let isInitialized = false;
let initializationAttempts = 0;
let lastInitAttemptTime = 0;
let purchaseListenerRemover = null;
let processedTransactions = new Set();
let autoReceiptsDisabled = false;

// Track account mismatch alerts to prevent showing multiple alerts for the same issue
let accountMismatchAlertShown = false;
let lastMismatchAlertTime = 0;
const MISMATCH_ALERT_DEBOUNCE_MS = 2000; // Only show an alert once every 2 seconds

/**
 * Initialize IAP connection with error handling and retry logic
 * @returns {Promise<boolean>} Success status
 */
export const initializeIAP = async () => {
  // Early return for non-iOS platforms
  if (Platform.OS !== 'ios') {
    return false;
  }
  
  // If already initialized successfully, don't reinitialize
  if (isInitialized) {
    return true;
  }
  
  // Implement exponential backoff for retries
  const now = Date.now();
  const shouldWait = initializationAttempts > 0 && 
    (now - lastInitAttemptTime) < (CONFIG.INIT_RETRY_DELAY * Math.pow(2, initializationAttempts - 1));
  
  if (shouldWait) {
    //console.log('[IAP] Waiting before retry attempt...');
    return false;
  }
  
  // Track attempt
  initializationAttempts++;
  lastInitAttemptTime = now;
  
  // Limit retry attempts
  if (initializationAttempts > CONFIG.MAX_INIT_ATTEMPTS) {
    //console.error(`[IAP] Exceeded maximum initialization attempts (${CONFIG.MAX_INIT_ATTEMPTS})`);
    return false;
  }
  
  try {
    //console.log(`[IAP] Initialization attempt ${initializationAttempts}/${CONFIG.MAX_INIT_ATTEMPTS}`);
    
    // Initialize connection to App Store
    await initConnection();
    
    // Check if auto receipts have been disabled
    if (autoReceiptsDisabled) {
      //console.log('[IAP] Using server-side receipt validation');
    }
    
    isInitialized = true;
    initializationAttempts = 0; // Reset counter on success
    
    // Load processed transactions from persistent storage
    await loadProcessedTransactions();
    
    // Check for any pending transaction completions
    await checkPendingCompletions();
    
    // Clear any pending transactions to ensure a clean state
    await clearPendingTransactions();
    
    //console.log('[IAP] Successfully initialized');
    return true;
  } catch (error) {
    //console.error(`[IAP] Initialization failed (attempt ${initializationAttempts}/${CONFIG.MAX_INIT_ATTEMPTS}):`, error.message);
    isInitialized = false;
    return false;
  }
};

/**
 * Load processed transaction IDs from persistent storage
 * @private
 */
const loadProcessedTransactions = async () => {
  if (Platform.OS !== 'ios') return;
  
  try {
    const storedTransactions = await AsyncStorage.getItem(STORAGE_KEYS.PROCESSED_TRANSACTIONS);
    if (storedTransactions) {
      const transactionIds = JSON.parse(storedTransactions);
      processedTransactions = new Set(transactionIds);
      //console.log(`[IAP] Loaded ${processedTransactions.size} processed transaction IDs from storage`);
    }
  } catch (error) {
    //console.error('[IAP] Failed to load processed transactions:', error.message);
  }
};

/**
 * Save a transaction ID to prevent duplicate processing
 * @param {string} transactionId - The transaction ID to save
 * @private
 */
const saveProcessedTransaction = async (transactionId) => {
  if (!transactionId || Platform.OS !== 'ios') return;
  
  try {
    // Add to in-memory set first
    processedTransactions.add(transactionId);
    
    // Then save to persistent storage
    const transactions = Array.from(processedTransactions);
    
    // Limit the number of stored transactions to prevent unlimited growth
    if (transactions.length > CONFIG.MAX_CACHED_TRANSACTIONS) {
      transactions.splice(0, transactions.length - CONFIG.MAX_CACHED_TRANSACTIONS);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.PROCESSED_TRANSACTIONS, JSON.stringify(transactions));
  } catch (error) {
    //console.error('[IAP] Failed to save processed transaction:', error.message);
  }
};

/**
 * Add a transaction to the pending completions list
 * @param {string} transactionId - Transaction ID to track for later completion
 * @private
 */
const addPendingCompletion = async (transactionId) => {
  if (!transactionId || Platform.OS !== 'ios') return;
  
  try {
    const pendingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_COMPLETIONS) || '[]';
    const pendingCompletions = JSON.parse(pendingData);
    
    if (!pendingCompletions.includes(transactionId)) {
      pendingCompletions.push(transactionId);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_COMPLETIONS, JSON.stringify(pendingCompletions));
      //console.log(`[IAP] Added transaction ${transactionId} to pending completions`);
    }
  } catch (error) {
    //console.error('[IAP] Failed to save pending completion:', error.message);
  }
};

/**
 * Check for pending transaction completions and attempt to finish them
 * @private
 */
const checkPendingCompletions = async () => {
  if (Platform.OS !== 'ios' || !isInitialized) return;
  
  try {
    const pendingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_COMPLETIONS);
    if (!pendingData) return;
    
    const pendingCompletions = JSON.parse(pendingData);
    if (!pendingCompletions.length) return;
    
    //console.log(`[IAP] Found ${pendingCompletions.length} pending transaction completions to attempt`);
    
    // Get available purchases to match against pending completions
    const purchases = await getAvailablePurchases();
    if (!purchases || !purchases.length) return;
    
    // Map purchases by transaction ID for quick lookup
    const purchaseMap = {};
    purchases.forEach(purchase => {
      if (purchase.transactionId) {
        purchaseMap[purchase.transactionId] = purchase;
      }
    });
    
    // Track which transactions were processed
    const completedTransactions = [];
    
    // Try to finish each pending transaction
    for (const pendingId of pendingCompletions) {
      if (purchaseMap[pendingId]) {
        try {
          await finishTransaction({ purchase: purchaseMap[pendingId], isConsumable: false });
          //console.log(`[IAP] Successfully completed pending transaction ${pendingId}`);
          completedTransactions.push(pendingId);
        } catch (err) {
          //console.error(`[IAP] Failed to complete transaction ${pendingId}:`, err.message);
        }
      } else {
        // Transaction is no longer available, so consider it done
        completedTransactions.push(pendingId);
      }
    }
    
    // Remove completed transactions from the pending list
    if (completedTransactions.length > 0) {
      const remainingTransactions = pendingCompletions.filter(
        id => !completedTransactions.includes(id)
      );
      
      // Update storage
      if (remainingTransactions.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_COMPLETIONS, JSON.stringify(remainingTransactions));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPLETIONS);
      }
    }
  } catch (error) {
    //console.error('[IAP] Error checking pending completions:', error.message);
  }
};

/**
 * Clear any pending transactions to ensure a clean state
 * @returns {Promise<boolean>} Whether any transactions were cleared
 */
export const clearPendingTransactions = async () => {
  if (Platform.OS !== 'ios' || !isInitialized) {
    return false;
  }
  
  try {
    //console.log('[IAP] Checking for pending transactions to clear...');
    const purchases = await getAvailablePurchases();
    
    if (purchases && purchases.length > 0) {
      //console.log(`[IAP] Found ${purchases.length} pending transaction(s). Finishing them now...`);
      
      for (const purchase of purchases) {
        try {
          await finishTransaction({ purchase, isConsumable: false });
          //console.log(`[IAP] Finished transaction ${purchase.transactionId}`);
        } catch (err) {
          //console.error(`[IAP] Failed to finish transaction ${purchase.transactionId}:`, err.message);
          
          // Add to pending completions for later retry
          if (purchase.transactionId) {
            await addPendingCompletion(purchase.transactionId);
          }
        }
      }
      return true;
    }
    
    //console.log('[IAP] No pending transactions to clear');
    return false;
  } catch (error) {
    //console.error('[IAP] Failed to clear transactions:', error.message);
    return false;
  }
};

/**
 * Get available subscriptions from App Store
 * @returns {Promise<Array>} List of available subscription products
 */
export const getAvailableSubscriptions = async () => {
  try {
    if (Platform.OS !== 'ios') {
      return [];
    }
    
    // Ensure IAP is initialized
    if (!isInitialized && !(await initializeIAP())) {
      //console.error('[IAP] Cannot get subscriptions - IAP not initialized');
      return [];
    }
    
    //console.log('[IAP] Fetching available subscriptions with SKUs:', SUBSCRIPTION_SKUS);
    const products = await getSubscriptions({ skus: SUBSCRIPTION_SKUS });
    
    if (products.length === 0) {
      //console.warn('[IAP] No subscription products found - check App Store Connect setup');
    } else {
      //console.log(`[IAP] Found ${products.length} subscription products`);
    }
    
    return products;
  } catch (error) {
    //console.error('[IAP] Failed to get subscriptions:', error.message);
    return [];
  }
};

/**
 * Purchase a subscription
 * @param {string} productId - The StoreKit product ID to purchase
 * @returns {Promise<Object>} Purchase result
 */
export const purchaseSubscription = async (productId) => {
  try {
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'IAP only available on iOS' };
    }
    
    // Ensure IAP is initialized
    if (!isInitialized && !(await initializeIAP())) {
      throw new Error('IAP service could not be initialized');
    }
    
    //console.log(`[IAP] Attempting to purchase product: ${productId}`);
    
    // Request the subscription
    await requestSubscription({
      sku: productId,
      andDangerouslyFinishTransactionAutomaticallyIOS: false, // Manually finish to ensure proper validation
    });
    
    return { success: true, pending: true };
  } catch (error) {
    // Handle user cancellation differently from actual errors
    if (error.message && error.message.includes('cancelled')) {
      //console.log('[IAP] User cancelled purchase');
      return { success: false, cancelled: true, error: 'Purchase cancelled' };
    }
    
    //console.error('[IAP] Purchase failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Restore previous purchases
 * @returns {Promise<Object>} Restore result with subscription details if successful
 */
export const restorePurchases = async () => {
  try {
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'IAP restore only available on iOS' };
    }
    
    // Ensure IAP is initialized
    if (!isInitialized && !(await initializeIAP())) {
      throw new Error('IAP service could not be initialized');
    }
    
    //console.log('[IAP] Attempting to restore purchases');
    const purchases = await getAvailablePurchases();
    
    if (!purchases || purchases.length === 0) {
      return { success: false, message: 'No purchases to restore' };
    }
    
    //console.log(`[IAP] Found ${purchases.length} purchase(s) to evaluate`);
    
    // Group purchases by their original transaction ID to find unique subscriptions
    const uniqueSubscriptions = {};
    purchases.forEach(purchase => {
      if (!purchase.transactionReceipt) return;

      // Extract original transaction ID or use transaction ID as fallback
      const originalId = purchase.originalTransactionId || purchase.transactionId;
      
      // Keep the most recent purchase for each original transaction ID
      if (!uniqueSubscriptions[originalId] || 
          purchase.transactionDate > uniqueSubscriptions[originalId].transactionDate) {
        uniqueSubscriptions[originalId] = purchase;
      }
    });
    
    const uniquePurchases = Object.values(uniqueSubscriptions);
    //console.log(`[IAP] Found ${uniquePurchases.length} unique subscription(s)`);
    
    if (uniquePurchases.length === 0) {
      return { success: false, message: 'No valid purchases to restore' };
    }
    
    // Start with the most recent purchase
    uniquePurchases.sort((a, b) => b.transactionDate - a.transactionDate);
    
    // Try to validate each purchase until one succeeds
    for (const purchase of uniquePurchases) {
      try {
        //console.log(`[IAP] Validating purchase with transaction ID ${purchase.transactionId}`);
        const result = await validateReceiptWithServer(purchase.transactionReceipt);
        
        if (result.success) {
          // Finish the transaction after successful validation
          try {
            await finishTransaction({ purchase, isConsumable: false });
          } catch (finishError) {
            //console.error('[IAP] Error finishing transaction after restore:', finishError.message);
            // Add to pending completions for later retry
            if (purchase.transactionId) {
              await addPendingCompletion(purchase.transactionId);
            }
          }
          
          return {
            success: true,
            message: 'Successfully restored your subscription',
            subscription: result.subscription
          };
        }
      } catch (innerError) {
        //console.log(`[IAP] Failed to validate purchase: ${innerError.message}. Trying next purchase if available.`);
      }
    }
    
    // If no purchase validation succeeded
    return { success: false, message: 'Unable to restore any valid subscription' };
  } catch (error) {
    //console.error('[IAP] Restore failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Set up listeners for purchase events
 * @returns {Function} Function to remove listeners when component unmounts
 */
export const setupPurchaseListeners = () => {
  if (Platform.OS !== 'ios') {
    return () => {}; // Return empty cleanup function for non-iOS
  }
  
  // Remove any existing listeners before adding new ones
  if (typeof purchaseListenerRemover === 'function') {
    purchaseListenerRemover();
    purchaseListenerRemover = null;
  }
  
  // Listen for purchase updates
  const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
    try {
      if (!purchase) {
        //console.warn('[IAP] Received empty purchase update');
        return;
      }
      
      //console.log('[IAP] Purchase update received');
      
      // Skip if this transaction has already been processed
      if (purchase.transactionId && processedTransactions.has(purchase.transactionId)) {
        //console.log(`[IAP] Transaction ${purchase.transactionId} already processed. Skipping.`);
        // Still need to finish the transaction to clear it from the queue
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch (finishError) {
          //console.error(`[IAP] Error finishing already processed transaction:`, finishError.message);
          // Add to pending completions for later retry
          await addPendingCompletion(purchase.transactionId);
        }
        return;
      }
      
      if (purchase.transactionReceipt) {
        // Add this transaction to our processed set and save to persistent storage
        if (purchase.transactionId) {
          await saveProcessedTransaction(purchase.transactionId);
          //console.log(`[IAP] Tracking transaction ${purchase.transactionId} to prevent duplicate processing`);
        }
        
        // Validate the purchase with the server
        const validationResult = await validateReceiptWithServer(purchase.transactionReceipt);
        
        if (validationResult.success) {
          //console.log('[IAP] Purchase was validated successfully');
          
          // After server validation, finish the transaction
          try {
            await finishTransaction({ purchase, isConsumable: false });
            //console.log('[IAP] Transaction finished with Apple');
            
            // Emit purchase event for components to react
            DeviceEventEmitter.emit('purchaseEvent', { 
              type: 'success',
              productId: purchase.productId,
              transactionDate: purchase.transactionDate,
              subscription: validationResult.subscription
            });
          } catch (finishError) {
            //console.error('[IAP] Failed to finish transaction:', finishError.message);
            
            // Add to pending completions to retry later
            if (purchase.transactionId) {
              await addPendingCompletion(purchase.transactionId);
            }
            
            // Still emit success since server validation succeeded
            DeviceEventEmitter.emit('purchaseEvent', { 
              type: 'success',
              productId: purchase.productId,
              transactionDate: purchase.transactionDate,
              subscription: validationResult.subscription,
              pendingCompletion: true
            });
          }
        } else {
          //console.error('[IAP] Receipt validation failed:', validationResult.message);
          
          // Emit failure event
          DeviceEventEmitter.emit('purchaseEvent', {
            type: 'error',
            error: validationResult.message || 'Receipt validation failed',
            productId: purchase.productId
          });
          
          // Remove from processed transactions to allow retrying
          if (purchase.transactionId) {
            processedTransactions.delete(purchase.transactionId);
          }
        }
      } else {
        //console.warn('[IAP] Purchase update received but no transaction receipt found');
        DeviceEventEmitter.emit('purchaseEvent', {
          type: 'error',
          error: 'No receipt available',
          productId: purchase.productId
        });
      }
    } catch (error) {
      //console.error('[IAP] Purchase update handler failed:', error.message);
      DeviceEventEmitter.emit('purchaseEvent', {
        type: 'error',
        error: error.message || 'Unknown purchase error',
        productId: purchase?.productId
      });
    }
  });

  // Listen for purchase errors
  const purchaseErrorSubscription = purchaseErrorListener((error) => {
    //console.error('[IAP] Purchase error listener:', error.message || 'Unknown error');
    
    // Emit error event
    DeviceEventEmitter.emit('purchaseEvent', {
      type: 'error',
      error: error.message || 'Unknown purchase error',
    });
  });

  // Store remover function
  purchaseListenerRemover = () => {
    purchaseUpdateSubscription.remove();
    purchaseErrorSubscription.remove();
  };

  // Return cleanup function
  return purchaseListenerRemover;
};

/**
 * Send receipt to server for validation with de-duplication
 * @param {string} receipt - The transaction receipt
 * @returns {Promise<Object>} Validation result from server
 */
const validateReceiptWithServer = async (receipt) => {
  try {
    if (!receipt) {
      throw new Error('No receipt data provided');
    }
    
    // Implement debouncing to prevent multiple validation calls in quick succession
    const now = Date.now();
    const lastValidationTime = parseInt(await AsyncStorage.getItem(STORAGE_KEYS.LAST_VALIDATION_TIME) || '0', 10);
    
    // Check if we've validated recently and return cached result if available
    if (now - lastValidationTime < CONFIG.RECEIPT_VALIDATION_DEBOUNCE) {
      const cachedResult = await AsyncStorage.getItem(STORAGE_KEYS.VALIDATION_CACHE);
      if (cachedResult) {
        //console.log('[IAP] Using cached validation result');
        return JSON.parse(cachedResult);
      }
    }
    
    // Update validation timestamp
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_VALIDATION_TIME, now.toString());
    
    // Send to server for validation
    //console.log('[IAP] Sending receipt to server for validation');
    const response = await apiRequest('/business/subscription/validate-apple-receipt', {
      method: 'POST',
      body: JSON.stringify({ receipt }),
    });
    
    // Check for account mismatch (subscription belongs to a different user)
    if (response.error === 'subscription_linked_to_different_account' || 
        (response.error && response.error.includes('different account')) ||
        (response.message && response.message.includes('already associated with another business account'))) {
      
      //console.log('[IAP] Subscription is linked to a different account');
      
      // Extract account identifier from response if available
      const linkedAccount = response.linkedAccount || 'another account';
      const errorMessage = response.message || 'This subscription is linked to a different account.';
      
      // Only emit the event if an alert hasn't been shown yet
      if (!accountMismatchAlertShown) {
        //console.log('[IAP] Showing account mismatch alert');
        accountMismatchAlertShown = true;
        
        // Emit event for UI components to display a notification
        DeviceEventEmitter.emit('SUBSCRIPTION_ACCOUNT_MISMATCH', { 
          linkedAccount,
          message: errorMessage
        });
      } else {
        //console.log('[IAP] Skipping duplicate account mismatch alert');
      }
      
      // Make sure we return a consistent error object
      return {
        success: false,
        accountMismatch: true,
        linkedAccount,
        message: errorMessage
      };
    }
    
    // Cache successful validation result
    if (response.success) {
      await AsyncStorage.setItem(STORAGE_KEYS.VALIDATION_CACHE, JSON.stringify(response));
    }
    
    return response;
  } catch (error) {
    //console.error('[IAP] Receipt validation failed:', error.message);
    throw error;
  }
};

/**
 * Check if the current device has a subscription that is linked to a different account
 * This is useful when a user logs in with a different account than the one associated with their Apple subscription
 * @returns {Promise<Object>} Object with accountMismatch flag and details if there's a mismatch
 */
const checkReceiptAccountMismatch = async () => {
  try {
    if (Platform.OS !== 'ios') {
      return { accountMismatch: false };
    }
    
    // Ensure IAP is initialized
    if (!isInitialized && !(await initializeIAP())) {
      //console.log('[IAP] Could not initialize IAP for account mismatch check');
      return { accountMismatch: false };
    }
    
    // Get available purchases
    const purchases = await getAvailablePurchases().catch(() => []);
    if (!purchases || purchases.length === 0) {
      return { accountMismatch: false };
    }
    
    // Sort by most recent first
    purchases.sort((a, b) => b.transactionDate - a.transactionDate);
    
    // Check if the most recent purchase receipt is linked to a different account
    for (const purchase of purchases) {
      if (purchase.transactionReceipt) {
        const result = await validateReceiptWithServer(purchase.transactionReceipt);
        if (result.accountMismatch) {
          return { 
            accountMismatch: true,
            message: result.message,
            linkedAccount: result.linkedAccount 
          };
        } else if (result.success) {
          // If we found a valid receipt that's not mismatched, no need to check further
          return { accountMismatch: false };
        }
      }
    }
    
    return { accountMismatch: false };
  } catch (error) {
    //console.error('[IAP] Error checking account mismatch:', error.message);
    return { accountMismatch: false };
  }
};


export const disableAutoReceipts = () => {
  // Set flag to indicate auto receipts have been disabled
  autoReceiptsDisabled = true;
  
  // Note: react-native-iap handles this internally when we use our server for validation
  //console.log('[IAP] Automatic receipt validation disabled');
  return true;
};

/**
 * Manually validate the current receipt with the server
 * This is useful for checking subscription status after cancellation
 * @returns {Promise<Object>} The validation result
 */
export const validateCurrentReceipt = async () => {
  if (Platform.OS !== 'ios' || !isInitialized) {
    return { success: false, message: 'IAP not initialized or not on iOS' };
  }
  
  try {
    //console.log('[IAP] Manually validating receipt with server');
    
    // Get available purchases which will include the receipt
    const availablePurchases = await getAvailablePurchases();
    let receipt = null;
    
    if (availablePurchases && availablePurchases.length > 0) {
      // Use the most recent purchase's receipt
      receipt = availablePurchases[0].transactionReceipt || availablePurchases[0].receipt;
    }
    
    if (!receipt) {
      //console.error('[IAP] No receipt available for validation');
      return { success: false, message: 'No receipt available' };
    }
    
    // Use the internal validateReceiptWithServer function
    return await validateReceiptWithServer(receipt);
  } catch (error) {
    //console.error('[IAP] Manual receipt validation failed:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Reset account mismatch alert flag to allow showing an alert again
 */
const resetAccountMismatchAlert = () => {
  accountMismatchAlertShown = false;
};

export default {
  initializeIAP,
  getAvailableSubscriptions,
  purchaseSubscription,
  restorePurchases,
  setupPurchaseListeners,
  clearPendingTransactions,
  disableAutoReceipts,
  validateCurrentReceipt,
  checkReceiptAccountMismatch,
  resetAccountMismatchAlert
};
