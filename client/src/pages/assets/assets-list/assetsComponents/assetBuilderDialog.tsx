'use client';

import { useState, useMemo } from 'react';
import { Package, X, Check, Crown } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/dataTable';
import { assetColumns } from './assetTable/assetColumns';
import { Asset } from './assetTable/assetData';
import { assetSearchText } from '../assetSearchText';
import { toast } from 'sonner';

interface AssetBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onSave: (builderName: string, selectedAssets: Asset[], parentAssetId: string | null) => void;
}

export function AssetBuilderDialog({
  isOpen,
  onClose,
  assets,
  onSave,
}: AssetBuilderDialogProps) {
  const [builderName, setBuilderName] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedParentAssetId, setSelectedParentAssetId] = useState<string | null>(
    null
  );

  const selectableAssets = useMemo(() => {
    return assets.filter(asset => asset.status === 'Available');
  }, [assets]);

  const handleAssetToggle = (assetId: string) => {
    const newSelected = new Set(selectedAssetIds);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
      // If removing the parent, clear parent selection
      if (selectedParentAssetId === assetId) {
        setSelectedParentAssetId(null);
      }
    } else {
      newSelected.add(assetId);
      // If this is the first selected asset, make it the parent
      if (selectedAssetIds.size === 0) {
        setSelectedParentAssetId(assetId);
      }
    }
    setSelectedAssetIds(newSelected);
  };

  const handleSave = () => {
    if (!builderName.trim()) {
      toast.error('Please enter a name for the asset builder');
      return;
    }

    if (selectedAssetIds.size === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    const selectedAssets = selectableAssets.filter(asset =>
      selectedAssetIds.has(asset.id)
    );
    onSave(builderName.trim(), selectedAssets, selectedParentAssetId);
    handleClose();
  };

  const handleClose = () => {
    setBuilderName('');
    setSelectedAssetIds(new Set());
    setSelectedParentAssetId(null);
    onClose();
  };

  // Create columns with checkbox for selection
  const builderColumns = [
    {
      id: 'select',
      header: '',
      size: 50,
      cell: ({ row }: any) => (
        <Checkbox
          checked={selectedAssetIds.has(row.original.id)}
          onCheckedChange={() => handleAssetToggle(row.original.id)}
        />
      ),
    },
    {
      id: 'parent',
      header: 'Parent',
      size: 80,
      cell: ({ row }: any) => (
        selectedParentAssetId === row.original.id ? (
          <div className="flex items-center gap-1 text-amber-600">
            <Crown className="h-4 w-4" />
            <span className="text-xs font-medium">Parent</span>
          </div>
        ) : null
      ),
    },
    ...assetColumns,
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <AppDialogFrame className="max-w-7xl max-h-[90vh] overflow-hidden !flex !flex-col">
        <AppDialogGradientHeader
          title={
            <span className="flex items-center gap-2">
              <Package className="h-6 w-6 shrink-0 text-white" />
              Asset Builder
            </span>
          }
          description="Name your builder and select available assets to group."
        />

        <AppDialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="builderName">Asset Builder Name</Label>
            <Input
              id="builderName"
              placeholder="Enter name for the asset group"
              value={builderName}
              onChange={e => setBuilderName(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Select Assets ({selectedAssetIds.size} selected)</Label>
            <div className="border rounded-lg max-h-96 overflow-auto">
              <DataTable<Asset>
                tableId="asset-builder-dialog"
                data={selectableAssets}
                columns={builderColumns}
                searchPlaceholder="Search all columns..."
                globalFilterFn={(row, _columnId, filterValue) => {
                  const q = String(filterValue ?? '').trim();
                  if (!q) return true;
                  return assetSearchText(row.original).includes(
                    q.toLowerCase()
                  );
                }}
                title="Available Assets"
                titleBadge={`${selectableAssets.length} available`}
                onRowClick={(row) => handleAssetToggle(row.original.id)}
              />
            </div>
          </div>
        </AppDialogBody>

        <AppDialogChromeFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!builderName.trim() || selectedAssetIds.size === 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Check className="mr-2 h-4 w-4" />
            Create Asset Builder
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
