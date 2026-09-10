import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Shimmer } from '@/components/ui/shimmer';

export function FormsTab({ isActive }: { isActive?: boolean }) {
  const [isTabLoading, setIsTabLoading] = useState(true);

  // Accountability form settings
  const [formSettings, setFormSettings] = useState({
    companyCode: 'code',
    department: 'none',
    itAssetCode: '',
    adminAssetCode: '',
    includeDate: true,
    dateFormat: 'MMYYYY',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeCompany, setActiveCompany] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  // Asset return form number settings (own state and unsaved flag)
  const [returnFormSettings, setReturnFormSettings] = useState({
    companyCode: 'code',
    department: 'none',
    itAssetReturnCode: '',
    adminAssetReturnCode: '',
    includeDate: true,
    dateFormat: 'MMYYYY',
  });
  const [hasUnsavedReturnChanges, setHasUnsavedReturnChanges] = useState(false);

  const [checklistFormSettings, setChecklistFormSettings] = useState({
    companyCode: 'code' as 'code' | 'prefix' | 'none',
    department: 'none' as 'code' | 'prefix' | 'none',
    itAssetChecklistCode: '',
    adminAssetChecklistCode: '',
    includeDate: true,
    dateFormat: 'MMYYYY',
  });
  const [hasUnsavedChecklistChanges, setHasUnsavedChecklistChanges] =
    useState(false);

  // Asset transfer form number settings
  const [transferFormSettings, setTransferFormSettings] = useState({
    companyCode: 'code' as 'code' | 'prefix' | 'none',
    department: 'none' as 'code' | 'prefix' | 'none',
    itAssetTransferCode: '',
    adminAssetTransferCode: '',
    includeDate: true,
    dateFormat: 'MMYYYY',
  });
  const [hasUnsavedTransferChanges, setHasUnsavedTransferChanges] =
    useState(false);

  // Asset borrowing form number settings
  const [borrowFormSettings, setBorrowFormSettings] = useState({
    companyCode: 'code' as 'code' | 'prefix' | 'none',
    department: 'none' as 'code' | 'prefix' | 'none',
    itAssetBorrowCode: '',
    adminAssetBorrowCode: '',
    includeDate: true,
    dateFormat: 'MMYYYY',
  });
  const [hasUnsavedBorrowChanges, setHasUnsavedBorrowChanges] =
    useState(false);

  const [clearanceFormSettings, setClearanceFormSettings] = useState({
    companyCode: 'code' as 'code' | 'prefix' | 'none',
    department: 'code' as 'code' | 'prefix' | 'none',
    formCode: 'IDF',
    includeDate: true,
    dateFormat: 'MMYYYY',
  });
  const [hasUnsavedClearanceChanges, setHasUnsavedClearanceChanges] = useState(false);
  const [deactivationFormSettings, setDeactivationFormSettings] = useState({
    companyCode: 'code' as 'code' | 'prefix' | 'none',
    department: 'code' as 'code' | 'prefix' | 'none',
    formCode: 'IDF',
    includeDate: true,
    dateFormat: 'MMYYYY',
  });
  const [hasUnsavedDeactivationChanges, setHasUnsavedDeactivationChanges] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      fetchActiveCompany();
      fetchDepartments();
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive && activeCompany) {
      fetchFormSettings();
      fetchReturnFormSettings();
      fetchChecklistFormSettings();
      fetchTransferFormSettings();
      fetchBorrowFormSettings();
      fetchClearanceFormSettings();
    }
  }, [isActive, activeCompany]);

  const fetchActiveCompany = async () => {
    try {
      const data = await api.get('/companies/active');
      setActiveCompany(data?.data?.[0] || null);
    } catch (error) {
      console.error('Failed to fetch active company:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await api.get('/departments');
      const departmentRows = data.departments || data.data || [];
      setDepartments(Array.isArray(departmentRows) ? departmentRows : []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchFormSettings = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get('/settings/accountability-form');
      const settings = data?.settings?.find(
        (s: any) => s.company_id === activeCompany.id
      );
      if (settings) {
        setFormSettings({
          companyCode: settings.company_format,
          department: settings.department_format,
          itAssetCode: settings.it_asset_code || '',
          adminAssetCode: settings.admin_asset_code || '',
          includeDate: settings.include_date,
          dateFormat: settings.date_format,
        });
      }
    } catch (error) {
      console.error('Failed to fetch form settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeCompany) {
      toast.error('No active company found');
      return;
    }

    try {
      setSettingsLoading(true);
      await api.put('/settings/accountability-form', {
        company_id: activeCompany.id,
        company_format: formSettings.companyCode,
        department_format: formSettings.department,
        it_asset_code: formSettings.itAssetCode,
        admin_asset_code: formSettings.adminAssetCode,
        include_date: formSettings.includeDate,
        date_format: formSettings.dateFormat,
      });
      toast.success('Accountability form settings saved successfully');
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCancelSettings = () => {
    // Reset to default values
    setFormSettings({
      companyCode: 'code',
      department: 'none',
      itAssetCode: '',
      adminAssetCode: '',
      includeDate: true,
      dateFormat: 'MMYYYY',
    });
    setHasUnsavedChanges(false);
  };

  const updateFormSettings = (updates: Partial<typeof formSettings>) => {
    setFormSettings(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const fetchReturnFormSettings = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get('/settings/asset-return-form');
      const settings = data?.settings?.find(
        (s: any) => s.company_id === activeCompany.id
      );
      if (settings) {
        setReturnFormSettings({
          companyCode: settings.company_format,
          department: settings.department_format,
          itAssetReturnCode: settings.it_asset_return_code || '',
          adminAssetReturnCode: settings.admin_asset_return_code || '',
          includeDate: settings.include_date,
          dateFormat: settings.date_format,
        });
      }
    } catch (error) {
      console.error('Failed to fetch return form settings:', error);
    }
  };

  const handleSaveReturnFormSettings = async () => {
    if (!activeCompany) {
      toast.error('No active company found');
      return;
    }
    try {
      setSettingsLoading(true);
      await api.put('/settings/asset-return-form', {
        company_id: activeCompany.id,
        company_format: returnFormSettings.companyCode,
        department_format: returnFormSettings.department,
        it_asset_return_code: returnFormSettings.itAssetReturnCode,
        admin_asset_return_code: returnFormSettings.adminAssetReturnCode,
        include_date: returnFormSettings.includeDate,
        date_format: returnFormSettings.dateFormat,
      });
      toast.success('Asset return form settings saved successfully');
      setHasUnsavedReturnChanges(false);
    } catch (error: any) {
      console.error('Failed to save return form settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCancelReturnFormSettings = () => {
    setReturnFormSettings({
      companyCode: 'code',
      department: 'none',
      itAssetReturnCode: '',
      adminAssetReturnCode: '',
      includeDate: true,
      dateFormat: 'MMYYYY',
    });
    setHasUnsavedReturnChanges(false);
  };

  const updateReturnFormSettings = (
    updates: Partial<typeof returnFormSettings>
  ) => {
    setReturnFormSettings(prev => ({ ...prev, ...updates }));
    setHasUnsavedReturnChanges(true);
  };

  const fetchChecklistFormSettings = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get('/settings/asset-checklist-form');
      const settings = data?.settings?.find(
        (s: any) => s.company_id === activeCompany.id
      );
      if (settings) {
        setChecklistFormSettings({
          companyCode: settings.company_format || 'code',
          department: settings.department_format || 'none',
          itAssetChecklistCode: settings.it_asset_checklist_code || '',
          adminAssetChecklistCode: settings.admin_asset_checklist_code || '',
          includeDate: settings.include_date,
          dateFormat: settings.date_format,
        });
      }
    } catch (error) {
      console.error('Failed to fetch checklist form settings:', error);
    }
  };

  const handleSaveChecklistFormSettings = async () => {
    if (!activeCompany) {
      toast.error('No active company found');
      return;
    }
    try {
      setSettingsLoading(true);
      await api.put('/settings/asset-checklist-form', {
        company_id: activeCompany.id,
        company_format: checklistFormSettings.companyCode,
        department_format: checklistFormSettings.department,
        it_asset_checklist_code: checklistFormSettings.itAssetChecklistCode,
        admin_asset_checklist_code:
          checklistFormSettings.adminAssetChecklistCode,
        include_date: checklistFormSettings.includeDate,
        date_format: checklistFormSettings.dateFormat,
      });
      toast.success('Asset checklist form settings saved successfully');
      setHasUnsavedChecklistChanges(false);
    } catch (error: any) {
      console.error('Failed to save checklist form settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCancelChecklistFormSettings = () => {
    setChecklistFormSettings({
      companyCode: 'code',
      department: 'none',
      itAssetChecklistCode: '',
      adminAssetChecklistCode: '',
      includeDate: true,
      dateFormat: 'MMYYYY',
    });
    setHasUnsavedChecklistChanges(false);
  };

  const updateChecklistFormSettings = (
    updates: Partial<typeof checklistFormSettings>
  ) => {
    setChecklistFormSettings(prev => ({ ...prev, ...updates }));
    setHasUnsavedChecklistChanges(true);
  };

  const fetchTransferFormSettings = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get('/settings/asset-transfer-form');
      const settings = data?.settings?.find(
        (s: any) => s.company_id === activeCompany.id
      );
      if (settings) {
        setTransferFormSettings({
          companyCode: settings.company_format || 'code',
          department: settings.department_format || 'none',
          itAssetTransferCode: settings.it_asset_transfer_code || '',
          adminAssetTransferCode: settings.admin_asset_transfer_code || '',
          includeDate: settings.include_date,
          dateFormat: settings.date_format,
        });
      }
    } catch (error) {
      console.error('Failed to fetch transfer form settings:', error);
    }
  };

  const fetchBorrowFormSettings = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get('/settings/asset-borrow-form');
      const settings = data?.settings?.find(
        (s: any) => s.company_id === activeCompany.id
      );
      if (settings) {
        setBorrowFormSettings({
          companyCode: settings.company_format || 'code',
          department: settings.department_format || 'none',
          itAssetBorrowCode: settings.it_asset_borrow_code || '',
          adminAssetBorrowCode: settings.admin_asset_borrow_code || '',
          includeDate: settings.include_date,
          dateFormat: settings.date_format,
        });
      }
    } catch (error) {
      console.error('Failed to fetch borrow form settings:', error);
    }
  };

  const fetchClearanceFormSettings = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get('/settings/intangible-clearance-form');
      const settings = data?.settings?.find((s: any) => s.company_id === activeCompany.id);
      if (settings) {
        setClearanceFormSettings({
          companyCode: settings.clearance_company_format || 'code',
          department: settings.clearance_department_format || 'code',
          formCode: settings.clearance_form_code || 'CLR',
          includeDate: settings.clearance_include_date !== 0,
          dateFormat: settings.clearance_date_format || 'MMYYYY',
        });
        setDeactivationFormSettings({
          companyCode: settings.deactivation_company_format || 'code',
          department: settings.deactivation_department_format || 'code',
          formCode: settings.deactivation_form_code || 'IDF',
          includeDate: settings.deactivation_include_date !== 0,
          dateFormat: settings.deactivation_date_format || 'MMYYYY',
        });
      }
    } catch (error) {
      console.error('Failed to fetch intangible clearance form settings:', error);
    }
  };

  const handleSaveClearanceFormSettings = async () => {
    if (!activeCompany) return toast.error('No active company found');
    try {
      setSettingsLoading(true);
      await api.put('/settings/intangible-clearance-form', {
        company_id: activeCompany.id,
        company_format: clearanceFormSettings.companyCode,
        clearance_department_format: clearanceFormSettings.department,
        clearance_form_code: clearanceFormSettings.formCode.trim() || 'IDF',
        clearance_include_date: clearanceFormSettings.includeDate,
        clearance_date_format: 'MMYYYY',
      });
      toast.success('Intangible deactivation and clearance settings saved successfully');
      setHasUnsavedClearanceChanges(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const updateClearanceFormSettings = (updates: Partial<typeof clearanceFormSettings>) => {
    setClearanceFormSettings(prev => ({ ...prev, ...updates }));
    setHasUnsavedClearanceChanges(true);
  };

  const handleSaveDeactivationFormSettings = async () => {
    if (!activeCompany) return toast.error('No active company found');
    try {
      setSettingsLoading(true);
      await api.put('/settings/intangible-clearance-form', {
        company_id: activeCompany.id,
        company_format: deactivationFormSettings.companyCode,
        deactivation_department_format: deactivationFormSettings.department,
        deactivation_form_code: deactivationFormSettings.formCode.trim() || 'IDF',
        deactivation_include_date: deactivationFormSettings.includeDate,
        deactivation_date_format: 'MMYYYY',
      });
      toast.success('Intangible deactivation settings saved successfully');
      setHasUnsavedDeactivationChanges(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const updateDeactivationFormSettings = (updates: Partial<typeof deactivationFormSettings>) => {
    setDeactivationFormSettings(prev => ({ ...prev, ...updates }));
    setHasUnsavedDeactivationChanges(true);
  };

  const handleSaveBorrowFormSettings = async () => {
    if (!activeCompany) {
      toast.error('No active company found');
      return;
    }
    try {
      setSettingsLoading(true);
      await api.put('/settings/asset-borrow-form', {
        company_id: activeCompany.id,
        company_format: borrowFormSettings.companyCode,
        department_format: borrowFormSettings.department,
        it_asset_borrow_code: borrowFormSettings.itAssetBorrowCode,
        admin_asset_borrow_code: borrowFormSettings.adminAssetBorrowCode,
        include_date: borrowFormSettings.includeDate,
        date_format: borrowFormSettings.dateFormat,
      });
      toast.success('Asset borrowing form settings saved successfully');
      setHasUnsavedBorrowChanges(false);
    } catch (error: any) {
      console.error('Failed to save borrow form settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCancelBorrowFormSettings = () => {
    setBorrowFormSettings({
      companyCode: 'code',
      department: 'none',
      itAssetBorrowCode: '',
      adminAssetBorrowCode: '',
      includeDate: true,
      dateFormat: 'MMYYYY',
    });
    setHasUnsavedBorrowChanges(false);
  };

  const updateBorrowFormSettings = (
    updates: Partial<typeof borrowFormSettings>
  ) => {
    setBorrowFormSettings(prev => ({ ...prev, ...updates }));
    setHasUnsavedBorrowChanges(true);
  };

  const handleSaveTransferFormSettings = async () => {
    if (!activeCompany) {
      toast.error('No active company found');
      return;
    }
    try {
      setSettingsLoading(true);
      await api.put('/settings/asset-transfer-form', {
        company_id: activeCompany.id,
        company_format: transferFormSettings.companyCode,
        department_format: transferFormSettings.department,
        it_asset_transfer_code: transferFormSettings.itAssetTransferCode,
        admin_asset_transfer_code: transferFormSettings.adminAssetTransferCode,
        include_date: transferFormSettings.includeDate,
        date_format: transferFormSettings.dateFormat,
      });
      toast.success('Asset transfer form settings saved successfully');
      setHasUnsavedTransferChanges(false);
    } catch (error: any) {
      console.error('Failed to save transfer form settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCancelTransferFormSettings = () => {
    setTransferFormSettings({
      companyCode: 'code',
      department: 'none',
      itAssetTransferCode: '',
      adminAssetTransferCode: '',
      includeDate: true,
      dateFormat: 'MMYYYY',
    });
    setHasUnsavedTransferChanges(false);
  };

  const updateTransferFormSettings = (
    updates: Partial<typeof transferFormSettings>
  ) => {
    setTransferFormSettings(prev => ({ ...prev, ...updates }));
    setHasUnsavedTransferChanges(true);
  };

  if (isTabLoading) {
    return (
      <TabsContent value="forms" className="mt-0">
        <div className="grid grid-cols-1 gap-8 mb-10">
          {/* Asset Accountability Number Settings card shimmer */}
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur flex flex-col">
            <CardHeader className="bg-red-600 rounded-t-2xl flex-shrink-0">
              <div>
                <Shimmer className="h-8 w-64 rounded bg-white/20" />
                <Shimmer className="h-5 w-80 rounded mt-2 bg-white/20" />
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Shimmer className="h-4 w-24 rounded" />
                    <Shimmer className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl mt-6">
                <div>
                  <Shimmer className="h-5 w-40 rounded" />
                  <Shimmer className="h-3 w-56 rounded mt-1" />
                </div>
                <Shimmer className="h-6 w-11 rounded-full" />
              </div>
              <div className="space-y-4 mt-6">
                <Shimmer className="h-4 w-48 rounded" />
                <Shimmer className="h-12 w-full rounded-2xl" />
                <Shimmer className="h-4 w-52 rounded" />
                <Shimmer className="h-12 w-full rounded-2xl" />
              </div>
            </CardContent>
          </Card>

          {/* Asset Return Form Number Settings card shimmer */}
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur flex flex-col">
            <CardHeader className="bg-red-600 rounded-t-2xl flex-shrink-0">
              <div>
                <Shimmer className="h-8 w-72 rounded bg-white/20" />
                <Shimmer className="h-5 w-80 rounded mt-2 bg-white/20" />
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Shimmer className="h-4 w-28 rounded" />
                    <Shimmer className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl mt-6">
                <div>
                  <Shimmer className="h-5 w-40 rounded" />
                  <Shimmer className="h-3 w-56 rounded mt-1" />
                </div>
                <Shimmer className="h-6 w-11 rounded-full" />
              </div>
              <div className="space-y-4 mt-6">
                <Shimmer className="h-4 w-56 rounded" />
                <Shimmer className="h-12 w-full rounded-2xl" />
                <Shimmer className="h-4 w-60 rounded" />
                <Shimmer className="h-12 w-full rounded-2xl" />
              </div>
            </CardContent>
          </Card>

          {/* Asset Transfer Form Number Settings card shimmer */}
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur flex flex-col">
            <CardHeader className="bg-red-600 rounded-t-2xl flex-shrink-0">
              <div>
                <Shimmer className="h-8 w-80 rounded bg-white/20" />
                <Shimmer className="h-5 w-96 rounded mt-2 bg-white/20" />
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Shimmer className="h-4 w-28 rounded" />
                    <Shimmer className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl mt-6">
                <div>
                  <Shimmer className="h-5 w-40 rounded" />
                  <Shimmer className="h-3 w-56 rounded mt-1" />
                </div>
                <Shimmer className="h-6 w-11 rounded-full" />
              </div>
              <div className="space-y-4 mt-6">
                <Shimmer className="h-4 w-60 rounded" />
                <Shimmer className="h-12 w-full rounded-2xl" />
                <Shimmer className="h-4 w-64 rounded" />
                <Shimmer className="h-12 w-full rounded-2xl" />
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    );
  }

  const hrDepartment = departments.find((department: any) => {
    const name = String(department.name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    return (
      name === 'hr' ||
      name.startsWith('hr department') ||
      name === 'human resource' ||
      name.startsWith('human resource department') ||
      name === 'human resources' ||
      name.startsWith('human resources department')
    );
  });
  const formatHrDepartment = (format: 'code' | 'prefix' | 'none') => {
    if (format === 'none') return '';
    return format === 'prefix'
      ? hrDepartment?.prefix || hrDepartment?.code || ''
      : hrDepartment?.code || hrDepartment?.prefix || '';
  };
  const formatCompany = (format: 'code' | 'prefix' | 'none') => {
    if (format === 'none') return '';
    return format === 'prefix'
      ? activeCompany?.prefix || activeCompany?.code || ''
      : activeCompany?.code || activeCompany?.prefix || '';
  };

  return (
    <TabsContent value="forms" className="mt-0">
      <Tabs defaultValue="accountability" className="space-y-6">
        <TabsList className={segmentTabsListClassName + ' flex w-full overflow-x-auto scrollbar-hide'}>
          <TabsTrigger
            value="accountability"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Asset Accountability
          </TabsTrigger>
          <TabsTrigger
            value="return"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Asset Return
          </TabsTrigger>
          <TabsTrigger
            value="checklist"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Asset Checklist
          </TabsTrigger>
          <TabsTrigger
            value="transfer"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Asset Transfer
          </TabsTrigger>
          <TabsTrigger
            value="borrow"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Asset Borrow
          </TabsTrigger>
          <TabsTrigger
            value="intangible-deactivation"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Intangible Deactivation
          </TabsTrigger>
          <TabsTrigger
            value="accountability-clearance"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Accountability Clearance
          </TabsTrigger>
        </TabsList>
        <TabsContent value="accountability" className="mt-0">
        {/* Asset Accountability Number Settings Card */}
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur flex flex-col">
          <CardHeader className="bg-red-600 rounded-t-2xl flex-shrink-0">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Asset Accountability Number Settings
                </h3>
                <p className="text-red-100 text-sm">
                  Configure form numbering format and settings
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Company Code</Label>
                  <Select
                    value={formSettings.companyCode}
                    onValueChange={(value: 'code' | 'prefix' | 'none') =>
                      updateFormSettings({ companyCode: value })
                    }
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="code" className="hover:bg-gray-200">
                        Code
                      </SelectItem>
                      <SelectItem value="prefix" className="hover:bg-gray-200">
                        Prefix
                      </SelectItem>
                      <SelectItem value="none" className="hover:bg-gray-200">
                        None
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Include company identifier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Department</Label>
                  <Select
                    value={formSettings.department}
                    onValueChange={(value: 'code' | 'prefix' | 'none') =>
                      updateFormSettings({ department: value })
                    }
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="code" className="hover:bg-gray-200">
                        Code
                      </SelectItem>
                      <SelectItem value="prefix" className="hover:bg-gray-200">
                        Prefix
                      </SelectItem>
                      <SelectItem value="none" className="hover:bg-gray-200">
                        None
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Include department identifier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    IT Asset Form Code
                  </Label>
                  <Input
                    value={formSettings.itAssetCode}
                    onChange={e =>
                      updateFormSettings({ itAssetCode: e.target.value })
                    }
                    placeholder="e.g., IT"
                    disabled={settingsLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code for IT asset forms
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Admin Asset Form Code
                  </Label>
                  <Input
                    value={formSettings.adminAssetCode}
                    onChange={e =>
                      updateFormSettings({ adminAssetCode: e.target.value })
                    }
                    placeholder="e.g., ADMIN"
                    disabled={settingsLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code for Admin asset forms
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl md:col-span-2 lg:col-span-3">
                <div>
                  <Label className="font-medium">Include Date (MMYYYY)</Label>
                  <p className="text-xs text-muted-foreground">
                    Add date in MMYYYY format
                  </p>
                </div>
                <Switch
                  checked={formSettings.includeDate}
                  onCheckedChange={checked =>
                    updateFormSettings({ includeDate: checked })
                  }
                  disabled={settingsLoading}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-6 bg-card border rounded-2xl shadow-inner">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    IT Asset Form Preview:
                  </div>
                  <div className="font-mono text-lg tracking-wider text-center">
                    {(() => {
                      const parts = [];
                      if (
                        formSettings.companyCode !== 'none' &&
                        activeCompany
                      ) {
                        parts.push(
                          <span key="company" className="text-blue-600">
                            {formSettings.companyCode === 'code'
                              ? activeCompany.code || 'COM'
                              : activeCompany.prefix || 'COMP'}
                          </span>
                        );
                      }
                      if (
                        formSettings.department !== 'none' &&
                        departments.length > 0
                      ) {
                        const dept =
                          departments.find(d =>
                            d.name?.toLowerCase().includes('it')
                          ) || departments[0];
                        parts.push(
                          <span key="department" className="text-purple-600">
                            {formSettings.department === 'code'
                              ? dept.code || 'IT'
                              : dept.prefix || '100'}
                          </span>
                        );
                      }
                      if (formSettings.itAssetCode)
                        parts.push(
                          <span key="it-code" className="text-green-600">
                            {formSettings.itAssetCode}
                          </span>
                        );
                      if (formSettings.includeDate)
                        parts.push(
                          <span key="date" className="text-red-600">
                            011999
                          </span>
                        );
                      parts.push(
                        <span key="sequential" className="text-indigo-600">
                          0001
                        </span>
                      );
                      return parts.map((part, index) => (
                        <span key={part.key}>
                          {part}
                          {index < parts.length - 1 ? '-' : ''}
                        </span>
                      ));
                    })()}
                  </div>
                </div>

                <div className="p-6 bg-card border rounded-2xl shadow-inner">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Admin Asset Form Preview:
                  </div>
                  <div className="font-mono text-lg tracking-wider text-center">
                    {(() => {
                      const parts = [];
                      if (
                        formSettings.companyCode !== 'none' &&
                        activeCompany
                      ) {
                        parts.push(
                          <span key="company" className="text-blue-600">
                            {formSettings.companyCode === 'code'
                              ? activeCompany.code || 'COM'
                              : activeCompany.prefix || 'COMP'}
                          </span>
                        );
                      }
                      if (
                        formSettings.department !== 'none' &&
                        departments.length > 0
                      ) {
                        const dept =
                          departments.find(
                            d =>
                              d.name?.toLowerCase().includes('admin') ||
                              d.name?.toLowerCase().includes('hr')
                          ) || departments[0];
                        parts.push(
                          <span key="department" className="text-purple-600">
                            {formSettings.department === 'code'
                              ? dept.code || 'ADMIN'
                              : dept.prefix || '200'}
                          </span>
                        );
                      }
                      if (formSettings.adminAssetCode)
                        parts.push(
                          <span key="admin-code" className="text-orange-600">
                            {formSettings.adminAssetCode}
                          </span>
                        );
                      if (formSettings.includeDate)
                        parts.push(
                          <span key="date" className="text-red-600">
                            011999
                          </span>
                        );
                      parts.push(
                        <span key="sequential" className="text-indigo-600">
                          0001
                        </span>
                      );
                      return parts.map((part, index) => (
                        <span key={part.key}>
                          {part}
                          {index < parts.length - 1 ? '-' : ''}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Active format:</strong> Configurable based on settings
                  above
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  All new accountability forms will use this numbering format
                </p>
              </div>
            </div>
          </CardContent>
          {hasUnsavedChanges && (
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancelSettings}
                disabled={settingsLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={settingsLoading}>
                {settingsLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          )}
        </Card>

        </TabsContent>

        <TabsContent value="return" className="mt-0">
        {/* Asset Return Form Number Settings Card */}
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur flex flex-col">
          <CardHeader className="bg-red-600 rounded-t-2xl flex-shrink-0">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Asset Return Form Number Settings
                </h3>
                <p className="text-red-100 text-sm">
                  Configure return form numbering format and settings
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Company Code</Label>
                  <Select
                    value={returnFormSettings.companyCode}
                    onValueChange={(value: 'code' | 'prefix' | 'none') =>
                      updateReturnFormSettings({ companyCode: value })
                    }
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="code" className="hover:bg-gray-200">
                        Code
                      </SelectItem>
                      <SelectItem value="prefix" className="hover:bg-gray-200">
                        Prefix
                      </SelectItem>
                      <SelectItem value="none" className="hover:bg-gray-200">
                        None
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Include company identifier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Department</Label>
                  <Select
                    value={returnFormSettings.department}
                    onValueChange={(value: 'code' | 'prefix' | 'none') =>
                      updateReturnFormSettings({ department: value })
                    }
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="code" className="hover:bg-gray-200">
                        Code
                      </SelectItem>
                      <SelectItem value="prefix" className="hover:bg-gray-200">
                        Prefix
                      </SelectItem>
                      <SelectItem value="none" className="hover:bg-gray-200">
                        None
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Include department identifier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    IT Asset Return Form Code
                  </Label>
                  <Input
                    value={returnFormSettings.itAssetReturnCode}
                    onChange={e =>
                      updateReturnFormSettings({
                        itAssetReturnCode: e.target.value,
                      })
                    }
                    placeholder="e.g., IT"
                    disabled={settingsLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code for IT asset return forms
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Admin Asset Return Form Code
                  </Label>
                  <Input
                    value={returnFormSettings.adminAssetReturnCode}
                    onChange={e =>
                      updateReturnFormSettings({
                        adminAssetReturnCode: e.target.value,
                      })
                    }
                    placeholder="e.g., ADMIN"
                    disabled={settingsLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code for Admin asset return forms
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl md:col-span-2 lg:col-span-3">
                <div>
                  <Label className="font-medium">Include Date (MMYYYY)</Label>
                  <p className="text-xs text-muted-foreground">
                    Add date in MMYYYY format
                  </p>
                </div>
                <Switch
                  checked={returnFormSettings.includeDate}
                  onCheckedChange={checked =>
                    updateReturnFormSettings({ includeDate: checked })
                  }
                  disabled={settingsLoading}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-6 bg-card border rounded-2xl shadow-inner">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    IT Asset Return Form Preview:
                  </div>
                  <div className="font-mono text-lg tracking-wider text-center">
                    {(() => {
                      const parts = [];
                      if (
                        returnFormSettings.companyCode !== 'none' &&
                        activeCompany
                      ) {
                        parts.push(
                          <span key="company" className="text-blue-600">
                            {returnFormSettings.companyCode === 'code'
                              ? activeCompany.code || 'COM'
                              : activeCompany.prefix || 'COMP'}
                          </span>
                        );
                      }
                      if (
                        returnFormSettings.department !== 'none' &&
                        departments.length > 0
                      ) {
                        const dept =
                          departments.find(d =>
                            d.name?.toLowerCase().includes('it')
                          ) || departments[0];
                        parts.push(
                          <span key="department" className="text-purple-600">
                            {returnFormSettings.department === 'code'
                              ? dept.code || 'IT'
                              : dept.prefix || '100'}
                          </span>
                        );
                      }
                      if (returnFormSettings.itAssetReturnCode)
                        parts.push(
                          <span key="it-code" className="text-green-600">
                            {returnFormSettings.itAssetReturnCode}
                          </span>
                        );
                      if (returnFormSettings.includeDate)
                        parts.push(
                          <span key="date" className="text-red-600">
                            011999
                          </span>
                        );
                      parts.push(
                        <span key="sequential" className="text-indigo-600">
                          0001
                        </span>
                      );
                      return parts.map((part, index) => (
                        <span key={part.key}>
                          {part}
                          {index < parts.length - 1 ? '-' : ''}
                        </span>
                      ));
                    })()}
                  </div>
                </div>

                <div className="p-6 bg-card border rounded-2xl shadow-inner">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Admin Asset Return Form Preview:
                  </div>
                  <div className="font-mono text-lg tracking-wider text-center">
                    {(() => {
                      const parts = [];
                      if (
                        returnFormSettings.companyCode !== 'none' &&
                        activeCompany
                      ) {
                        parts.push(
                          <span key="company" className="text-blue-600">
                            {returnFormSettings.companyCode === 'code'
                              ? activeCompany.code || 'COM'
                              : activeCompany.prefix || 'COMP'}
                          </span>
                        );
                      }
                      if (
                        returnFormSettings.department !== 'none' &&
                        departments.length > 0
                      ) {
                        const dept =
                          departments.find(
                            d =>
                              d.name?.toLowerCase().includes('admin') ||
                              d.name?.toLowerCase().includes('hr')
                          ) || departments[0];
                        parts.push(
                          <span key="department" className="text-purple-600">
                            {returnFormSettings.department === 'code'
                              ? dept.code || 'ADMIN'
                              : dept.prefix || '200'}
                          </span>
                        );
                      }
                      if (returnFormSettings.adminAssetReturnCode)
                        parts.push(
                          <span key="admin-code" className="text-orange-600">
                            {returnFormSettings.adminAssetReturnCode}
                          </span>
                        );
                      if (returnFormSettings.includeDate)
                        parts.push(
                          <span key="date" className="text-red-600">
                            011999
                          </span>
                        );
                      parts.push(
                        <span key="sequential" className="text-indigo-600">
                          0001
                        </span>
                      );
                      return parts.map((part, index) => (
                        <span key={part.key}>
                          {part}
                          {index < parts.length - 1 ? '-' : ''}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Active format:</strong> Configurable based on settings
                  above
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  All new asset return forms will use this numbering format
                </p>
              </div>
            </div>
          </CardContent>
          {hasUnsavedReturnChanges && (
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancelReturnFormSettings}
                disabled={settingsLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveReturnFormSettings}
                disabled={settingsLoading}
              >
                {settingsLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          )}
        </Card>

        </TabsContent>

        <TabsContent value="checklist" className="mt-0">
        {/* Asset Checklist Form Number Settings Card */}
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur flex flex-col">
          <CardHeader className="bg-red-600 rounded-t-2xl flex-shrink-0">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Asset Checklist Form Number Settings
              </h3>
              <p className="text-red-100 text-sm">
                Configure checklist form numbering format and settings
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Company Code</Label>
                  <Select
                    value={checklistFormSettings.companyCode}
                    onValueChange={(value: 'code' | 'prefix' | 'none') =>
                      updateChecklistFormSettings({ companyCode: value })
                    }
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="prefix">Prefix</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Department</Label>
                  <Select
                    value={checklistFormSettings.department}
                    onValueChange={(value: 'code' | 'prefix' | 'none') =>
                      updateChecklistFormSettings({ department: value })
                    }
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="prefix">Prefix</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    IT Asset Checklist Form Code
                  </Label>
                  <Input
                    value={checklistFormSettings.itAssetChecklistCode}
                    onChange={e =>
                      updateChecklistFormSettings({
                        itAssetChecklistCode: e.target.value,
                      })
                    }
                    placeholder="e.g., ITCHK"
                    disabled={settingsLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Admin Asset Checklist Form Code
                  </Label>
                  <Input
                    value={checklistFormSettings.adminAssetChecklistCode}
                    onChange={e =>
                      updateChecklistFormSettings({
                        adminAssetChecklistCode: e.target.value,
                      })
                    }
                    placeholder="e.g., ADMCHK"
                    disabled={settingsLoading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div>
                  <Label className="font-medium">Include Date (MMYYYY)</Label>
                  <p className="text-xs text-muted-foreground">
                    Add date in MMYYYY format
                  </p>
                </div>
                <Switch
                  checked={checklistFormSettings.includeDate}
                  onCheckedChange={checked =>
                    updateChecklistFormSettings({ includeDate: checked })
                  }
                  disabled={settingsLoading}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    label: 'IT Asset Checklist Form Preview:',
                    code: checklistFormSettings.itAssetChecklistCode,
                    deptMatch: 'it',
                    fallbackDeptCode: 'IT',
                    fallbackDeptPrefix: '100',
                    className: 'text-green-600',
                  },
                  {
                    label: 'Admin Asset Checklist Form Preview:',
                    code: checklistFormSettings.adminAssetChecklistCode,
                    deptMatch: 'admin',
                    fallbackDeptCode: 'ADMIN',
                    fallbackDeptPrefix: '200',
                    className: 'text-orange-600',
                  },
                ].map(preview => (
                  <div
                    key={preview.label}
                    className="p-6 bg-card border rounded-2xl shadow-inner"
                  >
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {preview.label}
                    </div>
                    <div className="font-mono text-lg tracking-wider text-center">
                      {(() => {
                        const parts = [];
                        if (
                          checklistFormSettings.companyCode !== 'none' &&
                          activeCompany
                        ) {
                          parts.push(
                            <span key="company" className="text-blue-600">
                              {checklistFormSettings.companyCode === 'code'
                                ? activeCompany.code || 'COM'
                                : activeCompany.prefix || 'COMP'}
                            </span>
                          );
                        }
                        if (
                          checklistFormSettings.department !== 'none' &&
                          departments.length > 0
                        ) {
                          const dept =
                            departments.find(d =>
                              d.name
                                ?.toLowerCase()
                                .includes(preview.deptMatch)
                            ) || departments[0];
                          parts.push(
                            <span key="department" className="text-purple-600">
                              {checklistFormSettings.department === 'code'
                                ? dept.code || preview.fallbackDeptCode
                                : dept.prefix || preview.fallbackDeptPrefix}
                            </span>
                          );
                        }
                        if (preview.code) {
                          parts.push(
                            <span key="checklist-code" className={preview.className}>
                              {preview.code}
                            </span>
                          );
                        }
                        if (checklistFormSettings.includeDate) {
                          parts.push(
                            <span key="date" className="text-red-600">
                              011999
                            </span>
                          );
                        }
                        parts.push(
                          <span key="sequential" className="text-indigo-600">
                            0001
                          </span>
                        );
                        return parts.map((part, index) => (
                          <span key={part.key}>
                            {part}
                            {index < parts.length - 1 ? '-' : ''}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  All new asset checklist forms will use this numbering format
                </p>
              </div>
            </div>
          </CardContent>
          {hasUnsavedChecklistChanges && (
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancelChecklistFormSettings}
                disabled={settingsLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveChecklistFormSettings}
                disabled={settingsLoading}
              >
                {settingsLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          )}
        </Card>

        </TabsContent>

        <TabsContent value="transfer" className="mt-0">
        {/* Asset Transfer Form Number Settings Card */}
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur flex flex-col">
          <CardHeader className="bg-red-600 rounded-t-2xl flex-shrink-0">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Asset Transfer Form Number Settings
                </h3>
                <p className="text-red-100 text-sm">
                  Configure transfer form numbering format and settings
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Company Code</Label>
                  <Select
                    value={transferFormSettings.companyCode}
                    onValueChange={(value: 'code' | 'prefix' | 'none') =>
                      updateTransferFormSettings({ companyCode: value })
                    }
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="code" className="hover:bg-gray-200">
                        Code
                      </SelectItem>
                      <SelectItem value="prefix" className="hover:bg-gray-200">
                        Prefix
                      </SelectItem>
                      <SelectItem value="none" className="hover:bg-gray-200">
                        None
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Include company identifier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Department</Label>
                  <Select
                    value={transferFormSettings.department}
                    onValueChange={(value: 'code' | 'prefix' | 'none') =>
                      updateTransferFormSettings({ department: value })
                    }
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="code" className="hover:bg-gray-200">
                        Code
                      </SelectItem>
                      <SelectItem value="prefix" className="hover:bg-gray-200">
                        Prefix
                      </SelectItem>
                      <SelectItem value="none" className="hover:bg-gray-200">
                        None
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Include department identifier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    IT Asset Transfer Form Code
                  </Label>
                  <Input
                    value={transferFormSettings.itAssetTransferCode}
                    onChange={e =>
                      updateTransferFormSettings({
                        itAssetTransferCode: e.target.value,
                      })
                    }
                    placeholder="e.g., IT"
                    disabled={settingsLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code for IT asset transfer forms
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Admin Asset Transfer Form Code
                  </Label>
                  <Input
                    value={transferFormSettings.adminAssetTransferCode}
                    onChange={e =>
                      updateTransferFormSettings({
                        adminAssetTransferCode: e.target.value,
                      })
                    }
                    placeholder="e.g., ADMIN"
                    disabled={settingsLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code for Admin asset transfer forms
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl md:col-span-2 lg:col-span-3">
                <div>
                  <Label className="font-medium">Include Date (MMYYYY)</Label>
                  <p className="text-xs text-muted-foreground">
                    Add date in MMYYYY format
                  </p>
                </div>
                <Switch
                  checked={transferFormSettings.includeDate}
                  onCheckedChange={checked =>
                    updateTransferFormSettings({ includeDate: checked })
                  }
                  disabled={settingsLoading}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-6 bg-card border rounded-2xl shadow-inner">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    IT Asset Transfer Form Preview:
                  </div>
                  <div className="font-mono text-lg tracking-wider text-center">
                    {(() => {
                      const parts = [];
                      if (
                        transferFormSettings.companyCode !== 'none' &&
                        activeCompany
                      ) {
                        parts.push(
                          <span key="company" className="text-blue-600">
                            {transferFormSettings.companyCode === 'code'
                              ? activeCompany.code || 'COM'
                              : activeCompany.prefix || 'COMP'}
                          </span>
                        );
                      }
                      if (
                        transferFormSettings.department !== 'none' &&
                        departments.length > 0
                      ) {
                        const dept =
                          departments.find(d =>
                            d.name?.toLowerCase().includes('it')
                          ) || departments[0];
                        parts.push(
                          <span key="department" className="text-purple-600">
                            {transferFormSettings.department === 'code'
                              ? dept.code || 'IT'
                              : dept.prefix || '100'}
                          </span>
                        );
                      }
                      if (transferFormSettings.itAssetTransferCode)
                        parts.push(
                          <span key="it-code" className="text-green-600">
                            {transferFormSettings.itAssetTransferCode}
                          </span>
                        );
                      if (transferFormSettings.includeDate)
                        parts.push(
                          <span key="date" className="text-red-600">
                            011999
                          </span>
                        );
                      parts.push(
                        <span key="sequential" className="text-indigo-600">
                          0001
                        </span>
                      );
                      return parts.map((part, index) => (
                        <span key={part.key}>
                          {part}
                          {index < parts.length - 1 ? '-' : ''}
                        </span>
                      ));
                    })()}
                  </div>
                </div>

                <div className="p-6 bg-card border rounded-2xl shadow-inner">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Admin Asset Transfer Form Preview:
                  </div>
                  <div className="font-mono text-lg tracking-wider text-center">
                    {(() => {
                      const parts = [];
                      if (
                        transferFormSettings.companyCode !== 'none' &&
                        activeCompany
                      ) {
                        parts.push(
                          <span key="company" className="text-blue-600">
                            {transferFormSettings.companyCode === 'code'
                              ? activeCompany.code || 'COM'
                              : activeCompany.prefix || 'COMP'}
                          </span>
                        );
                      }
                      if (
                        transferFormSettings.department !== 'none' &&
                        departments.length > 0
                      ) {
                        const dept =
                          departments.find(
                            d =>
                              d.name?.toLowerCase().includes('admin') ||
                              d.name?.toLowerCase().includes('hr')
                          ) || departments[0];
                        parts.push(
                          <span key="department" className="text-purple-600">
                            {transferFormSettings.department === 'code'
                              ? dept.code || 'ADMIN'
                              : dept.prefix || '200'}
                          </span>
                        );
                      }
                      if (transferFormSettings.adminAssetTransferCode)
                        parts.push(
                          <span key="admin-code" className="text-orange-600">
                            {transferFormSettings.adminAssetTransferCode}
                          </span>
                        );
                      if (transferFormSettings.includeDate)
                        parts.push(
                          <span key="date" className="text-red-600">
                            011999
                          </span>
                        );
                      parts.push(
                        <span key="sequential" className="text-indigo-600">
                          0001
                        </span>
                      );
                      return parts.map((part, index) => (
                        <span key={part.key}>
                          {part}
                          {index < parts.length - 1 ? '-' : ''}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Active format:</strong> Configurable based on settings
                  above
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  All new asset transfer forms will use this numbering format
                </p>
              </div>
            </div>
          </CardContent>
          {hasUnsavedTransferChanges && (
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancelTransferFormSettings}
                disabled={settingsLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTransferFormSettings}
                disabled={settingsLoading}
              >
                {settingsLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          )}
        </Card>

        </TabsContent>

        <TabsContent value="intangible-deactivation" className="mt-0">
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur">
            <CardHeader className="bg-red-600 rounded-t-2xl">
              <h3 className="text-xl font-semibold text-white">Intangible Deactivation</h3>
              <p className="text-red-100 text-sm">Configure intangible deactivation form numbering</p>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Select value={deactivationFormSettings.companyCode} onValueChange={(value: 'code' | 'prefix' | 'none') => updateDeactivationFormSettings({ companyCode: value })} disabled={settingsLoading}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="code">Code</SelectItem><SelectItem value="prefix">Prefix</SelectItem><SelectItem value="none">None</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>HR Department</Label>
                  <Select value={deactivationFormSettings.department} onValueChange={(value: 'code' | 'prefix' | 'none') => updateDeactivationFormSettings({ department: value })} disabled={settingsLoading}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="code">Department Code</SelectItem><SelectItem value="prefix">Department Prefix</SelectItem><SelectItem value="none">None</SelectItem></SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Uses either HR or Human Resources department.</p>
                </div>
                <div className="space-y-2">
                  <Label>Form Code</Label>
                  <Input value={deactivationFormSettings.formCode} onChange={e => updateDeactivationFormSettings({ formCode: e.target.value })} placeholder="e.g., IDF" disabled={settingsLoading} />
                  <p className="text-xs text-muted-foreground">Code for intangible deactivation forms.</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div><Label>Month and Year (MMYYYY)</Label><p className="text-xs text-muted-foreground">The four-digit sequence continues through the year and resets to 0001 in January.</p></div>
                <Switch checked={deactivationFormSettings.includeDate} onCheckedChange={checked => updateDeactivationFormSettings({ includeDate: checked })} disabled={settingsLoading} />
              </div>
              <div className="p-4 border rounded-xl font-mono text-center text-lg">{formatCompany(deactivationFormSettings.companyCode)}{formatCompany(deactivationFormSettings.companyCode) ? '-' : ''}{formatHrDepartment(deactivationFormSettings.department) ? `${formatHrDepartment(deactivationFormSettings.department)}-` : ''}{deactivationFormSettings.formCode || 'IDF'}-{deactivationFormSettings.includeDate ? 'MMYYYY-' : ''}0001</div>
            </CardContent>
            {hasUnsavedDeactivationChanges && <CardFooter className="flex justify-end"><Button onClick={handleSaveDeactivationFormSettings} disabled={settingsLoading}>{settingsLoading ? 'Saving...' : 'Save Changes'}</Button></CardFooter>}
          </Card>
        </TabsContent>

        <TabsContent value="accountability-clearance" className="mt-0">
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur">
            <CardHeader className="bg-red-600 rounded-t-2xl">
              <h3 className="text-xl font-semibold text-white">Accountability Clearance</h3>
              <p className="text-red-100 text-sm">Configure accountability clearance form numbering</p>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2"><Label>Company</Label><Select value={clearanceFormSettings.companyCode} onValueChange={(value: 'code' | 'prefix' | 'none') => updateClearanceFormSettings({ companyCode: value })} disabled={settingsLoading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="code">Code</SelectItem><SelectItem value="prefix">Prefix</SelectItem><SelectItem value="none">None</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>HR Department</Label><Select value={clearanceFormSettings.department} onValueChange={(value: 'code' | 'prefix' | 'none') => updateClearanceFormSettings({ department: value })} disabled={settingsLoading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="code">Department Code</SelectItem><SelectItem value="prefix">Department Prefix</SelectItem><SelectItem value="none">None</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Uses either HR or Human Resources department.</p></div>
                <div className="space-y-2"><Label>Form Code</Label><Input value={clearanceFormSettings.formCode} onChange={e => updateClearanceFormSettings({ formCode: e.target.value })} placeholder="e.g., CLR" disabled={settingsLoading} /><p className="text-xs text-muted-foreground">Code for accountability clearance forms.</p></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"><div><Label>Month and Year (MMYYYY)</Label><p className="text-xs text-muted-foreground">The clearance sequence resets to 0001 in a new year.</p></div><Switch checked={clearanceFormSettings.includeDate} onCheckedChange={checked => updateClearanceFormSettings({ includeDate: checked })} disabled={settingsLoading} /></div>
              <div className="p-4 border rounded-xl font-mono text-center text-lg">{formatCompany(clearanceFormSettings.companyCode)}{formatCompany(clearanceFormSettings.companyCode) ? '-' : ''}{formatHrDepartment(clearanceFormSettings.department) ? `${formatHrDepartment(clearanceFormSettings.department)}-` : ''}{clearanceFormSettings.formCode || 'CLR'}-{clearanceFormSettings.includeDate ? 'MMYYYY-' : ''}0001</div>
            </CardContent>
            {hasUnsavedClearanceChanges && <CardFooter className="flex justify-end"><Button onClick={handleSaveClearanceFormSettings} disabled={settingsLoading}>{settingsLoading ? 'Saving...' : 'Save Changes'}</Button></CardFooter>}
          </Card>
        </TabsContent>

        <TabsContent value="borrow" className="mt-0">
        {/* Asset Borrowing Form Number Settings Card */}
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-card/95 backdrop-blur flex flex-col">
          <CardHeader className="bg-red-600 rounded-t-2xl flex-shrink-0">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Asset Borrowing Form Number Settings
                </h3>
                <p className="text-red-100 text-sm">
                  Configure borrowing form numbering format and settings
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Company Code</Label>
                  <Select
                    value={borrowFormSettings.companyCode}
                    onValueChange={(value: 'code' | 'prefix' | 'none') =>
                      updateBorrowFormSettings({ companyCode: value })
                    }
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="code" className="hover:bg-gray-200">
                        Code
                      </SelectItem>
                      <SelectItem value="prefix" className="hover:bg-gray-200">
                        Prefix
                      </SelectItem>
                      <SelectItem value="none" className="hover:bg-gray-200">
                        None
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Include company identifier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Department</Label>
                  <Select
                    value={borrowFormSettings.department}
                    onValueChange={(value: 'code' | 'prefix' | 'none') =>
                      updateBorrowFormSettings({ department: value })
                    }
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="code" className="hover:bg-gray-200">
                        Code
                      </SelectItem>
                      <SelectItem value="prefix" className="hover:bg-gray-200">
                        Prefix
                      </SelectItem>
                      <SelectItem value="none" className="hover:bg-gray-200">
                        None
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Include department identifier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    IT Asset Borrow Form Code
                  </Label>
                  <Input
                    value={borrowFormSettings.itAssetBorrowCode}
                    onChange={e =>
                      updateBorrowFormSettings({
                        itAssetBorrowCode: e.target.value,
                      })
                    }
                    placeholder="e.g., ITBOR"
                    disabled={settingsLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code for IT equipment borrowing forms
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Admin Asset Borrow Form Code
                  </Label>
                  <Input
                    value={borrowFormSettings.adminAssetBorrowCode}
                    onChange={e =>
                      updateBorrowFormSettings({
                        adminAssetBorrowCode: e.target.value,
                      })
                    }
                    placeholder="e.g., ADMBOR"
                    disabled={settingsLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code for Admin equipment borrowing forms
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl md:col-span-2 lg:col-span-3">
                <div>
                  <Label className="font-medium">Include Date (MMYYYY)</Label>
                  <p className="text-xs text-muted-foreground">
                    Add date in selected format
                  </p>
                </div>
                <Switch
                  checked={borrowFormSettings.includeDate}
                  onCheckedChange={checked =>
                    updateBorrowFormSettings({ includeDate: checked })
                  }
                  disabled={settingsLoading}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-6 bg-card border rounded-2xl shadow-inner">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    IT Equipment Borrowing Preview:
                  </div>
                  <div className="font-mono text-lg tracking-wider text-center">
                    {(() => {
                      const parts = [];
                      if (
                        borrowFormSettings.companyCode !== 'none' &&
                        activeCompany
                      ) {
                        parts.push(
                          <span key="company" className="text-blue-600">
                            {borrowFormSettings.companyCode === 'code'
                              ? activeCompany.code || 'COM'
                              : activeCompany.prefix || 'COMP'}
                          </span>
                        );
                      }
                      if (
                        borrowFormSettings.department !== 'none' &&
                        departments.length > 0
                      ) {
                        const dept =
                          departments.find(d =>
                            d.name?.toLowerCase().includes('it')
                          ) || departments[0];
                        parts.push(
                          <span key="department" className="text-purple-600">
                            {borrowFormSettings.department === 'code'
                              ? dept.code || 'IT'
                              : dept.prefix || '100'}
                          </span>
                        );
                      }
                      if (borrowFormSettings.itAssetBorrowCode) {
                        parts.push(
                          <span key="it-code" className="text-green-600">
                            {borrowFormSettings.itAssetBorrowCode}
                          </span>
                        );
                      }
                      if (borrowFormSettings.includeDate) {
                        parts.push(
                          <span key="date" className="text-red-600">
                            011999
                          </span>
                        );
                      }
                      parts.push(
                        <span key="sequential" className="text-indigo-600">
                          0001
                        </span>
                      );
                      return parts.map((part, index) => (
                        <span key={part.key}>
                          {part}
                          {index < parts.length - 1 ? '-' : ''}
                        </span>
                      ));
                    })()}
                  </div>
                </div>

                <div className="p-6 bg-card border rounded-2xl shadow-inner">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Admin Equipment Borrowing Preview:
                  </div>
                  <div className="font-mono text-lg tracking-wider text-center">
                    {(() => {
                      const parts = [];
                      if (
                        borrowFormSettings.companyCode !== 'none' &&
                        activeCompany
                      ) {
                        parts.push(
                          <span key="company" className="text-blue-600">
                            {borrowFormSettings.companyCode === 'code'
                              ? activeCompany.code || 'COM'
                              : activeCompany.prefix || 'COMP'}
                          </span>
                        );
                      }
                      if (
                        borrowFormSettings.department !== 'none' &&
                        departments.length > 0
                      ) {
                        const dept =
                          departments.find(
                            d =>
                              d.name?.toLowerCase().includes('admin') ||
                              d.name?.toLowerCase().includes('hr')
                          ) || departments[0];
                        parts.push(
                          <span key="department" className="text-purple-600">
                            {borrowFormSettings.department === 'code'
                              ? dept.code || 'ADMIN'
                              : dept.prefix || '200'}
                          </span>
                        );
                      }
                      if (borrowFormSettings.adminAssetBorrowCode) {
                        parts.push(
                          <span key="admin-code" className="text-orange-600">
                            {borrowFormSettings.adminAssetBorrowCode}
                          </span>
                        );
                      }
                      if (borrowFormSettings.includeDate) {
                        parts.push(
                          <span key="date" className="text-red-600">
                            011999
                          </span>
                        );
                      }
                      parts.push(
                        <span key="sequential" className="text-indigo-600">
                          0001
                        </span>
                      );
                      return parts.map((part, index) => (
                        <span key={part.key}>
                          {part}
                          {index < parts.length - 1 ? '-' : ''}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          {hasUnsavedBorrowChanges && (
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancelBorrowFormSettings}
                disabled={settingsLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBorrowFormSettings}
                disabled={settingsLoading}
              >
                {settingsLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          )}
        </Card>
        </TabsContent>
      </Tabs>
    </TabsContent>
  );
}
