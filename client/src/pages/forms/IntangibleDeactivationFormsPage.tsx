'use client';
import { useEffect, useState, useMemo } from 'react';
import { FileText, FileCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { AppDialogFrame, AppDialogGradientHeader, AppDialogBody } from '@/components/common/appDialogChrome';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function statusBadge(status: string) {
  if (status==='Approved') return 'bg-green-100 text-green-800 border-green-200';
  if (status==='Declined') return 'bg-red-100 text-red-800 border-red-200';
  if (status==='PendingHrApproval') return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}
function statusLabel(s: string) { if (s==='PendingHrApproval') return 'Pending HR Approval'; return s; }

function SignatureTable({ form }: { form: any }) {
  const fmt = (d: string | null) => d ? new Date(d).toLocaleString() : '—';
  return (
    <div className="border rounded-lg overflow-hidden text-sm">
      <div className="grid grid-cols-2 divide-x">
        <div className="p-3 bg-slate-50">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Requested By (User)</div>
          <div className="font-medium mt-1">{form.user?.first_name} {form.user?.last_name}</div>
          <div className="text-xs text-muted-foreground">{fmt(form.requestedAt)}</div>
          <div className="mt-2 font-mono text-xs break-all">{form.requesterSignature ? 'Signature: ' + String(form.requesterSignature).slice(0,40) : '—'}</div>
        </div>
        <div className="p-3 bg-white">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Department Head</div>
          <div className="font-medium mt-1">{form.deptHeadApproverName ?? (form.deptHeadSignedBy ? 'Signed' : 'Pending')}</div>
          <div className="text-xs text-muted-foreground">{fmt(form.deptHeadSignedAt)}</div>
          <div className="mt-2 font-mono text-xs break-all">{form.deptHeadSignature ? String(form.deptHeadSignature).slice(0,40) : 'Pending signature'}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x border-t">
        <div className="p-3 bg-slate-50">
          <div className="text-xs font-semibold text-muted-foreground uppercase">HR (Custodian Copy)</div>
          <div className="font-medium mt-1">{form.hrApproverName ?? (form.hrSignedBy ? 'Signed' : 'Pending')}</div>
          <div className="text-xs text-muted-foreground">{fmt(form.hrSignedAt)}</div>
          <div className="mt-2 font-mono text-xs break-all">{form.hrSignature ? String(form.hrSignature).slice(0,40) : 'Pending signature'}</div>
        </div>
        <div className="p-3 bg-white flex items-center justify-center text-xs text-muted-foreground">HR signature completes deactivation & regenerates accountability form/clearance</div>
      </div>
    </div>
  );
}

function FormCard({ form, onView }: { form: any; onView: (f: any)=>void }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono font-semibold text-sm">{form.formNumber}</span>
          <Badge variant="outline" className={statusBadge(form.status)}>{statusLabel(form.status)}</Badge>
        </div>
        <div className="text-sm">
          <div className="font-medium">{form.user?.first_name} {form.user?.last_name}</div>
          <div className="text-xs text-muted-foreground">{form.user?.email}</div>
        </div>
        <div className="text-xs">
          <div className="font-medium">Assets ({form.assets?.length ?? 0})</div>
          <div className="text-muted-foreground truncate">{(form.assets ?? []).map((a:any)=> a.name).join(', ') || '—'}</div>
        </div>
        {form.declineReason && <div className="text-xs text-red-600">Reason: {form.declineReason}</div>}
        <div className="text-xs text-muted-foreground">{new Date(form.created_at).toLocaleString()}</div>
        <Button size="sm" variant="outline" className="w-full" onClick={()=> onView(form)}>View</Button>
      </CardContent>
    </Card>
  );
}

export default function IntangibleDeactivationFormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<any | null>(null);

  const fetchForms = async () => {
    try { setLoading(true); const data: any = await api.get('/intangible-deactivations'); setForms(data.forms ?? []); }
    catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(()=> { fetchForms(); }, []);

  const filtered = useMemo(()=> {
    let list = forms;
    if (statusFilter!=='all') list = list.filter((f:any)=> f.status===statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f:any)=> f.formNumber.toLowerCase().includes(q) || `${f.user?.first_name} ${f.user?.last_name}`.toLowerCase().includes(q) || (f.assets ?? []).some((a:any)=> a.name.toLowerCase().includes(q)));
    }
    return list;
  }, [forms, search, statusFilter]);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader icon={FileText} title="Intangible Deactivation Forms" description="View all intangible asset deactivation requests" loading={loading} />
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 max-w-md">
            <Label className="text-sm mb-1.5 block">Search</Label>
            <Input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Form number, employee, asset..." />
          </div>
          <div className="w-[200px]">
            <Label className="text-sm mb-1.5 block">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="PendingHrApproval">Pending HR</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {loading ? <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div> :
          filtered.length===0 ? <div className="text-center py-12 text-muted-foreground">No forms found</div> :
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((f:any)=> <FormCard key={f.id} form={f} onView={setSelected} />)}
          </div>
        }
      </main>
      <Dialog open={!!selected} onOpenChange={o=> !o && setSelected(null)}>
        <AppDialogFrame className="max-w-3xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !rounded-lg !p-0">
          <AppDialogGradientHeader title="Intangible Deactivation Form" description={selected?.formNumber ?? ''} showCloseButton={false} className="!px-4 !pb-4 !pt-4" />
          <AppDialogBody className="flex-1 overflow-auto p-4 space-y-4">
            {selected && (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={statusBadge(selected.status)}>{statusLabel(selected.status)}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString()}</span>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-sm font-semibold mb-2">Assets to Deactivate ({selected.assets?.length ?? 0})</div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-muted-foreground border-b"><th className="text-left py-1">Name</th><th className="text-left">Type</th></tr></thead>
                    <tbody>{(selected.assets ?? []).map((a:any)=> <tr key={a.id} className="border-b last:border-0"><td className="py-1">{a.name}</td><td>{a.type}</td></tr>)}</tbody>
                  </table>
                </div>
                <SignatureTable form={selected} />
                {selected.declineReason && <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-2">Declined: {selected.declineReason}</div>}
                <div className="flex justify-end"><Button variant="outline" onClick={()=> setSelected(null)}>Close</Button></div>
              </>
            )}
          </AppDialogBody>
        </AppDialogFrame>
      </Dialog>
    </div>
  );
}
