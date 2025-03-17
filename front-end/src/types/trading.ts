export type TradeDirection = 'LONG' | 'SHORT';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type TradeOutcome = 'WIN' | 'LOSS' | 'BE';

export interface Trade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  status: TradeStatus;
  outcome?: TradeOutcome;
  entry: {
    price: number;
    date: string;
    quantity: number;
  };
  exit?: {
    price: number;
    date: string;
    quantity: number;
  };
  stopLoss: number;
  takeProfit: number;
  fees: number;
  pnl?: {
    gross: number;
    net: number;
    riskRewardRatio?: number;
  };
  setupId?: string;
  notes: string;
  images?: string[];
  tags: string[];
}

export interface TradeSetup {
  id: string;
  name: string;
  description: string;
  rules: string[];
  tags: string[];
  metrics?: {
    totalTrades: number;
    winRate: number;
    averageRR: number;
    profitFactor: number;
    expectancy: number;
  };
}

export interface DayNote {
  id: string;
  date: string;
  marketCondition: string;
  bias: string;
  notes: string;
  keyLevels?: {
    price: number;
    description: string;
  }[];
  images?: string[];
}

export interface TradeStatistics {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    breakEvenTrades: number;
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    netPnL: number;
    grossPnL: number;
    totalFees: number;
  };
  bySetup: Record<string, {
    setupId: string;
    setupName: string;
    trades: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
  }>;
  bySymbol: Record<string, {
    symbol: string;
    trades: number;
    winRate: number;
    netPnL: number;
  }>;
} 