'use client';

import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface MFARequiredDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToProfile: () => void;
  onSkip: () => void;
}

export default function MFARequiredDialog({
  isOpen,
  onOpenChange,
  onGoToProfile,
  onSkip,
}: MFARequiredDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AppDialogFrame className="sm:max-w-md">
        <AppDialogGradientHeader
          title={
            <span className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              Add Extra Security Layer
            </span>
          }
          description="Two-Factor Authentication adds an extra layer of security to protect your account"
          showCloseButton={false}
        />
        <AppDialogBody className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Two-Factor Authentication (MFA) is strongly recommended to protect your account from unauthorized access. 
              Enable MFA to keep your account secure.
            </AlertDescription>
          </Alert>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="font-medium">Why enable Two-Factor Authentication?</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Adds an extra layer of security to your account</li>
              <li>Protects against unauthorized access</li>
              <li>Required for high-security operations</li>
              <li>Uses your authenticator app for verification</li>
            </ul>
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter>
          <Button variant="outline" onClick={onSkip}>
            Skip for Now
          </Button>
          <Button 
            onClick={onGoToProfile} 
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Configure MFA
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
