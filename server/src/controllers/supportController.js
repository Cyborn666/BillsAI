/**
 * Support Controller
 */
const SupportMessage = require('../models/supportModel');
const User = require('../models/userModel');
const { validationResult } = require('express-validator');

/**
 * Create a new support message
 * @route POST /api/support/messages
 * @access Private
 */
exports.createSupportMessage = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subject, message } = req.body;

    // Get user info
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Create new support message
    const supportMessage = new SupportMessage({
      subject,
      message,
      userId: user._id,
      userEmail: user.email,
    });

    // Save the support message
    await supportMessage.save();

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Support message sent successfully',
      supportMessageId: supportMessage._id,
    });
  } catch (error) {
    //console.error('Error creating support message:', error);
    next(error);
  }
};

/**
 * Get all support messages for the current user
 * @route GET /api/support/messages
 * @access Private
 */
exports.getUserSupportMessages = async (req, res, next) => {
  try {
    const supportMessages = await SupportMessage.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json(supportMessages);
  } catch (error) {
    //console.error('Error fetching support messages:', error);
    next(error);
  }
};

/**
 * Get a specific support message
 * @route GET /api/support/messages/:id
 * @access Private
 */
exports.getSupportMessage = async (req, res, next) => {
  try {
    const supportMessage = await SupportMessage.findById(req.params.id);

    if (!supportMessage) {
      return res.status(404).json({
        message: 'Support message not found',
      });
    }

    // Check if the message belongs to the current user
    if (supportMessage.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'You are not authorized to access this message',
      });
    }

    res.status(200).json(supportMessage);
  } catch (error) {
    //console.error('Error fetching support message:', error);
    next(error);
  }
};

/**
 * For admin use: Get all support messages
 * @route GET /api/support/admin/messages
 * @access Private/Admin
 */
exports.getAllSupportMessages = async (req, res, next) => {
  try {
    const supportMessages = await SupportMessage.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName email');

    res.status(200).json(supportMessages);
  } catch (error) {
    //console.error('Error fetching all support messages:', error);
    next(error);
  }
};

/**
 * For admin use: Update support message status
 * @route PUT /api/support/admin/messages/:id
 * @access Private/Admin
 */
exports.updateSupportMessageStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;

    const supportMessage = await SupportMessage.findById(req.params.id);

    if (!supportMessage) {
      return res.status(404).json({
        message: 'Support message not found',
      });
    }

    // Update the status and admin notes
    supportMessage.status = status || supportMessage.status;
    supportMessage.adminNotes = adminNotes || supportMessage.adminNotes;

    // Save the updated message
    await supportMessage.save();

    res.status(200).json({
      success: true,
      message: 'Support message updated successfully',
      supportMessage,
    });
  } catch (error) {
    //console.error('Error updating support message:', error);
    next(error);
  }
};
