'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface IntangibleAssetRow {
  name: string;
  description: string;
  remarks: string;
  type: string;
}

interface IntangibleAsset {
  id: string;
  name: string;
  description: string | null;
  remarks: string | null;
  type: string;
  status: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

interface IntangibleAssetDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  mode: 'create' | 'edit';
  editingAsset: IntangibleAsset | null;
  onSuccess?: () => void;
}

export default function IntangibleAssetDialog({
  isOpen,
  setIsOpen,
  mode,
  editingAsset,
  onSuccess,
}: IntangibleAssetDialogProps) {
  const [rows, setRows] = useState<IntangibleAssetRow[]>([
    {
      name: '',
      description: '',
      remarks: '',
      type: '',
    },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && editingAsset) {
      setRows([
        {
          name: editingAsset.name,
          description: editingAsset.description || '',
          remarks: editingAsset.remarks || '',
          type: editingAsset.type,
        },
      ]);
    } else {
      setRows([
        {
          name: '',
          description: '',
          remarks: '',
          type: '',
        },
      ]);
    }
  }, [mode, editingAsset, isOpen]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        name: '',
        description: '',
        remarks: '',
        type: '',
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index: number, field: keyof IntangibleAssetRow, value: string) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate all rows
      const invalidRow = rows.find(row => !row.name || !row.description || !row.type);
      if (invalidRow) {
        toast.error('Please fill in all required fields (name, description, and type)');
        return;
      }

      if (mode === 'edit' && editingAsset) {
        // Update single asset
        await api.patch(`/intangible-assets/${editingAsset.id}`, { ...rows[0], status: editingAsset.status });
        toast.success('Intangible asset updated successfully');
      } else {
        // Create bulk assets
        await api.post('/intangible-assets/bulk', { assets: rows });
        toast.success(`${rows.length} intangible asset(s) created successfully`);
      }

      setRows([
        {
          name: '',
          description: '',
          remarks: '',
          type: '',
        },
      ]);
      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to save intangible assets:', error);
      toast.error(error.message || 'Failed to save intangible assets');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setRows([
      {
        name: '',
        description: '',
        remarks: '',
        type: '',
      },
    ]);
    setIsOpen(false);
  };

  const isFormValid = rows.every(row => row.name && row.description && row.type);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <AppDialogFrame className="sm:max-w-4xl max-h-[80vh] overflow-hidden !flex !flex-col">
        <AppDialogGradientHeader
          title={mode === 'edit' ? 'Edit Intangible Asset' : 'Add Intangible Assets'}
          description={
            mode === 'edit'
              ? 'Update the intangible asset details.'
              : 'Add one or more intangible assets to your inventory.'
          }
        />
        <AppDialogBody className="grid max-h-[60vh] gap-6 overflow-y-auto px-8 py-6 pr-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Asset Details</h3>
              {mode === 'create' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="rounded-xl border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Asset
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4 shadow-sm bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-700">Asset {index + 1}</span>
                    {mode === 'create' && rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor={`name-${index}`} className="text-sm font-medium text-gray-700">
                        Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`name-${index}`}
                        value={row.name}
                        onChange={e => updateRow(index, 'name', e.target.value)}
                        placeholder="Asset name"
                        className="mt-1 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`description-${index}`} className="text-sm font-medium text-gray-700">
                        Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`description-${index}`}
                        value={row.description}
                        onChange={e => updateRow(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="mt-1 text-sm min-h-[60px] resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`remarks-${index}`} className="text-sm font-medium text-gray-700">
                        Remarks
                      </Label>
                      <Textarea
                        id={`remarks-${index}`}
                        value={row.remarks}
                        onChange={e => updateRow(index, 'remarks', e.target.value)}
                        placeholder="Remarks"
                        className="mt-1 text-sm min-h-[60px] resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all"
                      />
                    </div>
                    <div className="w-32">
                      <Label htmlFor={`type-${index}`} className="text-sm font-medium text-gray-700">
                        Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={row.type}
                        onValueChange={value => updateRow(index, 'type', value)}
                      >
                        <SelectTrigger id={`type-${index}`} className="mt-1 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IT scope">IT scope</SelectItem>
                          <SelectItem value="Admin scope">Admin scope</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter className="justify-end gap-3 px-8 py-5">
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !isFormValid}
            className="rounded-xl px-6 shadow-md"
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Update Asset' : 'Save Assets'}
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
