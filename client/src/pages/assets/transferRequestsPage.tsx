'use client';

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  CheckCircle,
  Eye,
  ImagePlus,
  Package,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Shimmer } from '@/components/ui/shimmer';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';

const MAX_CONDITION_IMAGES = 5;
const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

interface ApprovedBatch {
  formID: string;
  form_number: string;
  created_at: string;
  user_id: string;
  /** Wet-signed scan on file (`local` or URL), same idea as return forms */
  processor_wet_transfer_pdf_url?: string | null;
  new_assigned_user_id: string;
  new_assigned_user?: {
    first_name: string;
    last_name: string;
    department?: string | null;
  };
  returns: Array<{
    assignment_id: string;
    return_condition?: string | null;
    return_notes?: string | null;
    condition_images?: string[] | null;
    assignment: {
      asset: { id: string; code: string; name: string };
      /** Current assignee — transfer from (from GET approved-for-execution). */
      user?: {
        id?: string;
        first_name?: string | null;
        last_name?: string | null;
      };
    };
  }>;
}

/** Distinct current-holder names (assets transfer from this user / these users). */
function formatTransferFromNames(batch: ApprovedBatch): string {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const r of batch.returns || []) {
    const u = r.assignment?.user;
    if (!u) continue;
    const id =
      u.id ?? `${u.first_name ?? ''}|${u.last_name ?? ''}`;
    const label = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    if (label && !seen.has(id)) {
      seen.add(id);
      names.push(label);
    }
  }
  return names.length > 0 ? names.join(', ') : '—';
}

export default function TransferRequestsPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();
  const [batches, setBatches] = useState<ApprovedBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<ApprovedBatch | null>(
    null
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [receivedBy, setReceivedBy] = useState('');
  const [transferTypeTransfer, setTransferTypeTransfer] = useState(true);
  const [transferTypeOffboarding, setTransferTypeOffboarding] =
    useState(false);
  const [verificationTag, setVerificationTag] = useState(false);
  const [verificationCondition, setVerificationCondition] = useState(false);
  const [verificationConfirmSign, setVerificationConfirmSign] = useState(false);
  const [conditions, setConditions] = useState<Record<string, string>>({});
  /** Editable per assignment (same pattern as Assets Transfer confirmation dialog). */
  const [notesByAssignment, setNotesByAssignment] = useState<
    Record<string, string>
  >({});
  const [imageUrlsByAssignment, setImageUrlsByAssignment] = useState<
    Record<string, string[]>
  >({});
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const pendingExecuteActionRef = useRef<(() => Promise<void>) | null>(null);
  const [showReturnProcessBlockDialog, setShowReturnProcessBlockDialog] =
    useState(false);
  const [returnProcessBlockMessage, setReturnProcessBlockMessage] = useState('');

  const fetchApproved = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ assetTransferForms?: ApprovedBatch[] }>(
        '/asset-transfers/forms/approved-for-execution'
      );
      setBatches(res.assetTransferForms || []);
    } catch (e) {
      console.error('Failed to fetch approved transfer requests', e);
      toast.error('Failed to load transfer requests');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproved();
  }, []);

  const handleView = (batch: ApprovedBatch) => {
    setSelectedBatch(batch);
    setConditions(
      (batch.returns || []).reduce(
        (acc, r) => ({
          ...acc,
          [r.assignment_id]:
            r.return_condition && conditionOptions.includes(r.return_condition)
              ? r.return_condition
              : 'Good',
        }),
        {} as Record<string, string>
      )
    );
    setNotesByAssignment(
      (batch.returns || []).reduce(
        (acc, r) => ({
          ...acc,
          [r.assignment_id]: r.return_notes ?? '',
        }),
        {} as Record<string, string>
      )
    );
    setImageUrlsByAssignment(
      (batch.returns || []).reduce(
        (acc, r) => ({
          ...acc,
          [r.assignment_id]: Array.isArray(r.condition_images)
            ? [...r.condition_images]
            : [],
        }),
        {} as Record<string, string[]>
      )
    );
    setReceivedBy(currentUser?.position?.trim() || '');
    setTransferTypeTransfer(true);
    setTransferTypeOffboarding(false);
    setVerificationTag(false);
    setVerificationCondition(false);
    setVerificationConfirmSign(false);
    setShowConfirmDialog(true);
  };

  const handleExecuteTransfer = async () => {
    if (!selectedBatch) return;
    if (!receivedBy) {
      toast.error('Please select who received the assets');
      return;
    }
    const missing = (selectedBatch.returns || []).find(
      r => !conditions[r.assignment_id]
    );
    if (missing) {
      toast.error('Please set condition for all assets');
      return;
    }
    if (!transferTypeTransfer && !transferTypeOffboarding) {
      toast.error(
        'Please select Transfer Type (Transfer or Transfer Offboarding)'
      );
      return;
    }
    if (
      !verificationTag ||
      !verificationCondition ||
      !verificationConfirmSign
    ) {
      toast.error('Please complete all verification checkboxes');
      return;
    }

    const transferType = transferTypeOffboarding
      ? 'Transfer Offboarding'
      : 'Transfer';

    setTransferring(true);
    try {
      await api.post(`/asset-transfers/forms/${selectedBatch.formID}/execute`, {
        assetTransfers: (selectedBatch.returns || []).map(r => ({
          assignmentId: r.assignment_id,
          condition:
            conditions[r.assignment_id] || r.return_condition || 'Good',
          notes: notesByAssignment[r.assignment_id] ?? r.return_notes ?? '',
          imageUrls:
            imageUrlsByAssignment[r.assignment_id] ??
            (Array.isArray(r.condition_images) ? r.condition_images : []),
        })),
        processSignature: {
          signed_at: new Date().toISOString(),
        },
        transferType,
        receivedBy,
        newAssignment: {
          userId: selectedBatch.new_assigned_user_id,
          departmentId: null,
          locationId: null,
          roomId: null,
          roomName: null,
        },
      });
      toast.success('Transfer completed successfully');
      setShowConfirmDialog(false);
      setSelectedBatch(null);
      await fetchApproved();
    } catch (err: any) {
      const msg =
        err?.data?.error ||
        err?.response?.data?.error ||
        'Failed to execute transfer';
      if (
        typeof msg === 'string' &&
        msg
          .toLowerCase()
          .includes(
            'linked return form is processed by the processor'
          )
      ) {
        setReturnProcessBlockMessage(msg);
        setShowReturnProcessBlockDialog(true);
      }
      toast.error(msg);
    } finally {
      setTransferring(false);
    }
  };

  const handleConditionImageAdd = async (
    assignmentId: string,
    file: File
  ) => {
    const urls = imageUrlsByAssignment[assignmentId] ?? [];
    if (urls.length >= MAX_CONDITION_IMAGES) {
      toast.error(`Maximum ${MAX_CONDITION_IMAGES} photos per asset`);
      return;
    }
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post<{ url: string }>(
        '/asset-transfers/upload-condition-photo',
        formData
      );
      const url = res?.url;
      if (url) {
        setImageUrlsByAssignment(prev => ({
          ...prev,
          [assignmentId]: [...(prev[assignmentId] ?? []), url],
        }));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to upload image');
    }
  };

  const handleConditionImageRemove = (assignmentId: string, index: number) => {
    setImageUrlsByAssignment(prev => ({
      ...prev,
      [assignmentId]: (prev[assignmentId] ?? []).filter((_, i) => i !== index),
    }));
  };

  const conditionOptions = [
    'Excellent',
    'Good',
    'Fair',
    'Poor',
    'Damaged',
    'Needs Repair',
    'Obsolete',
  ];

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={ArrowRightLeft}
          title="Transfer Requests"
          description="Approved transfer requests ready to execute"
        >
          <Button
            variant="header"
            size="sm"
            onClick={() => navigate('/assets/transfer')}
          >
            Back to Asset Transfer
          </Button>
        </PageHeader>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={index}
                className="flex flex-col shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl border-l-4 border-l-gray-300"
              >
                <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <Shimmer className="h-6 w-24 rounded" />
                    <Shimmer className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Shimmer className="h-4 w-4 rounded" />
                    <Shimmer className="h-4 w-32 rounded" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-4">
                  <div className="space-y-1.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Shimmer className="h-4 w-20 rounded" />
                        <Shimmer className="h-4 w-16 rounded" />
                      </div>
                    ))}
                  </div>
                  <Shimmer className="h-9 w-full rounded-lg mt-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : batches.length === 0 ? (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4">
                <ArrowRightLeft className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No approved transfer requests
              </h3>
              <p className="text-gray-500 text-sm">
                Requests appear here after a Department Head approves a transfer request.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {batches.map(batch => (
              <Card
                key={batch.formID}
                className="flex flex-col shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl border-l-4 border-l-red-500 hover:shadow-2xl transition-shadow"
              >
                <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-900">
                      {batch.form_number ?? batch.formID}
                    </span>
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      {(batch.returns || []).length} asset
                      {(batch.returns || []).length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                    <User className="h-4 w-4 text-red-500" />
                    {batch.new_assigned_user
                      ? `${batch.new_assigned_user.first_name ?? ''} ${batch.new_assigned_user.last_name ?? ''}`.trim() ||
                        '—'
                      : '—'}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-4">
                  <ul className="text-sm space-y-1.5 list-disc list-inside text-slate-700">
                    {(batch.returns || []).slice(0, 5).map(r => (
                      <li key={r.assignment_id}>
                        <span className="font-mono text-slate-600">
                          {r.assignment?.asset?.code ??
                            r.assignment?.asset?.name ??
                            'Asset'}
                        </span>
                        <span className="text-slate-400">
                          {' '}
                          — {r.return_condition ?? '—'}
                        </span>
                      </li>
                    ))}
                    {(batch.returns || []).length > 5 && (
                      <li className="text-slate-400">
                        +{(batch.returns || []).length - 5} more
                      </li>
                    )}
                  </ul>
                  <Button
                    className="mt-auto w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-md"
                    size="sm"
                    onClick={() => handleView(batch)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View & Transfer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog
          open={showConfirmDialog}
          onOpenChange={open => {
            setShowConfirmDialog(open);
            if (!open) {
              setVerificationTag(false);
              setVerificationCondition(false);
              setVerificationConfirmSign(false);
              setTransferTypeTransfer(true);
              setTransferTypeOffboarding(false);
              setReceivedBy('');
              setNotesByAssignment({});
              setImageUrlsByAssignment({});
            }
          }}
        >
          <AppDialogFrame className="max-w-2xl w-[85vw] sm:w-[90vw] md:w-full max-h-[90vh] overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-3">
                  <ArrowRightLeft className="h-6 w-6 shrink-0 text-white" />
                  Asset Transfer Confirmation
                </span>
              }
              description="Assess condition and complete transfer details for each asset."
            />

            {selectedBatch && (
              <AppDialogBody className="max-h-[min(50vh,520px)] min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden sm:space-y-6">
                <div className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800">
                  Selected Assets: {(selectedBatch.returns || []).length}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Label className="text-sm font-semibold text-slate-800 uppercase">
                    Transfer Type <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Select one (required)
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <label
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all flex-1 min-w-[140px]',
                        transferTypeTransfer
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <Checkbox
                        checked={transferTypeTransfer}
                        onCheckedChange={c =>
                          setTransferTypeTransfer(Boolean(c))
                        }
                      />
                      <span className="text-sm font-medium">Transfer</span>
                    </label>
                    <label
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all flex-1 min-w-[140px]',
                        transferTypeOffboarding
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <Checkbox
                        checked={transferTypeOffboarding}
                        onCheckedChange={c =>
                          setTransferTypeOffboarding(Boolean(c))
                        }
                      />
                      <span className="text-sm font-medium">
                        Transfer Offboarding
                      </span>
                    </label>
                  </div>
                </div>

                {(selectedBatch.returns || []).map(r => (
                  <div
                    key={r.assignment_id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                        <Package className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {r.assignment?.asset?.name}
                        </h4>
                        <p className="text-sm text-slate-500 font-mono">
                          {r.assignment?.asset?.code}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">
                        Condition
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        {conditionOptions.map(opt => {
                          const sel =
                            (conditions[r.assignment_id] || 'Good') === opt;
                          return (
                            <div
                              key={opt}
                              role="button"
                              tabIndex={0}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded-lg cursor-pointer border-2',
                                sel
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              )}
                              onClick={() =>
                                setConditions(prev => ({
                                  ...prev,
                                  [r.assignment_id]: opt,
                                }))
                              }
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setConditions(prev => ({
                                    ...prev,
                                    [r.assignment_id]: opt,
                                  }));
                                }
                              }}
                            >
                              <CheckCircle
                                className={cn(
                                  'h-4 w-4',
                                  sel ? 'text-green-600' : 'text-slate-400'
                                )}
                              />
                              <span className="text-sm font-medium">{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Transfer Notes (optional)
                      </Label>
                      <Textarea
                        placeholder="Add notes..."
                        value={notesByAssignment[r.assignment_id] ?? ''}
                        onChange={e =>
                          setNotesByAssignment(prev => ({
                            ...prev,
                            [r.assignment_id]: e.target.value,
                          }))
                        }
                        className="mt-1 border-slate-200"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Transfer Condition Photos (up to {MAX_CONDITION_IMAGES})
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(imageUrlsByAssignment[r.assignment_id] ?? []).map(
                          (url, i) => (
                            <div key={`${url}-${i}`} className="relative group">
                              <img
                                src={url}
                                alt=""
                                className="h-20 w-20 object-cover rounded-lg border"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleConditionImageRemove(
                                    r.assignment_id,
                                    i
                                  )
                                }
                                className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          )
                        )}
                        {(imageUrlsByAssignment[r.assignment_id] ?? [])
                          .length < MAX_CONDITION_IMAGES && (
                          <label className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 cursor-pointer">
                            <input
                              type="file"
                              accept={VALID_IMAGE_TYPES.join(',')}
                              className="hidden"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f)
                                  handleConditionImageAdd(
                                    r.assignment_id,
                                    f
                                  );
                                e.target.value = '';
                              }}
                            />
                            <ImagePlus className="h-8 w-8 text-slate-400" />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <Label className="text-sm font-semibold text-slate-800 uppercase">
                    Request details
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Form</p>
                      <p className="font-mono font-medium text-slate-900 mt-0.5">
                        {selectedBatch.form_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">From</p>
                      <p className="text-slate-900 mt-0.5">
                        {formatTransferFromNames(selectedBatch)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Transfer to</p>
                      <p className="text-slate-900 mt-0.5">
                        {selectedBatch.new_assigned_user
                          ? `${selectedBatch.new_assigned_user.first_name} ${selectedBatch.new_assigned_user.last_name}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Label className="text-sm font-semibold text-slate-800 uppercase">
                    Received by <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Prefills from your profile job position; edit if needed.
                  </p>
                  <Input
                    className="mt-3 border-slate-200"
                    value={receivedBy}
                    onChange={e => setReceivedBy(e.target.value)}
                    placeholder="Position or role"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <Label className="text-sm font-semibold text-slate-800 uppercase block">
                    Verification
                  </Label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={verificationTag}
                      onCheckedChange={c => setVerificationTag(Boolean(c))}
                    />
                    <span className="text-sm">
                      All assets are tagged and accounted for
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={verificationCondition}
                      onCheckedChange={c =>
                        setVerificationCondition(Boolean(c))
                      }
                    />
                    <span className="text-sm">
                      Condition of each asset has been verified
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={verificationConfirmSign}
                      onCheckedChange={c =>
                        setVerificationConfirmSign(Boolean(c))
                      }
                    />
                    <span className="text-sm">
                      I sign this form confirming and approving this asset
                      transfer
                    </span>
                  </label>
                  <p className="text-sm text-slate-600">
                    All selected assets will be transferred.
                  </p>
                </div>
              </AppDialogBody>
            )}

            <AppDialogChromeFooter className="justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={transferring}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  pendingExecuteActionRef.current = async () => {
                    await handleExecuteTransfer();
                  };
                  setShowOtpDialog(true);
                }}
                disabled={
                  transferring ||
                  !receivedBy ||
                  (!transferTypeTransfer && !transferTypeOffboarding) ||
                  !verificationTag ||
                  !verificationCondition ||
                  !verificationConfirmSign ||
                  (selectedBatch?.returns || []).some(
                    r => !conditions[r.assignment_id]
                  )
                }
              >
                {transferring ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Transferring...
                  </span>
                ) : (
                  'Transfer'
                )}
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <Dialog
          open={showReturnProcessBlockDialog}
          onOpenChange={setShowReturnProcessBlockDialog}
        >
          <AppDialogFrame className="max-w-md w-[92vw] sm:w-full">
            <AppDialogGradientHeader
              title="Transfer blocked"
              description="Process the linked return form first."
            />
            <AppDialogBody className="space-y-3">
              <p className="text-sm text-slate-700">
                {returnProcessBlockMessage ||
                  'This transfer cannot be processed yet because the linked return form is not yet processed by the processor.'}
              </p>
            </AppDialogBody>
            <AppDialogChromeFooter className="justify-end">
              <Button onClick={() => setShowReturnProcessBlockDialog(false)}>
                OK
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <SmsOtpDialog
          isOpen={showOtpDialog}
          onOpenChange={setShowOtpDialog}
          sendOtpEndpoint="/auth/initials/send-otp"
          verifyOtpEndpoint="/auth/initials/verify-otp"
          onVerified={() => {
            setShowOtpDialog(false);
            pendingExecuteActionRef.current = null;
          }}
          onCancel={() => {
            pendingExecuteActionRef.current = null;
            setShowOtpDialog(false);
          }}
          pendingActionRef={pendingExecuteActionRef}
          title="OTP SMS Verification"
          description="OTP SMS Verification has been sent to your registered mobile number for transfer processing confirmation."
          verifyButtonLabel="Verify & Process Transfer"
          phoneNumber={
            (currentUser as { contactNumber?: string })?.contactNumber
          }
        />
      </main>
    </div>
  );
}
