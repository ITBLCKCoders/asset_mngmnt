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
import { Plus, Edit, Trash2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Shimmer } from '@/components/ui/shimmer';
import { useRiskLevels } from '../hooks/useRiskLevels';
import { RiskLevel } from '../types';
import { useMemo } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';

export function RiskLevels({ onAfterSave }: { onAfterSave?: () => void }) {
  const { hasPermission } = useUserPermissions();
  const {
    riskLevels,
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
  } = useRiskLevels({ onAfterSave });

  const levelColumns = useMemo<ColumnDef<RiskLevel>[]>(
    () => [
      {
        id: 'name',
        header: 'Risk Level',
        accessorKey: 'name',
        size: 240,
        cell: ({ row }) => (
          <span className="font-semibold text-foreground/90 text-base">
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'color',
        header: 'Color',
        accessorKey: 'color',
        size: 120,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-5 w-5 rounded-full border border-gray-300"
              style={{ backgroundColor: row.original.color || '#e5e7eb' }}
            />
            <span className="font-mono text-sm text-muted-foreground">
              {row.original.color || '—'}
            </span>
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
              disabled={!hasPermission('Risk Levels', 'edit')}
              onClick={() => openEdit(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasPermission('Risk Levels', 'delete')}
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
              Risk Levels
            </h2>
            <p className="text-white/80 mt-2">
              Define risk classifications such as Low, Medium, High
            </p>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasPermission('Risk Levels', 'create')}
                onClick={() => {
                  setEditing(null);
                  const emptyForm = { name: '', color: '#ef4444' };
                  setForm(emptyForm);
                  setInitialForm(emptyForm);
                }}
              >
                <Plus className="mr-2 h-5 w-5" />
                Add New Risk Level
              </Button>
            </DialogTrigger>

            <AppDialogFrame className="sm:max-w-md">
              <AppDialogGradientHeader
                title={
                  editing ? 'Edit Risk Level' : 'Create New Risk Level'
                }
                description="Set the risk level name and an optional color for badges."
              />
              <AppDialogBody className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    Risk Level Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Low, Medium, High"
                    className="text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Color</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-300 bg-white">
                      <input
                        type="color"
                        value={form.color || '#ef4444'}
                        onChange={e =>
                          setForm({ ...form, color: e.target.value })
                        }
                        className="absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer border-0 p-0"
                      />
                    </div>
                    <Input
                      value={form.color}
                      onChange={e =>
                        setForm({ ...form, color: e.target.value })
                      }
                      placeholder="#ef4444"
                      className="font-mono text-base"
                      maxLength={50}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional hex color used to badge the risk level
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
                  disabled={saving || !hasChanges()}
                  className="rounded-xl px-6 shadow-md"
                >
                  {saving
                    ? 'Saving...'
                    : editing
                      ? 'Update Risk Level'
                      : 'Create Risk Level'}
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
                <Shimmer className="h-6 w-16 rounded" />
                <div className="flex space-x-2 ml-auto">
                  <Shimmer className="h-8 w-8 rounded" />
                  <Shimmer className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : riskLevels.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-7 min-h-[12rem]">
            <ShieldAlert className="mb-6 h-20 w-20 text-muted-foreground" />
            <p className="mb-8 text-xl text-muted-foreground">
              No risk levels yet
            </p>
            <Button
              size="lg"
              onClick={() => {
                setEditing(null);
                const emptyForm = { name: '', color: '#ef4444' };
                setForm(emptyForm);
                setInitialForm(emptyForm);
                setIsOpen(true);
              }}
              disabled={!hasPermission('Risk Levels', 'create')}
              className="bg-red-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="mr-3 h-6 w-6" /> Add Your First Risk Level
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            <DataTable<RiskLevel>
              tableId="risk-levels"
              data={riskLevels}
              columns={levelColumns}
              searchPlaceholder="Search risk levels..."
              emptyState={
                <p className="text-muted-foreground">
                  No matching risk levels
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
                Permanently Delete Risk Level?
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
              Yes, Delete Risk Level
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>
    </section>
  );
}
