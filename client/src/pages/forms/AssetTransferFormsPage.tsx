'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  TransferFormCard,
  TransferFormDetail,
  buildTransferDataForPDFFromBatch,
  type AssetTransferFormBatch,
} from '@/pages/profile/profileComponents/tabs/documentsTab';
import { generateAssetTransferPDF, downloadPDF } from '@/lib/pdfGenerator';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Shimmer } from '@/components/ui/shimmer';
import { Download } from 'lucide-react';
import { matchesFormListSearchWithFilters } from '@/utils/formListSearch';
import { TRANSFER_FILTER_OPTIONS } from '@/utils/formSearchFilterOptions';
import { SearchWithMultiFilter } from '@/components/common/SearchWithMultiFilter';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  collectCompanyOptionsFromTransferBatches,
  collectDepartmentOptionsFromTransferBatches,
  transferBatchMatchesOrgFilters,
  transferBatchMatchesAssetType,
} from '@/utils/formBatchOrgFilters';
import { getRoleAssetTypeScope } from '@/utils/roleAssetTypeScope';

type AssetTypeFilter = 'all' | 'it' | 'admin';

const PAGE_SIZE = 6;

export default function AssetTransferFormsPage() {
  const { user: currentUser } = useCurrentUser();
  const [batches, setBatches] = useState<AssetTransferFormBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<string[]>(['all']);
  const [companyFilterId, setCompanyFilterId] = useState('');
  const [departmentFilterId, setDepartmentFilterId] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>('all');
  const { roleScope: userRoleScope, isRoleScoped: isAssetTypeRoleScoped } =
    getRoleAssetTypeScope(currentUser?.role?.asset_type);
  const effectiveAssetTypeFilter: AssetTypeFilter = isAssetTypeRoleScoped
    ? userRoleScope
    : assetTypeFilter;
  
  // Auto-set company filter to user's company if they have one
  const userCompanyScope = currentUser?.company_id || '';
  const userRoleName = currentUser?.role?.name?.toLowerCase() || '';
  const isSuperAdminOrAdmin = userRoleName === 'global admin' || userRoleName === 'admin';
  const hasHrAccountabilityReceiver = currentUser?.role?.hr_accountability_receiver === true;
  const showCompanyFilter = !userCompanyScope || isSuperAdminOrAdmin || hasHrAccountabilityReceiver;
  
  useEffect(() => {
    if (userCompanyScope && !isSuperAdminOrAdmin && !hasHrAccountabilityReceiver && companyFilterId !== userCompanyScope) {
      setCompanyFilterId(userCompanyScope);
    }
  }, [userCompanyScope, isSuperAdminOrAdmin, hasHrAccountabilityReceiver]);
  const [selectedBatch, setSelectedBatch] =
    useState<AssetTransferFormBatch | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const displayLoading = loading;

  const fetchTransferForms = async () => {
    try {
      setLoading(true);
      const response = await api.get<{
        assetTransferForms?: AssetTransferFormBatch[];
        data?: { assetTransferForms?: AssetTransferFormBatch[] };
      }>('/asset-transfers/forms');
      const list: AssetTransferFormBatch[] =
        response.assetTransferForms ?? response.data?.assetTransferForms ?? [];
      setBatches(
        (Array.isArray(list) ? list : []).sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch (error) {
      console.error('Failed to fetch asset transfer forms:', error);
      toast.error('Failed to load asset transfer forms');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransferForms();
  }, []);

  useEffect(() => {
    setDepartmentFilterId('');
  }, [companyFilterId]);

  const companyOptions = useMemo(
    () => collectCompanyOptionsFromTransferBatches(batches),
    [batches]
  );
  const departmentOptions = useMemo(
    () =>
      collectDepartmentOptionsFromTransferBatches(batches, companyFilterId),
    [batches, companyFilterId]
  );

  const orgFilteredBatches = useMemo(
    () => {
      let result = batches.filter(b =>
        transferBatchMatchesOrgFilters(b, companyFilterId, departmentFilterId)
      );

      // Apply asset type filter
      if (effectiveAssetTypeFilter !== 'all') {
        const targetScope = effectiveAssetTypeFilter === 'it' ? 'IT' : 'Admin';
        result = result.filter(batch =>
          transferBatchMatchesAssetType(batch, targetScope)
        );
      }

      return result;
    },
    [batches, companyFilterId, departmentFilterId, effectiveAssetTypeFilter]
  );

  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return orgFilteredBatches;
    return orgFilteredBatches.filter(b =>
      matchesFormListSearchWithFilters(b, searchQuery, searchFilters)
    );
  }, [orgFilteredBatches, searchQuery, searchFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchFilters, companyFilterId, departmentFilterId, effectiveAssetTypeFilter]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(filteredBatches.length / PAGE_SIZE)),
    [filteredBatches]
  );

  useEffect(() => {
    setCurrentPage(p => Math.min(p, pageCount));
  }, [pageCount]);

  const hasActiveOrgFilters = Boolean(companyFilterId || departmentFilterId);

  const handleDownloadCurrent = async () => {
    if (!selectedBatch) return;
    try {
      const data = buildTransferDataForPDFFromBatch(selectedBatch);
      if (!data) {
        toast.error('Cannot generate PDF for this form');
        return;
      }
      const blob = await generateAssetTransferPDF(data);
      const fileName = selectedBatch.form_number
        ? `Asset_Transfer_Form_${selectedBatch.form_number}_${Date.now()}.pdf`
        : `Asset_Transfer_Form_${Date.now()}.pdf`;
      downloadPDF(blob, fileName);
      toast.success('Transfer form downloaded successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to download PDF');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={ArrowRightLeft}
          title="Asset Transfer Forms"
          description="View and manage all asset transfer forms"
          loading={displayLoading}
        >
        </PageHeader>

        <div>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
              <div className="relative flex-1 min-w-0">
                <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Search
                </Label>
                <SearchWithMultiFilter
                  value={searchQuery}
                  onChange={setSearchQuery}
                  selectedFilters={searchFilters}
                  onSelectedFiltersChange={setSearchFilters}
                  filterOptions={TRANSFER_FILTER_OPTIONS}
                  placeholder="Search form number, assets, users, department, recipient..."
                  className="max-w-md"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end flex-wrap">
                {showCompanyFilter && (
                  <div className="space-y-1.5 w-full sm:w-[220px]">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Company
                    </Label>
                  <Select
                    value={companyFilterId || 'all'}
                    onValueChange={v =>
                      setCompanyFilterId(v === 'all' ? '' : v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {companyOptions.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  )}
                <div className="space-y-1.5 w-full sm:w-[220px]">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Department
                  </Label>
                  <Select
                    value={departmentFilterId || 'all'}
                    onValueChange={v =>
                      setDepartmentFilterId(v === 'all' ? '' : v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departmentOptions.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {!isAssetTypeRoleScoped && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssetTypeFilter('all')}
                className={
                  effectiveAssetTypeFilter === 'all'
                    ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                    : ''
                }
              >
                All Assets
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssetTypeFilter('it')}
                className={
                  effectiveAssetTypeFilter === 'it'
                    ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                    : ''
                }
              >
                IT Assets
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssetTypeFilter('admin')}
                className={
                  effectiveAssetTypeFilter === 'admin'
                    ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                    : ''
                }
              >
                Admin Assets
              </Button>
            </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">
              {filteredBatches.length} form(s)
            </span>
          </div>

          {displayLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <Shimmer className="h-5 w-48 rounded bg-purple-100/80" />
                  <Shimmer className="h-4 w-20 rounded" />
                  <Shimmer className="h-4 w-32 rounded" />
                  <Shimmer className="h-4 w-28 rounded" />
                  <div className="flex gap-2 pt-2">
                    <Shimmer className="h-9 flex-1 rounded-lg" />
                    <Shimmer className="h-9 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-12 rounded-lg">
              <ArrowRightLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              {searchQuery ? (
                <>
                  <p className="text-gray-500 text-lg">
                    No transfer forms found
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    No forms match &quot;{searchQuery}&quot;.
                  </p>
                </>
              ) : hasActiveOrgFilters ? (
                <>
                  <p className="text-gray-500 text-lg">No forms match filters</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Try clearing company or department filters.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg">
                    No asset transfer forms
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Transfer forms will appear here when available.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBatches
                  .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                  .map(batch => (
                    <TransferFormCard
                      key={
                        batch.formID ??
                        batch.return_batch_id ??
                        batch.returns[0]?.return_id ??
                        ''
                      }
                      batch={batch}
                      onView={() => {
                        setSelectedBatch(batch);
                        setShowDetail(true);
                      }}
                      onDownload={async () => {
                        try {
                          const data = buildTransferDataForPDFFromBatch(batch);
                          if (!data) return;
                          const blob = await generateAssetTransferPDF(data);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `transfer-form-${batch.form_number ?? 'export'}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success('Download started');
                        } catch (e) {
                          toast.error('Failed to download PDF');
                        }
                      }}
                      viewOnly
                    />
                  ))}
              </div>
              {filteredBatches.length > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-4 pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(p => Math.max(1, p - 1))
                    }
                    disabled={currentPage <= 1}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {Math.min(currentPage, pageCount)} of {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(p => Math.min(pageCount, p + 1))
                    }
                    disabled={currentPage >= pageCount}
                    className="gap-1.5"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {showDetail && selectedBatch && (
          <Dialog open={showDetail} onOpenChange={setShowDetail}>
            <AppDialogFrame className="max-w-3xl h-[min(90dvh,920px)] max-h-[calc(100dvh-1rem)] min-h-0 overflow-hidden !flex !flex-col">
              <AppDialogGradientHeader
                title={`${
                  selectedBatch.returns[0]?.assignment?.user
                    ? `${selectedBatch.returns[0].assignment.user.first_name || ''} ${selectedBatch.returns[0].assignment.user.last_name || ''}`.trim() ||
                      'Transfer'
                    : 'Transfer'
                } - ${
                  selectedBatch.form_number ??
                  `Transfer of ${selectedBatch.returns.length} assets`
                }`}
                description="Asset Transfer Form Preview"
              />
              <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-white px-4 sm:px-6">
                <TransferFormDetail
                  key={
                    selectedBatch.formID ??
                    selectedBatch.return_batch_id ??
                    selectedBatch.returns[0]?.return_id ??
                    'transfer-form'
                  }
                  transferFormBatch={selectedBatch}
                  onClose={() => {
                    setShowDetail(false);
                    setSelectedBatch(null);
                  }}
                  onDownload={handleDownloadCurrent}
                  contentOnly
                />
              </div>
              <AppDialogChromeFooter className="flex-shrink-0 flex-row justify-end gap-3 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetail(false);
                    setSelectedBatch(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownloadCurrent}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </AppDialogChromeFooter>
            </AppDialogFrame>
          </Dialog>
        )}
      </main>
    </div>
  );
}
