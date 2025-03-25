import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import crypto from 'crypto';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLogin: Date;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  passwordChangedAt?: Date;
  passwordHistory: string[];
  failedLoginAttempts: number;
  accountLocked: boolean;
  accountLockedUntil?: Date;
  previousLockouts: number;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  twoFactorTempSecret?: string;
  name?: string;
  phone?: string;
  
  // Social login fields
  googleId?: string;
  profilePicture?: string;
  provider?: 'local' | 'google';
  
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateTokens(): { accessToken: string; refreshToken: string };
  generatePasswordResetToken(): string;
  fullName: string;
  isPasswordInHistory(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: function() {
        // Password is required only for local accounts
        return this.provider === 'local' || !this.provider;
      },
      minlength: [8, 'Password must be at least 8 characters long']
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: Date.now
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    passwordChangedAt: Date,
    passwordHistory: {
      type: [String],
      default: [],
      description: 'History of previous password hashes'
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    accountLocked: {
      type: Boolean,
      default: false
    },
    accountLockedUntil: Date,
    previousLockouts: {
      type: Number,
      default: 0
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      default: null
    },
    twoFactorBackupCodes: {
      type: [String],
      default: []
    },
    twoFactorTempSecret: {
      type: String,
      default: null
    },
    name: String,
    phone: String,
    
    // Social login fields
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    profilePicture: String,
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving - only if password is modified and provider is local
userSchema.pre('save', async function(this: IUser & { password: string }, next) {
  // Skip password hashing for social accounts with no password
  if (!this.isModified('password') || (!this.password && this.provider !== 'local')) {
    return next();
  }
  
  try {
    // Set passwordChangedAt when the password changes
    if (!this.isNew) {
      this.passwordChangedAt = new Date();
      
      // Add current (old) hashed password to history before changing it
      // First, retrieve the current document from the database to get the current password
      const currentUser = await mongoose.model('User').findById(this._id);
      if (currentUser) {
        const currentPassword = currentUser.get('password');
        
        // Initialize password history array if it doesn't exist
        if (!this.passwordHistory) {
          this.passwordHistory = [];
        }
        
        // Keep only the most recent passwords (limit to 5)
        const MAX_PASSWORD_HISTORY = 5;
        if (currentPassword) {
          this.passwordHistory.push(currentPassword);
          if (this.passwordHistory.length > MAX_PASSWORD_HISTORY) {
            this.passwordHistory = this.passwordHistory.slice(-MAX_PASSWORD_HISTORY);
          }
        }
      }
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if a password is in the user's password history
userSchema.methods.isPasswordInHistory = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  // If password history is empty, return false
  if (!this.passwordHistory || this.passwordHistory.length === 0) {
    return false;
  }

  // Check each password in history
  for (const hashedPassword of this.passwordHistory) {
    const isMatch = await bcrypt.compare(candidatePassword, hashedPassword);
    if (isMatch) {
      return true; // Password found in history
    }
  }

  return false; // Password not found in history
};

// Generate tokens method
userSchema.methods.generateTokens = function(this: IUser): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role,
      iat: Math.floor(Date.now() / 1000),
      iss: 'trading-journal-api'
    },
    config.jwt.secret as jwt.Secret,
    { expiresIn: config.jwt.accessExpiresIn } as SignOptions
  );

  const refreshToken = jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role,
      iat: Math.floor(Date.now() / 1000),
      iss: 'trading-journal-api'
    },
    config.jwt.refreshSecret as jwt.Secret,
    { expiresIn: config.jwt.refreshExpiresIn } as SignOptions
  );

  return { accessToken, refreshToken };
};

// Generate password reset token method
userSchema.methods.generatePasswordResetToken = function(this: IUser): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return resetToken;
};

// Get full name virtual property
userSchema.virtual('fullName').get(function(this: IUser): string {
  return `${this.firstName} ${this.lastName}`;
});

// Create indexes
userSchema.index({ role: 1 });

// Find user by email static method
userSchema.statics.findByEmail = async function(email: string): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

// Find active users static method
userSchema.statics.findActive = async function(): Promise<IUser[]> {
  return this.find({ isActive: true });
};

// Create and export the User model
export const User = mongoose.model<IUser>('User', userSchema); 