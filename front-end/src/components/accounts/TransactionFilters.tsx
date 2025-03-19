import { useState, useEffect } from 'react';
import { Transaction } from '../../types/account';

interface TransactionFiltersProps {
  onFilterChange: (filter: {
    type?: 'DEPOSIT' | 'WITHDRAW';
    dateRange?: {
      start: string;
      end: string;
    };
  }) => void;
  onSortChange: (sort: { by: keyof Transaction; direction: 'asc' | 'desc' }) => void;
  size?: 'sm' | 'md';
}

export function TransactionFilters({
  onFilterChange,
  onSortChange,
  size = 'md'
}: TransactionFiltersProps) {
  const [activeType, setActiveType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAW'>('ALL');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [dateError, setDateError] = useState<string>('');

  // Update input values when dateRange changes
  useEffect(() => {
    if (dateRange.start) {
      setStartDateInput(new Date(dateRange.start).toLocaleDateString('en-GB'));
    } else {
      setStartDateInput('');
    }
    if (dateRange.end) {
      setEndDateInput(new Date(dateRange.end).toLocaleDateString('en-GB'));
    } else {
      setEndDateInput('');
    }
    // Clear error when dates change
    setDateError('');
  }, [dateRange.start, dateRange.end]);

  const validateDateRange = (start: string, end: string) => {
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (startDate > endDate) {
        setDateError('Start date cannot be after end date');
        return false;
      }
      if (endDate > new Date()) {
        setDateError('End date cannot be in the future');
        return false;
      }
    }
    setDateError('');
    return true;
  };

  const handleTypeClick = (type: 'ALL' | 'DEPOSIT' | 'WITHDRAW') => {
    setActiveType(type);
    onFilterChange({
      type: type === 'ALL' ? undefined : type,
      dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
    });
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
    
    if (validateDateRange(newDateRange.start, newDateRange.end)) {
      onFilterChange({
        type: activeType === 'ALL' ? undefined : activeType,
        dateRange: newDateRange.start && newDateRange.end ? newDateRange : undefined,
      });
    }
  };

  const handleSort = (by: keyof Transaction) => {
    onSortChange({ by, direction: 'desc' });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm">
      <div className="flex rounded-lg overflow-hidden bg-[#1E2024] w-full sm:w-auto">
        <button
          onClick={() => handleTypeClick('ALL')}
          className={`flex-1 sm:flex-none px-2 sm:px-3 py-1 text-xs font-medium transition-colors ${
            activeType === 'ALL'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => handleTypeClick('DEPOSIT')}
          className={`flex-1 sm:flex-none px-2 sm:px-3 py-1 text-xs font-medium transition-colors ${
            activeType === 'DEPOSIT'
              ? 'bg-green-500 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Deposits
        </button>
        <button
          onClick={() => handleTypeClick('WITHDRAW')}
          className={`flex-1 sm:flex-none px-2 sm:px-3 py-1 text-xs font-medium transition-colors ${
            activeType === 'WITHDRAW'
              ? 'bg-red-500 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Withdrawals
        </button>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
        <div className="relative w-[130px] h-[36px] shrink-0">
          <div className={`bg-[#1E2024] rounded-lg px-3 py-1.5 text-sm w-full text-gray-300 border ${dateError ? 'border-red-500' : 'border-transparent focus-within:border-blue-500'} flex items-center justify-between h-full`}>
            <input
              type="text"
              value={startDateInput}
              onChange={(e) => {
                const value = e.target.value;
                if (/^[0-9/]*$/.test(value)) {
                  let newValue = value;
                  if (value.length === 2 && !value.includes('/')) {
                    newValue = value + '/';
                  } else if (value.length === 5 && value.split('/').length === 2) {
                    newValue = value + '/';
                  }
                  setStartDateInput(newValue);
                  if (newValue.length === 10) {
                    try {
                      const [day, month, year] = newValue.split('/');
                      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                      if (!isNaN(new Date(date).getTime())) {
                        handleDateChange('start', date);
                      }
                    } catch {
                      // Invalid date format, ignore
                    }
                  } else {
                    handleDateChange('start', '');
                  }
                }
              }}
              placeholder="dd/mm/yyyy"
              className="bg-transparent outline-none w-full text-xs sm:text-sm"
            />
            <button
              type="button"
              className="text-gray-400 hover:text-gray-300 flex-shrink-0 ml-2"
              onClick={(e) => {
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'date';
                input.style.opacity = '0';
                input.style.position = 'absolute';
                input.style.inset = '0';
                input.style.cursor = 'pointer';
                if (dateRange.start) {
                  input.value = dateRange.start;
                }
                input.addEventListener('change', (event) => {
                  const target = event.target as HTMLInputElement;
                  if (target.value) {
                    handleDateChange('start', target.value);
                  }
                  input.remove();
                });
                e.currentTarget.parentElement?.appendChild(input);
                requestAnimationFrame(() => input.showPicker());
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        <span className="text-gray-400 text-xs sm:text-sm shrink-0">to</span>
        <div className="relative w-[130px] h-[36px] shrink-0">
          <div className={`bg-[#1E2024] rounded-lg px-3 py-1.5 text-sm w-full text-gray-300 border ${dateError ? 'border-red-500' : 'border-transparent focus-within:border-blue-500'} flex items-center justify-between h-full`}>
            <input
              type="text"
              value={endDateInput}
              onChange={(e) => {
                const value = e.target.value;
                if (/^[0-9/]*$/.test(value)) {
                  let newValue = value;
                  if (value.length === 2 && !value.includes('/')) {
                    newValue = value + '/';
                  } else if (value.length === 5 && value.split('/').length === 2) {
                    newValue = value + '/';
                  }
                  setEndDateInput(newValue);
                  if (newValue.length === 10) {
                    try {
                      const [day, month, year] = newValue.split('/');
                      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                      if (!isNaN(new Date(date).getTime())) {
                        handleDateChange('end', date);
                      }
                    } catch {
                      // Invalid date format, ignore
                    }
                  } else {
                    handleDateChange('end', '');
                  }
                }
              }}
              placeholder="dd/mm/yyyy"
              className="bg-transparent outline-none w-full text-xs sm:text-sm"
            />
            <button
              type="button"
              className="text-gray-400 hover:text-gray-300 flex-shrink-0 ml-2"
              onClick={(e) => {
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'date';
                input.style.opacity = '0';
                input.style.position = 'absolute';
                input.style.inset = '0';
                input.style.cursor = 'pointer';
                if (dateRange.end) {
                  input.value = dateRange.end;
                }
                input.addEventListener('change', (event) => {
                  const target = event.target as HTMLInputElement;
                  if (target.value) {
                    handleDateChange('end', target.value);
                  }
                  input.remove();
                });
                e.currentTarget.parentElement?.appendChild(input);
                requestAnimationFrame(() => input.showPicker());
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {dateError && (
        <div className="absolute -bottom-6 left-0 text-xs text-red-500">
          {dateError}
        </div>
      )}
      <div className="flex gap-1">
        <button
          onClick={() => handleSort('date')}
          className="p-1 hover:bg-[#1E2024] rounded"
          title="Sort by date"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => handleSort('amount')}
          className="p-1 hover:bg-[#1E2024] rounded"
          title="Sort by amount"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => handleSort('type')}
          className="p-1 hover:bg-[#1E2024] rounded"
          title="Sort by type"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="w-px h-4 bg-gray-700 my-auto mx-1" />
        <button
          onClick={() => {
            setActiveType('ALL');
            setDateRange({ start: '', end: '' });
            setStartDateInput('');
            setEndDateInput('');
            onFilterChange({});
          }}
          className={`p-1 hover:bg-[#1E2024] rounded transition-colors ${
            activeType !== 'ALL' || dateRange.start || dateRange.end
              ? 'text-blue-500 hover:text-blue-400'
              : 'text-gray-400'
          }`}
          title="Reset filters"
          disabled={activeType === 'ALL' && !dateRange.start && !dateRange.end}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 100-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
} 