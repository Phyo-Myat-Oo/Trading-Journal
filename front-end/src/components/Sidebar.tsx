import { useState } from 'react';
import { 
  RiLayoutGridFill,
  RiExchangeLine,
  RiFileList2Line,
  RiCalendarLine,
  RiSettings4Line,
  RiQuestionLine,
  RiFileTextLine,
  RiAddLine,
  RiPieChartLine
} from 'react-icons/ri';
import { AccountDialog } from './dialogs/AccountDialog';
import { NavItem } from './NavItem';
import { ActionButton } from './ActionButton';
import { AccountSelector } from './account/AccountSelector';

interface Account {
  id: string;
  name: string;
  isPrimary: boolean;
  cashBalance: number;
  activeBalance: number;
  transactions: any[];
}

interface SidebarProps {
  isMobile: boolean;
}

export function Sidebar({ isMobile }: SidebarProps) {
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: '1',
      name: 'Default Account',
      isPrimary: true,
      cashBalance: 0.00,
      activeBalance: 0.00,
      transactions: [],
    }
  ]);
  const [selectedAccount, setSelectedAccount] = useState<Account>(accounts[0]);

  const handleAccountSave = (data: { 
    name: string; 
    cashBalance: number; 
    activeBalance: number; 
    isPrimary: boolean;
  }) => {
    if (isNewAccount) {
      // Create new account
      const newAccount: Account = {
        id: Math.random().toString(36).substr(2, 9),
        name: data.name,
        isPrimary: data.isPrimary,
        cashBalance: data.cashBalance,
        activeBalance: data.activeBalance,
        transactions: [],
      };
      
      // If the new account is primary, remove primary from other accounts
      const updatedAccounts = data.isPrimary 
        ? accounts.map(acc => ({ ...acc, isPrimary: false }))
        : [...accounts];
      
      setAccounts([...updatedAccounts, newAccount]);
      setSelectedAccount(newAccount);
      setIsNewAccount(false);
    } else {
      // Update existing account
      const updatedAccount = {
        ...selectedAccount,
        name: data.name,
        cashBalance: data.cashBalance,
        activeBalance: data.activeBalance,
        isPrimary: data.isPrimary,
      };

      // If this account is being set as primary, remove primary from other accounts
      const updatedAccounts = data.isPrimary 
        ? accounts.map(acc => ({
            ...acc,
            isPrimary: acc.id === selectedAccount.id ? true : false
          }))
        : accounts.map(acc => 
            acc.id === selectedAccount.id ? updatedAccount : acc
          );

      setAccounts(updatedAccounts);
      setSelectedAccount(updatedAccount);
    }
    setIsAccountDialogOpen(false);
  };

  const handleAddAccount = () => {
    setIsNewAccount(true);
    setIsAccountDialogOpen(true);
  };

  const handleDeleteAccount = () => {
    // Don't allow deleting the last account
    if (accounts.length <= 1) {
      return;
    }

    // Remove the account
    const updatedAccounts = accounts.filter(acc => acc.id !== selectedAccount.id);

    // If we're deleting the primary account, make another account primary
    if (selectedAccount.isPrimary && updatedAccounts.length > 0) {
      updatedAccounts[0].isPrimary = true;
    }

    // Update state
    setAccounts(updatedAccounts);
    setSelectedAccount(updatedAccounts[0]); // Select the first remaining account
    setIsAccountDialogOpen(false);
  };

  const navItems = [
    { to: '/', icon: RiLayoutGridFill, label: 'Dashboard' },
    { to: '/trades', icon: RiExchangeLine, label: 'Trades' },
    { to: '/journal', icon: RiFileList2Line, label: 'Journal' },
    { to: '/stats', icon: RiPieChartLine, label: 'Stats' },
    { to: '/calendar', icon: RiCalendarLine, label: 'Calendar' },
    { to: '/settings', icon: RiSettings4Line, label: 'Settings' },
    { to: '/help', icon: RiQuestionLine, label: 'Help' },
  ];

  return (
    <aside className="bg-[#13151A] border-r border-[#1E2024] flex flex-col w-64 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="p-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-2xl shrink-0">
            S
          </div>
          <h1 className="text-xl font-bold text-white truncate ml-3">Stonk Journal</h1>
        </div>
      </div>
      
      {/* Account Selector */}
      <div className="mx-4 mb-6">
        <AccountSelector
          accounts={accounts}
          selectedAccount={selectedAccount}
          onAccountSelect={setSelectedAccount}
          onAccountAdd={handleAddAccount}
          onEditAccount={() => setIsAccountDialogOpen(true)}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => (
          <NavItem 
            key={item.to} 
            {...item} 
            isMobile={isMobile}
          />
        ))}
      </nav>

      {/* Action Buttons */}
      <div className="p-4 space-y-2 border-t border-[#1E2024]">
        <ActionButton 
          icon={RiAddLine} 
          label="New Trade" 
          onClick={() => {}} 
          variant="primary"
        />
        <ActionButton 
          icon={RiFileTextLine} 
          label="New Setup" 
          onClick={() => {}} 
          variant="secondary"
        />
        <ActionButton 
          icon={RiFileList2Line} 
          label="New Note" 
          onClick={() => {}} 
          variant="tertiary"
        />
      </div>

      <AccountDialog
        isOpen={isAccountDialogOpen}
        onClose={() => {
          setIsAccountDialogOpen(false);
          setIsNewAccount(false);
        }}
        onSave={handleAccountSave}
        onDelete={handleDeleteAccount}
        currentBalance={0}
        account={isNewAccount ? {
          id: '',
          name: '',
          isPrimary: false,
          transactions: [],
          cashBalance: 0,
          activeBalance: 0,
        } : selectedAccount}
        canDelete={accounts.length > 1}
      />
    </aside>
  );
}