/**
 * Split Expense Model - For expense splitting functionality
 * Completely separate from existing bill/expense models
 */
const mongoose = require('mongoose');

const splitExpenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SplitUser',
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SplitGroup',
      // Not required as expenses can be between individuals
    },
    splitType: {
      type: String,
      enum: ['equal', 'exact', 'percentage', 'shares'],
      default: 'equal',
    },
    participants: [{
      splitUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SplitUser',
        required: true,
      },
      share: {
        type: Number,
        required: true,
        // For equal: computed equal amount
        // For exact: exact amount
        // For percentage: percentage (0-100)
        // For shares: number of shares
      }
    }],
    category: {
      type: String,
      enum: [
        'FOOD',
        'RENT',
        'UTILITIES',
        'TRANSPORTATION',
        'ENTERTAINMENT',
        'SHOPPING',
        'TRAVEL',
        'GROCERIES',
        'HEALTH',
        'EDUCATION',
        'OTHER'
      ],
      default: 'OTHER',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    receiptImageUrl: {
      type: String,
      default: '',
    },
    comments: [{
      splitUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SplitUser',
        required: true,
      },
      text: {
        type: String,
        required: true,
        trim: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      }
    }],
    editHistory: [{
      editedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SplitUser',
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      changes: {
        type: Object,
      }
    }],
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

// Add indexes for faster queries
splitExpenseSchema.index({ paidBy: 1 });
splitExpenseSchema.index({ group: 1 });
splitExpenseSchema.index({ 'participants.splitUser': 1 });
splitExpenseSchema.index({ date: -1 });

const SplitExpense = mongoose.model('SplitExpense', splitExpenseSchema);

module.exports = SplitExpense;
