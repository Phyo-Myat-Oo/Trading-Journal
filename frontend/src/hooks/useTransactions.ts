import { useState } from 'react';
import { Transaction } from '../types/account';

interface UseTransactionsProps {
  initialTransactions: Transaction[];
  onTransactionChange: (transactions: Transaction[]) => void;
}

export function useTransactions({ initialTransactions, onTransactionChange }: UseTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [newTransaction, setNewTransaction] = useState<Transaction>({
    id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'DEPOSIT',
    amount: 0,
    description: ''
  });

  const updateNewTransaction = (updates: Partial<Transaction>) => {
    setNewTransaction(prev => ({ ...prev, ...updates }));
  };

  const addTransaction = () => {
    const transaction = {
      ...newTransaction,
      id: Date.now().toString(),
      amount: Math.abs(parseFloat(newTransaction.amount.toString()))
    };

    const updatedTransactions = [...transactions, transaction];
    setTransactions(updatedTransactions);
    onTransactionChange(updatedTransactions);

    // Reset form
    setNewTransaction({
      id: '',
      date: new Date().toISOString().split('T')[0],
      type: 'DEPOSIT',
      amount: 0,
      description: ''
    });
  };

  const updateTransaction = (id: string, updatedTransaction: Transaction) => {
    const updatedTransactions = transactions.map(t =>
      t.id === id ? { ...updatedTransaction, amount: Math.abs(parseFloat(updatedTransaction.amount.toString())) } : t
    );
    setTransactions(updatedTransactions);
    onTransactionChange(updatedTransactions);
  };

  const deleteTransaction = (id: string) => {
    const updatedTransactions = transactions.filter(t => t.id !== id);
    setTransactions(updatedTransactions);
    onTransactionChange(updatedTransactions);
  };

  return {
    transactions,
    newTransaction,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateNewTransaction,
  };
}
