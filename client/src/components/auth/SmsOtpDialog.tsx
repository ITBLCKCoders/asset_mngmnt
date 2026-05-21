'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Dialog } from '@/components/ui/dialog';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SmsOtpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sendOtpEndpoint?: string;
  verifyOtpEndpoint?: string;
  onVerified: () => void;
  onCancel: () => void;
  pendingActionRef: React.MutableRefObject<(() => Promise<void>) | null>;
  expirySeconds?: number;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  verifyButtonLabel?: string;
  phoneNumber?: string;
}

export default function SmsOtpDialog({
  isOpen,
  onOpenChange,
  sendOtpEndpoint = '/auth/initials/send-otp',
  verifyOtpEndpoint = '/auth/initials/verify-otp',
  onVerified,
  onCancel,
  pendingActionRef,
  expirySeconds = 300,
  title = 'OTP SMS Verification',
  description,
  icon = <ShieldCheck className="h-6 w-6 text-blue-600" />,
  verifyButtonLabel = 'Verify & Sign',
  phoneNumber,
}: SmsOtpDialogProps) {
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(expirySeconds);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<{ expiry: NodeJS.Timeout | null; resend: NodeJS.Timeout | null }>({
    expiry: null,
    resend: null,
  });
  const expiryRef = useRef(expirySeconds);
  const resendRef = useRef(60);
  const onOpenChangeRef = useRef(onOpenChange);
  const isTimerRunningRef = useRef(false);

  // Build description with phone number if provided
  const displayDescription = description || (phoneNumber
    ? `OTP SMS Verification has been sent to ${phoneNumber} for accountability form signing.`
    : 'OTP SMS Verification has been sent to your registered mobile number for accountability form signing.');


  // Keep onOpenChange ref in sync
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden !important';
      document.documentElement.style.overflow = 'hidden !important';
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
      };
    }
  }, [isOpen]);

  // OTP timer effects - only depends on isOpen
  useEffect(() => {
    if (isOpen && !isTimerRunningRef.current) {
      isTimerRunningRef.current = true;
      
      // Reset refs and state
      expiryRef.current = expirySeconds;
      resendRef.current = 60;
      setOtpExpiry(expirySeconds);
      setResendCooldown(60);
      setCanResend(false);

      // Start expiry timer
      timerRef.current.expiry = setInterval(() => {
        expiryRef.current -= 1;
        setOtpExpiry(expiryRef.current);
        if (expiryRef.current <= 0) {
          onOpenChangeRef.current(false);
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
    } else if (!isOpen && isTimerRunningRef.current) {
      // Clear timers when dialog closes
      if (timerRef.current.expiry) clearInterval(timerRef.current.expiry);
      if (timerRef.current.resend) clearInterval(timerRef.current.resend);
      isTimerRunningRef.current = false;
    }

    return () => {
      if (timerRef.current.expiry) clearInterval(timerRef.current.expiry);
      if (timerRef.current.resend) clearInterval(timerRef.current.resend);
    };
  }, [isOpen]);


  const sendOtp = useCallback(async () => {
    setIsSendingOtp(true);
    try {
      await api.post(sendOtpEndpoint, {});
      setOtpExpiry(expirySeconds);
      setCanResend(false);
      setResendCooldown(60);
      toast.success('OTP sent successfully');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP. Please try again.');
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  }, [sendOtpEndpoint, expirySeconds]);

  useEffect(() => {
    if (isOpen) {
      otpInputsRef.current[0]?.focus();
      // Automatically send OTP when dialog opens
      sendOtp();
    }
  }, [isOpen, sendOtp]);

  const verifyOtp = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code.');
      return false;
    }

    setIsVerifyingOtp(true);
    try {
      await api.post(verifyOtpEndpoint, {
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

  const handleCancel = () => {
    onOpenChange(false);
    setOtpCode(['', '', '', '', '', '']);
    onCancel();
  };

  const handleVerify = async () => {
    const verified = await verifyOtp();
    if (!verified) return;

    const action = pendingActionRef.current;
    pendingActionRef.current = null;

    onOpenChange(false);
    setOtpCode(['', '', '', '', '', '']);

    if (!action) return;

    try {
      await action();
      onVerified();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete action');
      throw err;
    }
  };

  const handleResend = async () => {
    const resent = await sendOtp();
    if (resent) {
      setOtpCode(['', '', '', '', '', '']);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        disableScroll
        className="max-w-md !overflow-hidden !p-6"
        overlayClassName="fixed inset-0 z-50 !bg-gray-500/50 !backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-xl bg-blue-100 p-2">{icon}</div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 leading-relaxed pt-1">
            {displayDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm text-gray-600 mb-2 block">
              Enter the 6-digit code sent to {phoneNumber || 'your registered mobile number'}
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
            onClick={handleCancel}
            className="border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleResend}
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
            onClick={handleVerify}
            disabled={
              isVerifyingOtp ||
              !otpCode.every(d => d) ||
              otpExpiry === 0
            }
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {verifyButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
