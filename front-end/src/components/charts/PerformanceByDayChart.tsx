import { useMemo } from 'react';
import { Trade } from '../../types/trade';

interface PerformanceByDayChartProps {
  trades: Trade[];
}

export function PerformanceByDayChart({ trades }: PerformanceByDayChartProps) {
  // Calculate performance by day of week
  const performanceByDay = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const performance: Record<string, { profit: number, count: number }> = {};
    
    // Initialize all days
    days.forEach(day => {
      performance[day] = { profit: 0, count: 0 };
    });
    
    // Process trades
    trades.forEach(trade => {
      const date = new Date(trade.date);
      const day = days[date.getDay()];
      
      performance[day].profit += trade.return;
      performance[day].count += 1;
    });
    
    return performance;
  }, [trades]);
  
  // Find the max profit for scaling
  const maxValue = useMemo(() => {
    const values = Object.values(performanceByDay).map(p => Math.abs(p.profit));
    return Math.max(...values, 100); // Minimum of 100 for better visuals
  }, [performanceByDay]);
  
  return (
    <div className="w-full h-full">
      <div className="flex h-full">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between text-xs text-gray-400 pr-2">
          {[...Array(6)].map((_, i) => {
            const value = Math.round(maxValue - (i * (maxValue / 5)));
            return (
              <div key={i} className="h-6 flex items-center">
                {value}
              </div>
            );
          })}
        </div>
        
        {/* Chart bars */}
        <div className="flex-1 flex items-end">
          {Object.entries(performanceByDay).map(([day, data]) => {
            const barHeight = data.profit === 0 ? 0 : Math.abs(data.profit) / maxValue * 100;
            const isPositive = data.profit >= 0;
            
            return (
              <div key={day} className="flex flex-col items-center flex-1 px-1">
                {/* Bar */}
                <div className="w-full flex flex-col justify-end h-[calc(100%-30px)]">
                  <div 
                    className={`w-full ${isPositive ? 'bg-green-400' : 'bg-red-400'} opacity-80 rounded-sm`} 
                    style={{ height: `${barHeight}%` }}
                  ></div>
                </div>
                
                {/* Day label */}
                <div className="text-xs text-gray-400 mt-2">{day.substring(0, 3)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 