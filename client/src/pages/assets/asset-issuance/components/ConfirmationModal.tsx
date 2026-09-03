'use client';

import { useEffect, useState, useRef } from 'react';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Package,
  Users,
  Warehouse,
  User,
  Building2,
  MapPin,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface Asset {
  id: string;
  name: string;
  serialNo: string;
  type?: string;
  category?: string;
}

interface Department {
  departmentID: string;
  name: string;
}

interface Location {
  locationID: string;
  name: string;
}

interface User {
  userID: string;
  first_name: string;
  last_name: string;
}

interface ApproverOption {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ApproversResponse {
  approvers?: {
    approver?: ApproverOption | null;
    sub_approver?: ApproverOption | null;
  };
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: string[];
  assets: Asset[];
  departments: Department[];
  locations: Location[];
  users: User[];
  selectedBuilding: string;
  selectedDepartment: string;
  selectedLocation: string;
  selectedRoom: string;
  selectedUser: string;
  assigning: boolean;
  onConfirm: (
    signAsIssuer: boolean,
    adminCopySignerId: string | null,
    tempAccountability: boolean
  ) => Promise<void>;
}

export function ConfirmationModal({
  isOpen,
  onOpenChange,
  selectedAssets,
  assets,
  departments,
  locations,
  users,
  selectedBuilding,
  selectedDepartment,
  selectedLocation,
  selectedRoom,
  selectedUser,
  assigning,
  onConfirm,
}: ConfirmationModalProps) {
  const { user } = useCurrentUser();
  const [signAsIssuer, setSignAsIssuer] = useState(true);
  const [adminCopySignerId, setAdminCopySignerId] = useState('');
  const [tempAccountability, setTempAccountability] = useState(false);
  const [approverOptions, setApproverOptions] = useState<{
    approver: ApproverOption | null;
    subApprover: ApproverOption | null;
  }>({ approver: null, subApprover: null });
  const [approverOptionsLoading, setApproverOptionsLoading] = useState(false);
  const selectedUserData = users?.find(u => u.userID === selectedUser);
  const assigneeRoleName = (selectedUserData as any)?.role?.name;
  const allowedRoles = ['IT Asset Manager', 'Admin Asset Manager', 'Admin', 'Global Admin'];
  const showTempAccountability = assigneeRoleName ? allowedRoles.includes(assigneeRoleName) : false;

  // Determine copy scope (IT vs Admin) based on the selected assets' department, category, type, name, or code.
  // The dropdown label updates accordingly.
  const hasItAsset = selectedAssets.some(assetId => {
    const asset = assets.find(
      a => a.id === assetId || (a as any).asset_code === assetId || (a as any).assetID === assetId
    );
    if (!asset) return false;
    const dept = (
      (asset as any).department ||
      (asset as any).categoryDepartment ||
      (asset as any).department_name ||
      ''
    ).toLowerCase();
    const t = (asset.type || '').toLowerCase();
    const c = (asset.category || '').toLowerCase();
    const n = (asset.name || '').toLowerCase();
    const code = (asset.id || '').toLowerCase();

    return (
      dept.includes('it') ||
      dept.includes('information technology') ||
      t.includes('it') ||
      c.includes('it') ||
      t.includes('computer') ||
      c.includes('computer') ||
      t.includes('laptop') ||
      c.includes('laptop') ||
      t.includes('server') ||
      c.includes('server') ||
      t.includes('cpu') ||
      c.includes('cpu') ||
      code.includes('cpu') ||
      t.includes('desktop') ||
      c.includes('desktop') ||
      t.includes('hardware') ||
      c.includes('hardware') ||
      t.includes('workstation') ||
      c.includes('workstation') ||
      t.includes('monitor') ||
      c.includes('monitor') ||
      n.includes('cpu') ||
      n.includes('computer') ||
      n.includes('laptop')
    );
  });
  const hasAdminAsset = selectedAssets.some(assetId => {
    const asset = assets.find(
      a => a.id === assetId || (a as any).asset_code === assetId || (a as any).assetID === assetId
    );
    if (!asset) return false;
    const dept = (
      (asset as any).department ||
      (asset as any).categoryDepartment ||
      (asset as any).department_name ||
      ''
    ).toLowerCase();
    const t = (asset.type || '').toLowerCase();
    const c = (asset.category || '').toLowerCase();

    return (
      dept.includes('admin') ||
      dept.includes('administration') ||
      t.includes('admin') ||
      c.includes('admin') ||
      t.includes('administration') ||
      c.includes('administration')
    );
  });
  const hasCopyScope = hasItAsset || hasAdminAsset;
  const copyType: 'IT' | 'Admin' | null = hasItAsset
    ? 'IT'
    : hasAdminAsset
      ? 'Admin'
      : null;
  const dropdownLabel = copyType === 'IT'
    ? 'Who should sign this accountability form for IT copy?'
    : copyType === 'Admin'
      ? 'Who should sign this accountability form for Admin copy?'
      : 'Who should sign this accountability form for the copy?';

  // Load designated approver / sub-approver for the issuer (logged-in user).
  useEffect(() => {
    if (!isOpen || !user?.id) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setApproverOptionsLoading(true);
        const response = await api.get<ApproversResponse>(
          `/users/${user.id}/approvers`
        );
        if (cancelled) return;
        const data = response?.approvers;
        setApproverOptions({
          approver: data?.approver ?? null,
          subApprover: data?.sub_approver ?? null,
        });
      } catch (err: any) {
        if (cancelled) return;
        console.error('Failed to load approver options:', err);
        toast.error('Failed to load approver options for issuer');
        setApproverOptions({ approver: null, subApprover: null });
      } finally {
        if (!cancelled) setApproverOptionsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id]);

  // Confirm allowed when: signing as issuer, copy scope handled (either no
  // copy scope, or a signer has been selected), not currently assigning.
  const hasCopySigner =
    !hasCopyScope ||
    (adminCopySignerId !== '' &&
      (adminCopySignerId === '__approver__' ||
        adminCopySignerId === '__sub_approver__'));
  const canConfirmAssignment = signAsIssuer && hasCopySigner && !assigning;

  // OTP verification state
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSignAsIssuer(true);
    setAdminCopySignerId('');
    setTempAccountability(false);
  }, [isOpen]);

  const resolveSignerId = (): string | null => {
    if (!hasCopyScope) return null;
    if (adminCopySignerId === '__approver__') {
      return approverOptions.approver?.user_id ?? null;
    }
    if (adminCopySignerId === '__sub_approver__') {
      return approverOptions.subApprover?.user_id ?? null;
    }
    return null;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <AppDialogFrame className="w-[min(96vw,500px)] max-h-[min(96dvh,900px)] min-h-0 sm:max-w-[500px] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
          <AppDialogGradientHeader
            title={
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-white" />
                Confirm Asset Assignment
              </span>
            }
            description="Please review the assignment details before proceeding."
          />

          <AppDialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">
                Assets to Assign ({selectedAssets.length})
              </h4>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {selectedAssets.map(assetId => {
                  const asset = assets.find(a => a.id === assetId);
                  return asset ? (
                    <div key={assetId} className="flex items-start gap-2 text-sm">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {asset.id} {asset.name} {asset.serialNo}
                      </span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {(selectedBuilding ||
              selectedDepartment ||
              selectedLocation ||
              selectedRoom ||
              selectedUser) && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Assignment Details
                </h4>
                <div className="space-y-2 text-sm">
                  {selectedBuilding && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-500" />
                      <span className="text-gray-600">Building:</span>
                      <span className="font-medium text-gray-900">
                        {selectedBuilding}
                      </span>
                    </div>
                  )}
                  {selectedDepartment && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium text-gray-900">
                        {
                          departments?.find(
                            d => d.departmentID === selectedDepartment
                          )?.name
                        }
                      </span>
                    </div>
                  )}
                  {selectedLocation && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Warehouse className="h-4 w-4 text-purple-500" />
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium text-gray-900">
                        {
                          locations?.find(l => l.locationID === selectedLocation)
                            ?.name
                        }
                      </span>
                    </div>
                  )}
                  {selectedRoom && (
                    <div className="flex flex-wrap items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600">Room/Area:</span>
                      <span className="font-medium text-gray-900">
                        {selectedRoom}
                      </span>
                    </div>
                  )}
                  {selectedUser && (
                    <div className="flex flex-wrap items-center gap-2">
                      <User className="h-4 w-4 text-orange-500" />
                      <span className="text-gray-600">User:</span>
                      <span className="font-medium text-gray-900">
                        {users?.find(u => u.userID === selectedUser)?.first_name}{' '}
                        {users?.find(u => u.userID === selectedUser)?.last_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sign as Issuer Option */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="sign-as-issuer"
                  checked={signAsIssuer}
                  onCheckedChange={checked => setSignAsIssuer(!!checked)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="sign-as-issuer"
                    className="text-sm font-medium text-gray-900"
                  >
                    Sign this accountability form as Issuer?
                  </label>
                  <p className="text-xs text-gray-600">
                    When checked, your digital initials will be added to the
                    accountability form as the issuer.
                  </p>
                </div>
              </div>
            </div>

            {/* IT/Admin Copy Signer Selection (replaces the old checkbox) */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  {dropdownLabel}
                </label>
                {!hasCopyScope ? (
                  <p className="text-xs text-gray-600">
                    The selected assets do not require an IT/Admin copy
                    signature; proceeding will issue the form directly to the
                    new owner.
                  </p>
                ) : approverOptionsLoading ? (
                  <p className="text-xs text-gray-500">Loading approvers…</p>
                ) : !approverOptions.approver && !approverOptions.subApprover ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-600">
                      No designated approver or sub-approver found for your account (issuer). Please assign one before continuing.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={adminCopySignerId}
                    onValueChange={setAdminCopySignerId}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select a signer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {approverOptions.approver && (
                        <SelectItem value="__approver__">
                          Approver: {approverOptions.approver.first_name}{' '}
                          {approverOptions.approver.last_name}
                        </SelectItem>
                      )}
                      {approverOptions.subApprover && (
                        <SelectItem value="__sub_approver__">
                          Sub-approver:{' '}
                          {approverOptions.subApprover.first_name}{' '}
                          {approverOptions.subApprover.last_name}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {hasCopyScope && (
                  <p className="text-xs text-gray-600">
                    The selected approver/sub-approver will sign the
                    {' '}
                    {copyType === 'IT'
                      ? 'IT'
                      : copyType === 'Admin'
                        ? 'Admin'
                        : ''}{' '}
                    copy. The form will then be routed to the new asset owner's approver/sub-approver for final approval before being issued to the owner.
                  </p>
                )}
              </div>
            </div>
            {/* Temp Accountability Option */}
            {showTempAccountability && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900">
                      Put this asset in user temp accountability
                    </label>
                    <p className="text-xs text-gray-600">
                      When enabled, all assigned assets will be placed under
                      temporary accountability of the user.
                    </p>
                  </div>
                  <Switch
                    checked={tempAccountability}
                    onCheckedChange={setTempAccountability}
                    className="shrink-0"
                  />
                </div>
              </div>
            )}
          </AppDialogBody>

          <AppDialogChromeFooter className="shrink-0 border-t bg-gray-50">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                pendingActionRef.current = async () => {
                  await onConfirm(signAsIssuer, resolveSignerId(), tempAccountability);
                };

                // Close confirmation modal and show OTP dialog
                onOpenChange(false);
                setShowOtpDialog(true);
              }}
              disabled={!canConfirmAssignment}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:from-red-700 disabled:from-gray-300 disabled:to-gray-400"
            >
              {assigning ? (
                <div className="flex items-center gap-2 text-white">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Assigning...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Assignment
                </div>
              )}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* OTP Verification Dialog */}
      <SmsOtpDialog
        isOpen={showOtpDialog}
        onOpenChange={(otpDialogOpen) => {
          setShowOtpDialog(otpDialogOpen);
          // Don't clear pendingActionRef here - SmsOtpDialog handles it after execution
        }}
        sendOtpEndpoint='/auth/initials/send-otp'
        verifyOtpEndpoint='/auth/initials/verify-otp'
        onVerified={() => {
          // SmsOtpDialog already handles setting pendingActionRef.current = null after execution
        }}
        onCancel={() => {
          pendingActionRef.current = null;
        }}
        pendingActionRef={pendingActionRef}
        title='OTP SMS Verification'
        description='OTP SMS Verification has been sent for asset assignment confirmation.'
        verifyButtonLabel='Verify & Confirm'
        phoneNumber={user?.contactNumber || undefined}
      />
    </>
  );
}
