/**
 * Statistics Service Module
 * 
 * Provides advanced trade analytics and performance calculation functions
 * for analyzing trading activity and generating insights.
 */
import { Types } from 'mongoose';
import { Trade } from '../models/Trade';
import { JournalEntry } from '../models/JournalEntry';
import { logger } from '../utils/logger';

// Interfaces for trade statistics
export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  profitFactor: number;
  averageReturn: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  totalNetProfit: number;
  totalGrossProfit: number;
  totalGrossLoss: number;
  expectancy: number;
  standardDeviation: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  averageTradeDuration: number;
}

export interface SymbolPerformance {
  symbol: string;
  totalTrades: number;
  winRate: number;
  netProfit: number;
  averageReturn: number;
  profitFactor: number;
}

export interface TimeAnalysis {
  period: string; // hour of day or day of week
  totalTrades: number;
  winRate: number;
  netProfit: number;
  averageReturn: number;
}

export interface RiskMetrics {
  maxDrawdown: number;
  maxDrawdownPercentage: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitToMaxDrawdownRatio: number;
  dailyReturns: { date: string; return: number }[];
}

/**
 * Service for calculating trade statistics and performance metrics
 * 
 * This service provides methods to analyze trading performance from various angles:
 * - Overall performance metrics (win rate, profit factor, etc.)
 * - Symbol-specific analysis
 * - Time-based analysis (hour of day, day of week)
 * - Risk metrics (drawdown, Sharpe ratio, etc.)
 * - Journal correlation analysis
 */
export class StatisticsService {
  /**
   * Calculate basic trade statistics for a user within a date range
   * 
   * This comprehensive analysis includes:
   * - Win/loss metrics
   * - Profit and return calculations
   * - Risk/reward analysis
   * - Trade sequencing patterns
   * 
   * @param userId - User ID to analyze
   * @param startDate - Start of analysis period
   * @param endDate - End of analysis period  
   * @param accountId - Optional account filter
   * @returns Complete trade statistics object
   */
  static async calculateTradeStats(
    userId: string,
    startDate: Date,
    endDate: Date,
    accountId?: string
  ): Promise<TradeStats> {
    try {
      // Create match query for the trades
      const matchQuery: any = {
        userId: new Types.ObjectId(userId),
        exitDate: { $exists: true, $ne: null, $gte: startDate, $lte: endDate }
      };
      
      // Add account filter if specified
      if (accountId) {
        matchQuery.accountId = new Types.ObjectId(accountId);
      }
      
      // Get completed trades within the date range
      const trades = await Trade.find(matchQuery).lean();
      
      // Return empty stats if no trades found
      if (trades.length === 0) {
        return {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          breakEvenTrades: 0,
          winRate: 0,
          profitFactor: 0,
          averageReturn: 0,
          averageWin: 0,
          averageLoss: 0,
          largestWin: 0,
          largestLoss: 0,
          totalNetProfit: 0,
          totalGrossProfit: 0,
          totalGrossLoss: 0,
          expectancy: 0,
          standardDeviation: 0,
          consecutiveWins: 0,
          consecutiveLosses: 0,
          averageTradeDuration: 0
        };
      }
      
      // Calculate basic win/loss statistics
      const totalTrades = trades.length;
      const winningTrades = trades.filter((t: any) => t.profitLoss! > 0).length;
      const losingTrades = trades.filter((t: any) => t.profitLoss! < 0).length;
      const breakEvenTrades = totalTrades - winningTrades - losingTrades;
      
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
      
      // Calculate profit metrics (gross profit, gross loss, net profit)
      const totalGrossProfit = trades
        .filter((trade: any) => trade.profitLoss! > 0)
        .reduce((sum: number, trade: any) => sum + trade.profitLoss!, 0);
        
      const totalGrossLoss = Math.abs(trades
        .filter((trade: any) => trade.profitLoss! < 0)
        .reduce((sum: number, trade: any) => sum + trade.profitLoss!, 0));
        
      const totalNetProfit = totalGrossProfit - totalGrossLoss;
      
      // Profit factor = gross profit / gross loss (infinity if no losses)
      const profitFactor = totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : totalGrossProfit > 0 ? Infinity : 0;
      
      // Calculate average metrics
      const averageReturn = totalTrades > 0 ? totalNetProfit / totalTrades : 0;
      const averageWin = winningTrades > 0 
        ? trades.filter((t: any) => t.profitLoss! > 0).reduce((sum: number, t: any) => sum + t.profitLoss!, 0) / winningTrades 
        : 0;
      const averageLoss = losingTrades > 0 
        ? trades.filter((t: any) => t.profitLoss! < 0).reduce((sum: number, t: any) => sum + t.profitLoss!, 0) / losingTrades 
        : 0;
      
      // Find extreme values
      const largestWin = Math.max(...trades.map((t: any) => t.profitLoss! > 0 ? t.profitLoss! : 0), 0);
      const largestLoss = Math.min(...trades.map((t: any) => t.profitLoss! < 0 ? t.profitLoss! : 0), 0);
      
      // Calculate expectancy (average expected outcome per trade)
      // Formula: win rate × average win + (1 - win rate) × average loss
      const expectancy = winRate * averageWin + (1 - winRate) * averageLoss;
      
      // Calculate risk metrics - standard deviation of returns
      const returns = trades.map((t: any) => t.profitLoss!);
      const standardDeviation = this.calculateStandardDeviation(returns);
      
      // Analyze trade sequences to find consecutive wins/losses
      let maxConsecutiveWins = 0;
      let maxConsecutiveLosses = 0;
      let currentWins = 0;
      let currentLosses = 0;
      
      // Sort trades by exit date
      const sortedTrades = [...trades].sort((a, b) => 
        a.exitDate!.getTime() - b.exitDate!.getTime()
      );
      
      for (const trade of sortedTrades) {
        if (trade.profitLoss! > 0) {
          currentWins++;
          currentLosses = 0;
          maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
        } else if (trade.profitLoss! < 0) {
          currentLosses++;
          currentWins = 0;
          maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
        } else {
          currentWins = 0;
          currentLosses = 0;
        }
      }
      
      // Calculate average trade duration
      const averageTradeDuration = trades.reduce((sum, trade) => {
        if (trade.entryDate && trade.exitDate) {
          return sum + (trade.exitDate.getTime() - trade.entryDate.getTime());
        }
        return sum;
      }, 0) / (trades.length * 86400000); // Convert milliseconds to days
      
      return {
        totalTrades,
        winningTrades,
        losingTrades,
        breakEvenTrades,
        winRate,
        profitFactor,
        averageReturn,
        averageWin,
        averageLoss,
        largestWin,
        largestLoss,
        totalNetProfit,
        totalGrossProfit,
        totalGrossLoss,
        expectancy,
        standardDeviation,
        consecutiveWins: maxConsecutiveWins,
        consecutiveLosses: maxConsecutiveLosses,
        averageTradeDuration
      };
    } catch (error) {
      logger.error('Error calculating trade statistics:', error);
      throw error;
    }
  }
  
  /**
   * Analyze performance by trading symbol
   */
  static async analyzeSymbolPerformance(
    userId: string,
    startDate: Date,
    endDate: Date,
    accountId?: string
  ): Promise<SymbolPerformance[]> {
    try {
      // Create match query for the trades
      const matchQuery: any = {
        userId: new Types.ObjectId(userId),
        exitDate: { $exists: true, $ne: null, $gte: startDate, $lte: endDate }
      };
      
      // Add account filter if specified
      if (accountId) {
        matchQuery.accountId = new Types.ObjectId(accountId);
      }
      
      // Get completed trades within the date range
      const trades = await Trade.find(matchQuery).lean();
      
      if (trades.length === 0) {
        return [];
      }
      
      // Group trades by symbol
      const symbolMap = new Map<string, any[]>();
      
      trades.forEach(trade => {
        if (!trade.symbol) return;
        
        if (!symbolMap.has(trade.symbol)) {
          symbolMap.set(trade.symbol, []);
        }
        
        symbolMap.get(trade.symbol)!.push(trade);
      });
      
      // Calculate statistics for each symbol
      const symbolStats: SymbolPerformance[] = [];
      
      for (const [symbol, symbolTrades] of symbolMap.entries()) {
        const totalTrades = symbolTrades.length;
        const winningTrades = symbolTrades.filter(t => t.profitLoss! > 0).length;
        const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
        
        const netProfit = symbolTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
        const averageReturn = totalTrades > 0 ? netProfit / totalTrades : 0;
        
        const grossProfit = symbolTrades
          .filter(t => t.profitLoss! > 0)
          .reduce((sum, t) => sum + t.profitLoss!, 0);
          
        const grossLoss = Math.abs(symbolTrades
          .filter(t => t.profitLoss! < 0)
          .reduce((sum, t) => sum + t.profitLoss!, 0));
          
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
        
        symbolStats.push({
          symbol,
          totalTrades,
          winRate,
          netProfit,
          averageReturn,
          profitFactor
        });
      }
      
      // Sort by total trades descending
      return symbolStats.sort((a, b) => b.totalTrades - a.totalTrades);
    } catch (error) {
      logger.error('Error analyzing symbol performance:', error);
      throw error;
    }
  }
  
  /**
   * Analyze performance by time of day
   */
  static async analyzeTimeOfDay(
    userId: string,
    startDate: Date,
    endDate: Date,
    accountId?: string
  ): Promise<TimeAnalysis[]> {
    try {
      // Create match query for the trades
      const matchQuery: any = {
        userId: new Types.ObjectId(userId),
        entryDate: { $exists: true, $ne: null },
        exitDate: { $exists: true, $ne: null, $gte: startDate, $lte: endDate }
      };
      
      // Add account filter if specified
      if (accountId) {
        matchQuery.accountId = new Types.ObjectId(accountId);
      }
      
      // Get completed trades within the date range
      const trades = await Trade.find(matchQuery).lean();
      
      if (trades.length === 0) {
        return [];
      }
      
      // Group trades by hour of entry
      const hourMap = new Map<number, any[]>();
      
      for (let hour = 0; hour < 24; hour++) {
        hourMap.set(hour, []);
      }
      
      trades.forEach(trade => {
        if (!trade.entryDate) return;
        
        const hour = trade.entryDate.getHours();
        hourMap.get(hour)!.push(trade);
      });
      
      // Calculate statistics for each hour
      const timeStats: TimeAnalysis[] = [];
      
      for (const [hour, hourTrades] of hourMap.entries()) {
        const totalTrades = hourTrades.length;
        
        if (totalTrades === 0) {
          timeStats.push({
            period: `${hour}:00`,
            totalTrades: 0,
            winRate: 0,
            netProfit: 0,
            averageReturn: 0
          });
          continue;
        }
        
        const winningTrades = hourTrades.filter(t => t.profitLoss! > 0).length;
        const winRate = winningTrades / totalTrades;
        
        const netProfit = hourTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
        const averageReturn = netProfit / totalTrades;
        
        timeStats.push({
          period: `${hour}:00`,
          totalTrades,
          winRate,
          netProfit,
          averageReturn
        });
      }
      
      // Sort by hour
      return timeStats.sort((a, b) => {
        const hourA = parseInt(a.period.split(':')[0]);
        const hourB = parseInt(b.period.split(':')[0]);
        return hourA - hourB;
      });
    } catch (error) {
      logger.error('Error analyzing time of day performance:', error);
      throw error;
    }
  }
  
  /**
   * Analyze performance by day of week
   */
  static async analyzeDayOfWeek(
    userId: string,
    startDate: Date,
    endDate: Date,
    accountId?: string
  ): Promise<TimeAnalysis[]> {
    try {
      // Create match query for the trades
      const matchQuery: any = {
        userId: new Types.ObjectId(userId),
        entryDate: { $exists: true, $ne: null },
        exitDate: { $exists: true, $ne: null, $gte: startDate, $lte: endDate }
      };
      
      // Add account filter if specified
      if (accountId) {
        matchQuery.accountId = new Types.ObjectId(accountId);
      }
      
      // Get completed trades within the date range
      const trades = await Trade.find(matchQuery).lean();
      
      if (trades.length === 0) {
        return [];
      }
      
      // Array of day names
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Group trades by day of week of entry
      const dayMap = new Map<number, any[]>();
      
      for (let day = 0; day < 7; day++) {
        dayMap.set(day, []);
      }
      
      trades.forEach(trade => {
        if (!trade.entryDate) return;
        
        const day = trade.entryDate.getDay();
        dayMap.get(day)!.push(trade);
      });
      
      // Calculate statistics for each day
      const dayStats: TimeAnalysis[] = [];
      
      for (const [day, dayTrades] of dayMap.entries()) {
        const totalTrades = dayTrades.length;
        
        if (totalTrades === 0) {
          dayStats.push({
            period: dayNames[day],
            totalTrades: 0,
            winRate: 0,
            netProfit: 0,
            averageReturn: 0
          });
          continue;
        }
        
        const winningTrades = dayTrades.filter(t => t.profitLoss! > 0).length;
        const winRate = winningTrades / totalTrades;
        
        const netProfit = dayTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
        const averageReturn = netProfit / totalTrades;
        
        dayStats.push({
          period: dayNames[day],
          totalTrades,
          winRate,
          netProfit,
          averageReturn
        });
      }
      
      // Sort by day of week (starting with Monday)
      return dayStats.sort((a, b) => {
        const dayIndexA = dayNames.indexOf(a.period);
        const dayIndexB = dayNames.indexOf(b.period);
        
        // Reorder so Monday is first (1, 2, 3, 4, 5, 6, 0)
        const orderA = dayIndexA === 0 ? 7 : dayIndexA;
        const orderB = dayIndexB === 0 ? 7 : dayIndexB;
        
        return orderA - orderB;
      });
    } catch (error) {
      logger.error('Error analyzing day of week performance:', error);
      throw error;
    }
  }
  
  /**
   * Calculate risk metrics including drawdown, Sharpe ratio, etc.
   */
  static async calculateRiskMetrics(
    userId: string,
    startDate: Date,
    endDate: Date,
    accountId?: string
  ): Promise<RiskMetrics> {
    try {
      // Create match query for the trades
      const matchQuery: any = {
        userId: new Types.ObjectId(userId),
        exitDate: { $exists: true, $ne: null, $gte: startDate, $lte: endDate }
      };
      
      // Add account filter if specified
      if (accountId) {
        matchQuery.accountId = new Types.ObjectId(accountId);
      }
      
      // Get completed trades within the date range
      const trades = await Trade.find(matchQuery)
        .sort({ exitDate: 1 })
        .lean();
      
      if (trades.length === 0) {
        return {
          maxDrawdown: 0,
          maxDrawdownPercentage: 0,
          sharpeRatio: 0,
          sortinoRatio: 0,
          profitToMaxDrawdownRatio: 0,
          dailyReturns: []
        };
      }
      
      // Calculate drawdown metrics
      let runningBalance = 0;
      let peak = 0;
      let maxDrawdown = 0;
      let maxDrawdownPercent = 0;
      
      // Calculate daily returns for Sharpe/Sortino ratios
      const dailyReturnsMap = new Map<string, number>();
      
      trades.forEach(trade => {
        if (!trade.exitDate || !trade.profitLoss) return;
        
        // Update running balance
        runningBalance += trade.profitLoss;
        
        // Update peak if new high
        if (runningBalance > peak) {
          peak = runningBalance;
        }
        
        // Calculate current drawdown
        const currentDrawdown = peak - runningBalance;
        const currentDrawdownPercent = peak > 0 ? (currentDrawdown / peak) * 100 : 0;
        
        // Update max drawdown if this is a new max
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
          maxDrawdownPercent = currentDrawdownPercent;
        }
        
        // Group returns by day for Sharpe ratio calculation
        const dateStr = trade.exitDate.toISOString().slice(0, 10);
        
        if (!dailyReturnsMap.has(dateStr)) {
          dailyReturnsMap.set(dateStr, 0);
        }
        
        dailyReturnsMap.set(dateStr, dailyReturnsMap.get(dateStr)! + trade.profitLoss);
      });
      
      // Calculate total net profit
      const totalNetProfit = runningBalance;
      
      // Convert daily returns map to array for calculations
      const dailyReturns = Array.from(dailyReturnsMap.entries())
        .map(([date, profit]) => ({ date, return: profit }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Calculate Sharpe ratio (assuming risk-free rate of 0 for simplicity)
      const returns = dailyReturns.map(day => day.return);
      const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const standardDeviation = this.calculateStandardDeviation(returns);
      
      const sharpeRatio = standardDeviation > 0 ? averageReturn / standardDeviation : 0;
      
      // Calculate Sortino ratio (only negative returns for denominator)
      const negativeReturns = returns.filter(ret => ret < 0);
      const downsideDeviation = this.calculateStandardDeviation(negativeReturns);
      
      const sortinoRatio = downsideDeviation > 0 ? averageReturn / downsideDeviation : 0;
      
      // Calculate profit to max drawdown ratio
      const profitToMaxDrawdownRatio = maxDrawdown > 0 ? totalNetProfit / maxDrawdown : 0;
      
      return {
        maxDrawdown,
        maxDrawdownPercentage: maxDrawdownPercent,
        sharpeRatio,
        sortinoRatio,
        profitToMaxDrawdownRatio,
        dailyReturns
      };
    } catch (error) {
      logger.error('Error calculating risk metrics:', error);
      throw error;
    }
  }
  
  /**
   * Analyze correlation between journal entries and trade performance
   */
  static async analyzeJournalCorrelation(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      // Get journal entries within the date range
      const journalEntries = await JournalEntry.find({
        userId: new Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Get trades within the date range
      const trades = await Trade.find({
        userId: new Types.ObjectId(userId),
        exitDate: { $exists: true, $ne: null, $gte: startDate, $lte: endDate }
      }).lean();
      
      if (journalEntries.length === 0 || trades.length === 0) {
        return {
          correlations: [],
          summary: "Not enough data to analyze correlation"
        };
      }
      
      // Create a map of journal entries by date
      const journalByDate = new Map();
      journalEntries.forEach(entry => {
        const dateStr = entry.date.toISOString().slice(0, 10);
        if (!journalByDate.has(dateStr)) {
          journalByDate.set(dateStr, []);
        }
        journalByDate.get(dateStr).push(entry);
      });
      
      // Create a map of trades by date
      const tradesByDate = new Map();
      trades.forEach(trade => {
        if (!trade.exitDate) return;
        
        const dateStr = trade.exitDate.toISOString().slice(0, 10);
        if (!tradesByDate.has(dateStr)) {
          tradesByDate.set(dateStr, []);
        }
        tradesByDate.get(dateStr).push(trade);
      });
      
      // Analyze correlation by date
      const dailyAnalysis = [];
      
      // Get all unique dates
      const allDates = new Set([
        ...journalByDate.keys(),
        ...tradesByDate.keys()
      ]);
      
      for (const dateStr of allDates) {
        const entriesForDay = journalByDate.get(dateStr) || [];
        const tradesForDay = tradesByDate.get(dateStr) || [];
        
        if (entriesForDay.length === 0 || tradesForDay.length === 0) {
          continue;
        }
        
        // Calculate trade performance for the day
        const winningTrades = tradesForDay.filter((t: any) => t.profitLoss! > 0).length;
        const totalTrades = tradesForDay.length;
        const dayWinRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
        const netProfit = tradesForDay.reduce((sum: number, t: any) => sum + (t.profitLoss || 0), 0);
        
        // Extract journal sentiment (if available)
        let sentiment = null;
        if (entriesForDay[0].sentiment) {
          sentiment = entriesForDay[0].sentiment;
        }
        
        // Extract journal mood (if available)
        let mood = null;
        if (entriesForDay[0].mood) {
          mood = entriesForDay[0].mood;
        }
        
        // Extract journal tags
        const tags = entriesForDay.flatMap((entry: any) => entry.tags || []);
        
        dailyAnalysis.push({
          date: dateStr,
          sentiment,
          mood,
          tags,
          trades: totalTrades,
          winRate: dayWinRate,
          netProfit
        });
      }
      
      // Analyze correlation based on sentiment/mood if available
      const sentimentAnalysis: Record<string, {
        days: number;
        totalTrades: number;
        winningTrades: number;
        netProfit: number;
        winRate?: number;
      }> = {};
      
      const moodAnalysis: Record<string, {
        days: number;
        totalTrades: number;
        winningTrades: number;
        netProfit: number;
        winRate?: number;
      }> = {};
      
      const tagAnalysis: Record<string, {
        days: number;
        totalTrades: number;
        winningTrades: number;
        netProfit: number;
        winRate?: number;
      }> = {};
      
      // Process sentiment correlation
      dailyAnalysis.forEach(day => {
        if (day.sentiment) {
          if (!sentimentAnalysis[day.sentiment]) {
            sentimentAnalysis[day.sentiment] = {
              days: 0,
              totalTrades: 0,
              winningTrades: 0,
              netProfit: 0
            };
          }
          
          sentimentAnalysis[day.sentiment].days += 1;
          sentimentAnalysis[day.sentiment].totalTrades += day.trades;
          sentimentAnalysis[day.sentiment].winningTrades += Math.round(day.trades * day.winRate);
          sentimentAnalysis[day.sentiment].netProfit += day.netProfit;
        }
        
        if (day.mood) {
          if (!moodAnalysis[day.mood]) {
            moodAnalysis[day.mood] = {
              days: 0,
              totalTrades: 0,
              winningTrades: 0,
              netProfit: 0
            };
          }
          
          moodAnalysis[day.mood].days += 1;
          moodAnalysis[day.mood].totalTrades += day.trades;
          moodAnalysis[day.mood].winningTrades += Math.round(day.trades * day.winRate);
          moodAnalysis[day.mood].netProfit += day.netProfit;
        }
        
        // Process tags
        day.tags.forEach((tag: string) => {
          if (!tagAnalysis[tag]) {
            tagAnalysis[tag] = {
              days: 0,
              totalTrades: 0,
              winningTrades: 0,
              netProfit: 0
            };
          }
          
          tagAnalysis[tag].days += 1;
          tagAnalysis[tag].totalTrades += day.trades;
          tagAnalysis[tag].winningTrades += Math.round(day.trades * day.winRate);
          tagAnalysis[tag].netProfit += day.netProfit;
        });
      });
      
      // Calculate win rates for each category
      for (const sentiment in sentimentAnalysis) {
        sentimentAnalysis[sentiment].winRate = 
          sentimentAnalysis[sentiment].totalTrades > 0 
            ? sentimentAnalysis[sentiment].winningTrades / sentimentAnalysis[sentiment].totalTrades 
            : 0;
      }
      
      for (const mood in moodAnalysis) {
        moodAnalysis[mood].winRate = 
          moodAnalysis[mood].totalTrades > 0 
            ? moodAnalysis[mood].winningTrades / moodAnalysis[mood].totalTrades 
            : 0;
      }
      
      for (const tag in tagAnalysis) {
        tagAnalysis[tag].winRate = 
          tagAnalysis[tag].totalTrades > 0 
            ? tagAnalysis[tag].winningTrades / tagAnalysis[tag].totalTrades 
            : 0;
      }
      
      return {
        dailyAnalysis,
        sentimentCorrelation: Object.entries(sentimentAnalysis)
          .map(([sentiment, stats]) => ({
            sentiment,
            ...stats
          }))
          .sort((a, b) => (b.winRate || 0) - (a.winRate || 0)),
        moodCorrelation: Object.entries(moodAnalysis)
          .map(([mood, stats]) => ({
            mood,
            ...stats
          }))
          .sort((a, b) => (b.winRate || 0) - (a.winRate || 0)),
        tagCorrelation: Object.entries(tagAnalysis)
          .map(([tag, stats]) => ({
            tag,
            ...stats
          }))
          .sort((a, b) => (b.winRate || 0) - (a.winRate || 0))
      };
    } catch (error) {
      logger.error('Error analyzing journal correlation:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to calculate standard deviation
   */
  private static calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
    const squaredDifferences = values.map((val: number) => Math.pow(val - mean, 2));
    const variance = squaredDifferences.reduce((sum: number, val: number) => sum + val, 0) / values.length;
    
    return Math.sqrt(variance);
  }
} 