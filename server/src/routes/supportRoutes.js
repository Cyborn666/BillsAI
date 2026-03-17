/**
 * Support Routes
 */
const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { protect, admin } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

// Validation middleware
const createMessageValidation = [
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message content is required'),
];

// User routes
router.post('/messages', protect, createMessageValidation, supportController.createSupportMessage);
router.get('/messages', protect, supportController.getUserSupportMessages);
router.get('/messages/:id', protect, supportController.getSupportMessage);

// Admin routes
router.get('/admin/messages', protect, admin, supportController.getAllSupportMessages);
router.put('/admin/messages/:id', protect, admin, supportController.updateSupportMessageStatus);

module.exports = router;
