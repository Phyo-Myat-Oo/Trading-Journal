import { forwardRef, InputHTMLAttributes } from 'react';
import styles from '../../../styles/components/Form.module.css';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helpText,
  icon,
  className,
  fullWidth = false,
  ...props
}, ref) => {
  const inputClasses = clsx(
    styles.input,
    {
      [styles.inputError]: error,
      [styles.inputWithIcon]: icon,
      'w-full': fullWidth,
    },
    className
  );

  return (
    <div className={styles.formGroup}>
      {label && (
        <label className={styles.label}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className={styles.inputIcon}>
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
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