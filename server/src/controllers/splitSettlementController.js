/**
 * Split Settlement Controller - For expense splitting functionality
 * Handles settlements between users
 */
const SplitSettlement = require('../models/splitSettlementModel');
const SplitUser = require('../models/splitUserModel');
const SplitBalance = require('../models/splitBalanceModel');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Record a settlement between users
 * @route   POST /api/split/settlements
 * @access  Private
 */
const createSettlement = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { receiverId, amount, method, notes, currency } = req.body;
  
  // Validate required fields
  if (!receiverId || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Receiver ID and a positive amount are required'
    });
  }
  
  // Find the current user's split profile
  const payer = await SplitUser.findOne({ userId });
  
  if (!payer) {
    return res.status(404).json({
      success: false,
      message: 'Your split user profile not found'
    });
  }
  
  // Find the receiver
  const receiver = await SplitUser.findById(receiverId);
  
  if (!receiver) {
    return res.status(404).json({
      success: false,
      message: 'Receiver not found'
    });
  }
  
  // Check if there's an actual debt to settle
  const balance = await SplitBalance.findOne({
    splitUser: payer._id,
    otherSplitUser: receiver._id
  });
  
  if (!balance || balance.amount >= 0) {
    return res.status(400).json({
      success: false,
      message: 'You do not owe this user any money'
    });
  }
  
  const settledAmount = Math.min(Math.abs(balance.amount), parseFloat(amount));
  
  // Create the settlement record
  const settlement = await SplitSettlement.create({
    payer: payer._id,
    receiver: receiver._id,
    amount: settledAmount,
    currency: currency || balance.currency || 'USD',
    date: Date.now(),
    method: method || 'other',
    notes: notes || '',
    status: 'completed'
  });
  
  // Update balances
  await updateBalancesAfterSettlement(payer._id, receiver._id, settledAmount, balance.currency);
  
  // Update recent contacts
  await updateRecentContactsAfterSettlement(payer._id, receiver._id);
  
  // Get populated settlement data
  const populatedSettlement = await SplitSettlement.findById(settlement._id)
    .populate({
      path: 'payer',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'receiver',
      select: '_id displayName email avatar'
    });
  
  res.status(201).json({
    success: true,
    message: 'Settlement recorded successfully',
    data: populatedSettlement
  });
});

/**
 * @desc    Get settlement history for current user
 * @route   GET /api/split/settlements
 * @access  Private
 */
const getSettlementHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { limit = 20, page = 1 } = req.query;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Build query to find settlements where user is payer or receiver
  const query = {
    $or: [
      { payer: splitUser._id },
      { receiver: splitUser._id }
    ]
  };
  
  // Count total settlements
  const total = await SplitSettlement.countDocuments(query);
  
  // Get paginated settlements
  const settlements = await SplitSettlement.find(query)
    .populate({
      path: 'payer',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'receiver',
      select: '_id displayName email avatar'
    })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  
  res.status(200).json({
    success: true,
    count: settlements.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: settlements
  });
});

/**
 * @desc    Get settlements with a specific user
 * @route   GET /api/split/settlements/user/:userId
 * @access  Private
 */
const getSettlementsWithUser = asyncHandler(async (req, res) => {
  const loggedUserId = req.user._id;
  const { userId } = req.params;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId: loggedUserId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the other user's split profile
  const otherSplitUser = await SplitUser.findOne({ userId });
  
  if (!otherSplitUser) {
    return res.status(404).json({
      success: false,
      message: 'Other user\'s split profile not found'
    });
  }
  
  // Build query to find settlements between these two users
  const query = {
    $or: [
      { payer: splitUser._id, receiver: otherSplitUser._id },
      { payer: otherSplitUser._id, receiver: splitUser._id }
    ]
  };
  
  // Get settlements
  const settlements = await SplitSettlement.find(query)
    .populate({
      path: 'payer',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'receiver',
      select: '_id displayName email avatar'
    })
    .sort({ date: -1 });
  
  res.status(200).json({
    success: true,
    count: settlements.length,
    data: settlements
  });
});

/**
 * @desc    Get a specific settlement
 * @route   GET /api/split/settlements/:id
 * @access  Private
 */
const getSettlement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the settlement and verify user participation
  const settlement = await SplitSettlement.findOne({
    _id: id,
    $or: [
      { payer: splitUser._id },
      { receiver: splitUser._id }
    ]
  })
    .populate({
      path: 'payer',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'receiver',
      select: '_id displayName email avatar'
    });
  
  if (!settlement) {
    return res.status(404).json({
      success: false,
      message: 'Settlement not found or you are not a participant'
    });
  }
  
  res.status(200).json({
    success: true,
    data: settlement
  });
});

/**
 * @desc    Cancel a settlement (for specific cases)
 * @route   PUT /api/split/settlements/:id/cancel
 * @access  Private (Admin only)
 */
const cancelSettlement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the settlement
  const settlement = await SplitSettlement.findById(id);
  
  if (!settlement) {
    return res.status(404).json({
      success: false,
      message: 'Settlement not found'
    });
  }
  
  // Only allow admin to cancel settlements
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only admins can cancel settlements'
    });
  }
  
  // Check if already cancelled
  if (settlement.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'Settlement is already cancelled'
    });
  }
  
  // Reverse the balance changes
  await reverseSettlementBalances(
    settlement.payer,
    settlement.receiver,
    settlement.amount,
    settlement.currency
  );
  
  // Update settlement status
  settlement.status = 'cancelled';
  await settlement.save();
  
  res.status(200).json({
    success: true,
    message: 'Settlement cancelled successfully',
    data: settlement
  });
});

// Helper function to update balances after a settlement
const updateBalancesAfterSettlement = async (payerId, receiverId, amount, currency) => {
  // Update payer's balance (increase by settlement amount)
  let payerBalance = await SplitBalance.findOne({
    splitUser: payerId,
    otherSplitUser: receiverId
  });
  
  if (payerBalance) {
    payerBalance.amount += amount;
    payerBalance.lastUpdated = Date.now();
    await payerBalance.save();
  } else {
    await SplitBalance.create({
      splitUser: payerId,
      otherSplitUser: receiverId,
      amount: amount,
      currency: currency || 'USD',
      lastUpdated: Date.now()
    });
  }
  
  // Update receiver's balance (decrease by settlement amount)
  let receiverBalance = await SplitBalance.findOne({
    splitUser: receiverId,
    otherSplitUser: payerId
  });
  
  if (receiverBalance) {
    receiverBalance.amount -= amount;
    receiverBalance.lastUpdated = Date.now();
    await receiverBalance.save();
  } else {
    await SplitBalance.create({
      splitUser: receiverId,
      otherSplitUser: payerId,
      amount: -amount,
      currency: currency || 'USD',
      lastUpdated: Date.now()
    });
  }
};

// Helper function to reverse balances after a settlement cancellation
const reverseSettlementBalances = async (payerId, receiverId, amount, currency) => {
  // Update payer's balance (decrease by settlement amount)
  let payerBalance = await SplitBalance.findOne({
    splitUser: payerId,
    otherSplitUser: receiverId
  });
  
  if (payerBalance) {
    payerBalance.amount -= amount;
    payerBalance.lastUpdated = Date.now();
    await payerBalance.save();
  }
  
  // Update receiver's balance (increase by settlement amount)
  let receiverBalance = await SplitBalance.findOne({
    splitUser: receiverId,
    otherSplitUser: payerId
  });
  
  if (receiverBalance) {
    receiverBalance.amount += amount;
    receiverBalance.lastUpdated = Date.now();
    await receiverBalance.save();
  }
};

// Helper function to update recent contacts after settlement
const updateRecentContactsAfterSettlement = async (payerId, receiverId) => {
  // Update payer's recent contacts
  const payer = await SplitUser.findById(payerId);
  if (payer) {
    // Check if receiver is already in recent contacts
    const existingContactIndex = payer.recentContacts.findIndex(
      contact => contact.splitUser.toString() === receiverId.toString()
    );
    
    if (existingContactIndex !== -1) {
      // Update the last interaction date
      payer.recentContacts[existingContactIndex].lastInteractionDate = Date.now();
    } else {
      // Add to recent contacts
      payer.recentContacts.push({
        splitUser: receiverId,
        lastInteractionDate: Date.now()
      });
    }
    
    // Limit to 20 recent contacts
    if (payer.recentContacts.length > 20) {
      payer.recentContacts.sort((a, b) => 
        new Date(b.lastInteractionDate) - new Date(a.lastInteractionDate)
      );
      payer.recentContacts = payer.recentContacts.slice(0, 20);
    }
    
    await payer.save();
  }
  
  // Update receiver's recent contacts
  const receiver = await SplitUser.findById(receiverId);
  if (receiver) {
    // Check if payer is already in recent contacts
    const existingContactIndex = receiver.recentContacts.findIndex(
      contact => contact.splitUser.toString() === payerId.toString()
    );
    
    if (existingContactIndex !== -1) {
      // Update the last interaction date
      receiver.recentContacts[existingContactIndex].lastInteractionDate = Date.now();
    } else {
      // Add to recent contacts
      receiver.recentContacts.push({
        splitUser: payerId,
        lastInteractionDate: Date.now()
      });
    }
    
    // Limit to 20 recent contacts
    if (receiver.recentContacts.length > 20) {
      receiver.recentContacts.sort((a, b) => 
        new Date(b.lastInteractionDate) - new Date(a.lastInteractionDate)
      );
      receiver.recentContacts = receiver.recentContacts.slice(0, 20);
    }
    
    await receiver.save();
  }
};

module.exports = {
  createSettlement,
  getSettlementHistory,
  getSettlementsWithUser,
  getSettlement,
  cancelSettlement
};
