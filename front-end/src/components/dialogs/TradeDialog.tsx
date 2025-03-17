import { useState } from 'react';

interface TradeDialogProps {
  onClose: () => void;
  onSave: (trade: any) => void;
}

export const TradeDialog = ({ onClose, onSave }: TradeDialogProps) => {
  const [trade, setTrade] = useState({
    market: 'CRYPTO',
    symbol: '',
    target: '',
    stopLoss: '',
    entries: [{
      action: 'BUY',
      datetime: new Date().toISOString().slice(0, 16),
      quantity: '',
      price: '',
      fee: '0'
    }]
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 w-[600px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl text-gray-200">New Trade</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg text-gray-300 mb-4">General</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Market</label>
                <select
                  value={trade.market}
                  onChange={(e) => setTrade({ ...trade, market: e.target.value })}
                  className="w-full bg-gray-700 text-gray-200 rounded px-3 py-2"
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
                  value={trade.symbol}
                  onChange={(e) => setTrade({ ...trade, symbol: e.target.value })}
                  className="w-full bg-gray-700 text-gray-200 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target</label>
                <input
                  type="text"
                  value={trade.target}
                  onChange={(e) => setTrade({ ...trade, target: e.target.value })}
                  className="w-full bg-gray-700 text-gray-200 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stop-Loss</label>
                <input
                  type="text"
                  value={trade.stopLoss}
                  onChange={(e) => setTrade({ ...trade, stopLoss: e.target.value })}
                  className="w-full bg-gray-700 text-gray-200 rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg text-gray-300 mb-4">Journal</h3>
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-sm">
                  <th className="py-2 text-left">Action</th>
                  <th className="py-2 text-left">Date/Time</th>
                  <th className="py-2 text-left">Quantity</th>
                  <th className="py-2 text-left">Price</th>
                  <th className="py-2 text-left">Fee</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trade.entries.map((entry, index) => (
                  <tr key={index}>
                    <td className="py-2">
                      <select
                        value={entry.action}
                        onChange={(e) => {
                          const newEntries = [...trade.entries];
                          newEntries[index] = { ...entry, action: e.target.value };
                          setTrade({ ...trade, entries: newEntries });
                        }}
                        className="bg-green-500 text-white rounded px-3 py-1"
                      >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>
                    </td>
                    <td className="py-2">
                      <input
                        type="datetime-local"
                        value={entry.datetime}
                        onChange={(e) => {
                          const newEntries = [...trade.entries];
                          newEntries[index] = { ...entry, datetime: e.target.value };
                          setTrade({ ...trade, entries: newEntries });
                        }}
                        className="bg-gray-700 text-gray-200 rounded px-3 py-1"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={entry.quantity}
                        onChange={(e) => {
                          const newEntries = [...trade.entries];
                          newEntries[index] = { ...entry, quantity: e.target.value };
                          setTrade({ ...trade, entries: newEntries });
                        }}
                        className="w-24 bg-gray-700 text-gray-200 rounded px-3 py-1"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={entry.price}
                        onChange={(e) => {
                          const newEntries = [...trade.entries];
                          newEntries[index] = { ...entry, price: e.target.value };
                          setTrade({ ...trade, entries: newEntries });
                        }}
                        className="w-24 bg-gray-700 text-gray-200 rounded px-3 py-1"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={entry.fee}
                        onChange={(e) => {
                          const newEntries = [...trade.entries];
                          newEntries[index] = { ...entry, fee: e.target.value };
                          setTrade({ ...trade, entries: newEntries });
                        }}
                        className="w-24 bg-gray-700 text-gray-200 rounded px-3 py-1"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => {
                          const newEntries = trade.entries.filter((_, i) => i !== index);
                          setTrade({ ...trade, entries: newEntries });
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => {
                setTrade({
                  ...trade,
                  entries: [
                    ...trade.entries,
                    {
                      action: 'BUY',
                      datetime: new Date().toISOString().slice(0, 16),
                      quantity: '',
                      price: '',
                      fee: '0'
                    }
                  ]
                });
              }}
              className="mt-2 text-blue-400 hover:text-blue-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onSave(trade)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
