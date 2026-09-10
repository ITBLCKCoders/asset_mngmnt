'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  FileText,
  Search,
  Package,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shimmer } from '@/components/ui/shimmer';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  getTransferFormUiStatus,
  formatTransferFormUiStatus,
  type TransferFormUiStatus,
} from '@/utils/transferFormStatus';
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

interface TransferRequestRow {
  formID: string;
  form_number: string;
  request_date: string;
  status: TransferFormUiStatus;
  target_user_name: string;
  asset_count: number;
  asset_name: string;
  asset_code: string;
  asset_summary: string;
  /** First rows for card list (same pattern as My Asset Return Requests). */
  asset_lines: { name: string; code: string }[];
  /** Linked return form (null while the staged return is not yet generated). */
  returnFormId?: string | null;
}

function getStatusBadgeClass(status: TransferFormUiStatus): string {
  if (status === 'completed')
    return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800';
  if (status === 'approved')
    return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800';
  if (status === 'awaiting-return')
    return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800';
  if (status === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800';
  return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800';
}

export default function MyTransferRequestsPage() {
  const { user: currentUser } = useCurrentUser();
  const [requests, setRequests] = useState<TransferRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const fetchRequests = async () => {
    const userId = currentUser?.id;
    if (!userId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get<{ assetTransferForms?: any[] }>(
        `/asset-transfers/user/${userId}`
      );
      const batches = response.assetTransferForms || [];
      const rows: TransferRequestRow[] = batches.map((batch: any) => {
        const returns = Array.isArray(batch.returns) ? batch.returns : [];
        const firstAsset = returns[0]?.assignment?.asset;
        const assetName = firstAsset?.name || '-';
        const assetCode = firstAsset?.code || '-';
        const extraAssets = Math.max(returns.length - 1, 0);
        const asset_lines = returns.slice(0, 5).map((r: any) => ({
          name: r?.assignment?.asset?.name ?? 'Asset',
          code: r?.assignment?.asset?.code ?? '',
        }));

        return {
          formID: batch.formID,
          form_number: batch.form_number || '-',
          request_date: batch.created_at || new Date().toISOString(),
          status: getTransferFormUiStatus(batch),
          target_user_name: batch.new_assigned_user
            ? `${batch.new_assigned_user.first_name || ''} ${batch.new_assigned_user.last_name || ''}`.trim()
            : '-',
          asset_count: returns.length,
          asset_name: assetName,
          asset_code: assetCode,
          asset_summary:
            extraAssets > 0 ? `${assetName} +${extraAssets} more` : assetName,
          asset_lines,
          returnFormId: batch.return_form_id ?? null,
        };
      });

      setRequests(rows);
    } catch (error) {
      console.error('Failed to fetch transfer requests:', error);
      toast.error('Failed to load your transfer requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser?.id]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(r => {
      const hay = [
        r.form_number,
        r.asset_name,
        r.asset_code,
        r.asset_summary,
        r.target_user_name,
        formatTransferFormUiStatus(r.status),
        String(r.asset_count),
        ...r.asset_lines.flatMap(a => [a.name, a.code]),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [requests, searchQuery]);

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={FileText}
          title="My Transfer Requests"
          description="View status of your transfer requests"
        >
          <div className="flex items-center gap-2">
            <Link to="/assets/transfer-request">
              <Button
                variant="header"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Transfer Request
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

        {(() => {
          const needsReturn = requests.filter(
            r => r.status === 'awaiting-return' && !r.returnFormId
          );
          if (needsReturn.length === 0) return null;
          return (
            <Card className="border-0 bg-purple-50/80 shadow-md">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-purple-900">
                  {needsReturn.length} approved transfer
                  {needsReturn.length !== 1 ? 's' : ''} need
                  {needsReturn.length === 1 ? 's' : ''} a return form before the
                  transfer can be processed.
                </p>
                <Link to="/assets/transfer-request">
                  <Button
                    size="sm"
                    className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 font-semibold text-white shadow-sm hover:from-red-600 hover:to-red-700"
                  >
                    Generate Return Form
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })()}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Shimmer className="h-5 w-48 rounded" />
                <Shimmer className="h-4 w-32 rounded" />
                <div className="space-y-2 pt-2">
                  <Shimmer className="h-3 w-full rounded" />
                  <Shimmer className="h-3 w-2/3 rounded" />
                </div>
                <Shimmer className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card className="shadow-md border-0 bg-white/80">
            <CardContent className="py-12 text-center">
              <ArrowRightLeft className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                No transfer requests found
              </p>
              <p className="text-gray-400 text-sm mt-1 mb-6">
                Your transfer requests will appear here once you submit them.
              </p>
              <Link to="/assets/transfer-request">
                <Button variant="default" className="gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Submit a transfer request
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                {requests.length} request{requests.length !== 1 ? 's' : ''}
                {searchQuery.trim() ? (
                  <span className="text-gray-800">
                    {' '}
                    · {filteredRequests.length} match
                    {filteredRequests.length !== 1 ? 'es' : ''}
                  </span>
                ) : null}
              </p>
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search form, assets, recipient, status…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="border-gray-200 pl-9 focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <Card className="border-0 bg-white/80 shadow-md">
                <CardContent className="py-10 text-center text-gray-500">
                  No requests match your search.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredRequests.map(row => {
                  const formNumber =
                    row.form_number !== '-'
                      ? row.form_number
                      : `Transfer ${new Date(row.request_date).toLocaleDateString()}`;
                  return (
                    <Card
                      key={row.formID}
                      className="flex flex-col border-0 bg-white/80 shadow-md transition-shadow hover:shadow-lg"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex-shrink-0 rounded-lg bg-red-100 p-2">
                              <FileText className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="truncate text-lg">
                                {formNumber}
                              </CardTitle>
                              <p className="text-sm text-gray-500">
                                Requested{' '}
                                {new Date(
                                  row.request_date
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`flex-shrink-0 text-xs ${getStatusBadgeClass(row.status)}`}
                          >
                            {formatTransferFormUiStatus(row.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 pt-0">
                        <div className="flex items-start gap-3">
                          <Package className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-700">
                              {row.asset_count} asset
                              {row.asset_count !== 1 ? 's' : ''} in this request
                            </p>
                            {row.asset_lines.length > 0 ? (
                              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-gray-600">
                                {row.asset_lines.map((a, i) => (
                                  <li key={`${row.formID}-a-${i}`}>
                                    {a.name}{' '}
                                    {a.code ? (
                                      <span className="font-mono text-gray-500">
                                        ({a.code})
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                                {row.asset_count > row.asset_lines.length ? (
                                  <li className="text-gray-500">
                                    +{row.asset_count - row.asset_lines.length}{' '}
                                    more
                                  </li>
                                ) : null}
                              </ul>
                            ) : null}
                            <p className="mt-2 text-xs text-gray-600">
                              <span className="font-semibold text-gray-800">
                                Transfer to:{' '}
                              </span>
                              {row.target_user_name}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
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
