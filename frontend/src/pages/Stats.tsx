import { useState, useMemo } from 'react';
import { Trade } from '../types/trade';
import { TradeFilters } from '../types/filters';
import { filterTrades } from '../utils/filter-trades';
import { DashboardFilter } from '../components/filters/DashboardFilter';
import { MetricCard } from '../components/stats/MetricCard';

// Import the chart components
import { PerformanceByDayChart } from '../components/charts/PerformanceByDayChart';
import { PerformanceByHourChart } from '../components/charts/PerformanceByHourChart';
// These components will be implemented later
// import { SymbolPerformanceTable } from '../components/tables/SymbolPerformanceTable';
// import { TagPerformanceTable } from '../components/tables/TagPerformanceTable';

export default function Stats() {
  // Default filter state
  const [filters, setFilters] = useState<TradeFilters>({
    timeFilter: 'This yr.',
    dateRange: { startDate: null, endDate: null },
    symbols: [],
    statuses: [],
    sides: []
  });

  // Mock trade data (same as Dashboard)
  const [allTrades] = useState<Trade[]>([
    {
      id: '1',
      date: '11/03/2022',
      symbol: 'PLTR',
      status: 'WIN',
      side: 'LONG',
      qty: 50,
      entry: 10.80,
      exit: 11.80,
      entryTotal: 540.00,
      exitTotal: 590.00,
      position: '-',
      hold: '1h',
      return: 50.00,
      returnPercent: 9.26,
    },
    {
      id: '2',
      date: '10/03/2022',
      symbol: 'BROS',
      status: 'WIN',
      side: 'LONG',
      qty: 50,
      entry: 44.16,
      exit: 49.00,
      entryTotal: 2208.00,
      exitTotal: 2450.00,
      position: '-',
      hold: '2h',
      return: 242.00,
      returnPercent: 10.96,
    },
    {
      id: '3',
      date: '09/11/2021',
      symbol: 'PLTR',
      status: 'LOSS',
      side: 'LONG',
      qty: 200,
      entry: 26.89,
      exit: 25.90,
      entryTotal: 5378.00,
      exitTotal: 5180.00,
      position: '-',
      hold: '30m',
      return: -198.00,
      returnPercent: -3.68,
    },
  ]);

  // Apply filters to trades
  const filteredTrades = useMemo(() => {
    return filterTrades(allTrades, filters);
  }, [allTrades, filters]);

  // Extract unique symbols for the filter
  const availableSymbols = useMemo(() => {
    return [...new Set(allTrades.map(trade => trade.symbol))];
  }, [allTrades]);

  // Calculate statistics
  const stats = useMemo(() => {
    const wins = filteredTrades.filter(t => t.status === 'WIN');
    const losses = filteredTrades.filter(t => t.status === 'LOSS');
    const totalTrades = filteredTrades.length;
    
    // Win rate
    const winRate = totalTrades > 0 ? (wins.length / totalTrades * 100) : 0;
    
    // Calculate average wins and losses
    const avgWin = wins.length > 0 
      ? wins.reduce((acc, t) => acc + t.return, 0) / wins.length 
      : 0;
    
    const avgLoss = losses.length > 0 
      ? Math.abs(losses.reduce((acc, t) => acc + t.return, 0) / losses.length)
      : 0;
    
    // Calculate expectancy (avg win * win rate - avg loss * loss rate)
    const winRateDecimal = winRate / 100;
    const lossRateDecimal = 1 - winRateDecimal;
    const expectancy = (avgWin * winRateDecimal) - (avgLoss * lossRateDecimal);
    
    // Calculate profit factor
    const totalWins = wins.reduce((acc, t) => acc + t.return, 0);
    const totalLosses = Math.abs(losses.reduce((acc, t) => acc + t.return, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    
    // Calculate hold times
    // For demo, let's parse the hold time strings into minutes
    const parseHoldTime = (holdStr: string): number => {
      if (holdStr.includes('m')) {
        return parseInt(holdStr);
      } else if (holdStr.includes('h')) {
        return parseInt(holdStr) * 60;
      } else if (holdStr.includes('d')) {
        return parseInt(holdStr) * 24 * 60;
      }
      return 0;
    };
    
    const winHoldTimes = wins.map(t => parseHoldTime(t.hold));
    const lossHoldTimes = losses.map(t => parseHoldTime(t.hold));
    
    const avgWinHold = winHoldTimes.length > 0 
      ? winHoldTimes.reduce((a, b) => a + b, 0) / winHoldTimes.length
      : 0;
    
    const avgLossHold = lossHoldTimes.length > 0
      ? lossHoldTimes.reduce((a, b) => a + b, 0) / lossHoldTimes.length
      : 0;
    
    // Format hold time to display (convert minutes back to days/hours)
    const formatHoldTime = (minutes: number): string => {
      if (minutes >= 1440) { // >= 1 day
        return `${(minutes / 1440).toFixed(1)} Days`;
      } else {
        return `${(minutes / 60).toFixed(1)} Days`;
      }
    };
    
    // Win/Loss streak
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    
    // Sort trades by date descending
    const sortedTrades = [...filteredTrades].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    sortedTrades.forEach((trade, index) => {
      if (index === 0) {
        currentStreak = trade.status === 'WIN' ? 1 : -1;
      } else {
        if (trade.status === 'WIN' && currentStreak > 0) {
          currentStreak++;
        } else if (trade.status === 'LOSS' && currentStreak < 0) {
          currentStreak--;
        } else {
          currentStreak = trade.status === 'WIN' ? 1 : -1;
        }
      }
      
      if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
      if (currentStreak < maxLossStreak) maxLossStreak = currentStreak;
    });
    
    // Top win/loss
    const topWin = wins.length > 0 
      ? wins.reduce((max, t) => t.return > max.return ? t : max, wins[0])
      : null;
    
    const topLoss = losses.length > 0
      ? losses.reduce((min, t) => t.return < min.return ? t : min, losses[0])
      : null;
    
    // Calculate volume stats
    const totalVolume = filteredTrades.reduce((sum, t) => sum + t.qty, 0);
    const avgDailyVol = totalTrades > 0 ? Math.round(totalVolume / totalTrades) : 0;
    const avgSize = totalTrades > 0 ? Math.round(filteredTrades.reduce((sum, t) => sum + t.entryTotal, 0) / totalTrades) : 0;
    
    return {
      winRate,
      expectancy,
      profitFactor,
      avgWinHold: formatHoldTime(avgWinHold),
      avgLossHold: formatHoldTime(avgLossHold),
      avgWin,
      avgLoss,
      winStreak: maxWinStreak,
      lossStreak: Math.abs(maxLossStreak),
      topWin,
      topLoss,
      avgDailyVol,
      avgSize
    };
  }, [filteredTrades]);

  // Render the stats page
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filter Section */}
      <DashboardFilter 
        filters={filters}
        onFilterChange={setFilters}
        availableSymbols={availableSymbols}
      />
      
      {/* Statistics Overview Cards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Win Rate */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="w-1 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <h3 className="text-gray-400 text-xs font-medium">WIN RATE</h3>
              <p className="text-2xl text-white font-semibold mt-1">{stats.winRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>
        
        {/* Expectancy */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="w-1 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <h3 className="text-gray-400 text-xs font-medium">EXPECTANCY</h3>
              <p className="text-2xl text-white font-semibold mt-1">{stats.expectancy.toFixed(0)}</p>
            </div>
          </div>
        </div>
        
        {/* Profit Factor */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="w-1 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <h3 className="text-gray-400 text-xs font-medium">PROFIT FACTOR</h3>
              <p className="text-2xl text-white font-semibold mt-1">
                {isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Avg Win Hold */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="w-1 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <h3 className="text-gray-400 text-xs font-medium">AVG WIN HOLD</h3>
              <p className="text-2xl text-white font-semibold mt-1">{stats.avgWinHold}</p>
            </div>
          </div>
        </div>
        
        {/* Avg Loss Hold */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="w-1 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <h3 className="text-gray-400 text-xs font-medium">AVG LOSS HOLD</h3>
              <p className="text-2xl text-white font-semibold mt-1">{stats.avgLossHold}</p>
            </div>
          </div>
        </div>
        
        {/* Avg Loss */}
        <MetricCard
          title="AVG LOSS"
          value={`$${stats.avgLoss.toFixed(2)} (-${stats.avgLoss > 0 ? (stats.avgLoss / stats.avgSize * 100).toFixed(1) : 0}%)`}
          color="red"
          showProgressBar={false}
        />
        
        {/* Avg Win */}
        <MetricCard
          title="AVG WIN"
          value={`$${stats.avgWin.toFixed(2)} (${stats.avgWin > 0 ? (stats.avgWin / stats.avgSize * 100).toFixed(1) : 0}%)`}
          color="green"
          showProgressBar={false}
        />
      </div>
      
      {/* Statistics Overview Cards - Bottom Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Win Streak */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="w-1 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <h3 className="text-gray-400 text-xs font-medium">WIN STREAK</h3>
              <p className="text-2xl text-white font-semibold mt-1">{stats.winStreak}</p>
            </div>
          </div>
        </div>
        
        {/* Loss Streak */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="w-1 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <h3 className="text-gray-400 text-xs font-medium">LOSS STREAK</h3>
              <p className="text-2xl text-white font-semibold mt-1">{stats.lossStreak}</p>
            </div>
          </div>
        </div>
        
        {/* Top Loss */}
        <MetricCard
          title="TOP LOSS"
          value={`$${stats.topLoss ? Math.abs(stats.topLoss.return).toFixed(2) : '0.00'} (-${stats.topLoss ? Math.abs(stats.topLoss.returnPercent).toFixed(1) : '0.0'}%)`}
          color="red"
          showProgressBar={false}
        />
        
        {/* Top Win */}
        <MetricCard
          title="TOP WIN"
          value={`$${stats.topWin ? stats.topWin.return.toFixed(2) : '0.00'} (${stats.topWin ? stats.topWin.returnPercent.toFixed(1) : '0.0'}%)`}
          color="green"
          showProgressBar={false}
        />
        
        {/* Avg Daily Vol */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="w-1 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <h3 className="text-gray-400 text-xs font-medium">AVG DAILY VOL</h3>
              <p className="text-2xl text-white font-semibold mt-1">{stats.avgDailyVol}</p>
            </div>
          </div>
        </div>
        
        {/* Avg Size */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="w-1 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <h3 className="text-gray-400 text-xs font-medium">AVG SIZE</h3>
              <p className="text-2xl text-white font-semibold mt-1">{stats.avgSize}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Performance by Day of Week Chart */}
      <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
        <h3 className="text-gray-300 text-sm font-medium mb-4">PERFORMANCE BY DAY OF WEEK</h3>
        <div className="h-72">
          <PerformanceByDayChart trades={filteredTrades} />
        </div>
      </div>
      
      {/* Performance by Hour Chart */}
      <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
        <h3 className="text-gray-300 text-sm font-medium mb-4">PERFORMANCE BY HOUR</h3>
        <div className="h-72">
          <PerformanceByHourChart trades={filteredTrades} />
        </div>
      </div>
      
      {/* Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Tag Performance Table */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="text-left text-[10px] sm:text-xs text-gray-400 border-b border-[#282C34]">
                  <th className="p-3 sm:p-4 font-medium">Tag</th>
                  <th className="p-3 sm:p-4 font-medium">Trades</th>
                  <th className="p-3 sm:p-4 font-medium">PnL</th>
                  <th className="p-3 sm:p-4 font-medium">PnL %</th>
                  <th className="p-3 sm:p-4 font-medium">Weighted %</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-[11px] sm:text-sm border-b border-[#282C34]">
                  <td className="p-3 sm:p-4 text-gray-300">--NO TAGS--</td>
                  <td className="p-3 sm:p-4 text-gray-300">10</td>
                  <td className="p-3 sm:p-4 text-green-400">$94.00</td>
                  <td className="p-3 sm:p-4 text-green-400">2.79%</td>
                  <td className="p-3 sm:p-4 text-gray-300">100.00%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Symbol Performance Table */}
        <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="text-left text-[10px] sm:text-xs text-gray-400 border-b border-[#282C34]">
                  <th className="p-3 sm:p-4 font-medium">Symbol</th>
                  <th className="p-3 sm:p-4 font-medium">Trades</th>
                  <th className="p-3 sm:p-4 font-medium">PnL</th>
                  <th className="p-3 sm:p-4 font-medium">PnL %</th>
                  <th className="p-3 sm:p-4 font-medium">Weighted %</th>
                </tr>
              </thead>
              <tbody>
                {availableSymbols.map((symbol) => {
                  const symbolTrades = filteredTrades.filter(t => t.symbol === symbol);
                  const totalPnL = symbolTrades.reduce((sum, t) => sum + t.return, 0);
                  const totalPnLPercent = symbolTrades.reduce((sum, t) => sum + t.returnPercent, 0);
                  const weightedPercent = (symbolTrades.length / filteredTrades.length) * 100;
                  
                  return (
                    <tr key={symbol} className="text-[11px] sm:text-sm border-b border-[#282C34]">
                      <td className="p-3 sm:p-4 text-blue-400">{symbol}</td>
                      <td className="p-3 sm:p-4 text-gray-300">{symbolTrades.length}</td>
                      <td className={`p-3 sm:p-4 ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${Math.abs(totalPnL).toFixed(2)}
                      </td>
                      <td className={`p-3 sm:p-4 ${totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {totalPnLPercent.toFixed(2)}%
                      </td>
                      <td className="p-3 sm:p-4 text-gray-300">{weightedPercent.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 