// components/ui/DataTable.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type FilterFn,
  type Header,
  type Row,
} from '@tanstack/react-table';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowUp,
  ArrowDown,
  Search,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Shimmer } from '@/components/ui/shimmer';

type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  title?: string;
  titleBadge?: string; // e.g. "8 assets"
  lastModifiedAt?: Date; // for "Last modified" badge
  children?: React.ReactNode; // extra controls (e.g. buttons)
  getRowCanExpand?: (row: any) => boolean;
  renderSubComponent?: (props: { row: any }) => React.ReactElement;
  onRowClick?: (row: any) => void; // callback for row clicks
  meta?: any; // meta data for table
  emptyState?: React.ReactNode; // custom empty state component
  isLoading?: boolean; // loading state for skeleton shimmer
  /** If set, column order is persisted in localStorage under this id */
  tableId?: string;
  /** Custom global filter. When provided, search runs across whatever this function checks (e.g. all columns). */
  globalFilterFn?: FilterFn<T>;
  /** Server-side pagination: data is the current page, parent controls page changes */
  serverPagination?: boolean;
  /** Total number of pages (from server meta) */
  pageCount?: number;
  /** Total row count (from server meta) */
  totalRowCount?: number;
  /** Called when user changes page or page size */
  onPaginationChange?: (pageIndex: number, pageSize: number) => void;
  /** Controlled page index when using server pagination */
  pageIndex?: number;
  /** Controlled page size when using server pagination */
  pageSize?: number;
  /** Called when the search term changes */
  onSearchChange?: (value: string) => void;
  /** When false, hides the global search input (table still receives full `data`) */
  showSearch?: boolean;
  /** Controls which fields are shown first in mobile card view */
  mobileCardFields?: Array<{
    key: string;
    label: string;
    render?: (row: T) => React.ReactNode;
    className?: string;
  }>;
  /** Optional per-row classes for both table rows and mobile cards */
  getRowClassName?: (row: Row<T>) => string | undefined;
  /** Optional additional classes for mobile cards */
  mobileCardClassName?: string;
  /** Column filter options for search dropdown. When provided, shows a column selector next to the search input. */
  searchColumnOptions?: Array<{ label: string; value: string }>;
};

function getDefaultColumnOrder(columns: ColumnDef<unknown>[]): string[] {
  return columns
    .map(
      (col: ColumnDef<unknown>) =>
        (col as { id?: string; accessorKey?: string }).id ??
        (col as { accessorKey?: string }).accessorKey
    )
    .filter(Boolean) as string[];
}

function SortableTableHeader<T>({ header }: { header: Header<T, unknown> }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: header.id,
  });
  const style = transform
    ? { transform: CSS.Transform.toString(transform), transition }
    : undefined;
  const def = header.column.columnDef as { size?: number };
  const size = def.size ?? 120;
  return (
    <th
      ref={setNodeRef}
      style={{ width: size, minWidth: size, ...style }}
      className={cn(
        'h-10 px-2 px-4 py-3 text-left align-middle text-xs font-medium uppercase tracking-wider text-gray-900 cursor-pointer hover:bg-gray-100 whitespace-nowrap transition-[transform,background-color] duration-150 hover:-translate-y-0.5',
        isDragging && 'opacity-50 bg-gray-100'
      )}
    >
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 cursor-grab active:cursor-grabbing touch-none"
                {...attributes}
                {...listeners}
                onClick={e => e.stopPropagation()}
              >
                <GripVertical className="h-3.5 w-3.5 text-gray-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Drag to reorder</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div
          className="flex items-center gap-0.5 flex-1 min-w-0"
          onClick={header.column.getToggleSortingHandler()}
        >
          {flexRender(header.column.columnDef.header, header.getContext())}
          <ArrowUp
            className={cn(
              'h-3 w-3 shrink-0',
              header.column.getIsSorted() === 'asc'
                ? 'text-primary'
                : 'text-gray-400'
            )}
          />
          <ArrowDown
            className={cn(
              'h-3 w-3 shrink-0',
              header.column.getIsSorted() === 'desc'
                ? 'text-primary'
                : 'text-gray-400'
            )}
          />
        </div>
      </div>
    </th>
  );
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = 'Search...',
  title,
  titleBadge,
  lastModifiedAt,
  children,
  getRowCanExpand,
  renderSubComponent,
  onRowClick,
  meta,
  emptyState,
  isLoading = false,
  tableId,
  globalFilterFn: customGlobalFilterFn,
  serverPagination = false,
  pageCount = 0,
  totalRowCount = 0,
  onPaginationChange,
  pageIndex: controlledPageIndex,
  pageSize: controlledPageSize,
  onSearchChange,
  showSearch = true,
  searchColumnOptions,
  mobileCardFields,
  getRowClassName,
  mobileCardClassName,
}: DataTableProps<T>) {
  const defaultColumnOrder = useMemo(
    () => getDefaultColumnOrder(columns as ColumnDef<unknown>[]),
    [columns]
  );
  const [columnOrder, setColumnOrderState] = useState<string[]>(() => {
    if (tableId && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(`dataTable-columnOrder-${tableId}`);
        if (saved) {
          const savedOrder: string[] = JSON.parse(saved);
          const defaultSet = new Set(defaultColumnOrder);
          const savedSet = new Set(savedOrder);
          const merged = savedOrder.filter(id => defaultSet.has(id));
          defaultColumnOrder.forEach(id => {
            if (!savedSet.has(id)) merged.push(id);
          });
          return merged.length > 0 ? merged : defaultColumnOrder;
        }
      } catch {
        // ignore
      }
    }
    return defaultColumnOrder;
  });
  const setColumnOrder = (
    updater: string[] | ((prev: string[]) => string[])
  ) => {
    setColumnOrderState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (tableId && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(
            `dataTable-columnOrder-${tableId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
      }
      return next;
    });
  };
  const [sorting, setSorting] = useState<any[]>([]);
  const [rawFilter, setRawFilter] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');

  // Force TanStack to re-filter when the column changes (globalFilterFn changes but globalFilter value stays the same)
  const prevSearchColumnRef = useRef(searchColumn);
  useEffect(() => {
    if (prevSearchColumnRef.current !== searchColumn) {
      prevSearchColumnRef.current = searchColumn;
      if (rawFilter) {
        setGlobalFilter('');
        setTimeout(() => setGlobalFilter(rawFilter), 0);
      }
    }
  }, [searchColumn, rawFilter]);
  const [internalPagination, setInternalPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const pagination = serverPagination
    ? {
        pageIndex: controlledPageIndex ?? 0,
        pageSize: controlledPageSize ?? 10,
      }
    : internalPagination;
  const setPagination = serverPagination
    ? (
        updater:
          | { pageIndex?: number; pageSize?: number }
          | ((p: { pageIndex: number; pageSize: number }) => {
              pageIndex: number;
              pageSize: number;
            })
      ) => {
        const next =
          typeof updater === 'function'
            ? updater(pagination)
            : { ...pagination, ...updater };
        onPaginationChange?.(next.pageIndex ?? 0, next.pageSize ?? 10);
      }
    : setInternalPagination;
  const [expanded, setExpanded] = useState({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Skeleton loading component for table header
  const TableHeaderSkeleton = () => (
    <div className="space-y-4">
      <div className="flex space-x-4 mb-4">
        <div className="flex-1 space-y-2">
          <Shimmer className="h-6 w-full" />
          <Shimmer className="h-4 w-3/4" />
        </div>
        <Shimmer className="h-10 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-4 border-b border-gray-100 py-3">
            {Array.from({ length: 28 }, (_, j) => (
              <Shimmer key={j} className="h-12 flex-1 min-w-0" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  // Skeleton loading component for mobile cards
  const MobileCardSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, j) => (
              <div key={j} className="flex justify-between">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-4 w-24" />
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }, (_, k) => (
                  <div key={k} className="space-y-1">
                    <Shimmer className="h-3 w-12" />
                    <Shimmer className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const effectiveGlobalFilterFn = useMemo(() => {
    if (searchColumn !== 'all') {
      return (row: Row<any>, _columnId: string, filterValue: string) => {
        const val = row.getValue(searchColumn);
        if (val == null) return false;
        return String(val).toLowerCase().includes(String(filterValue).toLowerCase());
      };
    }
    return customGlobalFilterFn;
  }, [searchColumn, customGlobalFilterFn]);

  useEffect(() => {
    const t = setTimeout(() => {
      setGlobalFilter(rawFilter);
      onSearchChange?.(rawFilter);
    }, 300);
    return () => clearTimeout(t);
  }, [rawFilter, onSearchChange]);

  // Check if we're on mobile/tablet
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: serverPagination ? undefined : getFilteredRowModel(),
    getPaginationRowModel: serverPagination
      ? undefined
      : getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    state: { sorting, globalFilter, pagination, expanded, columnOrder },
    globalFilterFn: effectiveGlobalFilterFn ?? 'includesString',
    getRowCanExpand: getRowCanExpand,
    meta,
    manualPagination: serverPagination,
    pageCount: serverPagination ? pageCount : undefined,
  });
  const visibleColumnIds = table.getVisibleLeafColumns().map(c => c.id);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleColumnIds.indexOf(active.id as string);
    const newIndex = visibleColumnIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const currentOrder = table.getState().columnOrder ?? defaultColumnOrder;
    const hiddenIds = currentOrder.filter(
      (id: string) => !visibleColumnIds.includes(id)
    );
    const newVisibleOrder = arrayMove(visibleColumnIds, oldIndex, newIndex);
    setColumnOrder([...newVisibleOrder, ...hiddenIds]);
  };
  const resetColumnOrder = () => setColumnOrder(defaultColumnOrder);

  const total = serverPagination
    ? totalRowCount
    : table.getFilteredRowModel().rows.length;
  const start =
    total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const end = Math.min((pagination.pageIndex + 1) * pagination.pageSize, total);

  const getColumnLabel = (header: unknown, fallback: string) =>
    typeof header === 'string' ? header : fallback;

  const buildMobileCardFields = (
    row: Row<T>
  ): Array<{
    key: string;
    label: string;
    value: React.ReactNode;
    className?: string;
  }> => {
    if (mobileCardFields?.length) {
      return mobileCardFields.map(field => ({
        key: field.key,
        label: field.label,
        value: field.render ? field.render(row.original) : null,
        className: field.className,
      }));
    }

    return row.getVisibleCells().map(cell => ({
      key: cell.id,
      label: getColumnLabel(cell.column.columnDef.header, cell.id),
      value: flexRender(cell.column.columnDef.cell, cell.getContext()),
      className: undefined,
    }));
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Controls */}
      <div
        className={cn(
          'flex flex-col gap-4 p-4 md:flex-row md:items-center bg-white',
          showSearch ? 'md:justify-between' : 'md:justify-end'
        )}
      >
        {showSearch ? (
          <div className="flex items-center gap-2 w-full md:max-w-md">
            {searchColumnOptions && searchColumnOptions.length > 0 && (
              <select
                value={searchColumn}
                onChange={e => setSearchColumn(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                {searchColumnOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={rawFilter}
                onChange={e => setRawFilter(e.target.value)}
                className="pl-10 border-gray-200 focus-visible:ring-0"
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-600">Show</span>
            <Input
              type="number"
              value={pagination.pageSize}
              onChange={e => {
                const size = e.target.value
                  ? Math.max(1, Number(e.target.value))
                  : 10;
                setPagination({ ...pagination, pageSize: size, pageIndex: 0 });
              }}
              className="w-16 h-8 text-center"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                {[10, 20, 30, 50, 100].map(size => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        pageSize: size,
                        pageIndex: 0,
                      })
                    }
                    className="bg-white hover:bg-gray-200 cursor-pointer"
                  >
                    {size} rows
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-gray-600">entries</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Columns <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div
                className={cn(
                  tableId === 'asset-list' && 'max-h-52 overflow-y-auto pr-1'
                )}
              >
                {table
                  .getAllColumns()
                  .map(col => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      className="bg-white hover:bg-gray-200 cursor-pointer"
                      checked={col.getIsVisible()}
                      onCheckedChange={v => col.getCanHide() && col.toggleVisibility(!!v)}
                      disabled={!col.getCanHide()}
                    >
                      {typeof col.columnDef.header === 'string'
                        ? col.columnDef.header
                        : col.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="bg-white hover:bg-gray-200 cursor-pointer"
                onClick={resetColumnOrder}
              >
                Reset column order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {children}
        </div>
      </div>

      {/* Title with Badges */}
      {title && (
        <div className="border-b px-4 py-3 sm:px-7 sm:py-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {titleBadge && (
              <Badge variant="outline" className="font-medium">
                {titleBadge}
              </Badge>
            )}
            {lastModifiedAt &&
              lastModifiedAt instanceof Date &&
              !isNaN(lastModifiedAt.getTime()) && (
                <Badge
                  variant="outline"
                  className="text-xs font-normal text-muted-foreground"
                >
                  Last modified{' '}
                  {formatDistanceToNow(lastModifiedAt, { addSuffix: true })}
                </Badge>
              )}
          </div>
        </div>
      )}

      {/* Table - Desktop/Tablet */}
      {!isMobile && (
        <div className="overflow-x-auto p-3 mr-2 ml-2">
          {isLoading ? (
            <TableHeaderSkeleton />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table
                className="w-full"
                style={{ tableLayout: 'auto', minWidth: 'max-content' }}
              >
                <TableHeader className="bg-gray-50">
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      <SortableContext
                        items={visibleColumnIds}
                        strategy={horizontalListSortingStrategy}
                      >
                        {headerGroup.headers.map(header => (
                          <SortableTableHeader
                            key={header.id}
                            header={header}
                          />
                        ))}
                      </SortableContext>
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="divide-y divide-gray-200">
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map(row => (
                      <React.Fragment key={row.id}>
                        <TableRow
                          className={cn(
                            'h-12 cursor-pointer transition-colors hover:bg-gray-50',
                            getRowClassName?.(row)
                          )}
                          onClick={() => onRowClick?.(row)}
                        >
                          {row.getVisibleCells().map(cell => {
                            const colSize =
                              (cell.column.columnDef as { size?: number })
                                .size ?? 120;
                            return (
                              <TableCell
                                key={cell.id}
                                className="px-4 text-sm text-gray-700"
                                style={{ width: colSize, minWidth: colSize }}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        {row.getIsExpanded() && renderSubComponent && (
                          <TableRow key={`${row.id}-expanded`}>
                            <TableCell
                              colSpan={row.getVisibleCells().length}
                              className="bg-gray-50 p-4"
                            >
                              <div className="ml-8 max-w-4xl">
                                {renderSubComponent({ row })}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-32 text-center text-gray-500"
                      >
                        {emptyState ? (
                          emptyState
                        ) : (
                          <>
                            <div className="text-lg font-medium">
                              No records found
                            </div>
                            <p className="text-sm mt-1">
                              Try adjusting your search.
                            </p>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          )}
        </div>
      )}

      {/* Mobile Card View */}
      {isMobile && (
        <div className="p-3 space-y-4">
          {isLoading ? (
            <MobileCardSkeleton />
          ) : table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => {
              const fields = buildMobileCardFields(row);
              const primaryFields = fields.slice(0, 3);
              const secondaryFields = fields.slice(3);

              return (
                <div
                  key={row.id}
                  className={cn(
                    'cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-md',
                    getRowClassName?.(row),
                    mobileCardClassName
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  <div className="space-y-3">
                    {primaryFields.map(field => (
                      <div
                        key={field.key}
                        className={cn(
                          'flex items-start justify-between gap-3',
                          field.className
                        )}
                      >
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                          {field.label}
                        </span>
                        <div className="min-w-0 text-right text-sm font-medium text-gray-900">
                          {field.value}
                        </div>
                      </div>
                    ))}
                    {secondaryFields.length > 0 && (
                      <div className="border-t border-gray-100 pt-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {secondaryFields.map(field => (
                            <div
                              key={field.key}
                              className={cn('text-xs', field.className)}
                            >
                              <span className="font-medium text-gray-500">
                                {field.label}:
                              </span>
                              <div className="mt-1 text-gray-900">
                                {field.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {row.getIsExpanded() && renderSubComponent && (
                    <div
                      key={`${row.id}-expanded-mobile`}
                      className="mt-4 border-t border-gray-100 pt-4"
                    >
                      {renderSubComponent({ row })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-gray-500">
              {emptyState ? (
                emptyState
              ) : (
                <>
                  <div className="text-lg font-medium">No records found</div>
                  <p className="text-sm mt-1">Try adjusting your search.</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t bg-gray-50 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>
          Showing <strong>{start}</strong> to <strong>{end}</strong> of{' '}
          <strong>{total}</strong> entries
        </span>
        <div className="flex gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
