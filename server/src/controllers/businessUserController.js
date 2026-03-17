/**
 * Business User Controller
 */
const BusinessUser = require('../models/businessUserModel');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

/**
 * Get business user profile
 * @route GET /api/business/profile
 * @access Private
 */
exports.getBusinessUserProfile = async (req, res, next) => {
  try {
    const businessUser = await BusinessUser.findById(req.user.id);

    if (!businessUser) {
      return res.status(404).json({
        message: 'Business user not found',
      });
    }

    res.status(200).json({
      businessUser: {
        id: businessUser._id,
        email: businessUser.email,
        businessName: businessUser.businessName,
        businessEmail: businessUser.businessEmail,
        ownerName: businessUser.ownerName,
        taxId: businessUser.taxId,
        businessType: businessUser.businessType,
        industry: businessUser.industry,
        address: businessUser.address,
        phone: businessUser.phone,
        foundedDate: businessUser.foundedDate,
        employeeCount: businessUser.employeeCount,
        annualRevenue: businessUser.annualRevenue,
        bankAccountInfo: businessUser.bankAccountInfo,
        businessDescription: businessUser.businessDescription,
        isProfileLocked: businessUser.isProfileLocked,
        profileCompleted: businessUser.profileCompleted,
        createdAt: businessUser.createdAt,
        updatedAt: businessUser.updatedAt,
        profileImage: businessUser.profileImage,
        avatarId: businessUser.avatarId,
        subscriptionTier: businessUser.subscriptionTier,
        subscriptionExpiry: businessUser.subscriptionExpiry,
      },
    });
  } catch (error) {
    //console.error('Error getting business user profile:', error);
    next(error);
  }
};

/**
 * Update business user profile
 * @route PUT /api/business/profile
 * @access Private
 */
exports.updateBusinessUserProfile = async (req, res, next) => {
  try {
    const { 
      businessName, 
      businessEmail, 
      ownerName, 
      taxId, 
      businessType, 
      industry, 
      address, 
      phone, 
      foundedDate, 
      employeeCount, 
      annualRevenue, 
      bankAccountInfo, 
      businessDescription,
      avatarId,
    } = req.body;

    const businessUser = await BusinessUser.findById(req.user.id);

    if (!businessUser) {
      return res.status(404).json({
        message: 'Business user not found',
      });
    }

    // Update fields
    if (businessName) {
      businessUser.businessName = businessName;
    }
    if (businessEmail) {
      businessUser.businessEmail = businessEmail;
    }
    if (ownerName) {
      businessUser.ownerName = ownerName;
    }
    if (taxId) {
      businessUser.taxId = taxId;
    }
    if (businessType) {
      businessUser.businessType = businessType;
    }
    if (industry) {
      businessUser.industry = industry;
    }
    if (address) {
      businessUser.address = address;
    }
    if (phone) {
      businessUser.phone = phone;
    }
    if (foundedDate) {
      businessUser.foundedDate = foundedDate;
    }
    if (employeeCount) {
      businessUser.employeeCount = employeeCount;
    }
    if (annualRevenue) {
      businessUser.annualRevenue = annualRevenue;
    }
    if (bankAccountInfo) {
      businessUser.bankAccountInfo = bankAccountInfo;
    }
    if (businessDescription) {
      businessUser.businessDescription = businessDescription;
    }
    
    // Update avatarId if provided
    if (avatarId !== undefined) {
      businessUser.avatarId = avatarId;
    }

    // Save updated business user
    const updatedBusinessUser = await businessUser.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      businessUser: {
        id: updatedBusinessUser._id,
        email: updatedBusinessUser.email,
        businessName: updatedBusinessUser.businessName,
        businessEmail: updatedBusinessUser.businessEmail,
        ownerName: updatedBusinessUser.ownerName,
        taxId: updatedBusinessUser.taxId,
        businessType: updatedBusinessUser.businessType,
        industry: updatedBusinessUser.industry,
        address: updatedBusinessUser.address,
        phone: updatedBusinessUser.phone,
        foundedDate: updatedBusinessUser.foundedDate,
        employeeCount: updatedBusinessUser.employeeCount,
        annualRevenue: updatedBusinessUser.annualRevenue,
        bankAccountInfo: updatedBusinessUser.bankAccountInfo,
        businessDescription: updatedBusinessUser.businessDescription,
        isProfileLocked: updatedBusinessUser.isProfileLocked,
        profileCompleted: updatedBusinessUser.profileCompleted,
        createdAt: updatedBusinessUser.createdAt,
        updatedAt: updatedBusinessUser.updatedAt,
      },
    });
  } catch (error) {
    //console.error('Error updating business user profile:', error);
    next(error);
  }
};

/**
 * Delete business user
 * @route DELETE /api/business/profile
 * @access Private
 */
exports.deleteBusinessUser = async (req, res, next) => {
  try {
    const businessUser = await BusinessUser.findById(req.user.id);

    if (!businessUser) {
      return res.status(404).json({
        message: 'Business user not found',
      });
    }

    // Delete business user
    await businessUser.deleteOne();

    res.status(200).json({
      message: 'Business user deleted successfully',
    });
  } catch (error) {
    //console.error('Error deleting business user:', error);
    next(error);
  }
};

/**
 * Get business user notifications
 * @route GET /api/business/notifications
 * @access Private
 */
exports.getBusinessUserNotifications = async (req, res, next) => {
  try {
    const businessUser = await BusinessUser.findById(req.user.id);

    if (!businessUser) {
      return res.status(404).json({
        message: 'Business user not found',
      });
    }

    // Return notifications, creating defaults if they don't exist
    const notifications = businessUser.notifications || { pushEnabled: false, emailEnabled: false };

    res.status(200).json(notifications);
  } catch (error) {
    //console.error('Error getting business user notifications:', error);
    next(error);
  }
};


/**
 * Update business user notifications
 * @route PUT /api/business/notifications
 * @access Private
 */
exports.updateBusinessUserNotifications = async (req, res, next) => {
  try {
    const { pushEnabled, emailEnabled } = req.body;

    const businessUser = await BusinessUser.findById(req.user.id);

    if (!businessUser) {
      return res.status(404).json({
        message: 'Business user not found',
      });
    }

    // Update notification settings
    businessUser.notifications = {
      ...businessUser.notifications,
      pushEnabled: pushEnabled !== undefined ? pushEnabled : businessUser.notifications?.pushEnabled || false,
      emailEnabled: emailEnabled !== undefined ? emailEnabled : businessUser.notifications?.emailEnabled || false,
    };

    await businessUser.save();

    res.status(200).json(businessUser.notifications);
  } catch (error) {
    //console.error('Error updating business user notifications:', error);
    next(error);
  }
};

/**
 * Get business user preferences
 * @route GET /api/business/preferences
 * @access Private
 */
exports.getBusinessUserPreferences = async (req, res, next) => {
  try {
    const businessUser = await BusinessUser.findById(req.user.id);

    if (!businessUser) {
      return res.status(404).json({
        message: 'Business user not found',
      });
    }

    // Return preferences, creating defaults if they don't exist
    const preferences = businessUser.preferences || { currency: 'USD ($)', language: 'English', darkMode: false, notifications: true };

    res.status(200).json(preferences);
  } catch (error) {
    //console.error('Error getting business user preferences:', error);
    next(error);
  }
};

/**
 * Update business user preferences
 * @route PUT /api/business/preferences
 * @access Private
 */
exports.updateBusinessUserPreferences = async (req, res, next) => {
  try {
    const { currency, language, darkMode, notifications } = req.body;

    const businessUser = await BusinessUser.findById(req.user.id);

    if (!businessUser) {
      return res.status(404).json({
        message: 'Business user not found',
      });
    }

    // Initialize preferences if not exist
    if (!businessUser.preferences) {
      businessUser.preferences = {};
    }

    // Update preferences with new values, keeping existing ones if not provided
    businessUser.preferences = {
      ...businessUser.preferences,
      currency: currency !== undefined ? currency : businessUser.preferences.currency || 'USD ($)',
      language: language !== undefined ? language : businessUser.preferences.language || 'English',
      darkMode: darkMode !== undefined ? darkMode : businessUser.preferences.darkMode || false,
      notifications: notifications !== undefined ? notifications : businessUser.preferences.notifications || true,
    };

    try {
      await businessUser.save();
      res.status(200).json(businessUser.preferences);
    } catch (saveError) {
      //console.error('Error saving business user preferences:', saveError);
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
 * Delete business user
 * @route DELETE /api/business/profile
 * @access Private
 */
exports.deleteBusinessUser = async (req, res, next) => {
  try {
    const businessUser = await BusinessUser.findById(req.user.id);

    if (!businessUser) {
      return res.status(404).json({
        message: 'Business user not found',
      });
    }

    // Delete business user
    await businessUser.deleteOne();

    res.status(200).json({
      message: 'Business user deleted successfully',
    });
  } catch (error) {
    //console.error('Error deleting business user:', error);
    next(error);
  }
};



