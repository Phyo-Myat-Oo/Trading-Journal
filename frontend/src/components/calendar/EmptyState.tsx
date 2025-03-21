import { Text } from '@mantine/core';

interface EmptyStateProps {
  activeTab: 'trades' | 'dailyNotes';
  setActiveTab: (tab: 'trades' | 'dailyNotes') => void;
}

export default function EmptyState({ activeTab, setActiveTab }: EmptyStateProps) {
  return (
    <div className="text-center py-8 sm:py-12">
      <div className="bg-[#2C2E33]/50 p-4 rounded-lg inline-block mb-6">
        <svg className="w-12 h-12 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <Text className="text-gray-400 text-sm sm:text-base">No trades recorded for this date.</Text>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
        <button 
          onClick={() => setActiveTab('trades')}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
        >
          Add Trade
        </button>
      </div>
      
      {/* Empty state forms */}
      <div className="mt-8">
        {/* Trades Form - Empty State */}
        <div className={activeTab === 'trades' ? 'block' : 'hidden'}>
          <div className="bg-[#2C2E33] rounded-lg p-4 text-left">
            <h4 className="text-gray-300 font-medium text-sm sm:text-base mb-4">Add New Trade</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-xs sm:text-sm block mb-1">Symbol</label>
                <input 
                  type="text" 
                  className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. AAPL"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs sm:text-sm block mb-1">Side</label>
                <select className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select side</option>
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs sm:text-sm block mb-1">Entry Price</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs sm:text-sm block mb-1">Exit Price</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs sm:text-sm block mb-1">Quantity</label>
                <input 
                  type="number" 
                  className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs sm:text-sm block mb-1">Position Type</label>
                <select className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select position</option>
                  <option value="Swing">Swing</option>
                  <option value="Day">Day</option>
                  <option value="Scalp">Scalp</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors">
                Save Trade
              </button>
            </div>
          </div>
        </div>
        
        {/* Daily Notes Tab - Empty State */}
        <div className={activeTab === 'dailyNotes' ? 'block' : 'hidden'}>
          <div className="text-center py-8 bg-[#2C2E33] rounded-lg border border-[#3A3D45]">
            <div className="text-gray-400 mb-4">No daily notes for this date.</div>
          </div>
        </div>
      </div>
    </div>
  );
} 