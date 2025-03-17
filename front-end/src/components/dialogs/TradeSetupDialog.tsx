import { useState } from 'react';

interface TradeSetupDialogProps {
  onClose: () => void;
  onSave: (setup: any) => void;
}

export const TradeSetupDialog = ({ onClose, onSave }: TradeSetupDialogProps) => {
  const [setup, setSetup] = useState({
    side: 'LONG',
    market: 'CRYPTO',
    symbol: '',
    entry: '',
    target: '',
    stopLoss: '',
    note: '',
    tags: ''
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 w-[600px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl text-gray-200">New Trade Setup</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Side</label>
              <div className="flex space-x-2">
                <button
                  className={`px-4 py-2 rounded ${
                    setup.side === 'LONG'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                  onClick={() => setSetup({ ...setup, side: 'LONG' })}
                >
                  LONG
                </button>
                <button
                  className={`px-4 py-2 rounded ${
                    setup.side === 'SHORT'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                  onClick={() => setSetup({ ...setup, side: 'SHORT' })}
                >
                  SHORT
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Market</label>
              <select
                value={setup.market}
                onChange={(e) => setSetup({ ...setup, market: e.target.value })}
                className="bg-gray-700 text-gray-200 rounded px-3 py-2"
              >
                <option value="CRYPTO">CRYPTO</option>
                <option value="STOCKS">STOCKS</option>
                <option value="FOREX">FOREX</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Symbol</label>
              <input
                type="text"
                value={setup.symbol}
                onChange={(e) => setSetup({ ...setup, symbol: e.target.value })}
                className="bg-gray-700 text-gray-200 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Entry</label>
              <input
                type="text"
                value={setup.entry}
                onChange={(e) => setSetup({ ...setup, entry: e.target.value })}
                className="bg-gray-700 text-gray-200 rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target</label>
              <input
                type="text"
                value={setup.target}
                onChange={(e) => setSetup({ ...setup, target: e.target.value })}
                className="w-full bg-gray-700 text-gray-200 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Stop-Loss</label>
              <input
                type="text"
                value={setup.stopLoss}
                onChange={(e) => setSetup({ ...setup, stopLoss: e.target.value })}
                className="w-full bg-gray-700 text-gray-200 rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Note</label>
            <textarea
              value={setup.note}
              onChange={(e) => setSetup({ ...setup, note: e.target.value })}
              className="w-full h-32 bg-gray-700 text-gray-200 rounded px-3 py-2 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Tags</label>
            <input
              type="text"
              value={setup.tags}
              onChange={(e) => setSetup({ ...setup, tags: e.target.value })}
              placeholder="Separate tags with commas"
              className="w-full bg-gray-700 text-gray-200 rounded px-3 py-2"
            />
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400">Risk/Reward Ratio</div>
            <div className="text-xl text-gray-200">--</div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onSave(setup)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
