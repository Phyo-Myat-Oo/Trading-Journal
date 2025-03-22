import React, { ReactNode, ChangeEvent } from 'react';

interface BaseFormInputProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  error?: string;
  className?: string;
  touched?: boolean;
  required?: boolean;
}

interface TextInputProps extends BaseFormInputProps {
  type?: 'text' | 'number' | 'date' | 'datetime-local' | 'email';
  placeholder?: string;
  pattern?: string;
  min?: number | string;
  max?: number | string;
}

interface SelectInputProps extends BaseFormInputProps {
  options: Array<{ value: string; label: string }>;
}

interface TextAreaProps extends BaseFormInputProps {
  placeholder?: string;
  rows?: number;
}

/**
 * Reusable text input component
 */
export function TextInput({
  label,
  name,
  value,
  onChange,
  error,
  className = '',
  touched = false,
  required = false,
  type = 'text',
  placeholder = '',
  pattern,
  min,
  max
}: TextInputProps) {
  const hasError = touched && error;
  
  return (
    <div className={className}>
      <label className="text-[13px] text-gray-400 mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        pattern={pattern}
        min={min}
        max={max}
        className={`w-full bg-[#25262C] text-gray-200 text-[13px] border rounded px-3 py-1.5 focus:outline-none ${
          hasError 
            ? 'border-red-400/50 focus:border-red-400'
            : 'border-[#3D3E44] focus:border-blue-500'
        }`}
      />
      {hasError && <div className="text-red-400 text-[11px] mt-1">{error}</div>}
    </div>
  );
}

/**
 * Reusable select dropdown component
 */
export function SelectInput({
  label,
  name,
  value,
  onChange,
  options,
  error,
  className = '',
  touched = false,
  required = false
}: SelectInputProps) {
  const hasError = touched && error;
  
  return (
    <div className={className}>
      <label className="text-[13px] text-gray-400 mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full bg-[#25262C] text-gray-200 text-[13px] border rounded px-3 py-1.5 focus:outline-none ${
          hasError 
            ? 'border-red-400/50 focus:border-red-400'
            : 'border-[#3D3E44] focus:border-blue-500'
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasError && <div className="text-red-400 text-[11px] mt-1">{error}</div>}
    </div>
  );
}

/**
 * Reusable textarea component
 */
export function TextArea({
  label,
  name,
  value,
  onChange,
  error,
  className = '',
  touched = false,
  required = false,
  placeholder = '',
  rows = 4
}: TextAreaProps) {
  const hasError = touched && error;
  
  return (
    <div className={className}>
      <label className="text-[13px] text-gray-400 mb-1 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full bg-[#25262C] text-gray-200 text-[13px] border rounded px-3 py-2 focus:outline-none resize-none ${
          hasError 
            ? 'border-red-400/50 focus:border-red-400'
            : 'border-[#3D3E44] focus:border-blue-500'
        }`}
      />
      {hasError && <div className="text-red-400 text-[11px] mt-1">{error}</div>}
    </div>
  );
}

/**
 * Form section with title
 */
export function FormSection({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-[14px] text-gray-300 font-medium">{title}</h3>
      {children}
    </div>
  );
} 