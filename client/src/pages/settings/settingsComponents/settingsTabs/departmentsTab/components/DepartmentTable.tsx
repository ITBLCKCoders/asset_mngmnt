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
import { Edit, Trash2, Building, Plus, AlertTriangle } from 'lucide-react';
import { Department } from '@/types/assets';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

interface DepartmentTableProps {
  departments: Department[];
  loading: boolean;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
  deleting: Department | null;
  setDeleting: (department: Department | null) => void;
  onAddNew: () => void;
}

export function DepartmentTable({
  departments,
  loading,
  onEdit,
  onDelete,
  deleting,
  setDeleting,
  onAddNew,
}: DepartmentTableProps) {
  const { hasPermission } = useUserPermissions();

  const columns = useMemo<ColumnDef<Department>[]>(
    () => [
      {
        id: 'name',
        header: 'Department Name',
        accessorKey: 'name',
        size: 200,
        cell: ({ row }) => (
          <span className="font-semibold text-foreground/90 text-base">
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'code',
        header: 'Code',
        accessorKey: 'code',
        size: 120,
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="font-mono text-sm px-4 py-1.5 tracking-wider bg-primary/10 text-primary border-primary/30"
          >
            {row.original.code}
          </Badge>
        ),
      },
      {
        id: 'prefix',
        header: 'Prefix',
        accessorKey: 'prefix',
        size: 100,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="font-mono text-sm px-4 py-1.5 tracking-wider bg-muted/50 text-muted-foreground border-muted-foreground/30"
          >
            {row.original.prefix || '—'}
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
              disabled={!hasPermission('Departments', 'edit')}
              onClick={() => onEdit(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasPermission('Departments', 'delete')}
              onClick={() => setDeleting(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, setDeleting, hasPermission]
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

  if (departments.length === 0) {
    return (
      <div className="py-20 text-center">
        <Building className="mx-auto mb-6 h-20 w-20 text-muted-foreground" />
        <p className="mb-8 text-xl text-muted-foreground">No departments yet</p>
        <Button
          size="lg"
          onClick={onAddNew}
          disabled={!hasPermission('Departments', 'create')}
          className="bg-red-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="mr-3 h-6 w-6" /> Add Your First Department
        </Button>
      </div>
    );
  }

  return (
    <>
      <DataTable<Department>
        tableId="departments"
        data={departments}
        columns={columns}
        searchPlaceholder="Search departments..."
        emptyState={
          <p className="text-muted-foreground">No matching departments</p>
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
                Permanently Delete Department?
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
                Existing assets will retain their current department assignment.
              </span>
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && onDelete(deleting)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-medium"
            >
              Yes, Delete Department
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>
    </>
  );
}
