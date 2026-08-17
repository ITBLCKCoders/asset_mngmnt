'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Undo2, ArrowLeft, FileText, Package, Download } from 'lucide-react';
import { Shimmer } from '@/components/ui/shimmer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAssetMovementExport } from '@/hooks/useAssetMovementExport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

/** Minimal batch shape from GET /asset-returns/user/:userId (assetReturnForms) */
interface ReturnFormBatch {
  formID?: string | null;
  form_number?: string | null;
  return_batch_id: string | null;
  created_at: string;
  user_id: string;
  signed_at?: string | null;
  process_signed_at?: string | null;
  dept_head_signed_at?: string | null;
  processor_declined_at?: string | null;
  processor_decline_reason?: string | null;
  status?: string;
  returns: {
    assignment_id: string;
    return_condition?: string;
    return_notes?: string;
    assignment?: {
      assignmentID: string;
      department?: { id: string; name: string } | null;
      asset?: { id: string; code: string; name: string };
    };
  }[];
}

/** Submitter-facing status: Returned | Approved by Department head | Declined | Submitted */
function getStatusLabel(batch: ReturnFormBatch): string {
  if (batch.status === 'declined') return 'Declined';
  if (batch.status) return batch.status;
  if (batch.process_signed_at) return 'Returned';
  if (batch.dept_head_signed_at) return 'Approved by Department head';
  if (batch.processor_declined_at) return 'Declined by processor';
  return 'Submitted';
}

function getStatusBadgeClass(label: string): string {
  if (label === 'Returned')
    return 'bg-green-100 text-green-800 border-green-200';
  if (label === 'Approved by Department head')
    return 'bg-blue-100 text-blue-800 border-blue-200';
  if (label === 'Declined' || label === 'Declined by processor')
    return 'bg-red-100 text-red-900 border-red-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}

export default function MyReturnRequestsPage() {
  const { user: currentUser } = useCurrentUser();
  const [batches, setBatches] = useState<ReturnFormBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportType,
    setExportType,
    exportStep,
    setExportStep,
    filters,
    setFilters,
    handleExportClick,
    handleExportConfirm,
    handleFilterChange,
    handlePrevStep,
    resetDialog,
  } = useAssetMovementExport();

  const fetchForms = async () => {
    if (!currentUser?.id) {
      setBatches([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get<{
        assetReturnForms?: ReturnFormBatch[];
      }>('/asset-returns/user/' + currentUser.id);
      const forms: ReturnFormBatch[] = response.assetReturnForms || [];
      const forCurrentUser = forms.filter(
        batch => batch.user_id === currentUser.id
      );
      setBatches(forCurrentUser);
    } catch (error) {
      console.error('Failed to fetch return forms:', error);
      toast.error('Failed to load your return requests');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [currentUser?.id]);

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={FileText}
          title="My Asset Return Requests"
          description="View status of your return requests"
        >
          <div className="flex items-center gap-2">
            <Link to="/assets/return-request">
              <Button
                variant="header"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Return Request
              </Button>
            </Link>
            <div className="relative" role="group">
              <Button
                variant="header"
                size="sm"
                onClick={() => handleExportClick('pdf')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="header"
                size="sm"
                onClick={() => handleExportClick('excel')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </PageHeader>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Shimmer className="h-5 w-48 rounded" />
                <Shimmer className="h-4 w-28 rounded" />
                <div className="space-y-2 pt-2">
                  <Shimmer className="h-3 w-full rounded" />
                  <Shimmer className="h-3 w-3/4 rounded" />
                </div>
                <Shimmer className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : batches.length === 0 ? (
          <Card className="shadow-md border-0 bg-white/80">
            <CardContent className="py-12 text-center">
              <Undo2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No return requests found</p>
              <p className="text-gray-400 text-sm mt-1 mb-6">
                Your return requests will appear here once you submit them.
              </p>
              <Link to="/assets/return-request">
                <Button variant="default" className="gap-2">
                  <Undo2 className="h-4 w-4" />
                  Submit a return request
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map(batch => {
              const formKey =
                batch.formID ??
                batch.return_batch_id ??
                batch.returns[0]?.assignment_id ??
                '';
              const formNumber =
                batch.form_number ??
                `Return ${new Date(batch.created_at).toLocaleDateString()}`;
              const statusLabel = getStatusLabel(batch);
              return (
                <Card
                  key={formKey}
                  className="shadow-md border-0 bg-white/80 hover:shadow-lg transition-shadow flex flex-col"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">
                            {formNumber}
                          </CardTitle>
                          <p className="text-sm text-gray-500">
                            Created{' '}
                            {new Date(batch.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`flex-shrink-0 text-xs ${getStatusBadgeClass(statusLabel)}`}
                      >
                        {statusLabel}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1">
                    <div className="flex items-start gap-3">
                      <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-700">
                          {batch.returns.length} asset
                          {batch.returns.length !== 1 ? 's' : ''} in this
                          request
                        </p>
                        {batch.returns.length > 0 && (
                          <ul className="text-xs text-gray-600 mt-1 space-y-0.5 list-disc list-inside">
                            {batch.returns.slice(0, 5).map((r, i) => (
                              <li key={r.assignment_id ?? i}>
                                {r.assignment?.asset?.name ?? 'Asset'}{' '}
                                {r.assignment?.asset?.code && (
                                  <span className="text-gray-500 font-mono">
                                    ({r.assignment.asset.code})
                                  </span>
                                )}
                              </li>
                            ))}
                            {batch.returns.length > 5 && (
                              <li className="text-gray-500">
                                +{batch.returns.length - 5} more
                              </li>
                            )}
                          </ul>
                        )}
                        {(statusLabel === 'Declined' ||
                          statusLabel === 'Declined by processor') &&
                          batch.processor_decline_reason?.trim() && (
                            <p className="mt-3 text-xs text-gray-600 border-t border-gray-100 pt-3">
                              <span className="font-semibold text-gray-800">
                                Decline reason:{' '}
                              </span>
                              {batch.processor_decline_reason}
                            </p>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {exportStep === 1
                ? `Export ${exportType?.toUpperCase() ?? ''} — Step 1: Format`
                : `Export ${exportType?.toUpperCase() ?? ''} — Step 2: Filters`}
            </DialogTitle>
            <DialogDescription>
              {exportStep === 1
                ? 'Choose the export format.'
                : 'Apply optional filters to narrow down the exported data.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {exportStep === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-3"
                  onClick={() => {
                    setExportType('pdf');
                    setExportStep(2);
                  }}
                >
                  <FileText className="h-8 w-8 text-red-600" />
                  <span className="font-semibold">PDF</span>
                  <span className="text-xs text-gray-500">Document format</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-3"
                  onClick={() => {
                    setExportType('excel');
                    setExportStep(2);
                  }}
                >
                  <FileText className="h-8 w-8 text-green-600" />
                  <span className="font-semibold">Excel</span>
                  <span className="text-xs text-gray-500">Spreadsheet format</span>
                </Button>
              </div>
            )}
            {exportStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">From Date</Label>
                    <Input
                      type="date"
                      value={filters.fromDate}
                      onChange={e => handleFilterChange('fromDate', e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">To Date</Label>
                    <Input
                      type="date"
                      value={filters.toDate}
                      onChange={e => handleFilterChange('toDate', e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Accountability Form No</Label>
                    <Input
                      type="text"
                      placeholder="e.g. AF-001"
                      value={filters.accountabilityFormNo}
                      onChange={e => handleFilterChange('accountabilityFormNo', e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Asset Code</Label>
                    <Input
                      type="text"
                      placeholder="e.g. AST-001"
                      value={filters.assetCode}
                      onChange={e => handleFilterChange('assetCode', e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between pt-4 border-t">
            {exportStep === 2 && (
              <Button variant="outline" onClick={handlePrevStep}>
                Back
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button onClick={handleExportConfirm} disabled={!exportType}>
                {exportStep === 1 ? 'Next' : `Export ${exportType?.toUpperCase()}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
