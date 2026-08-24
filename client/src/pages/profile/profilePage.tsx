'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import ProfileHeader from './profileComponents/profileHeader';
import TabTriggers from './profileComponents/tabTriggers';
import BasicInfoTab, {
  BasicInfoTabHandle,
} from './profileComponents/tabs/basicInfoTab';
import AccountTab from './profileComponents/tabs/accountTab';
import DocumentsTab from './profileComponents/tabs/documentsTab';

import { Tabs, TabsContent } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAvatarPreview } from '@/hooks/avatarPreview';
import { useDigitalInitialsTour } from '@/hooks/useDigitalInitialsTour';
import 'driver.js/dist/driver.css';

export default function ProfilePage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) return tabParam;
    const saved = localStorage.getItem('profile-active-tab');
    return saved || 'basic';
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const basicInfoTabRef = useRef<BasicInfoTabHandle>(null);

  const { user, loading: userLoading, refetch } = useCurrentUser();
  const { clearPreview } = useAvatarPreview();
  const { moveNext: tourMoveNext, destroyTour } = useDigitalInitialsTour();

  useEffect(() => {
    localStorage.setItem('profile-active-tab', activeTab);
  }, [activeTab]);

  // When URL has hash #asset-return-forms or #asset-borrow-forms, switch to documents tab and scroll
  useEffect(() => {
    const hash = location.hash || '';
    if (hash === '#asset-return-forms' || hash === '#asset-borrow-forms') {
      setActiveTab('documents');
      const sectionId =
        hash === '#asset-borrow-forms'
          ? 'asset-borrow-forms'
          : 'asset-return-forms';
      const t = setTimeout(() => {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  // Sync activeTab with ?tab= query when it changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams.get('tab')]);

  const handleStartEdit = () => {
    setIsEditing(true);
    // Tour Step 1 -> Step 2 (Edit Profile clicked → highlight canvas)
    window.setTimeout(() => {
      const fn: any = (window as any).tourMoveNextWhenReady;
      if (typeof fn === 'function') fn('#tour-step-2-canvas');
      else tourMoveNext();
    }, 450);
  };

  const handleCancel = () => {
    if (!isEditing) return;
    setShowCancelDialog(true);
  };

  const handleDiscardChanges = async () => {
    setShowCancelDialog(false);
    setIsEditing(false);
    clearPreview();
    delete (window as any).pendingAvatarFile;
    await refetch();
    toast.info('Changes discarded.');
  };

  const handleSave = () => {
    if (isSaving) return;
    setShowSaveDialog(true);
    // Tour Step 4 -> Step 5 (Save Profile → Yes, Save Changes) — wait for dialog element
    window.setTimeout(() => {
      const fn: any = (window as any).tourMoveNextWhenReady;
      if (typeof fn === 'function') fn('#tour-step-5-confirm-save');
      else tourMoveNext();
    }, 450);
  };

  const handleConfirmSave = async () => {
    setShowSaveDialog(false);
    // Tour Step 5 -> Step 6 is now driven by BasicInfoTab when consent dialog actually opens.
    // Keep a fallback in case save doesn't trigger consent (no initials change)
    window.setTimeout(() => {
      const consentVisible = !!document.getElementById('tour-step-6-agree-save');
      if (consentVisible) {
        const fn: any = (window as any).tourMoveNextWhenReady;
        if (typeof fn === 'function') fn('#tour-step-6-agree-save');
        else tourMoveNext();
      }
    }, 700);
    setIsSaving(true);
    toast.loading('Saving profile...', { id: 'save-profile' });

    try {
      if (basicInfoTabRef.current) {
        await basicInfoTabRef.current.save();
      }

      await refetch();

      toast.success('Profile updated successfully!', { id: 'save-profile' });
      setIsEditing(false);
    } catch (err: any) {
      // If the user cancelled, don't show an error toast
      if (err.message === 'Cancelled by user') {
        toast.dismiss('save-profile');
        setIsSaving(false);
        return;
      }
      // Handle initials conflict error - check message instead of status code
      if (err.message?.includes('already in use') || err.error?.includes('already in use')) {
        toast.dismiss('save-profile');
        toast.error(
          `These initials are already in use by another user please use a different one`,
          { id: 'save-profile' }
        );
        setIsSaving(false);
        setIsEditing(false);
        return;
      }
      toast.error(err.message || 'Failed to save profile.', {
        id: 'save-profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="space-y-6 p-4 sm:p-6">
        <ProfileHeader
          user={user}
          isLoading={userLoading}
          activeTab={activeTab}
          isEditing={isEditing}
          isSaving={isSaving}
          onStartEdit={handleStartEdit}
          onCancel={handleCancel}
          onSave={handleSave}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabTriggers />

          <TabsContent value="basic" className="mt-4 sm:mt-8">
            <BasicInfoTab ref={basicInfoTabRef} isEditing={isEditing} />
          </TabsContent>
          <TabsContent value="account" className="mt-4 sm:mt-8">
            <AccountTab />
          </TabsContent>
          <TabsContent value="documents" className="mt-4 sm:mt-8">
            <DocumentsTab
              setActiveTab={setActiveTab}
              initialSubTab={searchParams.get('docTab') ?? undefined}
            />
          </TabsContent>
        </Tabs>

        <AlertDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
        >
          <AppAlertDialogFrame className="max-w-md">
            <AppAlertDialogGradientHeader title="Discard Changes?" />
            <AppAlertDialogMessage>
              <AlertDialogDescription className="text-base text-gray-600">
                All unsaved changes will be lost.
              </AlertDialogDescription>
            </AppAlertDialogMessage>
            <AppAlertDialogChromeFooter>
              <AlertDialogCancel>No, Keep Editing</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDiscardChanges}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Yes, Discard
              </AlertDialogAction>
            </AppAlertDialogChromeFooter>
          </AppAlertDialogFrame>
        </AlertDialog>

        <AlertDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
        >
          <AppAlertDialogFrame className="max-w-md">
            <AppAlertDialogGradientHeader title="Save Profile Changes?" />
            <AppAlertDialogMessage>
              <AlertDialogDescription className="text-base text-gray-600">
                This will update your profile permanently.
              </AlertDialogDescription>
            </AppAlertDialogMessage>
            <AppAlertDialogChromeFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                id="tour-step-5-confirm-save"
                data-tour="step-5"
                onClick={handleConfirmSave}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                Yes, Save Changes
              </AlertDialogAction>
            </AppAlertDialogChromeFooter>
          </AppAlertDialogFrame>
        </AlertDialog>
      </div>
    </div>
  );
}
