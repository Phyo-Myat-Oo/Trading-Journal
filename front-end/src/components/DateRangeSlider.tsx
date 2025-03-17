import React, { useState, useCallback } from 'react';
import type { SliderProps } from 'rc-slider';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import '../styles/slider.css';
import { format } from 'date-fns';

interface DateRangeSliderProps {
  startDate: Date;
  endDate: Date;
  onRangeChange: (start: Date, end: Date) => void;
}

export const DateRangeSlider: React.FC<DateRangeSliderProps> = ({
  startDate,
  endDate,
  onRangeChange,
}) => {
  const [draggingValue, setDraggingValue] = useState<number | null>(null);

  const getDateFromPercent = useCallback((percent: number) => {
    const range = endDate.getTime() - startDate.getTime();
    return new Date(startDate.getTime() + (range * percent) / 100);
  }, [startDate, endDate]);

  const formatMarkerDate = (date: Date) => format(date, 'MMM d');
  const formatTooltipDate = (date: Date) => format(date, 'MMM d, yyyy');

  const getDateMarkers = useCallback(() => {
    const markers: { [key: number]: string } = {
      0: formatMarkerDate(startDate),
      100: formatMarkerDate(endDate),
    };

    // Add fewer markers on mobile
    const markerPositions = window.innerWidth < 768 ? [50] : [25, 50, 75];
    markerPositions.forEach(percent => {
      const date = getDateFromPercent(percent);
      markers[percent] = formatMarkerDate(date);
    });

    return markers;
  }, [getDateFromPercent, startDate, endDate]);

  const handleSliderChange = useCallback((values: [number, number]) => {
    const [start, end] = values;
    const newStartDate = getDateFromPercent(start);
    const newEndDate = getDateFromPercent(end);
    onRangeChange(newStartDate, newEndDate);
  }, [getDateFromPercent, onRangeChange]);

  return (
    <div className="relative w-full h-full flex flex-col justify-center px-2 md:px-0">
      <Slider
        range
        min={0}
        max={100}
        defaultValue={[0, 100]}
        onChange={handleSliderChange}
        onBeforeChange={(values: [number, number]) => setDraggingValue(values[0])}
        onAfterChange={() => setDraggingValue(null)}
        marks={getDateMarkers()}
        step={1}
        allowCross={false}
        activeDotStyle={{
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F6',
        }}
        tipFormatter={(val: number | undefined) => {
          if (typeof val === 'number') {
            const date = getDateFromPercent(val);
            return formatTooltipDate(date);
          }
          return '';
        }}
      />
      {draggingValue !== null && (
        <div
          className="absolute -top-6 md:-top-8 transform -translate-x-1/2 bg-[#282C34] text-[11px] md:text-xs text-gray-200 px-2 py-1 rounded whitespace-nowrap"
          style={{ left: `${draggingValue}%` }}
        >
          {formatTooltipDate(getDateFromPercent(draggingValue))}
        </div>
      )}
    </div>
  );
}; 