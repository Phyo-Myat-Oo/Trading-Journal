import { Badge } from '@mantine/core';
import dayjs from 'dayjs';
import { Trade } from '../../types/trade';
import TradesTab from './tabs/TradesTab';
import DailyNotesTab from './tabs/DailyNotesTab';
import EmptyState from './EmptyState';
import { useEffect } from 'react';

interface DayTrades {
  trades: Trade[];
  totalProfit: number;
  winRate: number;
}

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  getTradesForDate: (date: Date) => DayTrades;
  activeTab: 'trades' | 'dailyNotes';
  setActiveTab: (tab: 'trades' | 'dailyNotes') => void;
}

// Force the modal to be initialized in client-side rendering only
function TradeModal({ 
  isOpen, 
  onClose, 
  selectedDate,
  getTradesForDate,
  activeTab,
  setActiveTab
}: TradeModalProps) {
  console.log('TradeModal render:', { isOpen, selectedDate });
  
  // Force re-render when isOpen changes
  useEffect(() => {
    console.log('Modal isOpen changed:', isOpen);
    // Adding a small timeout can help with rendering issues
    const timeoutId = setTimeout(() => {
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  // Early return if no date is selected
  if (!selectedDate) {
    console.log('No selected date, not rendering modal');
    return null;
  }
  
  const dayTrades = getTradesForDate(selectedDate);
  const hasTrades = dayTrades.trades.length > 0;
  const formattedDate = dayjs(selectedDate).format('MMMM D, YYYY');
  
  console.log('Modal state:', { isOpen, formattedDate, hasTrades });

  // Create a custom modal if Mantine's modal isn't working
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-[#1C1E26] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#2C2E33] p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg sm:text-xl font-medium text-gray-200">
                {formattedDate}
              </h3>
              {hasTrades && (
                <Badge 
                  size="lg" 
                  className="bg-blue-500/10 text-blue-400 border-0"
                >
                  {dayTrades.trades.length} {dayTrades.trades.length === 1 ? 'Trade' : 'Trades'}
                </Badge>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 hover:bg-[#2C2E33] rounded-full p-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Body */}
          <div className="p-4 sm:p-6">
            {hasTrades ? (
              <div className="space-y-3 sm:space-y-4">
                {/* Tab navigation for different sections */}
                <div className="flex border-b border-[#2C2E33]">
                  <button 
                    onClick={() => setActiveTab('trades')}
                    className={`py-2 px-4 text-sm sm:text-base font-medium transition-colors ${
                      activeTab === 'trades' 
                        ? 'text-blue-400 border-b-2 border-blue-400' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Trades
                  </button>
                  <button 
                    onClick={() => setActiveTab('dailyNotes')}
                    className={`py-2 px-4 text-sm sm:text-base font-medium transition-colors ${
                      activeTab === 'dailyNotes' 
                        ? 'text-blue-400 border-b-2 border-blue-400' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Daily Notes
                  </button>
                </div>

                {/* Summary Section - always visible */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 bg-[#2C2E33] rounded-lg mb-4 sm:mb-6">
                  <div>
                    <div className="text-gray-400 text-xs sm:text-sm mb-1">Total Profit/Loss</div>
                    <div className={`text-lg sm:text-xl font-medium ${
                      dayTrades.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${dayTrades.totalProfit.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs sm:text-sm mb-1">Win Rate</div>
                    <div className="text-lg sm:text-xl font-medium text-gray-200">
                      {dayTrades.winRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs sm:text-sm mb-1">Total Trades</div>
                    <div className="text-lg sm:text-xl font-medium text-gray-200">
                      {dayTrades.trades.length}
                    </div>
                  </div>
                </div>

                {/* Tab content */}
                <div className={activeTab === 'trades' ? 'block' : 'hidden'}>
                  <TradesTab trades={dayTrades.trades} />
                </div>
                <div className={activeTab === 'dailyNotes' ? 'block' : 'hidden'}>
                  <DailyNotesTab />
                </div>
              </div>
            ) : (
              <EmptyState activeTab={activeTab} setActiveTab={setActiveTab} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TradeModal;