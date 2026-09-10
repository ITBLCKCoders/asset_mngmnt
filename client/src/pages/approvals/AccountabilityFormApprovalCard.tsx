'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  segmentTabsListClassName,
  segmentTabsTriggerClassName,
} from '@/components/ui/tabs';
import { Download, Eye, FileSignature, User, Package, FileText, Building2 } from 'lucide-react';
import { ApprovalTimeline } from '@/components/common/ApprovalTimeline';
import { splitDisplayAssets } from '@/pages/assets/accountability/accountabilityFormAssets';

export type AccountabilityApprovalFormType =
  | 'admin_copy_signature'
  | 'accountability_approval';

export interface AccountabilityApprovalBatch {
  formType: AccountabilityApprovalFormType;
  formID: string;
  form_number: string;
  user_id: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string | null;
  admin_copy_copy_type?: 'IT' | 'Admin' | null;
  admin_copy_signed_at?: string | null;
  approval_status?: string | null;
  created_at: string;
  formOrigin?: 'processor_return' | 'clearance';
  assets?: Array<{
    id: string;
    code?: string | null;
    name?: string | null;
    category?: string | null;
    serialNo?: string | null;
    type_department?: string | { name?: string } | null;
    type_department_name?: string | null;
    risk_level?: unknown;
  }>;
  department_name?: string | null;
  signed_at?: string | null;
  approved_at?: string | null;
  received_copy_201_file_signed_at?: string | null;
  admin_copy_signer_name?: string | null;
  dept_head_signed_by_name?: string | null;
  approved_by_name?: string | null;
  received_copy_201_file_signed_by_name?: string | null;
  decline_reason?: string | null;
  updated_at?: string | null;
}

function getStatusBadge(batch: AccountabilityApprovalBatch) {
  if (batch.formType === 'admin_copy_signature') {
    return {
      label: 'Awaiting Copy Signature',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    };
  }
  return {
    label: 'Awaiting Final Approval',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  };
}


export function AccountabilityFormApprovalCard({
  batch,
  onView,
  onDownload,
}: {
  batch: AccountabilityApprovalBatch;
  onView: () => void;
  onDownload: () => void;
}) {
  const statusBadge = getStatusBadge(batch);

  const userName =
    `${batch.user_first_name ?? ''} ${batch.user_last_name ?? ''}`.trim() ||
    batch.user_email ||
    'Employee';
  const displayAssets = (batch.assets ?? [])
    .map(a => ({ ...a, label: a.name || a.code || a.id }))
    .filter(a => a.label);
  const { tangible: tangibleAssets, intangible: intangibleAssets } =
    splitDisplayAssets(displayAssets);
  const renderAssetList = (assets: typeof displayAssets) =>
    assets.length > 0 ? (
      <div className="max-h-[120px] overflow-y-auto scrollbar-hide mt-1">
        <ul className="space-y-1">
          {assets.map(a => (
            <li key={a.id} className="flex items-start text-sm font-medium">
              <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 mt-1.5 flex-shrink-0" />
              <span className="break-words">{a.label}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : (
      <p className="text-xs text-gray-400 mt-1">None</p>
    );
  const timeline = [
    { title: 'Form created', done: !!batch.created_at, date: batch.created_at },
    { title: `${batch.admin_copy_copy_type ?? 'IT/Admin'} copy signed`, done: !!batch.admin_copy_signed_at, date: batch.admin_copy_signed_at, signerName: batch.admin_copy_signer_name },
    { title: 'Signed by asset owner', done: !!batch.signed_at, date: batch.signed_at, signerName: userName },
    { title: 'Approved by department head', done: !!batch.approved_at, date: batch.approved_at, signerName: batch.dept_head_signed_by_name ?? batch.approved_by_name },
    { title: 'Received Copy for 201 File (HR)', done: !!batch.received_copy_201_file_signed_at, date: batch.received_copy_201_file_signed_at, signerName: batch.received_copy_201_file_signed_by_name },
  ];
  return (
    <Card className="h-full shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl">
              <FileSignature className="h-5 w-5 text-white shrink-0" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
                Accountability Form
              </p>
              <CardTitle className="text-lg">
                {batch.form_number}
              </CardTitle>
              <p className="text-sm text-gray-500">
                Created {new Date(batch.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant="secondary" className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
            {batch.admin_copy_copy_type && (
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/30">
                {batch.admin_copy_copy_type} Copy
              </Badge>
            )}
            {batch.formOrigin === 'processor_return' && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-900 font-medium dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
              >
                Temporary
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        <Tabs defaultValue="details" className="flex h-full flex-col">
          <TabsList className={`${segmentTabsListClassName} mx-4 mb-2 grid w-[calc(100%-2rem)] grid-cols-2`}>
            <TabsTrigger value="details" className={segmentTabsTriggerClassName}>Details</TabsTrigger>
            <TabsTrigger value="timeline" className={segmentTabsTriggerClassName}>Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-4 space-y-4">
        {/* Employee */}
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{userName}</p>
            {batch.user_email && (
              <p className="text-xs text-gray-500 truncate">
                {batch.user_email}
              </p>
            )}
          </div>
        </div>

        {/* Department */}
        {batch.department_name && (
          <div className="flex items-start gap-3">
            <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Department</p>
              <p className="text-sm font-medium">{batch.department_name}</p>
            </div>
          </div>
        )}

        {/* Assets summary */}
        {displayAssets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-medium text-sm">
                <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />
                Tangible Assets <span className="text-gray-400">({tangibleAssets.length})</span>
              </p>
              {renderAssetList(tangibleAssets)}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-medium text-sm">
                <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
                Intangible Assets <span className="text-gray-400">({intangibleAssets.length})</span>
              </p>
              {renderAssetList(intangibleAssets)}
            </div>
          </div>
        )}

          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <ApprovalTimeline
            steps={timeline}
            isDeclined={batch.approval_status === 'declined' || batch.decline_reason === 'Declined'}
            declinedAt={batch.updated_at}
            declineReason={batch.decline_reason}
          />
        </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <div className="flex flex-col sm:flex-row gap-2 border-t border-slate-100 p-4">
          <Button variant="outline" size="sm" className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm" onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button variant="outline" size="sm" className="w-full sm:flex-1 bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white shadow-sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
    </Card>
  );
}
