/**
 * Split User Controller - For expense splitting functionality
 * Completely separate from main user controller
 */
const SplitUser = require('../models/splitUserModel');
const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Create a split user profile for an existing user
 * @route   POST /api/split/users/profile
 * @access  Private
 */
const createSplitUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Check if profile already exists
  const existingProfile = await SplitUser.findOne({ userId });
  
  if (existingProfile) {
    return res.status(400).json({
      success: false,
      message: 'Split user profile already exists',
      data: existingProfile
    });
  }
  
  // Get user details from main User model
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Create new split user profile
  const splitUser = await SplitUser.create({
    userId: user._id,
    displayName: user.fullName || user.username,
    email: user.email,
    phone: user.phone || '',
    avatar: user.avatarId || '',
  });
  
  res.status(201).json({
    success: true,
    message: 'Split user profile created successfully',
    data: splitUser
  });
});

/**
 * @desc    Get current user's split profile
 * @route   GET /api/split/users/profile
 * @access  Private
 */
const getSplitUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: splitUser
  });
});

/**
 * @desc    Update split user profile
 * @route   PUT /api/split/users/profile
 * @access  Private
 */
const updateSplitUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { displayName, defaultCurrency, searchableFields, notificationPreferences } = req.body;
  
  let splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Update fields
  if (displayName) splitUser.displayName = displayName;
  if (defaultCurrency) splitUser.defaultCurrency = defaultCurrency;
  if (searchableFields) splitUser.searchableFields = {
    ...splitUser.searchableFields,
    ...searchableFields
  };
  if (notificationPreferences) splitUser.notificationPreferences = {
    ...splitUser.notificationPreferences,
    ...notificationPreferences
  };
  
  splitUser.updatedAt = Date.now();
  
  await splitUser.save();
  
  res.status(200).json({
    success: true,
    message: 'Split user profile updated successfully',
    data: splitUser
  });
});

/**
 * @desc    Search for users by email, username, or phone
 * @route   GET /api/split/users/search
 * @access  Private
 */
const searchSplitUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const userId = req.user._id;
  
  if (!query || query.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 3 characters'
    });
  }
  
  // Find current user's split profile to exclude from results
  const currentSplitUser = await SplitUser.findOne({ userId });
  
  if (!currentSplitUser) {
    return res.status(404).json({
      success: false,
      message: 'Your split user profile not found'
    });
  }
  
  // Build search query with privacy considerations
  const searchQuery = {
    $or: []
  };
  
  // Only search in fields that users have made searchable
  searchQuery.$or.push({ 
    email: { $regex: query, $options: 'i' },
    'searchableFields.email': true
  });
  
  searchQuery.$or.push({ 
    phone: { $regex: query, $options: 'i' },
    'searchableFields.phone': true
  });
  
  // Also search for displayName
  searchQuery.$or.push({ 
    displayName: { $regex: query, $options: 'i' }
  });
  
  // Exclude current user
  const excludeCurrentUser = { _id: { $ne: currentSplitUser._id } };
  
  // Combine queries
  const finalQuery = {
    $and: [searchQuery, excludeCurrentUser]
  };
  
  const splitUsers = await SplitUser.find(finalQuery)
    .select('_id displayName email phone avatar')
    .limit(10);
  
  res.status(200).json({
    success: true,
    count: splitUsers.length,
    data: splitUsers
  });
});

/**
 * @desc    Get recent contacts
 * @route   GET /api/split/contacts
 * @access  Private
 */
const getRecentContacts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const splitUser = await SplitUser.findOne({ userId })
    .populate({
      path: 'recentContacts.splitUser',
      select: '_id displayName email phone avatar'
    });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Sort by lastInteractionDate
  const sortedContacts = splitUser.recentContacts.sort((a, b) => 
    new Date(b.lastInteractionDate) - new Date(a.lastInteractionDate)
  );
  
  res.status(200).json({
    success: true,
    count: sortedContacts.length,
    data: sortedContacts
  });
});

/**
 * @desc    Update recent contacts
 * @route   POST /api/split/contacts
 * @access  Private (Internal use only)
 */
const updateRecentContact = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { contactId } = req.body;
  
  if (!contactId) {
    return res.status(400).json({
      success: false,
      message: 'Contact ID is required'
    });
  }
  
  let splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Check if contact exists
  const contactExists = await SplitUser.findById(contactId);
  
  if (!contactExists) {
    return res.status(404).json({
      success: false,
      message: 'Contact not found'
    });
  }
  
  // Check if contact is already in recent contacts
  const existingContactIndex = splitUser.recentContacts.findIndex(
    contact => contact.splitUser.toString() === contactId
  );
  
  if (existingContactIndex !== -1) {
    // Update the last interaction date
    splitUser.recentContacts[existingContactIndex].lastInteractionDate = Date.now();
  } else {
    // Add to recent contacts
    splitUser.recentContacts.push({
      splitUser: contactId,
      lastInteractionDate: Date.now()
    });
    
    // Limit to 20 recent contacts
    if (splitUser.recentContacts.length > 20) {
      // Sort by date first
      splitUser.recentContacts.sort((a, b) => 
        new Date(b.lastInteractionDate) - new Date(a.lastInteractionDate)
      );
      
      // Remove the oldest
      splitUser.recentContacts = splitUser.recentContacts.slice(0, 20);
    }
  }
  
  await splitUser.save();
  
  res.status(200).json({
    success: true,
    message: 'Recent contacts updated successfully'
  });
});

module.exports = {
  createSplitUserProfile,
  getSplitUserProfile,
  updateSplitUserProfile,
  searchSplitUsers,
  getRecentContacts,
  updateRecentContact
};
