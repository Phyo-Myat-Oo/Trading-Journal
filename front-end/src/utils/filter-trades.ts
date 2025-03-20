import { Trade } from '../types/trade';
import { TradeFilters, TimeFilter } from '../types/filters';

// Helper to check if a date is within a time filter
const isDateInTimeFilter = (dateStr: string, timeFilter: TimeFilter): boolean => {
  const date = new Date(dateStr);
  const today = new Date();
  
  // Reset today to start of day
  today.setHours(0, 0, 0, 0);
  
  switch (timeFilter) {
    case 'Today':
      return date.toDateString() === today.toDateString();
    
    case 'This wk.': {
      const firstDayOfWeek = new Date(today);
      const day = today.getDay();
      const diff = firstDayOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      firstDayOfWeek.setDate(diff);
      firstDayOfWeek.setHours(0, 0, 0, 0);
      
      return date >= firstDayOfWeek && date <= today;
    }
    
    case 'This mo.': {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return date >= firstDayOfMonth && date <= today;
    }
    
    case 'This yr.': {
      const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
      return date >= firstDayOfYear && date <= today;
    }
    
    case 'All time':
      return true;
    
    case 'Custom':
      // This is handled separately with the dateRange filter
      return true;
      
    default:
      return true;
  }
};

// Main filter function
export const filterTrades = (trades: Trade[], filters: TradeFilters): Trade[] => {
  if (!trades || trades.length === 0) return [];
  
  return trades.filter(trade => {
    // Filter by time/date
    if (filters.timeFilter !== 'Custom') {
      if (!isDateInTimeFilter(trade.date, filters.timeFilter)) {
        return false;
      }
    } else if (filters.dateRange.startDate || filters.dateRange.endDate) {
      const tradeDate = new Date(trade.date);
      
      if (filters.dateRange.startDate && tradeDate < filters.dateRange.startDate) {
        return false;
      }
      
      if (filters.dateRange.endDate) {
        const endDate = new Date(filters.dateRange.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        if (tradeDate > endDate) {
          return false;
        }
      }
    }
    
    // Filter by symbol
    if (filters.symbols.length > 0 && !filters.symbols.includes(trade.symbol)) {
      return false;
    }
    
    // Filter by status
    if (filters.statuses.length > 0 && !filters.statuses.includes(trade.status)) {
      return false;
    }
    
    // Filter by side
    if (filters.sides.length > 0 && !filters.sides.includes(trade.side)) {
      return false;
    }
    
    return true;
  });
}; 