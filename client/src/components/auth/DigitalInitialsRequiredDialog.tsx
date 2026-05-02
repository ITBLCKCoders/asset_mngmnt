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
import { PenTool } from 'lucide-react';

interface DigitalInitialsRequiredDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToProfile: () => void;
  onSkip: () => void;
}

export default function DigitalInitialsRequiredDialog({
  isOpen,
  onOpenChange,
  onGoToProfile,
  onSkip,
}: DigitalInitialsRequiredDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AppDialogFrame className="sm:max-w-md">
        <AppDialogGradientHeader
          title={
            <span className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              Digital Initials Required
            </span>
          }
          description="Your digital initials serve as your official electronic signature on all forms"
          showCloseButton={false}
        />
        <AppDialogBody className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800">
              Your digital initials are required to sign and approve forms within the system. 
              Please configure them to continue using all features securely.
            </AlertDescription>
          </Alert>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="font-medium">Why do you need digital initials?</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>They serve as your official electronic signature</li>
              <li>Required for form approvals and submissions</li>
              <li>Secured with SMS OTP / MFA verification</li>
              <li>Legally binding within this system</li>
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
            Go to Profile
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
