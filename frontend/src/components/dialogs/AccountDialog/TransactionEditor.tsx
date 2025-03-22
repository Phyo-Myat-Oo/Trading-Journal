import { KeyboardEvent, useRef, useEffect } from 'react';
import { Transaction } from '../../../types/account';
import { TRANSACTION_CONSTANTS, TRANSACTION_TYPES } from '../../../constants/transaction';
import { validateAmount, validateDescription, validateDate } from '../../../utils/validation';

interface TransactionEditorProps {
  transaction: Transaction;
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
  inputError: { amount?: string; description?: string; date?: string };
  setInputError: (error: { amount?: string; description?: string; date?: string }) => void;
}

export const TransactionEditor = ({
  transaction,
  onSave,
  onCancel,
  inputError,
  setInputError
}: TransactionEditorProps) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the date input when the editor opens
    dateInputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(transaction);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    const error = validateAmount(numValue);
    setInputError(prev => ({ ...prev, amount: error || undefined }));
    if (!error) {
      return numValue;
    }
    return transaction.amount;
  };

  const handleDescriptionChange = (value: string) => {
    const error = validateDescription(value);
    setInputError(prev => ({ ...prev, description: error || undefined }));
    if (!error) {
      return value;
    }
    return transaction.description;
  };

  return (
    <div className="grid grid-cols-[1fr,1fr,1fr,2fr] gap-4 p-2 items-start">
      <div>
        <input
          ref={dateInputRef}
          type="date"
          value={transaction.date}
          onChange={(e) => {
            const error = validateDate(e.target.value);
            setInputError(prev => ({ ...prev, date: error || undefined }));
            if (!error) {
              onSave({ ...transaction, date: e.target.value });
            }
          }}
          className={`w-full bg-gray-600/50 text-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:outline-none ${
            inputError.date ? 'focus:ring-red-500 border-red-500' : 'focus:ring-blue-500'
          }`}
        />
        {inputError.date && (
          <p className="text-red-400 text-xs mt-1">{inputError.date}</p>
        )}
      </div>
      <div>
        <select
          value={transaction.type}
          onChange={(e) => onSave({ ...transaction, type: e.target.value as keyof typeof TRANSACTION_TYPES })}
          className="w-full bg-gray-600/50 text-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
        >
          <option value={TRANSACTION_TYPES.DEPOSIT}>Deposit</option>
          <option value={TRANSACTION_TYPES.WITHDRAW}>Withdraw</option>
        </select>
      </div>
      <div>
        <div className="relative">
          <input
            type="number"
            value={transaction.amount}
            onChange={(e) => {
              const newAmount = handleAmountChange(e.target.value);
              onSave({ ...transaction, amount: newAmount });
            }}
            step="0.01"
            min="0"
            max={TRANSACTION_CONSTANTS.MAX_AMOUNT}
            className={`w-full bg-gray-600/50 text-gray-200 rounded px-2 py-1 pl-5 text-sm focus:ring-2 focus:outline-none ${
              inputError.amount ? 'focus:ring-red-500 border-red-500' : 'focus:ring-blue-500'
            }`}
          />
          <span className="absolute left-2 top-1.5 text-gray-400">$</span>
        </div>
        {inputError.amount && (
          <p className="text-red-400 text-xs mt-1">{inputError.amount}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={transaction.description}
          onChange={(e) => {
            const newDescription = handleDescriptionChange(e.target.value);
            onSave({ ...transaction, description: newDescription });
          }}
          onKeyDown={handleKeyDown}
          maxLength={TRANSACTION_CONSTANTS.MAX_DESCRIPTION_LENGTH}
          className={`flex-1 bg-gray-600/50 text-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:outline-none ${
            inputError.description ? 'focus:ring-red-500 border-red-500' : 'focus:ring-blue-500'
          }`}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSave(transaction)}
            className="p-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded transition-colors"
            title="Save (Enter)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 rounded transition-colors"
            title="Cancel (Esc)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {inputError.description && (
          <p className="text-red-400 text-xs mt-1">{inputError.description}</p>
        )}
      </div>
    </div>
  );
};
