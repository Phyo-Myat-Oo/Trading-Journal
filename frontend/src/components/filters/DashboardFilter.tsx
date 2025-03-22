import { useState } from 'react';
import { TimeFilter, TradeFilters } from '../../types/filters';
import { TradeStatus, TradeSide } from '../../types/trade';
import { DateRangePicker } from './DateRangePicker';

interface DashboardFilterProps {
  filters: TradeFilters;
  onFilterChange: (filters: TradeFilters) => void;
  availableSymbols: string[];
}

export function DashboardFilter({ filters, onFilterChange, availableSymbols }: DashboardFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const timeFilters: TimeFilter[] = ['Today', 'This wk.', 'This mo.', 'This yr.', 'All time', 'Custom'];
  const statuses: TradeStatus[] = ['WIN', 'LOSS', 'BE'];
  const sides: TradeSide[] = ['LONG', 'SHORT'];

  const handleTimeFilterChange = (timeFilter: TimeFilter) => {
    onFilterChange({ ...filters, timeFilter });
  };

  const handleDateRangeChange = (dateRange: { startDate: Date | null; endDate: Date | null }) => {
    onFilterChange({ ...filters, dateRange });
  };

  const handleSymbolChange = (symbol: string) => {
    let newSymbols: string[];
    if (filters.symbols.includes(symbol)) {
      newSymbols = filters.symbols.filter(s => s !== symbol);
    } else {
      newSymbols = [...filters.symbols, symbol];
    }
    onFilterChange({ ...filters, symbols: newSymbols });
  };

  const handleStatusChange = (status: string) => {
    let newStatuses: string[];
    if (filters.statuses.includes(status)) {
      newStatuses = filters.statuses.filter(s => s !== status);
    } else {
      newStatuses = [...filters.statuses, status];
    }
    onFilterChange({ ...filters, statuses: newStatuses });
  };

  const handleSideChange = (side: string) => {
    let newSides: string[];
    if (filters.sides.includes(side)) {
      newSides = filters.sides.filter(s => s !== side);
    } else {
      newSides = [...filters.sides, side];
    }
    onFilterChange({ ...filters, sides: newSides });
  };

  const clearFilters = () => {
    onFilterChange({
      timeFilter: 'All time',
      dateRange: { startDate: null, endDate: null },
      symbols: [],
      statuses: [],
      sides: []
    });
  };

  return (
    <div className="bg-[#1E2024] rounded-lg p-3 sm:p-4">
      <div className="flex flex-wrap justify-between items-center mb-2">
        <div className="text-gray-300 text-xs sm:text-sm font-medium">Filters</div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-400 text-xs hover:underline flex items-center"
        >
          {isExpanded ? 'Collapse' : 'Expand'} filters
          <svg
            className={`ml-1 w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Time period filters - always visible */}
      <div className="flex gap-2 flex-wrap mb-2">
        {timeFilters.map((filter) => (
          <button
            key={filter}
            className={`px-2 py-1 rounded-md text-xs ${
              filters.timeFilter === filter
                ? 'bg-blue-400 text-gray-900'
                : 'bg-[#282C34] text-gray-300 hover:bg-[#32363E]'
            }`}
            onClick={() => handleTimeFilterChange(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Date Range Picker - only visible when Custom is selected */}
      <DateRangePicker 
        dateRange={filters.dateRange}
        onDateRangeChange={handleDateRangeChange}
        isVisible={filters.timeFilter === 'Custom'}
      />

      {/* Expanded filters */}
      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-[#282C34]">
          {/* Symbol filters */}
          <div>
            <div className="text-gray-400 text-xs mb-1">Symbols</div>
            <div className="flex gap-2 flex-wrap">
              {availableSymbols.map((symbol) => (
                <button
                  key={symbol}
                  className={`px-2 py-1 rounded-md text-xs ${
                    filters.symbols.includes(symbol)
                      ? 'bg-blue-400 text-gray-900'
                      : 'bg-[#282C34] text-gray-300 hover:bg-[#32363E]'
                  }`}
                  onClick={() => handleSymbolChange(symbol)}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Status filters */}
          <div>
            <div className="text-gray-400 text-xs mb-1">Status</div>
            <div className="flex gap-2 flex-wrap">
              {statuses.map((status) => (
                <button
                  key={status}
                  className={`px-2 py-1 rounded-md text-xs ${
                    filters.statuses.includes(status)
                      ? status === 'WIN' 
                        ? 'bg-green-400 text-gray-900' 
                        : status === 'LOSS' 
                          ? 'bg-red-400 text-gray-900'
                          : 'bg-yellow-400 text-gray-900'
                      : 'bg-[#282C34] text-gray-300 hover:bg-[#32363E]'
                  }`}
                  onClick={() => handleStatusChange(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Side filters */}
          <div>
            <div className="text-gray-400 text-xs mb-1">Side</div>
            <div className="flex gap-2 flex-wrap">
              {sides.map((side) => (
                <button
                  key={side}
                  className={`px-2 py-1 rounded-md text-xs ${
                    filters.sides.includes(side)
                      ? 'bg-blue-400 text-gray-900'
                      : 'bg-[#282C34] text-gray-300 hover:bg-[#32363E]'
                  }`}
                  onClick={() => handleSideChange(side)}
                >
                  {side}
                </button>
              ))}
            </div>
          </div>

          {/* Clear filters button */}
          <button
            onClick={clearFilters}
            className="mt-2 px-3 py-1 bg-[#282C34] text-gray-300 hover:bg-[#32363E] rounded-md text-xs"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
} 