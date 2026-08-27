import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
  AppAlertDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Layers, AlertTriangle, Search } from 'lucide-react';
import { Shimmer } from '@/components/ui/shimmer';
import { useIntangibleAssetTypes } from '../hooks/useIntangibleAssetTypes';
import { useDepartments } from '../hooks/useDepartments';
import { IntangibleAssetType } from '../types';
import { useMemo, useState } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function IntangibleAssetTypes({
  onAfterSave,
}: {
  onAfterSave?: () => void;
}) {
  const { hasPermission } = useUserPermissions();
  const {
    types,
    isOpen,
    setIsOpen,
    editing,
    setEditing,
    deleting,
    setDeleting,
    form,
    setForm,
    setInitialForm,
    loading,
    saving,
    showCancelAlert,
    setShowCancelAlert,
    hasChanges,
    handleSave,
    handleDelete,
    openEdit,
  } = useIntangibleAssetTypes({ onAfterSave });

  const { departments } = useDepartments();
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState('');

  const typeColumns = useMemo<ColumnDef<IntangibleAssetType>[]>(
    () => [
      {
        id: 'name',
        header: 'Type Name',
        accessorKey: 'name',
        size: 240,
        cell: ({ row }) => (
          <span className="font-semibold text-foreground/90 text-base">
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'department',
        header: 'Department',
        accessorFn: row => row.department?.name ?? '',
        size: 180,
        cell: ({ row }) =>
          row.original.department?.id ? (
            <Badge
              variant="outline"
              className="font-mono text-sm px-4 py-1.5 tracking-wider bg-blue-500/10 text-blue-600 border-blue-500/30"
            >
              {row.original.department.name}
            </Badge>
          ) : (
            <span className="text-muted-foreground italic">No department</span>
          ),
      },
      {
        id: 'prefix',
        header: 'Prefix',
        accessorKey: 'prefix',
        size: 120,
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="font-mono text-sm px-4 py-1.5 tracking-wider bg-primary/10 text-primary border-primary/30"
          >
            {row.original.prefix || '—'}
          </Badge>
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
              disabled={!hasPermission('Intangible Asset Types', 'edit')}
              onClick={() => openEdit(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasPermission('Intangible Asset Types', 'delete')}
              onClick={() => setDeleting(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [openEdit, setDeleting, hasPermission]
  );

  return (
    <section className="flex flex-col h-full min-h-[24rem]">
      <div className="bg-red-600 rounded-t-2xl p-6 mb-0 shrink-0">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Intangible Asset Types
            </h2>
            <p className="text-white/80 mt-2">
              Define types for non-physical assets such as software and
              licenses
            </p>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasPermission('Intangible Asset Types', 'create')}
                onClick={() => {
                  setEditing(null);
                  const emptyForm = {
                    name: '',
                    prefix: '',
                    departmentId: '',
                  };
                  setForm(emptyForm);
                  setInitialForm(emptyForm);
                }}
              >
                <Plus className="mr-2 h-5 w-5" />
                Add New Type
              </Button>
            </DialogTrigger>

            <AppDialogFrame className="sm:max-w-md">
              <AppDialogGradientHeader
                title={
                  editing
                    ? 'Edit Intangible Asset Type'
                    : 'Create New Intangible Asset Type'
                }
                description="Set the type name, department, and an optional prefix."
              />
              <AppDialogBody className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    Type Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Software, License"
                    className="text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.departmentId || ''}
                    onValueChange={value => {
                      setForm({ ...form, departmentId: value });
                      setDepartmentSearchQuery('');
                    }}
                    required
                  >
                    <SelectTrigger className="w-full bg-white border-gray-300 hover:border-gray-400 focus:border-primary">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 max-h-60">
                      <div className="px-3 py-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            placeholder="Search departments..."
                            value={departmentSearchQuery}
                            onChange={e =>
                              setDepartmentSearchQuery(e.target.value)
                            }
                            onKeyDown={e => e.stopPropagation()}
                            className="pl-8 border-gray-300 focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto">
                        {departments
                          .filter(
                            dept =>
                              dept.name
                                .toLowerCase()
                                .includes(
                                  departmentSearchQuery.toLowerCase()
                                ) ||
                              dept.code
                                .toLowerCase()
                                .includes(departmentSearchQuery.toLowerCase())
                          )
                          .map(dept => (
                            <SelectItem
                              key={dept.id}
                              value={dept.id}
                              className="hover:bg-gray-200 cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{dept.name}</span>
                                <span className="text-sm text-gray-500">
                                  ({dept.code})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        {departments.filter(
                          dept =>
                            dept.name
                              .toLowerCase()
                              .includes(departmentSearchQuery.toLowerCase()) ||
                            dept.code
                              .toLowerCase()
                              .includes(departmentSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <div className="px-2 py-2 text-sm text-gray-500 text-center">
                            No departments found
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    Type Prefix
                  </Label>
                  <Input
                    value={form.prefix}
                    onChange={e =>
                      setForm({
                        ...form,
                        prefix: e.target.value.toUpperCase(),
                      })
                    }
                    maxLength={10}
                    placeholder="Optional"
                    className="font-mono text-base tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional short code used for this intangible asset type
                  </p>
                </div>
              </AppDialogBody>
              <AppDialogChromeFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (hasChanges()) {
                      setShowCancelAlert(true);
                    } else {
                      setIsOpen(false);
                    }
                  }}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !hasChanges() ||
                    !form.name ||
                    !form.departmentId
                  }
                  className="rounded-xl px-6 shadow-md"
                >
                  {saving
                    ? 'Saving...'
                    : editing
                      ? 'Update Type'
                      : 'Create Type'}
                </Button>
              </AppDialogChromeFooter>
            </AppDialogFrame>
          </Dialog>
        </div>
      </div>

      <div className="p-5 flex-1 min-h-0 flex flex-col border border-t-0 border-gray-200 rounded-b-2xl bg-card overflow-hidden">
        {loading ? (
          <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 border-b flex items-center space-x-4 p-4"
              >
                <Shimmer className="h-6 w-32" />
                <Shimmer className="h-6 w-24 rounded" />
                <Shimmer className="h-6 w-16 rounded" />
                <div className="flex space-x-2 ml-auto">
                  <Shimmer className="h-8 w-8 rounded" />
                  <Shimmer className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : types.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-7 min-h-[12rem]">
            <Layers className="mb-6 h-20 w-20 text-muted-foreground" />
            <p className="mb-8 text-xl text-muted-foreground">
              No intangible asset types yet
            </p>
            <Button
              size="lg"
              onClick={() => {
                setEditing(null);
                const emptyForm = {
                  name: '',
                  prefix: '',
                  departmentId: '',
                };
                setForm(emptyForm);
                setInitialForm(emptyForm);
                setIsOpen(true);
              }}
              disabled={!hasPermission('Intangible Asset Types', 'create')}
              className="bg-red-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="mr-3 h-6 w-6" /> Add Your First Type
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            <DataTable<IntangibleAssetType>
              tableId="intangible-asset-types"
              data={types}
              columns={typeColumns}
              searchPlaceholder="Search types..."
              emptyState={
                <p className="text-muted-foreground">
                  No matching intangible asset types
                </p>
              }
            />
          </div>
        )}
      </div>

      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader title="Cancel Edit?" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              All changes will be discarded.
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel onClick={e => e.stopPropagation()}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.stopPropagation();
                setShowCancelAlert(false);
                setIsOpen(false);
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
      >
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader
            title={
              <span className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 shrink-0 text-white" />
                Permanently Delete Intangible Asset Type?
              </span>
            }
          />
          <AppAlertDialogMessage>
            <AlertDialogDescription asChild>
              <div className="text-base text-gray-700">
                This action will remove{' '}
                <strong className="text-foreground">{deleting?.name}</strong>{' '}
                from the system.
                <p className="mt-2 text-sm text-muted-foreground">
                  Existing records will retain their current assignment.
                </p>
              </div>
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-medium"
            >
              Yes, Delete Type
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>
    </section>
  );
}
