import { Account } from '../../types/account';
import { AccountSettingsForm } from './AccountSettingsForm';

interface AccountSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account;
  onSave: (account: Account) => void;
}

export function AccountSettingsDialog({
  isOpen,
  onClose,
  account,
  onSave,
}: AccountSettingsDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#13151A] w-[600px] rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-200">Account Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <AccountSettingsForm
            account={account}
            onSave={(updatedAccount) => {
              onSave(updatedAccount);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
} 