import { Trade } from '../../types/trade';
import dayjs from 'dayjs';

interface DayTrades {
  trades: Trade[];
  totalProfit: number;
  winRate: number;
}

interface CalendarGridProps {
  currentMonth: Date;
  getTradesForDate: (date: Date) => DayTrades;
  onDateClick: (date: Date) => void;
}

export default function CalendarGrid({ currentMonth, getTradesForDate, onDateClick }: CalendarGridProps) {
  // Generate days for calendar grid
  const generateCalendarDays = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Calculate days from previous month to fill the first row
    const daysFromPrevMonth = firstDayOfWeek;
    
    const days: Date[] = [];
    
    // Add days from previous month
    const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
    for (let i = prevMonthLastDay - daysFromPrevMonth + 1; i <= prevMonthLastDay; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, i));
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    
    // Add days from next month to complete the grid (6 rows * 7 days = 42 cells)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i));
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  
  const handleDateCellClick = (date: Date) => {
    console.log('Date cell clicked:', date);
    onDateClick(date);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Day names */}
      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <div key={index} className="text-gray-400 text-xs sm:text-sm font-normal text-center py-1 sm:py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 min-h-0 auto-rows-fr">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const isToday = dayjs(date).isSame(new Date(), 'day');
          const dayTrades = getTradesForDate(date);
          const hasTrades = dayTrades.trades.length > 0 && isCurrentMonth;

          return (
            <button
              key={index}
              onClick={() => handleDateCellClick(date)}
              className={`
                flex flex-col justify-between
                cursor-pointer bg-[#25262B]
                ${isToday ? 'ring-1 ring-blue-500/30' : ''}
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${hasTrades ? 'hover:ring-2 ring-blue-500/20' : 'hover:bg-[#2C2E33]'}
                transition-all duration-200
                p-1.5 sm:p-3 rounded-lg h-full
                relative z-0 text-left
              `}
            >
              <div className="flex justify-between items-center">
                <div className={`
                  text-sm sm:text-base font-medium
                  ${!isCurrentMonth ? 'text-gray-500' : isToday ? 'text-blue-400' : 'text-gray-300'}
                `}>
                  {date.getDate()}
                </div>
                {hasTrades && (
                  <div className="text-gray-400 text-[10px] sm:text-xs px-1.5 py-0.5 bg-gray-700/40 rounded-full">
                    {dayTrades.trades.length}
                  </div>
                )}
              </div>
              {hasTrades && (
                <div className="mt-auto">
                  <div className={`
                    text-xs sm:text-sm font-medium
                    ${dayTrades.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    {dayTrades.totalProfit >= 0 ? '+' : '-'}${Math.abs(dayTrades.totalProfit).toFixed(2)}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}