import React from 'react';
import { RiNotification3Line, RiUserLine, RiMenuLine } from 'react-icons/ri';
import { DateFilterContainer } from '../DateRangePicker';

interface HeaderProps {
  dateRange?: [Date, Date];
  onDateRangeChange?: (range: [Date, Date]) => void;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dateRange: externalDateRange,
  onDateRangeChange,
  onMenuClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#13151A] border-b border-[#1E2024]">
      {/* Mobile View */}
      <div className="md:hidden flex items-center justify-between px-3 h-14">
        <div className="flex items-center">
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="text-gray-400 hover:text-gray-200 transition-colors p-1.5"
            >
              <RiMenuLine size={22} />
            </button>
          )}
        </div>
        
        <div className="flex-1 flex justify-center">
          <DateFilterContainer 
            dateRange={externalDateRange}
            onDateRangeChange={onDateRangeChange}
            compact={true}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button className="text-gray-400 hover:text-gray-200 transition-colors p-1.5">
            <RiNotification3Line size={20} />
          </button>
          <button className="text-gray-400 hover:text-gray-200 transition-colors p-1.5">
            <RiUserLine size={20} />
          </button>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex items-center h-[80px] px-4 lg:px-6 gap-4 lg:gap-6">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="text-gray-400 hover:text-gray-200 transition-colors p-1"
            >
              <RiMenuLine size={20} />
            </button>
          )}
        </div>
        
        <div className="flex-1">
          {/* Main content area */}
        </div>
        
        <div className="flex items-center gap-5">
          <DateFilterContainer 
            dateRange={externalDateRange}
            onDateRangeChange={onDateRangeChange}
          />
          
          <div className="flex items-center gap-4 border-l border-[#1E2024] pl-5">
            <button className="text-gray-400 hover:text-gray-200 transition-colors p-1.5">
              <RiNotification3Line size={22} />
            </button>
            <button className="text-gray-400 hover:text-gray-200 transition-colors p-1.5">
              <RiUserLine size={22} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};