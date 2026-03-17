/**
 * Bill Model
 */
const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Bill title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Bill amount is required'],
      min: [0, 'Amount must be a positive number'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    category: {
      type: String,
      enum: ['RENT', 'UTILITIES', 'SUBSCRIPTION', 'CREDIT_CARD', 'LOAN', 'INSURANCE', 'GROCERY', 'TRANSPORTATION', 'ENTERTAINMENT', 'HEALTHCARE', 'EDUCATION', 'OTHER'],
      default: 'OTHER',
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PAID', 'UNPAID', 'OVERDUE', 'UPCOMING', 'PARTIALLY_PAID'],
      default: 'UNPAID',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPeriod: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'],
      default: 'MONTHLY',
    },
    reminderDays: {
      type: Number,
      default: 3,
      min: [0, 'Reminder days must be a positive number'],
    },
    lastNotificationDate: {
      type: Date,
      default: null,
    },
    lastPaidDates: {
      type: [Date],
      default: [],
    },
    notificationIds: {
      type: [String],
      default: [],
    },
    payments: [
      {
        amount: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        method: {
          type: String,
          enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK', 'DIGITAL_WALLET', 'OTHER'],
          default: 'OTHER',
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    reminders: [
      {
        date: {
          type: Date,
          required: true,
        },
        message: {
          type: String,
          trim: true,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    splitType: {
      type: String,
      enum: ['EQUAL', 'CUSTOM'],
      default: 'EQUAL',
    },
    splitPercentages: {
      type: Object,
      default: {},
    },
    splitDetails: {
      type: Object,
      default: {},
    },
    markedAsPaidBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
   
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);


billSchema.methods.isMarkedAsPaidByUser = function(userId) {
  return this.markedAsPaidBy.some(id => id.toString() === userId.toString());
};

// Index for faster queries
billSchema.index({ user: 1 });
billSchema.index({ dueDate: 1 });
billSchema.index({ status: 1 });
billSchema.index({ category: 1 });

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;
