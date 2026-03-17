/**
 * Expense Model for business expenses
 */
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    // Total amount is still required as the final amount
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Amount must be a positive number'],
    },
    // Breakdown of expense amount
    subtotal: {
      type: Number,
      min: [0, 'Subtotal must be a positive number'],
    },
    // Tax breakdown
    taxes: {
      salesTax: { // Standard sales tax/VAT
        type: Number,
        min: [0, 'Sales tax must be a positive number'],
        default: 0,
      },
      stateTax: { // State-specific tax (for US)
        type: Number,
        min: [0, 'State tax must be a positive number'],
        default: 0,
      },
      localTax: { // Local/city tax
        type: Number,
        min: [0, 'Local tax must be a positive number'],
        default: 0,
      },
      exciseTax: { // Special tax on specific goods
        type: Number,
        min: [0, 'Excise tax must be a positive number'],
        default: 0,
      },
      importDuty: { // For imported goods
        type: Number,
        min: [0, 'Import duty must be a positive number'],
        default: 0,
      },
      otherTaxes: { // For any other taxes
        type: Number,
        min: [0, 'Tax amount must be a positive number'],
        default: 0,
      },
    },
    taxRates: {
      salesTaxRate: {
        type: Number,
        min: [0, 'Tax rate must be a positive number'],
        default: 0,
      },
      stateTaxRate: {
        type: Number,
        min: [0, 'Tax rate must be a positive number'],
        default: 0,
      },
      localTaxRate: {
        type: Number,
        min: [0, 'Tax rate must be a positive number'],
        default: 0,
      },
    },
    discount: {
      type: Number,
      min: [0, 'Discount must be a positive number'],
      default: 0,
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now,
    },
    category: {
      type: String,
      enum: ['RENT', 'UTILITIES', 'FOOD', 'TRANSPORT', 'ENTERTAINMENT', 'HEALTHCARE', 'EDUCATION', 'SHOPPING', 'TRAVEL', 'SALARY', 'MARKETING', 'TAXES', 'OFFICE_SUPPLIES', 'PROFESSIONAL_SERVICES', 'EQUIPMENT', 'INSURANCE', 'OTHER'],
      default: 'OTHER',
    },
    notes: {
      type: String,
      trim: true,
    },
    receiptImage: {
      type: String, // URL or file path to image
    },
    isBusinessExpense: {
      type: Boolean,
      default: true,
    },
    taxDeductible: {
      type: Boolean,
      default: false,
    },
    vendor: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK', 'DIGITAL_WALLET', 'OTHER'],
      default: 'OTHER',
    },
    recurring: {
      type: Boolean,
      default: false,
    },
    recurringPeriod: {
      type: String,
      enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
      default: 'MONTHLY',
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
    businessUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessUser',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster queries
expenseSchema.index({ user: 1 });
expenseSchema.index({ date: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ businessUser: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
