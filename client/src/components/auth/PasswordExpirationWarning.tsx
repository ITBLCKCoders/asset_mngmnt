'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { AlertTriangle, Clock, KeyRound } from 'lucide-react';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';

const DISMISS_STORAGE_KEY = 'password_expiration_dismissed_at';
const DISMISS_HOURS = 24; // Re-show warning after 24 hours

export default function PasswordExpirationWarning() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await api.get<{
          expired: boolean;
          expiringSoon: boolean;
          daysRemaining: number | null;
        }>('/auth/password-status');

        if (response.expiringSoon && response.daysRemaining != null) {
          // Check if user has recently dismissed
          const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
          if (dismissedAt) {
            const dismissedDate = new Date(dismissedAt);
            const hoursSinceDismiss =
              (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceDismiss < DISMISS_HOURS) {
              // Still within dismiss period, don't show
              return;
            }
          }
          setDaysRemaining(response.daysRemaining);
          setIsOpen(true);
        }
      } catch (error) {
        // Silently fail - don't block the app if this fails
        console.warn('Failed to check password expiration status:', error);
      }
    };

    checkStatus();
  }, []);

  const handleChangeNow = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_STORAGE_KEY, new Date().toISOString());
    setIsOpen(false);
  };

  if (!isOpen || daysRemaining == null) return null;

  const isUrgent = daysRemaining <= 3;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleDismiss()}>
      <AppDialogFrame className="sm:max-w-md">
        <AppDialogGradientHeader
          title="Password Expiring Soon"
          description={`Your password will expire in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`}
        />
        <AppDialogBody className="space-y-4">
          <Alert
            className={
              isUrgent
                ? 'border-red-200 bg-red-50'
                : 'border-amber-200 bg-amber-50'
            }
          >
            <AlertTriangle
              className={`h-4 w-4 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}
            />
            <AlertDescription
              className={isUrgent ? 'text-red-800' : 'text-amber-800'}
            >
              {isUrgent ? (
                <span className="font-medium">
                  Your password expires very soon. Please change it now to avoid
                  being locked out.
                </span>
              ) : (
                <span>
                  For security, we recommend changing your password before it
                  expires. Once expired, you will be required to change it
                  before logging in.
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold text-lg">
                {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'} Remaining
              </p>
              <p className="text-sm text-muted-foreground">
                Update your password to keep your account secure
              </p>
            </div>
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter>
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="rounded-xl"
          >
            Remind Me Later
          </Button>
          <Button onClick={handleChangeNow} className="rounded-xl">
            <KeyRound className="mr-2 h-4 w-4" />
            Change Password Now
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
