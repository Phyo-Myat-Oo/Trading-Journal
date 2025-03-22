import styles from './StatsDisplay.module.css';

/**
 * Props interface for individual stat items
 * @interface StatItemProps
 * @property {string} label - Display label for the stat
 * @property {number} value - Numerical value of the stat
 * @property {number} [percentage] - Optional percentage value
 * @property {'up' | 'down' | 'neutral'} [trend] - Optional trend direction
 */
interface StatItemProps {
  label: string;
  value: number;
  percentage?: number;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * StatItem component displays individual statistics with optional trend indicators
 * @param {StatItemProps} props - Component props
 */
function StatItem({ label, value, percentage, trend }: StatItemProps) {
  // Determine the CSS class for trend color based on trend direction
  const getTrendClass = () => {
    if (!trend) return styles.trendNeutral;
    return trend === 'up' ? styles.trendUp : trend === 'down' ? styles.trendDown : styles.trendNeutral;
  };

  // Get appropriate trend icon based on trend direction
  const getTrendIcon = () => {
    if (!trend) return null;
    return trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  };

  return (
    <div className={styles.statItem}>
      <div className={styles.label}>{label}</div>
      <div className={styles.valueContainer}>
        <div className={styles.value}>{value}</div>
        {percentage && (
          <div className={`${styles.trendContainer} ${getTrendClass()}`}>
            <span>{getTrendIcon()}</span>
            <span>{percentage}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Props interface for the StatsDisplay component
 * @interface StatsDisplayProps
 * @property {number} wins - Number of winning trades
 * @property {number} losses - Number of losing trades
 * @property {number} washes - Number of breakeven trades
 * @property {number} winRate - Win rate percentage
 * @property {number} profitFactor - Ratio of gross profits to gross losses
 */
interface StatsDisplayProps {
  wins: number;
  losses: number;
  washes: number;
  winRate: number;
  profitFactor: number;
}

/**
 * StatsDisplay component shows a grid of trading statistics
 * @param {StatsDisplayProps} props - Component props
 */
export default function StatsDisplay({ wins, losses, washes, winRate, profitFactor }: StatsDisplayProps) {
  return (
    <div className={styles.statsGrid}>
      <StatItem 
        label="Wins"
        value={wins}
        percentage={winRate}
        trend="up"
      />
      <StatItem
        label="Losses"
        value={losses}
        percentage={(100 - winRate)}
        trend="down"
      />
      <StatItem
        label="Washes"
        value={washes}
        trend="neutral"
      />
      <StatItem
        label="Win Rate"
        value={winRate}
        percentage={winRate}
        trend={winRate >= 50 ? 'up' : 'down'}
      />
      <StatItem
        label="Profit Factor"
        value={profitFactor}
        trend={profitFactor > 1 ? 'up' : 'down'}
      />
    </div>
  );
}