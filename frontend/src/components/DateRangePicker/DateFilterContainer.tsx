import React, { useState, useEffect, useRef } from 'react';
import { DateRangePicker } from './DateRangePicker';
import { DateFilterComponent } from './DateFilterComponent';
import { RiCalendarLine, RiCloseLine } from 'react-icons/ri';

interface DateFilterContainerProps {
  dateRange?: [Date, Date];
  onDateRangeChange?: (range: [Date, Date]) => void;
  compact?: boolean;
}

export const DateFilterContainer: React.FC<DateFilterContainerProps> = ({
  dateRange: externalDateRange,
  onDateRangeChange,
  compact = false
}) => {
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => {
    if (externalDateRange) return externalDateRange;
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    return [start, end];
  });
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  // Update local state when props change
  useEffect(() => {
    if (externalDateRange) {
      setDateRange(externalDateRange);
    }
  }, [externalDateRange]);
  
  // Handle date range change from any component
  const handleDateRangeChange = (newRange: [Date, Date]) => {
    setDateRange(newRange);
    onDateRangeChange?.(newRange);
  };
  
  // Close filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="relative" ref={filterRef}>
      {/* Date Range Picker Button */}
      <div className="flex items-center space-x-2">
        <DateRangePicker 
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          compact={compact}
        />
        
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`p-1.5 rounded-md transition-colors ${
            isFilterOpen ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <RiCalendarLine size={compact ? 18 : 20} />
        </button>
      </div>
      
      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="absolute right-0 mt-2 bg-[#13151A] border border-[#1E2024] rounded-lg shadow-lg z-50 w-90 md:w-96">
          <div className="flex items-center justify-between p-3 border-b border-[#1E2024]">
            <h3 className="font-medium text-white">Date Filter</h3>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <RiCloseLine size={20} />
            </button>
          </div>
          
          <div className="p-3">
            <DateFilterComponent 
              onDateRangeChange={handleDateRangeChange}
              defaultDateRange={dateRange}
              isMobile={compact}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 