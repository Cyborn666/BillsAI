/**
 * Business Subscription Controller
 * Handles all business subscription-related requests
 */
const BusinessUser = require('../models/businessUserModel');
const BusinessSubscription = require('../models/businessSubscription');
// Stripe integration for payment processing
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Ensure Stripe secret key is provided
if (!process.env.STRIPE_SECRET_KEY) {
  //console.error('WARNING: Missing STRIPE_SECRET_KEY environment variable');
}
const { handleApiError } = require('../utils/errorHandlers');

// Business Plan configuration
const BUSINESS_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceId: null, // No Stripe price ID for free plan
    features: {
      maxInvoices: 5,        // Limit of 5 invoices for free plan
      maxBills: 5,           // Limit of 5 bills for free plan
      maxReports: 5,         // Limit of 5 reports for free plan
      maxExpenses: 5,        // Limit of 5 expenses for free plan
      advancedReporting: false,
      prioritySupport: false,
      customTemplates: false,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID, // Use environment variable for price ID
    features: {
      maxInvoices: -1,       // Unlimited
      maxBills: -1,          // Unlimited
      maxReports: -1,        // Unlimited
      maxExpenses: -1,       // Unlimited
      advancedReporting: true,
      prioritySupport: true,
      customTemplates: true, // Premium includes all features
    },
  },
};

/**
 * Get current business's subscription details
 */
exports.getCurrentBusinessSubscription = async (req, res) => {
  try {
    const businessId = req.user.id;
    
    // Find subscription in our database
    const subscription = await BusinessSubscription.findOne({ businessId });
    
    if (!subscription) {
      // Return free plan details if no subscription
      return res.status(200).json({
        id: null,
        planId: 'free',
        status: 'active',
        currentPeriodEnd: null,
        plan: BUSINESS_PLANS.free,
      });
    }
    
    // If subscription exists, return details
    return res.status(200).json({
      id: subscription._id,
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      plan: BUSINESS_PLANS[subscription.planId],
    });
  } catch (error) {
    return handleApiError(res, error);
  }
};

/**
 * Create a new business subscription
 */
exports.createBusinessSubscription = async (req, res) => {
  let subscriptionData;
  try {
    const businessId = req.user.id;
    const { planId, setupIntent, setupIntentCompleted } = req.body;

    // Validate plan selection
    if (!BUSINESS_PLANS[planId]) {
      return res.status(400).json({ message: 'Invalid plan selection' });
    }
    
    // Validate Stripe configuration for premium plans
    if (planId === 'premium' && !process.env.STRIPE_PREMIUM_PRICE_ID) {
      //console.error('Missing STRIPE_PREMIUM_PRICE_ID environment variable');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    // Check if business already has a subscription (only for actual subscriptions, not setup intents)
    if (!setupIntent && !setupIntentCompleted) {
      const existingSubscription = await BusinessSubscription.findOne({ businessId });
      if (existingSubscription) {
        return res.status(400).json({ 
          message: 'Subscription already exists. Use update endpoint to change plans.',
          subscriptionId: existingSubscription._id
        });
      }
    }
    
    // Create subscription or setup intent in Stripe for premium plan
    if (planId === 'premium') {
      // Find business user to get customer details
      const businessUser = await BusinessUser.findById(businessId);
      if (!businessUser) {
        return res.status(404).json({ message: 'Business user not found' });
      }
      
      try {
        // Create or retrieve a Stripe customer
        //console.log(`Looking up customer for business ${businessId} with email ${businessUser.email}`);
        let stripeCustomerId = businessUser.stripeCustomerId;
        let existingCustomer = null;

        // Step 1: Check if we have a valid stripeCustomerId in our database
        if (stripeCustomerId) {
          //console.log(`Found existing Stripe customer ID in database: ${stripeCustomerId}`);
          
          // Verify the customer still exists in Stripe
          try {
            existingCustomer = await stripe.customers.retrieve(stripeCustomerId);
            //console.log(`Successfully retrieved customer from Stripe: ${existingCustomer.id}`);
          } catch (stripeError) {
            //console.log(`Error retrieving customer from Stripe: ${stripeError.message}`);
            // If customer doesn't exist in Stripe, we'll look it up by email
            if (stripeError.code === 'resource_missing') {
              stripeCustomerId = null;
            } else {
              throw stripeError;
            }
          }
        }
        
        // Step 2: If no valid customer ID in our database, search by email
        if (!stripeCustomerId && businessUser.email) {
          //console.log(`Looking up customer by email: ${businessUser.email}`);
          try {
            const customers = await stripe.customers.list({
              email: businessUser.email,
              limit: 1,
            });
            
            if (customers.data.length > 0) {
              existingCustomer = customers.data[0];
              stripeCustomerId = existingCustomer.id;
              //console.log(`Found existing customer by email: ${stripeCustomerId}`);
            }
          } catch (listError) {
            //console.log(`Error listing customers by email: ${listError.message}`);
          }
        }
        
        // Step 3: Create a new Stripe customer if needed
        if (!stripeCustomerId) {
          //console.log('Creating new Stripe customer...');
          const customer = await stripe.customers.create({
            email: businessUser.email,
            name: businessUser.name || `Business ${businessUser._id}`,
            metadata: {
              businessId: businessId,
            },
          });
          
          stripeCustomerId = customer.id;
          //console.log(`Created new Stripe customer: ${stripeCustomerId}`);
        }
        
        // Step 4: Save the Stripe customer ID to our database if it changed
        if (businessUser.stripeCustomerId !== stripeCustomerId) {
          //console.log(`Updating business user with Stripe customer ID: ${stripeCustomerId}`);
          businessUser.stripeCustomerId = stripeCustomerId;
          await businessUser.save();
        }
        
        // If this is a setup intent request, we'll create one without subscription
        if (req.body.setupIntent) {
          try {
            // Create a SetupIntent for subscription
            //console.log(`Creating setup intent for business ${businessId} with customer ${stripeCustomerId}`);
            
            // Create an ephemeral key for the customer
            const ephemeralKey = await stripe.ephemeralKeys.create(
              { customer: stripeCustomerId },
              { apiVersion: '2025-03-31.basil' }
            );
            //console.log('Created ephemeral key');
            
            //console.log('Creating setup intent for plan', planId);
            const setupIntent = await stripe.setupIntents.create({
              customer: stripeCustomerId,
              payment_method_types: ['card'],
              usage: 'off_session', // Enable future off-session payments (important for subscriptions)
              metadata: {
                businessId: businessId,
                planId: planId,
                setupFlow: 'true',
              },
            });
            //console.log(`Created setup intent: ${setupIntent.id}`);

            // Return the data needed for PaymentSheet initialization
            return res.status(200).json({
              clientSecret: setupIntent.client_secret,
              ephemeralKey: ephemeralKey.secret,
              customer: stripeCustomerId,
            });
          } catch (setupError) {
            //console.error('Error creating setup intent:', setupError);
            return res.status(400).json({ error: setupError.message });
          }
        }
          
        // If this is a completed setup intent from PaymentSheet, we'll continue with subscription creation
        if (setupIntentCompleted) {
          //console.log('Processing completed setup intent for customer:', stripeCustomerId);
          try {
            // Get the customer's recently added payment methods
            const paymentMethods = await stripe.paymentMethods.list({
              customer: stripeCustomerId,
              limit: 3, // Get the last few payment methods
            });

            //console.log('Retrieved payment methods:', paymentMethods);

            // Filter to find card payment methods
            const cardPaymentMethods = paymentMethods.data.filter(pm => pm.type === 'card');

            if (cardPaymentMethods.length === 0) {
              //console.error('No card payment methods found for customer after setup intent completion');
              return res.status(400).json({ error: 'No payment method found. Please try again.' });
            }

            // Use the most recently added card payment method
            const paymentMethodId = cardPaymentMethods[0].id;
            //console.log('Found payment method from setup intent:', paymentMethodId);

            // Set as default payment method
            await stripe.customers.update(stripeCustomerId, {
              invoice_settings: {
                default_payment_method: paymentMethodId,
              },
            });
            
            //console.log('Default payment method updated successfully');
            req.body.paymentMethodId = paymentMethodId;
          } catch (setupIntentError) {
            //console.error('Error processing setup intent completion:', setupIntentError);
            return res.status(400).json({ error: 'Could not process payment information. Please try again.' });
          }
        }
          
        // Check if payment method is provided from the frontend for direct payment
        try {
          // Check if payment method is provided from the frontend
          const paymentMethodFromRequest = req.body.paymentMethodId;
          
          if (paymentMethodFromRequest) {
            //console.log('Processing payment method:', paymentMethodFromRequest);
            //console.log('Customer ID for attachment:', stripeCustomerId);
            
            try {
              // Verify we have a valid customer ID
              if (!stripeCustomerId) {
                //console.error('Missing Stripe customer ID when attaching payment method');
                return res.status(400).json({ error: 'Missing customer ID for payment method attachment' });
              }
              
              // Attach the provided payment method to the customer
              await stripe.paymentMethods.attach(paymentMethodFromRequest, {
                customer: stripeCustomerId,
              });
              
              //console.log('Successfully attached payment method to customer');
              
              // Set as default payment method
              //console.log('Setting payment method as default for customer');
              await stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                  default_payment_method: paymentMethodFromRequest,
                },
              });
              
              //console.log('Default payment method updated successfully');
              
              //console.log(`Added payment method ${paymentMethodFromRequest} to customer ${stripeCustomerId}`);
            } catch (pmError) {
              //console.error('Error attaching payment method:', pmError);
              return res.status(400).json({
                error: 'Failed to process payment method: ' + pmError.message
              });
            }
          } else {
          // No payment method provided, add a test token in non-production environments
          if (process.env.NODE_ENV !== 'production') {
            await stripe.customers.update(stripeCustomerId, {
              source: 'tok_visa', // Special test token that represents a Visa card
            });
            
            //console.log(`Added test payment method to customer ${stripeCustomerId}`);
          }
        }
        } catch (error) {
          //console.error('Error handling payment method:', error.message);
          throw error; // We need this to succeed for subscriptions to work
        }

        // Create the subscription with the customer
        let subscription;
        try {
          // Create subscription with the price ID for Premium
          subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [
              {
                price: BUSINESS_PLANS.premium.priceId,
              },
            ],
            metadata: {
              businessId: businessId,
            },
            default_payment_method: req.body.paymentMethodId,
            // Only use default_incomplete when no payment method is provided
            payment_behavior: req.body.paymentMethodId ? 'default_incomplete' : 'default_incomplete',
            //expand: ['latest_invoice.payment_intent'], // Expand the invoice to get more details
            payment_settings: {
              save_default_payment_method: 'on_subscription',
              payment_method_types: ['card'],
            },
          });
          
          //console.log('Created subscription:', subscription.id);
          
          // Get the full subscription details to ensure we have all necessary data
          const retrievedSubscription = await stripe.subscriptions.retrieve(subscription.id, {
            expand: ['latest_invoice'],
          });
          //console.log('Retrieved full subscription details');
          
          // If the subscription is incomplete, try to pay the invoice to make it active immediately
          if (retrievedSubscription.status === 'incomplete' && retrievedSubscription.latest_invoice) {
            try {
              // Get the invoice ID
              const invoiceId = typeof retrievedSubscription.latest_invoice === 'string' 
                ? retrievedSubscription.latest_invoice 
                : retrievedSubscription.latest_invoice.id;
              
              //console.log('Attempting to pay invoice to activate subscription:', invoiceId);
              
                // Pay the invoice to activate the subscription
              const invoice = await stripe.invoices.pay(invoiceId);
              //console.log('Invoice payment result:', invoice.status);
              
              // Check both invoice status and payment intent status if available
              if (invoice.status === 'paid') {
                // Get payment intent to double-check its status
                if (invoice.payment_intent) {
                  const paymentIntentId = typeof invoice.payment_intent === 'string' 
                    ? invoice.payment_intent 
                    : invoice.payment_intent.id;
                  
                  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                  //console.log('Payment intent status:', paymentIntent.status);
                  
                  // If payment needs additional action, flag it for frontend handling
                  if (paymentIntent.status === 'requires_action') {
                    //console.log('Payment requires additional action');
                    // Store this so frontend can handle it if needed
                    // We'll continue but mark it for attention
                  }
                }
                
                // Update subscription regardless, to get latest status
                const updatedSubscription = await stripe.subscriptions.retrieve(subscription.id);
                //console.log('Subscription status after payment:', updatedSubscription.status);
                
                // Use the updated subscription data
                Object.assign(retrievedSubscription, updatedSubscription);
              }
            } catch (invoiceError) {
              //console.error('Error paying invoice to activate subscription:', invoiceError);
              // Continue with incomplete subscription - it will be charged automatically by Stripe
            }
          }
          
          // Process period dates for the subscription
          //console.log('Processing period dates for subscription');
          
          // First try to get period dates directly from the subscription
          let currentPeriodStart = retrievedSubscription.current_period_start;
          let currentPeriodEnd = retrievedSubscription.current_period_end;
          
          // Track additional IDs for debugging/support purposes
          let latestInvoiceId = null;
          let paymentIntentId = null;
          
          // If period dates aren't available directly, try to get them from invoice
          if (retrievedSubscription.latest_invoice) {
            // Store the latest invoice ID 
            latestInvoiceId = typeof retrievedSubscription.latest_invoice === 'string' 
              ? retrievedSubscription.latest_invoice 
              : retrievedSubscription.latest_invoice.id;
          
            if (!currentPeriodStart || !currentPeriodEnd) {
              //console.log('Retrieving invoice to get period dates');
              try {
                //console.log('Retrieving invoice with ID:', latestInvoiceId);
                // First retrieve without expand to check if payment_intent exists
                const invoiceBasic = await stripe.invoices.retrieve(latestInvoiceId);
                
                // Then retrieve with appropriate expand parameters
                const invoice = await stripe.invoices.retrieve(latestInvoiceId, {
                  expand: ['lines', ...(invoiceBasic.payment_intent ? ['payment_intent'] : [])]
                });
                
                // Store payment intent ID if available
                if (invoice.payment_intent) {
                  paymentIntentId = typeof invoice.payment_intent === 'string'
                    ? invoice.payment_intent
                    : invoice.payment_intent.id;
                }
                
                if (invoice.lines && invoice.lines.data && invoice.lines.data.length > 0) {
                  const subscriptionItem = invoice.lines.data.find(line => line.type === 'subscription');
                  if (subscriptionItem && subscriptionItem.period) {
                    //console.log('Found subscription period in invoice lines');
                    currentPeriodStart = subscriptionItem.period.start;
                    currentPeriodEnd = subscriptionItem.period.end;
                  }
                }
              } catch (invoiceError) {
                //console.error('Error retrieving invoice:', invoiceError);
              }
            }
          }
          
          // If still not available, use current date + 30 days as fallback
          if (!currentPeriodStart || !currentPeriodEnd) {
            //console.log('Using current date as fallback for period dates');
            currentPeriodStart = Math.floor(Date.now() / 1000);
            currentPeriodEnd = currentPeriodStart + (30 * 24 * 60 * 60); // 30 days in seconds
          }
          
          
          // Prepare subscription data for database
          subscriptionData = {
            businessId,
            planId,
            stripeCustomerId,
            stripeSubscriptionId: retrievedSubscription.id,
            status: retrievedSubscription.status,
            cancelAtPeriodEnd: retrievedSubscription.cancel_at_period_end || false,
            latestInvoiceId, // Save for later debugging/support
            paymentIntentId,  // Save for later debugging/support
          };
          
          // Convert timestamps to Date objects for MongoDB
          if (currentPeriodStart) {
            subscriptionData.currentPeriodStart = new Date(currentPeriodStart * 1000);
          }
          
          if (currentPeriodEnd) {
            subscriptionData.currentPeriodEnd = new Date(currentPeriodEnd * 1000);
          }
        } catch (error) {
          //console.error('Error creating subscription:', error);
          return res.status(400).json({
            error: 'Failed to create subscription: ' + error.message
          });
        }
        
        try {
          // Create the subscription in our database
          const newSubscription = await BusinessSubscription.create(subscriptionData);
          //console.log('Created business subscription in database:', newSubscription._id);
          
          // Get the persisted subscription to return in the response
          const persistedSubscription = await BusinessSubscription.findOne({
            businessId,
            stripeSubscriptionId: subscription.id
          });
        
          // Return the subscription with plan details
          const subscriptionResponse = {
            ...persistedSubscription.toObject(),
            plan: BUSINESS_PLANS[planId]
          };

          // Explicitly include period dates for client-side display
          if (subscription.current_period_start) {
            subscriptionResponse.currentPeriodStart = new Date(subscription.current_period_start * 1000);
          }
          if (subscription.current_period_end) {
            subscriptionResponse.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          }
          
          return res.status(201).json(subscriptionResponse);
        } catch (subCreateError) {
          //console.error('Error in subscription creation:', subCreateError);
          return res.status(400).json({
            error: 'Failed to create subscription record: ' + subCreateError.message
          });
        }
      } catch (stripeError) {
        //console.error('Stripe error:', stripeError);
        return res.status(400).json({ 
          message: 'Payment processing error',
          error: stripeError.message
        });
      }
    }
    
    try {
      // For free plan, just create a record in our database with null Stripe IDs
      const newSubscription = await BusinessSubscription.create({
        businessId,
        planId: 'free',
        status: 'active',
      });
      
      // Return the subscription with plan details
      return res.status(201).json({
        ...newSubscription.toObject(),
        plan: BUSINESS_PLANS.free
      });
    } catch (freeSubError) {
      //console.error('Error creating free subscription:', freeSubError);
      return res.status(400).json({
        error: 'Failed to create free subscription: ' + freeSubError.message
      });
    }
  } catch (error) {
    return handleApiError(res, error, 'Error creating subscription');
  }
};

/**
 * Toggle subscription auto-renewal setting
 */
exports.toggleAutoRenewal = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { autoRenewal } = req.body; // true to enable, false to disable
    const businessId = req.user.id;
    
    // Find subscription
    const subscription = await BusinessSubscription.findOne({
      _id: subscriptionId,
      businessId,
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Only premium subscriptions can have auto-renewal toggled
    if (subscription.planId !== 'premium') {
      return res.status(400).json({ message: 'Auto-renewal can only be toggled for premium subscriptions' });
    }
    
    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No Stripe subscription found' });
    }
    
    // Update the subscription in Stripe
    // Set cancel_at_period_end to the OPPOSITE of autoRenewal
    // (false = will auto-renew, true = will not auto-renew)
    const updatedStripeSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: !autoRenewal,
    });
    
    //console.log(`Updated Stripe subscription ${updatedStripeSubscription.id} auto-renewal status: ${!updatedStripeSubscription.cancel_at_period_end}`);
    
    // Update our database with the new setting
    const updatedSubscription = await BusinessSubscription.findByIdAndUpdate(
      subscriptionId,
      { 
        cancelAtPeriodEnd: updatedStripeSubscription.cancel_at_period_end,
        // Also update the current period dates if available
        ...(updatedStripeSubscription.current_period_start ? { currentPeriodStart: new Date(updatedStripeSubscription.current_period_start * 1000) } : {}),
        ...(updatedStripeSubscription.current_period_end ? { currentPeriodEnd: new Date(updatedStripeSubscription.current_period_end * 1000) } : {})
      },
      { new: true }
    );
    
    //console.log(`Updated database subscription ${updatedSubscription._id} cancelAtPeriodEnd: ${updatedSubscription.cancelAtPeriodEnd}`);
    
    // Return the updated subscription
    return res.status(200).json({
      ...updatedSubscription.toObject(),
      plan: BUSINESS_PLANS[updatedSubscription.planId],
      // Explicitly include auto-renewal status in the response
      autoRenewal: !updatedSubscription.cancelAtPeriodEnd
    });
  } catch (error) {
    return handleApiError(res, error, 'Error updating auto-renewal setting');
  }
};

/**
 * Update an existing business subscription
 */
exports.updateBusinessSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { planId } = req.body;
    const businessId = req.user.id;
    
    // Validate plan
    if (!BUSINESS_PLANS[planId]) {
      return res.status(400).json({ message: 'Invalid plan selection' });
    }
    
    // Allow both upgrades and downgrades between valid plans
    
    // Find subscription
    const subscription = await BusinessSubscription.findOne({
      _id: subscriptionId,
      businessId,
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Handle downgrade from premium to free
    if (subscription.planId === 'premium' && planId === 'free') {
      // Don't change planId immediately - use cancel at period end
      if (subscription.stripeSubscriptionId) {
        // Cancel the subscription in Stripe at period end
        const stripeSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        
        // Get the current period end from Stripe and convert timestamp to Date
        if (stripeSubscription.current_period_end) {
          const endDate = new Date(stripeSubscription.current_period_end * 1000);
          subscription.currentPeriodEnd = endDate;
          
          // Set description for downgrade
          subscription.description = `Premium plan will downgrade to Free on ${endDate.toLocaleDateString()}`;
        }
      }
      
      // Mark for cancellation but keep premium until period end
      subscription.cancelAtPeriodEnd = true;
      await subscription.save();
      
      return res.status(200).json({
        id: subscription._id,
        planId: subscription.planId, // Still 'premium'
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        plan: BUSINESS_PLANS[subscription.planId],
        cancelAtPeriodEnd: true
      });
    }
    
    // For other plan changes (e.g., free to premium)
    if (subscription.stripeSubscriptionId && planId === 'premium') {
      // If upgrading to premium, update the subscription in Stripe
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{
          id: subscription.stripeSubscriptionItemId || subscription.stripeSubscriptionId,
          price: BUSINESS_PLANS.premium.priceId,
        }],
        cancel_at_period_end: false, // Ensure any pending cancellations are removed
      });
    }
    
    // Update subscription in our database
    subscription.planId = planId;
    subscription.cancelAtPeriodEnd = false; // Reset cancellation flag for upgrades
    await subscription.save();
    
    return res.status(200).json({
      id: subscription._id,
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      plan: BUSINESS_PLANS[planId],
    });
  } catch (error) {
    return handleApiError(res, error);
  }
};

/**
 * Cancel business subscription
 */
exports.cancelBusinessSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const businessId = req.user.id;
    
    // Find subscription
    const subscription = await BusinessSubscription.findOne({
      _id: subscriptionId,
      businessId,
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Cancel the subscription in Stripe at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    
    // Update subscription status in our database
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();
    
    return res.status(200).json({
      id: subscription._id,
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: true,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
};

/**
 * Check if business has access to a feature
 */
exports.checkBusinessFeatureAccess = async (req, res) => {
  try {
    const { featureId } = req.params;
    const businessId = req.user.id;
    
    // Find subscription
    const subscription = await BusinessSubscription.findOne({ businessId });
    
    let planId = 'free';
    if (subscription && subscription.status === 'active') {
      planId = subscription.planId;
    }
    
    const plan = BUSINESS_PLANS[planId];
    
    // Check if feature exists in plan
    if (plan.features[featureId] === undefined) {
      return res.status(400).json({ message: 'Invalid feature' });
    }
    
    // If feature is a boolean type, just return the access status
    if (typeof plan.features[featureId] === 'boolean') {
      return res.status(200).json({
        hasAccess: plan.features[featureId],
      });
    }
    
    // For resource limits (maxInvoices, maxBills, etc.), check usage
    if (featureId.startsWith('max') && plan.features[featureId] !== -1) {
      const resourceType = featureId.substring(3).toLowerCase(); // e.g., maxInvoices -> invoices
      const currentUsage = await getResourceUsage(businessId, resourceType);
      const remainingUsage = plan.features[featureId] - currentUsage;
      
      return res.status(200).json({
        hasAccess: remainingUsage > 0,
        limit: plan.features[featureId],
        usage: currentUsage,
        remaining: remainingUsage,
      });
    }
    
    // Return access status for other features
    return res.status(200).json({
      hasAccess: plan.features[featureId] !== false,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
};

/**
 * Get current usage of a specific resource type for a business
 * @param {string} businessId - Business user ID
 * @param {string} resourceType - Type of resource (invoices, bills, reports, expenses)
 * @returns {Promise<number>} - Current usage count
 */
async function getResourceUsage(businessId, resourceType) {
  try {
    let count = 0;
    
    switch(resourceType) {
      case 'invoices':
        const BusinessInvoice = require('../models/businessInvoiceModel');
        count = await BusinessInvoice.countDocuments({ businessId });
        break;
        
      case 'bills':
        const BusinessBill = require('../models/businessBillModel');
        count = await BusinessBill.countDocuments({ user: businessId });
        break;
        
      case 'reports':
        const BusinessDailyReport = require('../models/businessDailyReportModel');
        count = await BusinessDailyReport.countDocuments({ userId: businessId });
        break;
        
      case 'expenses':
        const Expense = require('../models/expenseModel');
        // Check for expenses where either user or businessUser matches the businessId
        count = await Expense.countDocuments({
          $or: [
            { user: businessId },
            { businessUser: businessId },
          ],
        });
        break;
        
      default:
        count = 0;
    }
    
    return count;
  } catch (error) {
    //console.error(`Error getting usage for ${resourceType}:`, error);
    return 0; // Default to 0 in case of error
  }
}

/**
 * Handle Stripe webhook events
 */
exports.handleWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!sig || !endpointSecret) {
      //console.error('Missing stripe signature or endpoint secret');
      return res.status(400).json({ error: 'Webhook Error: Missing signature' });
    }
    
    // Verify the event came from Stripe
    let event;
    
    try {
      // Use the raw body captured by our middleware
      const rawBody = req.rawBody || req.body;
      
      if (typeof rawBody === 'string') {
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      } else {
        // Fallback to stringify if somehow body is already parsed
        const strBody = JSON.stringify(rawBody);
        event = stripe.webhooks.constructEvent(strBody, sig, endpointSecret);
      }
    } catch (err) {
      //console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    // Handle specific events
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        //console.log(`Unhandled event type: ${event.type}`);
    }
    
    return res.status(200).json({ received: true });
  } catch (error) {
    //console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
};

/**
 * Helper functions for Stripe webhook event handling
 */

// Handle subscription created event
async function handleSubscriptionCreated(subscription) {
  try {
    // For test events from Stripe CLI, metadata might be empty
    const businessId = subscription.metadata?.businessId;
    if (!businessId) {
      //console.log('No businessId found in subscription metadata - likely a test event');
      return;
    }
    
    // Update or create the subscription record in our database
    await BusinessSubscription.findOneAndUpdate(
      { businessId },
      {
        businessId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        planId: subscription.metadata.planId || 'premium',
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      { upsert: true, new: true },
    );
    
    //console.log(`Subscription created/updated for business: ${businessId}`);
  } catch (error) {
    //console.error('Error handling subscription created event:', error);
  }
}

// Handle subscription updated event
async function handleSubscriptionUpdated(subscription) {
  try {
    // For test webhooks, metadata might be missing  
    if (!subscription.id || subscription.id.startsWith('sub_test')) {
      //console.log('Test subscription event detected - skipping database update');
      return;
    }
      
    // Find subscription by Stripe subscription ID
    const existingSubscription = await BusinessSubscription.findOne({
      stripeSubscriptionId: subscription.id,
    });
    
    if (!existingSubscription) {
      //console.log(`No subscription found in database for Stripe ID: ${subscription.id} - likely a test event`);
      return;
    }
    
    // Update the subscription record
    existingSubscription.status = subscription.status;
    existingSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
    existingSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    existingSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    
    await existingSubscription.save();
    //console.log(`Subscription updated for ID: ${subscription.id}`);
  } catch (error) {
    //console.error('Error handling subscription updated event:', error);
  }
}

// Handle subscription deleted event
async function handleSubscriptionDeleted(subscription) {
  try {
    // Find and update subscription status
    const result = await BusinessSubscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      { status: 'canceled' },
      { new: true },
    );
    
    if (!result) {
      //console.error(`No subscription found for Stripe subscription ID: ${subscription.id}`);
      return;
    }
    
    //console.log(`Subscription canceled for ID: ${subscription.id}`);
  } catch (error) {
    //console.error('Error handling subscription deleted event:', error);
  }
}

// Handle invoice payment succeeded event
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    if (invoice.subscription) {
      // Update subscription status to active if payment succeeded
      await BusinessSubscription.findOneAndUpdate(
        { stripeSubscriptionId: invoice.subscription },
        { status: 'active' },
        { new: true },
      );
      
      //console.log(`Payment succeeded for subscription: ${invoice.subscription}`);
    }
  } catch (error) {
    //console.error('Error handling invoice payment succeeded event:', error);
  }
}

// Handle invoice payment failed event
async function handleInvoicePaymentFailed(invoice) {
  try {
    if (invoice.subscription) {
      // Update subscription status to past_due if payment failed
      await BusinessSubscription.findOneAndUpdate(
        { stripeSubscriptionId: invoice.subscription },
        { status: 'past_due' },
        { new: true },
      );
      
      // Get the business ID to potentially notify the user
      const subscription = await BusinessSubscription.findOne({
        stripeSubscriptionId: invoice.subscription,
      });
      
      if (subscription) {
        //console.log(`Payment failed for business: ${subscription.businessId}, subscription: ${invoice.subscription}`);
        // Here you could trigger an email notification to the user
      }
    }
  } catch (error) {
    //console.error('Error handling invoice payment failed event:', error);
  }
}
