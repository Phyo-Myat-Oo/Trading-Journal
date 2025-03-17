import { useState } from 'react';
import { Account } from '../../types/account';

interface AccountSettingsFormProps {
  account: Account;
  onSave: (account: Account) => void;
  onCancel: () => void;
}

export function AccountSettingsForm({
  account,
  onSave,
  onCancel,
}: AccountSettingsFormProps) {
  const [formData, setFormData] = useState({
    name: account.name,
    isPrimary: account.isPrimary,
    cashBalance: account.cashBalance,
    activeBalance: account.activeBalance,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...account,
      ...formData,
      balance: formData.cashBalance + formData.activeBalance,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Account Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
          Account Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full bg-[#1E2024] rounded-lg px-3 py-2 text-gray-300 border border-transparent focus:border-blue-500 focus:outline-none"
          placeholder="Enter account name"
        />
      </div>

      {/* Primary Account Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPrimary"
          name="isPrimary"
          checked={formData.isPrimary}
          onChange={handleChange}
          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
        />
        <label htmlFor="isPrimary" className="ml-2 text-sm text-gray-300">
          Set as Primary Account
        </label>
      </div>

      {/* Cash Balance */}
      <div>
        <label htmlFor="cashBalance" className="block text-sm font-medium text-gray-300 mb-1">
          Cash Balance
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
          <input
            type="number"
            id="cashBalance"
            name="cashBalance"
            value={formData.cashBalance}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full bg-[#1E2024] rounded-lg pl-7 pr-3 py-2 text-gray-300 border border-transparent focus:border-blue-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Active Balance */}
      <div>
        <label htmlFor="activeBalance" className="block text-sm font-medium text-gray-300 mb-1">
          Active Balance
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
          <input
            type="number"
            id="activeBalance"
            name="activeBalance"
            value={formData.activeBalance}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full bg-[#1E2024] rounded-lg pl-7 pr-3 py-2 text-gray-300 border border-transparent focus:border-blue-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Total Balance Display */}
      <div className="bg-[#1E2024] rounded-lg p-4">
        <div className="text-sm text-gray-400 mb-1">Total Balance</div>
        <div className="text-2xl font-semibold text-gray-200">
          ${(formData.cashBalance + formData.activeBalance).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-[#1E2024] hover:bg-[#2A2D35] text-gray-300 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
} 