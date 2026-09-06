import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
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
import type { ActiveAddDialog, AddDialogField } from '@/hooks/useAssetImport';

interface ImportAddDialogsProps {
  activeDialog: ActiveAddDialog | null;
  categories: any[];
  types: any[];
  brands: any[];
  suppliers: any[];
  departments: any[];
  onClose: () => void;
  onSave: (field: AddDialogField, payload: Record<string, any>) => Promise<boolean>;
}

const FIELDS: Record<AddDialogField, { title: string; description: string }> = {
  category: {
    title: 'Create New Category',
    description: 'Categories are the top-level grouping for assets.',
  },
  type: {
    title: 'Create New Type',
    description: 'Type belongs to a category. Types must match their category.',
  },
  brand: {
    title: 'Create New Brand',
    description: 'Brand belongs to a type. Brands must match their type.',
  },
  supplier: {
    title: 'Create New Supplier',
    description: 'Supplier belongs to a category. Suppliers must match their category.',
  },
};

export function ImportAddDialogs({
  activeDialog,
  categories,
  types,
  brands,
  suppliers,
  departments,
  onClose,
  onSave,
}: ImportAddDialogsProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [prefix, setPrefix] = useState('');
  const [glCode, setGlCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeDialog) return;
    setName(activeDialog.value || '');
    setPrefix((activeDialog.value || '').slice(0, 3).toUpperCase());
    setGlCode('');
    setDepartmentId('');
    setContact('');
    setEmail('');

    setCategoryId('');
    setTypeId('');

    const parentValue = (activeDialog.parentValue || '').trim().toLowerCase();
    if (parentValue) {
      if (activeDialog.field === 'type' || activeDialog.field === 'supplier') {
        const cat = categories.find(
          c => (c?.name || '').toString().toLowerCase() === parentValue
        );
        setCategoryId(cat ? String(cat.id ?? cat.categoryID ?? '') : '');
      }
      if (activeDialog.field === 'brand') {
        const t = types.find(
          t => (t?.name || '').toString().toLowerCase() === parentValue
        );
        setTypeId(t ? String(t.id ?? t.typeID ?? '') : '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDialog]);

  if (!activeDialog) return null;

  const field = activeDialog.field;
  const isOpen = !!activeDialog;

  const handleSave = async () => {
    setSaving(true);
    try {
      let payload: Record<string, any>;
      if (field === 'category') {
        payload = { name: name.trim(), prefix: prefix.trim(), gl_code: glCode.trim(), departmentId };
      } else if (field === 'type') {
        payload = { name: name.trim(), categoryId, prefix: prefix.trim() };
      } else if (field === 'brand') {
        payload = { name: name.trim(), typeId, prefix: prefix.trim() || null };
      } else {
        payload = {
          name: name.trim(),
          categoryId: categoryId || null,
          contact: contact.trim() || null,
          email: email.trim() || null,
        };
      }
      const ok = await onSave(field, payload);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    name.trim().length > 0 &&
    (field === 'category'
      ? prefix.trim().length >= 2 && glCode.trim().length > 0 && !!departmentId
      : field === 'type'
        ? !!categoryId && prefix.trim().length > 0
        : field === 'brand'
          ? !!typeId
          : true);

  return (
    <Dialog open={isOpen} onOpenChange={o => { if (!o) onClose(); }}>
      <AppDialogFrame className="sm:max-w-md z-[70]">
        <AppDialogGradientHeader
          title={FIELDS[field].title}
          description={FIELDS[field].description}
        />
        <AppDialogBody className="grid gap-6">
          <div className="space-y-2">
            <Label className="text-base font-medium">
              {field === 'category'
                ? 'Category Name'
                : field === 'type'
                  ? 'Type Name'
                  : field === 'brand'
                    ? 'Brand Name'
                    : 'Supplier Name'}{' '}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={
                field === 'category'
                  ? 'e.g., Computer'
                  : field === 'type'
                    ? 'e.g., Desktop'
                    : field === 'brand'
                      ? 'e.g., Dell'
                      : 'e.g., ABC Supplies'
              }
              className="text-base"
            />
          </div>

          {(field === 'type' || field === 'supplier') && (
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-white z-[9999]">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No categories available — add a category first
                    </div>
                  ) : (
                    categories.map(cat => (
                      <SelectItem
                        key={cat.id ?? cat.categoryID}
                        value={String(cat.id ?? cat.categoryID)}
                        className="hover:bg-gray-200"
                      >
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {field === 'brand' && (
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Type <span className="text-red-500">*</span>
              </Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select an asset type" />
                </SelectTrigger>
                <SelectContent className="bg-white z-[9999]">
                  {types.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No types available — add a type first
                    </div>
                  ) : (
                    types.map(t => (
                      <SelectItem
                        key={t.id ?? t.typeID}
                        value={String(t.id ?? t.typeID)}
                        className="hover:bg-gray-200"
                      >
                        {t.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {field === 'category' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    Prefix <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={prefix}
                    onChange={e => setPrefix(e.target.value.toUpperCase())}
                    maxLength={10}
                    placeholder="COM"
                    className="font-mono text-base tracking-wider"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    GL Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={glCode}
                    onChange={e => setGlCode(e.target.value)}
                    placeholder="2001"
                    className="font-mono text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Department <span className="text-red-500">*</span>
                </Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="w-full bg-white border-gray-300 hover:border-gray-400">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 max-h-60 z-[9999]">
                    {departments.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No departments available
                      </div>
                    ) : (
                      departments.map(dept => (
                        <SelectItem
                          key={dept.departmentID ?? dept.id}
                          value={dept.departmentID ?? dept.id}
                          className="hover:bg-gray-200"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{dept.name}</span>
                            <span className="text-sm text-gray-500">
                              ({dept.code})
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {(field === 'type' || field === 'brand') && (
            <div className="space-y-2">
              <Label className="text-base font-medium">
                {field === 'type' ? 'Type Prefix' : 'Brand Prefix'} (optional for brands, required for types)
              </Label>
              <Input
                value={prefix}
                onChange={e => setPrefix(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder={field === 'type' ? 'DES' : 'DEL'}
                className="font-mono text-base tracking-wider"
              />
            </div>
          )}

          {field === 'supplier' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Contact Number</Label>
                  <Input
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="+1-234-567-8900"
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Email Address</Label>
                  <Input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    placeholder="contact@abc.com"
                    className="text-base"
                  />
                </div>
              </div>
            </>
          )}
        </AppDialogBody>
        <AppDialogChromeFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="rounded-xl px-6 shadow-md"
          >
            {saving ? 'Saving...' : `Create ${field.charAt(0).toUpperCase() + field.slice(1)}`}
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}