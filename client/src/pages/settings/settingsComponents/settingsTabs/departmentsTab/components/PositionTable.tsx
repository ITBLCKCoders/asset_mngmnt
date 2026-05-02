import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  AppAlertDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
} from '@/components/common/appDialogChrome';
import { Edit, Trash2, Briefcase, Plus, AlertTriangle } from 'lucide-react';
import { Position } from '@/types/assets';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

interface PositionTableProps {
  positions: Position[];
  loading: boolean;
  onEdit: (position: Position) => void;
  onDelete: (position: Position) => void;
  deleting: Position | null;
  setDeleting: (position: Position | null) => void;
  onAddNew: () => void;
  departments: Record<string, string>;
}

export function PositionTable({
  positions,
  loading,
  onEdit,
  onDelete,
  deleting,
  setDeleting,
  onAddNew,
  departments,
}: PositionTableProps) {
  const { hasPermission } = useUserPermissions();

  const columns = useMemo<ColumnDef<Position>[]>(
    () => [
      {
        id: 'name',
        header: 'Position Name',
        accessorKey: 'name',
        size: 200,
        cell: ({ row }) => (
          <span className="font-semibold text-foreground/90 text-base">
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'department',
        header: 'Department',
        accessorFn: row => departments[row.department_id] ?? '',
        size: 180,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="font-mono text-sm px-4 py-1.5 tracking-wider bg-muted/50 text-muted-foreground border-muted-foreground/30"
          >
            {departments[row.original.department_id] || '—'}
          </Badge>
        ),
      },
      {
        id: 'description',
        header: 'Description',
        accessorKey: 'description',
        size: 280,
        cell: ({ row }) => (
          <div
            className="truncate text-sm text-muted-foreground max-w-xs"
            title={row.original.description ?? undefined}
          >
            {row.original.description || '—'}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 120,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="hover:bg-primary/10 hover:text-primary transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasPermission('Positions', 'edit')}
              onClick={() => onEdit(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasPermission('Positions', 'delete')}
              onClick={() => setDeleting(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [departments, onEdit, setDeleting, hasPermission]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 border-b flex items-center space-x-4 p-4"
          >
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="flex space-x-2 ml-auto">
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="py-20 text-center">
        <Briefcase className="mx-auto mb-6 h-20 w-20 text-muted-foreground" />
        <p className="mb-8 text-xl text-muted-foreground">No positions yet</p>
        <Button
          size="lg"
          onClick={onAddNew}
          disabled={!hasPermission('Positions', 'create')}
          className="bg-red-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="mr-3 h-6 w-6" /> Add Your First Position
        </Button>
      </div>
    );
  }

  return (
    <>
      <DataTable<Position>
        tableId="positions"
        data={positions}
        columns={columns}
        searchPlaceholder="Search positions..."
        emptyState={
          <p className="text-muted-foreground">No matching positions</p>
        }
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
      >
        <AppAlertDialogFrame className="max-w-md">
          <AppAlertDialogGradientHeader
            title={
              <span className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 shrink-0 text-white" />
                Permanently Delete Position?
              </span>
            }
          />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              This action will remove{' '}
              <strong className="text-foreground">{deleting?.name}</strong> from
              the system.
              <br />
              <span className="text-sm text-muted-foreground">
                Existing employees will retain their current position
                assignment.
              </span>
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && onDelete(deleting)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-medium"
            >
              Yes, Delete Position
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>
    </>
  );
}
