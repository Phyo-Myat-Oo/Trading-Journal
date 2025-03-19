import React, { useState } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  subMonths, startOfYear, endOfYear, subYears, subDays, getDaysInMonth,addDays } from 'date-fns';
import { DateRangeSlider } from './DateRangeSlider';
import { SimplePresetButtonGroup, DatePreset } from './SimplePresetButtonGroup';

interface DateFilterComponentProps {
  onDateRangeChange?: (range: [Date, Date]) => void;
  defaultDateRange?: [Date, Date];
  isMobile?: boolean;
}

export const DateFilterComponent: React.FC<DateFilterComponentProps> = ({
  onDateRangeChange,
  defaultDateRange,
  isMobile = false
}) => {
  // Set default date range if not provided (default to today)
  const getDefaultRange = (): [Date, Date] => {
    if (defaultDateRange) return defaultDateRange;
    const now = new Date();
    return [startOfDay(now), endOfDay(now)];
  };

  const [dateRange, setDateRange] = useState<[Date, Date]>(getDefaultRange());
  const [activePreset, setActivePreset] = useState<DatePreset>('today');
  
  // Get date range based on preset
  const getPresetDateRange = (preset: DatePreset): [Date, Date] => {
    const now = new Date();
    
    switch (preset) {
      case 'today':
        return [startOfDay(now), now];
      
      case 'yesterday': {
        const yesterday = subDays(now, 1);
        return [startOfDay(yesterday), endOfDay(yesterday)];
      }
      
      case 'thisWeek':
        return [startOfWeek(now, { weekStartsOn: 1 }), now];
      
      case 'lastWeek': {
        const lastWeekStart = subDays(startOfWeek(now, { weekStartsOn: 1 }), 7);
        const lastWeekEnd = subDays(endOfWeek(now, { weekStartsOn: 1 }), 7);
        return [lastWeekStart, lastWeekEnd];
      }
      
      case 'thisMonth':
        return [startOfMonth(now), now];
      
      case 'lastMonth': {
        const lastMonth = subMonths(now, 1);
        return [startOfMonth(lastMonth), endOfMonth(lastMonth)];
      }
      
      case 'last3Months': {
        const threeMonthsAgo = subMonths(now, 3);
        return [startOfMonth(threeMonthsAgo), now];
      }
      
      case 'thisYear':
        return [startOfYear(now), now];
      
      case 'lastYear': {
        const lastYear = subYears(now, 1);
        return [startOfYear(lastYear), endOfYear(lastYear)];
      }
      
      case 'reset':
      default:
        return getDefaultRange();
    }
  };

  // Generate markers based on preset
  const getMarkers = (preset: DatePreset, range: [Date, Date]): { date: Date, label: string }[] => {
    const [start, end] = range;
    const markers: { date: Date, label: string }[] = [];
    
    switch (preset) {
      case 'today':
      case 'yesterday': {
        // Use hourly format for both today and yesterday
        // Markers at 00:00, 06:00, 12:00, 18:00, 23:59
        const base = startOfDay(start);
        markers.push({ date: base, label: '00:00' });
        
        for (let i = 6; i <= 18; i += 6) {
          const time = new Date(base);
          time.setHours(i, 0, 0);
          markers.push({ date: time, label: `${i.toString().padStart(2, '0')}:00` });
        }
        
        const endTime = endOfDay(start);
        markers.push({ date: endTime, label: '23:59' });
        break;
      }
      
      case 'thisWeek':
      case 'lastWeek': {
        // Markers for each day of the week
        const weekStart = new Date(start);
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + i);
          markers.push({ 
            date: day, 
            label: format(day, 'EEEd') // Mon 1, Tue 2, etc.
          });
        }
        break;
      }
      
      case 'thisMonth': {
        // Show markers for every day of the current month
        const daysInMonth = getDaysInMonth(start);
        const interval =Math.ceil(daysInMonth/4); // Weekly for longer months, more frequent for shorter

        for (let i = 1; i <= daysInMonth; i += interval) {
          const day = new Date(start.getFullYear(), start.getMonth(), i);
          markers.push({ 
            date: day, 
            label: format(day, 'd') // 1, 2, etc.
          });
        }
        
        // Make sure the end date is always marked if it's not already
        const lastDayOfMonth = endOfMonth(end);
        
        markers.push({ 
          date: lastDayOfMonth, 
          label: format(lastDayOfMonth, 'd')
        });
        break;
      }
        
      case 'lastMonth': { 
        const totalDays = getDaysInMonth(start);  // Get total days in the month
        const interval = Math.ceil(totalDays / 4); // Dynamically determine the interval (approx. 6 evenly spaced markers)
        
        for (let i = 0; i < totalDays; i += interval) {
            const markerDate = addDays(start, i);
            
            if (markerDate <= end) {
                markers.push({
                    date: markerDate,
                    label: format(markerDate, 'd') // Display day number (1, 5, 10, etc.)
                });
            }
        }
    
        // Ensure the last day is marked
        markers.push({ 
            date: end, 
            label: format(end, 'd')
        });
    
        break;
    }
      case 'last3Months': {
        // Markers at the start of each month
        for (let i = 0; i < 4; i++) {
          const month = subMonths(end, 3 - i);
          const firstDay = startOfMonth(month);
          markers.push({ 
            date: firstDay, 
            label: format(firstDay, 'MMM') // Jan, Feb, etc.
          });
        }
        markers.push({ date: end, label: format(end, 'MMMd') });
        break;
      }
      
      case 'thisYear': {
        // Markers for each month
        const yearStart = startOfYear(start);
        for (let i = 0; i < 12; i++) {
          const month = new Date(yearStart);
          month.setMonth(i);
          markers.push({ 
            date: month, 
            label: format(month, 'MMM') // Jan, Feb, etc.
          });
        }
        break;
      }
      case 'lastYear': {
        // Markers for each month
        const yearStart = startOfYear(start);
        for (let i = 0; i < 12; i++) {
          const month = new Date(yearStart);
          month.setMonth(i);
          markers.push({ 
            date: month, 
            label: format(month, 'MMM') // Jan, Feb, etc.
          });
        }
        break;
      }
      
      default:
        // Default markers at start and end
        {
          // Use hourly format for both today and yesterday
          // Markers at 00:00, 06:00, 12:00, 18:00, 23:59
          const base = startOfDay(start);
          markers.push({ date: base, label: '00:00' });
          
          for (let i = 6; i <= 18; i += 6) {
            const time = new Date(base);
            time.setHours(i, 0, 0);
            markers.push({ date: time, label: `${i.toString().padStart(2, '0')}:00` });
          }
          
          const endTime = endOfDay(start);
          markers.push({ date: endTime, label: '23:59' });
          break;
        }
    }
    
    return markers;
  };

  // Handle preset button click
  const handlePresetChange = (preset: DatePreset) => {
    setActivePreset(preset);
    const newRange = getPresetDateRange(preset);
    setDateRange(newRange);
    onDateRangeChange?.(newRange);
  };

  // Handle slider change - now accepts isManualAdjustment flag
  const handleSliderChange = (newRange: [Date, Date], isManualAdjustment?: boolean) => {
    setDateRange(newRange);
    onDateRangeChange?.(newRange);
    
    // Only change the active preset if this wasn't a manual slider adjustment
    // This allows the highlight to remain on the selected preset
    if (!isManualAdjustment) {
      setActivePreset('reset');
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      <SimplePresetButtonGroup 
        activePreset={activePreset} 
        onPresetChange={handlePresetChange}
        isMobile={isMobile}
      />
      
      <div className="px-4 py-2">
        <DateRangeSlider 
          dateRange={dateRange}
          onDateRangeChange={handleSliderChange}
          markers={getMarkers(activePreset, dateRange)}
        />
      </div>
    </div>
  );
}; 