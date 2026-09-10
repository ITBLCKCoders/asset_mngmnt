'use client';
import { useEffect, useState, useMemo } from 'react';
import { FileText, Package, User, Calendar, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { SearchWithMultiFilter } from '@/components/common/SearchWithMultiFilter';
import { Dialog } from '@/components/ui/dialog';
import { Shimmer } from '@/components/ui/shimmer';
import { AppDialogFrame, AppDialogGradientHeader, AppDialogBody, AppDialogChromeFooter } from '@/components/common/appDialogChrome';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { matchesFormListSearchWithFilters } from '@/utils/formListSearch';
import { PDFViewer } from '@/components/PDFViewer';
import { downloadPDF, generateIntangibleDeactivationPDF } from '@/lib/pdfGenerator';
import { INTANGIBLE_DEACTIVATION_FILTER_OPTIONS } from '@/utils/formSearchFilterOptions';
import { ApprovalTimeline } from '@/components/common/ApprovalTimeline';

const PAGE_SIZE = 6;

function statusBadge(status: string) {
  if (status==='Approved') return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800';
  if (status==='Declined') return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800';
  if (status==='PendingHrApproval') return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800';
  return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800';
}
function statusLabel(s: string) { if (s==='PendingHrApproval') return 'Pending HR Approval'; return s; }

function SignatureTable({ form }: { form: any }) {
  const fmt = (d: string | null) => d ? new Date(d).toLocaleString() : '—';
  return (
    <div className="border rounded-lg overflow-hidden text-sm">
      <div className="grid grid-cols-2 divide-x">
        <div className="p-3 bg-slate-50">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Requested By (User)</div>
          <div className="font-medium mt-1">{form.user?.first_name} {form.user?.last_name}</div>
          <div className="text-xs text-muted-foreground">{fmt(form.requestedAt)}</div>
          <div className="mt-2 font-mono text-xs break-all">{form.requesterSignature ? 'Signature: ' + String(form.requesterSignature).slice(0,40) : '—'}</div>
        </div>
        <div className="p-3 bg-white">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Department Head</div>
          <div className="font-medium mt-1">{form.deptHeadApproverName ?? (form.deptHeadSignedBy ? 'Signed' : 'Pending')}</div>
          <div className="text-xs text-muted-foreground">{fmt(form.deptHeadSignedAt)}</div>
          <div className="mt-2 font-mono text-xs break-all">{form.deptHeadSignature ? String(form.deptHeadSignature).slice(0,40) : 'Pending signature'}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x border-t">
        <div className="p-3 bg-slate-50">
          <div className="text-xs font-semibold text-muted-foreground uppercase">HR (Custodian Copy)</div>
          <div className="font-medium mt-1">{form.hrApproverName ?? (form.hrSignedBy ? 'Signed' : 'Pending')}</div>
          <div className="text-xs text-muted-foreground">{fmt(form.hrSignedAt)}</div>
          <div className="mt-2 font-mono text-xs break-all">{form.hrSignature ? String(form.hrSignature).slice(0,40) : 'Pending signature'}</div>
        </div>
        <div className="p-3 bg-white flex items-center justify-center text-xs text-muted-foreground">HR signature completes deactivation & regenerates accountability form/clearance</div>
      </div>
    </div>
  );
}

function FormCard({ form, onView, onDownload }: { form: any; onView: (f: any)=>void; onDownload: (f: any)=>void }) {
  const employeeName = `${form.user?.first_name ?? ''} ${form.user?.last_name ?? ''}`.trim() || 'Employee';
  const assetNames = (form.assets ?? []).map((a: any) => a.name).filter(Boolean);
  const isDeclined = form.status === 'Declined' || !!form.declineReason;
  const timelineSteps = [
    { title: 'Request created', done: !!form.created_at, date: form.created_at, signerName: employeeName },
    { title: 'Approved by department head', done: !!form.deptHeadSignedAt, date: form.deptHeadSignedAt, signerName: form.deptHeadApproverName },
    { title: 'HR / custodian finalization', done: !!form.hrSignedAt, date: form.hrSignedAt, signerName: form.hrApproverName },
  ];
  return (
    <Card className="h-full shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl shrink-0">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg font-mono truncate">{form.formNumber}</CardTitle>
              <p className="text-sm text-gray-500">
                Created {form.created_at ? new Date(form.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`${statusBadge(form.status)} shrink-0`}>{statusLabel(form.status)}</Badge>
        </div>
      </CardHeader>
      <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
        <TabsList className={`${segmentTabsListClassName} mx-4 mb-2 grid w-[calc(100%-2rem)] grid-cols-2`}>
          <TabsTrigger value="details" className={segmentTabsTriggerClassName}>Details</TabsTrigger>
          <TabsTrigger value="timeline" className={segmentTabsTriggerClassName}>Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-0 flex-1">
      <CardContent className="space-y-4 flex-1 pt-0">
        <div className="flex items-start gap-3">
          <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Assets to deactivate ({form.assets?.length ?? 0})</p>
            <p className="text-xs text-gray-600 mt-1 truncate">
              {assetNames.length > 0 ? assetNames.join(', ') : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Requested by: {employeeName}</p>
            {form.user?.email ? (
              <p className="text-xs text-gray-600 mt-0.5 truncate">{form.user.email}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600">
              {form.created_at ? new Date(form.created_at).toLocaleString() : '—'}
            </p>
          </div>
        </div>
        {form.declineReason && (
          <div className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg p-2">
            Reason: {form.declineReason}
          </div>
        )}
      </CardContent>
        </TabsContent>
        <TabsContent value="timeline" className="mt-0 flex-1">
          <CardContent className="flex-1 pt-0">
            <ApprovalTimeline
              steps={timelineSteps}
              isDeclined={isDeclined}
              declinedAt={form.updated_at}
              declineReason={form.declineReason}
            />
          </CardContent>
        </TabsContent>
      </Tabs>
      <div className="flex gap-2 border-t border-slate-100 p-4">
        <Button size="sm" variant="outline" className="flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600" onClick={() => onView(form)}>
          <Eye className="mr-2 h-4 w-4" />View
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-600 hover:bg-red-600 hover:text-white" onClick={() => onDownload(form)}>
          <Download className="mr-2 h-4 w-4" />Download
        </Button>
      </div>
    </Card>
  );
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'PendingHrApproval', label: 'Pending HR' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Declined', label: 'Declined' },
] as const;

export default function IntangibleDeactivationFormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFilters, setSearchFilters] = useState<string[]>(['all']);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const displayLoading = loading;

  const fetchForms = async () => {
    try { setLoading(true); const data: any = await api.get('/intangible-deactivations'); setForms(data.forms ?? []); }
    catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(()=> { fetchForms(); }, []);

  const buildPdf = async (form: any) => {
    const blob = await generateIntangibleDeactivationPDF({
      formNumber: form.formNumber,
      status: form.status,
      companyName: form.user?.company?.name,
      companyLogoUrl: form.user?.company?.logo_url ?? form.user?.companyLogoUrl,
      requesterPosition: form.user?.position,
      requesterDepartment: form.user?.department?.name ?? form.department?.name,
      requesterEmployeeId: form.user?.employeeNumber,
      createdAt: form.created_at,
      requesterName: `${form.user?.first_name ?? ''} ${form.user?.last_name ?? ''}`.trim() || form.user?.email,
      requesterEmail: form.user?.email,
      requesterSignature: form.requesterSignature,
      departmentHeadName: form.deptHeadApproverName,
      departmentHeadSignedAt: form.deptHeadSignedAt,
      departmentHeadSignature: form.deptHeadSignature,
      hrApproverName: form.hrApproverName,
      hrSignedAt: form.hrSignedAt,
      hrSignature: form.hrSignature,
      declineReason: form.declineReason,
      remarks: form.assets_data ? (() => { try { return JSON.parse(form.assets_data)?.remarks ?? null; } catch { return null; } })() : null,
      assets: form.assets ?? [],
    });
    return blob;
  };

  const handleDownload = async (form: any) => {
    try {
      const blob = await buildPdf(form);
      downloadPDF(blob, `Intangible_Deactivation_Form_${form.formNumber ?? Date.now()}.pdf`);
      toast.success('Download started');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download PDF');
    }
  };

  useEffect(() => {
    if (!selected) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    void buildPdf(selected).then(blob => {
      if (cancelled) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    }).catch(error => {
      console.error(error);
      toast.error('Failed to load PDF preview');
    }).finally(() => {
      if (!cancelled) setPreviewLoading(false);
    });
    return () => { cancelled = true; };
  }, [selected]);

  const filtered = useMemo(()=> {
    let list = forms;
    if (statusFilter!=='all') list = list.filter((f:any)=> f.status===statusFilter);
    if (search.trim()) {
      list = list.filter((f:any)=> matchesFormListSearchWithFilters(f, search, searchFilters));
    }
    return list;
  }, [forms, search, searchFilters, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, searchFilters, statusFilter]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered]
  );

  useEffect(() => {
    setCurrentPage(p => Math.min(p, pageCount));
  }, [pageCount]);

  const hasActiveStatusFilter = statusFilter !== 'all';

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader icon={FileText} title="Intangible Deactivation Forms" description="View all intangible asset deactivation requests" loading={displayLoading} />
        <div>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
              <div className="relative flex-1 min-w-0">
                <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Search
                </Label>
                <SearchWithMultiFilter
                  value={search}
                  onChange={setSearch}
                  selectedFilters={searchFilters}
                  onSelectedFiltersChange={setSearchFilters}
                  filterOptions={INTANGIBLE_DEACTIVATION_FILTER_OPTIONS}
                  placeholder="Search form number, employee, asset..."
                  className="max-w-md"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <Button
                  key={opt.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter(opt.value)}
                  className={
                    statusFilter === opt.value
                      ? 'bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600'
                      : ''
                  }
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">
              {filtered.length} form(s)
            </span>
          </div>

          {displayLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <Shimmer className="h-5 w-48 rounded bg-red-100/80" />
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 rounded-lg">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              {search.trim() ? (
                <>
                  <p className="text-gray-500 text-lg">No deactivation forms found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    No forms match &quot;{search.trim()}&quot;.
                  </p>
                </>
              ) : hasActiveStatusFilter ? (
                <>
                  <p className="text-gray-500 text-lg">No forms match filters</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Try clearing the status filter.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg">No intangible deactivation forms</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Deactivation forms will appear here when available.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered
                  .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                  .map((f: any) => <FormCard key={f.id} form={f} onView={setSelected} onDownload={handleDownload} />)}
              </div>
              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-4 pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
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
      </main>
      <Dialog open={!!selected} onOpenChange={o=> !o && setSelected(null)}>
        <AppDialogFrame className="max-w-3xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !rounded-lg !p-0">
          <AppDialogGradientHeader title="Intangible Deactivation Form" description={selected?.formNumber ?? ''} showCloseButton={false} className="!px-4 !pb-4 !pt-4" />
          <AppDialogBody className="min-h-0 flex-1 overflow-hidden bg-slate-50 p-3">
            {previewLoading || !previewUrl ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-muted-foreground">Loading PDF preview...</div>
            ) : (
              <PDFViewer pdfUrl={previewUrl} className="h-full w-full" />
            )}
          </AppDialogBody>
          <AppDialogChromeFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            {selected && <Button onClick={() => void handleDownload(selected)}><Download className="mr-2 h-4 w-4" />Download PDF</Button>}
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>
    </div>
  );
}
