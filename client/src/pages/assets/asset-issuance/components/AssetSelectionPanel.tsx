'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Package } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  status: string;
  category: string;
  type: string;
  serialNo: string;
  assignedTo: string;
  department: string;
  location: string;
  specifications?: Array<{
    assetId: string;
    assetName: string;
    specDescription: string;
  }>;
}

interface AssetSelectionPanelProps {
  assets: Asset[];
  selectedAssets: string[];
  searchTerm: string;
  loading: boolean;
  hasPermission: (module: string, action: string) => boolean;
  onSearchChange: (value: string) => void;
  onAssetSelection: (assetId: string, checked: boolean | string) => void;
  onClearAll: () => void;
}

export function AssetSelectionPanel({
  assets,
  selectedAssets,
  searchTerm,
  loading,
  hasPermission,
  onSearchChange,
  onAssetSelection,
  onClearAll,
}: AssetSelectionPanelProps) {
  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm min-h-[500px]">
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
          <div className="p-2 bg-red-100 rounded-lg">
            <Package className="h-5 w-5 text-red-600" />
          </div>
          Select Assets
          <Badge variant="secondary" className="w-fit sm:ml-auto">
            {assets.length} available
          </Badge>
        </CardTitle>

        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search all columns..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10 border-gray-200 focus:border-red-500 focus:ring-red-500"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 sm:-mr-6 sm:pr-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-32 animate-pulse rounded bg-red-100"></div>
              <span className="ml-3 text-gray-600">Loading assets...</span>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                No assets available for assignment
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            assets.map(asset => (
              <div
                key={asset.id}
                className={`group relative p-4 border-2 rounded-xl transition-all duration-200 ${
                  hasPermission('Asset Assignment', 'create') &&
                  hasPermission('Asset Assignment', 'edit')
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed opacity-50'
                } ${
                  selectedAssets.includes(asset.id)
                    ? 'border-red-500 bg-red-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
                onClick={() =>
                  hasPermission('Asset Assignment', 'create') &&
                  hasPermission('Asset Assignment', 'edit') &&
                  onAssetSelection(asset.id, !selectedAssets.includes(asset.id))
                }
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Checkbox
                      id={asset.id}
                      checked={selectedAssets.includes(asset.id)}
                      onCheckedChange={(checked: boolean | string) =>
                        onAssetSelection(asset.id, checked)
                      }
                      className="pointer-events-none"
                      disabled={
                        !hasPermission('Asset Assignment', 'create') ||
                        !hasPermission('Asset Assignment', 'edit')
                      }
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      <div className="flex items-center justify-between">
                        <h3 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
                          {asset.name}{' '}
                          <span className="text-sm text-gray-500 font-mono">
                            {asset.id}
                          </span>
                        </h3>
                        <div className="flex items-center gap-2">
                          {selectedAssets.includes(asset.id) && (
                            <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">{asset.category}</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span>{asset.type}</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span className="font-mono text-xs">
                        {asset.serialNo}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={
                          asset.status === 'Available' ? 'secondary' : 'default'
                        }
                        className={`text-xs ${
                          asset.status === 'Available'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}
                      >
                        {asset.status}
                      </Badge>
                      {asset.department && (
                        <Badge
                          variant="outline"
                          className="text-xs border-gray-300"
                        >
                          {asset.department}
                        </Badge>
                      )}
                      {asset.location && (
                        <Badge
                          variant="outline"
                          className="text-xs border-gray-300"
                        >
                          {asset.location}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selection overlay */}
                {selectedAssets.includes(asset.id) && (
                  <div className="absolute inset-0 bg-red-500/5 rounded-xl pointer-events-none"></div>
                )}
              </div>
            ))
          )}
        </div>

        {selectedAssets.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-900">
                  {selectedAssets.length} asset
                  {selectedAssets.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
