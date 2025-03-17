import { Transaction } from '../../../types/account';
import { formatCurrency, truncateText } from '../../../utils/formatters';
import { TRANSACTION_CONSTANTS } from '../../../constants/transaction';

interface TransactionRowProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  showDeleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

export const TransactionRow = ({
  transaction,
  onEdit,
  onDelete,
  isSelected,
  showDeleteConfirm,
  onDeleteConfirm,
  onDeleteCancel
}: TransactionRowProps) => {
  return (
    <div
      className={`grid grid-cols-[1fr,1fr,1fr,2fr] gap-4 p-2 items-center group hover:bg-gray-700/50 rounded transition-colors ${
        isSelected ? 'bg-gray-700/30' : ''
      }`}
    >
      <div className="text-sm text-gray-300">{transaction.date}</div>
      <div className="text-sm">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            transaction.type === 'DEPOSIT'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {transaction.type}
        </span>
      </div>
      <div className="text-sm text-gray-300">
        {formatCurrency(transaction.amount)}
      </div>
      <div className="text-sm text-gray-300 flex items-center gap-2">
        <span className="flex-1" title={transaction.description}>
          {truncateText(transaction.description, TRANSACTION_CONSTANTS.DISPLAY_DESCRIPTION_LENGTH)}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(transaction);
            }}
            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
            title="Edit transaction"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConfirm();
                }}
                className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                title="Confirm delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCancel();
                }}
                className="p-1.5 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 rounded transition-colors"
                title="Cancel delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(transaction.id);
              }}
              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
              title="Delete transaction"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
