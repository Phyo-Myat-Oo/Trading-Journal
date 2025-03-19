import { useState } from 'react';
import { Account } from '../../types/account';
import { AccountDialog } from './AccountDialog';

interface AccountInfoProps {
  account: Account;
  onSave: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onNewAccount: () => void;
}

export const AccountInfo = ({
  account,
  onSave,
  onDelete,
  onNewAccount,
}: AccountInfoProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div
        className="flex items-center justify-between p-4 hover:bg-gray-800/50 rounded-lg cursor-pointer"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="flex items-center space-x-4">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <div>
            <div className="text-sm font-medium text-gray-200">{account.name}</div>
            <div className="text-xs text-gray-400">
              ${account.balance.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
      </div>

      <AccountDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        account={account}
        onSave={onSave}
        onDelete={onDelete}
        onNewAccount={onNewAccount}
      />
    </>
  );
};
