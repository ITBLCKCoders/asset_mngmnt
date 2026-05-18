'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  AppAlertDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
} from '@/components/common/appDialogChrome';

interface IdleTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warningTime: number;
  onStay: () => void;
  onLogout: () => void;
}

export function IdleTimerDialog({
  open,
  onOpenChange,
  warningTime,
  onStay,
  onLogout,
}: IdleTimerDialogProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(warningTime / 1000));

  useEffect(() => {
    if (!open) {
      setSecondsLeft(Math.ceil(warningTime / 1000));
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, warningTime, onLogout]);

  useEffect(() => {
    // Add custom CSS for countdown animation
    if (!document.getElementById('idle-style')) {
      const s = document.createElement('style');
      s.id = 'idle-style';
      s.textContent = `
        #big-num{font-size:5rem;font-weight:700;color:#EE1D25;
          animation:p 1.4s infinite,g 1.4s infinite alternate}
        @keyframes p{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
        @keyframes g{0%{text-shadow:0 0 20px #EE1D25}100%{text-shadow:0 0 50px #EE1D25}}
      `;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AppAlertDialogFrame className="max-w-md">
        <AppAlertDialogGradientHeader title="Session Expiring" />
        <AppAlertDialogMessage>
          <AlertDialogDescription className="text-base text-gray-600">
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div id="big-num" style={{ animationDuration: secondsLeft <= 10 ? '0.6s' : '1.4s' }}>
                {secondsLeft}
              </div>
              <p style={{ margin: '16px 0', fontSize: '1.1rem' }}>
                Auto logout in <strong>{secondsLeft}</strong> seconds
                <br />
                <small style={{ color: '#666' }}>
                  You have 1 chance to stay logged in
                </small>
              </p>
            </div>
          </AlertDialogDescription>
        </AppAlertDialogMessage>
        <AppAlertDialogChromeFooter>
          <AlertDialogCancel onClick={onLogout}>Logout Now</AlertDialogCancel>
          <AlertDialogAction
            onClick={onStay}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Stay Logged In
          </AlertDialogAction>
        </AppAlertDialogChromeFooter>
      </AppAlertDialogFrame>
    </AlertDialog>
  );
}
