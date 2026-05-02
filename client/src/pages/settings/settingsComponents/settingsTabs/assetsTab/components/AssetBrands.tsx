import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Shimmer } from '@/components/ui/shimmer';
import { useAssetBrands } from '../hooks/useAssetBrands';
import { AssetType, AssetBrand } from '../types';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface AssetBrandsProps {
  types: AssetType[];
}

export function AssetBrands({ types }: AssetBrandsProps) {
  const { hasPermission } = useUserPermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    brands,
    isOpen,
    setIsOpen,
    editing,
    setEditing,
    deleting,
    setDeleting,
    form,
    setForm,
    initialForm,
    setInitialForm,
    loading,
    saving,
    showCancelAlert,
    setShowCancelAlert,
    hasChanges,
    handleSave,
    handleDelete,
    openEdit,
  } = useAssetBrands();

  const brandColumns = useMemo<ColumnDef<AssetBrand>[]>(
    () => [
      {
        id: 'name',
        header: 'Brand Name',
        accessorKey: 'name',
        size: 200,
        cell: ({ row }) => (
          <span className="font-semibold text-foreground/90 text-base">
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'type',
        header: 'Type',
        accessorFn: row => {
          const rawId = row.typeId ?? (row as { type_id?: string }).type_id;
          const t = types.find(tp => String(tp.id) === String(rawId ?? ''));
          return t?.name ?? '';
        },
        size: 160,
        cell: ({ row }) => {
          const rawId =
            row.original.typeId ??
            (row.original as { type_id?: string }).type_id;
          const t = types.find(tp => String(tp.id) === String(rawId ?? ''));
          return (
            <Badge
              variant="secondary"
              className="text-sm px-4 py-1.5 bg-purple-500/10 text-purple-600 border-purple-500/30"
            >
              {t?.name || 'Unknown'}
            </Badge>
          );
        },
      },
      {
        id: 'prefix',
        header: 'Prefix',
        accessorKey: 'prefix',
        size: 100,
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="font-mono text-sm px-4 py-1.5 tracking-wider bg-primary/10 text-primary border-primary/30"
          >
            {row.original.prefix}
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
              disabled={!hasPermission('Asset Brands', 'edit')}
              onClick={() => openEdit(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasPermission('Asset Brands', 'delete')}
              onClick={() => setDeleting(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [types, openEdit, setDeleting, hasPermission]
  );

  useEffect(() => {
    const add = searchParams.get('add');
    const typeId = searchParams.get('typeId');
    if (add === 'brand' && typeId) {
      setEditing(null);
      const newForm = {
        name: '',
        prefix: '',
        gl_code: '',
        categoryId: '',
        typeId,
        contact: '',
        email: '',
        departmentId: '',
      };
      setForm(newForm);
      setInitialForm(newForm);
      setIsOpen(true);
      // Clear the params
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('add');
        newParams.delete('typeId');
        return newParams;
      });
    }
  }, [
    searchParams,
    setSearchParams,
    setForm,
    setInitialForm,
    setIsOpen,
    setEditing,
  ]);

  return (
    <section className="flex flex-col h-full min-h-[24rem]">
      <div className="bg-red-600 rounded-t-2xl p-6 mb-0 shrink-0">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Asset Brands
            </h2>
            <p className="text-white/80 mt-2">Define brands for your assets</p>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasPermission('Asset Brands', 'create')}
                onClick={() => {
                  setEditing(null);
                  const emptyForm = {
                    name: '',
                    prefix: '',
                    gl_code: '',
                    categoryId: '',
                    typeId: '',
                    contact: '',
                    email: '',
                    departmentId: '',
                  };
                  setForm(emptyForm);
                  setInitialForm(emptyForm);
                }}
              >
                <Plus className="mr-2 h-5 w-5" />
                Add New Brand
              </Button>
            </DialogTrigger>

            <AppDialogFrame className="sm:max-w-md">
              <AppDialogGradientHeader
                title={editing ? 'Edit Brand' : 'Create New Brand'}
                description="Link a brand to an asset type and set an optional prefix."
              />
              <AppDialogBody className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    Brand Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Dell, HP"
                    className="text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    Asset Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.typeId}
                    onValueChange={value => setForm({ ...form, typeId: value })}
                  >
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Select an asset type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {types.length === 0 ? (
                        <div className="p-4 text-center space-y-2">
                          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            No asset types available
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setSearchParams({ add: 'type' })}
                            className="w-full"
                          >
                            <Plus className="mr-1 h-3 w-3" /> Add Asset Type
                          </Button>
                        </div>
                      ) : (
                        types.map(type => (
                          <SelectItem
                            key={type.id}
                            value={type.id.toString()}
                            className="hover:bg-gray-200"
                          >
                            {type.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Brand Prefix</Label>
                  <Input
                    value={form.prefix}
                    onChange={e =>
                      setForm({ ...form, prefix: e.target.value.toUpperCase() })
                    }
                    maxLength={8}
                    placeholder="DEL"
                    className="font-mono text-base tracking-wider"
                  />
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
                      ? 'Update Brand'
                      : 'Create Brand'}
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
        ) : brands.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-7 min-h-[12rem]">
            <Package className="mb-6 h-20 w-20 text-muted-foreground" />
            <p className="mb-8 text-xl text-muted-foreground">
              No asset brands yet
            </p>
            <Button
              size="lg"
              onClick={() => {
                setEditing(null);
                const emptyForm = {
                  name: '',
                  prefix: '',
                  gl_code: '',
                  categoryId: '',
                  typeId: '',
                  contact: '',
                  email: '',
                  departmentId: '',
                };
                setForm(emptyForm);
                setInitialForm(emptyForm);
                setIsOpen(true);
              }}
              disabled={!hasPermission('Asset Brands', 'create')}
              className="bg-red-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="mr-3 h-6 w-6" /> Add Your First Brand
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            <DataTable<AssetBrand>
              tableId="asset-brands"
              data={brands}
              columns={brandColumns}
              searchPlaceholder="Search brands..."
              emptyState={
                <p className="text-muted-foreground">No matching brands</p>
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
                Permanently Delete Asset Brand?
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
                  Existing assets will retain their current brand assignment.
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
              Yes, Delete Brand
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>
    </section>
  );
}
