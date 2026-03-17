/**
 * Business Miscellaneous Transaction Model
 * For recording miscellaneous income and expenses
 */
const mongoose = require('mongoose');

const businessMiscTransactionSchema = new mongoose.Schema(
  {
    businessUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessUser',
      required: [true, 'Business user is required'],
    },
    date: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
    },
    title: {
      type: String,
      required: [true, 'Transaction title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      default: 0,
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: ['income', 'expense'],
      default: 'expense',
    },
    category: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'check', 'other'],
      default: 'cash',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'completed',
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create index for faster query performance
businessMiscTransactionSchema.index({ businessUser: 1, date: -1 });
businessMiscTransactionSchema.index({ businessUser: 1, type: 1 });
businessMiscTransactionSchema.index({ businessUser: 1, category: 1 });

const BusinessMiscTransaction = mongoose.model('BusinessMiscTransaction', businessMiscTransactionSchema);

module.exports = BusinessMiscTransaction;
