interface ToggleSwitchProps<T extends string> {
  leftOption: T;
  rightOption: T;
  value: T;
  onChange: (value: T) => void;
}

export function ToggleSwitch<T extends string>({
  leftOption,
  rightOption,
  value,
  onChange,
}: ToggleSwitchProps<T>) {
  return (
    <div className="flex items-center bg-gray-800/50 rounded-lg p-1">
      <button
        onClick={() => onChange(leftOption)}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          value === leftOption
            ? 'bg-blue-500 text-white'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        {leftOption}
      </button>
      <button
        onClick={() => onChange(rightOption)}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          value === rightOption
            ? 'bg-blue-500 text-white'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        {rightOption}
      </button>
    </div>
  );
} 