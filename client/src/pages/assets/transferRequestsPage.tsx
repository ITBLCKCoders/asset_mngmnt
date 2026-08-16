'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AssetChecklistDialog,
  type AssetChecklistSubmitPayload,
} from '@/pages/assets/asset-issuance/components/AssetChecklistDialog';
import { filterComputerTypeAssets } from '@/utils/assetTypeDetection';
import { isIntangibleAssignedToUser } from '@/utils/intangibleAssets';
import type { Department } from '@/types/assets';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle,
  Eye,
  FileText,
  ImagePlus,
  Package,
  RefreshCw,
  User,
  XCircle,
  Layers,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  segmentTabsListClassName,
  segmentTabsTriggerClassName,
} from '@/components/ui/tabs';
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
import { FormTimeline } from '@/pages/profile/profileComponents/tabs/documentsTab';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';

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
  transfer_type?: string | null;
  signed_at?: string | null;
  signed_by?: string | null;
  processed_by?: string | null;
  process_signed_at?: string | null;
  dept_head_signed_at?: string | null;
  dept_head_user_name?: string | null;
  returns: Array<{
    assignment_id: string;
    return_condition?: string | null;
    return_notes?: string | null;
    condition_images?: string[] | null;
    assignment: {
      asset: { id: string; code: string; name: string; type_name?: string; category_name?: string };
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
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistStepIndex, setChecklistStepIndex] = useState(0);
  const [checklistAssets, setChecklistAssets] = useState<
    { id: string; name: string; type?: string; category?: string }[]
  >([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [intangibleAssets, setIntangibleAssets] = useState<any[]>([]);
  const [selectedIntangibleAssetIds, setSelectedIntangibleAssetIds] = useState<string[]>([]);
  const [intangibleNotes, setIntangibleNotes] = useState<Record<string, string>>({});
  const pendingTransferChecklistsRef = useRef<any[]>([]);
  const pendingExecuteTransferParamsRef = useRef<{
    formID: string;
    assetTransfers: any[];
    transferType: string;
    receivedBy: string;
    newAssignment: any;
    intangibleAssetItems?: { id: string; notes: string }[];
  } | null>(null);

  const fetchDepartments = async () => {
    try {
      const response = await api.get<{ departments?: Department[] }>(
        '/departments'
      );
      setDepartments(response.departments ?? []);
    } catch {
      setDepartments([]);
    }
  };

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

  const fetchIntangibleAssets = async () => {
    try {
      const response = await api.get('/intangible-assets');
      setIntangibleAssets(response || []);
    } catch (error) {
      console.error('Failed to fetch intangible assets:', error);
      setIntangibleAssets([]);
    }
  };

  useEffect(() => {
    fetchApproved();
    fetchDepartments();
    fetchIntangibleAssets();
  }, []);

  const handleView = (batch: ApprovedBatch) => {
    setSelectedBatch(batch);
    setSelectedIntangibleAssetIds([]);
    setIntangibleNotes({});
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

  const handleTransferChecklistNext = async (
    payload: AssetChecklistSubmitPayload
  ) => {
    const asset = checklistAssets[checklistStepIndex];
    const r = selectedBatch?.returns.find(
      ret => (ret.assignment?.asset?.id || ret.assignment_id) === asset.id
    );
    pendingTransferChecklistsRef.current.push({
      assignmentId: r?.assignment_id || '',
      employeeId: selectedBatch!.new_assigned_user_id,
      employeeName: selectedBatch!.new_assigned_user
        ? `${selectedBatch!.new_assigned_user.first_name} ${selectedBatch!.new_assigned_user.last_name}`
        : '',
      employeeDesignation: '',
      employeeDepartment:
        selectedBatch!.new_assigned_user?.department || '',
      employeeCompany: '',
      typeOnboarding: payload.typeOnboarding,
      typeOffboarding: payload.typeOffboarding,
      receivedBy: payload.receivedBy,
      checklistData: payload.checklistData,
      remarks: payload.remarks,
    });
    setChecklistStepIndex(prev => prev + 1);
  };

  const handleTransferChecklistFinalSubmit = async (
    payload: AssetChecklistSubmitPayload
  ) => {
    const asset = checklistAssets[checklistStepIndex];
    const r = selectedBatch?.returns.find(
      ret => (ret.assignment?.asset?.id || ret.assignment_id) === asset.id
    );
    pendingTransferChecklistsRef.current.push({
      assignmentId: r?.assignment_id || '',
      employeeId: selectedBatch!.new_assigned_user_id,
      employeeName: selectedBatch!.new_assigned_user
        ? `${selectedBatch!.new_assigned_user.first_name} ${selectedBatch!.new_assigned_user.last_name}`
        : '',
      employeeDesignation: '',
      employeeDepartment:
        selectedBatch!.new_assigned_user?.department || '',
      employeeCompany: '',
      typeOnboarding: payload.typeOnboarding,
      typeOffboarding: payload.typeOffboarding,
      receivedBy: payload.receivedBy,
      checklistData: payload.checklistData,
      remarks: payload.remarks,
    });

    setChecklistDialogOpen(false);

    const params = pendingExecuteTransferParamsRef.current;
    if (!params) return;

    pendingExecuteActionRef.current = async () => {
      setTransferring(true);
      try {
        await api.post(
          `/asset-transfers/forms/${params.formID}/execute`,
          {
            assetTransfers: params.assetTransfers,
            processSignature: {
              signed_at: new Date().toISOString(),
            },
            transferType: params.transferType,
            receivedBy: params.receivedBy,
            newAssignment: params.newAssignment,
            checklists: pendingTransferChecklistsRef.current,
            intangibleAssetItems: params.intangibleAssetItems,
          }
        );
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
    setShowOtpDialog(true);
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
                className="shadow-md border-slate-200 bg-white flex flex-col overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Shimmer className="h-10 w-10 rounded-xl" />
                      <div className="space-y-1.5">
                        <Shimmer className="h-5 w-36 rounded" />
                        <Shimmer className="h-3 w-24 rounded" />
                      </div>
                    </div>
                    <Shimmer className="h-5 w-20 rounded-full" />
                  </div>
                </CardHeader>
                <div className="mx-4 mb-2">
                  <Shimmer className="h-8 w-full rounded-lg" />
                </div>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Shimmer className="h-4 w-4 rounded-full" />
                        <Shimmer className="h-4 w-32 rounded" />
                      </div>
                    ))}
                  </div>
                </CardContent>
                <div className="p-4 mt-auto border-t border-slate-100">
                  <Shimmer className="h-9 w-full rounded-lg" />
                </div>
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
            {batches.map(batch => {
              const transferrerName = formatTransferFromNames(batch);
              return (
              <Card
                key={batch.formID}
                className="shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl">
                        <ArrowRightLeft className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {batch.form_number ?? batch.formID}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          Created{' '}
                          {batch.created_at &&
                          !isNaN(new Date(batch.created_at).getTime())
                            ? new Date(batch.created_at).toLocaleDateString()
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      {(batch.returns || []).length} asset
                      {(batch.returns || []).length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <Tabs
                  defaultValue="details"
                  className="flex-1 flex flex-col min-h-0"
                >
                  <TabsList
                    className={
                      segmentTabsListClassName +
                      ' mx-4 mb-2 grid grid-cols-2 w-[calc(100%-2rem)]'
                    }
                  >
                    <TabsTrigger
                      value="details"
                      className={segmentTabsTriggerClassName}
                    >
                      Details
                    </TabsTrigger>
                    <TabsTrigger
                      value="timeline"
                      className={segmentTabsTriggerClassName}
                    >
                      Timeline
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="mt-0 flex-1">
                    <CardContent className="space-y-4 flex-1 pt-0">
                      <div className="flex items-start gap-3">
                        <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {(batch.returns || []).length === 0
                              ? 'No assets'
                              : `${(batch.returns || []).length} asset${(batch.returns || []).length === 1 ? '' : 's'} transferred`}
                          </p>
                          {(batch.returns || []).length > 0 && (
                            <ul className="max-h-[120px] overflow-y-auto scrollbar-hide text-xs text-gray-600 mt-1 space-y-0.5 list-none">
                              {(batch.returns || []).map(r => (
                                <li
                                  key={r.assignment_id}
                                  className="flex items-center"
                                >
                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                                  <span className="truncate">
                                    {r.assignment?.asset?.name ??
                                      r.assignment?.asset?.code ??
                                      '—'}
                                    {r.assignment?.asset?.code && (
                                      <span className="text-gray-400 font-mono ml-1">
                                        ({r.assignment.asset.code})
                                      </span>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      {batch.new_assigned_user && (
                        <div className="flex items-start gap-3">
                          <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              Transferred to:{' '}
                              {[
                                batch.new_assigned_user.first_name,
                                batch.new_assigned_user.last_name,
                              ]
                                .filter(Boolean)
                                .join(' ') || '—'}
                            </p>
                          </div>
                        </div>
                      )}
                      {transferrerName && (
                        <div className="flex items-start gap-3">
                          <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              Transferrer: {transferrerName}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600">
                            Transfer date:{' '}
                            {batch.created_at &&
                            !isNaN(new Date(batch.created_at).getTime())
                              ? new Date(batch.created_at).toLocaleDateString() +
                                ' ' +
                                new Date(
                                  batch.created_at
                                ).toLocaleTimeString()
                              : '—'}
                          </p>
                        </div>
                      </div>
                      {batch.transfer_type && (
                        <div className="flex items-start gap-3">
                          <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600">
                              Transfer type: {batch.transfer_type}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </TabsContent>
                  <TabsContent value="timeline" className="mt-0 flex-1">
                    <CardContent className="pt-0">
                      <FormTimeline
                        type="transfer"
                        created_at={batch.created_at}
                        signerName={transferrerName}
                        dept_head_signed_at={
                          batch.dept_head_signed_at
                        }
                        dept_head_user_name={
                          batch.dept_head_user_name
                        }
                        process_signed_at={batch.process_signed_at}
                      />
                    </CardContent>
                  </TabsContent>
                </Tabs>
                <div className="flex gap-2 p-4 mt-auto border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(batch)}
                    className="flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View & Transfer
                  </Button>
                </div>
              </Card>
            );
            })}
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

                {(() => {
                  const transferrerId = selectedBatch.returns[0]?.assignment?.user?.id || '';
                  const assignedIntangibles = intangibleAssets.filter(a => isIntangibleAssignedToUser(a, transferrerId));
                  return (
                    <Tabs defaultValue="physical-assets" className="w-full">
                      <TabsList className={segmentTabsListClassName + ' grid grid-cols-1 w-full'}>
                        <TabsTrigger value="physical-assets" className={segmentTabsTriggerClassName + ' flex items-center gap-2'}>
                          <Package className="h-4 w-4" />
                          Physical Assets
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {(selectedBatch.returns || []).length}
                          </Badge>
                        </TabsTrigger>
                        </TabsList>

                      <TabsContent value="physical-assets" className="mt-4 space-y-4">
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
                                        src={proxyCloudinaryUrl(url)}
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
                      </TabsContent>

                    </Tabs>
                  );
                })()}

                {selectedIntangibleAssetIds.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase flex items-center gap-2 mb-4">
                      <Layers className="h-4 w-4 text-red-500" />
                      Intangible Assets ({selectedIntangibleAssetIds.length})
                    </Label>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-3 font-semibold text-slate-700">Name</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-700">Type</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-700">Description</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-700">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedIntangibleAssetIds.map(id => {
                            const asset = intangibleAssets.find(a => a.id === id);
                            if (!asset) return null;
                            return (
                              <tr key={id} className="border-b border-slate-100 last:border-0">
                                <td className="py-2 px-3 text-slate-900 font-medium">{asset.name}</td>
                                <td className="py-2 px-3">
                                  <Badge variant="outline" className={asset.type === 'IT scope' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-orange-100 text-orange-800 border-orange-200'}>
                                    {asset.type}
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 text-slate-600">{asset.description || '—'}</td>
                                <td className="py-2 px-3">
                                  <Textarea
                                    placeholder="Notes..."
                                    value={intangibleNotes[id] ?? ''}
                                    onChange={e => setIntangibleNotes(prev => ({ ...prev, [id]: e.target.value }))}
                                    className="border-slate-200 focus:border-red-500 focus:ring-red-500/20 rounded-lg resize-none text-xs"
                                    rows={2}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

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
                  if (!selectedBatch) return;

                  const transferType = transferTypeOffboarding
                    ? 'Transfer Offboarding'
                    : 'Transfer';

                  const assetTransfers = (
                    selectedBatch.returns || []
                  ).map(r => ({
                    assignmentId: r.assignment_id,
                    condition:
                      conditions[r.assignment_id] ||
                      r.return_condition ||
                      'Good',
                    notes:
                      notesByAssignment[r.assignment_id] ??
                      r.return_notes ??
                      '',
                    imageUrls:
                      imageUrlsByAssignment[r.assignment_id] ??
                      (Array.isArray(r.condition_images)
                        ? r.condition_images
                        : []),
                  }));

                  const intangibleAssetItems = selectedIntangibleAssetIds
                    .filter(id => intangibleAssets.some(ia => ia.id === id))
                    .map(id => ({
                      id,
                      notes: intangibleNotes[id] ?? '',
                    }));

                  const newAssignment = {
                    userId: selectedBatch.new_assigned_user_id,
                    departmentId: null,
                    locationId: null,
                    roomId: null,
                    roomName: null,
                  };

                  const mappedAssets = (
                    selectedBatch.returns || []
                  ).map(r => ({
                    id:
                      r.assignment?.asset?.id || r.assignment_id,
                    name: r.assignment?.asset?.name || '',
                    type: r.assignment?.asset?.type_name || '',
                    category:
                      r.assignment?.asset?.category_name || '',
                  }));
                  const computerReturns =
                    filterComputerTypeAssets(mappedAssets);

                  if (computerReturns.length > 0) {
                    pendingExecuteTransferParamsRef.current = {
                      formID: selectedBatch.formID,
                      assetTransfers,
                      transferType,
                      receivedBy,
                      newAssignment,
                      intangibleAssetItems: intangibleAssetItems.length > 0 ? intangibleAssetItems : undefined,
                    };
                    setChecklistAssets(computerReturns);
                    setChecklistStepIndex(0);
                    pendingTransferChecklistsRef.current = [];
                    setChecklistDialogOpen(true);
                    setShowConfirmDialog(false);
                    return;
                  }

                  pendingExecuteActionRef.current = async () => {
                    setTransferring(true);
                    try {
                      await api.post(
                        `/asset-transfers/forms/${selectedBatch.formID}/execute`,
                        {
                          assetTransfers,
                          processSignature: {
                            signed_at: new Date().toISOString(),
                          },
                          transferType,
                          receivedBy,
                          newAssignment,
                          intangibleAssetItems: intangibleAssetItems.length > 0 ? intangibleAssetItems : undefined,
                        }
                      );
                      toast.success(
                        'Transfer completed successfully'
                      );
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

        <AssetChecklistDialog
          isOpen={checklistDialogOpen}
          onOpenChange={open => {
            if (!open) {
              setChecklistDialogOpen(false);
              pendingTransferChecklistsRef.current = [];
            }
          }}
          onCancel={() => {
            pendingTransferChecklistsRef.current = [];
          }}
          checklistVariant="onboarding"
          selectedAssets={checklistAssets.map(a => a.id)}
          assets={checklistAssets}
          computerAssets={checklistAssets}
          currentIndex={checklistStepIndex}
          selectedUser={selectedBatch?.new_assigned_user_id || ''}
          users={
            selectedBatch
              ? [
                  {
                    userID: selectedBatch.new_assigned_user_id,
                    first_name:
                      selectedBatch.new_assigned_user?.first_name ||
                      '',
                    last_name:
                      selectedBatch.new_assigned_user?.last_name || '',
                    position: null,
                    department_id: '',
                    company: null,
                  },
                ]
              : []
          }
          departments={departments.map(d => ({
            departmentID: d.departmentID,
            name: d.name,
          }))}
          currentUserPosition={currentUser?.position || ''}
          onNext={handleTransferChecklistNext}
          onFinalSubmit={handleTransferChecklistFinalSubmit}
        />
      </main>
    </div>
  );
}
