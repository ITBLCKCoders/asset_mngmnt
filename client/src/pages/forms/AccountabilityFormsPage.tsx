'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  segmentTabsListClassName,
  segmentTabsTriggerClassName,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { Search, FileCheck, ClipboardList } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
} from '@/components/common/appDialogChrome';
import {
  AccountabilityFormCard,
  AccountabilityFormDetail,
  AccountabilityForm,
} from '@/pages/assets/accountability/accountabilityForm';
import { Shimmer } from '@/components/ui/shimmer';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { matchesFormListSearch } from '@/utils/formListSearch';
import { cn } from '@/lib/utils';
import { classifyDepartmentScopeByName } from '@/lib/assetScope';

type StatusFilter = 'all' | 'active' | 'disabled';
type AssetTypeFilter = 'all' | 'it' | 'admin';

export default function AccountabilityFormsPage() {
  const { hasPermission } = useUserPermissions();
  const { user: currentUser } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [forms, setForms] = useState<AccountabilityForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'hrCopy'>('all');
  const hasHrCopyAccess =
    currentUser?.role?.hr_accountability_receiver === true ||
    currentUser?.hr_accountability_receiver === true;
  const canUploadWetPdf =
    hasPermission('Accountability Form', 'create') &&
    hasPermission('Accountability Form', 'edit') &&
    hasPermission('Accountability Form', 'delete');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilterId, setCompanyFilterId] = useState('');
  const [departmentFilterId, setDepartmentFilterId] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>('all');
  
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
  
  // Get user's role asset type for scoping
  const userRoleAssetType = currentUser?.role?.asset_type || 'none';
  const [selectedForm, setSelectedForm] = useState<AccountabilityForm | null>(
    null
  );
  const [showFormDetail, setShowFormDetail] = useState(false);
  /** Tab user was on when opening the view dialog (controls HR-only actions). */
  const [viewDetailContext, setViewDetailContext] = useState<'all' | 'hrCopy'>(
    'all'
  );
  const displayLoading = loading;

  const fetchForms = async (): Promise<AccountabilityForm[]> => {
    try {
      setLoading(true);
      const data = await api.get('/accountability-forms');
      const list = data.forms || [];
      setForms(list);
      return list;
    } catch (error) {
      console.error('Failed to fetch forms:', error);
      toast.error('Failed to load accountability forms');
      setForms([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  useEffect(() => {
    if (searchParams.get('tab') === 'hrCopy' && hasHrCopyAccess) {
      setActiveTab('hrCopy');
    }
  }, [searchParams, hasHrCopyAccess]);


  useEffect(() => {
    setDepartmentFilterId('');
  }, [companyFilterId]);


  const hrCopyForms = useMemo(
    () =>
      forms.filter((f: AccountabilityForm) => {
        return f.status === 'Signed' && !f.receivedCopy201FileSignedAt;
      }),
    [forms]
  );

  const activeFormsCount = useMemo(
    () =>
      forms.filter((f: AccountabilityForm) => {
        return f.status !== 'Disabled' && f.status !== 'Declined';
      }).length,
    [forms]
  );

  const receivedFormsCount = useMemo(
    () =>
      forms.filter((f: AccountabilityForm) => {
        return f.receivedCopy201FileSignedAt !== null;
      }).length,
    [forms]
  );

  const filterBySearch = (list: AccountabilityForm[]) => {
    if (!searchQuery.trim()) return list;
    return list.filter((f: AccountabilityForm) =>
      matchesFormListSearch(f, searchQuery)
    );
  };

  const departmentIdForFilter = (f: AccountabilityForm) =>
    f.user?.department?.id || f.department?.id || '';

  const filterByCompanyAndDepartment = (list: AccountabilityForm[]) => {
    return list.filter((f: AccountabilityForm) => {
      if (companyFilterId && f.user?.company?.id !== companyFilterId) {
        return false;
      }
      if (
        departmentFilterId &&
        departmentIdForFilter(f) !== departmentFilterId
      ) {
        return false;
      }
      return true;
    });
  };
  
  const filterByAssetType = (list: AccountabilityForm[]) => {
    if (assetTypeFilter === 'all') return list;
    
    const targetScope = assetTypeFilter === 'it' ? 'IT' : 'Admin';
    
    return list.filter((f: AccountabilityForm) => {
      // Check if any asset in the form matches the selected asset type
      return f.assets.some(asset => {
        const deptCandidate =
          asset.categoryDepartment ||
          f.department?.name ||
          f.user?.department?.name ||
          asset.category ||
          '';
        const assetScope = classifyDepartmentScopeByName(deptCandidate);
        return assetScope === targetScope;
      });
    });
  };

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of forms) {
      const c = f.user?.company;
      if (c?.id && c.name) {
        map.set(c.id, c.name);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [forms]);

  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    const pool = companyFilterId
      ? forms.filter(f => f.user?.company?.id === companyFilterId)
      : forms;
    for (const f of pool) {
      const ud = f.user?.department;
      const fd = f.department;
      if (ud?.id && ud.name) {
        map.set(ud.id, ud.name);
      } else if (fd?.id && fd.name) {
        map.set(fd.id, fd.name);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [forms, companyFilterId]);

  const applyStatusFilter = (list: AccountabilityForm[]) => {
    if (statusFilter === 'all') return list;
    if (statusFilter === 'active')
      return list.filter(
        (f: AccountabilityForm) =>
          f.status !== 'Disabled' && f.status !== 'Declined'
      );
    if (statusFilter === 'disabled')
      return list.filter(
        (f: AccountabilityForm) =>
          f.status === 'Disabled' || f.status === 'Declined'
      );
    return list;
  };

  const filteredAll = useMemo(
    () =>
      applyStatusFilter(
        filterBySearch(
          filterByAssetType(filterByCompanyAndDepartment(forms))
        )
      ),
    [forms, searchQuery, statusFilter, companyFilterId, departmentFilterId, assetTypeFilter]
  );
  const filteredHrCopy = useMemo(
    () =>
      applyStatusFilter(
        filterBySearch(filterByAssetType(filterByCompanyAndDepartment(hrCopyForms)))
      ),
    [hrCopyForms, searchQuery, statusFilter, companyFilterId, departmentFilterId, assetTypeFilter]
  );

  const hasActiveOrgFilters = Boolean(companyFilterId || departmentFilterId);

  const handleSignForm = async (formId: string) => {
    try {
      await api.post(`/accountability-forms/${formId}/sign`, {});
      await fetchForms();
      toast.success('Form signed successfully');
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Failed to sign form:', error);
      toast.error(err?.message || 'Failed to sign form');
    }
  };

  const handleMainTabChange = (value: string) => {
    const next = value as 'all' | 'hrCopy';
    setActiveTab(next);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (next === 'hrCopy') p.set('tab', 'hrCopy');
      else p.delete('tab');
      return p;
    });
  };

  const handleViewForm = (form: AccountabilityForm) => {
    setViewDetailContext(activeTab === 'hrCopy' ? 'hrCopy' : 'all');
    setSelectedForm(form);
    setShowFormDetail(true);
  };

  const handleReceiveCopy = (form: AccountabilityForm) => {
    setViewDetailContext('hrCopy');
    setSelectedForm(form);
    setShowFormDetail(true);
  };

  const renderFormList = (
    formList: AccountabilityForm[],
    isHrList: boolean
  ) => {
    if (displayLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shimmer className="w-6 h-6 rounded bg-red-100/80" />
                <Shimmer className="h-5 w-32 rounded bg-red-100/80" />
                <Shimmer className="h-6 w-16 rounded-full ml-auto bg-red-100/80" />
              </div>
              <Shimmer className="h-4 w-full rounded" />
              <Shimmer className="h-4 w-3/4 rounded" />
              <div className="flex gap-2 pt-2">
                <Shimmer className="h-9 flex-1 rounded-lg" />
                <Shimmer className="h-9 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (formList.length === 0) {
      return (
        <div className="text-center py-12">
          <FileCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          {searchQuery ? (
            <>
              <p className="text-gray-500 text-lg">No forms found</p>
              <p className="text-gray-400 text-sm mt-1">
                No forms match &quot;{searchQuery}&quot;. Try different keywords
                (form number, employee, asset, department, etc.).
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
              <p className="text-gray-500 text-lg">No accountability forms</p>
              <p className="text-gray-400 text-sm mt-1">
                {activeTab === 'hrCopy'
                  ? 'No forms pending wet-signed PDF for the 201 file copy'
                  : 'Forms will appear here when available.'}
              </p>
            </>
          )}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {formList.map((form: AccountabilityForm) => (
          <AccountabilityFormCard
            key={form.id}
            form={form}
            onView={handleViewForm}
            showSignButton={false}
            lazyLoadDetails
            statusPillVariant={isHrList ? 'toReceive' : 'activeDisabled'}
            showReceiveButton={isHrList && hasHrCopyAccess}
            onReceive={handleReceiveCopy}
            showDownloadButton={!isHrList}
            showPendingReceiverSignatureBadge
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={FileCheck}
          title="Accountability Forms"
          description="View and manage all asset accountability forms"
          loading={displayLoading}
        >
        </PageHeader>

        <div>
          {hasHrCopyAccess ? (
            <Tabs
              value={activeTab}
              onValueChange={handleMainTabChange}
              className="w-full"
            >
              <TabsList
                className={`grid w-full grid-cols-2 mb-6 ${segmentTabsListClassName}`}
              >
                <TabsTrigger
                  value="all"
                  className={cn(
                    segmentTabsTriggerClassName,
                    'flex h-12 items-center justify-center gap-0 sm:h-11'
                  )}
                >
                  <ClipboardList className="mr-2 h-4 w-4 shrink-0" />
                  <span>All forms</span>
                  <span className="tab-count ml-2 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-slate-300/90 px-1.5 text-xs font-bold text-slate-800">
                    {activeFormsCount}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="hrCopy"
                  className={cn(
                    segmentTabsTriggerClassName,
                    'flex h-12 items-center justify-center gap-0 sm:h-11'
                  )}
                >
                  <FileCheck className="mr-2 h-4 w-4 shrink-0" />
                  <span>HR copy — 201 file</span>
                  <span className="tab-count ml-2 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-slate-300/90 px-1.5 text-xs font-bold text-slate-800">
                    {hrCopyForms.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                  <div className="relative flex-1 min-w-0">
                    <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                      Search
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Search form number, employee, assets, department, company..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 max-w-md"
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
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    className={
                      statusFilter === 'all'
                        ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                        : ''
                    }
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                    className={
                      statusFilter === 'active'
                        ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                        : ''
                    }
                  >
                    Active
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter('disabled')}
                    className={
                      statusFilter === 'disabled'
                        ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                        : ''
                    }
                  >
                    Disabled
                  </Button>
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

              <TabsContent value="all" className="mt-0">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">
                    {filteredAll.length} form(s)
                  </span>
                </div>
                {renderFormList(filteredAll, false)}
              </TabsContent>

              <TabsContent value="hrCopy" className="mt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <span className="text-sm text-muted-foreground">
                    {filteredHrCopy.length} form(s) pending wet-signed PDF for
                    201 file
                  </span>
                </div>
                {renderFormList(filteredHrCopy, true)}
              </TabsContent>
            </Tabs>
          ) : (
            <div>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                  <div className="relative flex-1 min-w-0">
                    <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                      Search
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Search form number, employee, assets, department, company..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 max-w-md"
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
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    className={
                      statusFilter === 'all'
                        ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                        : ''
                    }
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                    className={
                      statusFilter === 'active'
                        ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                        : ''
                    }
                  >
                    Active
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter('disabled')}
                    className={
                      statusFilter === 'disabled'
                        ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                        : ''
                    }
                  >
                    Disabled
                  </Button>
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
                  {filteredAll.length} form(s)
                </span>
              </div>
              {renderFormList(filteredAll, false)}
            </div>
          )}
        </div>

        <Dialog
          open={showFormDetail}
          onOpenChange={open => {
            if (!open) {
              setShowFormDetail(false);
              setSelectedForm(null);
            }
          }}
        >
          <AppDialogFrame
            showCloseButton={false}
            className="max-w-3xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !rounded-lg !p-0 !shadow-md"
          >
            <AppDialogGradientHeader
              showCloseButton={false}
              className="!px-4 !pb-4 !pt-4 sm:!px-5 sm:!pb-5 sm:!pt-5"
              title="Accountability form"
              description="View and manage accountability forms"
            />
            <AppDialogBody className="flex min-h-[60vh] flex-1 flex-col overflow-hidden p-0 sm:p-0">
              {selectedForm && (
                <AccountabilityFormDetail
                  form={selectedForm}
                  onClose={() => {
                    setShowFormDetail(false);
                    setSelectedForm(null);
                  }}
                  onSign={handleSignForm}
                  headerInParentChrome
                  viewContext={viewDetailContext}
                  hrViewMode
                  onReceiveCompleted={async () => {
                    await fetchForms();
                  }}
                />
              )}
            </AppDialogBody>
          </AppDialogFrame>
        </Dialog>
      </main>
    </div>
  );
}
