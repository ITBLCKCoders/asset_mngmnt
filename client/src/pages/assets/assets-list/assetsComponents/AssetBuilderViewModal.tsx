'use client';

import { useEffect, useState } from 'react';
import {
  Package,
  X,
  Clock,
  FileText,
  MapPin,
  Settings,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { BuilderFormsTab } from './BuilderFormsTab';
import { Asset } from './assetTable/assetData';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import { computeNextMaintenanceDate } from '@/utils/computeNextMaintenanceDate';
import { formatAuditPlainText } from '@/components/common/AuditFieldChanges';
import { useAuditFieldLookups } from '@/hooks/useAuditFieldLookups';
import type { AssetBuilderRecord } from '@/utils/builderScan';

interface AssetBuilderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  builder: AssetBuilderRecord | null;
  assets?: Asset[];
  onAssetSelect?: (asset: Asset) => void;
}

function mapApiAssetToViewAsset(apiAsset: AssetResponseDto): Asset {
  const createdAtParsed = apiAsset.created_at
    ? new Date(
        String(apiAsset.created_at).replace(' ', 'T') +
          (String(apiAsset.created_at).includes('Z') ? '' : 'Z')
      )
    : new Date();
  const lastMaint = apiAsset.last_maintenance_date
    ? new Date(apiAsset.last_maintenance_date)
    : null;
  const nextMaint = computeNextMaintenanceDate(apiAsset.maintenance_schedule, {
    lastMaintenanceDate: apiAsset.last_maintenance_date,
    purchaseDate: apiAsset.purchase_date,
    createdAt: createdAtParsed,
  });

  return {
    id: apiAsset.asset_code,
    assetID: apiAsset.assetID,
    name: apiAsset.name,
    image: apiAsset.image_url || '',
    description: apiAsset.description || '',
    category: apiAsset.category_name || apiAsset.category_id || '',
    type: apiAsset.type_name || apiAsset.type_id || '',
    serialNo: apiAsset.serial || '',
    modelNo: apiAsset.model || '',
    brand: apiAsset.brand || '',
    status:
      (apiAsset.status === 'In Use'
        ? 'Assigned'
        : (apiAsset.status as 'Available' | 'Assigned' | 'In Maintenance')) ||
      'Available',
    assignedTo: apiAsset.currentAssignment?.user?.name || '',
    department:
      apiAsset.currentAssignment?.department ||
      (apiAsset.department ? JSON.parse(apiAsset.department).name : '') ||
      '',
    location:
      apiAsset.currentAssignment?.location ||
      `${apiAsset.location_name || ''}${apiAsset.room_name ? ` - ${apiAsset.room_name}` : ''}`,
    currentAssignment: apiAsset.currentAssignment ?? undefined,
    assignmentHistory: apiAsset.assignmentHistory ?? undefined,
    builderHistory: apiAsset.builderHistory ?? undefined,
    purchaseDate: apiAsset.purchase_date ? new Date(apiAsset.purchase_date) : null,
    purchasePrice: apiAsset.asset_value || 0,
    supplier: apiAsset.supplier || '',
    warranty: apiAsset.warranty_months ? `${apiAsset.warranty_months} months` : null,
    warranty_months: apiAsset.warranty_months || null,
    documents: apiAsset.documents || [],
    maintenanceSchedule: apiAsset.maintenance_schedule || 'None',
    lastMaintenanceDate:
      lastMaint && !Number.isNaN(lastMaint.getTime()) ? lastMaint : null,
    nextMaintenanceDate: nextMaint,
    condition:
      (apiAsset.condition as
        | 'Excellent'
        | 'Good'
        | 'Needs Repair'
        | 'Damaged'
        | 'Obsolete') || 'Good',
    usefulLifeYears: apiAsset.useful_life_years || 0,
    salvageValue: apiAsset.salvage_value || 0,
    depreciationMethod: apiAsset.depreciation_method || '',
    annualDepreciation: apiAsset.annual_depreciation || 0,
    depreciationStartDate: apiAsset.depreciation_start_date
      ? new Date(apiAsset.depreciation_start_date)
      : null,
    company: apiAsset.company_name || '',
    company_id: apiAsset.company_id || '',
    building: apiAsset.building || '',
    createdAt: createdAtParsed,
    createdBy: apiAsset.created_by_name || apiAsset.created_by || '',
    updatedAt: apiAsset.updated_at
      ? new Date(apiAsset.updated_at)
      : new Date(apiAsset.created_at),
    updatedBy: apiAsset.updated_by_name || apiAsset.updated_by || '',
    categoryId: apiAsset.category_id || '',
    typeId: apiAsset.type_id || '',
    transferred_out: false,
    transferred_to_company_name: null,
    accountabilityForm: undefined,
  };
}

export function AssetBuilderViewModal({
  isOpen,
  onClose,
  builder,
  assets = [],
  onAssetSelect,
}: AssetBuilderViewModalProps) {
  const [activeBuilderTab, setActiveBuilderTab] = useState('information');
  const [builderAuditLogs, setBuilderAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const { mergedIdLabels: builderMergedIdLabels } = useAuditFieldLookups();

  useEffect(() => {
    if (!isOpen) {
      setActiveBuilderTab('information');
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (!isOpen || !builder?.builderID) {
        setBuilderAuditLogs([]);
        return;
      }

      try {
        setAuditLoading(true);
        const response = await api.get(`/audit/builders/${builder.builderID}`);
        const logs = response.auditLogs || [];
        setBuilderAuditLogs(
          logs.sort(
            (a: any, b: any) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        );
      } catch (error) {
        console.warn('Failed to fetch builder audit logs:', error);
        setBuilderAuditLogs([]);
      } finally {
        setAuditLoading(false);
      }
    };

    fetchAuditLogs();
  }, [isOpen, builder?.builderID]);

  if (!isOpen || !builder) return null;

  const handleItemClick = async (item: { asset_code: string }) => {
    if (!onAssetSelect) return;

    let foundAsset = assets.find(a => a.id === item.asset_code);
    if (!foundAsset) {
      try {
        const response = await api.get<{ assets: AssetResponseDto[] }>(
          `/assets/${encodeURIComponent(item.asset_code)}`
        );
        const apiAsset = response.assets?.[0];
        if (apiAsset) {
          foundAsset = mapApiAssetToViewAsset(apiAsset);
        }
      } catch (error) {
        console.error('Failed to fetch asset details:', error);
        toast.error('Failed to load asset details');
        return;
      }
    }

    if (foundAsset) {
      onAssetSelect(foundAsset);
    }
  };

  const isAvailable = builder.status === 'Available';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <Card className="relative z-10 w-full max-w-4xl bg-white rounded-2xl overflow-hidden flex flex-col h-[88vh] max-h-[840px] min-h-[660px] mx-4 border-none shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white pb-12 pt-8 px-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                {builder.name || 'Asset Builder Details'}
              </h2>
              <p className="text-red-100 mt-2 text-base">
                Viewing asset builder information
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>

        <div className="relative -mt-6 md:-mt-8 px-2 md:px-4 flex-shrink-0">
          <div className="flex justify-center overflow-x-auto scrollbar-hide">
            <div className="flex items-center bg-white rounded-full shadow-xl px-4 py-2 md:px-10 md:py-4 border-2 md:border-4 border-red-100">
              {[
                { title: 'Information', icon: Package, value: 'information' },
                { title: 'Timeline', icon: Clock, value: 'timeline' },
                { title: 'Forms', icon: FileText, value: 'forms' },
              ].map((tab, index, tabs) => {
                const Icon = tab.icon;
                const isActive = tab.value === activeBuilderTab;

                return (
                  <div key={tab.value} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => setActiveBuilderTab(tab.value)}
                        className={`w-8 h-8 md:w-11 md:h-11 rounded-full flex items-center justify-center border-2 md:border-4 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-red-600 text-white border-red-300 ring-2 md:ring-4 ring-red-100'
                            : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
                      <p
                        className={`mt-1 md:mt-2 text-xs font-medium text-center max-w-20 ${
                          isActive ? 'text-red-700' : 'text-gray-500'
                        }`}
                      >
                        {tab.title}
                      </p>
                    </div>
                    {index < tabs.length - 1 && (
                      <div className="w-8 md:w-20 lg:w-24 h-1 mx-2 md:mx-4 bg-gray-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <CardContent className="flex-1 overflow-y-auto px-6 pt-6 pb-4 min-h-0">
          {activeBuilderTab === 'information' && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Builder Details
                </h3>
                <p className="text-sm text-gray-600">
                  {builder.description || 'No description provided'}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <p className="text-gray-600">
                      {builder.created_at
                        ? new Date(builder.created_at).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created By:</span>
                    <p className="text-gray-600">
                      {builder.created_by_name || builder.created_by || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Assets in this Builder
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {builder.items?.map((item, index) => (
                    <button
                      key={`${item.asset_code}-${index}`}
                      type="button"
                      className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors w-full text-left ${
                        item.is_parent
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-gray-200'
                      }`}
                      onClick={e => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      disabled={!onAssetSelect}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {item.is_parent && (
                          <Crown className="h-4 w-4 text-amber-600" />
                        )}
                        <span
                          className={`font-medium ${
                            item.is_parent ? 'text-amber-900' : 'text-gray-900'
                          }`}
                        >
                          {item.asset_code}
                        </span>
                      </div>
                      <p
                        className={`text-sm mb-2 ${
                          item.is_parent ? 'text-amber-700' : 'text-gray-600'
                        }`}
                      >
                        {item.asset_name}
                      </p>
                      <div className="text-xs text-gray-500">
                        <span>Category: {item.category_name || 'N/A'}</span>
                        {item.type_name && <span> • Type: {item.type_name}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeBuilderTab === 'timeline' && (
            <div className="space-y-6 w-full">
              {auditLoading ? (
                <div className="text-center py-4 text-gray-500">Loading timeline...</div>
              ) : (
                builderAuditLogs.map((log: any, index: number) => {
                  const Icon =
                    log.action === 'Assigned Asset Builder'
                      ? MapPin
                      : log.action === 'Added to Asset Builder' ||
                          log.action === 'Removed from Asset Builder'
                        ? Settings
                        : log.action === 'Updated Asset Builder'
                          ? Clock
                          : Package;
                  const isLast = index === builderAuditLogs.length - 1;

                  return (
                    <div key={`audit-${log.id}`} className="flex gap-3 sm:gap-4 w-full">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-indigo-600 bg-gray-50 border-2 border-gray-200">
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        {!isLast && (
                          <div className="w-0.5 h-12 sm:h-16 bg-gray-200 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6 sm:pb-8 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                          {log.action}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words whitespace-pre-line">
                          {formatAuditPlainText(
                            log.details ?? '',
                            builderMergedIdLabels
                          ) || log.resource}
                          {log.user?.name ? ` by ${log.user.name}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              <div className="flex gap-3 sm:gap-4 w-full">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-600 bg-gray-50 border-2 border-gray-200">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
                <div className="flex-1 pb-6 sm:pb-8 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                    Current Status
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Builder is currently{' '}
                    {isAvailable ? 'available for use' : 'assigned to a user'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeBuilderTab === 'forms' && (
            <BuilderFormsTab builderId={builder.builderID} />
          )}
        </CardContent>

        <div className="flex flex-col sm:flex-row justify-between gap-4 px-6 py-5 bg-gray-50 border-t">
          <Button variant="outline" size="lg" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
