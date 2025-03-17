import { useState } from 'react';
import { Trade } from '../types/trade';

export default function Trades() {
  const [trades] = useState<Trade[]>([]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Trades</h1>
      <div className="bg-[#1E2024] rounded-lg p-6">
        <p className="text-gray-400">Trade history and details will be displayed here.</p>
      </div>
    </div>
  );
} 