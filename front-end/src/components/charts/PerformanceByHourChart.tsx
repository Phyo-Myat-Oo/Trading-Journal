import { useMemo } from 'react';
import { Trade } from '../../types/trade';

interface PerformanceByHourChartProps {
  trades: Trade[];
}

export function PerformanceByHourChart({ trades }: PerformanceByHourChartProps) {
  // For this mock chart, we'll create simulated hour data since the trade objects
  // don't have time information
  const performanceByHour = useMemo(() => {
    // Common trading hours - can be expanded as needed
    const tradingHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const performance: Record<string, { profit: number, count: number }> = {};
    
    // Initialize all hours
    tradingHours.forEach(hour => {
      const hourLabel = `${hour} ${hour >= 12 ? 'PM' : 'AM'}`;
      performance[hourLabel] = { profit: 0, count: 0 };
    });
    
    // For demo purposes, assign trades to random hours
    trades.forEach(trade => {
      // Random hour selection for demo
      const randomHourIndex = Math.floor(Math.random() * tradingHours.length);
      const hour = tradingHours[randomHourIndex];
      const hourLabel = `${hour} ${hour >= 12 ? 'PM' : 'AM'}`;
      
      performance[hourLabel].profit += trade.return;
      performance[hourLabel].count += 1;
    });
    
    return performance;
  }, [trades]);
  
  // Find the max profit for scaling
  const maxValue = useMemo(() => {
    const values = Object.values(performanceByHour).map(p => Math.abs(p.profit));
    return Math.max(...values, 100); // Minimum of 100 for better visuals
  }, [performanceByHour]);
  
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
          {Object.entries(performanceByHour).map(([hour, data]) => {
            const barHeight = data.profit === 0 ? 0 : Math.abs(data.profit) / maxValue * 100;
            const isPositive = data.profit >= 0;
            
            return (
              <div key={hour} className="flex flex-col items-center flex-1 px-1">
                {/* Bar */}
                <div className="w-full flex flex-col justify-end h-[calc(100%-30px)]">
                  <div 
                    className={`w-full ${isPositive ? 'bg-green-400' : 'bg-red-400'} opacity-80 rounded-sm`} 
                    style={{ height: `${barHeight}%` }}
                  ></div>
                </div>
                
                {/* Hour label */}
                <div className="text-xs text-gray-400 mt-2">{hour}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 