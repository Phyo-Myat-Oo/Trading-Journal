import React, { ChangeEvent } from 'react';

interface NumberInputProps {
  label: string;
  name: string;
  value: number | string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: number) => void;
  error?: string;
  touched?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Specialized input component for financial and numeric values
 * Supports formatting, prefix/suffix, and direct value handling
 */
export function NumberInput({
  label,
  name,
  value,
  onChange,
  onValueChange,
  error,
  touched = false,
  required = false,
  min,
  max,
  step = 0.01,
  placeholder = '',
  prefix,
  suffix,
  className = ''
}: NumberInputProps) {
  const hasError = touched && error;
  
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Always call the original onChange handler
    onChange(e);
    
    // If onValueChange is provided, parse the value and call it
    if (onValueChange) {
      const numValue = parseFloat(e.target.value);
      if (!isNaN(numValue)) {
        onValueChange(numValue);
      }
    }
  };
  
  return (
    <div className={className}>
      <label className="text-[13px] text-gray-400 mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">
            {prefix}
          </div>
        )}
        <input
          type="number"
          name={name}
          value={value}
          onChange={handleChange}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          className={`w-full bg-[#25262C] text-gray-200 text-[13px] border rounded py-1.5 focus:outline-none
            ${prefix ? 'pl-8' : 'pl-3'} 
            ${suffix ? 'pr-8' : 'pr-3'}
            ${hasError 
              ? 'border-red-400/50 focus:border-red-400' 
              : 'border-[#3D3E44] focus:border-blue-500'
            }`}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">
            {suffix}
          </div>
        )}
      </div>
      {hasError && <div className="text-red-400 text-[11px] mt-1">{error}</div>}
    </div>
  );
}

/**
 * Currency input component with dollar sign prefix
 */
export function CurrencyInput(props: Omit<NumberInputProps, 'prefix'>) {
  return (
    <NumberInput
      {...props}
      prefix="$"
    />
  );
}

/**
 * Percentage input component with percent sign suffix
 */
export function PercentageInput(props: Omit<NumberInputProps, 'suffix' | 'step'>) {
  return (
    <NumberInput
      {...props}
      suffix="%"
      step={0.1}
    />
  );
} 