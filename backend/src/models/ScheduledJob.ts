import mongoose, { Document, Schema } from 'mongoose';
import { AnalysisType } from './Analysis';
import { JobInterval } from '../config/queue';

export interface IScheduledJob extends Document {
  userId: mongoose.Types.ObjectId;
  jobId: string;
  jobKey: string;
  name: string;
  description?: string;
  analysisType: AnalysisType;
  interval: JobInterval;
  accountId?: string;
  lastRun?: Date;
  nextRun?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledJobSchema = new Schema<IScheduledJob>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  jobId: {
    type: String,
    required: true,
    unique: true
  },
  jobKey: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  analysisType: {
    type: String,
    required: true
  },
  interval: {
    type: String,
    required: true,
    enum: Object.values(JobInterval)
  },
  accountId: {
    type: String
  },
  lastRun: {
    type: Date
  },
  nextRun: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes for better performance
ScheduledJobSchema.index({ userId: 1, analysisType: 1, interval: 1 });
ScheduledJobSchema.index({ isActive: 1 });

export default mongoose.model<IScheduledJob>('ScheduledJob', ScheduledJobSchema); 