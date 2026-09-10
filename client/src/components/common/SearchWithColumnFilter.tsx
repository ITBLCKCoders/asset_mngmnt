import { Search, ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchColumnOption } from '@/utils/assetSearchColumns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  const activeLabel = showColumnFilter
    ? (columnOptions?.find(o => o.value === searchColumn)?.label ??
      columnOptions?.[0]?.label ??
      'Filter')
    : 'Filter';
  const isFiltered = showColumnFilter && searchColumn !== 'all';

  return (
    <div
      className={cn(
        'flex h-9 w-full items-center overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm focus-within:ring-1 focus-within:ring-gray-300',
        'dark:border-input dark:bg-input/30 dark:focus-within:ring-ring',
        className
      )}
    >
      {showColumnFilter && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-full max-w-[11rem] shrink-0 rounded-none border-r border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900 active:bg-slate-100 active:scale-[0.97] transition-all duration-150 gap-1.5 dark:border-input dark:bg-muted dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground dark:active:bg-accent"
              aria-label="Search column"
            >
              <Filter className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline truncate">{activeLabel}</span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64 border border-slate-200 bg-white shadow-xl rounded-xl p-1.5 animate-in fade-in-0 zoom-in-95 dark:border-input dark:bg-popover dark:text-popover-foreground"
          >
            <DropdownMenuLabel className="text-[11px] font-bold tracking-wider uppercase text-slate-500 px-2 py-2 dark:text-muted-foreground">
              Search in
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100 my-1 dark:bg-border" />
            <DropdownMenuRadioGroup
              value={searchColumn}
              onValueChange={onSearchColumnChange}
            >
              {columnOptions?.map(opt => {
                const isChecked = opt.value === searchColumn;
                return (
                  <DropdownMenuRadioItem
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      'mx-0.5 rounded-lg text-sm font-medium text-slate-700',
                      'hover:bg-slate-50 hover:text-slate-900',
                      'focus:bg-slate-50 focus:text-slate-900',
                      'active:bg-slate-100 active:scale-[0.98]',
                      'transition-all duration-150 cursor-pointer py-2',
                      'dark:text-popover-foreground dark:hover:bg-accent dark:hover:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground dark:active:bg-accent',
                      isChecked &&
                        'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-950/60 dark:hover:text-red-300 dark:focus:bg-red-950/60',
                      isChecked && 'font-semibold'
                    )}
                  >
                    {opt.label}
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Search
        className="ml-2 h-4 w-4 shrink-0 text-gray-400 dark:text-muted-foreground"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent py-1 pl-2 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 md:text-sm',
          !showColumnFilter && isFiltered && ''
        )}
      />
    </div>
  );
}
