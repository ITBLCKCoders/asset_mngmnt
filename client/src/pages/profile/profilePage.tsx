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
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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

  const basicInfoTabRef = useRef<BasicInfoTabHandle>(null);

  const { user, loading: userLoading, refetch } = useCurrentUser();

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
  };

  const handleCancel = async () => {
    if (!isEditing) return;

    const result = await Swal.fire({
      title: 'Discard Changes?',
      text: 'All unsaved changes will be lost.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Discard',
      cancelButtonText: 'No, Keep Editing',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setIsEditing(false);
      delete (window as any).pendingAvatarFile;
      await refetch();
      toast.info('Changes discarded.');
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    const result = await Swal.fire({
      title: 'Save Profile Changes?',
      text: 'This will update your profile permanently.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Save Changes',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#dc2626',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

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
            <DocumentsTab setActiveTab={setActiveTab} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
