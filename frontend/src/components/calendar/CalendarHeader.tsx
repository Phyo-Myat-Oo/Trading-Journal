import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import dayjs from 'dayjs';

interface CalendarHeaderProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export default function CalendarHeader({ currentMonth, onMonthChange }: CalendarHeaderProps) {
  // Go to previous month
  const prevMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() - 1);
    onMonthChange(date);
  };

  // Go to next month
  const nextMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() + 1);
    onMonthChange(date);
  };

  return (
    <div className="flex justify-between items-center mb-4 sm:mb-6">
      <button 
        onClick={prevMonth}
        className="text-gray-400 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center hover:bg-[#25262B] rounded-lg transition-all hover:text-white bg-[#25262B]"
      >
        <RiArrowLeftSLine className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <div className="flex items-center gap-4">
        {/* Month selector */}
        <div className="flex flex-col items-center">
          <button 
            onClick={() => {
              const newDate = new Date(currentMonth);
              newDate.setMonth(currentMonth.getMonth() - 1);
              onMonthChange(newDate);
            }}
            className="text-gray-400 hover:text-white w-8 h-5 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>
            </svg>
          </button>
          <div className="bg-[#25262B] px-4 py-1.5 rounded-lg text-gray-300 text-sm sm:text-base font-medium w-28 sm:w-32 text-center">
            {dayjs(currentMonth).format('MMMM')}
          </div>
          <button 
            onClick={() => {
              const newDate = new Date(currentMonth);
              newDate.setMonth(currentMonth.getMonth() + 1);
              onMonthChange(newDate);
            }}
            className="text-gray-400 hover:text-white w-8 h-5 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
            </svg>
          </button>
        </div>

        {/* Year selector */}
        <div className="flex flex-col items-center">
          <button 
            onClick={() => {
              const newDate = new Date(currentMonth);
              newDate.setFullYear(currentMonth.getFullYear() - 1);
              onMonthChange(newDate);
            }}
            className="text-gray-400 hover:text-white w-8 h-5 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>
            </svg>
          </button>
          <div className="bg-[#25262B] px-4 py-1.5 rounded-lg text-gray-300 text-sm sm:text-base font-medium w-20 sm:w-24 text-center">
            {dayjs(currentMonth).format('YYYY')}
          </div>
          <button 
            onClick={() => {
              const newDate = new Date(currentMonth);
              newDate.setFullYear(currentMonth.getFullYear() + 1);
              onMonthChange(newDate);
            }}
            className="text-gray-400 hover:text-white w-8 h-5 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
            </svg>
          </button>
        </div>
      </div>

      <button 
        onClick={nextMonth}
        className="text-gray-400 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center hover:bg-[#25262B] rounded-lg transition-all hover:text-white bg-[#25262B]"
      >
        <RiArrowRightSLine className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    </div>
  );
} 