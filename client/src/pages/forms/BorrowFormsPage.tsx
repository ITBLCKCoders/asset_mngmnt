'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/common/PageHeader';
import {
  AppDialogChromeFooter,
  AppDialogFrame,
  AppDialogGradientHeader,
} from '@/components/common/appDialogChrome';
import { Dialog } from '@/components/ui/dialog';
import { Shimmer } from '@/components/ui/shimmer';
import { api } from '@/lib/api';
import { downloadPDF, generateAssetBorrowingPDF } from '@/lib/pdfGenerator';
import {
  BorrowFormCard,
  BorrowFormDetail,
  buildBorrowDataForPDFFromBatch,
  type AssetBorrowFormBatch,
} from '@/pages/profile/profileComponents/tabs/documentsTab';
import { matchesFormListSearch } from '@/utils/formListSearch';
import {
  HandHelping,
  Search,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { classifyDepartmentScopeByName } from '@/lib/assetScope';

type AssetTypeFilter = 'all' | 'it' | 'admin';

type ActiveCompany = {
  id: string;
  name: string;
};

function getBorrowerName(batch: AssetBorrowFormBatch): string {
  const fullName =
    `${batch.requester_first_name || ''} ${batch.requester_last_name || ''}`.trim();
  return fullName || batch.requester_email?.trim() || 'Borrower';
}

export default function BorrowFormsPage() {
  const { user: currentUser } = useCurrentUser();
  const [batches, setBatches] = useState<AssetBorrowFormBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilterId, setCompanyFilterId] = useState('');
  const [departmentFilterId, setDepartmentFilterId] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>('all');
  const [activeCompany, setActiveCompany] = useState<ActiveCompany | null>(null);
  
  // Auto-set company filter to user's company if they have one
  const userCompanyScope = currentUser?.company_id || '';
  const userRoleName = currentUser?.role?.name?.toLowerCase() || '';
  const isSuperAdminOrAdmin = userRoleName === 'super admin' || userRoleName === 'admin';
  const hasHrAccountabilityReceiver = currentUser?.role?.hr_accountability_receiver === true;
  const showCompanyFilter = !userCompanyScope || isSuperAdminOrAdmin || hasHrAccountabilityReceiver;
  
  useEffect(() => {
    if (userCompanyScope && !isSuperAdminOrAdmin && !hasHrAccountabilityReceiver && companyFilterId !== userCompanyScope) {
      setCompanyFilterId(userCompanyScope);
    }
  }, [userCompanyScope, isSuperAdminOrAdmin, hasHrAccountabilityReceiver]);
  const [selectedBatch, setSelectedBatch] =
    useState<AssetBorrowFormBatch | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const displayLoading = loading;

  const fetchBorrowForms = async () => {
    try {
      setLoading(true);
      const [borrowResponse, companyResponse] = await Promise.all([
        api.get<unknown>('/asset-borrow-requests'),
        api.get<{ data?: Array<{ id?: string; name?: string }> }>(
          '/companies/active'
        ),
      ]);

      const payload =
        borrowResponse &&
        typeof borrowResponse === 'object' &&
        'success' in borrowResponse &&
        (borrowResponse as { success?: boolean }).success === true &&
        'data' in borrowResponse
          ? (borrowResponse as { data?: { borrowRequests?: AssetBorrowFormBatch[] } }).data
          : (borrowResponse as { borrowRequests?: AssetBorrowFormBatch[] });
      const list = payload?.borrowRequests ?? [];
      setBatches(Array.isArray(list) ? list : []);

      const company = companyResponse?.data?.[0];
      if (company?.id && company?.name) {
        setActiveCompany({ id: company.id, name: company.name });
      } else {
        setActiveCompany(null);
      }
    } catch (error) {
      console.error('Failed to fetch borrow forms:', error);
      toast.error('Failed to load borrow forms');
      setBatches([]);
      setActiveCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBorrowForms();
  }, []);

  useEffect(() => {
    setDepartmentFilterId('');
  }, [companyFilterId]);

  const companyOptions = useMemo(() => {
    if (!activeCompany) return [];
    return [activeCompany];
  }, [activeCompany]);

  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    const pool =
      companyFilterId && activeCompany && companyFilterId !== activeCompany.id
        ? []
        : batches;

    for (const batch of pool) {
      const departmentName = batch.requester_department_name?.trim();
      if (departmentName) {
        map.set(departmentName, departmentName);
      }
    }

    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCompany, batches, companyFilterId]);

  const orgFilteredBatches = useMemo(() => {
    let result = batches.filter(batch => {
      if (companyFilterId) {
        if (!activeCompany || companyFilterId !== activeCompany.id) {
          return false;
        }
      }

      if (departmentFilterId) {
        const departmentName = batch.requester_department_name?.trim() || '';
        if (departmentName !== departmentFilterId) {
          return false;
        }
      }

      return true;
    });

    // Apply asset type filter
    if (assetTypeFilter !== 'all') {
      const targetScope = assetTypeFilter === 'it' ? 'it' : 'admin';
      result = result.filter(batch => batch.borrow_scope === targetScope);
    }

    return result;
  }, [activeCompany, batches, companyFilterId, departmentFilterId, assetTypeFilter]);

  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return orgFilteredBatches;
    return orgFilteredBatches.filter(batch =>
      matchesFormListSearch(batch, searchQuery)
    );
  }, [orgFilteredBatches, searchQuery]);

  const hasActiveOrgFilters = Boolean(companyFilterId || departmentFilterId);

  const handleDownload = async (batch: AssetBorrowFormBatch) => {
    try {
      const data = buildBorrowDataForPDFFromBatch(batch);
      if (!data) {
        toast.error('Cannot generate PDF for this form');
        return;
      }

      const blob = await generateAssetBorrowingPDF(data);
      const fileName = batch.form_number?.trim()
        ? `Borrow_Form_${batch.form_number}_${Date.now()}.pdf`
        : `Borrow_Form_${Date.now()}.pdf`;
      downloadPDF(blob, fileName);
      toast.success('Borrow form downloaded successfully');
    } catch (error) {
      console.error('Failed to download borrow form PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={HandHelping}
          title="Borrow Forms"
          description="View and manage all borrow forms"
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
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search form number, asset, requester, department, purpose..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end flex-wrap">
                {showCompanyFilter && (
                  <div className="space-y-1.5 w-full sm:w-[220px]">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Company
                    </Label>
                  <Select
                    value={companyFilterId || 'all'}
                    onValueChange={value =>
                      setCompanyFilterId(value === 'all' ? '' : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {companyOptions.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
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
                    onValueChange={value =>
                      setDepartmentFilterId(value === 'all' ? '' : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departmentOptions.map(department => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssetTypeFilter('all')}
                className={
                  assetTypeFilter === 'all'
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
                  assetTypeFilter === 'it'
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
                  assetTypeFilter === 'admin'
                    ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                    : ''
                }
              >
                Admin Assets
              </Button>
            </div>
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
                  <Shimmer className="h-5 w-48 rounded bg-amber-100/80" />
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
              <HandHelping className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              {searchQuery ? (
                <>
                  <p className="text-gray-500 text-lg">No borrow forms found</p>
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
                  <p className="text-gray-500 text-lg">No borrow forms</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Borrow forms will appear here when available.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBatches.map(batch => (
                <BorrowFormCard
                  key={batch.borrow_request_id}
                  batch={batch}
                  onView={() => {
                    setSelectedBatch(batch);
                    setShowDetail(true);
                  }}
                  onDownload={() => void handleDownload(batch)}
                />
              ))}
            </div>
          )}
        </div>

        {showDetail && selectedBatch && (
          <Dialog
            open={showDetail}
            onOpenChange={open => {
              setShowDetail(open);
              if (!open) {
                setSelectedBatch(null);
              }
            }}
          >
            <AppDialogFrame className="max-w-3xl h-[min(90dvh,920px)] max-h-[calc(100dvh-1rem)] min-h-0 overflow-hidden !flex !flex-col">
              <AppDialogGradientHeader
                title={`${getBorrowerName(selectedBatch)} - ${
                  selectedBatch.form_number?.trim() ||
                  `Borrow ${selectedBatch.borrow_request_id.slice(0, 8)}`
                }`}
                description="Borrow Form Preview"
              />
              <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-white px-4 sm:px-6">
                <BorrowFormDetail
                  key={selectedBatch.borrow_request_id}
                  borrowFormBatch={selectedBatch}
                  onClose={() => {
                    setShowDetail(false);
                    setSelectedBatch(null);
                  }}
                  onDownload={() => void handleDownload(selectedBatch)}
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
                  onClick={() => void handleDownload(selectedBatch)}
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
