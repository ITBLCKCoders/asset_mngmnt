'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Download,
  ClipboardList,
  User,
  Package,
  Calendar,
} from 'lucide-react';
import type { AssetChecklistData } from '@/lib/pdfGenerator';

export type ChecklistApprovalBatch = {
  formType: 'checklist';
  batchKey: string;
  employee_id: string;
  employee_name: string;
  employee_department_name?: string | null;
  created_at: string;
  checklist_count: number;
  checklists: AssetChecklistData[];
  dept_head_signed_at?: string | null;
  sub_approver_1_signed_at?: string | null;
  it_manager_signed_at?: string | null;
};

function getStatusBadge(batch: ChecklistApprovalBatch) {
  if (batch.it_manager_signed_at) {
    return { label: 'Received', className: 'bg-green-100 text-green-800' };
  }
  if (batch.dept_head_signed_at || batch.sub_approver_1_signed_at) {
    return { label: 'Approved', className: 'bg-blue-100 text-blue-800' };
  }
  return { label: 'Pending', className: 'bg-amber-100 text-amber-800' };
}

function getChecklistTypes(checklists: AssetChecklistData[]) {
  const hasOnboarding = checklists.some(c => c.type_onboarding);
  const hasOffboarding = checklists.some(c => c.type_offboarding);
  if (hasOnboarding && hasOffboarding) return 'Onboarding / Offboarding';
  if (hasOnboarding) return 'Onboarding';
  if (hasOffboarding) return 'Offboarding';
  return '—';
}

function checklistFormNumber(batch: ChecklistApprovalBatch): string {
  return batch.checklists[0]?.form_number || `CHK-${batch.batchKey}`;
}

export function ChecklistApprovalCard({
  batch,
  onView,
  onDownload,
}: {
  batch: ChecklistApprovalBatch;
  onView: () => void;
  onDownload: () => void;
}) {
  const statusBadge = getStatusBadge(batch);
  const checklistType = getChecklistTypes(batch.checklists);
  const firstChecklist = batch.checklists[0];

  return (
    <Card className="shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl">
              <ClipboardList className="h-5 w-5 text-white shrink-0" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
                Checklist Form
              </p>
              <CardTitle className="text-lg">{checklistFormNumber(batch)}</CardTitle>
              <p className="text-sm text-gray-500">
                Created {new Date(batch.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant="secondary" className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
              {checklistType}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Employee */}
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{batch.employee_name}</p>
            {firstChecklist?.employee_designation && (
              <p className="text-xs text-gray-500">{firstChecklist.employee_designation}</p>
            )}
          </div>
        </div>

        {/* Asset */}
        <div className="flex items-start gap-3">
          <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600">
              {firstChecklist
                ? `${firstChecklist.asset?.name || 'Asset'} (${firstChecklist.asset?.code || '—'})`
                : 'No assets'}
            </p>
            {batch.checklists.length > 1 && (
              <p className="text-xs text-gray-400 mt-0.5">
                +{batch.checklists.length - 1} more asset{batch.checklists.length - 1 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Department */}
        {(batch.employee_department_name || firstChecklist?.employee_department) && (
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600">
                Department: {batch.employee_department_name ?? firstChecklist?.employee_department}
              </p>
            </div>
          </div>
        )}

        {/* Received by */}
        {firstChecklist?.received_by && (
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600">Received by: {firstChecklist.received_by}</p>
            </div>
          </div>
        )}

        {/* Submitted */}
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600">
              {new Date(batch.created_at).toLocaleDateString()}{' '}
              {new Date(batch.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </CardContent>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row gap-2 border-t border-slate-100 p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">View</span>
          <span className="sm:hidden">View</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="w-full sm:flex-1 bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white shadow-sm"
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Download</span>
          <span className="sm:hidden">DL</span>
        </Button>
      </div>
    </Card>
  );
}
