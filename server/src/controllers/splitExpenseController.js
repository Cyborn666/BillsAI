/**
 * Split Expense Controller - For expense splitting functionality
 * Handles expense creation, management, and splitting
 */
const SplitExpense = require('../models/splitExpenseModel');
const SplitUser = require('../models/splitUserModel');
const SplitGroup = require('../models/splitGroupModel');
const SplitBalance = require('../models/splitBalanceModel');
const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Create a new shared expense
 * @route   POST /api/split/expenses
 * @access  Private
 */
const createSplitExpense = asyncHandler(async (req, res) => {
  // Debug request authentication
  console.log('Request user object:', req.user);
  
  // Get user ID - ensure it exists (could be in req.user.id or req.user._id)
  const userId = req.user ? (req.user.id || req.user._id) : null;
  
  if (!userId) {
    console.error('User ID is missing from request. Authentication issue detected.');
    return res.status(401).json({
      success: false,
      message: 'Authentication required. User ID not found.'
    });
  }
  
  const { 
    title, 
    amount, 
    groupId, 
    splitType, 
    participants, 
    category, 
    date, 
    notes, 
    receiptImageUrl,
    paidBy   // Make sure we're getting paidBy from the request
  } = req.body;
  
  // Log detailed information about the request
  console.log('Received expense data:', { 
    title, amount, groupId, splitType, 
    participants: participants?.length || 0,
    paidBy: paidBy || 'Not provided'
  });
  
  // Log the actual participants array structure for debugging
  console.log('Participants details:', JSON.stringify(participants, null, 2));
  
  // Validate required fields
  if (!title || !amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Title and a positive amount are required'
    });
  }
  
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one participant is required'
    });
  }
  
  // First check if the paidBy field contains a valid user ID
  // If so, we'll use that to find the payer's split profile
  let payerId = paidBy || userId;
  console.log('Looking for split profile with user ID:', payerId);
  
  // Find the payer's split profile
  let payer = await SplitUser.findOne({ userId: payerId });
  
  // If no split profile exists, create one automatically with the current user's details
  if (!payer) {
    console.log(`Split profile not found for user ${payerId}. Creating one automatically...`);
    
    // Get user details from main User model
    const user = await User.findById(payerId);

    console.log('User details:', user);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Create new split user profile with the current user's information
    try {
      payer = await SplitUser.create({
        userId: user._id,
        displayName: user.fullName || user.username,
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatarId || '',
      });
      
      console.log(`Split profile created automatically for user ${userId}:`, payer);
    } catch (error) {
      console.error(`Failed to create split profile for user ${userId}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create split profile automatically'
      });
    }
  }
  
  // Verify group if provided
  let group = null;
  if (groupId) {
    group = await SplitGroup.findOne({
      _id: groupId,
      'members.splitUser': payer._id,
      isActive: true
    });
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member'
      });
    }
  }
  
  // Process and validate participants
  const processedParticipants = [];
  let totalShare = 0;
  
  for (const participant of participants) {
    // Skip invalid entries
    if (!participant.splitUserId || participant.share === undefined) {
      continue;
    }
    
    // First, try to find by the split user ID (which could be the _id of the split profile)
    let participantUser = await SplitUser.findById(participant.splitUserId);
    
    // If not found by _id, try finding by userId (which is the ID from the main User model)
    if (!participantUser) {
      participantUser = await SplitUser.findOne({ userId: participant.splitUserId });
    }
    
    // If still no split profile exists, try to create one automatically
    if (!participantUser) {
      console.log(`Split profile not found for participant ${participant.splitUserId}. Attempting to create one...`);
      
      // Get user details from main User model
      const user = await User.findById(participant.splitUserId);
      
      if (!user) {
        console.log(`User not found for participant ID: ${participant.splitUserId}. Skipping.`);
        continue;
      }
      
      try {
        // Check once more if a profile exists with this userId to avoid race conditions
        const existingProfile = await SplitUser.findOne({ userId: user._id });
        if (existingProfile) {
          console.log(`Found existing profile for participant ${participant.splitUserId} on second check`); 
          participantUser = existingProfile;
        } else {
          // Create new split user profile for this participant
          participantUser = await SplitUser.create({
            userId: user._id,
            displayName: user.fullName || user.username,
            email: user.email,
            phone: user.phone || '',
            avatar: user.avatarId || '',
          });
          
          console.log(`Split profile created automatically for participant ${participant.splitUserId}:`, participantUser);
        }
      } catch (error) {
        console.error(`Failed to create split profile for participant ${participant.splitUserId}:`, error);
        
        // Try one last time to find the profile in case it was created in a race condition
        try {
          const possibleExistingProfile = await SplitUser.findOne({ userId: participant.splitUserId });
          if (possibleExistingProfile) {
            participantUser = possibleExistingProfile;
            console.log(`Recovered profile after error for participant ${participant.splitUserId}`);
          } else {
            continue; // Skip this participant if profile creation fails and we can't find an existing one
          }
        } catch (secondaryError) {
          continue; // Skip if we really can't find or create a profile
        }
      }
    }
    
    // For group expenses, verify participant is in the group
    if (group) {
      const isMember = group.members.some(
        member => member.splitUser.toString() === participant.splitUserId
      );
      
      if (!isMember) {
        continue;
      }
    }
    
    processedParticipants.push({
      splitUser: participant.splitUserId,
      share: participant.share
    });
    
    totalShare += parseFloat(participant.share);
  }
  
  // Validate we have participants after processing
  if (processedParticipants.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid participants provided'
    });
  }
  
  // Validate split type and shares
  if (splitType === 'percentage' && Math.abs(totalShare - 100) > 0.01) {
    return res.status(400).json({
      success: false,
      message: 'Percentage splits must total 100%'
    });
  }
  
  // Create the expense
  const expenseData = {
    title,
    amount: parseFloat(amount),
    paidBy: payer._id,
    splitType: splitType || 'equal',
    participants: processedParticipants,
    category: category || 'OTHER',
    date: date ? new Date(date) : new Date(),
    notes: notes || '',
    receiptImageUrl: receiptImageUrl || ''
  };
  
  // Add group if applicable
  if (group) {
    expenseData.group = group._id;
  }
  
  const expense = await SplitExpense.create(expenseData);
  
  // Update balances between users
  await updateBalances(expense);
  
  // Update recent contacts
  await updateRecentContacts(payer._id, processedParticipants);
  
  // Populate expense data for response
  const populatedExpense = await SplitExpense.findById(expense._id)
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
    });
  
  res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    data: populatedExpense
  });
});

/**
 * @desc    Get all expenses for current user
 * @route   GET /api/split/expenses
 * @access  Private
 */
const getSplitExpenses = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { limit = 20, page = 1, groupId, otherUser } = req.query;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Build query
  const query = {
    $or: [
      { paidBy: splitUser._id },
      { 'participants.splitUser': splitUser._id }
    ]
  };
  
  // Add group filter if provided
  if (groupId) {
    query.group = groupId;
  }
  
  // Add filter for expenses with a specific other user
  if (otherUser) {
    console.log('Filtering expenses with user:', otherUser);
    // Find expenses where both the current user and the other user are involved
    query.$and = [
      // Current query (expenses involving current user)
      { $or: [
          { paidBy: splitUser._id },
          { 'participants.splitUser': splitUser._id }
        ]
      },
      // Expenses involving the other user
      { $or: [
          { paidBy: otherUser },
          { 'participants.splitUser': otherUser }
        ]
      }
    ];
    // Remove the original $or since we've incorporated it into the $and
    delete query.$or;
  }
  
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
  
  res.status(200).json({
    success: true,
    count: expenses.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: expenses
  });
});

/**
 * @desc    Get a specific expense
 * @route   GET /api/split/expenses/:id
 * @access  Private
 */
const getSplitExpense = asyncHandler(async (req, res) => {
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
  
  // Find the expense and verify user participation
  const expense = await SplitExpense.findOne({
    _id: id,
    $or: [
      { paidBy: splitUser._id },
      { 'participants.splitUser': splitUser._id }
    ]
  })
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
    .populate({
      path: 'comments.splitUser',
      select: '_id displayName avatar'
    });
  
  if (!expense) {
    return res.status(404).json({
      success: false,
      message: 'Expense not found or you are not a participant'
    });
  }
  
  res.status(200).json({
    success: true,
    data: expense
  });
});

/**
 * @desc    Update an expense
 * @route   PUT /api/split/expenses/:id
 * @access  Private (Only payer or group admin)
 */
const updateSplitExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { 
    title, 
    amount, 
    splitType, 
    participants, 
    category, 
    date, 
    notes, 
    receiptImageUrl 
  } = req.body;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the expense
  let expense = await SplitExpense.findById(id);
  
  if (!expense) {
    return res.status(404).json({
      success: false,
      message: 'Expense not found'
    });
  }
  
  // Check if user is the payer or a group admin
  const isPayer = expense.paidBy.toString() === splitUser._id.toString();
  
  let isGroupAdmin = false;
  if (expense.group) {
    const group = await SplitGroup.findById(expense.group);
    if (group) {
      isGroupAdmin = group.members.some(
        member => 
          member.splitUser.toString() === splitUser._id.toString() && 
          member.role === 'admin'
      );
    }
  }
  
  if (!isPayer && !isGroupAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Only the payer or group admin can update the expense'
    });
  }
  
  // Store previous state for balance updates
  const previousExpense = {
    amount: expense.amount,
    paidBy: expense.paidBy,
    participants: expense.participants,
    splitType: expense.splitType
  };
  
  // Update fields
  if (title) expense.title = title;
  if (amount) expense.amount = parseFloat(amount);
  if (category) expense.category = category;
  if (date) expense.date = new Date(date);
  if (notes !== undefined) expense.notes = notes;
  if (receiptImageUrl) expense.receiptImageUrl = receiptImageUrl;
  
  // Process updated participants if provided
  if (participants && Array.isArray(participants) && participants.length > 0) {
    const processedParticipants = [];
    let totalShare = 0;
    
    for (const participant of participants) {
      if (!participant.splitUserId || participant.share === undefined) {
        continue;
      }
      
      // Verify participant exists
      const participantUser = await SplitUser.findById(participant.splitUserId);
      if (!participantUser) {
        continue;
      }
      
      // For group expenses, verify participant is in the group
      if (expense.group) {
        const group = await SplitGroup.findById(expense.group);
        if (group) {
          const isMember = group.members.some(
            member => member.splitUser.toString() === participant.splitUserId
          );
          
          if (!isMember) {
            continue;
          }
        }
      }
      
      processedParticipants.push({
        splitUser: participant.splitUserId,
        share: participant.share
      });
      
      totalShare += parseFloat(participant.share);
    }
    
    // Validate we have participants after processing
    if (processedParticipants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid participants provided'
      });
    }
    
    // Validate split type and shares
    if (splitType === 'percentage' && Math.abs(totalShare - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Percentage splits must total 100%'
      });
    }
    
    if (splitType) expense.splitType = splitType;
    expense.participants = processedParticipants;
  }
  
  // Record edit history
  expense.editHistory.push({
    editedBy: splitUser._id,
    timestamp: Date.now(),
    changes: {
      title: title !== undefined,
      amount: amount !== undefined,
      splitType: splitType !== undefined,
      participants: participants !== undefined,
      category: category !== undefined,
      date: date !== undefined,
      notes: notes !== undefined,
      receiptImageUrl: receiptImageUrl !== undefined
    }
  });
  
  await expense.save();
  
  // Adjust balances based on changes
  await updateBalancesAfterEdit(previousExpense, expense);
  
  // Get updated expense with populated data
  const updatedExpense = await SplitExpense.findById(id)
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
    .populate({
      path: 'comments.splitUser',
      select: '_id displayName avatar'
    })
    .populate({
      path: 'editHistory.editedBy',
      select: '_id displayName avatar'
    });
  
  res.status(200).json({
    success: true,
    message: 'Expense updated successfully',
    data: updatedExpense
  });
});

/**
 * @desc    Delete an expense
 * @route   DELETE /api/split/expenses/:id
 * @access  Private (Only payer or group admin)
 */
const deleteSplitExpense = asyncHandler(async (req, res) => {
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
  
  // Find the expense
  const expense = await SplitExpense.findById(id);
  
  if (!expense) {
    return res.status(404).json({
      success: false,
      message: 'Expense not found'
    });
  }
  
  // Check if user is the payer or a group admin
  const isPayer = expense.paidBy.toString() === splitUser._id.toString();
  
  let isGroupAdmin = false;
  if (expense.group) {
    const group = await SplitGroup.findById(expense.group);
    if (group) {
      isGroupAdmin = group.members.some(
        member => 
          member.splitUser.toString() === splitUser._id.toString() && 
          member.role === 'admin'
      );
    }
  }
  
  if (!isPayer && !isGroupAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Only the payer or group admin can delete the expense'
    });
  }
  
  // Reverse balances before deleting
  await reverseBalances(expense);
  
  // Delete the expense
  await SplitExpense.findByIdAndDelete(id);
  
  res.status(200).json({
    success: true,
    message: 'Expense deleted successfully'
  });
});

/**
 * @desc    Add a comment to an expense
 * @route   POST /api/split/expenses/:id/comments
 * @access  Private (Participants only)
 */
const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { text } = req.body;
  
  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment text is required'
    });
  }
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the expense and verify user participation
  const expense = await SplitExpense.findOne({
    _id: id,
    $or: [
      { paidBy: splitUser._id },
      { 'participants.splitUser': splitUser._id }
    ]
  });
  
  if (!expense) {
    return res.status(404).json({
      success: false,
      message: 'Expense not found or you are not a participant'
    });
  }
  
  // Add comment
  expense.comments.push({
    splitUser: splitUser._id,
    text: text.trim(),
    timestamp: Date.now()
  });
  
  await expense.save();
  
  // Get updated expense with populated data
  const updatedExpense = await SplitExpense.findById(id)
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
    .populate({
      path: 'comments.splitUser',
      select: '_id displayName avatar'
    });
  
  res.status(200).json({
    success: true,
    message: 'Comment added successfully',
    data: updatedExpense
  });
});

// Helper function to update balances when a new expense is created
const updateBalances = async (expense) => {
  const { amount, paidBy, participants, splitType } = expense;
  
  // Calculate each participant's share
  let shares = [];
  
  if (splitType === 'equal') {
    // Equal division
    const equalShare = amount / participants.length;
    shares = participants.map(p => ({
      splitUser: p.splitUser,
      amount: equalShare
    }));
  } else if (splitType === 'exact') {
    // Exact amounts
    shares = participants.map(p => ({
      splitUser: p.splitUser,
      amount: p.share
    }));
  } else if (splitType === 'percentage') {
    // Percentage-based
    shares = participants.map(p => ({
      splitUser: p.splitUser,
      amount: (p.share / 100) * amount
    }));
  } else if (splitType === 'shares') {
    // Share-based
    const totalShares = participants.reduce((sum, p) => sum + p.share, 0);
    shares = participants.map(p => ({
      splitUser: p.splitUser,
      amount: (p.share / totalShares) * amount
    }));
  }
  
  // Update balances for each participant
  for (const share of shares) {
    // Skip if payer is also participant (self-payment)
    if (share.splitUser.toString() === paidBy.toString()) {
      continue;
    }
    
    // Find existing balance between payer and participant
    let balance = await SplitBalance.findOne({
      splitUser: paidBy,
      otherSplitUser: share.splitUser
    });
    
    if (balance) {
      // Update existing balance (payer's perspective)
      balance.amount += share.amount;
      balance.lastUpdated = Date.now();
      await balance.save();
    } else {
      // Create new balance (payer's perspective)
      await SplitBalance.create({
        splitUser: paidBy,
        otherSplitUser: share.splitUser,
        amount: share.amount,
        currency: expense.currency || 'USD',
        lastUpdated: Date.now()
      });
    }
    
    // Find/update reverse balance (participant's perspective)
    let reverseBalance = await SplitBalance.findOne({
      splitUser: share.splitUser,
      otherSplitUser: paidBy
    });
    
    if (reverseBalance) {
      // Update existing balance (participant's perspective)
      reverseBalance.amount -= share.amount;
      reverseBalance.lastUpdated = Date.now();
      await reverseBalance.save();
    } else {
      // Create new balance (participant's perspective)
      await SplitBalance.create({
        splitUser: share.splitUser,
        otherSplitUser: paidBy,
        amount: -share.amount,
        currency: expense.currency || 'USD',
        lastUpdated: Date.now()
      });
    }
  }
};

// Helper function to update balances after an expense is edited
const updateBalancesAfterEdit = async (previousExpense, updatedExpense) => {
  // First reverse the old balances
  await reverseBalances(previousExpense);
  
  // Then apply the new balances
  await updateBalances(updatedExpense);
};

// Helper function to reverse balances (used for deletion or updates)
const reverseBalances = async (expense) => {
  const { amount, paidBy, participants, splitType } = expense;
  
  // Calculate each participant's share (reverse logic from updateBalances)
  let shares = [];
  
  if (splitType === 'equal') {
    const equalShare = amount / participants.length;
    shares = participants.map(p => ({
      splitUser: p.splitUser,
      amount: equalShare
    }));
  } else if (splitType === 'exact') {
    shares = participants.map(p => ({
      splitUser: p.splitUser,
      amount: p.share
    }));
  } else if (splitType === 'percentage') {
    shares = participants.map(p => ({
      splitUser: p.splitUser,
      amount: (p.share / 100) * amount
    }));
  } else if (splitType === 'shares') {
    const totalShares = participants.reduce((sum, p) => sum + p.share, 0);
    shares = participants.map(p => ({
      splitUser: p.splitUser,
      amount: (p.share / totalShares) * amount
    }));
  }
  
  // Reverse balances for each participant
  for (const share of shares) {
    // Skip if payer is also participant (self-payment)
    if (share.splitUser.toString() === paidBy.toString()) {
      continue;
    }
    
    // Update payer's balance (subtract the share)
    let balance = await SplitBalance.findOne({
      splitUser: paidBy,
      otherSplitUser: share.splitUser
    });
    
    if (balance) {
      balance.amount -= share.amount;
      balance.lastUpdated = Date.now();
      await balance.save();
    }
    
    // Update participant's balance (add the share)
    let reverseBalance = await SplitBalance.findOne({
      splitUser: share.splitUser,
      otherSplitUser: paidBy
    });
    
    if (reverseBalance) {
      reverseBalance.amount += share.amount;
      reverseBalance.lastUpdated = Date.now();
      await reverseBalance.save();
    }
  }
};

// Helper function to update recent contacts
const updateRecentContacts = async (payerId, participants) => {
  // Get all unique user IDs involved
  const uniqueUserIds = new Set(participants.map(p => p.splitUser.toString()));
  
  // Don't include payer in their own recent contacts
  uniqueUserIds.delete(payerId.toString());
  
  // Update payer's recent contacts
  const payer = await SplitUser.findById(payerId);
  if (payer) {
    for (const participantId of uniqueUserIds) {
      // Check if already in recent contacts
      const existingContactIndex = payer.recentContacts.findIndex(
        contact => contact.splitUser.toString() === participantId
      );
      
      if (existingContactIndex !== -1) {
        // Update the last interaction date
        payer.recentContacts[existingContactIndex].lastInteractionDate = Date.now();
      } else {
        // Add to recent contacts
        payer.recentContacts.push({
          splitUser: participantId,
          lastInteractionDate: Date.now()
        });
      }
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
  
  // Update participants' recent contacts
  for (const participantId of uniqueUserIds) {
    const participant = await SplitUser.findById(participantId);
    if (participant) {
      // Check if payer is already in recent contacts
      const existingContactIndex = participant.recentContacts.findIndex(
        contact => contact.splitUser.toString() === payerId.toString()
      );
      
      if (existingContactIndex !== -1) {
        // Update the last interaction date
        participant.recentContacts[existingContactIndex].lastInteractionDate = Date.now();
      } else {
        // Add to recent contacts
        participant.recentContacts.push({
          splitUser: payerId,
          lastInteractionDate: Date.now()
        });
      }
      
      // Limit to 20 recent contacts
      if (participant.recentContacts.length > 20) {
        participant.recentContacts.sort((a, b) => 
          new Date(b.lastInteractionDate) - new Date(a.lastInteractionDate)
        );
        participant.recentContacts = participant.recentContacts.slice(0, 20);
      }
      
      await participant.save();
    }
  }
};

module.exports = {
  createSplitExpense,
  getSplitExpenses,
  getSplitExpense,
  updateSplitExpense,
  deleteSplitExpense,
  addComment
};
