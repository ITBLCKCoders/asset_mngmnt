import { useState, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
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
import { SettingsGeneralTabSkeleton } from '@/components/common/pageSkeletons';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { CompanyModal } from './components/companyModal';
import { Company } from './components/utils/companyTypes';
import { UnauthorizedView } from './components/unauthorizedView';
import { ActiveCompanyCard } from './components/activeCompanyCard';
import { AllCompaniesList } from './components/allCompaniesList';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function GeneralTab({ isActive }: { isActive?: boolean }) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [settingMainId, setSettingMainId] = useState<string | null>(null);

  // Check if user is admin or super admin
  const isAdminOrSuperAdmin = () => {
    const normalizedRoleName = (user?.role?.name ?? '').trim().toLowerCase();
    return normalizedRoleName === 'admin' || normalizedRoleName === 'super admin';
  };

  useEffect(() => {
    if (isActive) {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      // Use list from DB only: GET /companies/active is scoped to the user's
      // assigned company (see getScopedActiveCompany), not the globally active
      // company set in Settings → General.
      const allData = await api.get('/companies');
      const raw: Company[] = allData?.companies || allData?.data || [];
      const allCompanies = raw.map((c: Company) => ({
        ...c,
        is_active: Boolean(c.is_active),
      }));

      // For non-admin/super-admin users, show their assigned company
      // For admin/super-admin users, show the active company
      let companyToShow: Company | null = null;
      if (isAdminOrSuperAdmin()) {
        companyToShow = allCompanies.find(c => c.is_active) ?? null;
      } else {
        companyToShow = allCompanies.find(c => c.id === user?.company_id) ?? null;
      }

      setCompanies(allCompanies);
      setActiveCompany(companyToShow);
    } catch (err: any) {
      if (
        err.message?.includes('ANOTHER_DEVICE_LOGIN') ||
        err.response?.status === 401
      ) {
        setUnauthorized(true);
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to load companies');
      }
    } finally {
      setTimeout(() => setLoading(false), 2000);
    }
  };

  useEffect(() => {
    if (isActive) fetchCompanies();
  }, [isActive]);

  const handleSaveCompany = async (formData: FormData) => {
    try {
      setSaving(true);
      if (editingCompany) {
        await api.patch(`/companies/${editingCompany.id}`, formData);
        toast.success('Company updated successfully');
      } else {
        await api.post('/companies', formData);
        toast.success('Company created successfully');
      }
      setModalOpen(false);
      setEditingCompany(null);
      await fetchCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    setModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    if (company.is_active) {
      setShowEditAlert(true);
      return;
    }
    setEditingCompany(company);
    setModalOpen(true);
  };

  const setActive = async (company: Company) => {
    if (company.is_active || activatingId) return;
    setActivatingId(company.id);
    try {
      await api.patch(`/companies/${company.id}/active`);
      toast.success(`${company.name} is now the active company`);
      await fetchCompanies();
    } catch (err) {
      toast.error('Failed to switch company');
    } finally {
      setActivatingId(null);
    }
  };

  const setMain = async (company: Company) => {
    if (company.is_main || settingMainId) return;
    setSettingMainId(company.id);
    try {
      await api.patch(`/companies/${company.id}/main`);
      toast.success(`${company.name} is now the main company`);
      await fetchCompanies();
    } catch (err) {
      toast.error('Failed to set main company');
    } finally {
      setSettingMainId(null);
    }
  };

  const deleteCompany = async (company: Company) => {
    if (company.is_active) {
      setShowDeleteAlert(true);
      return;
    }
    if (company.is_main) {
      setShowDeleteAlert(true);
      return;
    }
    setCompanyToDelete(company);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    try {
      await api.delete(`/companies/${companyToDelete.id}`);
      toast.success('Company deleted successfully');
      await fetchCompanies();
    } catch {
      toast.error('Failed to delete company');
    } finally {
      setShowDeleteConfirm(false);
      setCompanyToDelete(null);
    }
  };

  if (isTabLoading) {
    return <SettingsGeneralTabSkeleton />;
  }

  if (loading) {
    return <SettingsGeneralTabSkeleton />;
  }

  if (unauthorized) {
    return <UnauthorizedView />;
  }

  return (
    <>
      <TabsContent value="general" className="mt-8 space-y-8">
        {/* Active Company Card  */}
        {activeCompany && <ActiveCompanyCard activeCompany={activeCompany} />}

        {/* All Companies List - only visible for admin/super admin */}
        {isAdminOrSuperAdmin() && (
          <AllCompaniesList
            companies={companies}
            activatingId={activatingId}
            settingMainId={settingMainId}
            onCreateModal={openCreateModal}
            onEditModal={openEditModal}
            onSetActive={setActive}
            onSetMain={setMain}
            onDelete={deleteCompany}
          />
        )}
      </TabsContent>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader title="Cannot Delete Company" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              This company is currently active or set as main company. Switch to
              another company and remove main status first before deleting.
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      <AlertDialog open={showEditAlert} onOpenChange={setShowEditAlert}>
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader title="Company Cannot Be Edited" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              This company is currently active. Switch to another company to
              make changes.
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader title="Delete this company?" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              This action cannot be undone.
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCompany}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      <CompanyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        company={editingCompany}
        onSave={handleSaveCompany}
        saving={saving}
      />
    </>
  );
}
