export type TimeFilterType = 'Today' | 'This wk.' | 'This mo.' | 'This yr.' | 'Custom' | 'All';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface TradeFilters {
  timeFilter: TimeFilterType;
  dateRange: DateRange;
  symbols: string[];
  statuses: string[];
  sides: string[];
}

export type SortDirection = 'asc' | 'desc';

export type SortField = 
  | 'date' 
  | 'symbol' 
  | 'status' 
  | 'side' 
  | 'qty' 
  | 'entry' 
  | 'exit' 
  | 'entryTotal' 
  | 'exitTotal'
  | 'hold'
  | 'return'
  | 'returnPercent';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
} 