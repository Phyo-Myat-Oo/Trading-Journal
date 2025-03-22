import { forwardRef, SelectHTMLAttributes } from 'react';
import styles from '../../../styles/components/Form.module.css';
import clsx from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helpText?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helpText,
  options,
  value,
  onChange,
  className,
  fullWidth = false,
  ...props
}, ref) => {
  const selectClasses = clsx(
    styles.select,
    {
      [styles.inputError]: error,
      'w-full': fullWidth,
    },
    className
  );

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={styles.formGroup}>
      {label && (
        <label className={styles.label}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          value={value}
          onChange={handleChange}
          className={selectClasses}
          {...props}
        >
          {options.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className={styles.selectIcon}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {error && (
        <span className={styles.errorMessage}>
          {error}
        </span>
      )}
      {helpText && !error && (
        <span className={styles.helpText}>
          {helpText}
        </span>
      )}
    </div>
  );
}); 