'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, FileSignature, User, Package, Calendar, Building2 } from 'lucide-react';

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
  assets?: Array<{
    id: string;
    code?: string | null;
    name?: string | null;
    category?: string | null;
    serialNo?: string | null;
  }>;
  department_name?: string | null;
}

function getStatusBadge(batch: AccountabilityApprovalBatch) {
  if (batch.formType === 'admin_copy_signature') {
    return {
      label: 'Awaiting Copy Signature',
      className: 'bg-amber-100 text-amber-800',
    };
  }
  return {
    label: 'Awaiting Final Approval',
    className: 'bg-blue-100 text-blue-800',
  };
}

function getActionLabel(batch: AccountabilityApprovalBatch): string {
  if (batch.formType === 'admin_copy_signature') {
    return 'Sign Copy';
  }
  return 'Approve';
}

export function AccountabilityFormApprovalCard({
  batch,
  onView,
  onAction,
}: {
  batch: AccountabilityApprovalBatch;
  onView: () => void;
  onAction: () => void;
}) {
  const statusBadge = getStatusBadge(batch);
  const actionLabel = getActionLabel(batch);
  const userName =
    `${batch.user_first_name ?? ''} ${batch.user_last_name ?? ''}`.trim() ||
    batch.user_email ||
    'Employee';
  const displayAssets = (batch.assets ?? [])
    .map(a => ({ ...a, label: a.name || a.code || a.id }))
    .filter(a => a.label);
  return (
    <Card className="shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
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
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                {batch.admin_copy_copy_type} Copy
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
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
          <div className="flex items-start gap-3">
            <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">
                Assets ({batch.assets?.length ?? displayAssets.length})
              </p>
              <div className="max-h-[120px] overflow-y-auto scrollbar-hide mt-1">
                <ul className="space-y-1">
                  {displayAssets.map(a => (
                    <li
                      key={a.id}
                      className="flex items-start text-sm font-medium"
                    >
                      <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 mt-1.5 flex-shrink-0" />
                      <span className="break-words">{a.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step hint */}
        <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-md p-2">
          <Calendar className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>
            {batch.formType === 'admin_copy_signature'
              ? `Sign the ${batch.admin_copy_copy_type ?? 'IT'} copy to release this form to the next approver.`
              : 'Review the form and approve to release it to the new asset owner.'}
          </p>
        </div>

        <div className="mt-auto flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onView}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            onClick={onAction}
          >
            <FileSignature className="h-4 w-4 mr-2" />
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
