import styles from '../../../styles/components/Loading.module.css';
import clsx from 'clsx';

export type LoadingSize = 'sm' | 'md' | 'lg';
export type LoadingVariant = 'primary' | 'light' | 'dark';

export interface LoadingProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

export function Loading({
  size = 'md',
  variant = 'primary',
  fullScreen = false,
  text,
  className,
}: LoadingProps) {
  const containerClasses = clsx(
    styles.container,
    {
      [styles.fullScreen]: fullScreen,
    },
    className
  );

  const spinnerClasses = clsx(
    styles.spinner,
    styles[size],
    styles[variant]
  );

  return (
    <div className={containerClasses}>
      <div className={styles.content}>
        <div className={spinnerClasses}>
          <svg
            className={styles.circle}
            viewBox="0 0 50 50"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className={styles.path}
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="5"
            />
          </svg>
        </div>
        {text && <p className={styles.text}>{text}</p>}
      </div>
    </div>
  );
} 