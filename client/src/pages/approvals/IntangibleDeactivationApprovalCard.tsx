'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Download } from 'lucide-react';

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
  assets: Array<{ id: string; name: string; type: string }>;
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
  return (
    <Card className="hover:shadow-md transition-shadow border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={isHr ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800' : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800'}>
            {isHr ? 'HR Approval' : 'Dept Head'}
          </Badge>
          <span className="text-xs text-muted-foreground">{new Date(batch.created_at).toLocaleDateString()}</span>
        </div>
        <div>
          <div className="font-mono text-sm font-semibold">{batch.form_number}</div>
          <div className="text-sm font-medium">{userName}</div>
          <div className="text-xs text-muted-foreground">{batch.user_email}</div>
        </div>
        <div className="text-xs">
          <div className="font-medium">Assets ({batch.assets.length})</div>
          <div className="text-muted-foreground truncate">{batch.assets.map(a=> a.name).join(', ') || '—'}</div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 gap-1.5 bg-red-600 hover:bg-red-700" onClick={onView}><Eye className="h-4 w-4" /> View</Button>
          {onDownload && <Button size="sm" variant="outline" onClick={onDownload}><Download className="h-4 w-4" /></Button>}
        </div>
      </CardContent>
    </Card>
  );
}

export function mapIntangibleDeactivationRow(row: any, formType: 'intangible_deactivation' | 'intangible_deactivation_hr'): IntangibleDeactivationBatch {
  let assets: IntangibleDeactivationBatch['assets'] = [];
  try {
    const raw = row.assets_data;
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(data?.assets)) assets = data.assets.map((a:any)=> ({ id: String(a.id), name: a.name ?? a.id, type: a.type ?? '' }));
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
  };
}
