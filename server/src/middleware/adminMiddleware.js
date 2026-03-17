/**
 * Admin Middleware
 * Verifies user has admin privileges
 */

/**
 * Admin check middleware - Verifies the user has admin role
 */
module.exports = (req, res, next) => {
  try {
    // User should be attached to request from the auth middleware
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized. Admin access required',
      });
    }

    // If user is admin, proceed
    next();
  } catch (error) {
    //console.error('Admin middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error in admin verification',
    });
  }
};
