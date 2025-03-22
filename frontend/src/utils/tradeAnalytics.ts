import { Trade, TradeStatistics, TradeSetup } from '../types/trading';

export const calculateTradeMetrics = (trades: Trade[]): TradeStatistics['summary'] => {
  const winningTrades = trades.filter((t) => t.outcome === 'WIN');
  const losingTrades = trades.filter((t) => t.outcome === 'LOSS');
  const breakEvenTrades = trades.filter((t) => t.outcome === 'BE');

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? winningTrades.length / totalTrades : 0;

  const winningAmounts = winningTrades.map((t) => t.pnl?.net ?? 0);
  const losingAmounts = losingTrades.map((t) => t.pnl?.net ?? 0);

  const averageWin = winningAmounts.length > 0
    ? winningAmounts.reduce((a, b) => a + b, 0) / winningAmounts.length
    : 0;

  const averageLoss = losingAmounts.length > 0
    ? Math.abs(losingAmounts.reduce((a, b) => a + b, 0) / losingAmounts.length)
    : 0;

  const largestWin = Math.max(0, ...winningAmounts);
  const largestLoss = Math.max(0, ...losingAmounts.map(Math.abs));

  const grossPnL = trades.reduce((sum, trade) => sum + (trade.pnl?.gross ?? 0), 0);
  const totalFees = trades.reduce((sum, trade) => sum + (trade.fees ?? 0), 0);
  const netPnL = grossPnL - totalFees;

  const profitFactor = Math.abs(
    winningAmounts.reduce((a, b) => a + b, 0) /
    losingAmounts.reduce((a, b) => a + b, 0) || 0
  );

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: breakEvenTrades.length,
    winRate,
    profitFactor,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    netPnL,
    grossPnL,
    totalFees,
  };
};

export const calculateSetupMetrics = (
  trades: Trade[],
  setup: TradeSetup
): TradeSetup['metrics'] => {
  const setupTrades = trades.filter((t) => t.setupId === setup.id);
  const winningTrades = setupTrades.filter((t) => t.outcome === 'WIN');
  
  const totalTrades = setupTrades.length;
  const winRate = totalTrades > 0 ? winningTrades.length / totalTrades : 0;

  const profitFactor = Math.abs(
    setupTrades.reduce((sum, t) => sum + (t.pnl?.net ?? 0), 0) /
    setupTrades.filter((t) => t.outcome === 'LOSS')
      .reduce((sum, t) => sum + Math.abs(t.pnl?.net ?? 0), 0) || 0
  );

  const averageRR = setupTrades.reduce((sum, trade) => {
    return sum + (trade.pnl?.riskRewardRatio ?? 0);
  }, 0) / totalTrades;

  const expectancy = (winRate * averageRR) - ((1 - winRate) * 1);

  return {
    totalTrades,
    winRate,
    averageRR,
    profitFactor,
    expectancy,
  };
};

export const calculateSymbolMetrics = (trades: Trade[], symbol: string) => {
  const symbolTrades = trades.filter((t) => t.symbol === symbol);
  const winningTrades = symbolTrades.filter((t) => t.outcome === 'WIN');
  
  return {
    symbol,
    trades: symbolTrades.length,
    winRate: symbolTrades.length > 0 ? winningTrades.length / symbolTrades.length : 0,
    netPnL: symbolTrades.reduce((sum, t) => sum + (t.pnl?.net ?? 0), 0),
  };
};

export const calculateTradeStatistics = (
  trades: Trade[],
  setups: TradeSetup[],
  period: { start: string; end: string }
): TradeStatistics => {
  const periodTrades = trades.filter(
    (t) => t.entry.date >= period.start && t.entry.date <= period.end
  );

  const summary = calculateTradeMetrics(periodTrades);

  const bySetup = setups.reduce((acc, setup) => {
    const metrics = calculateSetupMetrics(periodTrades, setup);
    acc[setup.id] = {
      setupId: setup.id,
      setupName: setup.name,
      trades: metrics?.totalTrades ?? 0,
      winRate: metrics?.winRate ?? 0,
      profitFactor: metrics?.profitFactor ?? 0,
      expectancy: metrics?.expectancy ?? 0,
    };
    return acc;
  }, {} as TradeStatistics['bySetup']);

  const symbols = Array.from(new Set(periodTrades.map((t) => t.symbol)));
  const bySymbol = symbols.reduce((acc, symbol) => {
    acc[symbol] = calculateSymbolMetrics(periodTrades, symbol);
    return acc;
  }, {} as TradeStatistics['bySymbol']);

  return {
    period,
    summary,
    bySetup,
    bySymbol,
  };
}; 