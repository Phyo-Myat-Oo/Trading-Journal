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
  RiPieChartLine,
  RiAdminLine
} from 'react-icons/ri';
import { AccountDialog } from '../dialogs/AccountDialog';
import { TradeDialog } from '../dialogs/TradeDialog';
import { TradeSetupDialog } from '../dialogs/TradeSetupDialog';
import { DayNoteDialog, DayNoteData } from '../dialogs/DayNoteDialog';
import { NavItem } from './NavItem';
import { ActionButton } from '../common/ActionButton';
import { AccountSelector } from '../accounts/AccountSelector';
import { Account, Transaction } from '../../types/account';
import { useTradeStore } from '../../store/tradeStore';
import { useAuth } from '../../contexts/AuthContext';
import RoleGated from '../common/auth/RoleGated';

interface SidebarProps {
  isMobile: boolean;
}

export function Sidebar({ isMobile }: SidebarProps) {
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([{
    id: '1',
    name: 'Default Account',
    isPrimary: true,
    balance: 0,
    cashBalance: 0,
    activeBalance: 0,
    transactions: []
  }]);
  const [selectedAccount, setSelectedAccount] = useState<Account>(accounts[0]);
  const addDayNote = useTradeStore((state: { addDayNote: (note: Omit<DayNoteData, 'id'>) => void }) => state.addDayNote);
  const { user } = useAuth();

  const handleAccountSave = async (data: { 
    name: string;
    cashBalance: number;
    activeBalance: number;
    isPrimary: boolean;
    transactions: Transaction[];
  }) => {
    try {
      if (isNewAccount) {
        const newAccount: Account = {
          ...data,
          id: crypto.randomUUID(),
          balance: data.cashBalance + data.activeBalance
        };
        setAccounts(prev => [...prev, newAccount]);
        setSelectedAccount(newAccount);
      } else if (selectedAccount) {
        const updatedAccount = {
          ...selectedAccount,
          ...data,
          balance: data.cashBalance + data.activeBalance
        };
        setAccounts(prev => prev.map(acc => 
          acc.id === selectedAccount.id ? updatedAccount : acc
        ));
        setSelectedAccount(updatedAccount);
      }
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
    
    try {
      const nonDeletedAccounts = accounts.filter(acc => acc.id !== selectedAccount.id);
      setAccounts(nonDeletedAccounts);
      setSelectedAccount(nonDeletedAccounts[0]);
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleAddAccount = () => {
    setIsNewAccount(true);
    setIsAccountDialogOpen(true);
  };

  const handleSaveTrade = async () => {
    try {
      // Handle trade save logic
      setIsTradeDialogOpen(false);
    } catch (error) {
      console.error('Error saving trade:', error);
    }
  };

  const handleSaveSetup = async () => {
    try {
      // Handle setup save logic
      setIsSetupDialogOpen(false);
    } catch (error) {
      console.error('Error saving setup:', error);
    }
  };

  const handleSaveNote = async (data: DayNoteData) => {
    try {
      addDayNote(data);
    } catch (error) {
      console.error('Error saving day note:', error);
    }
  };

  const menuItems = [
    {
      to: '/',
      icon: RiLayoutGridFill,
      label: 'Dashboard'
    },
    {
      to: '/trades',
      icon: RiExchangeLine,
      label: 'Trades'
    },
    {
      to: '/journal',
      icon: RiFileList2Line,
      label: 'Journal'
    },
    {
      to: '/stats',
      icon: RiPieChartLine,
      label: 'Stats'
    },
    {
      to: '/calendar',
      icon: RiCalendarLine,
      label: 'Calendar'
    },
    {
      to: '/settings',
      icon: RiSettings4Line,
      label: 'Settings'
    },
    {
      to: '/help',
      icon: RiQuestionLine,
      label: 'Help'
    },
    {
      to: '/admin',
      icon: RiAdminLine,
      label: 'Admin',
      requiresAdmin: true
    }
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
        {menuItems.map((item, index) => (
          item.requiresAdmin ? (
            <RoleGated key={index} allowedRoles={['admin']}>
              <NavItem 
                to={item.to}
                icon={item.icon}
                label={item.label}
                isMobile={isMobile}
              />
            </RoleGated>
          ) : (
            <NavItem 
              key={index}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isMobile={isMobile}
            />
          )
        ))}
      </nav>

      {/* Action Buttons */}
      <div className="p-4 space-y-2 border-t border-[#1E2024]">
        <ActionButton 
          icon={RiAddLine} 
          label="New Trade" 
          onClick={() => setIsTradeDialogOpen(true)} 
          variant="primary"
        />
        <ActionButton 
          icon={RiFileTextLine} 
          label="New Setup" 
          onClick={() => setIsSetupDialogOpen(true)} 
          variant="secondary"
        />
        <ActionButton 
          icon={RiFileList2Line} 
          label="New Note" 
          onClick={() => setIsNoteDialogOpen(true)} 
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
        currentBalance={selectedAccount?.balance || 0}
        account={isNewAccount ? {
          id: '',
          name: '',
          isPrimary: false,
          transactions: [],
          cashBalance: 0,
          activeBalance: 0,
          balance: 0,
        } : selectedAccount}
        canDelete={accounts.length > 1}
      />

      <TradeDialog 
        isOpen={isTradeDialogOpen}
        onClose={() => setIsTradeDialogOpen(false)}
        onSave={handleSaveTrade}
      />

      <TradeSetupDialog
        isOpen={isSetupDialogOpen}
        onClose={() => setIsSetupDialogOpen(false)}
        onSave={handleSaveSetup}
      />

      <DayNoteDialog
        isOpen={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
        onSave={handleSaveNote}
      />
    </aside>
  );
}