'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  segmentTabsListClassName,
  segmentTabsTriggerClassName,
} from '@/components/ui/tabs';
import {
  Calendar,
  Download,
  Eye,
  FileX2,
  Package,
  User,
} from 'lucide-react';
import { ApprovalTimeline } from '@/components/common/ApprovalTimeline';

export type IntangibleDeactivationBatch = {
  formType: 'intangible_deactivation' | 'intangible_deactivation_hr';
  formID: string;
  form_number: string;
  user_id: string;
  user_first_name?: string | null;
  user_last_name?: string | null;
  user_email?: string | null;
  created_at: string;
  status: string;
  assets: Array<{
    id: string;
    name: string;
    type: string;
    description?: string | null;
    remarks?: string | null;
    riskLevel?: string | null;
    risk_level?: string | { name?: string | null } | null;
  }>;
  requester_signature?: string | null;
  dept_head_signed_at?: string | null;
  dept_head_signature?: string | null;
  dept_head_approver_name?: string | null;
  hr_signed_at?: string | null;
  hr_signature?: string | null;
  hr_approver_name?: string | null;
  decline_reason?: string | null;
  remarks?: string | null;
  company_name?: string | null;
  requester_position?: string | null;
  requester_department?: string | null;
  requester_employee_id?: string | null;
  updated_at?: string | null;
};

export function IntangibleDeactivationApprovalCard({
  batch,
  onView,
  onDownload,
}: {
  batch: IntangibleDeactivationBatch;
  onView: () => void;
  onDownload?: () => void;
}) {
  const userName = `${batch.user_first_name ?? ''} ${batch.user_last_name ?? ''}`.trim() || batch.user_email || 'Unknown';
  const isHr = batch.formType === 'intangible_deactivation_hr';
  const statusLabel = isHr ? 'HR Approval' : 'Dept Head Approval';
  const statusClassName = isHr
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';

  return (
    <Card className="h-full shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl">
              <FileX2 className="h-5 w-5 text-white shrink-0" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
                Intangible Deactivation
              </p>
              <CardTitle className="text-lg truncate">{batch.form_number}</CardTitle>
              <p className="text-sm text-gray-500">
                Created {new Date(batch.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={`${statusClassName} shrink-0`}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        <Tabs defaultValue="details" className="flex h-full flex-col">
          <TabsList className={`${segmentTabsListClassName} mx-4 mb-2 grid w-[calc(100%-2rem)] grid-cols-2`}>
            <TabsTrigger value="details" className={segmentTabsTriggerClassName}>Details</TabsTrigger>
            <TabsTrigger value="timeline" className={segmentTabsTriggerClassName}>Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-4 space-y-4">
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{userName}</p>
            {batch.user_email && (
              <p className="text-xs text-gray-500 truncate">{batch.user_email}</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Package className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Assets ({batch.assets.length})</p>
            <div className="max-h-[120px] overflow-y-auto scrollbar-hide mt-1">
              <ul className="space-y-1">
                {batch.assets.length > 0 ? batch.assets.map(asset => (
                  <li key={asset.id} className="flex items-start text-sm font-medium">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 mt-1.5 shrink-0" />
                    <span className="break-words">{asset.name}</span>
                  </li>
                )) : (
                  <li className="text-sm text-gray-500">No assets listed</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-md p-2">
          <Calendar className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>{isHr ? 'Review the department-approved request and finalize the deactivation.' : 'Review the request and approve it to forward it to HR.'}</p>
        </div>
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <ApprovalTimeline
            steps={[
              { title: 'Request created', done: !!batch.created_at, date: batch.created_at, signerName: userName },
              { title: 'Approved by department head', done: !!batch.dept_head_signed_at, date: batch.dept_head_signed_at, signerName: batch.dept_head_approver_name },
              { title: 'HR / custodian finalization', done: !!batch.hr_signed_at, date: batch.hr_signed_at, signerName: batch.hr_approver_name },
            ]}
            isDeclined={!!batch.decline_reason || batch.status === 'Declined'}
            declinedAt={batch.updated_at}
            declineReason={batch.decline_reason}
          />
        </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <div className="flex flex-col sm:flex-row gap-2 border-t border-slate-100 p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="w-full sm:flex-1 bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>
    </Card>
  );
}

export function mapIntangibleDeactivationRow(row: any, formType: 'intangible_deactivation' | 'intangible_deactivation_hr'): IntangibleDeactivationBatch {
  const normalizeAsset = (a: any): IntangibleDeactivationBatch['assets'][number] => ({
    id: String(a?.id ?? ''),
    name: a?.name ?? a?.id ?? '',
    type: a?.type ?? '',
    description: a?.description ?? null,
    remarks: a?.remarks ?? null,
    riskLevel: typeof a?.riskLevel === 'string' ? a.riskLevel : (a?.riskLevel?.name ?? null),
    risk_level: a?.risk_level ?? null,
  });
  let assets: IntangibleDeactivationBatch['assets'] = [];
  try {
    // Prefer the backend-enriched `assets` array (snapshot + live description/risk lookup).
    if (Array.isArray(row?.assets) && row.assets.length > 0) {
      assets = row.assets.map(normalizeAsset).filter((a: { id: string }) => a.id);
    } else {
      const raw = row.assets_data;
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(data?.assets)) assets = data.assets.map(normalizeAsset).filter((a: { id: string }) => a.id);
    }
  } catch {}
  return {
    formType,
    formID: row.formID ?? row.id,
    form_number: row.form_number ?? row.formNumber,
    user_id: row.user_id,
    user_first_name: row.first_name ?? row.user?.first_name ?? null,
    user_last_name: row.last_name ?? row.user?.last_name ?? null,
    user_email: row.email ?? row.user?.email ?? null,
    created_at: row.created_at,
    status: row.status,
    assets,
    requester_signature: row.requester_signature ?? row.requesterSignature ?? null,
    dept_head_signed_at: row.dept_head_signed_at ?? row.deptHeadSignedAt ?? null,
    dept_head_signature: row.dept_head_signature ?? row.deptHeadSignature ?? null,
    dept_head_approver_name: row.dept_head_approver_name ?? row.deptHeadApproverName ?? null,
    hr_signed_at: row.hr_signed_at ?? row.hrSignedAt ?? null,
    hr_signature: row.hr_signature ?? row.hrSignature ?? null,
    hr_approver_name: row.hr_approver_name ?? row.hrApproverName ?? null,
    decline_reason: row.decline_reason ?? row.declineReason ?? null,
    remarks: row.remarks ?? null,
    updated_at: row.updated_at ?? null,
    company_name: row.company_name ?? row.user?.company?.name ?? null,
    requester_position: row.position ?? row.user?.position ?? null,
    requester_department: row.department_name ?? row.user?.department?.name ?? null,
    requester_employee_id: row.employee_id ?? row.employeeNumber ?? row.user?.employeeNumber ?? null,
  };
}
