/**
 * Business Bill Model
 */
const mongoose = require('mongoose');

const businessBillSchema = new mongoose.Schema(
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
      enum: ['RENT', 'UTILITIES', 'SUBSCRIPTION', 'CREDIT_CARD', 'LOAN', 'INSURANCE', 'TAXES', 'SALARY', 'MARKETING', 'OFFICE_SUPPLIES', 'PROFESSIONAL_SERVICES', 'EQUIPMENT', 'OTHER'],
      default: 'OTHER',
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
    vendor: {
      type: String,
      trim: true,
    },
    taxDeductible: {
      type: Boolean,
      default: true,
    },
    receiptImage: {
      type: String, // URL or file path to image
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK', 'DIGITAL_WALLET', 'OTHER'],
      default: 'OTHER',
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
    notes: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster queries
businessBillSchema.index({ user: 1 });
businessBillSchema.index({ dueDate: 1 });
businessBillSchema.index({ status: 1 });
businessBillSchema.index({ category: 1 });
businessBillSchema.index({ businessUser: 1 });

// Virtual for remaining amount due
businessBillSchema.virtual('remainingAmount').get(function() {
  if (!this.payments || this.payments.length === 0) {
    return this.amount;
  }
  
  const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, this.amount - totalPaid);
});

// Method to check if bill is fully paid
businessBillSchema.methods.isFullyPaid = function() {
  return this.status === 'PAID' || this.remainingAmount <= 0;
};

const BusinessBill = mongoose.model('BusinessBill', businessBillSchema);

module.exports = BusinessBill;
