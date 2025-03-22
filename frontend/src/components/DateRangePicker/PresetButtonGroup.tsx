import React, { useState } from 'react';
import { DatePreset } from './DateFilterComponent';
import { RiArrowDownSLine } from 'react-icons/ri';

interface PresetButtonGroupProps {
  activePreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  isMobile?: boolean;
}

export const PresetButtonGroup: React.FC<PresetButtonGroupProps> = ({
  activePreset,
  onPresetChange,
  isMobile = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handlePresetClick = (preset: DatePreset) => {
    onPresetChange(preset);
    setIsDropdownOpen(false);
  };

  const activePresetLabel = presetOptions.find(option => option.value === activePreset)?.label || 'Select Range';

  // Mobile view with dropdown
  if (isMobile) {
    return (
      <div className="relative z-20">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-white bg-[#1E2024] hover:bg-[#2A2D35] rounded-md transition-colors"
        >
          <span>{activePresetLabel}</span>
          <RiArrowDownSLine className={`ml-2 transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isDropdownOpen && (
          <div className="absolute left-0 w-full mt-1 bg-[#1E2024] border border-[#2A2D35] rounded-md shadow-lg z-30">
            {presetOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePresetClick(option.value)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  activePreset === option.value
                    ? 'bg-[#2A2D35] text-white'
                    : 'text-gray-300 hover:bg-[#2A2D35] hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop view with button group
  return (
    <div className="flex flex-wrap gap-2 p-2 bg-[#13151A] rounded-md">
      {presetOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onPresetChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            activePreset === option.value
              ? 'bg-blue-600 text-white'
              : 'bg-[#1E2024] text-gray-300 hover:bg-[#2A2D35] hover:text-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

const presetOptions: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'reset', label: 'Reset' },
]; 