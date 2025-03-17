import styles from './TimeFilterButton.module.css';

/**
 * Props interface for the TimeFilterButton component
 * @interface TimeFilterButtonProps
 * @property {string} label - Text to display on the button
 * @property {() => void} [onClick] - Optional click handler function
 */
interface TimeFilterButtonProps {
  label: string;
  onClick?: () => void;
}

/**
 * TimeFilterButton component renders a styled button for time-based filtering
 * @param {TimeFilterButtonProps} props - Component props
 */
export default function TimeFilterButton({ label, onClick }: TimeFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={styles.button}
    >
      {label}
    </button>
  );
}