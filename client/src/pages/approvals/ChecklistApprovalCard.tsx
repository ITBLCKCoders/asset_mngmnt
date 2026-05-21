'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, ClipboardList } from 'lucide-react';
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

export function ChecklistApprovalCard({
  batch,
  onView,
  onDownload,
}: {
  batch: ChecklistApprovalBatch;
  onView: () => void;
  onDownload: () => void;
}) {
  return (
    <Card className="flex flex-col border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                Asset Checklist
              </p>
              <p className="font-semibold text-slate-900">{batch.employee_name}</p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {batch.checklist_count} asset{batch.checklist_count !== 1 ? 's' : ''}
          </Badge>
        </div>
        {batch.employee_department_name && (
          <p className="text-xs text-slate-500">{batch.employee_department_name}</p>
        )}
        <p className="text-xs text-slate-500">
          Submitted: {new Date(batch.created_at).toLocaleString()}
        </p>
        <ul className="text-xs text-slate-600 space-y-1 max-h-24 overflow-y-auto">
          {batch.checklists.map(c => (
            <li key={c.id}>
              {c.asset?.name || 'Asset'} ({c.asset?.code || c.form_number || '—'})
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-auto pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1 hover:bg-red-600 hover:text-white"
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="flex-1 hover:bg-blue-600 hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
