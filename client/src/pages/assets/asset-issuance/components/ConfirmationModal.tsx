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
import { api } from '@/lib/api';
import { toast } from 'sonner';
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
  onConfirm: (signAsIssuer: boolean, signITCopy: boolean) => Promise<void>;
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
  const [signITCopy, setSignITCopy] = useState(true);
  const canConfirmAssignment = signAsIssuer && signITCopy && !assigning;

  // OTP verification state
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const pendingConfirmRef = useRef<((signAsIssuer: boolean, signITCopy: boolean) => Promise<void>) | null>(null);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSignAsIssuer(true);
    setSignITCopy(true);
  }, [isOpen]);

  const checkUnsignedAccountabilityForms = async (userId: string) => {
    try {
      const response = await api.get(`/accountability-forms/check-unsigned/${userId}`);
      return response;
    } catch (err: any) {
      console.error('Failed to check unsigned accountability forms:', err);
      return { hasUnsignedForms: false, unsignedForms: [] };
    }
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

            {/* Sign IT Copy Option */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="sign-it-copy"
                  checked={signITCopy}
                  onCheckedChange={checked => setSignITCopy(!!checked)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="sign-it-copy"
                    className="text-sm font-medium text-gray-900"
                  >
                    {selectedAssets.some(assetId => {
                      const asset = assets.find(a => a.id === assetId);
                      return (
                        asset &&
                        (asset.type?.toLowerCase().includes('it') ||
                          asset.category?.toLowerCase().includes('it'))
                      );
                    })
                      ? 'Sign this accountability form for IT copy?'
                      : 'Sign this accountability form for Admin copy?'}
                  </label>
                  <p className="text-xs text-gray-600">
                    When checked, your digital initials will be added to the
                    accountability form under the "Copy for IT" section.
                  </p>
                </div>
              </div>
            </div>
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
                // TEMPORARILY DISABLED: pending accountability signature check
                // This block previously checked if the receiving user had unsigned
                // accountability forms and blocked the assignment if so.
                // TODO: Re-enable once accountability signing flow is stable.
                //
                // if (selectedUser) {
                //   const checkResult = await checkUnsignedAccountabilityForms(selectedUser);
                //   if (checkResult.hasUnsignedForms && checkResult.unsignedForms.length > 0) {
                //     await api.post('/notifications/accountability-unsigned', {
                //       userId: selectedUser,
                //       unsignedForms: checkResult.unsignedForms,
                //     });
                //     const receivingUser = users?.find(u => u.userID === selectedUser);
                //     const userName = receivingUser
                //       ? `${receivingUser.first_name} ${receivingUser.last_name}`
                //       : 'the user';
                //     toast.error(`Assignment blocked`, {
                //       description: `${userName} has an accountability form that has not been signed yet. A notification has been sent to them to sign it before they can receive new assets.`,
                //       duration: 6000,
                //     });
                //     onOpenChange(false);
                //     return;
                //   }
                // }

                // Store the confirm action for SmsOtpDialog
                pendingActionRef.current = async () => {
                  await onConfirm(signAsIssuer, signITCopy);
                };

                // Close confirmation modal and show OTP dialog
                onOpenChange(false);
                setShowOtpDialog(true);
              }}
              disabled={!canConfirmAssignment}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400"
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
