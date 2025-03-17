export interface AccountInfo {
  balance: number;
  cashBalance: number;
  activeBalance: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  description: string;
}

export interface Account {
  id: string;
  name: string;
  isPrimary: boolean;
  balance: number;
  cashBalance: number;
  activeBalance: number;
  transactions: Transaction[];
}
