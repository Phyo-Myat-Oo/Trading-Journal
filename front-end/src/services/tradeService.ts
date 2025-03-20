import { TradeData } from '../components/dialogs/TradeDialog';

const TRADES_STORAGE_KEY = 'trading_journal_trades';

export interface TradeWithId extends TradeData {
  id: string;
  createdAt: string;
  updatedAt: string;
  accountId: string;
}

// Create a local variable for the service functions to use 'this' properly
const service = {
  getTrades: (accountId: string): TradeWithId[] => {
    try {
      const storedTrades = localStorage.getItem(TRADES_STORAGE_KEY);
      if (!storedTrades) return [];
      
      const allTrades: TradeWithId[] = JSON.parse(storedTrades);
      return allTrades.filter(trade => trade.accountId === accountId);
    } catch (error) {
      console.error('Error getting trades:', error);
      return [];
    }
  },

  getAllTrades: (): TradeWithId[] => {
    try {
      const storedTrades = localStorage.getItem(TRADES_STORAGE_KEY);
      if (!storedTrades) return [];
      
      return JSON.parse(storedTrades);
    } catch (error) {
      console.error('Error getting all trades:', error);
      return [];
    }
  },

  saveTrade: (trade: TradeData, accountId: string): TradeWithId => {
    try {
      const now = new Date().toISOString();
      const tradeWithId: TradeWithId = {
        ...trade,
        id: Math.random().toString(36).substring(2, 15),
        createdAt: now,
        updatedAt: now,
        accountId
      };

      const existingTrades = service.getAllTrades();
      const updatedTrades = [...existingTrades, tradeWithId];
      
      localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(updatedTrades));
      return tradeWithId;
    } catch (error) {
      console.error('Error saving trade:', error);
      throw new Error('Failed to save trade');
    }
  },

  updateTrade: (id: string, updatedData: Partial<TradeData>): TradeWithId => {
    try {
      const existingTrades = service.getAllTrades();
      const tradeIndex = existingTrades.findIndex((trade: TradeWithId) => trade.id === id);
      
      if (tradeIndex === -1) {
        throw new Error(`Trade with id ${id} not found`);
      }

      const updatedTrade: TradeWithId = {
        ...existingTrades[tradeIndex],
        ...updatedData,
        updatedAt: new Date().toISOString()
      };

      existingTrades[tradeIndex] = updatedTrade;
      localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(existingTrades));
      
      return updatedTrade;
    } catch (error) {
      console.error('Error updating trade:', error);
      throw new Error('Failed to update trade');
    }
  },

  deleteTrade: (id: string): void => {
    try {
      const existingTrades = service.getAllTrades();
      const updatedTrades = existingTrades.filter((trade: TradeWithId) => trade.id !== id);
      
      localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(updatedTrades));
    } catch (error) {
      console.error('Error deleting trade:', error);
      throw new Error('Failed to delete trade');
    }
  }
};

export const tradeService = service; 