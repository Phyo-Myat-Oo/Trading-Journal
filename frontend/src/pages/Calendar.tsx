import { useState, useEffect } from 'react';
import { Trade } from '../types/trade';
import dayjs from 'dayjs';
import { MantineProvider } from '@mantine/core';
import CalendarHeader from '../components/calendar/CalendarHeader';
import CalendarGrid from '../components/calendar/CalendarGrid';
import WeeklySummary from '../components/calendar/WeeklySummary';
import TradeModal from '../components/calendar/TradeModal';

interface DayTrades {
  trades: Trade[];
  totalProfit: number;
  winRate: number;
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTradeListOpen, setIsTradeListOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'trades' | 'dailyNotes'>('trades');
  const [trades, setTrades] = useState<Record<string, Trade[]>>({});

  // Format today's date for mock data
  const todayFormatted = dayjs().format('YYYY-MM-DD');

  // Mock trades data - replace with actual data fetching
  const initialMockTrades: Record<string, Trade[]> = {
    [todayFormatted]: [
      {
        id: '2',
        date: todayFormatted,
        symbol: 'TSLA',
        status: 'WIN',
        side: 'LONG',
        qty: 10,
        entry: 180,
        exit: 190,
        entryTotal: 1800,
        exitTotal: 1900,
        position: 'Day',
        hold: '3h',
        return: 100,
        returnPercent: 5.56
      }
    ],
    '2024-03-20': [
      {
        id: '1',
        date: '2024-03-20',
        symbol: 'AAPL',
        status: 'WIN',
        side: 'LONG',
        qty: 100,
        entry: 150,
        exit: 155,
        entryTotal: 15000,
        exitTotal: 15500,
        position: 'Swing',
        hold: '2h',
        return: 500,
        returnPercent: 3.33
      },
    ]
  };

  // Initialize trades with mock data
  useEffect(() => {
    setTrades(initialMockTrades);
  }, []);

  const formatDate = (date: Date): string => {
    return dayjs(date).format('YYYY-MM-DD');
  };

  const getTradesForDate = (date: Date): DayTrades => {
    const dateStr = formatDate(date);
    const tradesToShow = trades[dateStr] || [];
    const winningTrades = tradesToShow.filter(t => t.status === 'WIN').length;
    const totalProfit = tradesToShow.reduce((sum, t) => sum + t.return, 0);
    const winRate = tradesToShow.length > 0 ? (winningTrades / tradesToShow.length) * 100 : 0;

    return {
      trades: tradesToShow,
      totalProfit,
      winRate
    };
  };

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
    
    // Always set active tab to trades first
    setActiveTab('trades');
    
    // Update the selected date
    setSelectedDate(date);
    
    // Open the modal
    setIsTradeListOpen(true);
  };

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
  };
  
  // Function to create a demo trade for testing
  const createDemoTrade = (date: Date) => {
    const dateString = formatDate(date);
    const newTrade: Trade = {
      id: `trade-${Date.now()}`,
      date: dateString,
      symbol: 'DEMO',
      status: 'WIN',
      side: 'LONG',
      qty: 50,
      entry: 100,
      exit: 110,
      entryTotal: 5000,
      exitTotal: 5500,
      position: 'Day',
      hold: '1h',
      return: 500,
      returnPercent: 10
    };
    
    setTrades(prevTrades => {
      const updatedTrades = {...prevTrades};
      if (!updatedTrades[dateString]) {
        updatedTrades[dateString] = [];
      }
      updatedTrades[dateString].push(newTrade);
      return updatedTrades;
    });
  };
  
  // Debug modal state
  useEffect(() => {
    console.log('Modal state updated:', { isTradeListOpen, selectedDate });
  }, [isTradeListOpen, selectedDate]);

  return (
    <MantineProvider
      theme={{
        primaryColor: 'blue',
      }}
    >
      <div className="h-full min-h-0 bg-[#1A1B1E] p-2 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
          <div className="flex-1 flex flex-col min-w-0">
            <CalendarHeader 
              currentMonth={currentMonth} 
              onMonthChange={handleMonthChange} 
            />
            
            <CalendarGrid 
              currentMonth={currentMonth}
              getTradesForDate={getTradesForDate}
              onDateClick={handleDateClick}
            />
          </div>
          
          <WeeklySummary />
        </div>

        {/* Trade Modal - Custom implementation to avoid Mantine Modal issues */}
        {selectedDate && (
          <TradeModal
            isOpen={isTradeListOpen}
            onClose={() => setIsTradeListOpen(false)}
            selectedDate={selectedDate}
            getTradesForDate={getTradesForDate}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}
        
        {/* Testing button to create a trade for the selected date */}
        {selectedDate && (
          <button 
            onClick={() => createDemoTrade(selectedDate)}
            className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
          >
            Create Demo Trade
          </button>
        )}
      </div>
    </MantineProvider>
  );
}