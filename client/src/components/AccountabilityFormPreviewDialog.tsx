'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
} from '@/components/common/appDialogChrome';
import type { AccountabilityForm } from '@/pages/assets/accountability/accountabilityFormTypes';
import {
  AccountabilityFormDetail,
} from '@/pages/assets/accountability/accountabilityForm';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';

interface AccountabilityFormPreviewDialogProps {
  form: AccountabilityForm | null;
  onClose: () => void;
  onSign?: (formId: string, acknowledgments?: Record<string, unknown>) => Promise<void>;
  onDecline?: (formId: string, reason: string) => Promise<void>;
}

export function AccountabilityFormPreviewDialog({
  form,
  onClose,
  onSign,
  onDecline,
}: AccountabilityFormPreviewDialogProps) {
  const currentUser = useCurrentUser();
  const [localForm, setLocalForm] = useState<AccountabilityForm | null>(form);

  // Determine viewContext based on user permissions
  // Only show HR workflow (receive button) for users with HR accountability receiver role
  const hasHrAccountabilityReceiver =
    currentUser?.user?.role?.hr_accountability_receiver === true ||
    currentUser?.user?.hr_accountability_receiver === true;
  const viewContext = hasHrAccountabilityReceiver ? 'hrCopy' : 'all';
  
  // Update local form when prop changes
  useEffect(() => {
    setLocalForm(form);
  }, [form]);
  
  // OTP verification state
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const pendingSignRef = useRef<(() => Promise<void>) | null>(null);
  const pendingDeclineRef = useRef<(() => Promise<void>) | null>(null);
  const timerRef = useRef<{ expiry: NodeJS.Timeout | null; resend: NodeJS.Timeout | null }>({
    expiry: null,
    resend: null,
  });
  const expiryRef = useRef(300);
  const resendRef = useRef(60);
  const isTimerRunningRef = useRef(false);

  // OTP timer effects
  useEffect(() => {
    if (showOtpDialog && !isTimerRunningRef.current) {
      isTimerRunningRef.current = true;
      
      // Reset refs and state
      expiryRef.current = 300;
      resendRef.current = 60;
      setOtpExpiry(300);
      setResendCooldown(60);
      setCanResend(false);

      // Start expiry timer
      timerRef.current.expiry = setInterval(() => {
        expiryRef.current -= 1;
        setOtpExpiry(expiryRef.current);
        if (expiryRef.current <= 0) {
          setShowOtpDialog(false);
          setOtpCode(['', '', '', '', '', '']);
          toast.error('OTP expired. Please try again.');
          if (timerRef.current.expiry) clearInterval(timerRef.current.expiry);
          if (timerRef.current.resend) clearInterval(timerRef.current.resend);
          isTimerRunningRef.current = false;
        }
      }, 1000);

      // Start resend cooldown timer
      timerRef.current.resend = setInterval(() => {
        resendRef.current -= 1;
        setResendCooldown(resendRef.current);
        if (resendRef.current <= 0) {
          setCanResend(true);
          if (timerRef.current.resend) clearInterval(timerRef.current.resend);
        }
      }, 1000);
    } else if (!showOtpDialog && isTimerRunningRef.current) {
      // Clear timers when dialog closes
      if (timerRef.current.expiry) clearInterval(timerRef.current.expiry);
      if (timerRef.current.resend) clearInterval(timerRef.current.resend);
      isTimerRunningRef.current = false;
    }

    return () => {
      if (timerRef.current.expiry) clearInterval(timerRef.current.expiry);
      if (timerRef.current.resend) clearInterval(timerRef.current.resend);
    };
  }, [showOtpDialog]);

  if (!form) return null;

  const sendOtp = async () => {
    setIsSendingOtp(true);
    try {
      await api.post('/auth/initials/send-otp', {});
      // Timer will be reset by useEffect when showOtpDialog is true
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP. Please try again.');
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code.');
      return false;
    }

    setIsVerifyingOtp(true);
    try {
      await api.post('/auth/initials/verify-otp', {
        otp: code,
      });
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP. Please try again.');
      setOtpCode(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
      return false;
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    if (value && index < 5) otpInputsRef.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSign = async (formId: string, acknowledgments?: Record<string, unknown>) => {
    // Store the sign action and show OTP dialog
    pendingSignRef.current = async () => {
      try {
        // Get user's digital initials from profile
        const digitalInitials = (currentUser.user as any)?.digitalSignature || '';
        
        // Prepare acknowledgments with digital signature
        const acknowledgmentsData = digitalInitials ? {
          ...(acknowledgments || {}),
          digitalSignature: digitalInitials,
          signedBy: currentUser.user?.id,
          signedByName: `${currentUser.user?.firstName || ''} ${currentUser.user?.lastName || ''}`.trim(),
        } : acknowledgments || {};
        
        // Call the sign API directly
        const response = await api.post(`/accountability-forms/${formId}/sign`, { 
          acknowledgments: acknowledgmentsData 
        });
        
        // Update local form state to reflect signed status
        setLocalForm(prev => prev ? ({
          ...prev,
          status: 'Signed' as const,
          signed_at: new Date().toISOString(),
        }) : null);
        
        // Also call the parent onSign if provided for any additional logic
        if (onSign) {
          await onSign(formId, acknowledgmentsData);
        }
      } catch (error) {
        console.error('Failed to sign form:', error);
        throw error;
      }
    };
    
    // Send OTP and show dialog
    const otpSent = await sendOtp();
    if (otpSent) {
      setOtpCode(['', '', '', '', '', '']);
      setShowOtpDialog(true);
    }
  };

  const handleDeclineAfterOtp = async (formId: string, reason: string) => {
    if (!onDecline) return;
    await onDecline(formId, reason);
    setLocalForm(prev =>
      prev
        ? { ...prev, status: 'Disabled', declineReason: reason }
        : null
    );
    onClose();
  };

  return (
    <>
      <Dialog open={!!form} onOpenChange={onClose}>
        <AppDialogFrame className="flex h-[min(96dvh,calc(100vh-0.5rem))] !max-h-[min(96dvh,calc(100vh-0.5rem))] min-h-0 !max-w-2xl flex-col overflow-hidden !gap-0 !border-0 !p-0">
          {localForm && (
            <>
              <AppDialogGradientHeader
                className="shrink-0 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5"
                title={`${localForm.user.first_name} ${localForm.user.last_name} - ${localForm.formNumber}`}
                description="Asset Accountability Form Preview"
              />
              <AccountabilityFormDetail
                form={localForm}
                onClose={onClose}
                onSign={handleSign}
                setActiveTab={() => {}}
                headerInParentChrome={true}
                showDeclineButton
                onDecline={onDecline ? handleDeclineAfterOtp : undefined}
                viewContext={viewContext}
              />
            </>
          )}
        </AppDialogFrame>
      </Dialog>
      
      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent showCloseButton={false} className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="rounded-xl bg-blue-100 p-2">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                OTP SMS Verification
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-gray-600 leading-relaxed pt-1">
              OTP SMS Verification has been sent to your registered mobile number for accountability form signing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm text-gray-600 mb-2 block">
                Enter the 6-digit code sent to your registered mobile number
              </Label>
              <p className="text-sm text-gray-700 mt-2">
                Expires in:{' '}
                <strong className="text-red-600">{formatTime(otpExpiry)}</strong>
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {otpCode.map((_, i) => (
                <Input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={otpCode[i]}
                  onChange={e => handleOtpChange(e.target.value, i)}
                  onKeyDown={e => handleOtpKeyDown(e, i)}
                  className="w-12 h-12 text-center text-lg font-bold bg-white border-2 border-gray-300 focus:ring-2 focus:ring-green-500"
                  disabled={isVerifyingOtp || otpExpiry === 0}
                  ref={el => {
                    otpInputsRef.current[i] = el;
                  }}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowOtpDialog(false);
                setOtpCode(['', '', '', '', '', '']);
                pendingSignRef.current = null;
                pendingDeclineRef.current = null;
                onClose();
              }}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const resent = await sendOtp();
                if (resent) {
                  setOtpCode(['', '', '', '', '', '']);
                }
              }}
              disabled={!canResend || isSendingOtp || otpExpiry === 0}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              {resendCooldown > 0 ? (
                <>Resend in {resendCooldown}s</>
              ) : (
                <>Resend OTP</>
              )}
            </Button>
            <Button
              onClick={async () => {
                const verified = await verifyOtp();
                if (verified) {
                  setShowOtpDialog(false);
                  setOtpCode(['', '', '', '', '', '']);
                  // Execute the pending action after successful verification
                  if (pendingSignRef.current) {
                    try {
                      await pendingSignRef.current();
                      onClose();
                      toast.success('Form signed successfully');
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to sign form');
                      throw err;
                    }
                    pendingSignRef.current = null;
                  } else if (pendingDeclineRef.current) {
                    try {
                      await pendingDeclineRef.current();
                      onClose();
                      toast.success('Form declined successfully');
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to decline form');
                      throw err;
                    }
                    pendingDeclineRef.current = null;
                  }
                }
              }}
              disabled={
                isVerifyingOtp ||
                !otpCode.every(d => d) ||
                otpExpiry === 0
              }
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              Verify & Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
