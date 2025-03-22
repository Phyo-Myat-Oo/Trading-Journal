import { Document } from 'mongoose';

export interface IBaseModel extends Document {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends IBaseModel {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLogin?: Date;
}

export interface ITrade extends IBaseModel {
  userId: string;
  symbol: string;
  type: 'buy' | 'sell';
  entry: number;
  exit: number;
  quantity: number;
  date: Date;
  profit: number;
  notes?: string;
  tags?: string[];
}

export interface IAnalysis extends IBaseModel {
  userId: string;
  tradeId: string;
  metrics: {
    riskRewardRatio: number;
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
  };
  period: {
    start: Date;
    end: Date;
  };
}

export interface IAccount extends IBaseModel {
  userId: string;
  balance: number;
  currency: string;
  broker: string;
  isActive: boolean;
}

export interface IJournalEntry extends IBaseModel {
  userId: string;
  tradeId?: string;
  title: string;
  content: string;
  mood?: 'positive' | 'neutral' | 'negative';
  tags?: string[];
}

export interface IStatistics extends IBaseModel {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    profitFactor: number;
    totalProfit: number;
    averageProfit: number;
    largestWin: number;
    largestLoss: number;
    averageWin: number;
    averageLoss: number;
  };
} 