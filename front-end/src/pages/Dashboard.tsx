import { useState } from 'react';
import { TimeFilter } from '../types/filters';
import { Trade } from '../types/trade';
import { PerformanceChart } from '../components/PerformanceChart';
import { AccountDialog } from '../components/dialogs/AccountDialog';

export function Dashboard() {
  const [selectedTimeFilter] = useState<TimeFilter>('This yr.');
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [trades] = useState<Trade[]>([
    {
      id: '1',
      date: '11/03/2022',
      symbol: 'PLTR',
      status: 'WIN',
      side: 'LONG',
      qty: 50,
      entry: 10.80,
      exit: 11.80,
      entryTotal: 540.00,
      exitTotal: 590.00,
      position: '-',
      hold: '1h',
      return: 50.00,
      returnPercent: 9.26,
    },
    {
      id: '2',
      date: '10/03/2022',
      symbol: 'BROS',
      status: 'WIN',
      side: 'LONG',
      qty: 50,
      entry: 44.16,
      exit: 49.00,
      entryTotal: 2208.00,
      exitTotal: 2450.00,
      position: '-',
      hold: '2h',
      return: 242.00,
      returnPercent: 10.96,
    },
    {
      id: '3',
      date: '09/11/2021',
      symbol: 'PLTR',
      status: 'LOSS',
      side: 'LONG',
      qty: 200,
      entry: 26.89,
      exit: 25.90,
      entryTotal: 5378.00,
      exitTotal: 5180.00,
      position: '-',
      hold: '30m',
      return: -198.00,
      returnPercent: -3.68,
    },
  ]);

  // Calculate statistics
  const wins = trades.filter(t => t.status === 'WIN');
  const losses = trades.filter(t => t.status === 'LOSS');
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (wins.length / totalTrades * 100).toFixed(0) : 0;
  
  const avgWin = wins.length > 0 
    ? wins.reduce((acc, t) => acc + t.return, 0) / wins.length 
    : 0;
  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((acc, t) => acc + t.return, 0) / losses.length)
    : 0;

  const handleAccountSave = (data: { name: string; initialBalance: number }) => {
    // Handle saving account data
    console.log('Saving account:', data);
    setIsAccountDialogOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Chart and Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Chart Section */}
        <div className="lg:col-span-7 bg-[#1E2024] rounded-lg p-3 sm:p-4">
          <div className="w-full h-full min-h-[160px] sm:min-h-[180px]">
            <PerformanceChart trades={trades} />
          </div>
        </div>

        {/* Stats Section */}
        <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 sm:gap-4 auto-rows-min">
          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">WINS</span>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xs">{wins.length}</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-green-400 text-xs">{winRate}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">LOSSES</span>
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs">{losses.length}</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-red-400 text-xs">{(100 - Number(winRate))}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">OPEN</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">0</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-gray-400 text-xs">0%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">WASH</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">0</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-gray-400 text-xs">0%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">AVG W</span>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xs">${avgWin.toFixed(2)}</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-green-400 text-xs">10%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">AVG L</span>
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs">${avgLoss.toFixed(2)}</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-red-400 text-xs">-4%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">MAX LOSS</span>
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs">
                  ${Math.min(...trades.map(t => t.return)).toFixed(2)}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-red-400 text-xs">
                    {Math.min(...trades.map(t => t.returnPercent)).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">PnL</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${trades.reduce((acc, t) => acc + t.return, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${trades.reduce((acc, t) => acc + t.return, 0).toFixed(2)}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className={`text-xs ${trades.reduce((acc, t) => acc + t.returnPercent, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trades.reduce((acc, t) => acc + t.returnPercent, 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-[#1E2024] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead>
              <tr className="text-left text-[10px] sm:text-xs text-gray-400 border-b border-[#282C34]">
                <th className="p-3 sm:p-4 font-medium">DATE</th>
                <th className="p-3 sm:p-4 font-medium">SYMBOL</th>
                <th className="p-3 sm:p-4 font-medium">STATUS</th>
                <th className="p-3 sm:p-4 font-medium">SIDE</th>
                <th className="p-3 sm:p-4 font-medium">QTY</th>
                <th className="p-3 sm:p-4 font-medium">ENTRY</th>
                <th className="p-3 sm:p-4 font-medium">EXIT</th>
                <th className="p-3 sm:p-4 font-medium">ENT TOT</th>
                <th className="p-3 sm:p-4 font-medium">EXT TOT</th>
                <th className="p-3 sm:p-4 font-medium">POS</th>
                <th className="p-3 sm:p-4 font-medium">HOLD</th>
                <th className="p-3 sm:p-4 font-medium">RETURN</th>
                <th className="p-3 sm:p-4 font-medium">RETURN %</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr 
                  key={trade.id}
                  className="text-[11px] sm:text-sm border-b border-[#282C34] hover:bg-[#282C34] transition-colors duration-150"
                >
                  <td className="p-3 sm:p-4 text-gray-300">{trade.date}</td>
                  <td className="p-3 sm:p-4 text-blue-400">{trade.symbol}</td>
                  <td className="p-3 sm:p-4">
                    <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${
                      trade.status === 'WIN' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 text-gray-300">{trade.side}</td>
                  <td className="p-3 sm:p-4 text-gray-300">{trade.qty}</td>
                  <td className="p-3 sm:p-4 text-gray-300">${trade.entry.toFixed(2)}</td>
                  <td className="p-3 sm:p-4 text-gray-300">${trade.exit.toFixed(2)}</td>
                  <td className="p-3 sm:p-4 text-gray-300">${trade.entryTotal.toFixed(2)}</td>
                  <td className="p-3 sm:p-4 text-gray-300">${trade.exitTotal.toFixed(2)}</td>
                  <td className="p-3 sm:p-4 text-gray-300">{trade.position}</td>
                  <td className="p-3 sm:p-4 text-gray-300">{trade.hold}</td>
                  <td className={`p-3 sm:p-4 font-medium ${trade.return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(trade.return).toFixed(2)}
                  </td>
                  <td className={`p-3 sm:p-4 font-medium ${trade.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.returnPercent >= 0 ? '+' : '-'}{Math.abs(trade.returnPercent).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AccountDialog
        isOpen={isAccountDialogOpen}
        onClose={() => setIsAccountDialogOpen(false)}
        onSave={handleAccountSave}
        currentBalance={10000}
      />
    </div>
  );
} 