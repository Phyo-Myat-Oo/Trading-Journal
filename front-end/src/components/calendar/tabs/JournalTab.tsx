export default function JournalTab() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="bg-[#2C2E33] rounded-lg p-3 sm:p-4">
        <div className="mb-3">
          <h4 className="text-gray-300 font-medium text-sm sm:text-base mb-2">Trading Notes</h4>
          <textarea 
            className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-3 text-gray-200 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Record your thoughts, strategies, and lessons from today's trading session..."
            rows={6}
          ></textarea>
        </div>
        <div className="flex flex-col gap-3 mt-4">
          <div>
            <label className="text-gray-400 text-xs sm:text-sm block mb-1">Market Conditions</label>
            <select className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select condition</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="sideways">Sideways</option>
              <option value="volatile">Volatile</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs sm:text-sm block mb-1">Emotional State</label>
            <select className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select state</option>
              <option value="calm">Calm</option>
              <option value="confident">Confident</option>
              <option value="anxious">Anxious</option>
              <option value="impulsive">Impulsive</option>
              <option value="frustrated">Frustrated</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors">
            Save Journal Entry
          </button>
        </div>
      </div>
    </div>
  );
} 