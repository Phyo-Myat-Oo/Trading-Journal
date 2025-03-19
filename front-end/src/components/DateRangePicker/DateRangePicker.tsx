import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface DateRangePickerProps {
  dateRange?: [Date, Date];
  onDateRangeChange?: (range: [Date, Date]) => void;
  compact?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange: externalDateRange,
  onDateRangeChange,
  compact = false,
}) => {
  // Local state for when props aren't provided
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => {
    if (externalDateRange) return externalDateRange;
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    return [start, end];
  });

  // Update local state when props change
  useEffect(() => {
    if (externalDateRange) {
      setDateRange(externalDateRange);
    }
  }, [externalDateRange]);

  const handleDateChange = (index: 0 | 1, date: Date) => {
    const newRange: [Date, Date] = [...dateRange] as [Date, Date];
    newRange[index] = date;
    
    // Ensure start date is before end date
    if (index === 0 && newRange[0] > newRange[1]) {
      newRange[1] = new Date(newRange[0]);
      newRange[1].setDate(newRange[1].getDate() + 1);
    } else if (index === 1 && newRange[1] < newRange[0]) {
      newRange[0] = new Date(newRange[1]);
      newRange[0].setDate(newRange[0].getDate() - 1);
    }
    
    setDateRange(newRange);
    onDateRangeChange?.(newRange);
  };

  // Format dates for display
  const formatDateDisplay = (date: Date) => {
   
    return format(date, 'MM/dd/yyyy');
  };

  // Display formatted date instead of the date picker until clicked
  const [showPicker, setShowPicker] = useState<[boolean, boolean]>([false, false]);

  if (compact) {
    return (
      <div className="inline-flex items-center">
        <div 
          className="relative bg-[#1E2024] hover:bg-[#2A2D35] transition-colors rounded-l-md px-1.5 py-0.5 cursor-pointer text-center"
          onClick={() => {
            if (!showPicker[0]) {
              setShowPicker([true, false]);
              setTimeout(() => {
                const input = document.getElementById('date-start-compact') as HTMLInputElement;
                if (input) input.showPicker();
              }, 50);
            }
          }}
        >
          <span className="text-white text-xs">{formatDateDisplay(dateRange[0])}</span>
          <input 
            id="date-start-compact"
            type="date" 
            value={dateRange[0].toISOString().split('T')[0]}
            onChange={(e) => {
              handleDateChange(0, new Date(e.target.value));
              setShowPicker([false, false]);
            }}
            onBlur={() => setShowPicker([false, false])}
            className="opacity-0 absolute inset-0 w-full cursor-pointer"
          />
        </div>
        <span className="text-gray-500 text-xs px-0.5">-</span>
        <div 
          className="relative bg-[#1E2024] hover:bg-[#2A2D35] transition-colors rounded-r-md px-1.5 py-0.5 cursor-pointer text-center"
          onClick={() => {
            if (!showPicker[1]) {
              setShowPicker([false, true]);
              setTimeout(() => {
                const input = document.getElementById('date-end-compact') as HTMLInputElement;
                if (input) input.showPicker();
              }, 50);
            }
          }}
        >
          <span className="text-white text-xs">{formatDateDisplay(dateRange[1])}</span>
          <input 
            id="date-end-compact"
            type="date" 
            value={dateRange[1].toISOString().split('T')[0]}
            onChange={(e) => {
              handleDateChange(1, new Date(e.target.value));
              setShowPicker([false, false]);
            }}
            onBlur={() => setShowPicker([false, false])}
            className="opacity-0 absolute inset-0 w-full cursor-pointer"
          />
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="flex items-center gap-3 text-sm">
      <div 
        className="relative bg-[#22242A] hover:bg-[#2A2D35] transition-colors rounded-md px-3 py-1.5 cursor-pointer flex-1 text-center"
        onClick={() => {
          if (!showPicker[0]) {
            setShowPicker([true, false]);
            setTimeout(() => {
              const input = document.getElementById('date-start') as HTMLInputElement;
              if (input) input.showPicker();
            }, 50);
          }
        }}
      >
        <span className="text-white">{formatDateDisplay(dateRange[0])}</span>
        <input 
          id="date-start"
          type="date" 
          value={dateRange[0].toISOString().split('T')[0]}
          onChange={(e) => {
            handleDateChange(0, new Date(e.target.value));
            setShowPicker([false, false]);
          }}
          onBlur={() => setShowPicker([false, false])}
          className="opacity-0 absolute inset-0 w-full cursor-pointer"
        />
      </div>
      <span className="text-gray-500">-</span>
      <div 
        className="relative bg-[#22242A] hover:bg-[#2A2D35] transition-colors rounded-md px-3 py-1.5 cursor-pointer flex-1 text-center"
        onClick={() => {
          if (!showPicker[1]) {
            setShowPicker([false, true]);
            setTimeout(() => {
              const input = document.getElementById('date-end') as HTMLInputElement;
              if (input) input.showPicker();
            }, 50);
          }
        }}
      >
        <span className="text-white">{formatDateDisplay(dateRange[1])}</span>
        <input 
          id="date-end"
          type="date" 
          value={dateRange[1].toISOString().split('T')[0]}
          onChange={(e) => {
            handleDateChange(1, new Date(e.target.value));
            setShowPicker([false, false]);
          }}
          onBlur={() => setShowPicker([false, false])}
          className="opacity-0 absolute inset-0 w-full cursor-pointer"
        />
      </div>
    </div>
  );
}; 