/**
 * User Controller
 */
const User = require('../models/userModel');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

/**
 * Get user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        avatarId: user.avatarId,
        role: user.role,
        createdAt: user.createdAt,
        phone: user.phone,
        notifications: user.notifications,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateUserProfile = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, phone, avatarId, username } = req.body;

    // Find and update user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Update fields
    if (fullName) {
      user.fullName = fullName;
    }

    // Update other fields if provided
    if (email) { user.email = email; }
    if (phone) { user.phone = phone; }
    if (username) { user.username = username; }
    if (avatarId) { user.avatarId = avatarId; }

    // Save updated user
    const updatedUser = await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        avatarId: updatedUser.avatarId,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user notification settings
 * @route GET /api/users/notifications
 * @access Private
 */
exports.getNotificationSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Return notification settings, creating defaults if they don't exist
    const notifications = user.notifications || { pushEnabled: false, emailEnabled: false };

    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user notification settings
 * @route PUT /api/users/notifications
 * @access Private
 */
exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const { pushEnabled, emailEnabled } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Update notification settings
    user.notifications = {
      ...user.notifications,
      pushEnabled: pushEnabled !== undefined ? pushEnabled : user.notifications?.pushEnabled || false,
      emailEnabled: emailEnabled !== undefined ? emailEnabled : user.notifications?.emailEnabled || false,
    };

    await user.save();

    res.status(200).json(user.notifications);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user preferences
 * @route GET /api/users/preferences
 * @access Private
 */
exports.getUserPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Return preferences, creating defaults if they don't exist
    const preferences = user.preferences || {
      currency: 'USD ($)',
      language: 'English',
      darkMode: false,
      notifications: true,
    };

    res.status(200).json(preferences);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user preferences
 * @route PUT /api/users/preferences
 * @access Private
 */
exports.updateUserPreferences = async (req, res, next) => {
  try {
    const { currency, language, darkMode, notifications } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Initialize preferences if not exist
    if (!user.preferences) {
      user.preferences = {};
    }

    // Update preferences with new values, keeping existing ones if not provided
    user.preferences = {
      ...user.preferences,
      currency: currency !== undefined ? currency : user.preferences.currency || 'USD ($)',
      language: language !== undefined ? language : user.preferences.language || 'English',
      darkMode: darkMode !== undefined ? darkMode : user.preferences.darkMode || false,
      notifications: notifications !== undefined ? notifications : user.preferences.notifications || true,
    };

    try {
      await user.save();
      res.status(200).json(user.preferences);
    } catch (saveError) {
      //console.error('Error saving user preferences:', saveError);
      if (saveError.name === 'ValidationError') {
        // Handle validation errors specifically
        const validationErrors = Object.values(saveError.errors).map(err => err.message);
        return res.status(400).json({
          message: 'Validation error',
          errors: validationErrors,
        });
      } else {
        return res.status(500).json({
          message: 'Failed to update preferences',
          error: saveError.message,
        });
      }
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 * @route POST /api/users/delete-account
 * @access Private
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Verify password if provided
    if (password) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          message: 'Invalid password',
        });
      }
    }

    // Delete all data related to this user
    // 1. Delete any bills associated with this user
    if (mongoose.models.Bill) {
      await mongoose.models.Bill.deleteMany({ user: user._id });
      //console.log(`Deleted bills for user ${user._id}`);
    }

    // 2. Delete any payments associated with this user
    if (mongoose.models.Payment) {
      await mongoose.models.Payment.deleteMany({ user: user._id });
      //console.log(`Deleted payments for user ${user._id}`);
    }

    // 3. Delete any notifications associated with this user
    if (mongoose.models.Notification) {
      await mongoose.models.Notification.deleteMany({ user: user._id });
      //console.log(`Deleted notifications for user ${user._id}`);
    }

    // 4. Finally delete the user account
    await User.findByIdAndDelete(user._id);
    //console.log(`User account ${user._id} has been deleted`);

    res.status(200).json({
      message: 'Account successfully deleted',
    });
  } catch (error) {
    //console.error('Error deleting account:', error);
    next(error);
  }
};

/**
 * Search users by username
 * @route GET /api/users/search
 * @access Private
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ message: 'Search term is required' });
    }

    // Find users with username or fullName that contain the search term (case insensitive)
    const users = await User.find({
      $or: [
        { username: { $regex: username, $options: 'i' } },
        { fullName: { $regex: username, $options: 'i' } },
      ],
      _id: { $ne: req.user.id }, // Exclude the current user
    }).select('_id username fullName email avatar');

    res.status(200).json({
      users,
    });
  } catch (error) {
    //console.error('Error searching users:', error);
    next(error);
  }
};
