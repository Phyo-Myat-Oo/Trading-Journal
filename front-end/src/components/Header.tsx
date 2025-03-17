import React from 'react';
import { DateFilter } from './DateFilter';
import { DateRangeSlider } from './DateRangeSlider';
import { RiNotification3Line, RiUserLine, RiMenuLine } from 'react-icons/ri';
import {
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfYear,
  getEndOfYear,
} from '../utils/dateUtils';

interface HeaderProps {
  selectedFilter?: string;
  onFilterChange?: (filter: string) => void;
  dateRange?: [Date, Date];
  onDateRangeChange?: (range: [Date, Date]) => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedFilter: externalSelectedFilter,
  onFilterChange,
  dateRange: externalDateRange,
  onDateRangeChange,
  onMenuClick,
  isMobile = false,
}) => {
  // Local state for when props aren't provided
  const [selectedFilter, setSelectedFilter] = React.useState(externalSelectedFilter || 'Today');
  const [dateRange, setDateRange] = React.useState<[Date, Date]>(() => {
    if (externalDateRange) return externalDateRange;
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    return [start, end];
  });

  // Update local state when props change
  React.useEffect(() => {
    if (externalSelectedFilter) {
      setSelectedFilter(externalSelectedFilter);
    }
  }, [externalSelectedFilter]);

  React.useEffect(() => {
    if (externalDateRange) {
      setDateRange(externalDateRange);
    }
  }, [externalDateRange]);

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    onFilterChange?.(filter);
    
    const now = new Date();
    let start: Date;
    let end: Date;
    
    switch (filter) {
      case 'Today':
        start = getStartOfDay(now);
        end = getEndOfDay(now);
        break;
        
      case 'Yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        start = getStartOfDay(yesterday);
        end = getEndOfDay(yesterday);
        break;
        
      case 'This wk.':
        start = getStartOfWeek(now);
        end = getEndOfWeek(now);
        break;
        
      case 'Last wk.':
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        start = getStartOfWeek(lastWeek);
        end = getEndOfWeek(lastWeek);
        break;
        
      case 'This mo.':
        start = getStartOfMonth(now);
        end = getEndOfMonth(now);
        break;
        
      case 'Last mo.':
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        start = getStartOfMonth(lastMonth);
        end = getEndOfMonth(lastMonth);
        break;
        
      case 'Last 3 mo.':
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        start = getStartOfMonth(threeMonthsAgo);
        end = getEndOfMonth(now);
        break;
        
      case 'This yr.':
        start = getStartOfYear(now);
        end = getEndOfYear(now);
        break;
        
      case 'Last yr.':
        const lastYear = new Date(now);
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        start = getStartOfYear(lastYear);
        end = getEndOfYear(lastYear);
        break;
        
      case 'Reset':
        start = getStartOfDay(now);
        end = getEndOfDay(now);
        setSelectedFilter('Today');
        onFilterChange?.('Today');
        break;
        
      default:
        return;
    }
    
    setDateRange([start, end]);
    onDateRangeChange?.([start, end]);
  };

  const handleRangeChange = (start: Date, end: Date) => {
    const newRange: [Date, Date] = [start, end];
    setDateRange(newRange);
    onDateRangeChange?.(newRange);
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#13151A] border-b border-[#1E2024]">
      {/* Mobile View */}
      <div className="md:hidden flex flex-col w-full">
        <div className="flex items-center justify-between w-full h-[56px] px-3">
          <div className="flex items-center gap-3">
            {onMenuClick && (
              <button 
                onClick={onMenuClick}
                className="text-gray-400 hover:text-gray-200 p-1.5 -ml-1.5"
              >
                <RiMenuLine size={22} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <DateFilter
              selectedFilter={selectedFilter}
              onFilterChange={handleFilterChange}
              isMobile={true}
            />
            <div className="flex items-center gap-2 border-l border-[#1E2024] pl-3">
              <button className="text-gray-400 hover:text-gray-200 p-1.5">
                <RiNotification3Line size={20} />
              </button>
              <button className="text-gray-400 hover:text-gray-200 p-1.5">
                <RiUserLine size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full px-3 pb-3">
          <DateRangeSlider
            startDate={dateRange[0]}
            endDate={dateRange[1]}
            onRangeChange={handleRangeChange}
          />
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex items-center h-[64px] px-4 lg:px-6 gap-4 lg:gap-6">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="text-gray-400 hover:text-gray-200 p-1"
            >
              <RiMenuLine size={20} />
            </button>
          )}
          <DateFilter
            selectedFilter={selectedFilter}
            onFilterChange={handleFilterChange}
            isMobile={false}
          />
        </div>
        <div className="flex-1 h-full flex items-center min-w-0">
          <div className="w-full">
            <DateRangeSlider
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              onRangeChange={handleRangeChange}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 lg:gap-4 border-l border-[#1E2024] pl-4 lg:pl-6">
          <button className="text-gray-400 hover:text-gray-200 p-1">
            <RiNotification3Line size={20} />
          </button>
          <button className="text-gray-400 hover:text-gray-200 p-1">
            <RiUserLine size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};