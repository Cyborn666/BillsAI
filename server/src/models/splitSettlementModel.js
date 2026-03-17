/**
 * Split Settlement Model - For expense splitting functionality
 * Records settlements between users
 */
const mongoose = require('mongoose');

const splitSettlementSchema = new mongoose.Schema(
  {
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SplitUser',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SplitUser',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Settlement amount must be positive'],
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi', 'paypal', 'venmo', 'other'],
      default: 'other',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['completed', 'cancelled'],
      default: 'completed',
    },
    relatedExpenses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SplitExpense',
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
splitSettlementSchema.index({ payer: 1 });
splitSettlementSchema.index({ receiver: 1 });
splitSettlementSchema.index({ date: -1 });

const SplitSettlement = mongoose.model('SplitSettlement', splitSettlementSchema);

module.exports = SplitSettlement;
