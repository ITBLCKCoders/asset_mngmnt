'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  User,
  RefreshCw,
  Eye,
  RotateCcw,
  Package,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  ImagePlus,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import {
  generateAccountabilityFormPDF,
  type AccountabilityForm,
} from '@/pages/assets/accountability/accountabilityForm';
import type { Department, Location } from '@/types/assets';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { useRef } from 'react';

const conditionOptions = [
  {
    value: 'Excellent',
    label: 'Excellent',
    icon: CheckCircle,
    color: 'text-green-600',
  },
  { value: 'Good', label: 'Good', icon: CheckCircle, color: 'text-blue-600' },
  {
    value: 'Fair',
    label: 'Fair',
    icon: AlertTriangle,
    color: 'text-yellow-600',
  },
  {
    value: 'Poor',
    label: 'Poor',
    icon: AlertTriangle,
    color: 'text-orange-600',
  },
  { value: 'Damaged', label: 'Damaged', icon: XCircle, color: 'text-red-600' },
];

const MAX_CONDITION_IMAGES = 5;
const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const MAX_IMAGE_SIZE_MB = 5;

type PendingReturn = {
  assignment_id: string;
  return_condition: string | null;
  return_notes: string | null;
  condition_images?: string[] | null;
  return_department_id?: string | null;
  return_location_id?: string | null;
  return_location_room_id?: string | null;
  assignment?: {
    assignmentID: string;
    asset?: { code?: string; name?: string; id?: string };
    user?: { first_name?: string; last_name?: string };
  };
};

type PendingForm = {
  formID: string;
  form_number: string | null;
  created_at: string;
  user_id: string;
  return_type?: string | null;
  processor_wet_return_pdf_url?: string | null;
  returns: PendingReturn[];
};

export default function ReturnRequestsPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();
  const [forms, setForms] = useState<PendingForm[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [processForm, setProcessForm] = useState<PendingForm | null>(null);
  const [processorConditions, setProcessorConditions] = useState<
    Record<string, string>
  >({});
  const [processorNotes, setProcessorNotes] = useState<Record<string, string>>(
    {}
  );
  const [processorConditionImages, setProcessorConditionImages] = useState<
    Record<string, string[]>
  >({});
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [returnTypeReturned, setReturnTypeReturned] = useState(false);
  const [returnTypeOffboarding, setReturnTypeOffboarding] = useState(false);
  const [assignToProcessor, setAssignToProcessor] = useState(false);
  const [verificationTag, setVerificationTag] = useState(false);
  const [verificationCondition, setVerificationCondition] = useState(false);
  const [verificationConfirmSign, setVerificationConfirmSign] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);
  const [showNextStepsDialog, setShowNextStepsDialog] = useState(false);
  const [nextStepsReturnerUserId, setNextStepsReturnerUserId] = useState<
    string | null
  >(null);
  const [downloadingNextAccountability, setDownloadingNextAccountability] =
    useState(false);
  const [sharedReturnDepartmentId, setSharedReturnDepartmentId] =
    useState<string>('');
  const [sharedReturnLocationId, setSharedReturnLocationId] =
    useState<string>('');
  const [sharedReturnAreaId, setSharedReturnAreaId] = useState<string>('');
  const [smsOtpDialogOpen, setSmsOtpDialogOpen] = useState(false);
  const [smsOtpDialogDeclineOpen, setSmsOtpDialogDeclineOpen] = useState(false);
  const pendingProcessActionRef = useRef<(() => Promise<void>) | null>(null);
  const pendingDeclineActionRef = useRef<(() => Promise<void>) | null>(null);

  // Close parent dialog when SMS OTP dialog opens to prevent scrollbar issues
  useEffect(() => {
    if (smsOtpDialogOpen || smsOtpDialogDeclineOpen) {
      setProcessForm(null);
    }
  }, [smsOtpDialogOpen, smsOtpDialogDeclineOpen]);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ assetReturnForms?: PendingForm[] }>(
        '/asset-returns/forms/pending-staff'
      );
      setForms(res.assetReturnForms ?? []);
    } catch (e) {
      console.error('Failed to fetch pending return requests', e);
      toast.error('Failed to load return requests');
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get<{ departments?: Department[] }>(
        '/departments'
      );
      setDepartments(response.departments ?? []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get<{ locations?: Location[] }>('/locations');
      setLocations(response.locations ?? []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchDepartments();
    fetchLocations();
  }, []);

  // Note: wet-upload notification deep-link is handled on `/assets/return`
  // (processors may not have `Return Request` permission).

  const openProcessModal = (form: PendingForm) => {
    setProcessForm(form);
    const initialConditions: Record<string, string> = {};
    const initialNotes: Record<string, string> = {};
    const initialConditionImages: Record<string, string[]> = {};
    const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
    form.returns.forEach(r => {
      const aid = r.assignment?.assignmentID ?? r.assignment_id;
      initialConditions[aid] =
        r.return_condition && validConditions.includes(r.return_condition)
          ? r.return_condition
          : 'Good';
      initialNotes[aid] = r.return_notes ?? '';
      initialConditionImages[aid] = Array.isArray(r.condition_images)
        ? r.condition_images
            .filter((img): img is string => typeof img === 'string')
            .slice(0, MAX_CONDITION_IMAGES)
        : [];
    });
    setProcessorConditions(initialConditions);
    setProcessorNotes(initialNotes);
    setProcessorConditionImages(initialConditionImages);
    setSharedReturnDepartmentId('');
    setSharedReturnLocationId('');
    setSharedReturnAreaId('');
    setExpandedAssets(
      new Set(form.returns.map(r => r.assignment?.asset?.id ?? r.assignment_id))
    );
    const rawRt = String(
      form.return_type ??
        (form as { returnType?: string | null }).returnType ??
        ''
    );
    const rt = rawRt.toLowerCase();
    setReturnTypeReturned(
      rt.includes('returned') ||
        rt === 'return' ||
        rt.includes('regular return')
    );
    setReturnTypeOffboarding(rt.includes('offboarding'));
    setAssignToProcessor(false);
    setVerificationTag(false);
    setVerificationCondition(false);
    setVerificationConfirmSign(false);
  };

  const toggleAssetExpansion = (assetId: string) => {
    setExpandedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const setConditionForAssignment = (
    assignmentId: string,
    condition: string
  ) => {
    setProcessorConditions(prev => ({ ...prev, [assignmentId]: condition }));
  };

  const setNotesForAssignment = (assignmentId: string, notes: string) => {
    setProcessorNotes(prev => ({ ...prev, [assignmentId]: notes }));
  };

  const handleImageAdd = async (assignmentId: string, file: File) => {
    const currentCount = processorConditionImages[assignmentId]?.length ?? 0;
    if (currentCount >= MAX_CONDITION_IMAGES) {
      toast.error(`Maximum ${MAX_CONDITION_IMAGES} photos per asset`);
      return;
    }
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post<{ url: string }>(
        '/asset-returns/upload-condition-photo',
        formData
      );
      const url = res?.url;
      if (!url) {
        toast.error('Upload succeeded but no image URL was returned.');
        return;
      }

      setProcessorConditionImages(prev => ({
        ...prev,
        [assignmentId]: [...(prev[assignmentId] ?? []), url],
      }));
    } catch (err: unknown) {
      const error = err as { data?: { error?: string }; message?: string };
      toast.error(error?.data?.error || error?.message || 'Upload failed');
    }
  };

  const handleImageRemove = (assignmentId: string, index: number) => {
    setProcessorConditionImages(prev => ({
      ...prev,
      [assignmentId]: (prev[assignmentId] ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleProcessSubmit = async () => {
    if (!processForm) return;
    const allSelected = processForm.returns.every(r => {
      const aid = r.assignment?.assignmentID ?? r.assignment_id;
      return processorConditions[aid];
    });
    if (!allSelected) {
      toast.error('Please select condition for each asset');
      return;
    }
    if (!returnTypeReturned && !returnTypeOffboarding) {
      toast.error('Please select at least one return type');
      return;
    }
    if (!sharedReturnDepartmentId || !sharedReturnLocationId) {
      toast.error('Please select a return location for all assets');
      return;
    }
    const selectedLocation = locations.find(
      location => location.locationID === sharedReturnLocationId
    );
    const hasRooms = selectedLocation?.room_areas?.some(r => r && r.room_name);
    if (hasRooms && !sharedReturnAreaId) {
      toast.error('Please select a room/area for the return location');
      return;
    }
    if (
      !verificationTag ||
      !verificationCondition ||
      !verificationConfirmSign ||
      !assignToProcessor
    ) {
      toast.error(
        'Please complete all verification checkboxes, including assigning returned assets to you when processing'
      );
      return;
    }

    const assetReturns = processForm.returns.map(r => {
      const aid = r.assignment?.assignmentID ?? r.assignment_id;
      return {
        assignmentId: aid,
        condition: processorConditions[aid] ?? 'Good',
        notes: processorNotes[aid] ?? '',
        imageUrls: processorConditionImages[aid] ?? [],
        returnDepartmentId: sharedReturnDepartmentId,
        returnLocationId: sharedReturnLocationId,
        returnAreaId: sharedReturnAreaId || undefined,
      };
    });

    const returnTypeParts: string[] = [];
    if (returnTypeReturned) returnTypeParts.push('Returned');
    if (returnTypeOffboarding) returnTypeParts.push('Offboarding');
    const returnType = returnTypeParts.join(',');

    // Set the pending action and open SMS OTP dialog
    pendingProcessActionRef.current = async () => {
      setSubmitting(true);
      try {
        const processRes = await api.post<{
          returnerHasRemainingAssets?: boolean;
        }>(`/asset-returns/forms/${processForm.formID}/process`, {
          processSignature: {
            signed_at: new Date().toISOString(),
          },
          assetReturns,
          returnType: returnType || undefined,
          assignToProcessor,
          receivedBy: assignToProcessor ? (currentUser?.id ?? null) : null,
        });
        toast.success('Return processed successfully');
        setProcessForm(null);
        await fetchPending();
      } catch (err: unknown) {
        const e = err as { data?: { error?: string } };
        toast.error(e?.data?.error ?? 'Failed to process return');
      } finally {
        setSubmitting(false);
      }
    };
    setSmsOtpDialogOpen(true);
  };

  const returnerName = (form: PendingForm) => {
    const u = form.returns[0]?.assignment?.user;
    if (!u) return 'Unknown';
    return [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown';
  };

  const allConditionsSelected =
    !!processForm &&
    processForm.returns.every(r => {
      const aid = r.assignment?.assignmentID ?? r.assignment_id;
      return !!processorConditions[aid];
    });
  const allLocationsSelected = Boolean(
    sharedReturnDepartmentId && sharedReturnLocationId
  );
  const sharedLocationForRooms = locations.find(
    loc => loc.locationID === sharedReturnLocationId
  );
  const sharedLocationHasRooms = sharedLocationForRooms?.room_areas?.some(
    r => r && r.room_name
  );
  const allRoomsSelected =
    !sharedLocationHasRooms || Boolean(sharedReturnAreaId);
  const getSharedAvailableLocations = () => {
    if (!sharedReturnDepartmentId) return [];
    return locations.filter(
      loc => loc.department_id === sharedReturnDepartmentId
    );
  };
  const getSharedAvailableRooms = () => {
    if (!sharedReturnLocationId) return [];
    const loc = locations.find(l => l.locationID === sharedReturnLocationId);
    return loc?.room_areas?.filter(r => r && r.room_name) || [];
  };
  const canSubmit =
    allConditionsSelected &&
    allLocationsSelected &&
    allRoomsSelected &&
    (returnTypeReturned || returnTypeOffboarding) &&
    verificationTag &&
    verificationCondition &&
    verificationConfirmSign &&
    assignToProcessor;

  const handleDownloadNextAccountability = async () => {
    if (!nextStepsReturnerUserId) {
      toast.error('Unable to resolve return requestor for accountability download');
      return;
    }
    try {
      setDownloadingNextAccountability(true);
      const listRes = await api.get<{ forms?: AccountabilityForm[] }>(
        `/accountability-forms?userId=${nextStepsReturnerUserId}`
      );
      const forms = Array.isArray(listRes?.forms) ? listRes.forms : [];
      const activeForms = forms.filter(
        f => f.status !== 'Disabled' && f.status !== 'Declined'
      );
      if (activeForms.length === 0) {
        toast.error('No active accountability form found for this requestor');
        return;
      }

      activeForms.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const target = activeForms[0];
      if (!target?.id) {
        toast.error('Could not determine accountability form to download');
        return;
      }

      const formRes = await api.get<{ form?: AccountabilityForm }>(
        `/accountability-forms/${target.id}`
      );
      const form = formRes?.form;
      if (!form) {
        toast.error('Could not load accountability form details');
        return;
      }
      const pdfBlob = await generateAccountabilityFormPDF(form, currentUser);
      const fileName = `Asset_Accountability_Form_${form.formNumber || form.id}_${Date.now()}.pdf`;
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Accountability form downloaded successfully');
    } catch (error) {
      console.error('Failed to download accountability form:', error);
      toast.error('Failed to download accountability form');
    } finally {
      setDownloadingNextAccountability(false);
    }
  };

  const handleDeclineSubmit = async () => {
    if (!processForm) return;
    const r = declineReason.trim();
    if (!r) {
      toast.error('Please enter a decline reason');
      return;
    }
    
    // Set the pending action and open SMS OTP dialog
    pendingDeclineActionRef.current = async () => {
      setDeclining(true);
      try {
        await api.post(
          `/asset-returns/forms/${processForm.formID}/processor-decline`,
          { reason: r }
        );
        toast.success('Return request declined');
        setDeclineDialogOpen(false);
        setDeclineReason('');
        setProcessForm(null);
        await fetchPending();
      } catch (err: unknown) {
        const e = err as { data?: { error?: string } };
        toast.error(e?.data?.error ?? 'Failed to decline return');
      } finally {
        setDeclining(false);
      }
    };
    setSmsOtpDialogDeclineOpen(true);
  };

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={ClipboardList}
          title="Return Requests"
          description="Process return requests approved by Department Head"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/assets/return')}
            >
              Back to Asset Return
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchPending}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </PageHeader>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : forms.length === 0 ? (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending return requests. Requests appear here after a
              Department Head approves a return request.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forms.map(form => (
              <Card
                key={form.formID}
                className="flex flex-col shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl border-l-4 border-l-red-500 hover:shadow-2xl transition-shadow"
              >
                <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-900">
                      {form.form_number ?? form.formID}
                    </span>
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      {form.returns.length} asset
                      {form.returns.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                    <User className="h-4 w-4 text-red-500" />
                    {returnerName(form)}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-4">
                  <ul className="text-sm space-y-1.5 list-disc list-inside text-slate-700">
                    {form.returns.slice(0, 5).map(r => (
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
                    {form.returns.length > 5 && (
                      <li className="text-slate-400">
                        +{form.returns.length - 5} more
                      </li>
                    )}
                  </ul>
                  <Button
                    className="mt-auto w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-md"
                    size="sm"
                    onClick={() => openProcessModal(form)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View / Return Asset
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Asset Return Confirmation – same as Asset Return page */}
        <Dialog
          open={!!processForm}
          onOpenChange={open => {
            if (!open) {
              setProcessForm(null);
              setSharedReturnDepartmentId('');
              setSharedReturnLocationId('');
              setSharedReturnAreaId('');
            }
          }}
        >
          <AppDialogFrame className={`max-w-2xl w-[85vw] sm:w-[90vw] md:w-full max-h-[90vh] overflow-hidden !flex !flex-col ${smsOtpDialogOpen || smsOtpDialogDeclineOpen ? '!overflow-hidden' : ''}`}>
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-3">
                  <RotateCcw className="h-6 w-6 shrink-0 text-white" />
                  Asset Return Confirmation
                </span>
              }
              description="Please assess the condition of each asset and add any notes."
            />

            {processForm && (
              <>
                <AppDialogBody className={`max-h-[min(50vh,520px)] min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden sm:space-y-6 ${smsOtpDialogOpen || smsOtpDialogDeclineOpen ? '!overflow-hidden' : ''}`}>
                  <div className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800">
                    Form: {processForm.form_number ?? processForm.formID} ·
                    Returner: {returnerName(processForm)} ·{' '}
                    {processForm.returns.length} asset
                    {processForm.returns.length !== 1 ? 's' : ''}
                  </div>

                  {processForm.processor_wet_return_pdf_url?.trim() ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 sm:flex-row sm:items-center sm:justify-between -mx-3">
                      <span className="text-sm text-emerald-950 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        Return form ready for processing.
                      </span>
                    </div>
                  ) : null}

                  {/* Return Type */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 transition-shadow hover:shadow-md">
                    <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase">
                      Return Type
                    </Label>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <label
                        htmlFor="return-type-returned-req"
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 flex-1 min-w-[140px]',
                          returnTypeReturned
                            ? 'border-red-500 bg-red-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <Checkbox
                          id="return-type-returned-req"
                          checked={returnTypeReturned}
                          onCheckedChange={v => setReturnTypeReturned(!!v)}
                        />
                        <span className="text-sm font-medium text-slate-800">
                          Returned
                        </span>
                      </label>
                      <label
                        htmlFor="return-type-offboarding-req"
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 flex-1 min-w-[140px]',
                          returnTypeOffboarding
                            ? 'border-red-500 bg-red-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <Checkbox
                          id="return-type-offboarding-req"
                          checked={returnTypeOffboarding}
                          onCheckedChange={v => setReturnTypeOffboarding(!!v)}
                        />
                        <span className="text-sm font-medium text-slate-800">
                          Offboarding
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Asset Cards – same as Asset Return page */}
                  {processForm.returns.map(r => {
                    const aid = r.assignment?.assignmentID ?? r.assignment_id;
                    const assetId = r.assignment?.asset?.id ?? aid;
                    const assetName = r.assignment?.asset?.name ?? 'Asset';
                    const assetCode = r.assignment?.asset?.code ?? '';
                    const condition = processorConditions[aid] ?? 'Good';
                    const notes = processorNotes[aid] ?? '';
                    const conditionImages =
                      processorConditionImages[aid] ?? [];
                    const isExpanded = expandedAssets.has(assetId);

                    return (
                      <div
                        key={aid}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 space-y-3 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              <Package className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900">
                                {assetName}
                              </h4>
                              <p className="text-sm text-slate-500 font-mono">
                                {assetCode}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleAssetExpansion(assetId)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-600" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-600" />
                            )}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="space-y-5 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-3">
                              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-red-500" />
                                Asset Condition
                              </Label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {conditionOptions.map(opt => {
                                  const IconComponent = opt.icon;
                                  const isSelected = condition === opt.value;
                                  return (
                                    <div
                                      key={opt.value}
                                      className={cn(
                                        'flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer',
                                        isSelected
                                          ? 'border-2 border-red-500 bg-red-50 shadow-sm'
                                          : 'border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                      )}
                                      onClick={() =>
                                        setConditionForAssignment(
                                          aid,
                                          opt.value
                                        )
                                      }
                                    >
                                      <div
                                        className={cn(
                                          'h-4 w-4 rounded-full border-2',
                                          isSelected
                                            ? 'bg-red-500 border-red-500'
                                            : 'border-gray-300'
                                        )}
                                      />
                                      <IconComponent
                                        className={cn(
                                          'h-5 w-5 shrink-0',
                                          isSelected
                                            ? opt.color
                                            : 'text-slate-400'
                                        )}
                                      />
                                      <span className="font-medium text-slate-800">
                                        {opt.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-700">
                                Return Notes{' '}
                                <span className="text-slate-400 font-normal">
                                  (optional)
                                </span>
                              </Label>
                              <Textarea
                                placeholder="Add notes about this asset's return..."
                                value={notes}
                                onChange={e =>
                                  setNotesForAssignment(aid, e.target.value)
                                }
                                className="border-slate-200 focus:border-red-500 focus:ring-red-500/20 rounded-lg resize-none"
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-700">
                                Return Condition Photos{' '}
                                <span className="text-slate-400 font-normal">
                                  (optional, up to {MAX_CONDITION_IMAGES})
                                </span>
                              </Label>
                              <div className="flex flex-wrap gap-2 items-start">
                                {conditionImages.map((url, idx) => (
                                  <div
                                    key={`${aid}-condition-image-${idx}`}
                                    className="relative group"
                                  >
                                    <button
                                      type="button"
                                      className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                                      onClick={() => window.open(url, '_blank')}
                                    >
                                      <img
                                        src={url}
                                        alt={`Return condition photo ${idx + 1}`}
                                        className="h-20 w-20 object-cover"
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleImageRemove(aid, idx)
                                      }
                                      className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                      aria-label="Remove photo"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                                {conditionImages.length <
                                  MAX_CONDITION_IMAGES && (
                                  <label className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition-colors">
                                    <input
                                      type="file"
                                      accept={VALID_IMAGE_TYPES.join(',')}
                                      className="hidden"
                                      onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageAdd(aid, file);
                                        e.target.value = '';
                                      }}
                                    />
                                    <ImagePlus className="h-8 w-8 text-slate-400" />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 space-y-3 transition-shadow hover:shadow-md">
                    <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      Return Location (all assets)
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-600">
                          Department
                        </Label>
                        <Select
                          value={sharedReturnDepartmentId}
                          onValueChange={value => {
                            setSharedReturnDepartmentId(value);
                            setSharedReturnLocationId('');
                            setSharedReturnAreaId('');
                          }}
                        >
                          <SelectTrigger className="border-slate-200 focus:border-red-500 focus:ring-red-500/20 rounded-lg">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent className="bg-white z-[200] max-h-60 rounded-lg shadow-lg">
                            {departments.map(department => (
                              <SelectItem
                                key={department.departmentID}
                                value={department.departmentID}
                                className="hover:bg-gray-200"
                              >
                                <span>{department.name}</span>
                                <span className="text-sm text-gray-500 ml-1">
                                  ({department.code})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-600">
                          Location
                        </Label>
                        <Select
                          value={sharedReturnLocationId}
                          onValueChange={value => {
                            setSharedReturnLocationId(value);
                            setSharedReturnAreaId('');
                          }}
                          disabled={!sharedReturnDepartmentId}
                        >
                          <SelectTrigger
                            className={cn(
                              'border-slate-200 focus:border-red-500 focus:ring-red-500/20 rounded-lg',
                              !sharedReturnDepartmentId &&
                                'text-muted-foreground'
                            )}
                          >
                            <SelectValue
                              placeholder={
                                sharedReturnDepartmentId
                                  ? 'Select location'
                                  : 'Select department first'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-white z-[200]">
                            {getSharedAvailableLocations().map(location => (
                              <SelectItem
                                key={location.locationID}
                                value={location.locationID}
                                className="hover:bg-gray-200"
                              >
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-600">
                          Room / Area
                        </Label>
                        <Select
                          value={sharedReturnAreaId}
                          onValueChange={setSharedReturnAreaId}
                          disabled={
                            !sharedReturnLocationId || !sharedLocationHasRooms
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              'border-slate-200 focus:border-red-500 focus:ring-red-500/20 rounded-lg',
                              (!sharedReturnLocationId ||
                                !sharedLocationHasRooms) &&
                                'text-muted-foreground'
                            )}
                          >
                            <SelectValue
                              placeholder={
                                !sharedReturnLocationId
                                  ? 'Select a location first'
                                  : sharedLocationHasRooms
                                    ? 'Select room/area'
                                    : 'No room/area required'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-white z-[200]">
                            {getSharedAvailableRooms().map(room => (
                              <SelectItem
                                key={room.roomID}
                                value={room.roomID}
                                className="hover:bg-gray-200"
                              >
                                {room.room_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 space-y-2 transition-shadow hover:shadow-md">
                    <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase">
                      Processor position
                    </Label>
                    <p className="text-sm text-slate-700">
                      {currentUser?.position?.trim()
                        ? currentUser.position
                        : '— (add a position on your profile if missing)'}
                    </p>
                    <p className="text-xs text-slate-500">
                      This will appear on the return form PDF when you complete
                      processing.
                    </p>
                  </div>

                  {/* Verification – same as Asset Return page */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 space-y-4">
                    <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase block">
                      Verification
                    </Label>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <Checkbox
                          checked={verificationTag}
                          onCheckedChange={v => setVerificationTag(!!v)}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-slate-700">
                          I have verified the asset tag matches the physical
                          equipment
                        </span>
                      </label>
                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <Checkbox
                          checked={verificationCondition}
                          onCheckedChange={v => setVerificationCondition(!!v)}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-slate-700">
                          I have assessed the asset condition thoroughly
                        </span>
                      </label>
                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <Checkbox
                          checked={verificationConfirmSign}
                          onCheckedChange={v => setVerificationConfirmSign(!!v)}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-slate-700">
                          I sign this form confirming and approving the asset
                          returned by the user
                        </span>
                      </label>
                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <Checkbox
                          checked={assignToProcessor}
                          onCheckedChange={v => setAssignToProcessor(!!v)}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-slate-700">
                          All of these assets will be transferred and assigned
                          to me for the time being
                        </span>
                      </label>
                    </div>
                    <p className="text-sm text-slate-600 pt-1">
                      All assets will be returned
                    </p>
                  </div>
                </AppDialogBody>

                <AppDialogChromeFooter className="justify-end flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProcessForm(null)}
                    disabled={submitting || declining}
                    className="rounded-lg border-slate-300 hover:bg-slate-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeclineReason('');
                      setDeclineDialogOpen(true);
                    }}
                    disabled={submitting || declining}
                    className="rounded-lg border-amber-300 text-amber-900 hover:bg-amber-50"
                  >
                    Decline
                  </Button>
                  <Button
                    onClick={handleProcessSubmit}
                    disabled={submitting || declining || !canSubmit}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Return Asset
                      </div>
                    )}
                  </Button>
                </AppDialogChromeFooter>
              </>
            )}
          </AppDialogFrame>
        </Dialog>

        <SmsOtpDialog
          isOpen={smsOtpDialogOpen}
          onOpenChange={setSmsOtpDialogOpen}
          onVerified={() => {
            setSmsOtpDialogOpen(false);
          }}
          onCancel={() => {
            setSmsOtpDialogOpen(false);
            pendingProcessActionRef.current = null;
          }}
          pendingActionRef={pendingProcessActionRef}
          title="Verify Return Processing"
          description="Please verify your identity to process this asset return request."
          verifyButtonLabel="Verify & Process Return"
        />

        <SmsOtpDialog
          isOpen={smsOtpDialogDeclineOpen}
          onOpenChange={setSmsOtpDialogDeclineOpen}
          onVerified={() => {
            setSmsOtpDialogDeclineOpen(false);
          }}
          onCancel={() => {
            setSmsOtpDialogDeclineOpen(false);
            pendingDeclineActionRef.current = null;
          }}
          pendingActionRef={pendingDeclineActionRef}
          title="Verify Decline"
          description="Please verify your identity to decline this asset return request."
          verifyButtonLabel="Verify & Decline"
        />

        <Dialog
          open={declineDialogOpen}
          onOpenChange={open => {
            setDeclineDialogOpen(open);
            if (!open) setDeclineReason('');
          }}
        >
          <AppDialogFrame className="max-w-md w-[90vw]">
            <AppDialogGradientHeader
              title="Decline return request"
              description="The employee will see this reason. The return will not be processed."
            />
            <AppDialogBody className="space-y-3">
              <Label htmlFor="processor-decline-reason">Reason</Label>
              <Textarea
                id="processor-decline-reason"
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="Explain why this return cannot be completed…"
                rows={4}
                className="resize-none"
              />
            </AppDialogBody>
            <AppDialogChromeFooter className="justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeclineDialogOpen(false)}
                disabled={declining}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={declining || !declineReason.trim()}
                onClick={handleDeclineSubmit}
              >
                {declining ? 'Declining…' : 'Verify & Decline'}
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>
      </main>
    </div>
  );
}
