import { useState } from 'react';
import { RiArrowDownSLine, RiAddLine, RiPencilLine } from 'react-icons/ri';

interface Account {
  id: string;
  name: string;
  isPrimary: boolean;
  cashBalance: number;
  activeBalance: number;
  transactions: any[];
}

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccount: Account;
  onAccountSelect: (account: Account) => void;
  onAccountAdd: () => void;
  onEditAccount: () => void;
}

export function AccountSelector({ 
  accounts, 
  selectedAccount, 
  onAccountSelect,
  onAccountAdd,
  onEditAccount
}: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Selected Account Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-[#1E2024] rounded-xl hover:bg-[#282B31] transition-all duration-200 shadow-lg hover:shadow-xl border border-transparent hover:border-[#363940] group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1 mr-2">
            <div className="flex items-center min-w-0 flex-1">
              <div className="flex items-center min-w-0">
                <span 
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mr-2 shrink-0
                    ${selectedAccount.isPrimary 
                      ? 'bg-blue-500/10 text-blue-400' 
                      : 'bg-[#282B31] text-gray-400'}`}
                >
                  P
                </span>
                <span className="font-medium text-gray-300 group-hover:text-white transition-colors truncate max-w-[150px]">
                  {selectedAccount.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAccount();
                  }}
                  className="ml-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-[#363940] transition-all duration-200 shrink-0"
                >
                  <RiPencilLine 
                    className="text-gray-400 hover:text-white transition-colors" 
                    size={14}
                  />
                </button>
              </div>
            </div>
          </div>
          <RiArrowDownSLine 
            className={`text-gray-400 group-hover:text-white transition-all duration-200 ${isOpen ? 'rotate-180' : ''} shrink-0`} 
            size={20}
          />
        </div>
        <div className="mt-2 flex items-baseline space-x-1">
          <span className="text-2xl font-bold text-white truncate">
            ${(selectedAccount.cashBalance + selectedAccount.activeBalance).toFixed(2)}
          </span>
          <span className="text-xs text-gray-400">USD</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between items-center px-2 py-1.5 rounded bg-[#282B31]/50">
            <span className="text-gray-400">Cash</span>
            <span className="text-gray-300 font-medium">${selectedAccount.cashBalance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center px-2 py-1.5 rounded bg-[#282B31]/50">
            <span className="text-gray-400">Active</span>
            <span className="text-gray-300 font-medium">${selectedAccount.activeBalance.toFixed(2)}</span>
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E2024] rounded-xl shadow-xl border border-[#363940] overflow-hidden z-50">
            <div className="py-1">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    onAccountSelect(account);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left hover:bg-[#282B31] transition-colors
                    ${account.id === selectedAccount.id ? 'bg-[#282B31]' : ''}`}
                >
                  <div className="flex items-center">
                    <span 
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mr-2
                        ${account.isPrimary 
                          ? 'bg-blue-500/10 text-blue-400' 
                          : 'bg-[#282B31] text-gray-400'}`}
                    >
                      P
                    </span>
                    <span className="text-gray-300 font-medium truncate block max-w-[200px]">
                      {account.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Divider */}
            <div className="h-[1px] bg-[#363940]" />
            
            {/* Add Account Button */}
            <button
              onClick={() => {
                onAccountAdd();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-[#282B31] transition-colors flex items-center space-x-2 text-blue-400 font-medium"
            >
              <RiAddLine className="shrink-0" size={18} />
              <span>Add Account</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
} 