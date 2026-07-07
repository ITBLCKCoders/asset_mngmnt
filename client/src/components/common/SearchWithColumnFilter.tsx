import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchColumnOption } from '@/utils/assetSearchColumns';

interface SearchWithColumnFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  columnOptions?: SearchColumnOption[];
  searchColumn?: string;
  onSearchColumnChange?: (column: string) => void;
  className?: string;
}

export function SearchWithColumnFilter({
  value,
  onChange,
  placeholder = 'Search...',
  columnOptions,
  searchColumn,
  onSearchColumnChange,
  className,
}: SearchWithColumnFilterProps) {
  const showColumnFilter =
    columnOptions != null &&
    columnOptions.length > 0 &&
    searchColumn != null &&
    onSearchColumnChange != null;

  return (
    <div
      className={cn(
        'flex h-9 w-full items-center overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm focus-within:ring-1 focus-within:ring-gray-300',
        className
      )}
    >
      {showColumnFilter && (
        <>
          <select
            value={searchColumn}
            onChange={e => onSearchColumnChange(e.target.value)}
            className="h-full max-w-[8.5rem] shrink-0 border-0 bg-transparent pl-2 pr-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-0"
            aria-label="Search column"
          >
            {columnOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="h-5 w-px shrink-0 bg-gray-200" aria-hidden />
        </>
      )}
      <Search className="ml-2 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent py-1 pl-2 pr-3 text-sm focus:outline-none focus:ring-0 md:text-sm"
      />
    </div>
  );
}
