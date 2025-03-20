import { SortConfig, SortField } from "../../types/filters";

interface SortableTableHeaderProps {
  label: string;
  field: SortField;
  sortConfig: SortConfig | null;
  onSort: (field: SortField) => void;
  className?: string;
}

export function SortableTableHeader({
  label,
  field,
  sortConfig,
  onSort,
  className = "",
}: SortableTableHeaderProps) {
  const isSorted = sortConfig?.field === field;
  const direction = isSorted ? sortConfig.direction : null;

  const renderSortIcon = () => {
    if (!isSorted) {
      return (
        <svg
          className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    if (direction === "asc") {
      return (
        <svg
          className="w-3 h-3 ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      );
    }

    return (
      <svg
        className="w-3 h-3 ml-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  return (
    <th
      className={`p-3 sm:p-4 font-medium cursor-pointer group ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center">
        {label}
        {renderSortIcon()}
      </div>
    </th>
  );
} 