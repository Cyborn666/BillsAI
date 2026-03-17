/**
 * Split User Model - For expense splitting functionality
 * Completely separate from the main User model
 */
const mongoose = require('mongoose');

const splitUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    recentContacts: [{
      splitUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SplitUser',
      },
      lastInteractionDate: {
        type: Date,
        default: Date.now,
      }
    }],
    defaultCurrency: {
      type: String,
      default: 'USD',
    },
    searchableFields: {
      email: {
        type: Boolean,
        default: true,
      },
      phone: {
        type: Boolean,
        default: true,
      },
      username: {
        type: Boolean,
        default: true,
      }
    },
    notificationPreferences: {
      newExpense: {
        type: Boolean,
        default: true,
      },
      expenseUpdated: {
        type: Boolean,
        default: true,
      },
      expenseDeleted: {
        type: Boolean,
        default: true,
      },
      settlementReceived: {
        type: Boolean,
        default: true,
      }
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true,
  }
);

// Add index for faster searches
splitUserSchema.index({ email: 1 });
splitUserSchema.index({ phone: 1 });
splitUserSchema.index({ userId: 1 });

const SplitUser = mongoose.model('SplitUser', splitUserSchema);

module.exports = SplitUser;
