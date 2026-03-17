/**
 * Business Subscription Routes
 * Handles all routes related to business subscriptions
 */
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const appleReceiptController = require('../controllers/appleReceiptController');

// Webhook handler - must be exempt from authentication
// This route should be above the protect middleware to ensure it's accessible without auth
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook);

// Apple server notification handler - must be exempt from authentication
router.post('/apple-webhook', express.raw({ type: 'application/json' }), appleReceiptController.handleServerNotification);

// All other routes require authentication
router.use(protect);

// Get current business subscription
router.get('/', subscriptionController.getCurrentBusinessSubscription);

// Create a new subscription
router.post('/', subscriptionController.createBusinessSubscription);

// Update a subscription
router.put('/:subscriptionId', subscriptionController.updateBusinessSubscription);

// Toggle auto-renewal setting
router.put('/:subscriptionId/auto-renewal', subscriptionController.toggleAutoRenewal);

// Cancel a subscription
router.delete('/:subscriptionId', subscriptionController.cancelBusinessSubscription);

// Check feature access
router.get('/access/:featureId', subscriptionController.checkBusinessFeatureAccess);

// Apple receipt validation route
router.post('/validate-apple-receipt', appleReceiptController.validateReceipt);

module.exports = router;
