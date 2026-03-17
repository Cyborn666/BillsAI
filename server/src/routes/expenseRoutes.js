/**
 * Business Expense Routes
 */
const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');
const { checkFreeResourceLimit } = require('../middleware/freeResourceLimitMiddleware');
const { body } = require('express-validator');

// Validation rules for expense creation
const expenseValidation = [
  body('title').not().isEmpty().withMessage('Expense title is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('category').optional().isIn([
    'RENT', 'UTILITIES', 'FOOD', 'TRANSPORT', 'ENTERTAINMENT', 'HEALTHCARE', 
    'EDUCATION', 'SHOPPING', 'TRAVEL', 'SALARY', 'MARKETING', 'TAXES', 
    'OFFICE_SUPPLIES', 'PROFESSIONAL_SERVICES', 'EQUIPMENT', 'INSURANCE', 'OTHER'
  ]).withMessage('Invalid category'),
];

// Get all expenses (with optional filtering)
router.get('/', protect, expenseController.getExpenses);

// Get expense statistics
router.get('/stats', protect, expenseController.getExpenseStats);

// Get a specific expense by ID
router.get('/:id', protect, expenseController.getExpenseById);

// Create a new expense
router.post('/', protect, checkFreeResourceLimit('expenses'), expenseValidation, expenseController.createExpense);

// Update an expense
router.put('/:id', protect, expenseController.updateExpense);

// Delete an expense
router.delete('/:id', protect, expenseController.deleteExpense);

module.exports = router;
