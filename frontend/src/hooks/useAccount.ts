import { useState } from 'react';
import { Account } from '../types/account';
import { useTransactions } from './useTransactions';

export const useAccount = (initialAccount: Account) => {
  const [name, setName] = useState(initialAccount.name);
  const [isPrimary, setIsPrimary] = useState(initialAccount.isPrimary);
  const {
    transactions,
    newTransaction,
    setNewTransaction,
    calculateBalance,
    toggleTransactionType,
    deleteTransaction,
    addTransaction,
  } = useTransactions(initialAccount.transactions);

  const getUpdatedAccount = (): Account => {
    const balance = calculateBalance(transactions);
    return {
      ...initialAccount,
      name,
      isPrimary,
      balance,
      transactions,
      cashBalance: balance,
      activeBalance: balance,
    };
  };

  return {
    name,
    setName,
    isPrimary,
    setIsPrimary,
    transactions,
    newTransaction,
    setNewTransaction,
    calculateBalance,
    toggleTransactionType,
    deleteTransaction,
    addTransaction,
    getUpdatedAccount,
  };
};
