import mongoose, { Document, Schema } from 'mongoose';

export interface ITradePattern {
  name: string;
  description: string;
  confidence: number;
  profitFactor: number;
  winRate: number;
  averageRR: number; // Risk-Reward Ratio
  tradeCount: number;
  tags: string[];
}

export interface IMarketInsight {
  market: string;
  timeframe: string;
  condition: string;
  bias: string;
  keyLevels: number[];
  confidence: number;
  description: string;
}

export interface IBehavioralPattern {
  pattern: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
  description: string;
  suggestedActions: string[];
}

export interface IAnalysisResult extends Document {
  userId: mongoose.Types.ObjectId;
  period: {
    start: Date;
    end: Date;
  };
  tradePatterns: ITradePattern[];
  marketInsights: IMarketInsight[];
  behavioralPatterns: IBehavioralPattern[];
  performance: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    averageRR: number;
    largestWin: number;
    largestLoss: number;
    averageWin: number;
    averageLoss: number;
    expectancy: number;
  };
  recommendations: {
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: 'RISK' | 'STRATEGY' | 'PSYCHOLOGY' | 'GENERAL';
    actionItems: string[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const tradePatternSchema = new Schema<ITradePattern>({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  profitFactor: {
    type: Number,
    required: true,
    min: 0,
  },
  winRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  averageRR: {
    type: Number,
    required: true,
    min: 0,
  },
  tradeCount: {
    type: Number,
    required: true,
    min: 0,
  },
  tags: [{
    type: String,
    trim: true,
  }],
});

const marketInsightSchema = new Schema<IMarketInsight>({
  market: {
    type: String,
    required: true,
  },
  timeframe: {
    type: String,
    required: true,
  },
  condition: {
    type: String,
    required: true,
  },
  bias: {
    type: String,
    required: true,
  },
  keyLevels: [{
    type: Number,
  }],
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  description: {
    type: String,
    required: true,
  },
});

const behavioralPatternSchema = new Schema<IBehavioralPattern>({
  pattern: {
    type: String,
    required: true,
  },
  impact: {
    type: String,
    enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'],
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  description: {
    type: String,
    required: true,
  },
  suggestedActions: [{
    type: String,
    required: true,
  }],
});

const analysisResultSchema = new Schema<IAnalysisResult>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    period: {
      start: {
        type: Date,
        required: true,
      },
      end: {
        type: Date,
        required: true,
      },
    },
    tradePatterns: [tradePatternSchema],
    marketInsights: [marketInsightSchema],
    behavioralPatterns: [behavioralPatternSchema],
    performance: {
      totalTrades: {
        type: Number,
        required: true,
        min: 0,
      },
      winRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      profitFactor: {
        type: Number,
        required: true,
        min: 0,
      },
      averageRR: {
        type: Number,
        required: true,
        min: 0,
      },
      largestWin: {
        type: Number,
        required: true,
      },
      largestLoss: {
        type: Number,
        required: true,
      },
      averageWin: {
        type: Number,
        required: true,
      },
      averageLoss: {
        type: Number,
        required: true,
      },
      expectancy: {
        type: Number,
        required: true,
      },
    },
    recommendations: [{
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      priority: {
        type: String,
        enum: ['HIGH', 'MEDIUM', 'LOW'],
        required: true,
      },
      category: {
        type: String,
        enum: ['RISK', 'STRATEGY', 'PSYCHOLOGY', 'GENERAL'],
        required: true,
      },
      actionItems: [{
        type: String,
        required: true,
      }],
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
analysisResultSchema.index({ userId: 1, 'period.start': -1 });
analysisResultSchema.index({ userId: 1, 'period.end': -1 });
analysisResultSchema.index({ userId: 1, createdAt: -1 });

export const AnalysisResult = mongoose.model<IAnalysisResult>('AnalysisResult', analysisResultSchema); 