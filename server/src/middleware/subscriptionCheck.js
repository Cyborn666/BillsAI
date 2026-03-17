/**
 * Subscription Check Middleware
 * Validates if user has access to requested features based on their subscription
 */
const { getUserSubscription } = require('../services/subscriptionService');

// Feature requirements map - based on user specifications
const featureRequirements = {
  // Free tier features (limited to 5 each)
  'reports_access': 'free',            // Access to reports (limited to 5)
  'invoices_access': 'free',           // Access to invoices (limited to 5)
  'bills_access': 'free',              // Access to bills (limited to 5)
  'expenses_access': 'free',           // Access to expenses (limited to 5)
  
  // Premium tier features
  'unlimited_invoices': 'premium',      // Unlimited invoices
  'unlimited_bills': 'premium',        // Unlimited bills
  'unlimited_expenses': 'premium',     // Unlimited expenses
  'unlimited_reports': 'premium',      // Unlimited reports
  'analytics_access': 'premium',       // Access to analytics tab
  'invoice_generator': 'premium',      // Invoice generator feature
  'customer_support': 'premium',       // Priority customer support
  'custom_templates': 'premium',       // Custom invoice templates
  'sales_insights': 'premium'          // Sales insights
};

// Plan tier levels for comparison
const planTiers = {
  'free': 0,
  'premium': 1
};

/**
 * Check if user has access to a specific feature
 * @param {string} featureId - The feature to check access for
 */
const checkFeatureAccess = async (req, res, next) => {
  try {
    const { user } = req;
    const { featureId } = req.params;
    
    if (!user || !user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this feature.'
      });
    }
    
    // Get user's current subscription
    const subscription = await getUserSubscription(user.id);
    
    // If no subscription found, user is on free plan
    const planName = subscription?.plan?.name?.toLowerCase() || 'free';
    
    // Get required tier level for the feature
    const requiredFeature = featureRequirements[featureId];
    
    // If feature doesn't exist in our requirements map, default to free
    if (!requiredFeature) {
      return next();
    }
    
    // Get numeric tier levels for comparison
    const userTierLevel = planTiers[planName];
    const requiredTierLevel = planTiers[requiredFeature];
    
    // Check if user's tier level is sufficient
    if (userTierLevel >= requiredTierLevel) {
      return next(); // User has access to this feature
    } else {
      // User doesn't have required plan, send appropriate response
      return res.status(403).json({
        error: 'Subscription required',
        message: `This feature requires a ${requiredFeature} plan or higher.`,
        requiredPlan: requiredFeature,
        currentPlan: planName
      });
    }
  } catch (error) {
    //console.error('Error in subscription check middleware:', error);
    next(error);
  }
};

/**
 * Check if user has exceeded usage limits for a feature
 * @param {string} featureType - The type of feature to check limits for
 */
const checkUsageLimits = async (req, res, next) => {
  try {
    const { user } = req;
    const { featureType } = req.params;
    
    if (!user || !user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this feature.'
      });
    }
    
    // Get user's current subscription
    const subscription = await getUserSubscription(user.id);
    const planName = subscription?.plan?.name?.toLowerCase() || 'free';
    
    // Define usage limits based on exact user specifications
    const usageLimits = {
      'daily_reports': {
        'free': 5,            // 5 daily reports for Free
        'premium': Infinity   // Unlimited for Premium
      },
      'invoices': {
        'free': 5,            // 5 invoices for Free
        'premium': Infinity   // Unlimited for Premium
      },
      'bills': {
        'free': 5,            // 5 bills for Free
        'premium': Infinity   // Unlimited for Premium
      },
      'expenses': {
        'free': 5,            // 5 expenses for Free
        'premium': Infinity   // Unlimited for Premium
      }
    };
    
    // If feature doesn't have limits or isn't tracked, proceed
    if (!usageLimits[featureType]) {
      return next();
    }
    
    // Get the user's limit for this feature
    const userLimit = usageLimits[featureType][planName] || 0;
    
    // If user has unlimited access, proceed
    if (userLimit === Infinity) {
      return next();
    }
    
    // Get current usage for the feature
    const currentUsage = await getUserUsage(user.id, featureType);
    
    // Check if user has exceeded their limit
    if (currentUsage >= userLimit) {
      return res.status(403).json({
        error: 'Usage limit exceeded',
        message: `You have reached your ${featureType} limit for your ${planName} plan.`,
        limit: userLimit,
        usage: currentUsage,
        upgrade: true
      });
    }
    
    // User is within limits, proceed
    req.usageLimit = {
      current: currentUsage,
      limit: userLimit,
      remaining: userLimit - currentUsage
    };
    
    return next();
  } catch (error) {
    //console.error('Error in usage limit check middleware:', error);
    next(error);
  }
};

// Query database to get actual usage for the specified feature type
const getUserUsage = async (userId, featureType) => {
  try {
    let count = 0;
    
    // Determine which collection to query based on feature type
    switch(featureType) {
      case 'bills':
        // Query the business bills collection
        const BusinessBill = require('../models/businessBillModel');
        count = await BusinessBill.countDocuments({ user: userId });
        break;
        
      case 'invoices':
        // Query the business invoices collection
        const BusinessInvoice = require('../models/businessInvoiceModel');
        count = await BusinessInvoice.countDocuments({ userId });
        break;
        
      case 'expenses':
        // Query the business expenses collection
        // Assuming there's a BusinessExpense model
        const BusinessExpense = require('../models/businessExpenseModel');
        count = await BusinessExpense.countDocuments({ user: userId });
        break;
        
      case 'daily_reports':
        // Query the business reports collection
        const BusinessDailyReport = require('../models/businessDailyReportModel');
        count = await BusinessDailyReport.countDocuments({ userId });
        break;
        
      default:
        count = 0;
    }
    
    return count;
  } catch (error) {
    //console.error(`Error getting usage for ${featureType}:`, error);
    return 0; // Default to 0 in case of error
  }
};

module.exports = {
  checkFeatureAccess,
  checkUsageLimits
};
