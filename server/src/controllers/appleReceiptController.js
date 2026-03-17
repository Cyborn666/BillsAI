/**
 * Apple Receipt Validation Controller
 * Handles server-side verification of Apple subscription receipts
 * with robust error handling and security measures
 */
const axios = require('axios');
const BusinessSubscription = require('../models/businessSubscription');
const logger = require('../config/logger');

// Apple receipt validation URLs
const APPLE_URLS = {
  PRODUCTION: 'https://buy.itunes.apple.com/verifyReceipt',
  SANDBOX: 'https://sandbox.itunes.apple.com/verifyReceipt',
};

// Status code mapping for better error handling
const APPLE_STATUS_CODES = {
  0: { status: 'SUCCESS', message: 'Success' },
  21000: { status: 'ERROR', message: 'App store could not read the JSON object you provided' },
  21002: { status: 'ERROR', message: 'The receipt data was malformed' },
  21003: { status: 'ERROR', message: 'The receipt could not be authenticated' },
  21004: { status: 'ERROR', message: 'The shared secret you provided does not match the shared secret on file for your account' },
  21005: { status: 'ERROR', message: 'The receipt server is not currently available' },
  21006: { status: 'ERROR', message: 'This receipt is valid but the subscription has expired' },
  21007: { status: 'ENV_MISMATCH', message: 'This receipt is from the test environment, but it was sent to the production environment' },
  21008: { status: 'ENV_MISMATCH', message: 'This receipt is from the production environment, but it was sent to the test environment' },
  21010: { status: 'ERROR', message: 'This receipt could not be authorized' },
};

// Product type mapping for subscription details
const PRODUCT_MAPPING = {
  'com.billsai.subscription.monthly': {
    type: 'monthly',
    durationMonths: 1,
    planId: 'premium',
  },
  'com.billsai.subscription.yearly': {
    type: 'yearly',
    durationMonths: 12,
    planId: 'premium',
  },
};

/**
 * Validate Apple receipt with App Store
 * @param {string} receiptData - Base64 encoded receipt data
 * @param {string} sharedSecret - App-specific shared secret from App Store Connect
 * @returns {Promise<Object>} Validation result
 */
async function validateWithApple(receiptData, sharedSecret) {
  // Determine if this is likely a sandbox receipt based on characteristics
  const isSandbox = process.env.NODE_ENV !== 'production' || 
    (receiptData && (receiptData.includes('sandbox') || receiptData.includes('test')));
  
  let primaryUrl = isSandbox ? APPLE_URLS.SANDBOX : APPLE_URLS.PRODUCTION;
  let fallbackUrl = isSandbox ? APPLE_URLS.PRODUCTION : APPLE_URLS.SANDBOX;
  
  // Create the request body
  const requestBody = {
    'receipt-data': receiptData,
    'password': sharedSecret,
    'exclude-old-transactions': false,
  };
  
  try {
    // Try primary URL first
    logger.info(`Validating Apple receipt with ${isSandbox ? 'SANDBOX' : 'PRODUCTION'} environment`);
    let response = await axios.post(primaryUrl, requestBody);
    
    // Check if we need to retry with alternate environment
    if (response.data.status === 21007 || response.data.status === 21008) {
      logger.info(`Environment mismatch (status ${response.data.status}), retrying with alternate URL`);
      response = await axios.post(fallbackUrl, requestBody);
    }
    
    // Handle shared secret format issue
    if (response.data.status === 21004 && sharedSecret.includes('-')) {
      // Sometimes the shared secret formats differ between what App Store Connect shows and what the API expects
      logger.info('Shared secret format issue detected, trying alternate format');
      const alternateSecret = sharedSecret.replace(/-/g, '');
      response = await axios.post(
        response.data.status === 21007 || response.data.status === 21008 ? fallbackUrl : primaryUrl,
        {
          ...requestBody,
          'password': alternateSecret,
        }
      );
    }
    
    return response.data;
  } catch (error) {
    logger.error('Apple receipt validation request failed:', error.message);
    throw new Error(`Apple validation failed: ${error.message}`);
  }
}

/**
 * Extract subscription details from Apple receipt
 * @param {Object} receiptData - Apple receipt validation response
 * @returns {Object} Subscription details
 */
function extractSubscriptionDetails(receiptData) {
  // Validate receiptData structure
  if (!receiptData || !receiptData.latest_receipt_info || !Array.isArray(receiptData.latest_receipt_info)) {
    throw new Error('Invalid receipt data structure');
  }
  
  // Filter and sort receipt items to find valid and most recent subscription
  const validReceiptItems = receiptData.latest_receipt_info.filter(item => {
    return item && 
           item.expires_date_ms && 
           !isNaN(parseInt(item.expires_date_ms, 10)) &&
           item.product_id;
  }).sort((a, b) => {
    return parseInt(b.expires_date_ms, 10) - parseInt(a.expires_date_ms, 10);
  });
  
  if (validReceiptItems.length === 0) {
    throw new Error('No valid subscription information in receipt');
  }
  
  // Extract key details from the most recent subscription
  const latestSubscription = validReceiptItems[0];
  const expiresDateMs = parseInt(latestSubscription.expires_date_ms, 10);
  const expiresDate = new Date(expiresDateMs);
  const currentDate = new Date();
  const isActive = expiresDate > currentDate;
  
  // Extract original transaction ID
  const originalTransactionId = latestSubscription.original_transaction_id ?
    parseInt(latestSubscription.original_transaction_id, 10) :
    parseInt(latestSubscription.transaction_id, 10);
  
  if (isNaN(originalTransactionId)) {
    throw new Error('Invalid transaction ID in receipt');
  }
  
  // Determine auto-renewal status
  let autoRenewStatus = false;
  
  if (receiptData.pending_renewal_info && Array.isArray(receiptData.pending_renewal_info)) {
    // Find the specific renewal info that matches this subscription's original_transaction_id
    const matchingRenewalInfo = receiptData.pending_renewal_info.find(info => {
      const infoOriginalTransactionId = parseInt(info.original_transaction_id, 10);
      return !isNaN(infoOriginalTransactionId) && 
             infoOriginalTransactionId === originalTransactionId;
    });
    
    if (matchingRenewalInfo) {
      autoRenewStatus = matchingRenewalInfo.auto_renew_status === '1';
    } else if (receiptData.pending_renewal_info.length > 0) {
      // Fallback: use the first pending renewal info if no matching one found
      autoRenewStatus = receiptData.pending_renewal_info[0].auto_renew_status === '1';
    }
  }
  
  // Map product to internal plan
  const productId = latestSubscription.product_id;
  const productInfo = PRODUCT_MAPPING[productId] || {
    type: 'unknown',
    durationMonths: 1,
    planId: 'premium',
  };
  
  // Return structured subscription details
  return {
    productId,
    planId: productInfo.planId,
    type: productInfo.type,
    originalTransactionId,
    transactionId: latestSubscription.transaction_id,
    purchaseDate: new Date(parseInt(latestSubscription.purchase_date_ms, 10)),
    expiresDate,
    isActive,
    autoRenewStatus,
    latestReceipt: receiptData.latest_receipt,
  };
}

/**
 * Validate Apple receipt and manage subscription
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.validateReceipt = async (req, res) => {
  try {
    // Validate request
    const { receipt } = req.body;
    
    if (!receipt) {
      return res.status(400).json({
        success: false,
        message: 'Receipt data is required',
      });
    }
    
    // Get shared secret from environment
    const sharedSecret = process.env.APPLE_SHARED_SECRET;
    
    if (!sharedSecret) {
      logger.error('Apple shared secret not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }
    
    // Sanitize receipt data
    const receiptData = receipt.replace(/\s/g, '');
    
    // Validate receipt with Apple
    const validationResponse = await validateWithApple(receiptData, sharedSecret);
    
    // Handle validation errors
    if (validationResponse.status !== 0) {
      const statusInfo = APPLE_STATUS_CODES[validationResponse.status] || 
        { status: 'ERROR', message: `Unknown status code: ${validationResponse.status}` };
      
      logger.warn('Apple receipt validation failed:', statusInfo.message);
      
      return res.status(400).json({
        success: false,
        message: statusInfo.message,
        code: validationResponse.status,
      });
    }
    
    // Extract subscription details
    const subscriptionDetails = extractSubscriptionDetails(validationResponse);
    
    // Verify authorization - user must be authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
    
    // Check if this receipt is already associated with another business
    const existingSubscription = await BusinessSubscription.findOne({
      'appleData.originalTransactionId': subscriptionDetails.originalTransactionId,
      businessId: { $ne: req.user.id },
    });
    
    if (existingSubscription) {
      return res.status(409).json({
        success: false,
        message: 'This purchase is already associated with another business account',
        error: 'receipt-already-in-use',
      });
    }
    
    // Create or update the subscription
    try {
      // Function to create a date in local time instead of UTC
      const createLocalDate = (timestamp) => {
        if (!timestamp) return null;
        const msTimestamp = parseInt(timestamp, 10);
        if (isNaN(msTimestamp)) return null;
        
        // Create a date object with the local timezone offset applied
        const date = new Date(msTimestamp);
        return date;
      };
      
      // Get period dates
      const currentPeriodStart = subscriptionDetails.purchaseDate;
      const currentPeriodEnd = subscriptionDetails.expiresDate;
      
      // Update or create subscription document
      const businessSubscription = await BusinessSubscription.findOneAndUpdate(
        { businessId: req.user.id },
        {
          businessId: req.user.id,
          status: subscriptionDetails.isActive ? 'active' : 'expired',
          // Set planId to free when subscription is expired, otherwise use the original planId
          planId: subscriptionDetails.isActive ? subscriptionDetails.planId : 'free',
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: !subscriptionDetails.autoRenewStatus,
          description: `Apple ${subscriptionDetails.type} subscription`,
          appleData: {
            latestReceipt: subscriptionDetails.latestReceipt,
            transactionId: subscriptionDetails.transactionId,
            originalTransactionId: subscriptionDetails.originalTransactionId,
            productId: subscriptionDetails.productId,
          },
        },
        { upsert: true, new: true },
      );
      
      //logger.info(`Subscription created/updated for business ID: ${req.user.id}`);
      
      // Return subscription details matching the format expected by the frontend
      return res.status(200).json({
        success: true,
        subscription: {
          id: businessSubscription._id,
          type: subscriptionDetails.type,
          status: subscriptionDetails.isActive ? 'active' : 'expired',
          expiresAt: subscriptionDetails.expiresDate,
          autoRenew: subscriptionDetails.autoRenewStatus,
        },
      });
    } catch (dbError) {
      logger.error('Failed to create/update subscription:', dbError.message);
      return res.status(500).json({
        success: false,
        message: 'Database error processing subscription',
        error: dbError.message,
      });
    }
  } catch (error) {
    logger.error('Error in receipt validation:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error processing receipt',
      error: error.message,
    });
  }
};

/**
 * Toggle auto-renewal status for subscription
 * For iOS subscriptions, this is informational only as users
 * must manage auto-renewal through the App Store
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.toggleAutoRenewal = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
    
    const { enableAutoRenewal } = req.body;
    
    if (typeof enableAutoRenewal !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enableAutoRenewal parameter must be a boolean',
      });
    }
    
    // For Apple subscriptions, we can only track the status, not change it
    // User must manage in App Store, so this is just updating our record
    const subscription = await BusinessSubscription.findOne({ businessId: req.user.id });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
    }
    
    // Update our record of auto-renewal status
    subscription.cancelAtPeriodEnd = !enableAutoRenewal;
    await subscription.save();
    
    // Return appropriate response
    return res.status(200).json({
      success: true,
      message: enableAutoRenewal ? 
        'Auto-renewal preferences updated. Please note that for Apple subscriptions, you must also confirm this change in the App Store.' :
        'Auto-renewal preferences updated. Please note that for Apple subscriptions, you must also confirm cancellation in the App Store.',
      subscription: {
        id: subscription._id,
        autoRenew: enableAutoRenewal,
        requiresStoreAction: subscription.appleData && subscription.appleData.originalTransactionId,
      },
    });
  } catch (error) {
    logger.error('Error toggling auto-renewal:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating subscription preferences',
      error: error.message,
    });
  }
};

/**
 * Handle Apple server notifications
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.handleServerNotification = async (req, res) => {
  try {
    // Always respond to Apple quickly with 200 status
    // As per Apple docs: https://developer.apple.com/documentation/appstoreservernotifications/responding_to_app_store_server_notifications
    // Send the response before processing to avoid timeouts
    res.status(200).send({ status: 'ok' });
    
    const payload = req.body;
    
    // Log the notification type
    logger.info(`Received Apple server notification of type: ${payload.notification_type}`);
    
    // Verify the notification signature if provided
    // Note: Apple doesn't currently sign notifications but this is for future compatibility
    if (payload.signature) {
      // Future implementation of signature verification
      // Similar to how Stripe verification works
    }
    
    // Extract the receipt data - this should be similar to your existing receipt structure
    if (!payload.unified_receipt) {
      logger.error('Missing unified_receipt in Apple notification payload');
      return; // Already sent 200 response
    }
    
    // Process different notification types
    switch (payload.notification_type) {
      case 'INITIAL_BUY':
      case 'RENEWAL':
      case 'DID_RENEW':
        await exports.handleSubscriptionActive(payload);
        break;
        
      case 'CANCEL':
      case 'DID_FAIL_TO_RENEW':
      case 'EXPIRED':
        await exports.handleSubscriptionEnded(payload);
        break;
        
      case 'REFUND':
        await exports.handleRefund(payload);
        break;
        
      case 'PRICE_INCREASE_CONSENT':
      case 'REVOKE':
      case 'CONSUMPTION_REQUEST':
      default:
        logger.info(`Unhandled notification type: ${payload.notification_type}`);
        break;
    }
  } catch (error) {
    // Log the error but don't send back to Apple as we already sent a 200
    logger.error('Error processing Apple server notification:', error.message);
  }
};

/**
 * Handle active subscription notifications (new purchases and renewals)
 * @param {Object} payload - Apple notification payload
 */
exports.handleSubscriptionActive = async function handleSubscriptionActive(payload) {
  try {
    // Extract necessary information from the payload
    const latestReceipt = payload.unified_receipt.latest_receipt;
    const latestReceiptInfo = payload.unified_receipt.latest_receipt_info;
    
    if (!latestReceiptInfo || !Array.isArray(latestReceiptInfo) || latestReceiptInfo.length === 0) {
      logger.error('Invalid receipt info in notification payload');
      return;
    }
    
    // Get most recent transaction
    const latestTransaction = latestReceiptInfo.sort((a, b) => {
      return parseInt(b.expires_date_ms || 0, 10) - parseInt(a.expires_date_ms || 0, 10);
    })[0];
    
    // Extract key information
    const originalTransactionId = latestTransaction.original_transaction_id;
    const productId = latestTransaction.product_id;
    const expiresDate = new Date(parseInt(latestTransaction.expires_date_ms, 10));
    const purchaseDate = new Date(parseInt(latestTransaction.purchase_date_ms, 10));
    
    // Get auto-renewal status
    let autoRenewStatus = false;
    if (payload.auto_renew_status) {
      autoRenewStatus = payload.auto_renew_status === '1' || payload.auto_renew_status === 1;
    }
    
    // Find the business subscription by the original transaction ID
    const subscription = await BusinessSubscription.findOne({
      'appleData.originalTransactionId': originalTransactionId,
    });
    
    if (subscription) {
      // Update existing subscription
      subscription.planId = 'premium'; // Set to your premium plan ID
      subscription.status = 'active';
      subscription.currentPeriodStart = purchaseDate;
      subscription.currentPeriodEnd = expiresDate;
      subscription.cancelAtPeriodEnd = !autoRenewStatus;
      
      // Update Apple-specific data - only use fields that exist in the schema
      subscription.appleData = {
        ...subscription.appleData,
        originalTransactionId,
        transactionId: latestTransaction.transaction_id,
        latestReceipt,
        expiresDate,
        purchaseDate,
      };
      
      // Set product ID in the main subscription record
      subscription.productId = productId;
      
      await subscription.save();
      logger.info(`Updated subscription for original transaction ID: ${originalTransactionId}`);
    } else {
      // This is a new device or unlinked receipt
      // We can't create a new subscription without knowing the businessId
      // Log this scenario for investigation
      logger.warn(`Received notification for unknown subscription: ${originalTransactionId}`);
    }
  } catch (error) {
    logger.error('Error handling active subscription notification:', error.message);
  }
}

/**
 * Handle subscription ended notifications (cancellations, failures, expirations)
 * @param {Object} payload - Apple notification payload
 */
exports.handleSubscriptionEnded = async function handleSubscriptionEnded(payload) {
  try {
    const latestReceiptInfo = payload.unified_receipt.latest_receipt_info;
    
    if (!latestReceiptInfo || !Array.isArray(latestReceiptInfo) || latestReceiptInfo.length === 0) {
      logger.error('Invalid receipt info in notification payload');
      return;
    }
    
    // Get the latest transaction
    const latestTransaction = latestReceiptInfo[0];
    const originalTransactionId = latestTransaction.original_transaction_id;
    
    // Find the subscription
    const subscription = await BusinessSubscription.findOne({
      'appleData.originalTransactionId': originalTransactionId
    });
    
    if (subscription) {
      // Update subscription status based on notification type
      const notificationType = payload.notification_type;
      
      if (notificationType === 'CANCEL') {
        subscription.status = 'canceled';
        subscription.canceledAt = new Date();
      } else if (notificationType === 'EXPIRED' || notificationType === 'DID_FAIL_TO_RENEW') {
        subscription.status = 'expired';
        subscription.cancelAtPeriodEnd = true;
      }
      
      // Always update auto-renewal status if provided
      if (payload.auto_renew_status !== undefined) {
        const autoRenewStatus = payload.auto_renew_status === '1' || payload.auto_renew_status === 1;
        subscription.cancelAtPeriodEnd = !autoRenewStatus;
      }
      
      await subscription.save();
      logger.info(`Updated subscription status to ${subscription.status} for ID: ${originalTransactionId}`);
    } else {
      logger.warn(`Received end notification for unknown subscription: ${originalTransactionId}`);
    }
  } catch (error) {
    logger.error('Error handling subscription ended notification:', error.message);
  }
};

/**
 * Handle refund notifications
 * @param {Object} payload - Apple notification payload
 */
exports.handleRefund = async function handleRefund(payload) {
  try {
    const latestReceiptInfo = payload.unified_receipt.latest_receipt_info;
    
    if (!latestReceiptInfo || !Array.isArray(latestReceiptInfo) || latestReceiptInfo.length === 0) {
      logger.error('Invalid receipt info in refund notification');
      return;
    }
    
    const latestTransaction = latestReceiptInfo[0];
    const originalTransactionId = latestTransaction.original_transaction_id;
    
    // Find the subscription
    const subscription = await BusinessSubscription.findOne({
      'appleData.originalTransactionId': originalTransactionId
    });
    
    if (subscription) {
      // Update subscription status for refund
      subscription.status = 'refunded';
      subscription.refundedAt = new Date();
      subscription.cancelAtPeriodEnd = true;
      
      await subscription.save();
      logger.info(`Updated subscription status to refunded for ID: ${originalTransactionId}`);
    } else {
      logger.warn(`Received refund notification for unknown subscription: ${originalTransactionId}`);
    }
  } catch (error) {
    logger.error('Error handling refund notification:', error.message);
  }
}


