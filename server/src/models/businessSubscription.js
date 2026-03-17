/**
 * Business Subscription Model
 * Stores subscription information for business accounts
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const businessSubscriptionSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    planId: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free',
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
    },
    stripeSubscriptionItemId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'trialing', 'unpaid', 'incomplete'],
      default: 'active',
    },
    startDate: {
      type: Date,
      required: false,
    },
    expiryDate: {
      type: Date,
      required: false,
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    productId: {
      type: String,
      trim: true,
      required: false,
    },
    description: {
      type: String,
      trim: true,
      required: false,
    },
    // Platform-specific data stored separately
    appleData: {
      type: new Schema({
        originalTransactionId: { type: String, required: false },
        transactionId: { type: String, required: false },
        purchaseDate: { type: Date, required: false },
        expiresDate: { type: Date, required: false },
        latestReceipt: { type: String, required: false },
      }, { _id: false }),
      required: false,
    },
    // Future platforms can be added here
    // stripeData, googleData, etc.
  },
  { timestamps: true }
);

const BusinessSubscription = mongoose.model('BusinessSubscription', businessSubscriptionSchema);

module.exports = BusinessSubscription;



