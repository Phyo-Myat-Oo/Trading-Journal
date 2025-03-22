import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface ITransaction extends Document {
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT';
  amount: number;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccount extends Document {
  userId: IUser['_id'];
  name: string;
  type: string;
  balance: number;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  broker: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  updateBalance(amount: number, type: 'add' | 'subtract'): Promise<void>;
}

const transactionSchema = new Schema<ITransaction>(
  {
    type: {
      type: String,
      enum: ['DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const accountSchema = new Schema<IAccount>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Account type is required'],
    trim: true
  },
  balance: {
    type: Number,
    required: [true, 'Balance is required'],
    min: [0, 'Balance cannot be negative']
  },
  initialBalance: {
    type: Number,
    required: [true, 'Initial balance is required'],
    min: [0, 'Initial balance cannot be negative']
  },
  currentBalance: {
    type: Number,
    required: [true, 'Current balance is required'],
    min: [0, 'Current balance cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{3}$/, 'Currency must be a valid 3-letter code']
  },
  broker: {
    type: String,
    required: [true, 'Broker name is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Update balance method
accountSchema.methods.updateBalance = async function(amount: number, type: 'add' | 'subtract'): Promise<void> {
  if (type === 'add') {
    this.currentBalance += amount;
  } else {
    if (this.currentBalance < amount) {
      throw new Error('Insufficient balance');
    }
    this.currentBalance -= amount;
  }
  await this.save();
};

// Create indexes
accountSchema.index({ userId: 1 });
accountSchema.index({ broker: 1 });
accountSchema.index({ userId: 1, broker: 1 }, { unique: true });

export const Account = mongoose.model<IAccount>('Account', accountSchema); 