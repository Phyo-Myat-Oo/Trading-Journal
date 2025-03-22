import React from 'react';

export type TradeSide = 'LONG' | 'SHORT';

interface SideSelectorProps {
  side: TradeSide;
  onChange: (side: TradeSide) => void;
  className?: string;
}

/**
 * Reusable component for selecting LONG or SHORT side
 */
export default function SideSelector({ side, onChange, className = '' }: SideSelectorProps) {
  return (
    <div className={className}>
      <div className="text-[13px] text-gray-400 mb-2">SIDE</div>
      <div className="flex">
        <button
          type="button"
          onClick={() => onChange('LONG')}
          className={`flex-1 py-1.5 text-[13px] rounded-l ${
            side === 'LONG'
              ? 'bg-[#4CAF50] text-white'
              : 'bg-[#25262C] text-gray-400'
          }`}
        >
          LONG
        </button>
        <button
          type="button"
          onClick={() => onChange('SHORT')}
          className={`flex-1 py-1.5 text-[13px] rounded-r ${
            side === 'SHORT'
              ? 'bg-[#EF5350] text-white'
              : 'bg-[#25262C] text-gray-400'
          }`}
        >
          SHORT
        </button>
      </div>
    </div>
  );
} 