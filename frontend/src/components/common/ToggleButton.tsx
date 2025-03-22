interface ToggleButtonProps {
  value: 'DEPOSIT' | 'WITHDRAW';
  onChange: (value: 'DEPOSIT' | 'WITHDRAW') => void;
  options?: Array<{
    value: string;
    label: string;
    className?: string;
  }>;
  className?: string;
}

export function ToggleButton({ value, onChange, options, className = '' }: ToggleButtonProps) {
  const defaultOptions = [
    { value: 'DEPOSIT', label: 'Deposit', className: 'bg-green-500 text-white hover:bg-green-600' },
    { value: 'WITHDRAW', label: 'Withdraw', className: 'bg-red-500 text-white hover:bg-red-600' }
  ];

  const buttonOptions = options || defaultOptions;
  const currentOption = buttonOptions.find(opt => opt.value === value) || buttonOptions[0];

  const handleClick = () => {
    const currentIndex = buttonOptions.findIndex(opt => opt.value === value);
    const nextIndex = (currentIndex + 1) % buttonOptions.length;
    onChange(buttonOptions[nextIndex].value as 'DEPOSIT' | 'WITHDRAW');
  };

  return (
    <button
      onClick={handleClick}
      className={`h-8 rounded-lg text-sm font-medium transition-colors w-[120px] flex items-center justify-center ${currentOption.className} ${className}`}
    >
      {currentOption.label}
    </button>
  );
} 