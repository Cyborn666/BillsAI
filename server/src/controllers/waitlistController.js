const Waitlist = require('../models/waitlistModel');
const User = require('../models/userModel');

/**
 * Controller for Waitlist functionality
 */

// Add user to waitlist
exports.addToWaitlist = async (req, res, next) => {
  try {
    //console.log('Received waitlist submission:', JSON.stringify(req.body));
    const { firstName, lastName, email, phone, reason, userId, Address } = req.body;

    if (!firstName || !lastName || !email) {
      //console.error('Missing required fields:', { firstName, lastName, email });
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
      });
    }

    // Check if email already exists
    const existingEntry = await Waitlist.findOne({ email });
    //console.log('Existing entry check:', existingEntry ? 'Found existing entry' : 'No existing entry');
    
    if (existingEntry) {
      return res.status(400).json({
        status: 'error',
        message: 'This email is already on our waitlist',
      });
    }

    // Create waitlist entry
    //console.log('Creating waitlist entry with data:', { firstName, lastName, email, phone, reason, userId});
    const waitlistEntry = await Waitlist.create({
      firstName,
      lastName,
      email,
      phone,
      reason,
      userId,
      Address,
    });

    //console.log('Waitlist entry created successfully:', waitlistEntry);
    res.status(201).json({
      status: 'success',
      data: {
        waitlist: waitlistEntry,
      },
    });
  } catch (error) {
    //console.error('Error adding to waitlist:', error.message);
    //console.error('Full error stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while adding to waitlist',
    });
  }
};

// Get waitlist entry by ID (for admin or to verify status)
exports.getWaitlistEntry = async (req, res, next) => {
  try {
    const entry = await Waitlist.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        status: 'error',
        message: 'No waitlist entry found with that ID',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        waitlist: entry,
      },
    });
  } catch (error) {
    //console.error('Error getting waitlist entry:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving waitlist entry',
    });
  }
};

// Get all waitlist entries (admin only)
exports.getAllWaitlistEntries = async (req, res, next) => {
  try {
    // Basic filtering
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Query with filters
    const query = Waitlist.find(queryObj);

    // Execute query
    const waitlist = await query;

    res.status(200).json({
      status: 'success',
      results: waitlist.length,
      data: {
        waitlist,
      },
    });
  } catch (error) {
    //console.error('Error getting all waitlist entries:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving waitlist entries',
    });
  }
};

// Update waitlist entry status (admin only)
exports.updateWaitlistStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['pending', 'approved', 'invited'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status value',
      });
    }

    const entry = await Waitlist.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!entry) {
      return res.status(404).json({
        status: 'error',
        message: 'No waitlist entry found with that ID',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        waitlist: entry,
      },
    });
  } catch (error) {
    //console.error('Error updating waitlist status:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating waitlist status',
    });
  }
};

// Check if email exists on waitlist
exports.checkWaitlistStatus = async (req, res, next) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    const entry = await Waitlist.findOne({ email: email.toLowerCase() });

    if (!entry) {
      return res.status(200).json({
        status: 'success',
        exists: false,
        data: null,
      });
    }

    res.status(200).json({
      status: 'success',
      exists: true,
      data: {
        status: entry.status,
        createdAt: entry.createdAt,
      },
    });
  } catch (error) {
    //console.error('Error checking waitlist status:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while checking waitlist status',
    });
  }
};
