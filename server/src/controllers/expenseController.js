/**
 * Expense Controller
 * Handles all expense-related operations
 */
const Expense = require('../models/expenseModel');
const { validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');

/**
 * Get all expenses for a user
 * @route GET /api/business/expenses
 * @access Private
 */
const getExpenses = asyncHandler(async (req, res) => {
  const { category, startDate, endDate, minAmount, maxAmount, isBusinessExpense, taxDeductible } = req.query;
  
  // Build filter object
  const filter = { user: req.user.id };
  
  // Add optional filters if provided
  if (category) filter.category = category;
  if (isBusinessExpense !== undefined) filter.isBusinessExpense = isBusinessExpense === 'true';
  if (taxDeductible !== undefined) filter.taxDeductible = taxDeductible === 'true';
  
  // Date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  
  // Amount range filter
  if (minAmount || maxAmount) {
    filter.amount = {};
    if (minAmount) filter.amount.$gte = parseFloat(minAmount);
    if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
  }
  
  const expenses = await Expense.find(filter).sort({ date: -1 });
  
  res.status(200).json(expenses);
});

/**
 * Get a single expense by ID
 * @route GET /api/business/expenses/:id
 * @access Private
 */
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    user: req.user.id,
  });
  
  if (!expense) {
    res.status(404);
    throw new Error('Expense not found');
  }
  
  res.status(200).json(expense);
});

/**
 * Create a new expense
 * @route POST /api/business/expenses
 * @access Private
 */
const createExpense = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const {
    title,
    amount,
    subtotal,
    date,
    category,
    notes,
    taxes,
    taxRates,
    discount,
    receiptImage,
    isBusinessExpense,
    taxDeductible,
    vendor,
    paymentMethod,
    recurring,
    recurringPeriod,
    tags,
  } = req.body;
  


  // Create new expense
  const expense = await Expense.create({
    title,
    amount,
    subtotal,
    date: date || new Date(),
    category: category || 'OTHER',
    notes,
    receiptImage,
    isBusinessExpense: isBusinessExpense !== undefined ? isBusinessExpense : true,
    taxDeductible: taxDeductible || false,
    vendor,
    paymentMethod: paymentMethod || 'OTHER',
    recurring: recurring || false,
    recurringPeriod: recurringPeriod || 'MONTHLY',
    tags: tags || [],
    user: req.user?.id || null,  // Regular user ID from auth if available
    businessUser: req.body.businessUser || null, // Business user ID from request body
    taxes: taxes || {
      salesTax: 0,
      stateTax: 0,
      localTax: 0,
      exciseTax: 0,
      importDuty: 0,
      otherTaxes: 0
    },
    taxRates: taxRates || {
      salesTaxRate: 0,
      stateTaxRate: 0,
      localTaxRate: 0
    },
    discount: discount || 0
  });
  
  //console.log('Expense created:', expense);
  
  if (expense) {
    res.status(201).json(expense);
  } else {
    res.status(400);
    throw new Error('Invalid expense data');
  }
});

/**
 * Update an expense
 * @route PUT /api/business/expenses/:id
 * @access Private
 */
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    user: req.user.id,
  });
  
  if (!expense) {
    res.status(404);
    throw new Error('Expense not found');
  }
  
  // Update expense fields
  const {
    title,
    amount,
    date,
    category,
    notes,
    receiptImage,
    isBusinessExpense,
    taxDeductible,
    vendor,
    paymentMethod,
    recurring,
    recurringPeriod,
    tags,
  } = req.body;
  
  if (title) expense.title = title;
  if (amount) expense.amount = amount;
  if (date) expense.date = date;
  if (category) expense.category = category;
  if (notes !== undefined) expense.notes = notes;
  if (receiptImage !== undefined) expense.receiptImage = receiptImage;
  if (isBusinessExpense !== undefined) expense.isBusinessExpense = isBusinessExpense;
  if (taxDeductible !== undefined) expense.taxDeductible = taxDeductible;
  if (vendor !== undefined) expense.vendor = vendor;
  if (paymentMethod) expense.paymentMethod = paymentMethod;
  if (recurring !== undefined) expense.recurring = recurring;
  if (recurringPeriod) expense.recurringPeriod = recurringPeriod;
  if (tags) expense.tags = tags;
  
  const updatedExpense = await expense.save();
  
  res.status(200).json(updatedExpense);
});

/**
 * Delete an expense
 * @route DELETE /api/business/expenses/:id
 * @access Private
 */
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    user: req.user.id,
  });
  
  if (!expense) {
    res.status(404);
    throw new Error('Expense not found');
  }
  
  // Use deleteOne() on the document instance
  await expense.deleteOne();
  
  res.status(200).json({ id: req.params.id, message: 'Expense removed' });
});

/**
 * Get expense statistics
 * @route GET /api/business/expenses/stats
 * @access Private
 */
const getExpenseStats = asyncHandler(async (req, res) => {
  // Total expenses
  const totalExpenses = await Expense.countDocuments({ user: req.user.id });
  
  // Total amount spent
  const totalAmountResult = await Expense.aggregate([
    { $match: { user: req.user.id } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;
  
  // Expenses by category
  const expensesByCategory = await Expense.aggregate([
    { $match: { user: req.user.id } },
    { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    { $sort: { total: -1 } }
  ]);
  
  // Recent expenses trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const monthlyTrend = await Expense.aggregate([
    { 
      $match: { 
        user: req.user.id,
        date: { $gte: sixMonthsAgo }
      } 
    },
    {
      $group: {
        _id: { 
          month: { $month: '$date' }, 
          year: { $year: '$date' } 
        },
        count: { $sum: 1 },
        total: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  
  res.status(200).json({
    totalExpenses,
    totalAmount,
    expensesByCategory,
    monthlyTrend
  });
});

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseStats
};
