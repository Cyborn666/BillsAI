/**
 * Authentication Routes
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updatePasswordValidation,
} = require('../middleware/validationMiddleware');

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail); // Support legacy path parameter
router.get('/verify-email', authController.verifyEmail); // Support new query parameter
router.post('/resend-verification', forgotPasswordValidation, authController.resendVerificationEmail);

// Protected routes
router.get('/me', protect, authController.getCurrentUser);
router.put('/update-password', protect, updatePasswordValidation, authController.updatePassword);

// Session management routes
router.post('/logout', protect, authController.logout);
router.post('/logout-all', protect, authController.logoutAll);
router.get('/sessions', protect, authController.getSessions);

module.exports = router;
