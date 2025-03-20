import { Modal, Badge } from '@mantine/core';
import dayjs from 'dayjs';
import { Trade } from '../../types/trade';
import TransactionsTab from './tabs/TransactionsTab';
import JournalTab from './tabs/JournalTab';
import SetupTab from './tabs/SetupTab';
import EmptyState from './EmptyState';

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
  activeTab: 'transactions' | 'journal' | 'setup';
  setActiveTab: (tab: 'transactions' | 'journal' | 'setup') => void;
}

function TradeModal({ 
  isOpen, 
  onClose, 
  selectedDate,
  getTradesForDate,
  activeTab,
  setActiveTab
}: TradeModalProps) {
  console.log('TradeModal render:', { isOpen, selectedDate });
  
  // Early return if no date is selected
  if (!selectedDate) {
    console.log('No selected date, not rendering modal');
    return null;
  }
  
  const dayTrades = getTradesForDate(selectedDate);
  const hasTrades = dayTrades.trades.length > 0;
  const formattedDate = dayjs(selectedDate).format('MMMM D, YYYY');
  
  console.log('Modal state:', { isOpen, formattedDate, hasTrades });

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      withCloseButton={true}
      closeOnClickOutside={true}
      closeOnEscape={true}
      title={
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
      }
      size="xl"
      centered
      zIndex={1100}
      styles={{
        header: {
          backgroundColor: '#1C1E26',
          borderBottom: '1px solid #2C2E33',
          padding: '16px 20px',
          '@media(minWidth: 640px)': {
            padding: '24px',
          },
        },
        content: {
          backgroundColor: '#1C1E26',
          padding: '16px 20px',
          '@media(minWidth: 640px)': {
            padding: '24px',
          },
        },
        close: {
          color: '#6B7280',
          '&:hover': {
            backgroundColor: '#2C2E33',
          },
        },
        body: {
          padding: '0',
        },
        inner: {
          padding: '8px',
          '@media(minWidth: 640px)': {
            padding: '16px',
          },
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)'
        }
      }}
    >
      {hasTrades ? (
        <div className="space-y-3 sm:space-y-4">
          {/* Tab navigation for different sections */}
          <div className="flex border-b border-[#2C2E33]">
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-4 text-sm sm:text-base font-medium transition-colors ${
                activeTab === 'transactions' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Transactions
            </button>
            <button 
              onClick={() => setActiveTab('journal')}
              className={`py-2 px-4 text-sm sm:text-base font-medium transition-colors ${
                activeTab === 'journal' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Journal
            </button>
            <button 
              onClick={() => setActiveTab('setup')}
              className={`py-2 px-4 text-sm sm:text-base font-medium transition-colors ${
                activeTab === 'setup' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Setup
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
          <div className={activeTab === 'transactions' ? 'block' : 'hidden'}>
            <TransactionsTab trades={dayTrades.trades} />
          </div>
          <div className={activeTab === 'journal' ? 'block' : 'hidden'}>
            <JournalTab />
          </div>
          <div className={activeTab === 'setup' ? 'block' : 'hidden'}>
            <SetupTab />
          </div>
        </div>
      ) : (
        <EmptyState activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </Modal>
  );
}

export default TradeModal;