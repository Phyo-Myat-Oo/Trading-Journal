import React, { useEffect, useState, useRef } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { format, differenceInDays, differenceInMonths, startOfDay, endOfDay, addHours, addDays, addMonths, isSameDay } from 'date-fns';

interface DateRangeSliderProps {
  dateRange: [Date, Date];
  onDateRangeChange: (range: [Date, Date], isManualAdjustment?: boolean) => void;
  markers?: { date: Date; label: string }[];
}

export const DateRangeSlider: React.FC<DateRangeSliderProps> = ({
  dateRange,
  onDateRangeChange,
  markers: externalMarkers,
}) => {
  // Keep track of the last user-set date range to prevent circular updates
  const userSetRangeRef = useRef<[Date, Date] | null>(null);
  
  // Track if we're currently dragging
  const isDraggingRef = useRef(false);
  
  // Calculate initial bounds and keep them stable
  const boundsRef = useRef({
    min: 0,
    max: 0,
    marks: {} as Record<number, string>
  });
  
  // State for current slider value
  const [sliderValue, setSliderValue] = useState<[number, number]>([
    dateRange[0].getTime(),
    dateRange[1].getTime()
  ]);
  
  // Initialize or update bounds and marks when dateRange changes significantly
  useEffect(() => {
    // Skip if we're dragging
    if (isDraggingRef.current) return;
    
    // Skip if this is just a round-trip of our own update
    if (userSetRangeRef.current) {
      const [userStart, userEnd] = userSetRangeRef.current;
      const [propsStart, propsEnd] = dateRange;
      
      // Check if the dates are the same (ignoring milliseconds)
      const startSame = Math.abs(userStart.getTime() - propsStart.getTime()) < 1000;
      const endSame = Math.abs(userEnd.getTime() - propsEnd.getTime()) < 1000;
      
      if (startSame && endSame) {
        // This is our own update coming back, so just update slider value
        setSliderValue([propsStart.getTime(), propsEnd.getTime()]);
        return;
      }
    }
    
    // This is a genuine new date range, recalculate everything
    const startTime = dateRange[0].getTime();
    const endTime = dateRange[1].getTime();
    const daysDiff = differenceInDays(dateRange[1], dateRange[0]);
    const monthsDiff = differenceInMonths(dateRange[1], dateRange[0]);
    
    // Reset user selection tracking
    userSetRangeRef.current = null;
    
    // Determine range padding based on scale
    const range = endTime - startTime;
    let padding = Math.max(range * 0.1, 60 * 60 * 1000);
    
    // Create markers based on range
    const marks: Record<number, string> = {};
    
    // Create appropriate markers based on range
    if (externalMarkers && externalMarkers.length > 0) {
      // Use external markers if provided
      externalMarkers.forEach(marker => {
        marks[marker.date.getTime()] = marker.label;
      });
      
      const markerTimes = externalMarkers.map(m => m.date.getTime());
      boundsRef.current.min = Math.min(...markerTimes);
      boundsRef.current.max = Math.max(...markerTimes);
    } 
    else if (daysDiff <= 1) {
      // For single day - show hours
      const baseDate = startOfDay(dateRange[0]);
      for (let hour = 0; hour <= 24; hour += 6) {
        const date = addHours(baseDate, hour);
        marks[date.getTime()] = format(date, 'HH:mm');
      }
      
      // End of day marker
      const endOfDayMark = endOfDay(baseDate).getTime();
      marks[endOfDayMark] = '23:59';
      
      padding = 30 * 60 * 1000; // 30 min for day view
      boundsRef.current.min = startTime - padding;
      boundsRef.current.max = endTime + padding;
    } 
    else if (daysDiff <= 31) {
      // For weeks/month - show days
      const markerCount = Math.min(8, daysDiff + 1);
      const dayStep = Math.max(1, Math.floor(daysDiff / (markerCount - 1)));
      
      // Add day markers
      for (let i = 0; i < markerCount; i++) {
        const date = addDays(dateRange[0], i * dayStep);
        if (date.getTime() <= dateRange[1].getTime()) {
          marks[date.getTime()] = format(date, 'MMM d');
        }
      }
      
      // Always include the end date
      marks[dateRange[1].getTime()] = format(dateRange[1], 'MMM d');
      
      padding = 24 * 60 * 60 * 1000; // 1 day padding
      boundsRef.current.min = startTime - padding;
      boundsRef.current.max = endTime + padding;
    } 
    else {
      // For months/years - show months
      const monthStep = Math.max(1, Math.floor(monthsDiff / 6));
      
      for (let i = 0; i <= 6; i++) {
        const date = addMonths(dateRange[0], i * monthStep);
        if (date.getTime() <= dateRange[1].getTime()) {
          marks[date.getTime()] = format(date, 'MMM yyyy');
        }
      }
      
      // Always include the end date
      marks[dateRange[1].getTime()] = format(dateRange[1], 'MMM yyyy');
      
      padding = 7* 24 * 60 * 60 * 1000; // 7 days padding
      boundsRef.current.min = startTime - padding;
      boundsRef.current.max = endTime + padding;
    }
    
    // Update bounds and marks
    boundsRef.current.marks = marks;
    
    // Update slider value
    setSliderValue([startTime, endTime]);
  }, [dateRange, externalMarkers]);
  
  // Handle ongoing slider change (during drag)
  const handleSliderChange = (value: number | number[]) => {
    if (!Array.isArray(value) || value.length !== 2) return;
    
    // Mark that we're dragging
    isDraggingRef.current = true;
    
    // Update the slider value
    setSliderValue(value as [number, number]);
  };
  
  // Handle slider after change (when user releases)
  const handleAfterChange = (value: number | number[]) => {
    if (!Array.isArray(value) || value.length !== 2) return;
    
    const [start, end] = value as [number, number];
    
    // Create the new date range
    const newStart = new Date(start);
    const newEnd = new Date(end);
    
    // Track this as a user-set range to prevent circular updates
    userSetRangeRef.current = [newStart, newEnd];
    
    // Reset dragging flag
    isDraggingRef.current = false;
    
    // Notify parent of the change with flag indicating this was a manual adjustment
    // This allows the parent to maintain the current preset selection
    onDateRangeChange([newStart, newEnd], true);
  };
  
  return (
    <div className="px-2 py-4">
      <Slider
        range
        min={boundsRef.current.min}
        max={boundsRef.current.max}
        value={sliderValue}
        onChange={handleSliderChange}
        onChangeComplete={handleAfterChange}
        marks={boundsRef.current.marks}
        step={1000 * 60 * 5} // 5 minute steps for finer control
        trackStyle={{ backgroundColor: '#3b82f6' }}
        handleStyle={[
          { borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
          { borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
        ]}
        railStyle={{ backgroundColor: '#374151' }}
        dotStyle={{ backgroundColor: '#4b5563', borderColor: '#4b5563' }}
        activeDotStyle={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
      />
    </div>
  );
}; 