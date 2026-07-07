'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { setToken, setRefreshToken } from '@/lib/api';
import { toast } from 'sonner';
import { Shield, Mail, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';

interface ForcePasswordChangeDialogProps {
  isOpen: boolean;
  tempToken: string | null;
  mfaEnabled: boolean;
  reason: 'mustChangePassword' | 'passwordExpired';
  message?: string;
  onChanged: () => void;
  onCancel: () => void;
}

export default function ForcePasswordChangeDialog({
  isOpen,
  tempToken,
  mfaEnabled,
  reason,
  message,
  onChanged,
  onCancel,
}: ForcePasswordChangeDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [useEmailOtp, setUseEmailOtp] = useState(!mfaEnabled);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const sendEmailOtp = async () => {
    if (!tempToken) return;
    setSendingOtp(true);
    setError(null);
    try {
      await api.post('/auth/password-change/send-otp', { tempToken });
      setOtpSent(true);
      toast.success('Verification code sent to your email');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to send code';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSendingOtp(false);
    }
  };

  // Auto-send email OTP when dialog opens for users without MFA
  useEffect(() => {
    if (isOpen && !mfaEnabled && tempToken && !otpSent) {
      sendEmailOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mfaEnabled, tempToken]);

  const handleSubmit = async () => {
    if (!tempToken) {
      toast.error('Session expired. Please log in again.');
      onCancel();
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const verificationCode = useEmailOtp ? emailOtp : totp;
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/password-change/force', {
        tempToken,
        newPassword,
        confirmPassword,
        ...(useEmailOtp ? { emailOtp } : { totp }),
      });

      setToken('authenticated');

      toast.success('Password changed successfully');
      onChanged();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Failed to change password';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const title =
    reason === 'mustChangePassword'
      ? 'Create New Password'
      : 'Password Expired';

  const description =
    message ||
    (reason === 'mustChangePassword'
      ? 'Your administrator has reset your password. Please create a new password that only you know.'
      : 'Your password has expired. Please create a new password to continue.');

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
      <AppDialogFrame className="sm:max-w-md">
        <AppDialogGradientHeader
          title={title}
          description={description}
        />
        <AppDialogBody className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              {mfaEnabled
                ? 'For security, your new password requires 2FA verification. You can use your authenticator app (TOTP) or email OTP as a backup.'
                : 'For security, a verification code has been sent to your email. Enter it below to confirm your new password.'}
            </AlertDescription>
          </Alert>

          {/* New password field */}
          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password field */}
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={isLoading}
            />
          </div>

          {/* 2FA Verification Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              {mfaEnabled ? (
                <Shield className="h-4 w-4 text-primary" />
              ) : (
                <Mail className="h-4 w-4 text-primary" />
              )}
              <Label className="font-medium">
                {mfaEnabled ? 'Verification Required' : 'Email Verification'}
              </Label>
            </div>

            {mfaEnabled && (
              <div className="flex gap-2 mb-3">
                <Button
                  type="button"
                  variant={!useEmailOtp ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setUseEmailOtp(false);
                    setEmailOtp('');
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Authenticator App
                </Button>
                <Button
                  type="button"
                  variant={useEmailOtp ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setUseEmailOtp(true);
                    setTotp('');
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email OTP
                </Button>
              </div>
            )}

            {useEmailOtp ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={emailOtp}
                    onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit email code"
                    disabled={isLoading}
                    className="text-center text-lg tracking-widest"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={sendEmailOtp}
                    disabled={sendingOtp || isLoading}
                  >
                    {sendingOtp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : otpSent ? (
                      'Resend'
                    ) : (
                      'Send Code'
                    )}
                  </Button>
                </div>
                {otpSent && (
                  <p className="text-xs text-muted-foreground">
                    Code sent to your email. Check your inbox.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totp}
                  onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit TOTP code"
                  disabled={isLoading}
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the code from your authenticator app
                </p>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </AppDialogBody>
        <AppDialogChromeFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !newPassword || !confirmPassword}
            className="rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
