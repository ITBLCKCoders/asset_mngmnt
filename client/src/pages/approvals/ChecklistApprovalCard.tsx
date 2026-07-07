'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Download,
  ClipboardList,
  User,
  Building2,
  Calendar,
  FileText,
  CheckSquare,
  Clock,
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
  it_manager_signed_at?: string | null;
};

function getStatusBadge(batch: ChecklistApprovalBatch) {
  if (batch.it_manager_signed_at) {
    return { label: 'Received', className: 'bg-green-100 text-green-800' };
  }
  if (batch.dept_head_signed_at) {
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
              <CardTitle className="text-lg">{batch.employee_name}</CardTitle>
              <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                Asset Checklist
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant="secondary" className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {batch.checklist_count} asset{batch.checklist_count !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {/* Employee detail row */}
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700">{batch.employee_name}</p>
            {firstChecklist?.employee_designation && (
              <p className="text-xs text-gray-500">{firstChecklist.employee_designation}</p>
            )}
          </div>
        </div>

        {/* Department row */}
        {(batch.employee_department_name || firstChecklist?.employee_department) && (
          <div className="flex items-start gap-3">
            <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-600">
              {batch.employee_department_name ?? firstChecklist?.employee_department}
            </p>
          </div>
        )}

        {/* Submitted date */}
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-600">
            Submitted: {new Date(batch.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Checklist type */}
        <div className="flex items-start gap-3">
          <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-600">
            Type: {checklistType}
          </p>
        </div>

        {/* Asset list */}
        <div className="flex items-start gap-3">
          <CheckSquare className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-700">
              {batch.checklist_count === 0
                ? 'No assets'
                : `${batch.checklist_count} asset${batch.checklist_count === 1 ? '' : 's'}`}
            </p>
            {batch.checklists.length > 0 && (
              <ul className="max-h-[120px] overflow-y-auto scrollbar-hide text-xs text-gray-600 mt-1 space-y-0.5 list-none">
                {batch.checklists.map(c => (
                  <li key={c.id} className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 shrink-0" />
                    <span className="truncate">
                      {c.asset?.name || 'Asset'}
                      {c.asset?.code && (
                        <span className="text-gray-400 font-mono ml-1">
                          ({c.asset.code})
                        </span>
                      )}
                      {!c.asset?.code && c.form_number && (
                        <span className="text-gray-400 font-mono ml-1">
                          (#{c.form_number})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Approval status rows */}
        {batch.dept_head_signed_at && (
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-600">
              Dept Head approved:{' '}
              {new Date(batch.dept_head_signed_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
        {batch.it_manager_signed_at && (
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-sm text-green-600">
              IT Manager received:{' '}
              {new Date(batch.it_manager_signed_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="flex-1 bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
