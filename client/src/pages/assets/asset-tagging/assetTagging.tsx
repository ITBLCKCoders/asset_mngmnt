'use client';

import { useEffect, useState } from 'react';
import { Tag, QrCode } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/dataTable';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import { Asset } from '../assets-list/assetsComponents/assetTable/assetData';
import { AssetViewModal } from '../assets-list/assetsComponents/assetViewModal';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCompanyContext } from '@/context/CompanyContext';
import { TaggingColumns } from './components/TaggingColumns';
import { AssetTagModal } from './components/AssetTagModal';

export default function AssetsTagging() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission, roleCustodian } = useUserPermissions();
  const { activeCompany } = useCompanyContext();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isAssetViewModalOpen, setIsAssetViewModalOpen] = useState(false);
  const [selectedAssetForView, setSelectedAssetForView] =
    useState<Asset | null>(null);
  const isSuperAdmin = currentUser?.role?.name?.toLowerCase() === 'super admin';
  const isAdmin = currentUser?.role?.name?.toLowerCase() === 'admin';
  const isOverallManager = roleCustodian?.managerRole === 'overallManager';
  const showScopeTabs = isSuperAdmin || isAdmin || isOverallManager;
  const [scope, setScope] = useState<'it' | 'admin'>('it');
  const displayLoading = loading;

  const taggingColumns = TaggingColumns({
    selectedAssets,
    onSelect: (id: string, checked: boolean) => {
      setSelectedAssets(prev => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
        return newSet;
      });
    },
    hasPermission,
  });

  const fetchAssets = async () => {
    try {
      // Determine companyId based on user role
      let companyId: string | undefined;
      const userRole = currentUser?.role?.name?.toLowerCase();
      if (userRole === 'super admin' || userRole === 'admin') {
        // Super Admin and Admin use active company
        companyId = activeCompany?.id || undefined;
      } else {
        // IT asset and Admin asset users use their assigned company
        companyId = currentUser?.company_id || undefined;
      }

      const queryParams = new URLSearchParams();
      queryParams.append('limit', '-1');
      if (companyId) {
        queryParams.append('companyId', companyId);
      }
      if (showScopeTabs) {
        queryParams.append('scope', scope);
      }
      const response = await api.get<{ assets: AssetResponseDto[] }>(
        `/assets?${queryParams.toString()}`
      );
      const transformedAssets = response.assets.map((asset: AssetResponseDto) => ({
        id: asset.asset_code,
        name: asset.name,
        image: asset.image_url || '',
        description: asset.description || '',
        category: asset.category_name || asset.category_id || '',
        type: asset.type_name || asset.type_id || '',
        serialNo: asset.serial || '',
        modelNo: asset.model || '',
        brand: asset.brand || '',
        status:
          (asset.status === 'In Use'
            ? 'Assigned'
            : (asset.status as 'Available' | 'Assigned' | 'In Maintenance')) ||
          'Available',
        assignedTo: asset.currentAssignment?.user?.name || '',
        department:
          asset.currentAssignment?.department ||
          (asset.department ? JSON.parse(asset.department).name : ''),
        location:
          asset.currentAssignment?.location ||
          `${asset.location_name || ''}${asset.room_name ? ` - ${asset.room_name}` : ''}`,
        currentAssignment: asset.currentAssignment ?? undefined,
        assignmentHistory: [],
        purchaseDate: asset.purchase_date
          ? new Date(asset.purchase_date)
          : null,
        purchasePrice: asset.asset_value || 0,
        supplier: asset.supplier || '',
        warranty: asset.warranty_months
          ? `${asset.warranty_months} months`
          : null,
        warranty_months: asset.warranty_months || null,
        documents: asset.documents || [],
        maintenanceSchedule: asset.maintenance_schedule || 'None',
        lastMaintenanceDate: null,
        nextMaintenanceDate: null,
        condition:
          (asset.condition as
            | 'Excellent'
            | 'Good'
            | 'Needs Repair'
            | 'Damaged'
            | 'Obsolete') || 'Good',
        usefulLifeYears: asset.useful_life_years || 0,
        salvageValue: asset.salvage_value || 0,
        depreciationMethod: asset.depreciation_method || '',
        annualDepreciation: asset.annual_depreciation || 0,
        depreciationStartDate: asset.depreciation_start_date
          ? new Date(asset.depreciation_start_date)
          : null,
        company: asset.company_name || '',
        building: asset.building || '',
        createdAt: new Date(asset.created_at),
        createdBy: asset.created_by_name || asset.created_by || '',
        updatedAt: asset.updated_at
          ? new Date(asset.updated_at)
          : new Date(asset.created_at),
        updatedBy: asset.updated_by_name || asset.updated_by || '',
        specifications: asset.specifications || [],
        isSelected: false,
        onSelect: (id: string, checked: boolean) => {
          setSelectedAssets(prev => {
            const newSet = new Set(prev);
            if (checked) {
              newSet.add(id);
            } else {
              newSet.delete(id);
            }
            return newSet;
          });
        },
      }));
      setAssets(transformedAssets);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [activeCompany?.id]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(new Set(assets.map(asset => asset.id)));
    } else {
      setSelectedAssets(new Set());
    }
  };

  const handleGenerateTags = () => {
    if (selectedAssets.size === 0) {
      toast.error('Please select at least one asset');
      return;
    }
    setIsTagModalOpen(true);
  };

  const handlePrint = async () => {
    const element = document.getElementById('tags-grid');
    if (!element) {
      toast.error('Failed to generate PDF: tags not found');
      return;
    }

    try {
      // Create a clean copy of the tags without background colors for PDF
      const cleanElement = element.cloneNode(true) as HTMLElement;

      // Remove all background colors and decorative elements
      const allElements = cleanElement.querySelectorAll('*');
      allElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        // Remove background colors
        htmlEl.style.backgroundColor = 'transparent';
        htmlEl.style.background = 'transparent';
        // Remove box shadows
        htmlEl.style.boxShadow = 'none';
        // Remove decorative elements
        if (
          htmlEl.classList.contains('print:hidden') ||
          (htmlEl.classList.contains('absolute') &&
            htmlEl.classList.contains('bg-red-500/5'))
        ) {
          htmlEl.style.display = 'none';
        }
      });

      // Set white background on the main container
      cleanElement.style.backgroundColor = '#ffffff';
      cleanElement.style.padding = '20px';

      // Temporarily replace the element for capture
      const parent = element.parentElement;
      const nextSibling = element.nextSibling;
      parent?.insertBefore(cleanElement, nextSibling);
      element.style.display = 'none';

      const canvas = await html2canvas(cleanElement, {
        useCORS: true,
        allowTaint: true,
      });

      // Restore original element
      parent?.removeChild(cleanElement);
      element.style.display = '';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 190; // A4 width minus margins
      const pageHeight = 277; // A4 height minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 10; // Start with top margin

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('asset-tags.pdf');
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAssetForView(asset);
    setIsAssetViewModalOpen(true);
  };

  const handleRowClick = (row: any) => {
    const assetId = row.original.id;
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const selectedAssetsData = assets.filter(asset =>
    selectedAssets.has(asset.id)
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={Tag}
          title="Assets Tagging"
          description="Generate and print QR code tags for assets"
        >
          {showScopeTabs && (
            <Tabs value={scope} onValueChange={v => setScope(v as 'it' | 'admin')} className="w-full sm:w-auto">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 max-w-full sm:max-w-[280px]'}>
                <TabsTrigger value="it" className={segmentTabsTriggerClassName}>IT Asset</TabsTrigger>
                <TabsTrigger value="admin" className={segmentTabsTriggerClassName}>Admin Asset</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button
              variant="header"
              size="sm"
              onClick={() => handleSelectAll(true)}
              disabled={
                !hasPermission('Asset Tagging', 'create') ||
                !hasPermission('Asset Tagging', 'edit')
              }
            >
              Select All
            </Button>
            <Button
              variant="header"
              size="sm"
              onClick={() => handleSelectAll(false)}
              disabled={
                !hasPermission('Asset Tagging', 'create') ||
                !hasPermission('Asset Tagging', 'edit')
              }
            >
              Deselect All
            </Button>
            <Button
              variant="header"
              size="sm"
              onClick={handleGenerateTags}
              disabled={
                selectedAssets.size === 0 ||
                !hasPermission('Asset Tagging', 'create') ||
                !hasPermission('Asset Tagging', 'edit')
              }
            >
              <QrCode className="mr-2 h-4 w-4" />
              Generate Tags ({selectedAssets.size})
            </Button>
          </div>
        </PageHeader>

        <DataTable
          tableId="asset-tagging"
          data={
            displayLoading
              ? []
              : assets.map(asset => ({
                  ...asset,
                  isSelected: selectedAssets.has(asset.id),
                  onSelect: (id: string, checked: boolean) => {
                    setSelectedAssets(prev => {
                      const newSet = new Set(prev);
                      if (checked) {
                        newSet.add(id);
                      } else {
                        newSet.delete(id);
                      }
                      return newSet;
                    });
                  },
                }))
          }
          columns={taggingColumns}
          searchPlaceholder="Search assets..."
          title="Asset List"
          titleBadge={`${assets.length} assets`}
          onRowClick={handleRowClick}
          isLoading={displayLoading}
          mobileCardFields={[
            {
              key: 'asset-code',
              label: 'Asset Code',
              render: row => row.id,
            },
            {
              key: 'asset-name',
              label: 'Asset Name',
              render: row => row.name,
            },
            {
              key: 'status',
              label: 'Status',
              render: row => row.status,
            },
            {
              key: 'type',
              label: 'Type',
              render: row => row.type || 'N/A',
            },
            {
              key: 'location',
              label: 'Location',
              render: row => row.currentAssignment?.location || 'N/A',
            },
          ]}
          getRowClassName={row =>
            selectedAssets.has(row.original.id)
              ? 'border-red-500 bg-red-50 ring-1 ring-red-200 hover:bg-red-50'
              : undefined
          }
        />

        <AssetTagModal
          isOpen={isTagModalOpen}
          onOpenChange={setIsTagModalOpen}
          selectedAssetsData={selectedAssetsData}
          activeCompany={activeCompany}
          onPrint={handlePrint}
        />

        <AssetViewModal
          isOpen={isAssetViewModalOpen}
          onClose={() => setIsAssetViewModalOpen(false)}
          asset={selectedAssetForView}
        />
      </main>
    </div>
  );
}
