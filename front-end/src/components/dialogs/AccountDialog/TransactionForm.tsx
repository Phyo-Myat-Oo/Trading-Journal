import { useState } from 'react';
import { Transaction } from '../../../types/account';
import { TRANSACTION_CONSTANTS, TRANSACTION_TYPES } from '../../../constants/transaction';
import { validateAmount, validateDescription, validateDate } from '../../../utils/validation';

interface TransactionFormProps {
  onSubmit: (transaction: Transaction) => void;
}

export const TransactionForm = ({ onSubmit }: TransactionFormProps) => {
  const [inputError, setInputError] = useState<{
    amount?: string;
    description?: string;
    date?: string;
  }>({});

  const [newTransaction, setNewTransaction] = useState<Transaction>({
    id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'DEPOSIT',
    amount: 0,
    description: ''
  });

  const handleSubmit = () => {
    // Validate all fields
    const dateError = validateDate(newTransaction.date);
    const amountError = validateAmount(newTransaction.amount);
    const descriptionError = validateDescription(newTransaction.description);

    const errors = {
      date: dateError,
      amount: amountError,
      description: descriptionError
    };

    setInputError(errors);

    if (!dateError && !amountError && !descriptionError) {
      onSubmit({
        ...newTransaction,
        id: crypto.randomUUID()
      });

      // Reset form
      setNewTransaction({
        id: '',
        date: new Date().toISOString().split('T')[0],
        type: 'DEPOSIT',
        amount: 0,
        description: ''
      });
      setInputError({});
    }
  };

  return (
    <div className="border-t border-gray-700 pt-4 mt-4">
      <h3 className="text-lg font-medium text-gray-200 mb-4">Add New Transaction</h3>
      <div className="grid grid-cols-[1fr,1fr,1fr,2fr] gap-4">
        <div>
          <input
            type="date"
            value={newTransaction.date}
            onChange={(e) => {
              const error = validateDate(e.target.value);
              setInputError(prev => ({ ...prev, date: error || undefined }));
              setNewTransaction(prev => ({ ...prev, date: e.target.value }));
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
            value={newTransaction.type}
            onChange={(e) => setNewTransaction(prev => ({ ...prev, type: e.target.value as keyof typeof TRANSACTION_TYPES }))}
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
              value={newTransaction.amount || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                const error = validateAmount(value);
                setInputError(prev => ({ ...prev, amount: error || undefined }));
                setNewTransaction(prev => ({ ...prev, amount: value }));
              }}
              step="0.01"
              min="0"
              max={TRANSACTION_CONSTANTS.MAX_AMOUNT}
              className={`w-full bg-gray-600/50 text-gray-200 rounded px-2 py-1 pl-5 text-sm focus:ring-2 focus:outline-none ${
                inputError.amount ? 'focus:ring-red-500 border-red-500' : 'focus:ring-blue-500'
              }`}
              placeholder="0.00"
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
            value={newTransaction.description}
            onChange={(e) => {
              const error = validateDescription(e.target.value);
              setInputError(prev => ({ ...prev, description: error || undefined }));
              setNewTransaction(prev => ({ ...prev, description: e.target.value }));
            }}
            maxLength={TRANSACTION_CONSTANTS.MAX_DESCRIPTION_LENGTH}
            className={`flex-1 bg-gray-600/50 text-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:outline-none ${
              inputError.description ? 'focus:ring-red-500 border-red-500' : 'focus:ring-blue-500'
            }`}
            placeholder="Enter description"
          />
          <button
            onClick={handleSubmit}
            className="p-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded transition-colors"
            title="Add transaction"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
