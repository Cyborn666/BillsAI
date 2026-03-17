/**
 * Business Bill Routes
 */
const express = require('express');
const router = express.Router();
const businessBillController = require('../controllers/businessBillController');
const { protect } = require('../middleware/authMiddleware');
const { body } = require('express-validator');
const { checkFreeResourceLimit } = require('../middleware/freeResourceLimitMiddleware');

// Validation rules for business bill creation
const businessBillValidation = [
  body('title').not().isEmpty().withMessage('Bill title is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('dueDate').isISO8601().withMessage('Invalid date format'),
  body('category').optional().isIn([
    'RENT', 'UTILITIES', 'SUBSCRIPTION', 'CREDIT_CARD', 'LOAN', 'INSURANCE', 
    'TAXES', 'SALARY', 'MARKETING', 'OFFICE_SUPPLIES', 'PROFESSIONAL_SERVICES', 
    'EQUIPMENT', 'OTHER'
  ]).withMessage('Invalid category'),
];

// Get all business bills (with optional filtering)
router.get('/', protect, businessBillController.getBusinessBills);

// Get business bill statistics
router.get('/stats', protect, businessBillController.getBusinessBillStats);

// Get a specific business bill by ID
router.get('/:id', protect, businessBillController.getBusinessBillById);

// Create a new business bill
router.post('/', protect, checkFreeResourceLimit('bills'), businessBillValidation, businessBillController.createBusinessBill);

// Update a business bill
router.put('/:id', protect, businessBillController.updateBusinessBill);

// Delete a business bill
router.delete('/:id', protect, businessBillController.deleteBusinessBill);

// Add a payment to a business bill
router.post('/:id/payments', protect, [
  body('amount').isNumeric().withMessage('Payment amount must be a number'),
], businessBillController.addPayment);

module.exports = router;
