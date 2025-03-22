import { Trade } from '../types/trade';
import { SortConfig } from '../types/filters';

export const sortTrades = (trades: Trade[], sortConfig: SortConfig | null): Trade[] => {
  if (!sortConfig) return trades;
  
  return [...trades].sort((a, b) => {
    const { field, direction } = sortConfig;
    
    // For numeric fields
    if (['qty', 'entry', 'exit', 'entryTotal', 'exitTotal', 'return', 'returnPercent'].includes(field)) {
      // Handle the sort direction
      return direction === 'asc' 
        ? (a[field] as number) - (b[field] as number)
        : (b[field] as number) - (a[field] as number);
    }
    
    // For date field
    if (field === 'date') {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return direction === 'asc' 
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    }
    
    // For string fields
    if (['symbol', 'status', 'side', 'hold'].includes(field)) {
      const valueA = a[field] as string;
      const valueB = b[field] as string;
      if (direction === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    }
    
    // Default case
    return 0;
  });
}; 