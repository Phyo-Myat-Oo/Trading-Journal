import { useState, useMemo } from 'react';
import { Transaction } from '../../types/account';
import { TransactionForm } from './TransactionForm';

interface TransactionListProps {
  transactions: Transaction[];
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
}

export function TransactionList({
  transactions,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Memoize the formatDate function to prevent unnecessary re-renders
  const formatDate = useMemo(() => (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  // Memoize the balance calculation for edited transactions
  const getBalanceForEdit = useMemo(() => (editingId: string): number => {
    return transactions.reduce((sum, t) => {
      if (t.id === editingId) return sum;
      return sum + (t.type === 'DEPOSIT' ? t.amount : -t.amount);
    }, 0);
  }, [transactions]);

  const handleEditClick = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditingTransaction({ ...transaction });
  };

  const handleTransactionChange = (updates: Partial<Transaction>) => {
    if (editingTransaction) {
      setEditingTransaction({ ...editingTransaction, ...updates });
    }
  };

  const handleSaveEdit = () => {
    if (editingTransaction) {
      onEditTransaction(editingTransaction);
      setEditingId(null);
      setEditingTransaction(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTransaction(null);
  };

  const handleDeleteClick = (transactionId: string) => {
    setDeleteConfirmId(transactionId);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm sm:text-base">
        No transactions found
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      <div className="p-2 space-y-2">
        {transactions.map((transaction, index) => (
          <div
            key={transaction.id}
            className={`rounded hover:bg-[#2A2D35] group relative ${
              editingId === transaction.id ? 'bg-[#2A2D35] p-4' : 'p-3'
            }`}
          >
            {editingId === transaction.id ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Editing Transaction #{index + 1}</span>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <TransactionForm
                  transaction={editingTransaction!}
                  onTransactionChange={handleTransactionChange}
                  onSubmit={handleSaveEdit}
                  isEditing={true}
                  onCancel={handleCancelEdit}
                  balance={getBalanceForEdit(transaction.id)}
                />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="hidden sm:block w-8 text-sm text-gray-500 font-medium text-right shrink-0">
                    {index + 1}
                  </div>
                  <div className="text-sm text-gray-400 shrink-0">
                    {formatDate(transaction.date)}
                  </div>
                  <div className={`flex items-center justify-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                    transaction.type === 'DEPOSIT' 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {transaction.type}
                  </div>
                  <div className={`text-sm font-medium shrink-0 ${
                    transaction.type === 'DEPOSIT'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                {transaction.description && (
                  <div className="text-sm text-gray-400 truncate flex-1">
                    {transaction.description}
                  </div>
                )}
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button
                    onClick={() => handleEditClick(transaction)}
                    className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                    title="Edit transaction"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(transaction.id)}
                    className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete transaction"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {deleteConfirmId === transaction.id && (
                  <div className="absolute right-0 top-0 bottom-0 flex items-center bg-[#2A2D35] rounded-lg px-2 sm:px-4 py-2 shadow-lg">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-gray-300">Delete this transaction?</span>
                      <button
                        onClick={handleConfirmDelete}
                        className="px-2 sm:px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm rounded"
                      >
                        Delete
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        className="px-2 sm:px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
