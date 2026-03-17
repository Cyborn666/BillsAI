/**
 * User Routes
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

// Validation middleware
const updateProfileValidation = [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Must provide a valid email'),
  body('phone').optional(),
];

// Protected routes
router.get('/profile', protect, userController.getUserProfile);
router.put('/profile', protect, updateProfileValidation, userController.updateUserProfile);

// Notification routes
router.get('/notifications', protect, userController.getNotificationSettings);
router.put('/notifications', protect, userController.updateNotificationSettings);

// Preferences routes
router.get('/preferences', protect, userController.getUserPreferences);
router.put('/preferences', protect, userController.updateUserPreferences);

// Account management
router.post('/delete-account', protect, userController.deleteAccount);
router.delete('/account', protect, userController.deleteAccount);

// User search - for bill splitting functionality
router.get('/search', protect, userController.searchUsers);

module.exports = router;
