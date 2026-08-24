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
import { BookOpen, PenTool } from 'lucide-react';

interface DigitalInitialsRequiredDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToProfile: () => void;
  onSkip?: () => void;
}

export default function DigitalInitialsRequiredDialog({
  isOpen,
  onOpenChange,
  onGoToProfile,
}: DigitalInitialsRequiredDialogProps) {
  const handleOpenChange = (open: boolean) => {
    // Block outside click / Esc from closing — only Go to Profile may close
    if (!open && isOpen) return;
    onOpenChange(open);
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal>
      <AppDialogFrame
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
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
          <a
            href="/user-manual?section=digital-initials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 underline underline-offset-2"
          >
            <BookOpen className="h-4 w-4" />
            Visit the user manual to follow the guide
          </a>
        </AppDialogBody>
        <AppDialogChromeFooter className="justify-end">
          <Button
            onClick={onGoToProfile}
            className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
          >
            Go to Profile
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
