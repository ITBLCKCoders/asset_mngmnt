'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { setToken, setRefreshToken } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, ArrowLeft } from 'lucide-react';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { motion } from 'framer-motion';

interface MFARecoveryDialogProps {
  isOpen: boolean;
  tempToken: string | null;
  onVerified: () => void;
  onCancel: () => void;
  onBackToLogin: () => void;
}

export default function MFARecoveryDialog({
  isOpen,
  tempToken,
  onVerified,
  onCancel,
  onBackToLogin,
}: MFARecoveryDialogProps) {
  const [otp, setOtp] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState<'backup' | 'email'>('backup');
  const [error, setError] = useState<string | null>(null);

  const sendOTP = async () => {
    if (!tempToken) {
      toast.error('Session expired. Please log in again.');
      onCancel();
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await api.post('/auth/mfa/recovery/send', { tempToken });
      setOtpSent(true);
      toast.success('Recovery code sent to your email');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to send recovery code';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const verifyBackupCode = async () => {
    if (!tempToken) {
      toast.error('Session expired. Please log in again.');
      onCancel();
      return;
    }

    if (backupCode.length !== 8 || !/^[0-9A-F]{8}$/i.test(backupCode)) {
      setError('Please enter a valid 8-character backup code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        message: string;
      }>('/auth/mfa/verify', {
        tempToken,
        totp: backupCode,
      });

      // Store auth tokens
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);

      toast.success('Login successful!');
      onVerified();
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid backup code. Please try again.';
      setError(errorMsg);
      setBackupCode('');
      toast.error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyOTP = async () => {
    if (!tempToken) {
      toast.error('Session expired. Please log in again.');
      onCancel();
      return;
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        message: string;
      }>('/auth/mfa/recovery/verify', {
        tempToken,
        otp,
      });

      // Store auth tokens
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);

      toast.success('Login successful!');
      onVerified();
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid code. Please try again.';
      setError(errorMsg);
      setOtp('');
      toast.error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setOtp('');
    setOtpSent(false);
    setError(null);
    onCancel();
  };

  const handleBack = () => {
    setOtp('');
    setBackupCode('');
    setOtpSent(false);
    setRecoveryMode('backup');
    setError(null);
    onCancel();
  };

  const handleBackupCodeChange = (index: number, value: string) => {
    const allowedChars = /^[0-9A-Fa-f]$/;
    if (value && !allowedChars.test(value)) return;

    const newBackupCode = backupCode.split('');
    newBackupCode[index] = value;
    const newValue = newBackupCode.join('').slice(0, 8);
    setBackupCode(newValue);
    setError(null);

    // Auto-focus next input
    if (value && index < 7) {
      const inputs = document.querySelectorAll('.backup-code-input');
      const nextInput = inputs[index + 1] as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    const allowedChars = /^\d$/;
    if (value && !allowedChars.test(value)) return;

    const newOtp = otp.split('');
    newOtp[index] = value;
    const newValue = newOtp.join('').slice(0, 6);
    setOtp(newValue);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      const inputs = document.querySelectorAll('.otp-input');
      const nextInput = inputs[index + 1] as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, type: 'backup' | 'otp') => {
    const inputValue = type === 'backup' ? backupCode[index] : otp[index];

    if (e.key === 'Backspace' && !inputValue && index > 0) {
      const selector = type === 'backup' ? '.backup-code-input' : '.otp-input';
      const inputs = document.querySelectorAll(selector);
      const prevInput = inputs[index - 1] as HTMLInputElement;
      prevInput?.focus();
    }

    if (e.key === 'Enter' && !isVerifying) {
      if (type === 'backup') {
        verifyBackupCode();
      } else {
        verifyOTP();
      }
    }
  };

  return (
    <Dialog open={isOpen} modal={true}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <AppDialogFrame
          showCloseButton={false}
          onPointerDownOutside={(e: any) => e.preventDefault()}
          onEscapeKeyDown={(e: any) => e.preventDefault()}
        >
          <AppDialogGradientHeader
            title="MFA Recovery"
            description={
              recoveryMode === 'backup'
                ? 'Enter your backup code or send a recovery email'
                : otpSent
                ? 'Enter the code sent to your email'
                : 'Send a recovery code to your email'
            }
            showCloseButton={false}
          />

          <AppDialogBody className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              {recoveryMode === 'backup' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-center block">
                      Enter 8-character backup code
                    </label>
                    <div className="flex gap-2 justify-center">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <Input
                          key={index}
                          type="text"
                          inputMode="text"
                          maxLength={1}
                          value={backupCode[index] || ''}
                          onChange={(e) => handleBackupCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'backup')}
                          className="backup-code-input w-10 h-12 text-center text-xl font-bold tracking-widest border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          disabled={isVerifying}
                          autoFocus={index === 0}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Enter the backup code you saved when setting up MFA
                    </p>
                  </div>

                  <Button
                    onClick={verifyBackupCode}
                    disabled={backupCode.length !== 8 || isVerifying}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isVerifying ? (
                      <span className="inline-block h-4 w-24 animate-pulse rounded bg-white/40" />
                    ) : (
                      'Verify Backup Code'
                    )}
                  </Button>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground text-center mb-2">
                      Don't have a backup code?
                    </p>
                    <motion.button
                      onClick={() => setRecoveryMode('email')}
                      className="w-full text-sm font-medium border-2 border-red-600 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white py-2 px-4 rounded-md transition-all duration-200"
                      whileHover={{ scale: 1.02, backgroundColor: '#dc2626', color: '#ffffff' }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.1 }}
                    >
                      <Mail className="w-4 h-4 mr-2 inline" />
                      Send Recovery Code to Email
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!otpSent ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <p>
                          We'll send a 6-digit recovery code to your email address.
                          This code expires in 10 minutes.
                        </p>
                      </div>
                      <motion.button
                        onClick={sendOTP}
                        disabled={isSending}
                        className="w-full text-sm font-medium border-2 border-red-600 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white py-2 px-4 rounded-md transition-all duration-200"
                        whileHover={{ scale: 1.02, backgroundColor: '#dc2626', color: '#ffffff' }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.1 }}
                      >
                        {isSending ? (
                          <span className="inline-block h-4 w-20 animate-pulse rounded bg-white/40" />
                        ) : (
                          'Send Recovery Code'
                        )}
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-center block">
                          Enter 6-digit recovery code
                        </label>
                        <div className="flex gap-2 justify-center">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <Input
                              key={index}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={otp[index] || ''}
                              onChange={(e) => handleOTPChange(index, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 'otp')}
                              className="otp-input w-10 h-12 text-center text-xl font-bold tracking-widest border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                              disabled={isVerifying}
                              autoFocus={index === 0}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Enter the 6-digit code sent to your email
                        </p>
                      </div>

                      <Button
                        onClick={verifyOTP}
                        disabled={otp.length !== 6 || isVerifying}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isVerifying ? (
                          <span className="inline-block h-4 w-24 animate-pulse rounded bg-white/40" />
                        ) : (
                          'Verify'
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={sendOTP}
                        disabled={isSending}
                        className="w-full text-sm"
                      >
                        Resend Code
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AppDialogBody>

          <AppDialogChromeFooter>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <motion.button
                onClick={handleBack}
                disabled={isSending || isVerifying}
                className="w-full border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-medium py-2 px-4 rounded-md transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft className="w-4 h-4 mr-2 inline" />
                Back to MFA
              </motion.button>
            </motion.div>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </motion.div>
    </Dialog>
  );
}
