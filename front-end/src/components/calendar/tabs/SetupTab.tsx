export default function SetupTab() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="bg-[#2C2E33] rounded-lg p-3 sm:p-4">
        <div className="mb-3">
          <h4 className="text-gray-300 font-medium text-sm sm:text-base mb-2">Trading Setup</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-gray-400 text-xs sm:text-sm block mb-1">Strategy Used</label>
              <select className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select strategy</option>
                <option value="breakout">Breakout</option>
                <option value="momentum">Momentum</option>
                <option value="reversal">Reversal</option>
                <option value="swing">Swing</option>
                <option value="scalping">Scalping</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs sm:text-sm block mb-1">Risk Level</label>
              <select className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select risk level</option>
                <option value="low">Low (0.5-1%)</option>
                <option value="medium">Medium (1-2%)</option>
                <option value="high">High (2-3%)</option>
                <option value="very-high">Very High (3%+)</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-gray-400 text-xs sm:text-sm block mb-1">Setup Description</label>
            <textarea 
              className="w-full bg-[#363940] border border-[#464A55] rounded-lg p-3 text-gray-200 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Describe your trading setup, indicators used, and chart patterns identified..."
              rows={4}
            ></textarea>
          </div>
          <div className="mt-3">
            <label className="text-gray-400 text-xs sm:text-sm block mb-1">Upload Chart Image</label>
            <div className="border-dashed border-2 border-[#464A55] rounded-lg p-4 text-center">
              <div className="text-gray-400 text-xs sm:text-sm">
                Drop image here or click to upload
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors">
            Save Setup
          </button>
        </div>
      </div>
    </div>
  );
}