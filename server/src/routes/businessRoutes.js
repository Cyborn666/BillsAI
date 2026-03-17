/**
 * Business User Routes
 */
const express = require('express');
const router = express.Router();
const businessUserController = require('../controllers/businessUserController');
const businessDashboardAnalytics = require('../controllers/businessDashboardAnalyticsController');
const { protect } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

// Protected routes
router.get('/profile', protect, businessUserController.getBusinessUserProfile);
router.put('/profile', protect, businessUserController.updateBusinessUserProfile);

// Notification routes
router.get('/notifications', protect, businessUserController.getBusinessUserNotifications);
router.put('/notifications', protect, businessUserController.updateBusinessUserNotifications);

// Preferences routes
router.get('/preferences', protect, businessUserController.getBusinessUserPreferences);
router.put('/preferences', protect, businessUserController.updateBusinessUserPreferences);

// Account management
router.post('/delete-account', protect, businessUserController.deleteBusinessUser);

// Dashboard analytics routes
router.get('/dashboard/analytics', protect, businessDashboardAnalytics.getDashboardAnalytics);
router.get('/analytics', protect, businessDashboardAnalytics.getAnalyticsTabData);
router.get('/recent-activity', protect, businessDashboardAnalytics.getRecentActivity);

module.exports = router;
