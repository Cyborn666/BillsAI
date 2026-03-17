/**
 * Authentication Middleware
 */
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const BusinessUser = require('../models/businessUserModel');

/**
 * Protect routes - Verify JWT token
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        message: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user still exists - check appropriate model based on role
      let user;
      if (decoded.accountType === 'business') {
        user = await BusinessUser.findById(decoded.id);
      } else {
        user = await User.findById(decoded.id);
      }

      if (!user) {
        return res.status(401).json({
          message: 'User no longer exists',
        });
      }

      // Add user to request object
      req.user = {
        id: decoded.id,
        email: decoded.email,
        accountType: decoded.accountType,
      };



      next();
    } catch (err) {
      return res.status(401).json({
        message: 'Not authorized to access this route',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize specific roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

/**
 * Admin middleware - Check if user has admin role
 */
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      message: 'Admin access required for this operation',
    });
  }
};
