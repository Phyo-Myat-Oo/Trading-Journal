import { Account } from '../../../types/account';
import { formatCurrency } from '../../../utils/formatters';

interface AccountInfoProps {
  account: Account;
  onChange: (account: Account) => void;
  onDelete: () => void;
}

export const AccountInfo = ({ account, onChange, onDelete }: AccountInfoProps) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Account Name</label>
        <input
          type="text"
          value={account.name}
          onChange={(e) => onChange({ ...account, name: e.target.value })}
          className="w-full bg-gray-700 text-gray-200 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Enter account name"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Balance</label>
        <div className="text-2xl font-semibold text-gray-200">
          {formatCurrency(account.balance || 0)}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <textarea
          value={account.description || ''}
          onChange={(e) => onChange({ ...account, description: e.target.value })}
          className="w-full bg-gray-700 text-gray-200 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          rows={3}
          placeholder="Enter account description"
        />
      </div>

      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};
