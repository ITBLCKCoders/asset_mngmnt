'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/PageHeader';
import {
  AppDialogBody,
  AppDialogChromeFooter,
  AppDialogFrame,
  AppDialogGradientHeader,
} from '@/components/common/appDialogChrome';
import { Shimmer } from '@/components/ui/shimmer';
import { PDFViewer } from '@/components/PDFViewer';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { api } from '@/lib/api';
import { downloadPDF } from '@/lib/pdfGenerator';
import { generateAssetChecklistPDF } from '@/lib/pdfGenerator/assetChecklistPdf';
import { Download, Eye, FileText, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

type ChecklistRow = {
  id: string;
  form_number?: string | null;
  assignment_id: string;
  employee_id: string;
  employee_name: string;
  employee_designation?: string | null;
  employee_department?: string | null;
  employee_company?: string | null;
  type_onboarding: boolean;
  type_offboarding: boolean;
  received_by?: string | null;
  checklist_data: any;
  remarks?: string | null;
  created_at: string;
  asset?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
};

function checklistFormNumber(row: ChecklistRow): string {
  return row.form_number || `CHK-${row.assignment_id}`;
}

function checklistAssetLabel(row: ChecklistRow): string {
  if (!row.asset) return 'Asset';
  return `${row.asset.name || 'Asset'} (${row.asset.code || '—'})`;
}

function checklistTypeLabel(row: ChecklistRow): string {
  const types = [];
  if (row.type_onboarding) types.push('Onboarding');
  if (row.type_offboarding) types.push('Offboarding');
  return types.join(', ') || 'Checklist';
}

export default function AssetChecklistFormsPage() {
  const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistRow | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const displayLoading = useDelayedLoading(loading, 2000);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const response = await api.get('/asset-assignments/checklists');
      setChecklists(Array.isArray(response.checklists) ? response.checklists : []);
    } catch (error) {
      console.error('Failed to fetch checklist forms:', error);
      toast.error('Failed to load checklist forms');
      setChecklists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  useEffect(() => {
    if (!showPreview || !selectedChecklist) return;

    let cancelled = false;
    const generatePreview = async () => {
      try {
        const blob = await generateAssetChecklistPDF({
          ...selectedChecklist,
          asset_label: checklistAssetLabel(selectedChecklist),
        });
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (error) {
        console.error('Failed to generate checklist preview:', error);
        toast.error('Failed to generate checklist preview');
      }
    };

    generatePreview();

    return () => {
      cancelled = true;
      setPreviewUrl(currentUrl => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return '';
      });
    };
  }, [showPreview, selectedChecklist]);

  const filteredChecklists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return checklists;

    return checklists.filter(row =>
      [
        checklistFormNumber(row),
        row.employee_name,
        row.employee_department,
        row.employee_company,
        row.received_by,
        row.asset?.name,
        row.asset?.code,
        checklistTypeLabel(row),
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q))
    );
  }, [checklists, searchQuery]);

  const handleDownload = async (row: ChecklistRow) => {
    try {
      const blob = await generateAssetChecklistPDF({
        ...row,
        asset_label: checklistAssetLabel(row),
      });
      downloadPDF(blob, `Asset_Checklist_${checklistFormNumber(row)}.pdf`);
      toast.success('Checklist PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to download checklist PDF:', error);
      toast.error('Failed to download checklist PDF');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={FileText}
          title="Checklist Forms"
          description="View and download asset checklist forms"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchChecklists}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </PageHeader>

        <div className="flex flex-col gap-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search form number, employee, asset, received by..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">
            {filteredChecklists.length} form(s)
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
        ) : filteredChecklists.length === 0 ? (
          <div className="text-center py-12 rounded-lg">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No checklist forms found</p>
            <p className="text-gray-400 text-sm mt-1">
              Checklist forms will appear here when available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChecklists.map(row => (
              <div
                key={row.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 to-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-slate-900">
                        {checklistFormNumber(row)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {row.employee_name}
                      </p>
                    </div>
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      {checklistTypeLabel(row)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 p-4 text-sm text-slate-600">
                  <p>
                    <span className="font-medium text-slate-800">Asset:</span>{' '}
                    {checklistAssetLabel(row)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-800">Department:</span>{' '}
                    {row.employee_department || '—'}
                  </p>
                  <p>
                    <span className="font-medium text-slate-800">Received by:</span>{' '}
                    {row.received_by || '—'}
                  </p>
                  <p>
                    <span className="font-medium text-slate-800">Date:</span>{' '}
                    {new Date(row.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 border-t border-slate-100 p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-red-600 hover:text-white"
                    onClick={() => {
                      setSelectedChecklist(row);
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-blue-600 hover:text-white"
                    onClick={() => handleDownload(row)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
          <AppDialogGradientHeader
            title={
              selectedChecklist
                ? `${selectedChecklist.employee_name} - ${checklistFormNumber(selectedChecklist)}`
                : 'Asset Checklist'
            }
            description="Asset Checklist Form Preview"
          />
          <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
            <div className="mx-4 my-4 h-[620px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
              {previewUrl ? (
                <PDFViewer pdfUrl={previewUrl} className="h-full w-full" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  Generating checklist PDF preview...
                </div>
              )}
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter className="justify-end gap-3">
            {selectedChecklist && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(selectedChecklist)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>
    </div>
  );
}
