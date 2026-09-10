'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Package, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchWithColumnFilter } from '@/components/common/SearchWithColumnFilter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shimmer } from '@/components/ui/shimmer';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface DeactivationHistoryRow {
  id: string;
  formNumber: string;
  assetsLabel: string;
  assetCount: number;
  status: string;
  date: string;
}

function statusBadge(status: string) {
  if (status === 'Approved') return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800';
  if (status === 'Declined') return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800';
  if (status === 'PendingHrApproval') return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800';
  return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800';
}

function statusLabel(s: string) {
  if (s === 'PendingHrApproval') return 'Pending HR Approval';
  return s;
}

const INTANGIBLE_SELECT_COLUMNS = [
  { label: 'All Columns', value: 'all' },
  { label: 'Name', value: 'name' },
  { label: 'Type', value: 'type' },
  { label: 'Description', value: 'description' },
];

const HISTORY_SEARCH_COLUMNS = [
  { label: 'All Columns', value: 'all' },
  { label: 'Form Number', value: 'formNumber' },
  { label: 'Assets', value: 'assetsLabel' },
  { label: 'Status', value: 'status' },
  { label: 'Date', value: 'date' },
];

export default function IntangibleDeactivationRequest() {
  const { user: currentUser } = useCurrentUser();
  const [intangibles, setIntangibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
  const [showOtp, setShowOtp] = useState(false);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);
  const [myForms, setMyForms] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [intangRes, formsRes] = await Promise.all([
        api.get('/intangible-assets').catch(() => [] as any),
        api.get('/intangible-deactivations/my').catch(() => ({ forms: [] } as any)),
      ]);
      const list: any[] = Array.isArray(intangRes) ? intangRes : (intangRes as any)?.data ?? intangRes ?? [];
      // filter to only those assigned to current user and active
      const filtered = (Array.isArray(list) ? list : []).filter((ia: any) => {
        if (!ia) return false;
        const assignees: any[] = ia.assignees ?? ia.assignee ?? [];
        // some APIs return assignees as array of {userId}
        const isAssigned = assignees.some((a: any) => String(a.userId ?? a.id ?? a.user_id) === String(currentUser?.id));
        // fallback: if no assignee filter, show all available assigned? Use status
        if (assignees.length === 0) return ia.status === 'assigned';
        return isAssigned;
      });
      // if filtering yields 0 but user has assignment, fallback to show those where status assigned and type matches
      const finalList = filtered.length > 0 ? filtered : (Array.isArray(list) ? list : []).filter((ia: any) => {
        if (!currentUser?.id) return false;
        const assignees: any[] = ia.assignees ?? [];
        return assignees.some((a: any) => String(a.userId ?? a.id) === String(currentUser.id));
      });
      setIntangibles(finalList);
      setMyForms((formsRes as any)?.forms ?? []);
    } catch (e) { console.error(e); toast.error('Failed to load intangibles'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser]);

  const filteredIntangibles = useMemo(() => {
    if (!search.trim()) return intangibles;
    const q = search.toLowerCase();
    return intangibles.filter((ia: any) => {
      if (searchColumn === 'all') {
        return (ia.name ?? '').toLowerCase().includes(q)
          || (ia.type ?? '').toLowerCase().includes(q)
          || (ia.description ?? '').toLowerCase().includes(q);
      }
      return String(ia[searchColumn] ?? '').toLowerCase().includes(q);
    });
  }, [intangibles, search, searchColumn]);

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const allSelected = filteredIntangibles.length > 0 && filteredIntangibles.every((ia: any) => selectedIds.includes(String(ia.id)));

  const toggleSelectAllVisible = () => {
    const allVisibleIds = filteredIntangibles.map((ia: any) => String(ia.id));
    if (allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id))) {
      setSelectedIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...allVisibleIds])]);
    }
  };

  const submitDeactivation = async () => {
    setSubmitting(true);
    try {
      await api.post('/intangible-deactivations', {
        intangibleAssetIds: selectedIds,
        digitalSignature: currentUser!.digitalSignature,
        remarks: remarks || undefined,
      });
      toast.success(`Deactivation request submitted for ${selectedIds.length} asset(s)`);
      setSelectedIds([]);
      setRemarks('');
      await fetchData();
    } catch (e: any) {
      toast.error(e?.data?.error || e?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
      setShowOtp(false);
    }
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0) { toast.error('Select at least one intangible asset'); return; }
    if (!currentUser?.digitalSignature) { toast.error('Digital signature not set in profile'); return; }

    pendingActionRef.current = submitDeactivation;
    setShowOtp(true);
  };

  const historyRows = useMemo<DeactivationHistoryRow[]>(() => {
    return (myForms ?? []).map((f: any) => {
      const assets: any[] = f.assets ?? [];
      return {
        id: String(f.id ?? f.formNumber),
        formNumber: f.formNumber ?? 'N/A',
        assetsLabel: assets.length > 0 ? assets.map((a: any) => a.name).join(', ') : '—',
        assetCount: assets.length,
        status: f.status ?? 'Pending',
        date: f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A',
      };
    });
  }, [myForms]);

  const historyColumns = useMemo<ColumnDef<DeactivationHistoryRow>[]>(() => [
    {
      accessorKey: 'formNumber',
      header: 'Form Number',
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.formNumber}</span>,
    },
    {
      accessorKey: 'assetsLabel',
      header: 'Assets',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{row.original.assetCount} asset(s)</div>
          <div className="truncate max-w-[320px] text-sm">{row.original.assetsLabel}</div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="outline" className={cn('text-xs', statusBadge(row.original.status))}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.date}</span>,
    },
  ], []);

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={Package}
          title="Intangible Deactivation"
          description="Request deactivation of your assigned intangible assets"
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Selection panel */}
          <div className="xl:col-span-2">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Package className="h-5 w-5 text-red-600" />
                  </div>
                  Select Intangibles to Deactivate
                  <Badge variant="secondary" className="ml-auto">
                    {filteredIntangibles.length} assigned
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Select the intangible assets you want to deactivate. Your request will be routed to your approver and then to HR.
                </p>

                <SearchWithColumnFilter
                  value={search}
                  onChange={setSearch}
                  placeholder="Search intangibles..."
                  columnOptions={INTANGIBLE_SELECT_COLUMNS}
                  searchColumn={searchColumn}
                  onSearchColumnChange={setSearchColumn}
                  className="mt-4"
                />
                {filteredIntangibles.length > 0 && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAllVisible}
                      className="text-red-600 border-red-300 hover:bg-red-50 whitespace-nowrap"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 -mr-6 pr-6">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-xl"
                        >
                          <Shimmer className="h-10 w-10 rounded flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Shimmer className="h-4 w-48 rounded" />
                            <Shimmer className="h-3 w-36 rounded" />
                            <Shimmer className="h-3 w-28 rounded" />
                          </div>
                          <Shimmer className="h-6 w-6 rounded flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : filteredIntangibles.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4">
                        <Package className="h-10 w-10 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No intangible assets found
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Try adjusting your search criteria
                      </p>
                    </div>
                  ) : (
                    filteredIntangibles.map((ia: any) => {
                      const id = String(ia.id);
                      const isSelected = selectedIds.includes(id);
                      return (
                        <div
                          key={id}
                          className={cn(
                            'group relative p-4 border-2 rounded-xl transition-all duration-200 cursor-pointer',
                            isSelected
                              ? 'border-red-500 bg-red-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          )}
                          onClick={() => toggleSelect(id, !isSelected)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked: boolean | string) => toggleSelect(id, checked === true)}
                                className="pointer-events-none"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="mb-2">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-lg text-gray-900 truncate">
                                    {ia.name}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    {isSelected && (
                                      <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 mb-2">
                                {ia.type && (
                                  <Badge variant="outline" className="text-xs border-gray-300">
                                    {ia.type}
                                  </Badge>
                                )}
                                {ia.status && (
                                  <Badge
                                    variant="default"
                                    className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
                                  >
                                    {ia.status}
                                  </Badge>
                                )}
                                {(() => {
                                  const risk = ia.risk_level;
                                  const riskLabel = typeof risk === 'object' ? risk?.name : risk;
                                  return riskLabel ? (
                                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                                      Risk: {riskLabel}
                                    </Badge>
                                  ) : null;
                                })()}
                              </div>

                              <p className="text-sm text-gray-600 line-clamp-2">
                                {ia.description ?? 'No description'}
                              </p>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="absolute inset-0 bg-green-500/5 rounded-xl pointer-events-none"></div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedIds.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-900">
                          {selectedIds.length} intangible{selectedIds.length !== 1 ? 's' : ''} selected for deactivation
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedIds([])}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Deactivation Details Panel */}
          <div>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <RotateCcw className="h-5 w-5 text-red-600" />
                  </div>
                  Deactivation Details
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-sm text-gray-600">
                  Select intangibles above, then add remarks and submit your deactivation request.
                </div>

                <div className="space-y-1.5">
                  <Label>Remarks (optional)</Label>
                  <Textarea
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Reason for deactivation"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={() => handleSubmit()}
                  disabled={submitting || selectedIds.length === 0}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Request Deactivation ({selectedIds.length})
                    </div>
                  )}
                </Button>

                {selectedIds.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">
                    Select intangible assets above to enable request
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Deactivation History Table */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-red-100 rounded-lg">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                Deactivation History
                <Badge variant="secondary" className="ml-auto">
                  {historyRows.length} requests
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 space-y-2">
                  <div className="flex gap-4">
                    <Shimmer className="h-5 w-32 rounded" />
                    <Shimmer className="h-5 w-24 rounded" />
                    <Shimmer className="h-5 w-24 rounded" />
                    <Shimmer className="h-5 w-28 rounded" />
                  </div>
                </div>
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="border-t border-gray-200 p-3 space-y-2">
                    <div className="flex gap-4">
                      <Shimmer className="h-5 w-32 rounded" />
                      <Shimmer className="h-5 w-24 rounded" />
                      <Shimmer className="h-5 w-24 rounded" />
                      <Shimmer className="h-5 w-28 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : historyRows.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4">
                  <FileText className="h-10 w-10 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No deactivation history found
                </h3>
                <p className="text-gray-500 text-sm">
                  Submitted requests will appear here
                </p>
              </div>
            ) : (
              <DataTable<DeactivationHistoryRow>
                tableId="intangible-deactivation-history"
                data={historyRows}
                columns={historyColumns}
                searchPlaceholder="Search deactivation history..."
                searchColumnOptions={HISTORY_SEARCH_COLUMNS}
                emptyState={
                  <div className="text-center py-8">
                    <p className="text-gray-500">No matching requests</p>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>
      </main>
      <SmsOtpDialog
        isOpen={showOtp}
        onOpenChange={setShowOtp}
        onVerified={() => undefined}
        onCancel={() => {
          pendingActionRef.current = null;
          setShowOtp(false);
        }}
        pendingActionRef={pendingActionRef}
        title="Verify to submit"
        description="Enter OTP to confirm deactivation request"
      />
    </div>
  );
}
