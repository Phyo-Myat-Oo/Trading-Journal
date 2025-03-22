import React, { ChangeEvent } from 'react';
import { DateTimePicker } from '@mantine/dates';

interface DateTimeSelectorProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
  touched?: boolean;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  placeholder?: string;
}

/**
 * Date and time selector component for trade entries and exits
 */
export function DateTimeSelector({
  label,
  value,
  onChange,
  error,
  touched = false,
  required = false,
  minDate,
  maxDate,
  className = '',
  placeholder = 'Select date and time'
}: DateTimeSelectorProps) {
  const hasError = touched && error;
  
  return (
    <div className={className}>
      <label className="text-[13px] text-gray-400 mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <DateTimePicker
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        placeholder={placeholder}
        clearable
        valueFormat="MMM DD, YYYY hh:mm A"
        styles={{
          root: { width: '100%' },
          input: {
            backgroundColor: '#25262C',
            color: '#E5E5E5',
            fontSize: '13px',
            borderColor: hasError ? '#F87171' : '#3D3E44',
            '&:focus': {
              borderColor: hasError ? '#EF4444' : '#3B82F6'
            }
          },
          day: {
            '&[data-selected]': {
              backgroundColor: '#3B82F6',
              color: 'white'
            }
          },
          calendarHeaderControl: {
            color: '#E5E5E5'
          }
        }}
      />
      {hasError && <div className="text-red-400 text-[11px] mt-1">{error}</div>}
    </div>
  );
}

/**
 * Simpler date-only selector component
 */
export function DateSelector({
  label,
  value,
  onChange,
  error,
  touched = false,
  required = false,
  minDate,
  maxDate,
  className = '',
  placeholder = 'Select date'
}: Omit<DateTimeSelectorProps, 'placeholder'> & { placeholder?: string }) {
  const hasError = touched && error;
  
  // Convert string date to Date object if needed
  const dateValue = typeof value === 'string' ? new Date(value) : value;
  
  // Convert from HTML input date format to Date object
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (dateStr) {
      onChange(new Date(dateStr));
    } else {
      onChange(null);
    }
  };
  
  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  
  return (
    <div className={className}>
      <label className="text-[13px] text-gray-400 mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="date"
        value={formatDateForInput(dateValue)}
        onChange={handleChange}
        min={minDate ? formatDateForInput(minDate) : undefined}
        max={maxDate ? formatDateForInput(maxDate) : undefined}
        placeholder={placeholder}
        className={`w-full bg-[#25262C] text-gray-200 text-[13px] border rounded px-3 py-1.5 focus:outline-none ${
          hasError 
            ? 'border-red-400/50 focus:border-red-400'
            : 'border-[#3D3E44] focus:border-blue-500'
        }`}
      />
      {hasError && <div className="text-red-400 text-[11px] mt-1">{error}</div>}
    </div>
  );
} 