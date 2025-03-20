import { Badge } from '@mantine/core';
import { Trade } from '../../../types/trade';

interface TransactionsTabProps {
  trades: Trade[];
}

export default function TransactionsTab({ trades }: TransactionsTabProps) {
  return (
    <div className="space-y-2 sm:space-y-3">
      {trades.map((trade) => (
        <div
          key={trade.id}
          className="bg-[#2C2E33] rounded-lg p-3 sm:p-4 hover:bg-[#363940] transition-colors"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-base sm:text-lg font-medium text-gray-200">{trade.symbol}</div>
              <Badge 
                size="sm" 
                className={`${
                  trade.side === 'LONG' 
                    ? 'bg-green-500/10 text-green-400' 
                    : 'bg-red-500/10 text-red-400'
                } border-0`}
              >
                {trade.side}
              </Badge>
              <Badge 
                size="sm" 
                className="bg-blue-500/10 text-blue-400 border-0"
              >
                {trade.position}
              </Badge>
            </div>
            <div className={`text-base sm:text-lg font-medium ${
              trade.return >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              ${trade.return.toFixed(2)}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div>
              <div className="text-gray-400 mb-1">Entry</div>
              <div className="text-gray-200">${trade.entry.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Exit</div>
              <div className="text-gray-200">${trade.exit.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Quantity</div>
              <div className="text-gray-200">{trade.qty}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Hold Time</div>
              <div className="text-gray-200">{trade.hold}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}