'use client';

import { useEffect, useState } from 'react';
import { X, FileText, Eye, User, Calendar, Tag, FileText as FileTextIcon, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { generateAccountabilityFormPDF } from '@/pages/assets/accountability/accountabilityForm';

interface IntangibleAssetViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (asset: any) => void;
  asset: any;
}

interface AccountabilityForm {
  id: string;
  formNumber: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    department?: {
      id: string;
      name: string;
    } | null;
  };
  department?: {
    id: string;
    name: string;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string | null | undefined) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'Available':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'Assigned':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'Pending':
      return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    case 'Signed':
      return 'bg-green-50 text-green-700 border border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
}

function FormRow({
  form,
  generatingPdfId,
  onViewPdf,
}: {
  form: AccountabilityForm;
  generatingPdfId: string | null;
  onViewPdf: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-white">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{form.formNumber}</p>
        <p className="text-xs text-gray-600 mt-0.5">
          Assigned to: {[form.user?.first_name, form.user?.last_name].filter(Boolean).join(' ') || 'Unknown'}
          {form.user?.email && ` (${form.user.email})`}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
          {(form.user?.department?.name || form.department?.name) && (
            <span>Dept: {form.user?.department?.name || form.department?.name}</span>
          )}
          {form.location?.name && <span>Loc: {form.location.name}</span>}
          <span>Created: {formatDate(form.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge className={getStatusBadgeClass(form.status)}>
          {form.status}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewPdf}
          disabled={generatingPdfId === form.id}
          className="flex items-center gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" />
          {generatingPdfId === form.id ? 'Generating...' : 'View PDF'}
        </Button>
      </div>
    </div>
  );
}

export default function IntangibleAssetViewModal({
  isOpen,
  onClose,
  onEdit,
  asset,
}: IntangibleAssetViewModalProps) {
  const [forms, setForms] = useState<AccountabilityForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !asset?.id) return;

    let cancelled = false;

    const fetchForms = async () => {
      try {
        setLoadingForms(true);
        const response = await api.get<{ forms: AccountabilityForm[] }>(
          `/accountability-forms/asset/${asset.id}`
        );
        if (!cancelled) {
          setForms(response.forms || []);
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error.message || 'Failed to fetch accountability forms');
        }
      } finally {
        if (!cancelled) {
          setLoadingForms(false);
        }
      }
    };

    fetchForms();

    return () => {
      cancelled = true;
    };
  }, [isOpen, asset?.id]);

  const handleViewPdf = async (formId: string, formNumber: string) => {
    try {
      setGeneratingPdfId(formId);
      const fullFormResponse = await api.get(`/accountability-forms/${formId}`);
      const fullForm = fullFormResponse.form;

      const pdfBlob = await generateAccountabilityFormPDF(fullForm);
      const pdfUrl = URL.createObjectURL(pdfBlob);

      window.dispatchEvent(
        new CustomEvent('openPdfPreview', {
          detail: { pdfUrl, title: `Accountability Form ${formNumber}` },
        })
      );

      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate PDF for this form');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  if (!isOpen || !asset) return null;

  const assignees = Array.isArray(asset.assignees) ? asset.assignees : [];

  const activeForms = forms.filter(
    form => form.status !== 'Disabled' && form.status !== 'Declined'
  );
  const disabledForms = forms.filter(
    form => form.status === 'Disabled' || form.status === 'Declined'
  );

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <AppDialogFrame className="sm:max-w-3xl max-h-[85vh] overflow-hidden !flex !flex-col">
        <AppDialogGradientHeader
          title={asset.name || 'Intangible Asset Details'}
          description="View intangible asset information and associated forms"
        />
        <AppDialogBody className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Status + Type badges */}
          <div className="flex flex-wrap items-center gap-2">
            {asset.status && (
              <Badge className={getStatusBadgeClass(asset.status)}>
                {asset.status}
              </Badge>
            )}
            {asset.type && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                {asset.type}
              </Badge>
            )}
          </div>

          {/* Details Section */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <FileTextIcon className="h-4 w-4 text-gray-500" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</p>
                <p className="text-sm text-gray-900 mt-0.5">{asset.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</p>
                <p className="text-sm text-gray-900 mt-0.5">{asset.type || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</p>
                <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{asset.description || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</p>
                <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{asset.remarks || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</p>
                <p className="text-sm text-gray-900 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {formatDateTime(asset.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</p>
                <p className="text-sm text-gray-900 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {formatDateTime(asset.updated_at)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {asset.created_by_name || asset.created_by || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Updated By</p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {asset.updated_by_name || asset.updated_by || '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Assigned To Section */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                Assigned To
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignees.length === 0 ? (
                <p className="text-sm text-gray-500">Not assigned</p>
              ) : (
                <div className="space-y-3">
                  {assignees.map((assignee: any, index: number) => (
                    <div
                      key={`${assignee.userId || assignee.userID || index}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {[assignee.firstName, assignee.lastName].filter(Boolean).join(' ') || 'Unknown'}
                        </p>
                        {assignee.email && (
                          <p className="text-xs text-gray-500 mt-0.5">{assignee.email}</p>
                        )}
                      </div>
                      {assignee.assignedDate && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          Assigned: {formatDate(assignee.assignedDate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accountability Forms Section */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Accountability Forms
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingForms ? (
                <div className="text-center py-8 text-sm text-gray-500">Loading forms...</div>
              ) : forms.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  No accountability forms found for this asset
                </div>
              ) : (
                <div className="space-y-6">
                  {activeForms.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Active
                        </p>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {activeForms.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {activeForms.map(form => (
                          <FormRow
                            key={form.id}
                            form={form}
                            generatingPdfId={generatingPdfId}
                            onViewPdf={() => handleViewPdf(form.id, form.formNumber)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {disabledForms.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Disabled
                        </p>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 border border-gray-200">
                          {disabledForms.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {disabledForms.map(form => (
                          <FormRow
                            key={form.id}
                            form={form}
                            generatingPdfId={generatingPdfId}
                            onViewPdf={() => handleViewPdf(form.id, form.formNumber)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </AppDialogBody>
        <AppDialogChromeFooter className="justify-between">
          {onEdit && (
            <Button
              variant="default"
              onClick={() => onEdit(asset)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Intangible Asset
            </Button>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
