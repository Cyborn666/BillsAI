/**
 * Business Miscellaneous Transaction Controller
 * Handles all business miscellaneous transaction related operations
 */
const BusinessMiscTransaction = require('../models/businessMiscTransactionModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

/**
 * Create a new miscellaneous transaction
 */
exports.createMiscTransaction = catchAsync(async (req, res, next) => {
  // Add business user ID from authenticated user if available
  req.body.businessUser = req.businessUser?.id || req.user?.id || null;
  
  const newTransaction = await BusinessMiscTransaction.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: newTransaction
  });
});

/**
 * Get all miscellaneous transactions for the authenticated business user
 */
exports.getAllMiscTransactions = catchAsync(async (req, res, next) => {
  // Build query
  const query = {
    businessUser: req.businessUser?.id || req.user?.id || null
  };
  
  // Type filter (income or expense)
  if (req.query.type) {
    query.type = req.query.type;
  }
  
  // Category filter
  if (req.query.category) {
    query.category = req.query.category;
  }
  
  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    query.date = {};
    if (req.query.startDate) {
      query.date.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      query.date.$lte = new Date(req.query.endDate);
    }
  }
  
  // Amount range filter
  if (req.query.minAmount || req.query.maxAmount) {
    query.amount = {};
    if (req.query.minAmount) {
      query.amount.$gte = Number(req.query.minAmount);
    }
    if (req.query.maxAmount) {
      query.amount.$lte = Number(req.query.maxAmount);
    }
  }
  
  // Build pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  
  // Execute query
  const transactions = await BusinessMiscTransaction.find(query)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);
  
  // Get total count for pagination
  const totalTransactions = await BusinessMiscTransaction.countDocuments(query);
  
  res.status(200).json({
    status: 'success',
    results: transactions.length,
    totalPages: Math.ceil(totalTransactions / limit),
    currentPage: page,
    total: totalTransactions,
    data: transactions
  });
});

/**
 * Get a specific miscellaneous transaction by ID
 */
exports.getMiscTransactionById = catchAsync(async (req, res, next) => {
  const transaction = await BusinessMiscTransaction.findById(req.params.id);
  
  if (!transaction) {
    return next(new AppError('No transaction found with that ID', 404));
  }
  
  // Check if transaction belongs to the authenticated user
  if (transaction.businessUser.toString() !== (req.businessUser?.id || req.user?.id)) {
    return next(new AppError('You do not have permission to access this transaction', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: transaction
  });
});

/**
 * Update a miscellaneous transaction
 */
exports.updateMiscTransaction = catchAsync(async (req, res, next) => {
  const transaction = await BusinessMiscTransaction.findById(req.params.id);
  
  if (!transaction) {
    return next(new AppError('No transaction found with that ID', 404));
  }
  
  // Check if transaction belongs to the authenticated user
  if (transaction.businessUser.toString() !== (req.businessUser?.id || req.user?.id)) {
    return next(new AppError('You do not have permission to update this transaction', 403));
  }
  
  // Update transaction
  const updatedTransaction = await BusinessMiscTransaction.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: updatedTransaction
  });
});

/**
 * Delete a miscellaneous transaction
 */
exports.deleteMiscTransaction = catchAsync(async (req, res, next) => {
  const transaction = await BusinessMiscTransaction.findById(req.params.id);
  
  if (!transaction) {
    return next(new AppError('No transaction found with that ID', 404));
  }
  
  // Check if transaction belongs to the authenticated user
  if (transaction.businessUser.toString() !== (req.businessUser?.id || req.user?.id)) {
    return next(new AppError('You do not have permission to delete this transaction', 403));
  }
  
  await BusinessMiscTransaction.findByIdAndDelete(req.params.id);
  
  res.status(200).json({
    status: 'success',
    data: null
  });
});

/**
 * Get miscellaneous transaction statistics
 */
exports.getMiscTransactionStats = catchAsync(async (req, res, next) => {
  const userId = req.businessUser?.id || req.user?.id || null;
  
  // Date range for filtering
  const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(1)); // First day of current month
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  
  // Get statistics for income and expenses
  const stats = await BusinessMiscTransaction.aggregate([
    {
      $match: {
        businessUser: userId ? new mongoose.Types.ObjectId(userId) : null,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  // Format response
  const formattedStats = {
    income: { count: 0, total: 0 },
    expense: { count: 0, total: 0 }
  };
  
  // Map aggregation results to formatted stats
  stats.forEach(stat => {
    if (stat._id === 'income' || stat._id === 'expense') {
      formattedStats[stat._id] = {
        count: stat.count,
        total: stat.total
      };
    }
  });
  
  // Calculate net (income - expenses)
  const net = formattedStats.income.total - formattedStats.expense.total;
  
  res.status(200).json({
    status: 'success',
    data: {
      ...formattedStats,
      net
    }
  });
});
