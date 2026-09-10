import { Search, ChevronDown, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchColumnOption } from '@/utils/assetSearchColumns';
import { ALL_FILTER_VALUE } from '@/utils/formSearchFilterOptions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface SearchWithMultiFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filterOptions: SearchColumnOption[];
  selectedFilters: string[];
  onSelectedFiltersChange: (filters: string[]) => void;
  className?: string;
}

export function SearchWithMultiFilter({
  value,
  onChange,
  placeholder = 'Search...',
  filterOptions,
  selectedFilters,
  onSelectedFiltersChange,
  className,
}: SearchWithMultiFilterProps) {
  const normalized = selectedFilters.length ? selectedFilters : [ALL_FILTER_VALUE];
  const isAll = normalized.includes(ALL_FILTER_VALUE);
  const activeCount = isAll ? 0 : normalized.length;
  const hasActiveFilter = activeCount > 0;

  const handleCheckedChange = (optionValue: string, checked: boolean) => {
    if (optionValue === ALL_FILTER_VALUE) {
      if (checked) {
        onSelectedFiltersChange([ALL_FILTER_VALUE]);
      } else {
        // Unchecking All when it's the only selection: keep All to avoid empty state
        onSelectedFiltersChange([ALL_FILTER_VALUE]);
      }
      return;
    }

    let next: string[];
    if (checked) {
      // Remove All, add this value
      next = [...normalized.filter(v => v !== ALL_FILTER_VALUE), optionValue];
    } else {
      next = normalized.filter(v => v !== optionValue);
      if (next.length === 0) next = [ALL_FILTER_VALUE];
    }
    onSelectedFiltersChange(next);
  };

  const clearFilters = () => onSelectedFiltersChange([ALL_FILTER_VALUE]);

  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', className)}>
      <div
        className={cn(
          'flex h-9 w-full items-center overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm focus-within:ring-1 focus-within:ring-gray-300',
          'dark:border-input dark:bg-input/30 dark:focus-within:ring-ring'
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-full shrink-0 rounded-none border-r border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900 active:bg-slate-100 active:scale-[0.97] transition-all duration-150 gap-1.5 dark:border-input dark:bg-muted dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground dark:active:bg-accent"
              aria-label="Search filter"
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filter</span>
              {hasActiveFilter ? (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 rounded-full bg-red-600 px-1.5 py-0 text-[10px] font-bold text-white hover:bg-red-600 dark:bg-red-600 dark:text-white dark:hover:bg-red-600"
                >
                  {activeCount}
                </Badge>
              ) : null}
              <ChevronDown className="h-3 w-3 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
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
            {filterOptions.map(opt => {
              const isChecked = normalized.includes(opt.value);
              return (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={isChecked}
                  onCheckedChange={checked => handleCheckedChange(opt.value, !!checked)}
                  className={cn(
                    'mx-0.5 rounded-lg text-sm font-medium text-slate-700 bg-white',
                    'hover:bg-slate-50 hover:text-slate-900',
                    'focus:bg-slate-50 focus:text-slate-900',
                    'active:bg-slate-100 active:scale-[0.98]',
                    'transition-all duration-150 cursor-pointer py-2',
                    'dark:bg-transparent dark:text-popover-foreground dark:hover:bg-accent dark:hover:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground dark:active:bg-accent',
                    isChecked &&
                      'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-950/60 dark:hover:text-red-300 dark:focus:bg-red-950/60'
                  )}
                >
                  <span className={cn(isChecked && 'font-semibold')}>{opt.label}</span>
                </DropdownMenuCheckboxItem>
              );
            })}
            {hasActiveFilter ? (
              <>
                <DropdownMenuSeparator className="bg-slate-100 my-1.5 dark:bg-border" />
                <div className="p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full text-xs font-medium bg-white hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 active:scale-[0.98] border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-150 dark:bg-transparent dark:text-muted-foreground dark:border-input dark:hover:bg-accent dark:hover:text-accent-foreground dark:active:bg-accent"
                    onClick={clearFilters}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                </div>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <Search
          className="ml-2 h-4 w-4 shrink-0 text-gray-400 dark:text-muted-foreground"
          aria-hidden
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent py-1 pl-2 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 md:text-sm"
        />
      </div>
      {hasActiveFilter ? (
        <div className="flex flex-wrap gap-1">
          {normalized.map(v => {
            const label = filterOptions.find(o => o.value === v)?.label ?? v;
            return (
              <Badge
                key={v}
                variant="secondary"
                className="gap-1 bg-red-100 text-red-700 hover:bg-red-100 text-[11px] px-2 py-0.5 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-950/60"
              >
                {label}
                <button
                  type="button"
                  onClick={() => handleCheckedChange(v, false)}
                  className="ml-0.5 rounded-full hover:bg-red-200 p-0.5"
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
