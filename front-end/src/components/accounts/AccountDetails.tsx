import { useState, useMemo } from 'react';
import { Transaction } from '../../types/account';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { TransactionFilters } from './TransactionFilters';

interface AccountDetailsProps {
  accountName: string;
  isPrimary: boolean;
  onPrimaryChange: (isPrimary: boolean) => void;
  onAccountNameChange: (name: string) => void;
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onDeleteAccount: () => void;
  canDelete: boolean;
  onSave: () => void;
}

export function AccountDetails({
  accountName,
  isPrimary,
  onPrimaryChange,
  onAccountNameChange,
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onDeleteAccount,
  canDelete,
  onSave,
}: AccountDetailsProps) {
  const [newTransaction, setNewTransaction] = useState<Transaction>({
    id: '',
    type: 'DEPOSIT',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [filter, setFilter] = useState<{
    type?: 'DEPOSIT' | 'WITHDRAW';
    dateRange?: { start: string; end: string };
  }>();
  const [sort, setSort] = useState<{ by: keyof Transaction; direction: 'asc' | 'desc' }>({
    by: 'date',
    direction: 'desc',
  });
  const [nameError, setNameError] = useState<string>('');

  const handleTransactionSubmit = () => {
    onAddTransaction(newTransaction);
    setNewTransaction({
      id: '',
      type: 'DEPOSIT',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
  };

  const handleTransactionChange = (updates: Partial<Transaction>) => {
    setNewTransaction({ ...newTransaction, ...updates });
  };

  const validateAccountName = (name: string) => {
    if (!name.trim()) {
      setNameError('Account name is required');
      return false;
    }
    if (name.length > 50) {
      setNameError('Account name must be less than 50 characters');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleAccountNameChange = (name: string) => {
    onAccountNameChange(name);
    validateAccountName(name);
  };

  const handleSave = () => {
    if (validateAccountName(accountName)) {
      onSave();
    }
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    return transactions
      .filter(transaction => {
        if (filter?.type && transaction.type !== filter.type) {
          return false;
        }
        if (filter?.dateRange?.start || filter?.dateRange?.end) {
          const date = new Date(transaction.date);
          const start = filter.dateRange?.start ? new Date(filter.dateRange.start) : null;
          const end = filter.dateRange?.end ? new Date(filter.dateRange.end) : null;
          
          if (start && date < start) return false;
          if (end) {
            // Set end date to end of day for inclusive comparison
            end.setHours(23, 59, 59, 999);
            if (date > end) return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const aValue = a[sort.by];
        const bValue = b[sort.by];
        const modifier = sort.direction === 'asc' ? 1 : -1;
        
        if (sort.by === 'date') {
          return (new Date(aValue as string).getTime() - new Date(bValue as string).getTime()) * modifier;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * modifier;
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * modifier;
        }
        return 0;
      });
  }, [transactions, filter, sort]);

  // Calculate current balance
  const currentBalance = useMemo(() => {
    return transactions.reduce(
      (sum, t) => sum + (t.type === 'DEPOSIT' ? t.amount : -t.amount),
      0
    );
  }, [transactions]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={accountName}
                onChange={(e) => handleAccountNameChange(e.target.value)}
                className={`bg-[#1E2024] rounded-lg px-3 py-2 text-sm w-full ${
                  nameError ? 'border border-red-500' : ''
                }`}
                placeholder="Account Name"
              />
              {nameError && (
                <div className="absolute left-0 -bottom-5 text-xs text-red-500">
                  {nameError}
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 whitespace-nowrap">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => onPrimaryChange(e.target.checked)}
                className="form-checkbox rounded bg-[#1E2024] border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <span className="hidden sm:inline">Primary Account</span>
              <span className="sm:hidden">Primary</span>
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">Total Balance</div>
          <div className="text-lg font-medium">
            ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-t border-[#2A2D35]">
          <TransactionForm
            transaction={newTransaction}
            onTransactionChange={handleTransactionChange}
            onSubmit={handleTransactionSubmit}
            balance={currentBalance}
          />
        </div>

        <div className="flex-1 flex flex-col min-h-0 border-t border-[#2A2D35]">
          <div className="p-4 sm:flex sm:items-center sm:justify-between">
            <div className="text-sm font-medium mb-3 sm:mb-0">Transactions</div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              <div className="flex rounded-lg overflow-hidden bg-[#1E2024]">
                <button
                  onClick={() => setFilter(undefined)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    !filter?.type ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter({ type: 'DEPOSIT' })}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    filter?.type === 'DEPOSIT' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Deposits
                </button>
                <button
                  onClick={() => setFilter({ type: 'WITHDRAW' })}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    filter?.type === 'WITHDRAW' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Withdrawals
                </button>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <input
                  type="date"
                  value={filter?.dateRange?.start || ''}
                  onChange={(e) => setFilter({
                    dateRange: { ...filter?.dateRange, start: e.target.value }
                  })}
                  className="bg-[#1E2024] rounded-lg px-3 py-1 text-xs text-gray-300"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={filter?.dateRange?.end || ''}
                  onChange={(e) => setFilter({
                    dateRange: { ...filter?.dateRange, end: e.target.value }
                  })}
                  className="bg-[#1E2024] rounded-lg px-3 py-1 text-xs text-gray-300"
                />
                <button
                  onClick={() => setFilter(undefined)}
                  className="p-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded"
                  title="Reset filters"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <TransactionList
              transactions={filteredAndSortedTransactions}
              onEditTransaction={onEditTransaction}
              onDeleteTransaction={onDeleteTransaction}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-none mt-2 sm:mt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <button
          onClick={onDeleteAccount}
          disabled={!canDelete}
          className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm sm:text-base ${
            canDelete 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-gray-500 cursor-not-allowed text-gray-300'
          }`}
        >
          Delete Account
        </button>
        <button
          onClick={handleSave}
          disabled={!!nameError}
          className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm sm:text-base ${
            nameError
              ? 'bg-blue-500/50 cursor-not-allowed text-white/70'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Save
        </button>
      </div>
    </div>
  );
} 