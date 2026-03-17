/**
 * Split Expense Routes - For expense splitting functionality
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSplitExpense,
  getSplitExpenses,
  getSplitExpense,
  updateSplitExpense,
  deleteSplitExpense,
  addComment
} = require('../controllers/splitExpenseController');

// All routes are protected
router.use(protect);

// Expense management routes
router.route('/')
  .post(createSplitExpense)
  .get(getSplitExpenses);

// Specific expense routes
router.route('/:id')
  .get(getSplitExpense)
  .put(updateSplitExpense)
  .delete(deleteSplitExpense);

// Comment routes
router.route('/:id/comments')
  .post(addComment);

module.exports = router;
