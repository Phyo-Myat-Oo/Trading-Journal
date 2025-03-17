import React, { useState } from 'react';
import { RiCalendarLine, RiArrowDownSLine } from 'react-icons/ri';

interface DateFilterProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  isMobile?: boolean;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  selectedFilter,
  onFilterChange,
  isMobile = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const allFilters = [
    'Today',
    'Yesterday',
    'This wk.',
    'Last wk.',
    'This mo.',
    'Last mo.',
    'Last 3 mo.',
    'This yr.',
    'Last yr.',
    'Reset'
  ];

  const handleFilterClick = (filter: string) => {
    onFilterChange(filter);
    setIsOpen(false);
  };

  if (isMobile) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#1E2024] rounded-lg text-gray-200 text-sm hover:bg-[#282C34]"
        >
          <RiCalendarLine className="w-4 h-4" />
          <span className="truncate max-w-[80px]">{selectedFilter}</span>
          <RiArrowDownSLine className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-[160px] bg-[#1E2024] rounded-lg shadow-lg overflow-hidden z-40">
              {allFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleFilterClick(filter)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    filter === selectedFilter
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:bg-[#282C34] hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Desktop view with two rows of buttons
  const topRowFilters = allFilters.slice(0, 5);
  const bottomRowFilters = allFilters.slice(5);

  const getButtonClass = (filter: string) => {
    const baseClass = "w-[68px] sm:w-[75px] md:w-[80px] px-2 md:px-3 py-1 text-[11px] md:text-xs rounded-md transition-colors duration-150 text-center whitespace-nowrap";
    if (filter === selectedFilter) {
      return `${baseClass} bg-blue-500 text-white`;
    }
    return `${baseClass} text-gray-400 hover:bg-[#282C34] hover:text-gray-200`;
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {topRowFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={getButtonClass(filter)}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {bottomRowFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={getButtonClass(filter)}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}; 