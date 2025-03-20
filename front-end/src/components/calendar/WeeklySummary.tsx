export default function WeeklySummary() {
  return (
    <div className="lg:w-64 flex-shrink-0">
      <div className="bg-[#25262B] rounded-lg p-3 sm:p-4 lg:sticky lg:top-0">
        <h3 className="text-gray-300 font-medium mb-3 sm:mb-4">Weekly Summary</h3>
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-3 sm:gap-4">
          <div className="pb-3 sm:pb-4 border-b border-[#2C2E33]">
            <div className="text-gray-400 text-xs sm:text-sm mb-1">Total Trades</div>
            <div className="text-lg sm:text-xl font-medium text-gray-200">0</div>
          </div>
          <div className="pb-3 sm:pb-4 border-b border-[#2C2E33]">
            <div className="text-gray-400 text-xs sm:text-sm mb-1">Win Rate</div>
            <div className="text-lg sm:text-xl font-medium text-gray-200">0%</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs sm:text-sm mb-1">Profit/Loss</div>
            <div className="text-lg sm:text-xl font-medium text-gray-200">$0</div>
          </div>
        </div>
      </div>
    </div>
  );
} 