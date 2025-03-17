import { TimeFilter } from '../types/filters';
import TimeFilterButton from './TimeFilterButton';
import styles from './TimeFilterButton.module.css';

/**
 * Interface for button configuration
 * @interface TimeFilterButtonConfig
 * @property {string} label - Text to display on the button
 */
interface TimeFilterButtonConfig {
  label: string;
}

/**
 * Props interface for the TimeFilterButtonGroup component
 * @interface TimeFilterButtonGroupProps
 * @property {TimeFilterButtonConfig[]} topRowButtons - Array of button configs for top row
 * @property {TimeFilterButtonConfig[]} bottomRowButtons - Array of button configs for bottom row
 */
interface TimeFilterButtonGroupProps {
  topRowButtons: TimeFilterButtonConfig[];
  bottomRowButtons: TimeFilterButtonConfig[];
}

interface TimeFilterButton {
  label: TimeFilter;
  onClick: () => void;
}

/**
 * TimeFilterButtonGroup component renders a group of time filter buttons in two rows
 * @param {TimeFilterButtonGroupProps} props - Component props
 */
export default function TimeFilterButtonGroup({ topRowButtons, bottomRowButtons }: TimeFilterButtonGroupProps) {
  return (
    <div className={styles.buttonGroup}>
      <div className={styles.buttonRow}>
        {topRowButtons.map((button, index) => (
          <TimeFilterButton 
            key={index} 
            label={button.label} 
            onClick={() => {}} 
          />
        ))}
      </div>
      <div className={styles.buttonRow}>
        {bottomRowButtons.map((button, index) => (
          <TimeFilterButton 
            key={index} 
            label={button.label} 
            onClick={() => {}} 
          />
        ))}
      </div>
    </div>
  );
}