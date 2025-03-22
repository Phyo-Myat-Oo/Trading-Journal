import { useMemo } from 'react';
import { Transaction } from '../../types/account';

interface AccountSummaryProps {
  transactions: Transaction[];
  period?: {
    start: string;
    end: string;
  };
}

export function AccountSummary({ transactions, period }: AccountSummaryProps) {
  const stats = useMemo(() => {
    let filteredTransactions = transactions;
    if (period) {
      filteredTransactions = transactions.filter(
        (t) => t.date >= period.start && t.date <= period.end
      );
    }

    const deposits = filteredTransactions.filter((t) => t.type === 'DEPOSIT');
    const withdrawals = filteredTransactions.filter((t) => t.type === 'WITHDRAW');

    const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalDeposits - totalWithdrawals;

    const averageDeposit = deposits.length > 0
      ? totalDeposits / deposits.length
      : 0;
    const averageWithdrawal = withdrawals.length > 0
      ? totalWithdrawals / withdrawals.length
      : 0;

    const largestDeposit = deposits.length > 0
      ? Math.max(...deposits.map((t) => t.amount))
      : 0;
    const largestWithdrawal = withdrawals.length > 0
      ? Math.max(...withdrawals.map((t) => t.amount))
      : 0;

    return {
      totalTransactions: filteredTransactions.length,
      deposits: deposits.length,
      withdrawals: withdrawals.length,
      totalDeposits,
      totalWithdrawals,
      netFlow,
      averageDeposit,
      averageWithdrawal,
      largestDeposit,
      largestWithdrawal,
    };
  }, [transactions, period]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-sm text-gray-400">Total Transactions</div>
        <div className="text-2xl font-semibold text-gray-200">
          {stats.totalTransactions}
        </div>
        <div className="mt-1 text-xs text-gray-400">
          {stats.deposits} deposits • {stats.withdrawals} withdrawals
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-sm text-gray-400">Net Flow</div>
        <div className={`text-2xl font-semibold ${
          stats.netFlow >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          ${stats.netFlow.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div className="mt-1 text-xs text-gray-400">
          For selected period
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-sm text-gray-400">Average Transaction</div>
        <div className="flex items-baseline space-x-2">
          <div className="text-2xl font-semibold text-green-400">
            ${stats.averageDeposit.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-sm text-gray-400">in</div>
        </div>
        <div className="flex items-baseline space-x-2">
          <div className="text-2xl font-semibold text-red-400">
            ${stats.averageWithdrawal.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-sm text-gray-400">out</div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-sm text-gray-400">Largest Transaction</div>
        <div className="flex items-baseline space-x-2">
          <div className="text-2xl font-semibold text-green-400">
            ${stats.largestDeposit.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-sm text-gray-400">in</div>
        </div>
        <div className="flex items-baseline space-x-2">
          <div className="text-2xl font-semibold text-red-400">
            ${stats.largestWithdrawal.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-sm text-gray-400">out</div>
        </div>
      </div>
    </div>
  );
} 