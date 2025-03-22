import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { ITrade } from './Trade';

export interface IJournalEntry extends Document {
  userId: IUser['_id'];
  tradeId?: ITrade['_id'];
  title: string;
  content: string;
  mood?: 'positive' | 'neutral' | 'negative';
  tags?: string[];
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const journalEntrySchema = new Schema<IJournalEntry>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  tradeId: {
    type: Schema.Types.ObjectId,
    ref: 'Trade'
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    minlength: [10, 'Content must be at least 10 characters long']
  },
  mood: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  tags: [{
    type: String,
    trim: true
  }],
  date: {
    type: Date,
    default: Date.now,
    required: [true, 'Date is required']
  }
}, {
  timestamps: true
});

// Create indexes
journalEntrySchema.index({ userId: 1 });
journalEntrySchema.index({ tradeId: 1 });
journalEntrySchema.index({ tags: 1 });
journalEntrySchema.index({ userId: 1, createdAt: -1 });

// Validate tags
journalEntrySchema.path('tags').validate(function(tags: string[]) {
  if (!tags) return true;
  return tags.every(tag => tag.length >= 2 && tag.length <= 20);
}, 'Each tag must be between 2 and 20 characters long');

export const JournalEntry = mongoose.model<IJournalEntry>('JournalEntry', journalEntrySchema); 