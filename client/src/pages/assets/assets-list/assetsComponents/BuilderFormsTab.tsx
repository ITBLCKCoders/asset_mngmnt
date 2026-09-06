'use client';

import { useEffect, useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Eye, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { generateAccountabilityFormPDF } from '@/pages/assets/accountability/accountabilityForm';
import { toast } from 'sonner';

interface AccountabilityForm {
  id: string;
  formNumber: string;
  status: string;
  created_at: string;
  signed_at: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  department?: {
    id: string;
    name: string;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
  received_copy_wet_pdf_url?: string | null;
  asset_code: string;
}

interface ReturnForm {
  id: string;
  formNumber: string;
  status: string;
  created_at: string;
  signed_at: string | null;
  return_type: string;
  received_by: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  department_name?: string;
  location_name?: string;
  asset_code: string;
}

interface TransferForm {
  id: string;
  formNumber: string;
  status: string;
  created_at: string;
  signed_at: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  new_user?: {
    first_name: string;
    last_name: string;
  };
  department_name?: string;
  location_name?: string;
  asset_code: string;
}

interface BorrowForm {
  id: string;
  formNumber: string;
  status: string;
  created_at: string;
  approved_at?: string | null;
  returned_at?: string | null;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  department_name?: string;
  asset_code?: string;
  asset_name?: string;
}

interface BuilderFormsTabProps {
  builderId: string;
  onPdfModalOpen?: () => void;
  onPdfModalClose?: () => void;
}

export function BuilderFormsTab({ builderId, onPdfModalOpen, onPdfModalClose }: BuilderFormsTabProps) {
  const [loading, setLoading] = useState(true);
  const [accountabilityForms, setAccountabilityForms] = useState<AccountabilityForm[]>([]);
  const [returnForms, setReturnForms] = useState<ReturnForm[]>([]);
  const [transferForms, setTransferForms] = useState<TransferForm[]>([]);
  const [borrowForms, setBorrowForms] = useState<BorrowForm[]>([]);
  const [showAllAccountability, setShowAllAccountability] = useState(false);

  useEffect(() => {
    fetchForms();
  }, [builderId]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await api.get<{
        accountabilityForms: AccountabilityForm[];
        returnForms: ReturnForm[];
        transferForms: TransferForm[];
        borrowForms: BorrowForm[];
      }>(`/asset-builders/${builderId}/forms`);

      setAccountabilityForms(response.accountabilityForms || []);
      setReturnForms(response.returnForms || []);
      setTransferForms(response.transferForms || []);
      setBorrowForms(response.borrowForms || []);
    } catch (error) {
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAccountabilityFormPdf = async (formId: string, formNumber: string) => {
    try {
      const fullFormResponse = await api.get(`/accountability-forms/${formId}`);
      const fullForm = fullFormResponse.form;
      
      const pdfBlob = await generateAccountabilityFormPDF(fullForm);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      window.dispatchEvent(
        new CustomEvent('openPdfPreview', {
          detail: { pdfUrl, title: `Accountability Form ${formNumber}` },
        })
      );
      
      onPdfModalOpen?.();
    } catch (error) {
      toast.error('Failed to generate PDF for this accountability form');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      Pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-300',
      Signed: 'bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-300',
      Approved: 'bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-300',
      Declined: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300',
      Disabled: 'bg-gray-500/15 text-gray-700 border-gray-500/30 dark:text-gray-300',
      'pending_dept_head': 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-300',
      'pending_staff': 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300',
      approved: 'bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-300',
      declined: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300',
      returned: 'bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-300',
    };

    const colorClass = statusColors[status] || 'bg-gray-500/15 text-gray-700 border-gray-500/30 dark:text-gray-300';

    return (
      <Badge className={colorClass}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUserName = (user: any) => {
    if (!user) return 'Unknown';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading forms...</div>
      </div>
    );
  }

  const currentAccountability = accountabilityForms[0];
  const otherAccountabilityForms = accountabilityForms.slice(1);

  return (
    <div className="space-y-6">
      {/* Current Accountability Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Current Accountability
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentAccountability ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-lg">{currentAccountability.formNumber}</span>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {currentAccountability.asset_code}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Assigned to: {getUserName(currentAccountability.user)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {currentAccountability.department?.name && `Department: ${currentAccountability.department.name}`}
                    {currentAccountability.department?.name && currentAccountability.location?.name && ' • '}
                    {currentAccountability.location?.name && `Location: ${currentAccountability.location.name}`}
                  </div>
                  <div className="text-sm text-gray-600">
                    Created: {formatDate(currentAccountability.created_at)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(currentAccountability.status)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAccountabilityFormPdf(currentAccountability.id, currentAccountability.formNumber)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View PDF
                  </Button>
                </div>
              </div>
              {otherAccountabilityForms.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllAccountability(!showAllAccountability)}
                  className="flex items-center gap-2"
                >
                  {showAllAccountability ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show All ({otherAccountabilityForms.length + 1})
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-gray-500">No accountability forms found for assets in this builder</div>
          )}
        </CardContent>
      </Card>

      {/* All Accountability Forms (expanded) */}
      {showAllAccountability && accountabilityForms.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>All Accountability History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accountabilityForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{form.formNumber}</div>
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <Package className="h-3 w-3" />
                        {form.asset_code}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {getUserName(form.user)} • {formatDate(form.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(form.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewAccountabilityFormPdf(form.id, form.formNumber)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return Forms Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Return Forms
          </CardTitle>
        </CardHeader>
        <CardContent>
          {returnForms.length > 0 ? (
            <div className="space-y-3">
              {returnForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold">{form.formNumber}</div>
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <Package className="h-3 w-3" />
                        {form.asset_code}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {getUserName(form.user)} • {formatDate(form.created_at)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Type: {form.return_type} • Reviewed / Checked by: {form.received_by}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(form.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">No return forms found for assets in this builder</div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Forms Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transfer Forms
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transferForms.length > 0 ? (
            <div className="space-y-3">
              {transferForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold">{form.formNumber}</div>
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <Package className="h-3 w-3" />
                        {form.asset_code}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      From: {getUserName(form.user)}
                      {form.new_user && ` → To: ${getUserName(form.new_user)}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(form.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(form.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">No transfer forms found for assets in this builder</div>
          )}
        </CardContent>
      </Card>

      {/* Borrow Forms Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Borrow Forms
          </CardTitle>
        </CardHeader>
        <CardContent>
          {borrowForms.length > 0 ? (
            <div className="space-y-3">
              {borrowForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold">{form.formNumber}</div>
                      {form.asset_code && (
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                          <Package className="h-3 w-3" />
                          {form.asset_code}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Borrowed by: {getUserName(form.user)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {form.asset_code && `Asset: ${form.asset_code}`}
                      {form.asset_name && ` - ${form.asset_name}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      Created: {formatDate(form.created_at)}
                      {form.returned_at && ` • Returned: ${formatDate(form.returned_at)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(form.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">No borrow forms found for assets in this builder</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
