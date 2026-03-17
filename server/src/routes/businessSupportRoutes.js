/**
 * Business Support Routes
 * Routes for business support functionality
 */
const express = require('express');
const router = express.Router();
const businessSupportController = require('../controllers/businessSupportController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Only business users can access these routes
router.use((req, res, next) => {
  // Check if user has business account type
  if (req.user && req.user.accountType === 'business') {
    next();
  } else {
    return res.status(403).json({
      message: 'Business account required for this operation',
    });
  }
});

// Create a new support message
router.post('/messages', businessSupportController.createSupportMessage);

// Get all support messages for the business
router.get('/messages', businessSupportController.getSupportMessages);

// Get a specific support message
router.get('/messages/:id', businessSupportController.getSupportMessage);

// Add a response to a message
router.post('/messages/:id/responses', businessSupportController.addMessageResponse);

// Mark messages as read
router.put('/messages/read', businessSupportController.markMessagesAsRead);

module.exports = router;
