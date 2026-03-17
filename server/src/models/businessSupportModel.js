/**
 * Business Support Message Model
 * Handles support requests from business accounts
 */
const mongoose = require('mongoose');

const businessSupportMessageSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['general', 'technical', 'billing', 'account', 'feature_request', 'subscription'],
      default: 'general',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        url: String,
        filename: String,
        mimetype: String,
      },
    ],
    responses: [
      {
        content: {
          type: String,
          required: true,
        },
        responderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        responderType: {
          type: String,
          enum: ['agent', 'system', 'user'],
          default: 'agent',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create index for faster querying
businessSupportMessageSchema.index({ businessId: 1, createdAt: -1 });
businessSupportMessageSchema.index({ userId: 1, createdAt: -1 });
businessSupportMessageSchema.index({ status: 1 });

const BusinessSupportMessage = mongoose.model('BusinessSupportMessage', businessSupportMessageSchema);

module.exports = BusinessSupportMessage;
