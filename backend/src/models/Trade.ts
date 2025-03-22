import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface ITrade extends Document {
  userId: IUser['_id'];
  symbol: string;
  type: 'buy' | 'sell';
  entry: number;
  exit?: number;
  quantity: number;
  date: Date;
  entryDate: Date;
  exitDate?: Date;
  profit?: number;
  profitLoss?: number;
  notes?: string;
  tags?: string[];
  screenshots?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const tradeSchema = new Schema<ITrade>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  symbol: {
    type: String,
    required: [true, 'Trading symbol is required'],
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: [true, 'Trade type is required']
  },
  entry: {
    type: Number,
    required: [true, 'Entry price is required'],
    min: [0, 'Entry price must be positive']
  },
  exit: {
    type: Number,
    min: [0, 'Exit price must be positive']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity must be positive']
  },
  date: {
    type: Date,
    required: [true, 'Trade date is required'],
    default: Date.now
  },
  entryDate: {
    type: Date,
    required: [true, 'Entry date is required'],
    default: Date.now
  },
  exitDate: {
    type: Date
  },
  profit: {
    type: Number,
    default: 0
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  screenshots: [{
    type: String
  }]
}, {
  timestamps: true
});

// Create indexes
tradeSchema.index({ userId: 1 });
tradeSchema.index({ symbol: 1 });
tradeSchema.index({ date: -1 });
tradeSchema.index({ userId: 1, date: -1 });
tradeSchema.index({ entryDate: -1 });
tradeSchema.index({ exitDate: -1 });

// Calculate profit before saving
tradeSchema.pre('save', function(next) {
  if (this.exit && this.entry && this.quantity) {
    if (this.type === 'buy') {
      this.profit = (this.exit - this.entry) * this.quantity;
      this.profitLoss = this.profit;
    } else {
      this.profit = (this.entry - this.exit) * this.quantity;
      this.profitLoss = this.profit;
    }
    // Set exitDate if exit price is present and exitDate is not set
    if (!this.exitDate) {
      this.exitDate = new Date();
    }
  }
  next();
});

export const Trade = mongoose.model<ITrade>('Trade', tradeSchema); 