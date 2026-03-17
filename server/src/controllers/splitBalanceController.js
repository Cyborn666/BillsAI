/**
 * Split Balance Controller - For expense splitting functionality
 * Handles balance tracking and calculations between users
 */
const SplitBalance = require('../models/splitBalanceModel');
const SplitUser = require('../models/splitUserModel');
const SplitGroup = require('../models/splitGroupModel');
const SplitExpense = require('../models/splitExpenseModel');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Get all balances for current user
 * @route   GET /api/split/balances
 * @access  Private
 */
const getUserBalances = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  console.log('getUserBalances called for userId:', userId);
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  console.log('Found splitUser:', splitUser ? 'Yes' : 'No');
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Get all balances where the user is involved
  const balances = await SplitBalance.find({
    splitUser: splitUser._id
  })
    .populate({
      path: 'otherSplitUser',
      select: '_id displayName email avatar'
    })
    .sort({ lastUpdated: -1 });
  
  console.log('Found balances count:', balances.length);
  
  // Calculate overall balance
  let totalOwed = 0;
  let totalOwing = 0;
  
  balances.forEach(balance => {
    if (balance.amount > 0) {
      totalOwed += balance.amount;
    } else if (balance.amount < 0) {
      totalOwing += Math.abs(balance.amount);
    }
  });
  
  console.log('Total owed:', totalOwed);
  console.log('Total owing:', totalOwing);
  
  // Filter out zero balances
  const nonZeroBalances = balances.filter(balance => balance.amount !== 0);
  
  console.log('Non-zero balances count:', nonZeroBalances.length);
  
  const responseData = {
    success: true,
    data: {
      balances: nonZeroBalances,
      totalOwed,
      totalOwing,
      netBalance: totalOwed - totalOwing
    }
  };
  console.log('Sending response with balances:', responseData.data.balances.length);
  res.json(responseData);
});

/**
 * @desc    Get balance with a specific user
 * @route   GET /api/split/balances/user/:otherUserId
 * @access  Private
 */
const getBalanceWithUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the other user's split profile
  const otherSplitUser = await SplitUser.findById(otherUserId);
  
  if (!otherSplitUser) {
    return res.status(404).json({
      success: false,
      message: 'Other user not found'
    });
  }
  
  // Get balance between the two users
  const balance = await SplitBalance.findOne({
    splitUser: splitUser._id,
    otherSplitUser: otherSplitUser._id
  })
    .populate({
      path: 'otherSplitUser',
      select: '_id displayName email avatar'
    });
  
  // If no balance exists, create a zero balance response
  if (!balance) {
    return res.status(200).json({
      success: true,
      data: {
        _id: null,
        splitUser: splitUser._id,
        otherSplitUser: {
          _id: otherSplitUser._id,
          displayName: otherSplitUser.displayName,
          email: otherSplitUser.email,
          avatar: otherSplitUser.avatar
        },
        amount: 0,
        currency: splitUser.defaultCurrency || 'USD',
        lastUpdated: new Date()
      }
    });
  }
  
  res.status(200).json({
    success: true,
    data: balance
  });
});

/**
 * @desc    Get balances for a specific group
 * @route   GET /api/split/balances/group/:groupId
 * @access  Private
 */
const getGroupBalances = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the group and verify user membership
  const group = await SplitGroup.findOne({
    _id: groupId,
    'members.splitUser': splitUser._id,
    isActive: true
  });
  
  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Group not found or you are not a member'
    });
  }
  
  // Get all members from the group
  const memberIds = group.members.map(member => member.splitUser);
  
  // Initialize balance matrix for all members
  const balanceMatrix = [];
  
  // Populate balance matrix with all balances between group members
  for (const memberId of memberIds) {
    const memberBalances = await SplitBalance.find({
      splitUser: memberId,
      otherSplitUser: { $in: memberIds }
    })
      .populate({
        path: 'splitUser',
        select: '_id displayName email avatar'
      })
      .populate({
        path: 'otherSplitUser',
        select: '_id displayName email avatar'
      });
    
    balanceMatrix.push(...memberBalances);
  }
  
  // Calculate simplified debts
  const simplifiedDebts = simplifyDebts(balanceMatrix, memberIds);
  
  res.status(200).json({
    success: true,
    count: simplifiedDebts.length,
    data: simplifiedDebts
  });
});

/**
 * @desc    Get overall debt simplification for a user
 * @route   GET /api/split/balances/simplify
 * @access  Private
 */
const getSimplifiedBalances = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Get all balances for this user
  const balances = await SplitBalance.find({
    $or: [
      { splitUser: splitUser._id },
      { otherSplitUser: splitUser._id }
    ]
  })
    .populate({
      path: 'splitUser',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'otherSplitUser',
      select: '_id displayName email avatar'
    });
  
  // Get all unique users involved in these balances
  const userSet = new Set();
  balances.forEach(balance => {
    userSet.add(balance.splitUser._id.toString());
    userSet.add(balance.otherSplitUser._id.toString());
  });
  
  const userIds = Array.from(userSet).map(id => id);
  
  // Get all balances between these users
  const allBalances = await SplitBalance.find({
    splitUser: { $in: userIds },
    otherSplitUser: { $in: userIds }
  })
    .populate({
      path: 'splitUser',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'otherSplitUser',
      select: '_id displayName email avatar'
    });
  
  // Calculate simplified debts
  const simplifiedDebts = simplifyDebts(allBalances, userIds);
  
  // Filter to only include debts involving the current user
  const userSimplifiedDebts = simplifiedDebts.filter(debt => 
    debt.from._id.toString() === splitUser._id.toString() || 
    debt.to._id.toString() === splitUser._id.toString()
  );
  
  res.status(200).json({
    success: true,
    count: userSimplifiedDebts.length,
    data: userSimplifiedDebts
  });
});

/**
 * @desc    Get expenses contributing to a specific balance
 * @route   GET /api/split/balances/details/:otherUserId
 * @access  Private
 */
const getBalanceDetails = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;
  const { limit = 10, page = 1 } = req.query;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the other user's split profile
  const otherSplitUser = await SplitUser.findById(otherUserId);
  
  if (!otherSplitUser) {
    return res.status(404).json({
      success: false,
      message: 'Other user not found'
    });
  }
  
  // Get balance between the two users
  const balance = await SplitBalance.findOne({
    splitUser: splitUser._id,
    otherSplitUser: otherSplitUser._id
  });
  
  // Find expenses involving both users
  const query = {
    $and: [
      {
        $or: [
          { paidBy: splitUser._id, 'participants.splitUser': otherSplitUser._id },
          { paidBy: otherSplitUser._id, 'participants.splitUser': splitUser._id }
        ]
      }
    ]
  };
  
  // Count total expenses
  const total = await SplitExpense.countDocuments(query);
  
  // Get paginated expenses
  const expenses = await SplitExpense.find(query)
    .populate({
      path: 'paidBy',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'participants.splitUser',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'group',
      select: '_id name icon currency'
    })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  
  // Calculate the contribution of each expense to the balance
  const detailedExpenses = expenses.map(expense => {
    let contribution = 0;
    
    // If current user paid
    if (expense.paidBy._id.toString() === splitUser._id.toString()) {
      // Find other user's share
      const participant = expense.participants.find(
        p => p.splitUser._id.toString() === otherSplitUser._id.toString()
      );
      
      if (participant) {
        if (expense.splitType === 'equal') {
          contribution = expense.amount / expense.participants.length;
        } else if (expense.splitType === 'exact') {
          contribution = participant.share;
        } else if (expense.splitType === 'percentage') {
          contribution = (participant.share / 100) * expense.amount;
        } else if (expense.splitType === 'shares') {
          const totalShares = expense.participants.reduce((sum, p) => sum + p.share, 0);
          contribution = (participant.share / totalShares) * expense.amount;
        }
      }
    } 
    // If other user paid
    else if (expense.paidBy._id.toString() === otherSplitUser._id.toString()) {
      // Find current user's share
      const participant = expense.participants.find(
        p => p.splitUser._id.toString() === splitUser._id.toString()
      );
      
      if (participant) {
        if (expense.splitType === 'equal') {
          contribution = -1 * (expense.amount / expense.participants.length);
        } else if (expense.splitType === 'exact') {
          contribution = -1 * participant.share;
        } else if (expense.splitType === 'percentage') {
          contribution = -1 * (participant.share / 100) * expense.amount;
        } else if (expense.splitType === 'shares') {
          const totalShares = expense.participants.reduce((sum, p) => sum + p.share, 0);
          contribution = -1 * (participant.share / totalShares) * expense.amount;
        }
      }
    }
    
    return {
      ...expense.toObject(),
      contribution
    };
  });
  
  res.status(200).json({
    success: true,
    balance: balance ? balance.amount : 0,
    count: detailedExpenses.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: detailedExpenses
  });
});

/**
 * Debt simplification algorithm
 * Implements a greedy algorithm to minimize the number of transactions needed
 * to settle all debts within a group
 */
const simplifyDebts = (balances, memberIds) => {
  // Initialize net amounts for each user
  const netAmounts = {};
  memberIds.forEach(id => {
    netAmounts[id.toString()] = 0;
  });
  
  // Calculate net amount for each user
  balances.forEach(balance => {
    const fromId = balance.splitUser._id.toString();
    const toId = balance.otherSplitUser._id.toString();
    const amount = balance.amount;
    
    if (netAmounts.hasOwnProperty(fromId)) {
      netAmounts[fromId] += amount;
    }
  });
  
  // Separate into creditors (positive balance) and debtors (negative balance)
  const creditors = [];
  const debtors = [];
  
  for (const [userId, amount] of Object.entries(netAmounts)) {
    if (amount > 0) {
      creditors.push({
        id: userId,
        amount
      });
    } else if (amount < 0) {
      debtors.push({
        id: userId,
        amount: Math.abs(amount)
      });
    }
  }
  
  // Sort by amount (descending)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  
  // Generate simplified transactions
  const transactions = [];
  
  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    
    // Find user objects from IDs
    const fromUser = balances.find(b => b.splitUser._id.toString() === debtor.id)?.splitUser || 
                    balances.find(b => b.otherSplitUser._id.toString() === debtor.id)?.otherSplitUser;
    
    const toUser = balances.find(b => b.splitUser._id.toString() === creditor.id)?.splitUser || 
                  balances.find(b => b.otherSplitUser._id.toString() === creditor.id)?.otherSplitUser;
    
    if (!fromUser || !toUser) continue;
    
    // Amount to transfer is the minimum of what's owed and what's due
    const amount = Math.min(creditor.amount, debtor.amount);
    
    if (amount > 0.01) { // Only create transactions for non-zero amounts
      transactions.push({
        from: fromUser,
        to: toUser,
        amount: parseFloat(amount.toFixed(2))
      });
    }
    
    // Update remaining amounts
    creditor.amount -= amount;
    debtor.amount -= amount;
    
    // Remove users with zero balance
    if (creditor.amount < 0.01) creditors.shift();
    if (debtor.amount < 0.01) debtors.shift();
  }
  
  return transactions;
};

module.exports = {
  getUserBalances,
  getBalanceWithUser,
  getGroupBalances,
  getSimplifiedBalances,
  getBalanceDetails
};
