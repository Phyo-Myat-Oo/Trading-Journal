import { useState, useEffect } from 'react';
import { DateRangeFilter } from '../../types/filters';

interface DateRangePickerProps {
  dateRange: DateRangeFilter;
  onDateRangeChange: (dateRange: DateRangeFilter) => void;
  isVisible: boolean;
}

export function DateRangePicker({ 
  dateRange, 
  onDateRangeChange, 
  isVisible 
}: DateRangePickerProps) {
  const [startDateStr, setStartDateStr] = useState<string>('');
  const [endDateStr, setEndDateStr] = useState<string>('');

  // Initialize input values when dateRange changes
  useEffect(() => {
    if (dateRange.startDate) {
      setStartDateStr(formatDateForInput(dateRange.startDate));
    } else {
      setStartDateStr('');
    }

    if (dateRange.endDate) {
      setEndDateStr(formatDateForInput(dateRange.endDate));
    } else {
      setEndDateStr('');
    }
  }, [dateRange]);

  if (!isVisible) return null;

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setStartDateStr(newValue);
    
    if (newValue) {
      const newDate = new Date(newValue);
      onDateRangeChange({
        ...dateRange,
        startDate: newDate
      });
    } else {
      onDateRangeChange({
        ...dateRange,
        startDate: null
      });
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setEndDateStr(newValue);
    
    if (newValue) {
      const newDate = new Date(newValue);
      onDateRangeChange({
        ...dateRange,
        endDate: newDate
      });
    } else {
      onDateRangeChange({
        ...dateRange,
        endDate: null
      });
    }
  };

  return (
    <div className="mt-3 p-3 bg-[#282C34] rounded-md">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Start Date</label>
          <input
            type="date"
            value={startDateStr}
            onChange={handleStartDateChange}
            className="w-full px-2 py-1 rounded-md text-xs bg-[#1E2024] border border-[#333] text-gray-300 focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">End Date</label>
          <input
            type="date"
            value={endDateStr}
            onChange={handleEndDateChange}
            className="w-full px-2 py-1 rounded-md text-xs bg-[#1E2024] border border-[#333] text-gray-300 focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>
    </div>
  );
} 