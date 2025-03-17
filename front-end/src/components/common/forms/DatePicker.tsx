import { forwardRef, useState, useCallback } from 'react';
import { Input, InputProps } from './Input';
import styles from '../../../styles/components/Form.module.css';
import { formatDate, parseDate } from '../../../utils/date';

export interface DatePickerProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: string;
  onChange?: (date: string) => void;
  format?: string;
  minDate?: string;
  maxDate?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(({
  value,
  onChange,
  format = 'dd/MM/yyyy',
  minDate,
  maxDate,
  error,
  ...props
}, ref) => {
  const [displayValue, setDisplayValue] = useState(() => 
    value ? formatDate(value, format) : ''
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);

    if (newValue.length === format.length) {
      try {
        const date = parseDate(newValue, format);
        if (date) {
          const isoString = date.toISOString().split('T')[0];
          
          if (minDate && isoString < minDate) {
            onChange?.(minDate);
            return;
          }
          
          if (maxDate && isoString > maxDate) {
            onChange?.(maxDate);
            return;
          }
          
          onChange?.(isoString);
        }
      } catch (err) {
        // Invalid date format
      }
    }
  }, [format, maxDate, minDate, onChange]);

  const handleNativeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue) {
      setDisplayValue(formatDate(newValue, format));
      onChange?.(newValue);
    }
  }, [format, onChange]);

  const CalendarIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-4 w-4" 
      viewBox="0 0 20 20" 
      fill="currentColor"
    >
      <path 
        fillRule="evenodd" 
        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" 
        clipRule="evenodd" 
      />
    </svg>
  );

  const showNativePicker = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'date';
    input.style.cssText = 'opacity: 0; position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 10;';
    
    if (value) {
      input.value = value;
    }
    
    if (minDate) {
      input.min = minDate;
    }
    
    if (maxDate) {
      input.max = maxDate;
    }

    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value) {
        handleNativeChange({ target } as React.ChangeEvent<HTMLInputElement>);
      }
      input.remove();
    });

    e.currentTarget.parentElement?.appendChild(input);
    requestAnimationFrame(() => input.showPicker());
  }, [value, minDate, maxDate, handleNativeChange]);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        error={error}
        className={styles.datePicker}
        placeholder={format.toLowerCase()}
      />
      <button
        type="button"
        onClick={showNativePicker}
        className={styles.datePickerIcon}
      >
        <CalendarIcon />
      </button>
    </div>
  );
}); 