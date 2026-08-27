'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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

import { api } from '@/lib/api';
import { toast } from 'sonner';

interface IntangibleAssetRow {
  name: string;
  description: string;
  remarks: string;
  type: string;
  riskLevelId: string;
}

interface IntangibleAsset {
  id: string;
  name: string;
  description: string | null;
  remarks: string | null;
  type: string;
  risk_level?: { id: string; name: string; color?: string } | null;
  risk_level_id?: string | null;
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

interface IntangibleTypeOption {
  id: string;
  name: string;
}

interface RiskLevelOption {
  id: string;
  name: string;
  color?: string;
}

const emptyRow = (): IntangibleAssetRow => ({
  name: '',
  description: '',
  remarks: '',
  type: '',
  riskLevelId: '',
});

export default function IntangibleAssetDialog({
  isOpen,
  setIsOpen,
  mode,
  editingAsset,
  onSuccess,
}: IntangibleAssetDialogProps) {
  const [rows, setRows] = useState<IntangibleAssetRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [intangibleTypes, setIntangibleTypes] = useState<IntangibleTypeOption[]>([]);
  const [riskLevels, setRiskLevels] = useState<RiskLevelOption[]>([]);
  const [typeSearch, setTypeSearch] = useState<Record<number, string>>({});

  useEffect(() => {
    if (mode === 'edit' && editingAsset) {
      setRows([
        {
          name: editingAsset.name,
          description: editingAsset.description || '',
          remarks: editingAsset.remarks || '',
          type: editingAsset.type,
          riskLevelId:
            editingAsset.risk_level?.id ?? editingAsset.risk_level_id ?? '',
        },
      ]);
    } else {
      setRows([emptyRow()]);
    }
  }, [mode, editingAsset, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadOptions = async () => {
      try {
        const [typeData, riskData] = await Promise.all([
          api.get<any[]>('/intangible-asset-types'),
          api.get<any[]>('/risk-levels'),
        ]);
        if (cancelled) return;
        setIntangibleTypes((typeData ?? []).map((t: any) => ({ id: t.id, name: t.name })));
        setRiskLevels((riskData ?? []).map((r: any) => ({ id: r.id, name: r.name, color: r.color })));
      } catch (error: any) {
        if (cancelled) return;
        console.error('Failed to load type/risk level options:', error);
        toast.error('Failed to load type and risk level options');
      }
    };

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const addRow = () => {
    setRows([...rows, emptyRow()]);
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
        const { riskLevelId, ...rest } = rows[0];
        await api.patch(`/intangible-assets/${editingAsset.id}`, {
          ...rest,
          riskLevelId: riskLevelId || null,
          status: editingAsset.status,
        });
        toast.success('Intangible asset updated successfully');
      } else {
        // Create bulk assets
        await api.post('/intangible-assets/bulk', {
          assets: rows.map(row => ({
            ...row,
            riskLevelId: row.riskLevelId || null,
          })),
        });
        toast.success(`${rows.length} intangible asset(s) created successfully`);
      }

      setRows([emptyRow()]);
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
    setRows([emptyRow()]);
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
            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4 shadow-sm bg-white">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${index}`} className="text-base font-medium text-gray-700">
                          Name <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id={`name-${index}`}
                          value={row.name}
                          onChange={e => updateRow(index, 'name', e.target.value)}
                          placeholder="Enter asset name"
                          className="min-h-[60px] resize-none text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`type-${index}`} className="text-base font-medium text-gray-700">
                          Type <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={row.type}
                          onValueChange={value => updateRow(index, 'type', value)}
                        >
                          <SelectTrigger id={`type-${index}`} className="text-base w-full bg-white hover:bg-gray-200 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <SelectValue placeholder="Select type">
                              {row.type || undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-60 bg-white border border-gray-200 rounded-md shadow-md">
                            <div className="px-2 py-2 border-b border-gray-200">
                              <div className="relative">
                                <svg
                                  className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                  />
                                </svg>
                                <input
                                  type="text"
                                  placeholder="Search types..."
                                  value={typeSearch[index] ?? ''}
                                  onKeyDown={e => e.stopPropagation()}
                                  onChange={e =>
                                    setTypeSearch(prev => ({
                                      ...prev,
                                      [index]: e.target.value,
                                    }))
                                  }
                                  className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <div className="max-h-48 overflow-y-auto">
                              {intangibleTypes.length === 0 && (
                                <div className="px-3 py-6 text-sm text-gray-500 text-center">
                                  No types available
                                </div>
                              )}
                              {intangibleTypes
                                .filter(t =>
                                  t.name
                                    .toLowerCase()
                                    .includes((typeSearch[index] ?? '').toLowerCase())
                                )
                                .map(t => (
                                  <SelectItem
                                    key={t.id}
                                    value={t.name}
                                    className="py-2 hover:bg-gray-200 focus:bg-gray-200"
                                  >
                                    {t.name}
                                  </SelectItem>
                                ))}
                              {intangibleTypes.length > 0 &&
                                intangibleTypes.filter(t =>
                                  t.name
                                    .toLowerCase()
                                    .includes((typeSearch[index] ?? '').toLowerCase())
                                ).length === 0 && (
                                  <div className="px-3 py-6 text-sm text-gray-500 text-center">
                                    No types found
                                  </div>
                                )}
                            </div>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`risk-level-${index}`} className="text-base font-medium text-gray-700">
                          Risk Level
                        </Label>
                        <Select
                          value={row.riskLevelId}
                          onValueChange={value => updateRow(index, 'riskLevelId', value)}
                        >
                          <SelectTrigger id={`risk-level-${index}`} className="text-base">
                            <SelectValue placeholder="Select risk level (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {riskLevels.length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">
                                No risk levels available
                              </div>
                            )}
                            {riskLevels.map(rl => (
                              <SelectItem key={rl.id} value={rl.id}>
                                <span className="flex items-center gap-2">
                                  {rl.color && (
                                    <span
                                      className="inline-block h-3 w-3 rounded-full"
                                      style={{ backgroundColor: rl.color }}
                                    />
                                  )}
                                  {rl.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`description-${index}`} className="text-base font-medium text-gray-700">
                        Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`description-${index}`}
                        value={row.description}
                        onChange={e => updateRow(index, 'description', e.target.value)}
                        placeholder="Enter description"
                        className="min-h-[80px] resize-none text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`remarks-${index}`} className="text-base font-medium text-gray-700">
                        Remarks
                      </Label>
                      <Textarea
                        id={`remarks-${index}`}
                        value={row.remarks}
                        onChange={e => updateRow(index, 'remarks', e.target.value)}
                        placeholder="Enter remarks (optional)"
                        className="min-h-[80px] resize-none text-base"
                      />
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
