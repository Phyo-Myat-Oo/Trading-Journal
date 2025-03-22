import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface IUser extends Document {
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
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  fullName: string;
}

/**
 * User Schema
 * @description Mongoose schema for User model with authentication and profile information
 * 
 * @property {string} email - User's email address (unique)
 * @property {string} password - Hashed password
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} role - User's role (user or admin)
 * @property {boolean} isActive - Whether the user account is active
 * @property {Date} lastLogin - Timestamp of last successful login
 * @property {Date} createdAt - Timestamp of user creation
 * @property {Date} updatedAt - Timestamp of last update
 * @property {Date} passwordChangedAt - Timestamp when password was last changed
 */
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
      required: [true, 'Password is required'],
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
    passwordChangedAt: Date
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function(this: IUser & { password: string }, next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Set passwordChangedAt when the password changes
    if (!this.isNew) {
      this.passwordChangedAt = new Date();
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

// Create indexes - don't duplicate the email index which is already set in the schema
userSchema.index({ role: 1 });

/**
 * Generate JWT token method
 * @returns {string} JWT token containing user ID
 */
userSchema.methods.generateAuthToken = function(this: IUser): string {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role,
      iat: Math.floor(Date.now() / 1000), // Issued at timestamp
      iss: 'trading-journal-api' // Issuer
    },
    config.jwt.secret as jwt.Secret,
    { expiresIn: config.jwt.accessExpiresIn } as SignOptions
  );
};

/**
 * Get full name virtual property
 * @returns {string} User's full name
 */
userSchema.virtual('fullName').get(function(this: IUser): string {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Find user by email static method
 * @param {string} email - Email address to search for
 * @returns {Promise<IUser | null>} User document if found, null otherwise
 */
userSchema.statics.findByEmail = async function(email: string): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find active users static method
 * @returns {Promise<IUser[]>} Array of active user documents
 */
userSchema.statics.findActive = async function(): Promise<IUser[]> {
  return this.find({ isActive: true });
};

// Create and export the User model
export const User = mongoose.model<IUser>('User', userSchema); 