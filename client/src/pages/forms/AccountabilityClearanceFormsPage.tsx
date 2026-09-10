'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { Label } from '@/components/ui/label';
import { Shimmer } from '@/components/ui/shimmer';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogBody,
  AppDialogChromeFooter,
  AppDialogFrame,
  AppDialogGradientHeader,
} from '@/components/common/appDialogChrome';
import { SearchWithMultiFilter } from '@/components/common/SearchWithMultiFilter';
import { PDFViewer } from '@/components/PDFViewer';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ClearanceFormCard, type AccountabilityForm } from '@/pages/assets/accountability/accountabilityForm';
import { generateAccountabilityClearancePDF, downloadPDF } from '@/lib/pdfGenerator';
import { matchesFormListSearchWithFilters } from '@/utils/formListSearch';
import { ACCOUNTABILITY_FILTER_OPTIONS } from '@/utils/formSearchFilterOptions';

const PAGE_SIZE = 6;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Declined', label: 'Declined' },
] as const;

export default function AccountabilityClearanceFormsPage() {
  const { user: currentUser } = useCurrentUser();
  const [forms, setForms] = useState<AccountabilityForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFilters, setSearchFilters] = useState<string[]>(['all']);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<AccountabilityForm | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accountability-forms');
      setForms(
        (response.forms ?? []).filter(
          (form: AccountabilityForm) => form.formOrigin === 'clearance'
        )
      );
    } catch (error) {
      console.error('Failed to fetch accountability clearance forms:', error);
      toast.error('Failed to load accountability clearance forms');
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchForms();
  }, []);

  const filtered = useMemo(() => {
    let list = forms;
    if (statusFilter !== 'all') {
      list = list.filter(form => form.status === statusFilter);
    }
    if (search.trim()) {
      list = list.filter(form =>
        matchesFormListSearchWithFilters(form, search, searchFilters)
      );
    }
    return list;
  }, [forms, search, searchFilters, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, searchFilters, statusFilter]);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!selected) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewUrl(null);

    void api
      .get(`/accountability-forms/${selected.id}`)
      .then(async response => {
        const blob = await generateAccountabilityClearancePDF(
          response.form ?? selected,
          currentUser
        );
        if (!cancelled) setPreviewUrl(URL.createObjectURL(blob));
      })
      .catch(error => {
        console.error('Failed to load accountability clearance preview:', error);
        if (!cancelled) toast.error('Failed to load PDF preview');
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected, currentUser]);

  const handleDownload = async (form: AccountabilityForm) => {
    try {
      const response = await api.get(`/accountability-forms/${form.id}`);
      const fullForm = response.form ?? form;
      const blob = await generateAccountabilityClearancePDF(fullForm, currentUser);
      const safeNumber = (form.formNumber || 'clearance').replace(
        /[^a-zA-Z0-9-_]/g,
        '_'
      );
      downloadPDF(blob, `Asset_Clearance_${safeNumber}.pdf`);
      toast.success('Clearance certificate downloaded');
    } catch (error) {
      console.error('Failed to download accountability clearance:', error);
      toast.error('Failed to download clearance certificate');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <PageHeader
          icon={FileCheck}
          title="Accountability Clearance Forms"
          description="View all accountability clearance requests"
          loading={loading}
        />

        <div>
          <div className="mb-6 flex flex-col gap-4">
            <div className="relative flex min-w-0 flex-1 flex-col">
              <Label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Search
              </Label>
              <SearchWithMultiFilter
                value={search}
                onChange={setSearch}
                selectedFilters={searchFilters}
                onSelectedFiltersChange={setSearchFilters}
                filterOptions={ACCOUNTABILITY_FILTER_OPTIONS}
                placeholder="Search form number, employee, asset..."
                className="max-w-md"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter(option.value)}
                  className={
                    statusFilter === option.value
                      ? 'border-red-600 bg-red-600 text-white hover:bg-red-700 hover:text-white'
                      : ''
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filtered.length} form(s)
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(item => (
                <div key={item} className="space-y-3 rounded-lg border p-4">
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
            <div className="rounded-lg py-12 text-center">
              <FileCheck className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              {search.trim() ? (
                <>
                  <p className="text-lg text-gray-500">No clearance forms found</p>
                  <p className="mt-1 text-sm text-gray-400">
                    No forms match &quot;{search.trim()}&quot;.
                  </p>
                </>
              ) : statusFilter !== 'all' ? (
                <>
                  <p className="text-lg text-gray-500">No forms match filters</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Try clearing the status filter.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg text-gray-500">No accountability clearance forms</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Clearance forms will appear here when available.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered
                  .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                  .map(form => (
                    <ClearanceFormCard
                      key={form.id}
                      form={form}
                      onView={setSelected}
                      onDownload={handleDownload}
                    />
                  ))}
              </div>
              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-4 pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
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
                    onClick={() => setCurrentPage(page => Math.min(pageCount, page + 1))}
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

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <AppDialogFrame className="!flex !max-h-[90vh] !max-w-3xl !flex-col !gap-0 !rounded-lg !p-0">
          <AppDialogGradientHeader
            title="Accountability Clearance Form"
            description={selected?.formNumber ?? ''}
            showCloseButton={false}
            className="!px-4 !pb-4 !pt-4"
          />
          <AppDialogBody className="min-h-0 flex-1 overflow-hidden bg-slate-50 p-3">
            {previewLoading || !previewUrl ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-muted-foreground">
                Loading PDF preview...
              </div>
            ) : (
              <PDFViewer pdfUrl={previewUrl} className="h-full w-full" />
            )}
          </AppDialogBody>
          <AppDialogChromeFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected && (
              <Button onClick={() => void handleDownload(selected)}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>
    </div>
  );
}
