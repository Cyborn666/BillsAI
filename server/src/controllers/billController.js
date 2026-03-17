/**
 * Bill Controller
 */
const Bill = require('../models/billModel');
const { validationResult } = require('express-validator');
const User = require('../models/userModel');

/**
 * Get all bills for the authenticated user
 * @route GET /api/bills
 * @access Private
 */
exports.getBills = async (req, res, next) => {
  try {
    // Parse query parameters for filtering
    const {
      status,
      category,
      startDate,
      endDate,
      isRecurring,
      minAmount,
      maxAmount,
      sort = '-dueDate',// Default sort by due date (descending)
    } = req.query;

    // Build query - get bills owned by user OR shared with user
    const query = {
      $or: [
        { user: req.user.id },
        { sharedWith: req.user.id },
      ],
    };

    // Add filters if provided
    if (status) {query.status = status;}
    if (category) {query.category = category;}
    if (isRecurring) {query.isRecurring = isRecurring === 'true';}

    // Date range filter
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) {query.dueDate.$gte = new Date(startDate);}
      if (endDate) {query.dueDate.$lte = new Date(endDate);}
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) {
        query.amount.$gte = Number(minAmount);
      }
      if (maxAmount) {
        query.amount.$lte = Number(maxAmount);
      }
    }

    // Execute query with pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const bills = await Bill.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Bill.countDocuments(query);

    res.status(200).json({
      bills,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get bill by ID
 * @route GET /api/bills/:id
 * @access Private
 */
exports.getBillById = async (req, res, next) => {
  try {
    // Find bills that are owned by the user OR shared with the user
    const bill = await Bill.findOne({
      _id: req.params.id,
      $or: [
        { user: req.user.id },
        { sharedWith: req.user.id },
      ],
    }).populate('sharedWith', '_id username fullName'); // Populate shared users' info

    if (!bill) {
      return res.status(404).json({
        message: 'Bill not found',
      });
    }

    res.status(200).json({ bill });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new bill
 * @route POST /api/bills
 * @access Private
 */
exports.createBill = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Debug log the incoming data
    /*console.log('Creating bill with data:', JSON.stringify(req.body, null, 2));
    console.log('reminderDays type:', typeof req.body.reminderDays);
    console.log('reminderDays value:', req.body.reminderDays);*/

    // Prepare bill data
    const billData = {
      ...req.body,
      user: req.user.id,
    };

    // Set the createdBy field
    if (req.body.isShared) {
      billData.createdBy = req.user.id;

      // Validate shared users exist if bill is shared
      if (req.body.sharedWithUsernames && req.body.sharedWithUsernames.length > 0) {
        const User = require('../models/userModel');
        // Find users by usernames
        const users = await User.find({
          username: { $in: req.body.sharedWithUsernames },
        });

        // Check if all requested usernames were found
        if (users.length !== req.body.sharedWithUsernames.length) {
          return res.status(400).json({
            message: 'One or more usernames not found',
          });
        }

        // Store user IDs
        billData.sharedWith = users.map(user => user._id);

        // Calculate and store split details if this is a shared bill
        if (req.body.splitType === 'EQUAL') {
          // +1 for the creator
          const splitAmount = parseFloat(req.body.amount) / (users.length + 1);

          // Initialize split details map
          billData.splitDetails = {};

          // Add split amount for each user including the creator
          billData.splitDetails[req.user.id] = splitAmount;
          users.forEach(user => {
            billData.splitDetails[user._id] = splitAmount;
          });
        } else if (req.body.splitType === 'CUSTOM') {
          // Initialize split objects (not using Map directly)

          billData.splitDetails = {};

          // Handle the percentages from the frontend
          if (req.body.splitPercentages) {
            // Store the percentages
            for (const [key, value] of Object.entries(req.body.splitPercentages)) {
              if (key === 'currentUser') {
                billData.splitPercentages[req.user.id] = parseFloat(value);
              } else {
                billData.splitPercentages[key] = parseFloat(value);
              }
            }
          } else if (req.body.splitDetails) {
            // For backward compatibility, derive percentages from splitDetails
            const totalAmount = parseFloat(req.body.amount);
            for (const [key, value] of Object.entries(req.body.splitDetails)) {
              const percent = (parseFloat(value) / totalAmount) * 100;
              if (key === 'currentUser') {
                billData.splitPercentages[req.user.id] = percent;
              } else {
                billData.splitPercentages[key] = percent;
              }
            }
          }

          // Calculate split details based on percentages
          const totalAmount = parseFloat(req.body.amount);
          for (const [userId, percentage] of Object.entries(billData.splitPercentages)) {
            const amount = (percentage / 100) * totalAmount;
            billData.splitDetails[userId] = parseFloat(amount);
          }
        }

        // Remove the temporary sharedWithUsernames field before saving
        delete billData.sharedWithUsernames;
      }
    }

    // Create bill
    const bill = await Bill.create(billData);

    // Debug log the created bill
    //console.log('Created bill:', JSON.stringify(bill, null, 2));
    //console.log('reminderDays saved:', bill.reminderDays);

    // If this is a shared bill, just log the sharing information (no notifications needed)
    if (req.body.isShared && billData.sharedWith && billData.sharedWith.length > 0) {
      //console.log(`Bill ${bill.title} (${bill._id}) shared with ${billData.sharedWith.length} users`);
    }

    res.status(201).json({
      message: 'Bill created successfully',
      bill,
    });
  } catch (error) {
    //console.error('Error creating bill:', error);
    next(error);
  }
};

/**
 * Update bill
 * @route PUT /api/bills/:id
 * @access Private
 */
exports.updateBill = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Debug log the incoming data
    //console.log('Updating bill with data:', JSON.stringify(req.body, null, 2));
    //console.log('reminderDays type:', typeof req.body.reminderDays);
    //console.log('reminderDays value:', req.body.reminderDays);

    // Find bill by ID and user (or shared with user)
    let bill = await Bill.findOne({
      _id: req.params.id,
      $or: [
        { user: req.user.id },
        { sharedWith: req.user.id },
      ],
    });

    if (!bill) {
      return res.status(404).json({
        message: 'Bill not found',
      });
    }
    // Check permissions - only the creator or owner can update the bill
    if (bill.user.toString() !== req.user.id &&
        (!bill.createdBy || bill.createdBy.toString() !== req.user.id)) {
      return res.status(403).json({
        message: 'You do not have permission to update this bill',
      });
    }

    // Log the current bill reminderDays value
    //console.log('Current bill reminderDays:', bill.reminderDays);

    // Update bill
    bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    // Debug log the updated bill
    //console.log('Updated bill:', JSON.stringify(bill, null, 2));
    //console.log('reminderDays saved after update:', bill.reminderDays);

    res.status(200).json({
      message: 'Bill updated successfully',
      bill,
    });
  } catch (error) {
    //console.error('Error updating bill:', error);
    next(error);
  }
};

/**
 * Delete bill
 * @route DELETE /api/bills/:id
 * @access Private
 */
exports.deleteBill = async (req, res, next) => {
  try {
    // Find bill by ID and user
    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!bill) {
      return res.status(404).json({
        message: 'Bill not found',
      });
    }

    // Delete bill - using deleteOne instead of deprecated remove() method

    // Delete associated payments
    if (bill.isShared && bill.status !== 'PAID'){
      return res.status(400).json({
        message: 'You cannot delete a shared bill that has payments pending',
      });
    }
    await Bill.deleteOne({ _id: bill._id });

    res.status(200).json({
      message: 'Bill deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add payment to bill
 * @route POST /api/bills/:id/payments
 * @access Private
 */
exports.addPayment = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Find bill by ID and user
    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!bill) {
      return res.status(404).json({
        message: 'Bill not found',
      });
    }

    // Add payment to bill
    bill.payments.push(req.body);

    // Update bill status based on payments
    const totalPaid = bill.payments.reduce((sum, payment) => sum + payment.amount, 0);

    if (totalPaid >= bill.amount) {
      bill.status = 'PAID';
    } else if (totalPaid > 0) {
      bill.status = 'PARTIALLY_PAID';
    }

    // Save updated bill
    await bill.save();

    res.status(200).json({
      message: 'Payment added successfully',
      bill,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get bill statistics
 * @route GET /api/bills/statistics
 * @access Private
 */
exports.getBillStatistics = async (req, res, next) => {
  try {
    // Get current month range
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Total bills (due in current month only)
    const totalBills = await Bill.countDocuments({
      $or: [
        { user: req.user.id },
        { sharedWith: req.user.id },
      ],
      dueDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });

    // Bills due this month
    const billsDueThisMonth = await Bill.find({
      $or: [
        { user: req.user.id },
        { sharedWith: req.user.id },
      ],
      dueDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });

    // Initialize amounts
let individualAmountDue = 0;
let individualAmountPaid = 0;
let sharedAmountDue = 0;
let sharedAmountPaid = 0;

// Process bills by type
billsDueThisMonth.forEach(bill => {
  if (bill.isShared) {
    // SHARED BILLS
    // Get user's share amount
    let userShareAmount = 0;
    const userId = req.user.id || req.user._id;
    const userIdStr = String(userId);
    if (bill.splitDetails && bill.splitDetails[userIdStr]) {
      userShareAmount = bill.splitDetails[userIdStr];
     // console.log('User share amount:', userShareAmount);
    }

    // Check if user has paid their share
    const isPaidByUser = bill.markedAsPaidBy &&
                         Array.isArray(bill.markedAsPaidBy) &&
                         bill.markedAsPaidBy.includes(userIdStr);

    // Add to appropriate category
    if (isPaidByUser) {
      sharedAmountPaid += userShareAmount;
      //console.log('Is paid by user:', isPaidByUser);
      //console.log('split details:', bill.splitDetails);
      //console.log('User share amount paid:', userShareAmount);
      //console.log('User ID:', userIdStr);
      //console.log('Shared amount paid:', sharedAmountPaid);
    } else {
      sharedAmountDue += userShareAmount;
      //console.log('Shared amount due:', sharedAmountDue);
    }
  } else {
    // INDIVIDUAL BILLS
    const amount = bill.amount || 0;

    // Check if bill is paid
    if (bill.status === 'PAID') {
      individualAmountPaid += amount;
    } else {
      individualAmountDue += amount;
    }
  }
});

// Calculate totals
const totalAmountDueThisMonth = individualAmountDue + sharedAmountDue;
const totalAmountPaidThisMonth = individualAmountPaid + sharedAmountPaid;
const totalAmountThisMonth = totalAmountDueThisMonth + totalAmountPaidThisMonth;


// Log for debugging
//console.log('Individual bills - Due:', individualAmountDue, 'Paid:', individualAmountPaid);
//console.log('Shared bills - Due:', sharedAmountDue, 'Paid:', sharedAmountPaid);
//console.log('Total - Due:', totalAmountDueThisMonth, 'Paid:', totalAmountPaidThisMonth);
//console.log('Total amount this month:', totalAmountThisMonth);
//console.log('Individual amount due:', individualAmountDue);



    // Bills by status
    const billsByStatus = await Bill.aggregate([
      { $match: { user: req.user.id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Bills by category
    const billsByCategory = await Bill.aggregate([
      { $match: { user: req.user.id } },
      { $group: { _id: '$category', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
    ]);

    res.status(200).json({
      statistics: {
        totalBills,
        billsDueThisMonth: billsDueThisMonth.length,
        totalAmountDueThisMonth,
        totalAmountPaidThisMonth,
        totalAmountThisMonth,
        billsByStatus,
        billsByCategory,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent activities for the authenticated user
 * Activities include bill payments, updates, and reminders
 * @route GET /api/bills/activities
 * @access Private
 */
exports.getRecentActivities = async (req, res, next) => {
  try {
    // Get limit from query params or default to 5
    const limit = parseInt(req.query.limit, 10) || 5;

    // Find all bills for the user
    const bills = await Bill.find({ user: req.user.id })
      .sort('-updatedAt')
      .limit(20); // Get more bills than needed to ensure we have enough activities

    const activities = [];
    const today = new Date();

    // Process each bill to extract activities
    for (const bill of bills) {
      // Add payment activities
      for (const payment of bill.payments) {
        activities.push({
          id: `payment-${payment._id}`,
          type: 'payment',
          description: `Payment made for ${bill.title}`,
          date: payment.date,
          amount: payment.amount,
          billId: bill._id,
          billTitle: bill.title,
        });
      }

      // Add due date reminders for upcoming bills
      if (bill.dueDate && new Date(bill.dueDate) > today) {
        activities.push({
          id: `reminder-${bill._id}`,
          type: 'reminder',
          description: `Upcoming payment for ${bill.title}`,
          date: new Date(), // Current date as activity date
          dueDate: bill.dueDate, // Actual due date
          amount: bill.amount,
          billId: bill._id,
          billTitle: bill.title,
        });
      }

      // Add overdue notifications
      if (bill.status === 'OVERDUE') {
        activities.push({
          id: `overdue-${bill._id}`,
          type: 'update',
          description: `${bill.title} payment is overdue`,
          date: new Date(), // Current date
          dueDate: bill.dueDate,
          amount: bill.amount,
          billId: bill._id,
          billTitle: bill.title,
        });
      }
    }

    // Sort by date (most recent first) and limit
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Return the requested number of activities
    res.status(200).json({
      activities: activities.slice(0, limit),
      totalCount: activities.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent transactions (payments) for the authenticated user
 * @route GET /api/bills/transactions
 * @access Private
 */
exports.getRecentTransactions = async (req, res, next) => {
  try {
    // Get limit from query params or default to 10
    const limit = parseInt(req.query.limit, 10) || 10;

    // Find all bills for the user
    const bills = await Bill.find({ user: req.user.id });

    // Extract all payments from the bills
    const transactions = [];

    for (const bill of bills) {
      // Skip bills without payments
      if (!bill.payments || bill.payments.length === 0) {
        continue;
      }

      // Add each payment as a transaction
      for (const payment of bill.payments) {
        transactions.push({
          id: payment._id,
          billId: bill._id,
          billTitle: bill.title,
          amount: payment.amount,
          date: payment.date,
          method: payment.method,
          notes: payment.notes || '',
          category: bill.category,
        });
      }
    }

    // Sort by date (most recent first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Return the requested number of transactions
    res.status(200).json({
      transactions: transactions.slice(0, limit),
      totalCount: transactions.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a bill as paid by the authenticated user
 * @route POST /api/bills/:id/mark-paid
 * @access Private
 */
exports.markBillAsPaid = async (req, res, next) => {
  try {
    // Make sure we have a valid user ID
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated properly' });
    }

    // Make sure we have a valid bill ID
    if (!req.params.id) {
      return res.status(400).json({ message: 'Bill ID is required' });
    }

    // Get bill by ID with minimal fields needed
    let bill;
    try {
      bill = await Bill.findById(req.params.id);
    } catch (findError) {
      //console.error('Error finding bill:', findError);
      return res.status(500).json({ message: 'Error retrieving bill' });
    }

    // Check if bill exists
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // Initialize markedAsPaidBy if it doesn't exist
    if (!bill.markedAsPaidBy) {
      bill.markedAsPaidBy = [];
    }

    // Check if user already marked this bill as paid
    // Convert each ID to string for safe comparison
    let userAlreadyMarkedAsPaid = false;
    const userId = req.user.id.toString();

    if (Array.isArray(bill.markedAsPaidBy)) {
      for (let i = 0; i < bill.markedAsPaidBy.length; i++) {
        const paidById = bill.markedAsPaidBy[i];
        if (paidById && paidById.toString && paidById.toString() === userId) {
          userAlreadyMarkedAsPaid = true;
          break;
        }
      }
    }

    // Add user to markedAsPaidBy if not already there
    if (!userAlreadyMarkedAsPaid) {
      bill.markedAsPaidBy.push(userId);
    }

    // Update bill status based on marked as paid count
    // Be extremely defensive with all operations
    try {
      // Count users who have shared access to this bill
      let totalUsersWithAccess = 1; // Start with 1 for the bill owner

      if (bill.sharedWith && Array.isArray(bill.sharedWith)) {
        // Only count valid shared user IDs
        for (let i = 0; i < bill.sharedWith.length; i++) {
          const sharedUser = bill.sharedWith[i];
          if (sharedUser) {
            totalUsersWithAccess++;
          }
        }
      }

      // Count users who have marked this as paid
      let totalMarkedPaid = 0;
      if (bill.markedAsPaidBy && Array.isArray(bill.markedAsPaidBy)) {
        // Only count valid marked as paid IDs
        for (let i = 0; i < bill.markedAsPaidBy.length; i++) {
          const markedPaidId = bill.markedAsPaidBy[i];
          if (markedPaidId) {
            totalMarkedPaid++;
          }
        }
      }

      // Update status based on payment ratio
      if (totalMarkedPaid === 0) {
        bill.status = 'UNPAID';
      } else if (totalMarkedPaid >= totalUsersWithAccess) {
        bill.status = 'PAID';
      } else {
        bill.status = 'PARTIALLY_PAID';
      }
    } catch (statusError) {
      //console.error('Error calculating bill status:', statusError);
      // If status calculation fails, don't abort - just don't update the status
    }

    // Save the updated bill
    try {
      await bill.save();
    } catch (saveError) {
      //console.error('Error saving bill:', saveError);
      return res.status(500).json({ message: 'Error updating bill payment status' });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Bill marked as paid successfully',
      bill: bill,
    });
  } catch (error) {
    //console.error('Unexpected error in markBillAsPaid:', error);
    return res.status(500).json({ message: 'An unexpected error occurred' });
  }
};
