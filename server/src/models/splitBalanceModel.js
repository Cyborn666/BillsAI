/**
 * Split Balance Model - For expense splitting functionality
 * Tracks balances between users
 */
const mongoose = require('mongoose');

const splitBalanceSchema = new mongoose.Schema(
  {
    splitUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SplitUser',
      required: true,
    },
    otherSplitUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SplitUser',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      // Positive: splitUser is owed by otherSplitUser
      // Negative: splitUser owes otherSplitUser
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true,
  }
);

// Ensure uniqueness of balances between users (prevent duplicate entries)
splitBalanceSchema.index({ splitUser: 1, otherSplitUser: 1 }, { unique: true });

const SplitBalance = mongoose.model('SplitBalance', splitBalanceSchema);

module.exports = SplitBalance;
