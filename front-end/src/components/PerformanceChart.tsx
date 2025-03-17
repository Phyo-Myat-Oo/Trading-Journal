import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Trade } from '../types/trade';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PerformanceChartProps {
  trades: Trade[];
}

export function PerformanceChart({ trades }: PerformanceChartProps) {
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const cumulativeReturns = sortedTrades.reduce((acc: number[], trade) => {
    const lastValue = acc.length > 0 ? acc[acc.length - 1] : 0;
    return [...acc, lastValue + trade.return];
  }, []);

  const data = {
    labels: sortedTrades.map(trade => trade.date),
    datasets: [
      {
        label: 'P&L',
        data: cumulativeReturns,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 0
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1E2024',
        titleColor: '#9CA3AF',
        bodyColor: '#fff',
        borderColor: '#282C34',
        borderWidth: 1,
        padding: {
          top: 6,
          right: 8,
          bottom: 6,
          left: 8
        },
        displayColors: false,
        callbacks: {
          label: (context) => `$${context.parsed.y.toFixed(2)}`,
        },
        bodyFont: {
          size: window.innerWidth < 640 ? 11 : 12,
        },
        titleFont: {
          size: window.innerWidth < 640 ? 10 : 11,
        },
      },
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false,
        },
        border: {
          display: false,
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.1)',
          display: true,
          drawTicks: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: window.innerWidth < 640 ? 9 : 10,
          },
          maxTicksLimit: window.innerWidth < 640 ? 5 : 8,
          callback: (value) => `$${value}`,
          padding: 8,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="w-full h-full">
      <Line data={data} options={options} />
    </div>
  );
} 