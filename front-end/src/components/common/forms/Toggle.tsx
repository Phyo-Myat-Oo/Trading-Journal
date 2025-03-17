import { forwardRef, InputHTMLAttributes } from 'react';
import styles from '../../../styles/components/Form.module.css';
import clsx from 'clsx';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  helpText?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(({
  label,
  checked = false,
  onChange,
  helpText,
  className,
  ...props
}, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked);
  };

  return (
    <div className={clsx('flex items-center', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={clsx(
          styles.toggle,
          checked ? styles.toggleEnabled : styles.toggleDisabled
        )}
        {...props}
      >
        <span
          className={clsx(
            styles.toggleHandle,
            checked ? styles.toggleHandleEnabled : styles.toggleHandleDisabled
          )}
        />
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className="sr-only"
        />
      </button>
      {(label || helpText) && (
        <div className="ml-3">
          {label && (
            <span className={styles.label}>
              {label}
            </span>
          )}
          {helpText && (
            <span className={styles.helpText}>
              {helpText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}); 