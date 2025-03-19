import { Transaction } from '../../types/account';

interface TransactionsTableProps {
  transactions: Transaction[];
  newTransaction: Transaction;
  onToggleTransactionType: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  onAddTransaction: () => void;
  onNewTransactionChange: (transaction: Transaction) => void;
}

export const TransactionsTable = ({
  transactions,
  newTransaction,
  onToggleTransactionType,
  onDeleteTransaction,
  onAddTransaction,
  onNewTransactionChange,
}: TransactionsTableProps) => {
  return (
    <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      <table className="table">
        <thead className="sticky top-0 bg-[#1E2024] z-10">
          <tr>
            <th style={{ width: '120px', paddingRight: '1rem' }}>Type</th>
            <th style={{ width: '140px', paddingRight: '1rem' }}>Date</th>
            <th style={{ width: '140px', paddingRight: '1rem' }} className="text-right">Amount</th>
            <th>Note</th>
            <th style={{ width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onToggleType={onToggleTransactionType}
              onDelete={onDeleteTransaction}
            />
          ))}
          <NewTransactionRow
            transaction={newTransaction}
            onChange={onNewTransactionChange}
            onAdd={onAddTransaction}
          />
        </tbody>
      </table>
    </div>
  );
};

interface TransactionRowProps {
  transaction: Transaction;
  onToggleType: (id: string) => void;
  onDelete: (id: string) => void;
}

const TransactionRow = ({ transaction, onToggleType, onDelete }: TransactionRowProps) => (
  <tr>
    <td className="pr-4">
      <button
        onClick={() => onToggleType(transaction.id)}
        className={`transaction-type ${
          transaction.type === 'DEPOSIT' 
            ? 'transaction-type-deposit'
            : 'transaction-type-withdraw'
        }`}
      >
        {transaction.type}
      </button>
    </td>
    <td className="text-gray-300 pr-4">{transaction.date}</td>
    <td className="text-right pr-4">
      <span className={transaction.type === 'DEPOSIT' ? 'text-green-400' : 'text-red-400'}>
        ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </td>
    <td className="text-gray-300">{transaction.note}</td>
    <td className="text-center">
      <button
        onClick={() => onDelete(transaction.id)}
        className="text-red-400 hover:text-red-300 transition-colors duration-200"
      >
        ×
      </button>
    </td>
  </tr>
);

interface NewTransactionRowProps {
  transaction: Transaction;
  onChange: (transaction: Transaction) => void;
  onAdd: () => void;
}

const NewTransactionRow = ({ transaction, onChange, onAdd }: NewTransactionRowProps) => (
  <tr className="border-t border-gray-700/30">
    <td className="pr-4">
      <button
        onClick={() => onChange({
          ...transaction,
          type: transaction.type === 'DEPOSIT' ? 'WITHDRAW' : 'DEPOSIT'
        })}
        className={`transaction-type ${
          transaction.type === 'DEPOSIT'
            ? 'transaction-type-deposit'
            : 'transaction-type-withdraw'
        }`}
      >
        {transaction.type}
      </button>
    </td>
    <td className="pr-4">
      <input
        type="text"
        onFocus={(e) => e.target.type = 'date'}
        onBlur={(e) => e.target.type = 'text'}
        value={transaction.date}
        onChange={(e) => onChange({
          ...transaction,
          date: e.target.value
        })}
        className="date-input"
        placeholder="Select date..."
      />
    </td>
    <td className="pr-4">
      <input
        type="text"
        inputMode="decimal"
        value={transaction.amount || ''}
        onChange={(e) => {
          const value = e.target.value.replace(/[^0-9.]/g, '');
          const amount = parseFloat(value);
          onChange({
            ...transaction,
            amount: isNaN(amount) ? 0 : amount
          });
        }}
        className="number-input"
        placeholder="0.00"
      />
    </td>
    <td>
      <input
        type="text"
        value={transaction.note || ''}
        onChange={(e) => onChange({
          ...transaction,
          note: e.target.value
        })}
        className="text-input"
        placeholder="Add note..."
      />
    </td>
    <td className="text-center">
      <button
        onClick={onAdd}
        className="text-blue-400 hover:text-blue-300 transition-colors duration-200 text-xl font-bold"
      >
        +
      </button>
    </td>
  </tr>
);
