import { useState, useEffect, useRef } from 'react';
import { SmartIdFormat, ActiveCompany } from '../types';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useSmartIdFormat(activeCompany: ActiveCompany | null) {
  const [smartIdFormat, setSmartIdFormat] = useState<SmartIdFormat>({
    company: 'code',
    category: 'prefix',
    type: 'prefix',
    department: 'none',
    includeDate: true,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const originalFormatRef = useRef<SmartIdFormat>(smartIdFormat);

  const fetchAssetIdFormatSettings = async () => {
    if (!activeCompany) return;

    try {
      setSettingsLoading(true);
      const data = await api.get('/settings/asset-id-format');
      const settings = data?.settings?.find(
        (s: any) => s.company_id === activeCompany.id
      );
      if (settings) {
        const newFormat = {
          company: settings.company_format,
          category: settings.category_format,
          type: settings.type_format,
          department: settings.department_format,
          includeDate: settings.include_date,
        };
        setSmartIdFormat(newFormat);
        originalFormatRef.current = newFormat;
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to fetch asset ID format settings:', error);
      // Keep default values if fetch fails
    } finally {
      setSettingsLoading(false);
      setHasLoaded(true);
      originalFormatRef.current = smartIdFormat;
      setHasUnsavedChanges(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeCompany) {
      toast.error('No active company found');
      return;
    }

    try {
      setSettingsLoading(true);
      await api.put('/settings/asset-id-format', {
        company_id: activeCompany.id,
        company_format: smartIdFormat.company,
        category_format: smartIdFormat.category,
        type_format: smartIdFormat.type,
        department_format: smartIdFormat.department,
        include_date: smartIdFormat.includeDate,
      });
      originalFormatRef.current = smartIdFormat;
      setHasUnsavedChanges(false);
      toast.success('Asset ID format settings saved successfully');
    } catch (error: any) {
      console.error('Failed to save asset ID format settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCancel = () => {
    setSmartIdFormat(originalFormatRef.current);
    setHasUnsavedChanges(false);
  };

  const userSetSmartIdFormat = (newFormat: SmartIdFormat) => {
    setSmartIdFormat(newFormat);
    setHasUnsavedChanges(
      JSON.stringify(newFormat) !== JSON.stringify(originalFormatRef.current)
    );
  };

  return {
    smartIdFormat,
    setSmartIdFormat: userSetSmartIdFormat,
    settingsLoading,
    hasLoaded,
    hasUnsavedChanges,
    fetchAssetIdFormatSettings,
    save: handleSaveSettings,
    cancel: handleCancel,
  };
}
