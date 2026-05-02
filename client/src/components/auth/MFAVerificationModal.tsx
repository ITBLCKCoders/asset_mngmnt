'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { setToken, setRefreshToken } from '@/lib/api';
import { toast } from 'sonner';
import { Shield, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';
import MFARecoveryDialog from './MFARecoveryDialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { motion, AnimatePresence } from 'framer-motion';

interface MFAVerificationModalProps {
  isOpen: boolean;
  tempToken: string | null;
  onVerified: () => void;
  onCancel: () => void;
  onOpenChange?: (open: boolean) => void;
  onBackToLogin?: () => void;
}

export default function MFAVerificationModal({
  isOpen,
  tempToken,
  onVerified,
  onCancel,
  onOpenChange,
  onBackToLogin,
}: MFAVerificationModalProps) {
  const [totp, setTotp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  const verify = async () => {
    if (!tempToken) {
      toast.error('Session expired. Please log in again.');
      onCancel();
      return;
    }

    if (totp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        message: string;
      }>('/auth/mfa/verify', {
        tempToken,
        totp,
      });

      // Store auth tokens
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);

      toast.success('Login successful!');
      onVerified();
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid code. Please try again.';
      setError(errorMsg);
      setTotp('');
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && totp.length === 6 && !isLoading) {
      verify();
    }
  };

  const handleInputChange = (index: number, value: string) => {
    const allowedChars = /^\d$/;
    if (value && !allowedChars.test(value)) return;

    const newTotp = totp.split('');
    newTotp[index] = value;
    const newValue = newTotp.join('').slice(0, 6);
    setTotp(newValue);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      const inputs = document.querySelectorAll('.totp-input');
      const nextInput = inputs[index + 1] as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const allowedChars = /\d/g;
    const filtered = pastedData.match(allowedChars)?.join('').slice(0, 6) || '';
    setTotp(filtered);
    setError(null);
  };

  const handleCancel = () => {
    setTotp('');
    setError(null);
    onCancel();
  };

  const handleOpenRecovery = () => {
    setShowRecovery(true);
    onOpenChange?.(false);
  };

  const handleRecoveryVerified = () => {
    setShowRecovery(false);
    onVerified();
  };

  const handleRecoveryCancel = () => {
    setShowRecovery(false);
    onOpenChange?.(true);
  };

  return (
    <>
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
              title="Two-Factor Authentication"
              description="Enter the code from your authenticator app"
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
                className="space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <div className="space-y-4">
                  <label className="text-sm font-medium text-center block">
                    6-digit TOTP code
                  </label>
                  <div className="flex gap-2 justify-center">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Input
                        key={index}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={totp[index] || ''}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !totp[index] && index > 0) {
                            const inputs = document.querySelectorAll('.totp-input');
                            const prevInput = inputs[index - 1] as HTMLInputElement;
                            prevInput?.focus();
                          }
                          handleKeyDown(e);
                        }}
                        onPaste={handleInputPaste}
                        className="totp-input w-12 h-14 text-center text-2xl font-bold tracking-widest border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        disabled={isLoading}
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Use your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)
                  </p>
                </div>

                <Button
                  onClick={verify}
                  disabled={totp.length !== 6 || isLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
              </motion.div>

              <motion.div
                className="border-t pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.2 }}
              >
                <motion.button
                  onClick={handleOpenRecovery}
                  className="w-full text-sm font-medium border-2 border-red-600 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white py-2 px-4 rounded-md transition-all duration-200"
                  whileHover={{ scale: 1.02, backgroundColor: '#dc2626', color: '#ffffff' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <KeyRound className="w-4 h-4 mr-2 inline" />
                  Lost access to your authenticator?
                </motion.button>
              </motion.div>
            </AppDialogBody>

            <AppDialogChromeFooter>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.3 }}
              >
                <motion.button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="w-full border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-medium py-2 px-4 rounded-md transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2 inline" />
                  Back to Login
                </motion.button>
              </motion.div>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </motion.div>
      </Dialog>

      <MFARecoveryDialog
        isOpen={showRecovery}
        tempToken={tempToken}
        onVerified={handleRecoveryVerified}
        onCancel={handleRecoveryCancel}
        onBackToLogin={onBackToLogin || onCancel}
      />
    </>
  );
}
