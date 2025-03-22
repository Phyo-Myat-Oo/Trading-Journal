import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Transaction } from '../../types/account';
import { AccountDetails } from '../accounts/AccountDetails';
import { RiCloseLine } from 'react-icons/ri';

interface AccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account?: {
    id: string;
    name: string;
    isPrimary: boolean;
    transactions: Transaction[];
    cashBalance: number;
    activeBalance: number;
  };
  onSave: (data: { name: string; cashBalance: number; activeBalance: number; isPrimary: boolean; transactions: Transaction[] }) => void;
  onDelete: () => void;
  canDelete: boolean;
  currentBalance: number;
}

export function AccountDialog({ isOpen, onClose, account, onSave, onDelete, canDelete, currentBalance }: AccountDialogProps) {
  const [formData, setFormData] = useState({
    name: account?.name || '',
    isPrimary: account?.isPrimary || false,
    cashBalance: account?.cashBalance || currentBalance,
    activeBalance: account?.activeBalance || 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>(account?.transactions || []);

  // Update form data when account changes
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        isPrimary: account.isPrimary,
        cashBalance: account.cashBalance,
        activeBalance: account.activeBalance,
      });
      setTransactions(account.transactions);
    }
  }, [account]);

  const handleAddTransaction = (transaction: Transaction) => {
    setTransactions([
      {
        ...transaction,
        id: Math.random().toString(36).substr(2, 9),
      },
      ...transactions,
    ]);
    
    // Update balances based on transaction type
    const amount = transaction.type === 'DEPOSIT' ? transaction.amount : -transaction.amount;
    setFormData(prev => ({
      ...prev,
      cashBalance: prev.cashBalance + amount,
    }));
  };

  const handleEditTransaction = (updatedTransaction: Transaction) => {
    const oldTransaction = transactions.find(t => t.id === updatedTransaction.id);
    if (!oldTransaction) return;

    // Calculate balance adjustment
    const oldAmount = oldTransaction.type === 'DEPOSIT' ? oldTransaction.amount : -oldTransaction.amount;
    const newAmount = updatedTransaction.type === 'DEPOSIT' ? updatedTransaction.amount : -updatedTransaction.amount;
    const balanceAdjustment = newAmount - oldAmount;

    setTransactions(
      transactions.map((t) =>
        t.id === updatedTransaction.id ? updatedTransaction : t
      )
    );

    // Update balance
    setFormData(prev => ({
      ...prev,
      cashBalance: prev.cashBalance + balanceAdjustment,
    }));
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Adjust balance
    const amount = transaction.type === 'DEPOSIT' ? -transaction.amount : transaction.amount;
    setFormData(prev => ({
      ...prev,
      cashBalance: prev.cashBalance + amount,
    }));

    setTransactions(transactions.filter((t) => t.id !== transactionId));
  };

  const handleSave = () => {
    onSave({
      ...formData,
      transactions
    });
    onClose();
  };

  if (!isOpen) return null;

  const dialog = (
    <div 
      className="fixed inset-0 isolate" 
      style={{ 
        zIndex: 99999,
      }}
    >
      <div 
        className="fixed inset-0 bg-black/70 cursor-pointer backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <div 
          className="w-full max-w-4xl bg-[#13151A] rounded-xl shadow-xl flex flex-col relative mx-auto"
          style={{ height: 'min(90vh, 700px)' }}
        >
          <div className="flex items-center justify-between p-2 sm:p-3 border-b border-[#1E2024] flex-shrink-0 bg-[#13151A] rounded-t-xl">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-200">Account</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <RiCloseLine size={20} />
            </button>
          </div>

          <div className="p-2 sm:p-4 overflow-y-auto bg-[#13151A] rounded-b-xl flex-1">
            <AccountDetails
              accountName={formData.name}
              isPrimary={formData.isPrimary}
              onPrimaryChange={(isPrimary) => setFormData(prev => ({ ...prev, isPrimary }))}
              onAccountNameChange={(name) => setFormData(prev => ({ ...prev, name }))}
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onDeleteAccount={onDelete}
              canDelete={canDelete}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
