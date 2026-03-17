/**
 * User Model
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      unique: true,
      minlength: [3, 'Username must be at least 3 characters'],
      match: [/^[a-zA-Z0-9_@.-]+$/, 'Username can only contain letters, numbers, underscores, @, dots, and hyphens'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Don't include password in query results by default
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    avatarId: {
      type: String,
      default: 'male2',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
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
      default: 3 // By default allow 3 concurrent logins
    },
    notifications: {
      type: Object,
      default: {
        pushEnabled: false,
        emailEnabled: false
      }
    },
    preferences: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Ensure fullName is set if it's missing
  if (!this.fullName) {
    // Use email username as fallback for fullName if no firstName/lastName
    this.fullName = this.email ? this.email.split('@')[0] : 'User';
  }

  // Generate username if not provided or on first save
  if (!this.username) {
    // Extract username from email (remove @domain.com)
    const emailUsername = this.email ? this.email.split('@')[0] : '';

    // Create default username with @ prefix
    this.username = '@' + (emailUsername || this._id.toString().slice(0, 8));

    // Make sure username is unique by checking the database
    try {
      const count = await mongoose.models.User.countDocuments({ username: this.username });
      // If username exists, append numbers
      if (count > 0) {
        this.username = this.username + count;
      }
    } catch (error) {
      //console.error('Error checking username uniqueness:', error);
      // If error, append random string to ensure uniqueness
      this.username = this.username + Math.floor(Math.random() * 1000);
    }
  }

  next();
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and return a JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role, accountType: 'personal' },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  // Generate token
  const verificationToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Set expire
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verificationToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
