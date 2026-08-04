// src/pages/assets/assetsComponents/assetStats.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Wrench, AlertTriangle, Trash2, UserCheck, UserX } from 'lucide-react';
import { Asset } from './assetTable/assetData';
import { formatCurrency } from '@/lib/currency';

interface AssetSummary {
  assigned: number;
  available: number;
  inMaintenance: number;
  needsAttention: number;
  forDisposal: number;
  totalValue: number;
}

interface AssetStatsProps {
  assets: Asset[];
  loading: boolean;
  /** Total asset count from server (for paginated lists) */
  totalCount?: number;
  /** Summary stats computed server-side from full dataset (bypasses pagination skew) */
  summary?: AssetSummary;
  /** Active tab to determine which stats to show */
  activeTab?: string;
  /** Intangible assets data for intangible tab stats */
  intangibleAssets?: any[];
}

export function AssetStats({ assets, loading, totalCount, summary, activeTab, intangibleAssets = [] }: AssetStatsProps) {
  const isIntangibleTab = activeTab === 'intangible-assets';

  if (loading) {
    return (
      <div className={`grid w-full gap-3 ${isIntangibleTab ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7'}`}>
        {Array(7)
          .fill(0)
          .map((_, index) => (
            <Card
              key={index}
              className="min-w-0 rounded-xl shadow-sm transition-shadow animate-pulse"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 px-4 pb-2 pt-4">
                <CardTitle className="h-4 w-20 rounded bg-gray-200 text-sm font-medium text-gray-600"></CardTitle>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-6 w-16 rounded bg-gray-200 text-2xl font-bold"></div>
              </CardContent>
            </Card>
          ))}
      </div>
    );
  }

  const totalValue = summary
    ? summary.totalValue
    : assets.length > 0
      ? assets.reduce(
          (sum, asset) =>
            sum + (parseFloat(asset.purchasePrice.toString()) || 0),
          0
        )
      : 0;
  const assignedCount = summary?.assigned ?? assets.filter(a => a.status === 'Assigned').length;
  const availableCount = summary?.available ?? assets.filter(a => a.status === 'Available').length;
  const inMaintenanceCount = summary?.inMaintenance ?? assets.filter(
    a => a.status === 'In Maintenance'
  ).length;
  const needsAttentionCount = summary?.needsAttention ?? assets.filter(a =>
    ['Needs Repair', 'Damaged'].includes(a.condition)
  ).length;
  const forDisposalCount = summary?.forDisposal ?? assets.filter(a =>
    ['Obsolete', 'Damaged'].includes(a.condition)
  ).length;

  // Determine which stats to show based on active tab
  let stats;
  if (isIntangibleTab) {
    // Intangible Assets stats
    const totalIntangible = intangibleAssets.length;
    const assignedIntangible = intangibleAssets.filter(a => a.assignees && a.assignees.length > 0).length;
    const unassignedIntangible = totalIntangible - assignedIntangible;

    // Count by type
    const itScopeCount = intangibleAssets.filter(a => a.type === 'IT scope').length;
    const hrScopeCount = intangibleAssets.filter(a => a.type === 'HR scope').length;
    const adminScopeCount = intangibleAssets.filter(a => a.type === 'Admin scope').length;

    stats = [
      {
        label: 'Total Intangible Assets',
        value: totalIntangible,
        icon: Package,
      },
      {
        label: 'Assigned',
        value: assignedIntangible,
        color: 'text-green-600',
        dot: 'bg-green-500',
      },
      {
        label: 'Unassigned',
        value: unassignedIntangible,
        color: 'text-gray-600',
        dot: 'bg-gray-400',
      },
      {
        label: 'IT Scope',
        value: itScopeCount,
        icon: Wrench,
        iconColor: 'text-blue-500',
      },
      {
        label: 'HR Scope',
        value: hrScopeCount,
        icon: UserCheck,
        iconColor: 'text-green-500',
      },
      {
        label: 'Admin Scope',
        value: adminScopeCount,
        icon: UserX,
        iconColor: 'text-purple-500',
      },
    ];
  } else {
    // Regular Assets stats
    const totalValue = summary
      ? summary.totalValue
      : assets.length > 0
        ? assets.reduce(
            (sum, asset) =>
              sum + (parseFloat(asset.purchasePrice.toString()) || 0),
            0
          )
        : 0;
    const assignedCount = summary?.assigned ?? assets.filter(a => a.status === 'Assigned').length;
    const availableCount = summary?.available ?? assets.filter(a => a.status === 'Available').length;
    const inMaintenanceCount = summary?.inMaintenance ?? assets.filter(
      a => a.status === 'In Maintenance'
    ).length;
    const needsAttentionCount = summary?.needsAttention ?? assets.filter(a =>
      ['Needs Repair', 'Damaged'].includes(a.condition)
    ).length;
    const forDisposalCount = summary?.forDisposal ?? assets.filter(a =>
      ['Obsolete', 'Damaged'].includes(a.condition)
    ).length;

    stats = [
      {
        label: 'Total Assets',
        value: totalCount !== undefined ? totalCount : assets.length,
        icon: Package,
      },
      {
        label: 'Assigned',
        value: assignedCount,
        color: 'text-green-600',
        dot: 'bg-green-500',
      },
      {
        label: 'Available',
        value: availableCount,
        color: 'text-blue-600',
        dot: 'bg-blue-500',
      },
      {
        label: 'In Maintenance',
        value: inMaintenanceCount,
        icon: Wrench,
        iconColor: 'text-orange-500',
      },
      {
        label: 'Needs Attention',
        value: needsAttentionCount,
        icon: AlertTriangle,
        iconColor: 'text-yellow-500',
      },
      {
        label: 'For Disposal',
        value: forDisposalCount,
        icon: Trash2,
        iconColor: 'text-red-500',
      },
      { label: 'Total Value', value: formatCurrency(totalValue) },
    ];
  }

  return (
    <div className={`grid w-full gap-3 ${isIntangibleTab ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7'}`}>
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="min-w-0 w-full rounded-xl shadow-sm transition-shadow hover:shadow-md"
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 px-4 pb-2 pt-4">
            <CardTitle className="pr-3 text-xs font-medium leading-tight text-gray-600 sm:text-sm">
              {stat.label}
            </CardTitle>
            {stat.icon ? (
              <stat.icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${stat.iconColor || 'text-gray-500'}`}
              />
            ) : stat.dot ? (
              <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${stat.dot}`} />
            ) : (
              <span className="mt-0.5 shrink-0 text-lg font-bold text-gray-500">$</span>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div
              className={`break-words text-lg font-bold leading-tight sm:text-2xl ${stat.color || ''}`}
            >
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
