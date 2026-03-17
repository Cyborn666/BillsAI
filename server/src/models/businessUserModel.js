/**
 * Business User Model
 * Completely independent model for business users with no reference to personal users
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const businessUserSchema = new mongoose.Schema(
  {
    // Authentication fields (previously in User model)
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false // Don't return password in queries
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true
    },
    businessEmail: {
      type: String,
      required: [true, 'Business email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    ownerName: {
      type: String,
      trim: true,
      default: ''
    },
    taxId: {
      type: String,
      trim: true,
      default: ''
    },
    businessType: {
      type: String,
      trim: true,
      default: ''
    },
    avatarId: {
      type: Number,
      default: 1  // Default to the first avatar
    },
    industry: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      street: {
        type: String,
        default: ''
      },
      city: {
        type: String,
        default: ''
      },
      state: {
        type: String,
        default: ''
      },
      zip: {
        type: String,
        default: ''
      },
      country: {
        type: String,
        default: '',
      }
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    foundedDate: {
      type: Date,
      default: null
    },
    employeeCount: {
      type: Number,
      default: 0
    },
    annualRevenue: {
      type: Number,
      default: 0
    },
    bankAccountInfo: {
      accountNumber: {
        type: String,
        default: ''
      },
      routingNumber: {
        type: String,
        default: ''
      },
      bankName: {
        type: String,
        default: ''
      }
    },
    businessDescription: {
      type: String,
      default: ''
    },
    logoUrl: {
      type: String,
      default: ''
    },
    activeSessions: [
      {
        sessionId: {
          type: String,
          required: true
        },
        device: {
          type: String,
          default: 'Unknown'
        },
        ipAddress: {
          type: String,
          default: ''
        },
        userAgent: {
          type: String,
          default: ''
        },
        lastActive: {
          type: Date,
          default: Date.now
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    maxSessions: {
      type: Number,
      default: 5 // Business accounts get 5 concurrent logins by default
    },
    isProfileLocked: {
      type: Boolean,
      default: false
    },
    profileCompleted: {
      type: Boolean,
      default: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    profileImage: {
      type: String,
      default: null
    },
    subscriptionTier: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    subscriptionExpiry: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Virtual for retrieving associated user information
businessUserSchema.virtual('userInfo', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

// Create compound index for business data lookup
businessUserSchema.index({ businessEmail: 1 });
businessUserSchema.index({ businessName: 1 });

// Method to check if business profile is complete
businessUserSchema.methods.isProfileComplete = function() {
  const requiredFields = ['businessName', 'businessEmail', 'taxId', 'businessType', 'industry'];
  
  for (const field of requiredFields) {
    if (!this[field] || (typeof this[field] === 'string' && this[field].trim() === '')) {
      return false;
    }
  }
  
  return true;
};

// Middleware to hash password before saving
businessUserSchema.pre('save', async function(next) {
  // Update profile completeness
  this.profileCompleted = this.isProfileComplete();
  
  // Only hash password if it's modified
  if (!this.isModified('password')) {
    return next();
  }
  
  // Hash password with bcrypt
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords for login
businessUserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and return a JWT token
businessUserSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: 'business', accountType: 'business' },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

// Method to generate password reset token
businessUserSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Method to generate email verification token
businessUserSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

const BusinessUser = mongoose.model('BusinessUser', businessUserSchema);

module.exports = BusinessUser;
