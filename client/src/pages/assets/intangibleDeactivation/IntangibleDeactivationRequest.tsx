'use client';
import { useEffect, useState, useMemo } from 'react';
import { Package, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';

export default function IntangibleDeactivationRequest() {
  const { user: currentUser } = useCurrentUser();
  const [intangibles, setIntangibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [myForms, setMyForms] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [intangRes, formsRes] = await Promise.all([
        api.get('/intangible-assets').catch(() => [] as any),
        api.get('/intangible-deactivations/my').catch(() => ({ forms: [] } as any)),
      ]);
      const list: any[] = Array.isArray(intangRes) ? intangRes : (intangRes as any)?.data ?? intangRes ?? [];
      // filter to only those assigned to current user and active
      const filtered = (Array.isArray(list) ? list : []).filter((ia: any) => {
        if (!ia) return false;
        const assignees: any[] = ia.assignees ?? ia.assignee ?? [];
        // some APIs return assignees as array of {userId}
        const isAssigned = assignees.some((a: any) => String(a.userId ?? a.id ?? a.user_id) === String(currentUser?.id));
        // fallback: if no assignee filter, show all available assigned? Use status
        if (assignees.length === 0) return ia.status === 'assigned';
        return isAssigned;
      });
      // if filtering yields 0 but user has assignment, fallback to show those where status assigned and type matches
      const finalList = filtered.length > 0 ? filtered : (Array.isArray(list) ? list : []).filter((ia: any) => {
        if (!currentUser?.id) return false;
        const assignees: any[] = ia.assignees ?? [];
        return assignees.some((a: any) => String(a.userId ?? a.id) === String(currentUser.id));
      });
      setIntangibles(finalList);
      setMyForms((formsRes as any)?.forms ?? []);
    } catch (e) { console.error(e); toast.error('Failed to load intangibles'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser]);

  const filteredIntangibles = useMemo(() => {
    if (!search.trim()) return intangibles;
    const q = search.toLowerCase();
    return intangibles.filter((ia: any) => (ia.name ?? '').toLowerCase().includes(q) || (ia.type ?? '').toLowerCase().includes(q) || (ia.description ?? '').toLowerCase().includes(q));
  }, [intangibles, search]);

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(filteredIntangibles.map((ia: any) => String(ia.id)));
    else setSelectedIds([]);
  };

  const allSelected = filteredIntangibles.length > 0 && filteredIntangibles.every((ia: any) => selectedIds.includes(String(ia.id)));

  const handleSubmit = async (otpVerified?: boolean) => {
    if (selectedIds.length === 0) { toast.error('Select at least one intangible asset'); return; }
    if (!currentUser?.digitalSignature) { toast.error('Digital signature not set in profile'); return; }
    // require OTP gate
    if (!otpVerified) { setShowOtp(true); return; }
    setSubmitting(true);
    try {
      await api.post('/intangible-deactivations', { intangibleAssetIds: selectedIds, digitalSignature: currentUser.digitalSignature, remarks: remarks || undefined });
      toast.success(`Deactivation request submitted for ${selectedIds.length} asset(s)`);
      setSelectedIds([]); setRemarks('');
      fetchData();
    } catch (e: any) { toast.error(e?.data?.error || e?.message || 'Failed to submit'); }
    finally { setSubmitting(false); setShowOtp(false); }
  };

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'select',
      header: () => <Checkbox checked={allSelected} onCheckedChange={v => toggleAll(Boolean(v))} />,
      cell: ({ row }) => <Checkbox checked={selectedIds.includes(String(row.original.id))} onCheckedChange={v => toggleSelect(String(row.original.id), Boolean(v))} />,
      size: 50,
    },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => <span className="text-sm text-muted-foreground truncate max-w-[300px] inline-block">{row.original.description ?? '-'}</span> },
  ], [selectedIds, allSelected, filteredIntangibles]);

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader icon={Package} title="Intangible Deactivation" description="Request deactivation of your assigned intangible assets" />

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> My Intangible Assets</CardTitle>
            <p className="text-sm text-muted-foreground">Select the intangible assets you want to deactivate. Your request will be routed to your approver and then to HR.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="Search name, type..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
              <div className="ml-auto flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{selectedIds.length} selected</span>
                {selectedIds.length > 0 && <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>Clear</Button>}
              </div>
            </div>
            {loading ? <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div> :
              filteredIntangibles.length === 0 ? <div className="text-center py-10 text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>No intangible assets assigned to you</p></div> :
              <DataTable columns={columns} data={filteredIntangibles} />}
            {selectedIds.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="space-y-1.5">
                  <Label>Remarks (optional)</Label>
                  <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Reason for deactivation" rows={2} />
                </div>
                <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Your request will go to <b>Approver/Sub-Approver</b> → then <b>HR Custodian</b>. On HR approval, the asset(s) will be removed from your accountability.</span>
                </div>
                <Button onClick={() => handleSubmit()} disabled={submitting} className="bg-red-600 hover:bg-red-700 gap-2">
                  <CheckCircle2 className="h-4 w-4" /> {submitting ? 'Submitting...' : `Request Deactivation (${selectedIds.length})`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {myForms.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">My Recent Deactivation Requests</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {myForms.slice(0, 5).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                    <span className="font-mono font-medium">{f.formNumber}</span>
                    <Badge variant={f.status==='Approved'?'default': f.status==='Declined'?'destructive':'secondary'}>{f.status}</Badge>
                    <span className="text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <SmsOtpDialog isOpen={showOtp} onOpenChange={setShowOtp} onVerified={() => handleSubmit(true)} onCancel={() => setShowOtp(false)} pendingActionRef={{ current: null } as any} title="Verify to submit" description="Enter OTP to confirm deactivation request" />
    </div>
  );
}
