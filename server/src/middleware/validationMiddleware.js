/**
 * Validation Middleware
 */
const { body } = require('express-validator');

/**
 * Register validation rules
 */
exports.registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('fullName')
    .not()
    .isEmpty()
    .withMessage('Full name is required'),
];

/**
 * Login validation rules
 */
exports.loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .not()
    .isEmpty()
    .withMessage('Password is required'),
];

/**
 * Forgot password validation rules
 */
exports.forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address'),
];

/**
 * Reset password validation rules
 */
exports.resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

/**
 * Update password validation rules
 */
exports.updatePasswordValidation = [
  body('currentPassword')
    .not()
    .isEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
];
