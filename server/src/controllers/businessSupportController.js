/**
 * Business Support Controller
 * Simplified controller that handles only business support message creation
 */
const BusinessSupportMessage = require('../models/businessSupportModel');
const businessUser = require('../models/businessUserModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * Create a new business support message
 * @route POST /api/business/support/messages
 */
exports.createSupportMessage = catchAsync(async (req, res, next) => {
  const { category, subject, content } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;

  // Check if this user has an associated business
  const business = await businessUser.findOne({_id: userId });

  if (!business) {
    return next(new AppError('No business account found for this user', 404));
  }

  // Create support message with minimal required fields
  const newMessage = await BusinessSupportMessage.create({
    category,
    subject,
    content,
    businessId: business._id,
    userId,
    userEmail,
    status: 'open',
  });

  // Simple success response
  res.status(201).json({
    status: 'success',
    message: 'Support request submitted successfully',
    ticketId: newMessage._id,
  });
});

// Export minimal placeholder functions to keep the routes working
exports.getSupportMessages = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Feature not implemented in this version',
    data: [],
  });
});

exports.getSupportMessage = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Feature not implemented in this version',
    data: null,
  });
});

exports.addMessageResponse = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Feature not implemented in this version',
    data: null,
  });
});

exports.markMessagesAsRead = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Feature not implemented in this version',
    data: null,
  });
});
