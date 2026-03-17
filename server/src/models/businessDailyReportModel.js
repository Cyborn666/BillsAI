/**
 * Business Daily Report Model
 */
const mongoose = require('mongoose');

const businessDailyReportSchema = new mongoose.Schema(
  {
    businessUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessUser',
      required: [true, 'Business user is required'],
    },
    date: {
      type: Date,
      required: [true, 'Report date is required'],
      default: Date.now,
    },
    title: {
      type: String,
      required: [false, 'Report title is required'],
      trim: true,
    },
    summary: {
      type: String,
      required: [false, 'Report summary is required'],
      trim: true,
    },
    netSales: {
      type: Number,
      required: [true, 'Net sales amount is required'],
      default: 0,
    },
    cashAmount: {
      type: Number,
      required: [true, 'Cash amount is required'],
      default: 0,
    },
    cardAmount: {
      type: Number,
      required: [true, 'Card amount is required'],
      default: 0,
    },
    otherPaymentAmount: {
      type: Number,
      default: 0,
    },
    expectedTotal: {
      type: Number,
      required: [true, 'Expected total is required'],
      default: 0,
    },
    actualTotal: {
      type: Number,
      required: [true, 'Actual total is required'],
      default: 0,
    },
    salesTax: {
      type: Number,
      default: 0,
    },
    overShortAmount: {
      type: Number,
      default: 0,
    },
    transactions: {
      type: Number,
      default: 0,
    },
    averageTicket: {
      type: Number,
      default: 0,
    },
    miscExpenses: {
      type: Number,
      default: 0,
      description: 'Miscellaneous expenses not recorded in the system',
    },
    miscIncome: {
      type: Number,
      default: 0,
      description: 'Miscellaneous income not recorded in the system',
    },

    paymentMethods: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      amount: {
        type: Number,
        required: true,
        default: 0
      },
      transactionCount: {
        type: Number,
        default: 0
      }
    }],
    categories: [{
      name: String,
      amount: Number,
      count: Number,
    }],
    cashDrawerOpens: {
      type: Number,
      default: 0
    },
    startingCash: {
      type: Number,
      default: 0
    },
    cashDrops: [{
      amount: Number,
      time: Date,
      employee: String
    }],
    attachments: [{
      fileName: String,
      fileURL: String,
      fileType: String,
      uploadDate: {
        type: Date,
        default: Date.now,
      },
    }],
    notes: [{
      text: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add compound index to ensure that a business user can only have one report per date
businessDailyReportSchema.index({ businessUser: 1, date: 1 }, { unique: true });

// Create a pre-save hook to normalize the date to remove time information to ensure uniqueness by day
businessDailyReportSchema.pre('save', function(next) {
  // Set the time to midnight to ensure we only compare dates, not times
  if (this.date) {
    const date = new Date(this.date);
    date.setHours(0, 0, 0, 0);
    this.date = date;
  }
  next();
});

// Virtual field to calculate net change
businessDailyReportSchema.virtual('netChange').get(function() {
  return this.salesTotal - this.expensesTotal;
});

const BusinessDailyReport = mongoose.model('BusinessDailyReport', businessDailyReportSchema);

module.exports = BusinessDailyReport;
