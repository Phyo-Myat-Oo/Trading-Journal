import React from 'react';
import { TradeStatus } from '../../../types/trade';

interface StatusSelectorProps {
  status: TradeStatus;
  onChange: (status: TradeStatus) => void;
  className?: string;
}

const statusConfig = {
  'WIN': {
    label: 'Win',
    bgClass: 'bg-green-700',
    activeClass: 'bg-green-600',
  },
  'LOSS': {
    label: 'Loss',
    bgClass: 'bg-red-700',
    activeClass: 'bg-red-600',
  },
  'BE': {
    label: 'Break Even',
    bgClass: 'bg-blue-700',
    activeClass: 'bg-blue-600',
  },
};

/**
 * A component for selecting trade status from available options
 */
export function StatusSelector({ status, onChange, className = '' }: StatusSelectorProps) {
  return (
    <div className={`flex space-x-2 ${className}`}>
      {Object.entries(statusConfig).map(([key, config]) => (
        <button
          key={key}
          type="button"
          className={`px-3 py-1.5 text-sm rounded-md transition-colors 
            ${status === key ? config.activeClass : config.bgClass}
            border border-transparent focus:outline-none`}
          onClick={() => onChange(key as TradeStatus)}
        >
          {config.label}
        </button>
      ))}
    </div>
  );
} 