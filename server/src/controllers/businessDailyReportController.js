/**
 * Business Daily Report Controller
 * Handles all business daily report related operations
 */
const BusinessDailyReport = require('../models/businessDailyReportModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

/**
 * Create a new daily report
 */
exports.createDailyReport = catchAsync(async (req, res, next) => {
  // Add business user ID from authenticated user if available
  // For business context, use req.businessUser if available, otherwise use a default or null
  req.body.businessUser = req.businessUser?.id || req.user?.id || null;
  
  // Check if a report already exists for this date
  const existingReport = await BusinessDailyReport.findOne({
    businessUser: req.businessUser?.id || req.user?.id || null,
    date: new Date(req.body.date || Date.now()).setHours(0, 0, 0, 0)
  });
  
  if (existingReport) {
    return next(new AppError('A report already exists for this date. Please update the existing report instead.', 400));
  }
  
  const newDailyReport = await BusinessDailyReport.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: newDailyReport
  });
});

/**
 * Get all daily reports for the authenticated business user
 */
exports.getAllDailyReports = catchAsync(async (req, res, next) => {
  // Build query
  const query = {
    businessUser: req.user.id
  };
  
  // Date range filter
  if (req.query.startDate && req.query.endDate) {
    query.date = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }
  
  // Status filter
  if (req.query.status) {
    query.status = req.query.status.toUpperCase();
  }
  
  // Tag filter
  if (req.query.tag) {
    query.tags = req.query.tag;
  }
  
  // Execute query with pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  
  const reports = await BusinessDailyReport.find(query)
    .sort({ date: -1 }) // Sort by date descending (newest first)
    .skip(skip)
    .limit(limit);
  
  const totalReports = await BusinessDailyReport.countDocuments(query);
  
  res.status(200).json({
    status: 'success',
    results: reports.length,
    totalPages: Math.ceil(totalReports / limit),
    currentPage: page,
    total: totalReports,
    data: reports
  });
});

/**
 * Get a single daily report by ID
 */
exports.getDailyReport = catchAsync(async (req, res, next) => {
  const report = await BusinessDailyReport.findById(req.params.id);
  
  if (!report) {
    return next(new AppError('No report found with that ID', 404));
  }
  
  // Check if the report belongs to the authenticated user
  if (report.businessUser.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to access this report', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: report
  });
});

/**
 * Update a daily report
 */
exports.updateDailyReport = catchAsync(async (req, res, next) => {
  // If date is changing, check if a report already exists for the new date
  if (req.body.date) {
    const newDate = new Date(req.body.date).setHours(0, 0, 0, 0);
    const existingReport = await BusinessDailyReport.findOne({
      businessUser: req.user.id,
      date: newDate,
      _id: { $ne: req.params.id } // Exclude current report
    });
    
    if (existingReport) {
      return next(new AppError('A report already exists for this date. Please choose a different date.', 400));
    }
  }
  
  const updatedReport = await BusinessDailyReport.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true, // Return updated document
      runValidators: true // Run schema validators
    }
  );
  
  if (!updatedReport) {
    return next(new AppError('No report found with that ID', 404));
  }
  
  // Check if the report belongs to the authenticated user
  if (updatedReport.businessUser.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to update this report', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: updatedReport
  });
});

/**
 * Delete a daily report
 */
exports.deleteDailyReport = catchAsync(async (req, res, next) => {
  const report = await BusinessDailyReport.findById(req.params.id);
  
  if (!report) {
    return next(new AppError('No report found with that ID', 404));
  }
  
  // Check if the report belongs to the authenticated user
  if (report.businessUser.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to delete this report', 403));
  }
  
  await BusinessDailyReport.findByIdAndDelete(req.params.id);
  
  res.status(200).json({
    status: 'success',
    data: null
  });
});

/**
 * Get daily report analytics
 */
// Note: Dashboard statistics have been moved to businessDashboardAnalyticsController.js

exports.getDailyReportAnalytics = catchAsync(async (req, res, next) => {
  // Date range filter
  const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  
  const analytics = await BusinessDailyReport.aggregate([
    {
      $match: {
        businessUser: req.businessUser?.id || req.user?.id ? new mongoose.Types.ObjectId(req.businessUser?.id || req.user?.id) : null,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalNetSales: { $sum: '$netSales' },
        totalCashAmount: { $sum: '$cashAmount' },
        totalCardAmount: { $sum: '$cardAmount' },
        totalOtherPaymentAmount: { $sum: '$otherPaymentAmount' },
        totalMiscExpenses: { $sum: '$miscExpenses' },
        totalMiscIncome: { $sum: '$miscIncome' },
        totalTransactions: { $sum: '$transactions' },
        avgTicket: { $avg: '$averageTicket' },
        avgOverShortAmount: { $avg: '$overShortAmount' },
        totalOverShortAmount: { $sum: '$overShortAmount' },
        reportCount: { $sum: 1 },
        totalSalesTax: { $sum: '$salesTax' },
        totalDrops: { $sum: '$drops' },
        totalSubtotal: { $sum: '$subtotal' },

      }
    }
  ]);
  
  // Get sales by category
  const categorySales = await BusinessDailyReport.aggregate([
    {
      $match: {
        businessUser: req.businessUser?.id || req.user?.id ? new mongoose.Types.ObjectId(req.businessUser?.id || req.user?.id) : null,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    { $unwind: '$categories' },
    {
      $group: {
        _id: '$categories.name',
        total: { $sum: '$categories.amount' },
        count: { $sum: '$categories.count' }
      }
    },
    { $sort: { total: -1 } }
  ]);
  
  // Get payment method breakdown
  const paymentMethodBreakdown = await BusinessDailyReport.aggregate([
    {
      $match: {
        businessUser: req.businessUser?.id || req.user?.id ? new mongoose.Types.ObjectId(req.businessUser?.id || req.user?.id) : null,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    { $unwind: '$paymentMethods' },
    {
      $group: {
        _id: '$paymentMethods.name',
        total: { $sum: '$paymentMethods.amount' },
        count: { $sum: '$paymentMethods.transactionCount' }
      }
    },
    { $sort: { total: -1 } }
  ]);
  
  // Get daily trend data
  const dailyTrend = await BusinessDailyReport.aggregate([
    {
      $match: {
        businessUser: req.businessUser?.id || req.user?.id ? new mongoose.Types.ObjectId(req.businessUser?.id || req.user?.id) : null,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        netSales: { $sum: '$netSales' },
        cashAmount: { $sum: '$cashAmount' },
        cardAmount: { $sum: '$cardAmount' },
        otherPaymentAmount: { $sum: '$otherPaymentAmount' },
        miscExpenses: { $sum: '$miscExpenses' },
        miscIncome: { $sum: '$miscIncome' },
        overShortAmount: { $sum: '$overShortAmount' },
        salesTax: { $sum: '$salesTax' },
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  res.status(200).json({
    status: 'success',
    data: {
      summary: analytics[0] || {
        totalNetSales: 0,
        totalCashAmount: 0,
        totalCardAmount: 0,
        totalOtherPaymentAmount: 0,
        totalMiscExpenses: 0,
        totalMiscIncome: 0,
        totalTransactions: 0,
        avgTicket: 0,
        avgOverShortAmount: 0,
        totalOverShortAmount: 0,
        reportCount: 0,
        totalSalesTax: 0,
      },
      categorySales,
      paymentMethodBreakdown,
      dailyTrend
    }
  });
});
