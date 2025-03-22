export type TradeDirection = 'LONG' | 'SHORT';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type TradeOutcome = 'WIN' | 'LOSS' | 'BE';

export interface Trade {
  id: string;
  accountId: string;
  market: 'STOCK' | 'OPTION' | 'CRYPTO' | 'FOREX';
  symbol: string;
  side: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED';
  entries: {
    datetime: string;
    price: number;
    quantity: number;
    fee: number;
    action: 'BUY' | 'SELL';
  }[];
  target: number;
  stopLoss: number;
  notes: string;
  tags: string[];
  screenshots: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface TradeSetup {
  id: string;
  market: 'STOCK' | 'OPTION' | 'CRYPTO' | 'FOREX';
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry: number;
  target: number;
  stopLoss: number;
  note: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DayNote {
  id: string;
  date: string;
  mood: 'GOOD' | 'NEUTRAL' | 'BAD';
  marketCondition: 'TRENDING' | 'CHOPPY' | 'RANGING';
  marketVolatility: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
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