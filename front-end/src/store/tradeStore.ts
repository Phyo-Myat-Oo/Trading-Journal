import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trade, TradeSetup, DayNote } from '../types/trading';

interface TradeStore {
  trades: Trade[];
  setups: TradeSetup[];
  dayNotes: DayNote[];
  selectedPeriod: {
    start: string;
    end: string;
  };
  // Trade Actions
  addTrade: (trade: Omit<Trade, 'id'>) => void;
  updateTrade: (id: string, trade: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  // Setup Actions
  addSetup: (setup: Omit<TradeSetup, 'id'>) => void;
  updateSetup: (id: string, setup: Partial<TradeSetup>) => void;
  deleteSetup: (id: string) => void;
  // Note Actions
  addDayNote: (note: Omit<DayNote, 'id'>) => void;
  updateDayNote: (id: string, note: Partial<DayNote>) => void;
  deleteDayNote: (id: string) => void;
  // Period Actions
  setSelectedPeriod: (period: { start: string; end: string }) => void;
}

export const useTradeStore = create<TradeStore>()(
  persist(
    (set) => ({
      trades: [],
      setups: [],
      dayNotes: [],
      selectedPeriod: {
        start: new Date(new Date().getFullYear(), 0, 1).toISOString(),
        end: new Date().toISOString(),
      },

      // Trade Actions
      addTrade: (trade) =>
        set((state) => ({
          trades: [...state.trades, { ...trade, id: crypto.randomUUID() }],
        })),
      updateTrade: (id, updatedTrade) =>
        set((state) => ({
          trades: state.trades.map((trade) =>
            trade.id === id ? { ...trade, ...updatedTrade } : trade
          ),
        })),
      deleteTrade: (id) =>
        set((state) => ({
          trades: state.trades.filter((trade) => trade.id !== id),
        })),

      // Setup Actions
      addSetup: (setup) =>
        set((state) => ({
          setups: [...state.setups, { ...setup, id: crypto.randomUUID() }],
        })),
      updateSetup: (id, updatedSetup) =>
        set((state) => ({
          setups: state.setups.map((setup) =>
            setup.id === id ? { ...setup, ...updatedSetup } : setup
          ),
        })),
      deleteSetup: (id) =>
        set((state) => ({
          setups: state.setups.filter((setup) => setup.id !== id),
        })),

      // Note Actions
      addDayNote: (note) =>
        set((state) => ({
          dayNotes: [...state.dayNotes, { ...note, id: crypto.randomUUID() }],
        })),
      updateDayNote: (id, updatedNote) =>
        set((state) => ({
          dayNotes: state.dayNotes.map((note) =>
            note.id === id ? { ...note, ...updatedNote } : note
          ),
        })),
      deleteDayNote: (id) =>
        set((state) => ({
          dayNotes: state.dayNotes.filter((note) => note.id !== id),
        })),

      // Period Actions
      setSelectedPeriod: (period) =>
        set(() => ({
          selectedPeriod: period,
        })),
    }),
    {
      name: 'trade-storage',
    }
  )
); 