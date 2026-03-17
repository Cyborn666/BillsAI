/**
 * Split Group Model - For expense splitting functionality
 * Groups for shared expenses
 */
const mongoose = require('mongoose');

const splitGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    icon: {
      type: String,
      default: 'group',
    },
    currency: {
      type: String,
      default: 'USD',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    members: [{
      splitUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SplitUser',
        required: true,
      },
      role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member',
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      }
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SplitUser',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Add indexes for faster queries
splitGroupSchema.index({ createdBy: 1 });
splitGroupSchema.index({ 'members.splitUser': 1 });

const SplitGroup = mongoose.model('SplitGroup', splitGroupSchema);

module.exports = SplitGroup;
