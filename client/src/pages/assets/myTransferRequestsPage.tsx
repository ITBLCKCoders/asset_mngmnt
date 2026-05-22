'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  FileText,
  Search,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  getTransferFormUiStatus,
  formatTransferFormUiStatus,
  type TransferFormUiStatus,
} from '@/utils/transferFormStatus';

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
}

function getStatusBadgeClass(status: TransferFormUiStatus): string {
  if (status === 'completed')
    return 'bg-green-100 text-green-800 border-green-200';
  if (status === 'approved')
    return 'bg-blue-100 text-blue-800 border-blue-200';
  if (status === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

export default function MyTransferRequestsPage() {
  const { user: currentUser } = useCurrentUser();
  const [requests, setRequests] = useState<TransferRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
        </PageHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600">Loading your requests...</span>
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
    </div>
  );
}
