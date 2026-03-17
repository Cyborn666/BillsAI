/**
 * Business Bill Controller
 * Handles all business bill-related operations
 */
const BusinessBill = require('../models/businessBillModel');
const { validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');

/**
 * Get all business bills for a user
 * @route GET /api/business/bills
 * @access Private
 */
const getBusinessBills = asyncHandler(async (req, res) => {
  const { category, startDate, endDate, minAmount, maxAmount, status, vendor } = req.query;
  
  // Build filter object
  const filter = { user: req.user.id };
  
  // Add optional filters if provided
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (vendor) filter.vendor = vendor;
  
  // Date range filter
  if (startDate || endDate) {
    filter.dueDate = {};
    if (startDate) filter.dueDate.$gte = new Date(startDate);
    if (endDate) filter.dueDate.$lte = new Date(endDate);
  }
  
  // Amount range filter
  if (minAmount || maxAmount) {
    filter.amount = {};
    if (minAmount) filter.amount.$gte = parseFloat(minAmount);
    if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
  }
  
  const bills = await BusinessBill.find(filter).sort({ dueDate: 1 });
  
  res.status(200).json(bills);
});

/**
 * Get a single business bill by ID
 * @route GET /api/business/bills/:id
 * @access Private
 */
const getBusinessBillById = asyncHandler(async (req, res) => {
  const bill = await BusinessBill.findOne({
    _id: req.params.id,
    user: req.user.id,
  });
  
  if (!bill) {
    res.status(404);
    throw new Error('Business bill not found');
  }
  
  res.status(200).json(bill);
});

/**
 * Create a new business bill
 * @route POST /api/business/bills
 * @access Private
 */
const createBusinessBill = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const {
    title,
    amount,
    dueDate,
    category,
    status,
    isRecurring,
    recurringPeriod,
    reminderDays,
    vendor,
    taxDeductible,
    receiptImage,
    paymentMethod,
    notes,
    tags,
  } = req.body;
  
  // Create new business bill
  const businessBill = await BusinessBill.create({
    title,
    amount,
    dueDate: dueDate || new Date(),
    category: category || 'OTHER',
    status: status || 'UNPAID',
    isRecurring: isRecurring || false,
    recurringPeriod: isRecurring ? (recurringPeriod || 'MONTHLY') : undefined,
    reminderDays: reminderDays || 3,
    vendor,
    taxDeductible: taxDeductible !== undefined ? taxDeductible : true,
    receiptImage,
    paymentMethod: paymentMethod || 'OTHER',
    notes,
    tags,
    user: req.user.id,
  });
  
  res.status(201).json(businessBill);
});

/**
 * Update a business bill
 * @route PUT /api/business/bills/:id
 * @access Private
 */
const updateBusinessBill = asyncHandler(async (req, res) => {
  const bill = await BusinessBill.findOne({
    _id: req.params.id,
    user: req.user.id,
  });
  
  if (!bill) {
    res.status(404);
    throw new Error('Business bill not found');
  }
  
  // Update the bill with new values
  Object.keys(req.body).forEach(key => {
    if (key !== 'user' && key !== '_id' && key !== 'createdAt') {
      bill[key] = req.body[key];
    }
  });
  
  const updatedBill = await bill.save();
  
  res.status(200).json(updatedBill);
});

/**
 * Delete a business bill
 * @route DELETE /api/business/bills/:id
 * @access Private
 */
const deleteBusinessBill = asyncHandler(async (req, res) => {
  const bill = await BusinessBill.findOne({
    _id: req.params.id,
    user: req.user.id,
  });
  
  if (!bill) {
    res.status(404);
    throw new Error('Business bill not found');
  }
  
  await bill.deleteOne();
  
  res.status(200).json({ id: req.params.id });
});

/**
 * Add a payment to a business bill
 * @route POST /api/business/bills/:id/payments
 * @access Private
 */
const addPayment = asyncHandler(async (req, res) => {
  const { amount, date, method, notes } = req.body;
  
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Payment amount must be greater than 0');
  }
  
  const bill = await BusinessBill.findOne({
    _id: req.params.id,
    user: req.user.id,
  });
  
  if (!bill) {
    res.status(404);
    throw new Error('Business bill not found');
  }
  
  bill.payments.push({
    amount,
    date: date || new Date(),
    method: method || 'OTHER',
    notes,
  });
  
  // Update status based on payment
  const totalPaid = bill.payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  if (totalPaid >= bill.amount) {
    bill.status = 'PAID';
  } else if (totalPaid > 0) {
    bill.status = 'PARTIALLY_PAID';
  }
  
  const updatedBill = await bill.save();
  
  res.status(200).json(updatedBill);
});

/**
 * Get business bill statistics
 * @route GET /api/business/bills/stats
 * @access Private
 */
const getBusinessBillStats = asyncHandler(async (req, res) => {
  // Total bills
  const totalBills = await BusinessBill.countDocuments({ user: req.user.id });
  
  // Total amount due
  const totalAmount = await BusinessBill.aggregate([
    { $match: { user: req.user.id } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  // Bills by status
  const billsByStatus = await BusinessBill.aggregate([
    { $match: { user: req.user.id } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  // Bills by category
  const billsByCategory = await BusinessBill.aggregate([
    { $match: { user: req.user.id } },
    { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' } } }
  ]);
  
  // Upcoming bills (due in the next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const upcomingBills = await BusinessBill.countDocuments({
    user: req.user.id,
    dueDate: { $gte: new Date(), $lte: thirtyDaysFromNow },
    status: { $in: ['UNPAID', 'PARTIALLY_PAID'] }
  });
  
  res.status(200).json({
    totalBills,
    totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
    billsByStatus: billsByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    billsByCategory: billsByCategory.map(item => ({
      category: item._id,
      count: item.count,
      total: item.total
    })),
    upcomingBills
  });
});

module.exports = {
  getBusinessBills,
  getBusinessBillById,
  createBusinessBill,
  updateBusinessBill,
  deleteBusinessBill,
  addPayment,
  getBusinessBillStats
};
