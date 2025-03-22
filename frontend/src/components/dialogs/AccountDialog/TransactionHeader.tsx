import { SortField, SortDirection } from '../../../hooks/useTransactionSort';

interface TransactionHeaderProps {
  sortConfig: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
}

export const TransactionHeader = ({ sortConfig, onSort }: TransactionHeaderProps) => {
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return null;
    }

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 inline-block ml-1 transform ${
          sortConfig.direction === 'desc' ? 'rotate-180' : ''
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414l-3.293 3.293a1 1 0 01-1.414 0zM10 15.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-[1fr,1fr,1fr,2fr] gap-4 p-2 text-sm font-medium text-gray-400 border-b border-gray-700">
      <button
        onClick={() => onSort('date')}
        className="flex items-center hover:text-gray-200 transition-colors"
      >
        Date {renderSortIcon('date')}
      </button>
      <button
        onClick={() => onSort('type')}
        className="flex items-center hover:text-gray-200 transition-colors"
      >
        Type {renderSortIcon('type')}
      </button>
      <button
        onClick={() => onSort('amount')}
        className="flex items-center hover:text-gray-200 transition-colors"
      >
        Amount {renderSortIcon('amount')}
      </button>
      <button
        onClick={() => onSort('description')}
        className="flex items-center hover:text-gray-200 transition-colors"
      >
        Description {renderSortIcon('description')}
      </button>
    </div>
  );
};
