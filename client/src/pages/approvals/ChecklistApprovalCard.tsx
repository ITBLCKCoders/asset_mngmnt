'use client';

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  ClipboardCheck,
  Download,
  Eye,
  Package,
  User,
} from 'lucide-react';
import type { AssetChecklistData } from '@/lib/pdfGenerator';

export type ChecklistApprovalEntry = AssetChecklistData & {
  asset?: { id?: string; code?: string | null; name?: string | null } | null;
  dept_head_signed_at?: string | null;
  it_manager_signed_at?: string | null;
  employee_company_logo_url?: string | null;
};

export type ChecklistApprovalBatch = {
  formType?: 'checklist';
  batchKey: string;
  employee_id: string;
  employee_name: string;
  employee_department_name?: string | null;
  checklist_count: number;
  created_at: string;
  checklists: ChecklistApprovalEntry[];
  dept_head_signed_at?: string | null;
  it_manager_signed_at?: string | null;
};

type ChecklistApprovalCardProps = {
  batch: ChecklistApprovalBatch;
  onView: () => void;
  onDownload: () => void;
};

export const ChecklistApprovalCard: FC<ChecklistApprovalCardProps> = ({
  batch,
  onView,
  onDownload,
}) => {
  const pendingDept = !batch.dept_head_signed_at;
  const pendingReceive =
    !!batch.dept_head_signed_at && !batch.it_manager_signed_at;
  const completed = !!batch.it_manager_signed_at;

  let badgeClass = 'bg-amber-100 text-amber-800';
  let badgeLabel = 'Pending approval';
  if (completed) {
    badgeClass = 'bg-green-100 text-green-800';
    badgeLabel = 'Received';
  } else if (pendingReceive) {
    badgeClass = 'bg-blue-100 text-blue-800';
    badgeLabel = 'Pending receive';
  } else if (pendingDept) {
    badgeClass = 'bg-amber-100 text-amber-800';
    badgeLabel = 'Pending approval';
  }

  const first = batch.checklists[0];
  const assetPreview = first?.asset
    ? `${first.asset.name || 'Asset'} (${first.asset.code || '—'})`
    : '—';

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-violet-100 rounded-lg shrink-0">
              <ClipboardCheck className="h-5 w-5 text-violet-700" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">
                Asset Checklist
              </CardTitle>
              <p className="text-sm text-gray-500">
                {batch.checklist_count} asset
                {batch.checklist_count !== 1 ? 's' : ''}
                {batch.created_at &&
                  !Number.isNaN(new Date(batch.created_at).getTime()) &&
                  ` · ${new Date(batch.created_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={`shrink-0 ${badgeClass}`}>
            {badgeLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 pt-0">
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm">Employee</p>
            <p className="text-sm text-gray-600 truncate">{batch.employee_name}</p>
          </div>
        </div>

        {batch.employee_department_name ? (
          <div className="flex items-start gap-3">
            <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm">Department</p>
              <p className="text-sm text-gray-600 truncate">
                {batch.employee_department_name}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <Package className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm">
              {batch.checklist_count > 1 ? 'Assets' : 'Asset'}
            </p>
            <p className="text-sm text-gray-600 line-clamp-2">{assetPreview}</p>
            {batch.checklist_count > 1 ? (
              <p className="text-xs text-gray-400 mt-1">
                +{batch.checklist_count - 1} more
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 pt-2 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-violet-600 hover:text-white"
            onClick={onView}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="hover:bg-violet-600 hover:text-white"
            aria-label="Download checklist PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
