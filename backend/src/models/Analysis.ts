import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { ITrade } from './Trade';

// Define analysis types
export enum AnalysisType {
  PERFORMANCE = 'PERFORMANCE',
  PATTERN = 'PATTERN',
  FORECAST = 'FORECAST',
  SYMBOL = 'SYMBOL',
  TIME_OF_DAY = 'TIME_OF_DAY',
  DAY_OF_WEEK = 'DAY_OF_WEEK',
  RISK = 'RISK',
  JOURNAL_CORRELATION = 'JOURNAL_CORRELATION',
  DASHBOARD = 'DASHBOARD'
}

// Define analysis periods
export enum AnalysisPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM'
}

// Interface for the Analysis document
export interface IAnalysis extends Document {
  userId: IUser['_id'];
  tradeId: ITrade['_id'];
  type?: AnalysisType;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    riskRewardRatio: number;
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
  };
  data?: any;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED';
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
  expiresAt?: Date;
  accountId?: any;
}

// Schema definition
const analysisSchema = new Schema<IAnalysis>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  tradeId: {
    type: Schema.Types.ObjectId,
    ref: 'Trade',
    required: [true, 'Trade ID is required']
  },
  type: {
    type: String,
    enum: Object.values(AnalysisType),
    default: AnalysisType.PERFORMANCE
  },
  period: {
    start: {
      type: Date,
      required: [true, 'Period start date is required']
    },
    end: {
      type: Date,
      required: [true, 'Period end date is required']
    }
  },
  metrics: {
    riskRewardRatio: {
      type: Number,
      required: [true, 'Risk reward ratio is required'],
      min: [0, 'Risk reward ratio must be positive']
    },
    winRate: {
      type: Number,
      required: [true, 'Win rate is required'],
      min: [0, 'Win rate must be positive'],
      max: [100, 'Win rate cannot exceed 100%']
    },
    profitFactor: {
      type: Number,
      required: [true, 'Profit factor is required'],
      min: [0, 'Profit factor must be positive']
    },
    averageWin: {
      type: Number,
      required: [true, 'Average win is required']
    },
    averageLoss: {
      type: Number,
      required: [true, 'Average loss is required']
    }
  },
  data: {
    type: Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'COMPLETED'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  expiresAt: {
    type: Date
  },
  accountId: {
    type: Schema.Types.ObjectId,
    ref: 'Account'
  }
}, {
  timestamps: true
});

// Create indexes
analysisSchema.index({ userId: 1 });
analysisSchema.index({ tradeId: 1 });
analysisSchema.index({ 'period.start': 1, 'period.end': 1 });
analysisSchema.index({ userId: 1, tradeId: 1 }, { unique: true });
analysisSchema.index({ type: 1 });
analysisSchema.index({ status: 1 });

// Validate period dates
analysisSchema.pre('save', function(next) {
  if (this.period.end < this.period.start) {
    next(new Error('Period end date must be after start date'));
  }
  next();
});

// Create and export the model
export const Analysis = mongoose.model<IAnalysis>('Analysis', analysisSchema); 