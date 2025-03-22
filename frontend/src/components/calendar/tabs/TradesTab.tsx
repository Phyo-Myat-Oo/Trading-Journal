import { Badge } from '@mantine/core';
import { useState } from 'react';
import { Trade } from '../../../types/trade';
import { RiArrowRightLine, RiArrowDownLine, RiAddLine } from 'react-icons/ri';
import { TradeDialog, TradeData } from '../../dialogs/TradeDialog';

interface TradesTabProps {
  trades: Trade[];
}

export default function TradesTab({ trades }: TradesTabProps) {
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);

  const toggleTradeDetails = (tradeId: string) => {
    if (expandedTradeId === tradeId) {
      setExpandedTradeId(null);
    } else {
      setExpandedTradeId(tradeId);
    }
  };
  
  const handleOpenTradeDialog = () => {
    setIsTradeDialogOpen(true);
  };
  
  const handleCloseTradeDialog = () => {
    setIsTradeDialogOpen(false);
  };
  
  const handleSaveTrade = (tradeData: TradeData) => {
    console.log('New trade saved:', tradeData);
    // Here you would add the new trade to your state/backend
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-gray-300 font-medium">Trades</h4>
        <button 
          onClick={handleOpenTradeDialog}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-colors"
        >
          <RiAddLine size={16} />
          Add Trade
        </button>
      </div>
      
      <div className="space-y-2 sm:space-y-3">
        {trades.length > 0 ? (
          trades.map((trade) => {
            const isExpanded = expandedTradeId === trade.id;
            return (
              <div
                key={trade.id}
                className="bg-[#2C2E33] rounded-lg overflow-hidden hover:bg-[#32343a] transition-colors border border-[#3A3D45]"
              >
                <div 
                  className="p-3 sm:p-4 cursor-pointer"
                  onClick={() => toggleTradeDetails(trade.id)}
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
                        className={`bg-blue-500/10 text-blue-400 border-0`}
                      >
                        {trade.position}
                      </Badge>
                      <Badge 
                        size="sm" 
                        className={`${
                          trade.status === 'WIN' 
                            ? 'bg-green-500/10 text-green-400' 
                            : 'bg-red-500/10 text-red-400'
                        } border-0`}
                      >
                        {trade.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-base sm:text-lg font-medium ${
                        trade.return >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${trade.return.toFixed(2)}
                      </div>
                      <div className="text-gray-400">
                        {isExpanded ? <RiArrowDownLine size={20} /> : <RiArrowRightLine size={20} />}
                      </div>
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
                
                {/* Expandable details section */}
                {isExpanded && (
                  <div className="border-t border-[#3A3D45] p-3 sm:p-4 bg-[#25262B]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Entry Total</div>
                        <div className="text-gray-200 text-sm">${trade.entryTotal.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Exit Total</div>
                        <div className="text-gray-200 text-sm">${trade.exitTotal.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Return %</div>
                        <div className={`text-sm ${trade.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.returnPercent.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Date</div>
                        <div className="text-gray-200 text-sm">{trade.date}</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end gap-2">
                      <button className="px-3 py-1.5 bg-[#32343a] hover:bg-[#3A3D45] text-gray-300 rounded-md text-xs transition-colors">
                        Edit Trade
                      </button>
                      <button className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-md text-xs transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 bg-[#2C2E33] rounded-lg border border-[#3A3D45]">
            <div className="text-gray-400 mb-4">No transactions for this date.</div>
            <button 
              onClick={handleOpenTradeDialog}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors inline-flex items-center gap-1.5"
            >
              <RiAddLine size={16} />
              Add Trade
            </button>
          </div>
        )}
      </div>
      
      {/* Use the original TradeDialog component with increased z-index */}
      <TradeDialog
        isOpen={isTradeDialogOpen}
        onClose={handleCloseTradeDialog}
        onSave={handleSaveTrade}
        className="z-[20000]"
      />
    </div>
  );
}