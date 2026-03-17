/**
 * Free Resource Limit Middleware
 * Simple middleware to check if a free user has reached their resource limits
 */
const BusinessSubscription = require('../models/businessSubscription');
const BusinessBill = require('../models/businessBillModel');
const BusinessInvoice = require('../models/businessInvoiceModel');
const BusinessDailyReport = require('../models/businessDailyReportModel');
const Expense = require('../models/expenseModel');

// Free plan resource limits
const FREE_PLAN_LIMITS = {
  bills: 5,
  invoices: 5,
  reports: 5,
  expenses: 5
};

/**
 * Check if a free user has reached their resource limit for a specific resource type
 * @param {string} resourceType - Type of resource (bills, invoices, reports, expenses)
 */
const checkFreeResourceLimit = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Check if user is on premium plan
      const subscription = await BusinessSubscription.findOne({ businessId: userId });
      if (subscription && subscription.planId === 'premium' && subscription.status === 'active') {
        // Premium users have no limits
        return next();
      }
      
      // For free users, check resource count
      let count = 0;
      
      switch(resourceType) {
        case 'bills':
          count = await BusinessBill.countDocuments({ user: userId });
          break;
          
        case 'invoices':
          count = await BusinessInvoice.countDocuments({ userId: userId });
          break;
          
        case 'reports':
          count = await BusinessDailyReport.countDocuments({ businessUser: userId });
          break;
          
        case 'expenses':
          // Check for expenses where either user or businessUser matches the userId
          count = await Expense.countDocuments({
            $or: [
              { user: userId },
              { businessUser: userId },
            ],
          });
          break;
          
        default:
          return res.status(400).json({ message: 'Invalid resource type' });
      }
      
      const limit = FREE_PLAN_LIMITS[resourceType];
      
      // If user has reached their limit, prevent creation
      if (count >= limit) {
        return res.status(403).json({
          message: `You've reached your limit of ${limit} ${resourceType} on the free plan.`,
          details: `Upgrade to premium for unlimited ${resourceType} and additional features.`,
          actionRequired: true,
          action: 'upgrade',
          limit,
          count,
          upgrade: true
        });
      }
      
      // User hasn't reached their limit, proceed
      next();
    } catch (error) {
      //console.error(`Error in free resource limit middleware: ${error}`);
      res.status(500).json({ message: 'Server error checking resource limits' });
    }
  };
};

module.exports = { checkFreeResourceLimit };
