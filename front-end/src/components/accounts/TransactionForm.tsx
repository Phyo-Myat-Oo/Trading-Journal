import { Transaction } from '../../types/account';
import { ToggleButton } from '../common/ToggleButton';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Types and Interfaces
type TransactionType = 'DEPOSIT' | 'WITHDRAW';

interface TransactionFormProps {
  transaction: Transaction;
  onTransactionChange: (updates: Partial<Transaction>) => void;
  onSubmit: () => void;
  isEditing?: boolean;
  onCancel?: () => void;
  balance?: number;
}

interface ValidationErrors {
  amount?: string;
  date?: string;
}

// Constants
const DATE_FORMAT_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;
const NUMBER_AND_SLASH_REGEX = /^[0-9/]*$/;
const DEFAULT_DATE = new Date();
const MAX_AMOUNT_LENGTH = 12; // $999,999,999.99
const MAX_DESCRIPTION_LENGTH = 50;
const AMOUNT_REGEX = /^\d*\.?\d{0,2}$/;

// Utility Functions
const createDateFromParts = (day: number, month: number, year: number): Date => {
  return new Date(year, month - 1, day);
};

const padNumber = (num: number): string => num.toString().padStart(2, '0');

export function TransactionForm({
  transaction,
  onTransactionChange,
  onSubmit,
  isEditing,
  onCancel,
  balance = 0,
}: TransactionFormProps) {
  // State Management
  const [amountInput, setAmountInput] = useState(
    transaction.amount ? transaction.amount.toString() : ''
  );
  const [dateInput, setDateInput] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Date Formatting
  const formatDate = useMemo(() => (date: string): string => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }, []);

  // Validation Functions
  const validateAmount = useCallback((value: string, type: TransactionType): string | undefined => {
    if (!value.trim()) {
      return 'Amount is required';
    }
    if (!AMOUNT_REGEX.test(value)) {
      return 'Invalid amount format';
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }
    if (numValue <= 0) {
      return 'Amount must be greater than 0';
    }
    if (type === 'WITHDRAW' && numValue > balance) {
      return 'Insufficient balance';
    }
    if (value.length > MAX_AMOUNT_LENGTH) {
      return `Amount cannot exceed ${MAX_AMOUNT_LENGTH} characters`;
    }
    if (numValue > 999999999.99) {
      return 'Amount cannot exceed $999,999,999.99';
    }
    return undefined;
  }, [balance]);

  const validateDate = useCallback((value: string): string | undefined => {
    if (!value) {
      return 'Date is required';
    }
    if (!DATE_FORMAT_REGEX.test(value)) {
      return 'Use format dd/mm/yyyy';
    }

    const [day, month, year] = value.split('/').map(Number);
    const date = createDateFromParts(day, month, year);

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return 'Invalid date';
    }

    if (date > DEFAULT_DATE) {
      return 'Date cannot be in the future';
    }

    return undefined;
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    
    const amountError = validateAmount(amountInput, transaction.type);
    if (amountError) {
      newErrors.amount = amountError;
    }

    const dateError = validateDate(dateInput);
    if (dateError) {
      newErrors.date = dateError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [amountInput, dateInput, transaction.type, validateAmount, validateDate]);

  // Event Handlers
  const handleAmountChange = useCallback((value: string) => {
    // Only allow valid amount characters
    if (!AMOUNT_REGEX.test(value) && value !== '') return;
    
    // Limit the length
    if (value.length > MAX_AMOUNT_LENGTH) return;
    
    setAmountInput(value);
    
    if (value === '') {
      setErrors(prev => ({ ...prev, amount: undefined }));
      onTransactionChange({ amount: 0 });
      return;
    }

    const amountError = validateAmount(value, transaction.type);
    setErrors(prev => ({ ...prev, amount: amountError || undefined }));
    
    if (!amountError) {
      onTransactionChange({ amount: parseFloat(value) });
    }
  }, [validateAmount, transaction.type, onTransactionChange]);

  const handleDateInputChange = useCallback((value: string) => {
    if (!NUMBER_AND_SLASH_REGEX.test(value)) return;

    let newValue = value;
    if (value.length === 2 && !value.includes('/')) {
      newValue = `${value}/`;
    } else if (value.length === 5 && value.split('/').length === 2) {
      newValue = `${value}/`;
    }
    
    setDateInput(newValue);
    
    if (newValue.length === 10) {
      const dateError = validateDate(newValue);
      setErrors(prev => ({ ...prev, date: dateError || undefined }));
      
      if (!dateError) {
        try {
          const [day, month, year] = newValue.split('/');
          const formattedDate = `${year}-${padNumber(Number(month))}-${padNumber(Number(day))}`;
          onTransactionChange({ date: formattedDate });
        } catch {
          setErrors(prev => ({ ...prev, date: 'Invalid date format' }));
        }
      }
    } else {
      setErrors(prev => ({ ...prev, date: newValue.length > 0 ? 'Use format dd/mm/yyyy' : undefined }));
      onTransactionChange({ date: '' });
    }
  }, [validateDate, onTransactionChange]);

  const handleTypeChange = useCallback((value: TransactionType) => {
    onTransactionChange({ type: value });
    if (transaction.amount > 0) {
      const validationError = validateAmount(transaction.amount.toString(), value);
      setErrors(prev => ({ ...prev, amount: validationError }));
    }
  }, [transaction.amount, validateAmount, onTransactionChange]);

  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      onSubmit();
      setAmountInput('');
      setErrors({});
    }
  }, [validateForm, onSubmit]);

  // Side Effects
  useEffect(() => {
    if (transaction.date) {
      setDateInput(formatDate(transaction.date));
      setErrors(prev => ({ ...prev, date: undefined }));
    } else {
      setDateInput('');
      setErrors(prev => ({ ...prev, date: undefined }));
    }
  }, [transaction.date]);

  // UI Components
  const DateInput = (
    <div className="relative w-[140px] shrink-0">
      <div className={`bg-[#1E2024] rounded-lg px-4 py-2 text-sm w-full text-gray-300 border ${
        errors.date ? 'border-red-500' : 'border-transparent focus-within:border-blue-500'
      } flex items-center justify-between h-[36px]`}>
        <input
          type="text"
          value={dateInput}
          onFocus={(e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'date';
            input.style.opacity = '0';
            input.style.position = 'absolute';
            input.style.inset = '0';
            input.style.cursor = 'pointer';
            if (transaction.date) {
              input.value = transaction.date;
            }
            input.addEventListener('change', (event) => {
              const target = event.target as HTMLInputElement;
              if (target.value) {
                const date = new Date(target.value);
                const formattedDate = `${padNumber(date.getDate())}/${padNumber(date.getMonth() + 1)}/${date.getFullYear()}`;
                handleDateInputChange(formattedDate);
              }
              input.remove();
            });
            e.currentTarget.parentElement?.appendChild(input);
            requestAnimationFrame(() => input.showPicker());
          }}
          onChange={(e) => handleDateInputChange(e.target.value)}
          placeholder="dd/mm/yyyy"
          className="bg-transparent outline-none w-full cursor-text"
        />
        <button
          type="button"
          className="text-gray-400 hover:text-gray-300 flex-shrink-0 ml-2"
          onClick={(e) => {
            e.stopPropagation();
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            if (input) {
              input.dataset.fromButton = 'true';
              input.focus();
              delete input.dataset.fromButton;
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {errors.date && (
        <div className="absolute left-0 -bottom-5 text-xs text-red-500 whitespace-nowrap hidden sm:block">
          {errors.date}
        </div>
      )}
    </div>
  );

  const AmountInput = (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={amountInput}
        onChange={(e) => handleAmountChange(e.target.value)}
        placeholder="0.00"
        className={`bg-[#1E2024] rounded-lg pl-7 pr-3 py-1.5 text-sm w-[120px] ${
          errors.amount ? 'border border-red-500' : ''
        }`}
      />
      {errors.amount && (
        <div className="absolute left-0 -bottom-5 text-xs text-red-500 whitespace-nowrap hidden sm:block">
          {errors.amount}
        </div>
      )}
    </div>
  );

  const DescriptionInput = (
    <div className="relative flex-1">
      <input
        type="text"
        value={transaction.description}
        onChange={(e) => {
          const value = e.target.value.slice(0, MAX_DESCRIPTION_LENGTH);
          onTransactionChange({ description: value });
        }}
        placeholder="Description"
        maxLength={MAX_DESCRIPTION_LENGTH}
        className="bg-[#1E2024] rounded-lg px-3 py-2 text-sm w-full h-[36px] pr-16"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
        {transaction.description.length}/{MAX_DESCRIPTION_LENGTH}
      </div>
    </div>
  );

  const ActionButtons = (
    <>
      <button
        onClick={handleSubmit}
        disabled={!!errors.amount || !!errors.date}
        className={`bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 min-w-[32px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
          errors.amount || errors.date ? 'bg-blue-500/50 cursor-not-allowed text-white/70' : ''
        }`}
        title={isEditing ? "Save changes" : "Add transaction"}
      >
        {isEditing ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      {isEditing && onCancel && (
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-300 rounded-full p-1.5 min-w-[32px] flex items-center justify-center"
          title="Cancel editing"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-3 w-full pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <ToggleButton
            value={transaction.type}
            onChange={handleTypeChange}
            className="w-[120px]"
          />
          {DateInput}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
          <div className="relative w-full sm:w-[140px]">
            <div className={`bg-[#1E2024] rounded-lg px-3 py-2 text-sm w-full flex items-center h-[36px] ${
              errors.amount ? 'border border-red-500' : ''
            }`}>
              <span className="text-gray-400 mr-2">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className={`bg-transparent outline-none w-full text-base font-medium ${
                  errors.amount ? 'text-red-500' : transaction.type === 'DEPOSIT' ? 'text-green-400' : 'text-red-400'
                }`}
              />
            </div>
            {errors.amount && (
              <div className="absolute left-0 -bottom-5 text-xs text-red-500 whitespace-nowrap hidden sm:block">
                {errors.amount}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1">
            {DescriptionInput}
            {isEditing ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleSubmit}
                  disabled={!!errors.amount || !!errors.date}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap h-[36px] ${
                    errors.amount || errors.date
                      ? 'bg-blue-500/50 cursor-not-allowed text-white/70'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Save
                </button>
                <button
                  onClick={onCancel}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm whitespace-nowrap h-[36px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!!errors.amount || !!errors.date}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap shrink-0 h-[36px] ${
                  errors.amount || errors.date
                    ? 'bg-blue-500/50 cursor-not-allowed text-white/70'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                Add Transaction
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 