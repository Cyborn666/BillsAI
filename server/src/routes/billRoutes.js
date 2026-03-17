/**
 * Bill Routes
 */
const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { protect, auth } = require('../middleware/authMiddleware');
const { body } = require('express-validator');


// Validation middleware
const billValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('dueDate').isISO8601().withMessage('Due date must be a valid date'),
  body('category')
    .optional()
    .isIn([
      'RENT',
      'UTILITIES',
      'SUBSCRIPTION',
      'CREDIT_CARD',
      'LOAN',
      'INSURANCE',
      'GROCERY',
      'TRANSPORTATION',
      'ENTERTAINMENT',
      'HEALTHCARE',
      'EDUCATION',
      'OTHER',
    ])
    .withMessage('Invalid category'),
  body('status')
    .optional()
    .isIn(['PAID', 'UNPAID', 'OVERDUE', 'UPCOMING', 'PARTIALLY_PAID'])
    .withMessage('Invalid status'),
  body('isRecurring').optional().isBoolean().withMessage('Must be true or false'),
  body('recurringPeriod')
    .optional()
    .isIn([
      'DAILY',
      'WEEKLY',
      'BIWEEKLY',
      'MONTHLY',
      'QUARTERLY',
      'SEMIANNUAL',
      'ANNUAL',
    ])
    .withMessage('Invalid recurring period'),
];

const paymentValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('date').optional().isISO8601().withMessage('Date must be a valid date'),
  body('method')
    .optional()
    .isIn([
      'CASH',
      'CREDIT_CARD',
      'DEBIT_CARD',
      'BANK_TRANSFER',
      'CHECK',
      'DIGITAL_WALLET',
      'OTHER',
    ])
    .withMessage('Invalid payment method'),
];

// Bills routes
// Define specific routes before parameterized routes to prevent conflicts
router.get('/', protect, billController.getBills);
router.get('/statistics', protect, billController.getBillStatistics);
router.get('/activities', protect, billController.getRecentActivities);
router.get('/transactions', protect, billController.getRecentTransactions);

// Routes with ID parameters must come after specific routes
router.get('/:id', protect, billController.getBillById);
router.post('/', protect, billValidation, billController.createBill);
router.put('/:id', protect, billValidation, billController.updateBill);
router.delete('/:id', protect, billController.deleteBill);

// route for marking bills as paid by users
router.post('/:id/mark-paid', protect, billController.markBillAsPaid);

// Payments routes
router.post('/:id/payments', protect, paymentValidation, billController.addPayment);

module.exports = router;
