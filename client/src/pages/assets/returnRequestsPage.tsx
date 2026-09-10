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
  AlertTriangle,
  ImagePlus,
  XCircle,
  FileSignature,
  FileText,
  Calendar,
  Layers,
  Search,
  Download,
  LayoutGrid,
  List,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { AdminCopySignerSelect } from '@/components/common/AdminCopySignerSelect';
import { isIntangibleAssignedToUser } from '@/utils/intangibleAssets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/dataTable';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { cn } from '@/lib/utils';
import { Shimmer } from '@/components/ui/shimmer';
import {
  generateAccountabilityFormPDF,
  type AccountabilityForm,
} from '@/pages/assets/accountability/accountabilityForm';
import type { Department, Location } from '@/types/assets';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  segmentTabsListClassName,
  segmentTabsTriggerClassName,
} from '@/components/ui/tabs';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { useRef } from 'react';
import {
  AssetChecklistDialog,
  type AssetChecklistSubmitPayload,
} from '@/pages/assets/asset-issuance/components/AssetChecklistDialog';
import { filterComputerTypeAssets } from '@/utils/assetTypeDetection';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import {
  ReturnFormDetail,
  buildReturnDataForPDFFromBatch,
  type AssetReturnFormBatch,
} from '@/pages/profile/profileComponents/tabs/documentsTab';
import { generateAssetReturnPDF, downloadPDF } from '@/lib/pdfGenerator';

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
      asset?: {
        code?: string;
        name?: string;
        id?: string;
        category_name?: string;
        type_name?: string;
      };
      user?: {
        first_name?: string;
        last_name?: string;
        position?: string | null;
        company?: { id?: string; name?: string };
        department?: { id?: string; name?: string };
      };
    };
};

type PendingForm = {
  formID: string;
  form_number: string | null;
  created_at: string;
  user_id: string;
  return_type?: string | null;
  processed_by?: string | null;
  dept_head_signed_at?: string | null;
  sub_approver_1_signed_at?: string | null;
  returns: PendingReturn[];
};

export default function ReturnRequestsPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();
  const { roleCustodian } = useUserPermissions();
  const userCompanyId = currentUser?.company_id;
  const [forms, setForms] = useState<PendingForm[]>([]);
  const [processedForms, setProcessedForms] = useState<PendingForm[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [processedLoading, setProcessedLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('request');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [readOnly, setReadOnly] = useState(false);
  const [scope, setScope] = useState<'it' | 'admin'>('it');

  // Show scope tabs for Global Admin, Admin, and Overall Manager
  const isSuperAdmin = currentUser?.role?.name?.toLowerCase() === 'global admin';
  const isAdmin = currentUser?.role?.name?.toLowerCase() === 'admin';
  const isOverallManager = roleCustodian?.managerRole === 'overallManager';
  const showScopeTabs = isSuperAdmin || isAdmin || isOverallManager;
  const [processForm, setProcessForm] = useState<PendingForm | null>(null);
  const [returnPdfPreviewTab, setReturnPdfPreviewTab] = useState('physical-assets');
  const [returnPdfUrl, setReturnPdfUrl] = useState<string>('');
  const [returnPdfLoading, setReturnPdfLoading] = useState(false);
  const [returnPdfError, setReturnPdfError] = useState<string | null>(null);
  const returnPdfUrlRef = useRef<string>('');
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
  const [returnType, setReturnType] = useState<string>('');
  const [assignToProcessor, setAssignToProcessor] = useState(false);
  const [verificationTag, setVerificationTag] = useState(false);
  const [verificationCondition, setVerificationCondition] = useState(false);
  const [verificationConfirmSign, setVerificationConfirmSign] = useState(false);
  const [adminCopySignerId, setAdminCopySignerId] = useState<string | null>(
    null
  );
  const [adminCopySignerRequired, setAdminCopySignerRequired] = useState(false);
  /**
   * Assets left in the return requestor's custody after this batch
   * (active assignments minus the batch). Null while unknown / not loaded.
   */
  const [requestorRemaining, setRequestorRemaining] = useState<number | null>(
    null
  );
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
  const processingFormRef = useRef<PendingForm | null>(null);
  const pendingProcessParamsRef = useRef<{
    formID: string;
    assetReturns: { assignmentId: string; condition: string; notes: string; imageUrls: string[]; returnDepartmentId: string; returnLocationId: string; returnAreaId: string | undefined }[];
    returnType: string;
    assignToProcessor: boolean;
    adminCopySignerId?: string | null;
    intangibleAssetReturnItems?: { id: string; notes: string }[];
  } | null>(null);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistStepIndex, setChecklistStepIndex] = useState(0);
  const [checklistAssets, setChecklistAssets] = useState<{ id: string; name: string; type?: string; category?: string }[]>([]);
  const pendingReturnChecklistsRef = useRef<any[]>([]);
  const [intangibleAssets, setIntangibleAssets] = useState<any[]>([]);
  const [selectedIntangibleAssetIds, setSelectedIntangibleAssetIds] = useState<string[]>([]);
  const [intangibleNotes, setIntangibleNotes] = useState<Record<string, string>>({});

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
        `/asset-returns/forms/pending-staff?scope=${scope}`
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

  const fetchProcessed = async () => {
    try {
      setProcessedLoading(true);
      const res = await api.get<{ assetReturnForms?: PendingForm[] }>(
        `/asset-returns/forms/processed-by-me?scope=${scope}`
      );
      setProcessedForms(res.assetReturnForms ?? []);
    } catch (e) {
      console.error('Failed to fetch processed return requests', e);
      toast.error('Failed to load processed return requests');
      setProcessedForms([]);
    } finally {
      setProcessedLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const url = userCompanyId ? `/departments?companyId=${userCompanyId}&scope=${scope}` : `/departments?scope=${scope}`;
      const response = await api.get<{ departments?: Department[] }>(url);
      setDepartments(response.departments ?? []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const url = userCompanyId ? `/locations?companyId=${userCompanyId}&scope=${scope}` : `/locations?scope=${scope}`;
      const response = await api.get<{ locations?: Location[] }>(url);
      setLocations(response.locations ?? []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
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
    fetchPending();
    fetchProcessed();
    fetchDepartments();
    fetchLocations();
    fetchIntangibleAssets();
  }, [scope]);

  // Load the return requestor's remaining custody so the IT-copy signer
  // block can note that a new accountability form will be issued.
  useEffect(() => {
    if (!processForm) {
      setRequestorRemaining(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get<{ assignments?: unknown[] }>(
          `/asset-assignments?userId=${processForm.user_id}&status=Active`
        );
        if (cancelled) return;
        const list = Array.isArray(res?.assignments) ? res.assignments : [];
        // Count only this requestor's active assignments (the endpoint also
        // returns intangible rows — filter defensively by owner + status).
        const total = list.filter(
          a =>
            (a as { user?: { id?: string } })?.user?.id ===
              processForm.user_id &&
            (a as { status?: string })?.status === 'Active'
        ).length;
        setRequestorRemaining(
          Math.max(0, total - (processForm.returns?.length ?? 0))
        );
      } catch {
        if (!cancelled) setRequestorRemaining(null);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [processForm]);

  // Generate return form PDF preview when the PDF Preview tab is opened
  useEffect(() => {
    if (returnPdfPreviewTab !== 'pdf-preview' || !processForm) return;
    let cancelled = false;
    const generate = async () => {
      setReturnPdfLoading(true);
      setReturnPdfError(null);
      setReturnPdfUrl('');
      if (returnPdfUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(returnPdfUrlRef.current);
      }
      returnPdfUrlRef.current = '';
      try {
        const data = buildReturnDataForPDFFromBatch(processForm as unknown as AssetReturnFormBatch);
        if (!data) {
          setReturnPdfError('Return form data is missing or incomplete');
          return;
        }
        const blob = await generateAssetReturnPDF(data);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        returnPdfUrlRef.current = url;
        setReturnPdfUrl(url);
      } catch (err) {
        if (!cancelled) {
          console.error('Return PDF preview generation failed:', err);
          setReturnPdfError('Failed to generate PDF preview. Please try again.');
        }
      } finally {
        if (!cancelled) setReturnPdfLoading(false);
      }
    };
    generate();
    return () => { cancelled = true; };
  }, [returnPdfPreviewTab, processForm]);

  // Note: wet-upload notification deep-link is handled on `/assets/return`
  // (processors may not have `Return Request` permission).

  const openProcessModal = (form: PendingForm, isReadOnly = false) => {
    setReadOnly(isReadOnly);
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
    if (isReadOnly) {
      const first = form.returns[0];
      setSharedReturnDepartmentId(first?.return_department_id ?? '');
      setSharedReturnLocationId(first?.return_location_id ?? '');
      setSharedReturnAreaId(first?.return_location_room_id ?? '');
    } else {
      setSharedReturnDepartmentId('');
      setSharedReturnLocationId('');
      setSharedReturnAreaId('');
    }
    setExpandedAssets(
      new Set(form.returns.map(r => r.assignment?.asset?.id ?? r.assignment_id))
    );
    const rawRt = String(
      form.return_type ??
        (form as { returnType?: string | null }).returnType ??
        ''
    );
    const rt = rawRt.toLowerCase();
    if (rt.includes('offboarding')) {
      setReturnType('offboarding');
    } else if (rt.includes('returned') || rt === 'return' || rt.includes('regular return')) {
      setReturnType('returned');
    } else if (rt.includes('return for transfer')) {
      // Transfer-generated returns default to 'returned' since the employee isn't leaving
      setReturnType('returned');
    } else {
      setReturnType('');
    }
    setAssignToProcessor(false);
    setVerificationTag(false);
    setVerificationCondition(false);
    setVerificationConfirmSign(false);
    setAdminCopySignerId(null);
    setAdminCopySignerRequired(false);
    setSelectedIntangibleAssetIds([]);
    setIntangibleNotes({});
  };

  const [showFormDetail, setShowFormDetail] = useState(false);
  const [formDetailBatch, setFormDetailBatch] =
    useState<AssetReturnFormBatch | null>(null);

  const handleViewForm = (form: PendingForm) => {
    setFormDetailBatch(form as unknown as AssetReturnFormBatch);
    setShowFormDetail(true);
  };

  const handleDownloadFormDetail = async () => {
    if (!formDetailBatch) return;
    try {
      const data = buildReturnDataForPDFFromBatch(formDetailBatch);
      if (!data) {
        toast.error('Cannot generate PDF for this form');
        return;
      }
      const blob = await generateAssetReturnPDF(data);
      const fileName = formDetailBatch.form_number
        ? `Asset_Return_Form_${formDetailBatch.form_number}_${Date.now()}.pdf`
        : `Asset_Return_Form_${Date.now()}.pdf`;
      downloadPDF(blob, fileName);
      toast.success('Return form downloaded successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to download PDF');
    }
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
    if (!returnType) {
      toast.error('Please select a return type');
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

    const intangibleAssetReturnItems = selectedIntangibleAssetIds
      .filter(id => intangibleAssets.some(ia => ia.id === id))
      .map(id => ({
        id,
        notes: intangibleNotes[id] ?? '',
      }));

    const returnTypeLabel = returnType === 'offboarding' ? 'Offboarding' : 'Returned';

    // Save form ref for later use
    processingFormRef.current = processForm;

    // Check for computer-type assets BEFORE opening OTP (matches assignment page flow)
    const mappedAssets = (processForm?.returns || []).map(r => {
      const a = r.assignment?.asset;
      return {
        id: a?.id || r.assignment_id,
        name: a?.name || '',
        type: a?.type_name || '',
        category: a?.category_name || '',
      };
    });
    const computerReturns = filterComputerTypeAssets(mappedAssets);

    if (computerReturns.length > 0) {
      pendingProcessParamsRef.current = {
        formID: processForm.formID,
        assetReturns,
        returnType: returnType || '',
        assignToProcessor,
        adminCopySignerId,
        intangibleAssetReturnItems: intangibleAssetReturnItems.length > 0 ? intangibleAssetReturnItems : undefined,
      };
      setChecklistAssets(computerReturns);
      setChecklistStepIndex(0);
      pendingReturnChecklistsRef.current = [];
      setChecklistDialogOpen(true);
      return;
    }

    // No computer assets — proceed directly to OTP (existing flow)
    pendingProcessActionRef.current = async () => {
      setSubmitting(true);
      try {
        await api.post(`/asset-returns/forms/${processForm.formID}/process`, {
          processSignature: {
            signed_at: new Date().toISOString(),
          },
          assetReturns,
          returnType: returnType || undefined,
          assignToProcessor,
          receivedBy: assignToProcessor ? (currentUser?.id ?? null) : null,
          adminCopySignerId: adminCopySignerId ?? null,
          adminCopyCopyType: null,
          intangibleAssetReturnItems: intangibleAssetReturnItems.length > 0 ? intangibleAssetReturnItems : undefined,
        });
        toast.success('Return processed successfully');
        setProcessForm(null);
        await fetchPending();
        await fetchProcessed();
      } catch (err: unknown) {
        const e = err as { data?: { error?: string } };
        toast.error(e?.data?.error ?? 'Failed to process return');
      } finally {
        setSubmitting(false);
      }
    };
    setSmsOtpDialogOpen(true);
  };

  const handleChecklistNext = async (payload: AssetChecklistSubmitPayload) => {
    const asset = checklistAssets[checklistStepIndex];
    const r = processingFormRef.current?.returns.find(
      ret => (ret.assignment?.asset?.id || ret.assignment_id) === asset.id
    );
    pendingReturnChecklistsRef.current.push({
      assignmentId: r?.assignment?.assignmentID || r?.assignment_id || '',
      employeeId: processingFormRef.current?.user_id || '',
      employeeName: processingFormRef.current
        ? returnerName(processingFormRef.current)
        : '',
      employeeDesignation: r?.assignment?.user?.position || '',
      employeeDepartment: r?.assignment?.user?.department?.name || '',
      employeeCompany: r?.assignment?.user?.company?.name || '',
      typeOnboarding: payload.typeOnboarding,
      typeOffboarding: payload.typeOffboarding,
      receivedBy: payload.receivedBy,
      checklistData: payload.checklistData,
      remarks: payload.remarks,
    });
    setChecklistStepIndex(prev => prev + 1);
  };

  const handleChecklistFinalSubmit = async (payload: AssetChecklistSubmitPayload) => {
    const asset = checklistAssets[checklistStepIndex];
    const r = processingFormRef.current?.returns.find(
      ret => (ret.assignment?.asset?.id || ret.assignment_id) === asset.id
    );
    pendingReturnChecklistsRef.current.push({
      assignmentId: r?.assignment?.assignmentID || r?.assignment_id || '',
      employeeId: processingFormRef.current?.user_id || '',
      employeeName: processingFormRef.current
        ? returnerName(processingFormRef.current)
        : '',
      employeeDesignation: r?.assignment?.user?.position || '',
      employeeDepartment: r?.assignment?.user?.department?.name || '',
      employeeCompany: r?.assignment?.user?.company?.name || '',
      typeOnboarding: payload.typeOnboarding,
      typeOffboarding: payload.typeOffboarding,
      receivedBy: payload.receivedBy,
      checklistData: payload.checklistData,
      remarks: payload.remarks,
    });

    setChecklistDialogOpen(false);

    // Proceed to OTP, then process + save checklists
    const params = pendingProcessParamsRef.current;
    if (!params) return;

    pendingProcessActionRef.current = async () => {
      setSubmitting(true);
      try {
        await api.post(`/asset-returns/forms/${params.formID}/process`, {
          processSignature: {
            signed_at: new Date().toISOString(),
          },
          assetReturns: params.assetReturns,
          returnType: params.returnType || undefined,
          assignToProcessor: params.assignToProcessor,
          receivedBy: params.assignToProcessor ? (currentUser?.id ?? null) : null,
          adminCopySignerId: params.adminCopySignerId ?? null,
          adminCopyCopyType: null,
          intangibleAssetReturnItems: params.intangibleAssetReturnItems,
        });

        const digitalSignature =
          (currentUser as { digitalSignature?: string | null })
            ?.digitalSignature ?? null;
        await Promise.all(
          pendingReturnChecklistsRef.current.map(checklist =>
            api.post('/asset-returns/checklist', {
              assignmentId: checklist.assignmentId,
              employeeId: checklist.employeeId,
              employeeName: checklist.employeeName,
              employeeDesignation: checklist.employeeDesignation,
              employeeDepartment: checklist.employeeDepartment,
              employeeCompany: checklist.employeeCompany,
              typeOnboarding: checklist.typeOnboarding,
              typeOffboarding: checklist.typeOffboarding,
              receivedBy: checklist.receivedBy,
              checklistData: checklist.checklistData,
              remarks: checklist.remarks,
              digitalSignature,
            })
          )
        );

        toast.success('Return processed successfully');
        setProcessForm(null);
        await fetchPending();
        await fetchProcessed();
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
    !!returnType &&
    verificationTag &&
    verificationCondition &&
    verificationConfirmSign &&
    assignToProcessor &&
    (!adminCopySignerRequired || !!adminCopySignerId);

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
        await fetchProcessed();
      } catch (err: unknown) {
        const e = err as { data?: { error?: string } };
        toast.error(e?.data?.error ?? 'Failed to decline return');
      } finally {
        setDeclining(false);
      }
    };
    setSmsOtpDialogDeclineOpen(true);
  };

  const isProcessedTab = activeTab === 'processed';
  const listLoading = isProcessedTab ? processedLoading : loading;
  const listForms = isProcessedTab ? processedForms : forms;
  const emptyTitle = isProcessedTab
    ? 'No processed return requests'
    : 'No pending return requests';
  const emptyBody = isProcessedTab
    ? "Returns you've processed will appear here."
    : 'Requests appear here after a Department Head approves a return request.';

  // Table columns for DataTable view
  const returnRequestColumns = [
    {
      accessorKey: 'form_number',
      header: 'Form #',
      cell: ({ row }: any) => (
        <span className="font-mono text-sm font-medium">
          {row.original.form_number ?? row.original.formID}
        </span>
      ),
      size: 140,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const form = row.original;
        return (
          <Badge
            variant="secondary"
            className={
              isProcessedTab
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
            }
          >
            {isProcessedTab ? 'Processed' : 'Pending'}
          </Badge>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'returner',
      header: 'Returner',
      cell: ({ row }: any) => {
        const form = row.original;
        const u = form.returns[0]?.assignment?.user;
        if (!u) return <span className="text-sm text-gray-500">Unknown</span>;
        return (
          <span className="text-sm">
            {[u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown'}
          </span>
        );
      },
      size: 180,
    },
    {
      accessorKey: 'assets',
      header: 'Assets',
      cell: ({ row }: any) => {
        const form = row.original;
        return (
          <span className="text-sm text-gray-600">
            {form.returns.length === 0
              ? 'No assets'
              : `${form.returns.length} asset${form.returns.length === 1 ? '' : 's'}`}
          </span>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-500">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
      size: 140,
    },
    {
      accessorKey: 'return_type',
      header: 'Return Type',
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-600 capitalize">
          {row.original.return_type ?? '—'}
        </span>
      ),
      size: 140,
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              openProcessModal(row.original, isProcessedTab);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            {isProcessedTab ? 'View' : 'Return'}
          </Button>
          {isProcessedTab && (
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleViewForm(row.original);
              }}
            >
              <FileText className="h-4 w-4 mr-1" />
              Form
            </Button>
          )}
        </div>
      ),
      size: isProcessedTab ? 200 : 140,
    },
  ];

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={ClipboardList}
          title="Return Requests"
          description="Process return requests approved by Department Head"
        >
          {showScopeTabs && (
            <Tabs value={scope} onValueChange={v => setScope(v as 'it' | 'admin')} className="w-full sm:w-auto">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 max-w-full sm:max-w-[280px]'}>
                <TabsTrigger value="it" className={segmentTabsTriggerClassName}>IT Asset</TabsTrigger>
                <TabsTrigger value="admin" className={segmentTabsTriggerClassName}>Admin Asset</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Button
            variant="header"
            size="sm"
            onClick={() => navigate('/assets/return')}
          >
            Back to Asset Return
          </Button>
        </PageHeader>

        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v)}
          className="w-full"
        >
          <TabsList
            className={segmentTabsListClassName + ' grid w-full grid-cols-2 mb-4'}
          >
            <TabsTrigger
              value="request"
              className={segmentTabsTriggerClassName}
            >
              Request
            </TabsTrigger>
            <TabsTrigger
              value="processed"
              className={segmentTabsTriggerClassName}
            >
              Processed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600">
            {isProcessedTab ? 'Processed return requests' : 'Pending return requests'}
          </p>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'card' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('card')}
                    aria-label="Card view"
                    className={viewMode === 'card'
                      ? 'bg-white text-red-600 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 text-white text-xs px-2 py-1 rounded">
                  Card View
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    aria-label="Table view"
                    className={viewMode === 'table'
                      ? 'bg-white text-red-600 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 text-white text-xs px-2 py-1 rounded">
                  Table View
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {listLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={index}
                className="flex flex-col shadow-md border-slate-200 bg-white overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Shimmer className="h-10 w-10 rounded-xl shrink-0" />
                      <div className="space-y-1.5">
                        <Shimmer className="h-5 w-28 rounded" />
                        <Shimmer className="h-3.5 w-20 rounded" />
                      </div>
                    </div>
                    <Shimmer className="h-5 w-16 rounded-full shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex gap-3">
                    <Shimmer className="h-4 w-4 rounded shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <Shimmer className="h-4 w-24 rounded" />
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Shimmer className="h-1.5 w-1.5 rounded-full shrink-0" />
                          <Shimmer className="h-3.5 w-40 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Shimmer className="h-4 w-4 rounded shrink-0 mt-0.5" />
                    <Shimmer className="h-4 w-32 rounded" />
                  </div>
                  <div className="flex gap-3">
                    <Shimmer className="h-4 w-4 rounded shrink-0 mt-0.5" />
                    <Shimmer className="h-4 w-48 rounded" />
                  </div>
                </CardContent>
                <div className="p-4 mt-auto border-t border-slate-100">
                  <Shimmer className="h-9 w-full rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        ) : listForms.length === 0 ? (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4">
                <RotateCcw className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {emptyTitle}
              </h3>
              <p className="text-gray-500 text-sm">{emptyBody}</p>
            </CardContent>
          </Card>
        ) : viewMode === 'card' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listForms.map(form => {
              const formNumber = form.form_number ?? form.formID;
              const notesFromReturns = form.returns.map(r => r.return_notes).filter(Boolean);
              const returnTypeNote = form.return_type && String(form.return_type).trim() ? form.return_type : null;
              const returnNotes = [returnTypeNote, ...notesFromReturns].filter(Boolean).join('; ') || '—';

              return (
                <Card
                  key={form.formID}
                  className="flex flex-col shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl shrink-0">
                          <FileSignature className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">{formNumber}</CardTitle>
                          <p className="text-sm text-gray-500">
                            Created {new Date(form.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          isProcessedTab
                            ? 'bg-emerald-100 text-emerald-800 shrink-0 ml-2 dark:bg-emerald-900/30 dark:text-emerald-200'
                            : 'bg-amber-100 text-amber-800 shrink-0 ml-2 dark:bg-amber-900/30 dark:text-amber-200'
                        }
                      >
                        {isProcessedTab ? 'Processed' : 'Pending'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 pt-0">
                    <div className="flex items-start gap-3">
                      <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {form.returns.length === 0
                            ? 'No assets'
                            : `${form.returns.length} asset${form.returns.length === 1 ? '' : 's'} to return`}
                        </p>
                        {form.returns.length > 0 && (
                          <ul className="max-h-[120px] overflow-y-auto scrollbar-hide text-xs text-gray-600 mt-1 space-y-0.5 list-none">
                            {form.returns.slice(0, 10).map(r => (
                              <li key={r.assignment_id} className="flex items-center">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                                <span className="truncate">
                                  {r.assignment?.asset?.name ??
                                    r.assignment?.asset?.code ??
                                    'Asset'}
                                  {r.assignment?.asset?.code && (
                                    <span className="text-gray-400 font-mono ml-1">
                                      ({r.assignment.asset.code})
                                    </span>
                                  )}
                                  <span className="text-gray-400 ml-1">
                                    — {r.return_condition ?? '—'}
                                  </span>
                                </span>
                              </li>
                            ))}
                            {form.returns.length > 10 && (
                              <li className="text-xs text-gray-400">
                                +{form.returns.length - 10} more
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          Returned by: {returnerName(form)}
                        </p>
                      </div>
                    </div>

                    {isProcessedTab && form.processed_by && (
                      <div className="flex items-start gap-3">
                        <User className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-emerald-700 dark:text-emerald-300">
                            Processed by: {form.processed_by}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          Return notes: {returnNotes}
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  <div className="flex gap-2 p-4 mt-auto border-t border-slate-100">
                    <Button
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-md"
                      size="sm"
                      onClick={() => openProcessModal(form, isProcessedTab)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {isProcessedTab ? 'View' : 'View / Return Asset'}
                    </Button>
                    {isProcessedTab && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewForm(form)}
                        className="flex-1 rounded-xl border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 shadow-sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Form
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <DataTable<PendingForm>
            tableId="return-requests"
            data={listForms}
            columns={returnRequestColumns}
            searchPlaceholder={isProcessedTab ? 'Search processed requests...' : 'Search pending requests...'}
            title={isProcessedTab ? 'Processed Return Requests' : 'Pending Return Requests'}
            titleBadge={`${listForms.length} requests`}
            isLoading={listLoading}
            onRowClick={(row) => {
              openProcessModal(row.original, isProcessedTab);
            }}
            mobileCardFields={[
              {
                key: 'form_number',
                label: 'Form #',
                render: (row) => row.form_number ?? row.formID,
              },
              {
                key: 'status',
                label: 'Status',
                render: () => (isProcessedTab ? 'Processed' : 'Pending'),
              },
              {
                key: 'returner',
                label: 'Returner',
                render: (row) => {
                  const u = row.returns[0]?.assignment?.user;
                  if (!u) return 'Unknown';
                  return [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown';
                },
              },
              {
                key: 'assets',
                label: 'Assets',
                render: (row) =>
                  row.returns.length === 0
                    ? 'No assets'
                    : `${row.returns.length} asset${row.returns.length === 1 ? '' : 's'}`,
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (row) => new Date(row.created_at).toLocaleDateString(),
              },
              {
                key: 'return_type',
                label: 'Return Type',
                render: (row) => row.return_type ?? '—',
              },
            ]}
          />
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
                  {readOnly ? 'Asset Return Details' : 'Asset Return Confirmation'}
                </span>
              }
              description={
                readOnly
                  ? 'Review the completed return details.'
                  : 'Please assess the condition of each asset and add any notes.'
              }
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

                  {/* Return Type */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 transition-shadow hover:shadow-md">
                    <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase">
                      Return Type
                    </Label>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <label
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 flex-1 min-w-[140px]',
                          returnType === 'returned'
                            ? 'border-red-500 bg-red-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        )}
                        onClick={readOnly ? undefined : () => setReturnType('returned')}
                      >
                        <div
                          className={cn(
                            'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                            returnType === 'returned'
                              ? 'border-red-500'
                              : 'border-gray-300'
                          )}
                        >
                          {returnType === 'returned' && (
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          Returned
                        </span>
                      </label>
                      <label
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 flex-1 min-w-[140px]',
                          returnType === 'offboarding'
                            ? 'border-red-500 bg-red-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        )}
                        onClick={readOnly ? undefined : () => setReturnType('offboarding')}
                      >
                        <div
                          className={cn(
                            'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                            returnType === 'offboarding'
                              ? 'border-red-500'
                              : 'border-gray-300'
                          )}
                        >
                          {returnType === 'offboarding' && (
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          Offboarding
                        </span>
                      </label>
                    </div>
                  </div>

                  <Tabs
                    value={returnPdfPreviewTab}
                    onValueChange={v => setReturnPdfPreviewTab(v as 'physical-assets' | 'pdf-preview')}
                    className="w-full"
                  >
                    <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 w-full'}>
                      <TabsTrigger value="physical-assets" className={segmentTabsTriggerClassName + ' flex items-center gap-2'}>
                        <Package className="h-4 w-4" />
                        Physical Assets
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {processForm.returns.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="pdf-preview" className={segmentTabsTriggerClassName}>
                        PDF Preview
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="physical-assets" className="mt-4 space-y-4">
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
                                            'flex items-center gap-3 p-3 rounded-lg transition-all duration-200',
                                            readOnly
                                              ? 'cursor-default'
                                              : 'cursor-pointer',
                                            isSelected
                                              ? 'border-2 border-red-500 bg-red-50 shadow-sm'
                                              : 'border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                          )}
                                          onClick={
                                            readOnly
                                              ? undefined
                                              : () =>
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
                                    disabled={readOnly}
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
                                              src={proxyCloudinaryUrl(url)}
                                              alt={`Return condition photo ${idx + 1}`}
                                              className="h-20 w-20 object-cover"
                                            />
                                        </button>
                                        {!readOnly && (
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
                                        )}
                                      </div>
                                    ))}
                                    {!readOnly &&
                                    conditionImages.length <
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
                    </TabsContent>

                    <TabsContent value="pdf-preview" className="mt-4 space-y-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3">
                        <h3 className="text-sm font-semibold text-slate-800 tracking-tight uppercase flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-red-500" />
                          Asset Return Form — PDF Preview
                        </h3>
                        <div className="w-full flex-1 min-h-0 border rounded-lg overflow-hidden bg-gray-50">
                          {returnPdfError && !returnPdfLoading && !returnPdfUrl ? (
                            <div className="w-full h-full min-h-[200px] flex items-center justify-center text-red-500">
                              {returnPdfError}
                            </div>
                          ) : (
                            <div className="relative w-full h-full min-h-[200px]">
                              {(returnPdfLoading || !returnPdfUrl) && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                                  <div className="flex flex-col items-center gap-3 text-gray-500">
                                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                                    <p className="text-sm">Loading PDF preview...</p>
                                  </div>
                                </div>
                              )}
                              {returnPdfUrl && (
                                <iframe
                                  src={returnPdfUrl}
                                  className="w-full h-full min-h-0"
                                  title="Return Form PDF Preview"
                                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {returnPdfUrl && (
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!processForm) return;
                              const data = buildReturnDataForPDFFromBatch(processForm as unknown as AssetReturnFormBatch);
                              if (!data) { toast.error('Cannot generate PDF for download'); return; }
                              generateAssetReturnPDF(data).then(blob => {
                                const fileName = processForm.form_number
                                  ? `Asset_Return_Form_${processForm.form_number}_${Date.now()}.pdf`
                                  : `Asset_Return_Form_${Date.now()}.pdf`;
                                downloadPDF(blob, fileName);
                                toast.success('Return form downloaded successfully');
                              }).catch(() => toast.error('Failed to download PDF'));
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {selectedIntangibleAssetIds.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3">
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
                                    <Badge variant="outline" className={asset.type === 'IT scope' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800' : 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800'}>
                                      {asset.type}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-3 text-slate-600">{asset.description || '—'}</td>
                                  <td className="py-2 px-3">
                                    <Textarea
                                      placeholder="Notes..."
                                      value={intangibleNotes[id] ?? ''}
                                      disabled={readOnly}
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
                          disabled={readOnly}
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
                          disabled={readOnly || !sharedReturnDepartmentId}
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
                            readOnly ||
                            !sharedReturnLocationId ||
                            !sharedLocationHasRooms
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

                  {!readOnly && (
                    <>
                      <AdminCopySignerSelect
                        key={processForm.formID}
                        assets={(processForm?.returns ?? []).map(r => ({
                          id: r.assignment?.asset?.id || r.assignment_id,
                          code: r.assignment?.asset?.code || '',
                          name: r.assignment?.asset?.name || '',
                          type: r.assignment?.asset?.type_name || '',
                          category: r.assignment?.asset?.category_name || '',
                        }))}
                        actorUserId={currentUser?.id ?? ''}
                        custody={
                          requestorRemaining !== null
                            ? {
                                requestorName: processForm
                                  ? returnerName(processForm)
                                  : 'The requestor',
                                requestorRemaining,
                                origin: 'return',
                              }
                            : null
                        }
                        onChange={(signerId, requiresSigner) => {
                          setAdminCopySignerId(signerId);
                          setAdminCopySignerRequired(requiresSigner);
                        }}
                      />
                      {/* Verification – same as Asset Return page */}
                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 space-y-4">
                        <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase block">
                          Verification
                        </Label>
                        <div className="space-y-3">
                          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                            <Checkbox
                              checked={verificationTag}
                              disabled={readOnly}
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
                              disabled={readOnly}
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
                              disabled={readOnly}
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
                              disabled={readOnly}
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
                    </>
                  )}
                </AppDialogBody>

                <AppDialogChromeFooter className="justify-end flex-wrap gap-2">
                  {readOnly ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          processForm && handleViewForm(processForm)
                        }
                        className="rounded-lg border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Form
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProcessForm(null)}
                        className="rounded-lg border-slate-300 hover:bg-slate-100"
                      >
                        Close
                      </Button>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </AppDialogChromeFooter>
              </>
            )}
          </AppDialogFrame>
        </Dialog>

        <Dialog
          open={showFormDetail}
          onOpenChange={setShowFormDetail}
        >
          <AppDialogFrame className="max-w-3xl h-[min(90dvh,920px)] max-h-[calc(100dvh-1rem)] min-h-0 overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={`${
                formDetailBatch?.returns[0]?.assignment?.user
                  ? `${formDetailBatch.returns[0].assignment.user.first_name || ''} ${formDetailBatch.returns[0].assignment.user.last_name || ''}`.trim() ||
                    'Return'
                  : 'Return'
              } - ${
                formDetailBatch?.form_number ??
                `Return of ${formDetailBatch?.returns.length ?? 0} assets`
              }`}
              description="Asset Return Form Preview"
            />
            {formDetailBatch && (
              <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-white px-4 sm:px-6">
                <ReturnFormDetail
                  key={
                    formDetailBatch.formID ??
                    formDetailBatch.return_batch_id ??
                    'return-form'
                  }
                  returnFormBatch={formDetailBatch}
                  onClose={() => {
                    setShowFormDetail(false);
                    setFormDetailBatch(null);
                  }}
                  onDownload={handleDownloadFormDetail}
                  contentOnly
                />
              </div>
            )}
            <AppDialogChromeFooter className="flex-shrink-0 flex-row justify-end gap-3 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFormDetail(false);
                  setFormDetailBatch(null);
                }}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadFormDetail}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </AppDialogChromeFooter>
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
          purpose="return"
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
          purpose="return"
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

        <AssetChecklistDialog
          isOpen={checklistDialogOpen}
          onOpenChange={open => {
            if (!open) {
              setChecklistDialogOpen(false);
              pendingReturnChecklistsRef.current = [];
            }
          }}
          onCancel={() => {
            pendingReturnChecklistsRef.current = [];
          }}
          checklistVariant="offboarding"
          selectedAssets={checklistAssets.map(a => a.id)}
          assets={checklistAssets}
          computerAssets={checklistAssets}
          currentIndex={checklistStepIndex}
          selectedUser={processingFormRef.current?.user_id || ''}
          users={
            processingFormRef.current
              ? [
                  {
                    userID: processingFormRef.current.user_id,
                    first_name:
                      processingFormRef.current.returns[0]?.assignment?.user
                        ?.first_name || '',
                    last_name:
                      processingFormRef.current.returns[0]?.assignment?.user
                        ?.last_name || '',
                    position:
                      processingFormRef.current.returns[0]?.assignment?.user
                        ?.position || null,
                    department_id:
                      processingFormRef.current.returns[0]?.assignment?.user
                        ?.department?.id || '',
                    company:
                      processingFormRef.current.returns[0]?.assignment?.user
                        ?.company || null,
                  },
                ]
              : []
          }
          departments={departments.map(d => ({
            departmentID: d.departmentID,
            name: d.name,
          }))}
          currentUserPosition={currentUser?.position || ''}
          onNext={handleChecklistNext}
          onFinalSubmit={handleChecklistFinalSubmit}
        />

      </main>
    </div>
  );
}
