'use client';

import { useState } from 'react';
import { Package, X, Clock, CheckCircle2, FileText, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { Step4Review } from './modalSteps/step4AssetsReview';
import { AssetTimeline } from './assetTimeline';
import { AssetFormsTab } from '../../components/AssetFormsTab';
import { AssetMovementTab } from '../../accountability/AssetMovementTab';

import {
  AssetFormData,
  mapApiMaintenanceScheduleToForm,
} from '../assetsComponents/assetTypes/assetFormTypes';
import { Asset } from './assetTable/assetData';

interface AssetViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (asset: Asset) => void;
  asset: Asset | null;
  showEditButton?: boolean;
  canEdit?: boolean;
  hideFinancialInfo?: boolean;
  hideTimeline?: boolean;
  hideForms?: boolean;
  hideMovement?: boolean;
}

const viewTabs = [
  {
    title: 'Details',
    icon: Package,
    value: 'details',
    description: 'Asset Information',
  },
  {
    title: 'Timeline',
    icon: Clock,
    value: 'timeline',
    description: 'Asset History & Events',
  },
  {
    title: 'Forms',
    icon: FileText,
    value: 'forms',
    description: 'Accountability & Transaction Forms',
  },
  {
    title: 'Movement',
    icon: GitBranch,
    value: 'movement',
    description: 'Asset Movement',
  },
] as const;

export function AssetViewModal({
  isOpen,
  onClose,
  onEdit,
  asset,
  showEditButton = true,
  canEdit = true,
  hideFinancialInfo = false,
  hideTimeline = false,
  hideForms = false,
  hideMovement = false,
}: AssetViewModalProps) {
  const [activeTab, setActiveTab] = useState('details');

  const visibleTabs = viewTabs.filter(tab => {
    if (tab.value === 'timeline' && hideTimeline) return false;
    if (tab.value === 'forms' && hideForms) return false;
    if (tab.value === 'movement' && hideMovement) return false;
    return true;
  });

  const handlePdfModalOpen = () => {
    // Set a flag before closing so we know to reopen later
    window.dispatchEvent(new CustomEvent('assetDetailsModalClosing'));
    onClose();
  };

  const handlePdfModalClose = () => {
    // Reopen the asset details modal after a short delay
    setTimeout(() => {
      // The parent component needs to handle reopening
      // For now, we'll dispatch a custom event
      window.dispatchEvent(new CustomEvent('reopenAssetDetailsModal'));
    }, 100);
  };

  // Convert Asset to AssetFormData format
  const convertAssetToFormData = (asset: Asset): AssetFormData => {
    // Map status from Asset to AssetFormData
    const mapStatus = (status: string): AssetFormData['status'] => {
      switch (status) {
        case 'In Use':
          return 'Assigned';
        case 'Available':
          return 'Available';
        case 'In Maintenance':
          return 'Repairing';
        default:
          return 'Available';
      }
    };

    // Map depreciation method
    const mapDepreciationMethod = (
      method: string | null | undefined
    ): AssetFormData['depreciationMethod'] => {
      switch (method?.toLowerCase() ?? '') {
        case 'straight line':
          return 'straight-line';
        case 'declining balance':
          return 'declining-balance';
        case 'double declining':
          return 'double-declining';
        case 'units of production':
          return 'units-of-production';
        default:
          return 'straight-line';
      }
    };

    // Parse location to separate site and room
    const parseLocation = (location: string) => {
      const parts = location.split(' - ');
      if (parts.length > 1) {
        return { site: parts[0], room: parts.slice(1).join(' - ') };
      } else {
        return { site: '', room: location };
      }
    };

    const { site, room } = parseLocation(asset.location);

    return {
      name: asset.name,
      description: asset.description,
      category: asset.category,
      categoryId: '', // Would need to be populated from API
      type: asset.type,
      typeId: '',
      brand: asset.brand,
      model: asset.modelNo,
      serial: asset.serialNo,
      supplier: asset.supplier,
      purchaseDate: asset.purchaseDate
        ? asset.purchaseDate.toISOString()
        : undefined,
      assetValue: asset.purchasePrice,
      salvageValue: asset.salvageValue,
      depreciationMethod: mapDepreciationMethod(asset.depreciationMethod),
      usefulLifeYears: asset.usefulLifeYears,
      annualDepreciation: asset.annualDepreciation,
      depreciationStartDate: asset.depreciationStartDate
        ? asset.depreciationStartDate.toISOString()
        : undefined,
      company: asset.company,
      locationSite: '', // Would need to be populated
      locationSiteName: site,
      locationBuilding: asset.building,
      locationRoom: room,
      department: asset.department,
      locationNotes: '',
      warrantyMonths: asset.warranty
        ? parseInt(asset.warranty.split(' ')[0])
        : undefined,
      condition: asset.condition as AssetFormData['condition'],
      maintenanceSchedule: mapApiMaintenanceScheduleToForm(
        asset.maintenanceSchedule
      ),
      status: mapStatus(asset.status),
      isOldUnit: false,

      imageUrl: asset.image,
      documents: [], // Asset documents are not File objects, so we'll leave empty for now
      assetId: asset.id,
    };
  };

  const formData = asset ? convertAssetToFormData(asset) : null;

  const handleClose = () => {
    onClose();
  };

  if (!isOpen || !asset || !formData) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={handleClose} />

        <Card className="relative z-10 w-full max-w-4xl bg-white rounded-2xl overflow-hidden flex flex-col h-[88dvh] max-h-[840px] min-h-[520px] sm:min-h-[660px] mx-2 sm:mx-4 border-none shadow-2xl ">
          <CardHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white pb-8 sm:pb-12 pt-6 sm:pt-8 px-4 sm:px-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl sm:text-3xl font-bold">
                  Asset Details
                </h2>
                <p className="text-red-100 mt-2 text-sm sm:text-base">
                  Viewing asset information
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </CardHeader>

          <div className="relative -mt-4 sm:-mt-6 md:-mt-8 px-2 md:px-4 flex-shrink-0">
            <div className="flex justify-center overflow-x-auto scrollbar-hide">
              <div className="flex items-center bg-white rounded-full shadow-xl px-2 sm:px-4 md:px-10 py-2 sm:py-3 md:py-4 border-2 md:border-4 border-red-100">
                {visibleTabs.map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = tab.value === activeTab;

                  return (
                    <div key={tab.value} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => setActiveTab(tab.value)}
                          className={`w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center border-2 md:border-4 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-red-600 text-white border-red-300 ring-2 md:ring-4 ring-red-100'
                              : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                        </button>
                        <p
                          className={`mt-1 md:mt-2 text-[10px] sm:text-xs font-medium text-center max-w-16 sm:max-w-20 whitespace-nowrap ${isActive ? 'text-red-700' : 'text-gray-500'}`}
                        >
                          {tab.title}
                        </p>
                      </div>
                      {index < visibleTabs.length - 1 && (
                        <div className="w-4 sm:w-8 md:w-20 lg:w-24 h-1 mx-1 sm:mx-2 md:mx-4 bg-gray-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <CardContent className="flex-1 overflow-y-auto px-4 sm:px-6 pt-5 sm:pt-6 pb-4 min-h-0">
            <div className="mb-8">
              <h3 className="text-xl sm:text-2xl font-bold text-red-700 text-center sm:text-left">
                {visibleTabs.find(tab => tab.value === activeTab)?.description}
              </h3>
            </div>

            {activeTab === 'details' && (
              <Step4Review
                formData={formData}
                showReviewHeader={false}
                assetDocuments={asset.documents}
                currentAssignment={asset.currentAssignment}
                pendingAssignment={asset.pendingAssignment}
                isPendingSignature={asset.isPendingSignature}
                showFinancialInfo={!hideFinancialInfo}
              />
            )}

            {activeTab === 'timeline' && <AssetTimeline asset={asset} showFieldChanges={false} />}

            {activeTab === 'forms' && (
              <AssetFormsTab
                assetId={asset.assetID ?? asset.id}
                onPdfModalOpen={handlePdfModalOpen}
                onPdfModalClose={handlePdfModalClose}
              />
            )}

            {activeTab === 'movement' && (
              <AssetMovementTab assetId={asset.assetID ?? asset.id} />
            )}
          </CardContent>

          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 bg-gray-50 border-t">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
              {showEditButton && onEdit && (
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => onEdit(asset)}
                  disabled={!canEdit}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit Asset
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
