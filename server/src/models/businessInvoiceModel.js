/**
 * Business Invoice Model
 * Schema for business invoices
 */
const mongoose = require('mongoose');

// Payment schema for invoice payments
const paymentSchema = new mongoose.Schema({
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
    enum: ['credit', 'debit', 'bank', 'cash', 'check', 'other'],
    default: 'bank',
  },
  reference: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
});

// Line item schema for invoice items
const lineItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
});

const businessInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  client: {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
  },
  issueDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  items: [lineItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  termsAndConditions: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
  },
  payments: [paymentSchema],
  remindersSent: [{
    date: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ['email', 'sms', 'other'],
      default: 'email',
    },
  }],
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringPeriod: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'annual', 'custom', ''],
    default: '',
  },
  nextInvoiceDate: {
    type: Date,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Virtual for balance due
businessInvoiceSchema.virtual('balanceDue').get(function() {
  const totalPayments = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return this.total - totalPayments;
});

// Virtual for payment status
businessInvoiceSchema.virtual('isPaid').get(function() {
  return this.balanceDue <= 0;
});

// Index for faster queries
businessInvoiceSchema.index({ 'client.name': 1 });
businessInvoiceSchema.index({ invoiceNumber: 1 });
businessInvoiceSchema.index({ issueDate: -1 });
businessInvoiceSchema.index({ dueDate: 1 });
businessInvoiceSchema.index({ status: 1 });
businessInvoiceSchema.index({ userId: 1 });

// Set toJSON option to include virtuals
businessInvoiceSchema.set('toJSON', { virtuals: true });
businessInvoiceSchema.set('toObject', { virtuals: true });

const BusinessInvoice = mongoose.model('BusinessInvoice', businessInvoiceSchema);

module.exports = BusinessInvoice;
