import { useState, useEffect, useRef, useCallback } from 'react';
import { SmartIdFormat, ActiveCompany } from '../types';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function parseSettingsRow(row: Record<string, unknown>): SmartIdFormat {
  return {
    company: (row.company_format as SmartIdFormat['company']) || 'code',
    category: (row.category_format as SmartIdFormat['category']) || 'prefix',
    type: (row.type_format as SmartIdFormat['type']) || 'prefix',
    department: (row.department_format as SmartIdFormat['department']) || 'none',
    includeDate: Boolean(row.include_date),
  };
}

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

  const fetchAssetIdFormatSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const data = await api.get<{ settings?: Record<string, unknown>[] }>(
        '/settings/asset-id-format'
      );
      const rows = data?.settings ?? [];
      // API is scoped to the user's company (getScopedActiveCompany); use first row.
      const settings =
        rows.find(
          s =>
            activeCompany &&
            Number(s.company_id) === Number(activeCompany.id)
        ) ?? rows[0];

      if (settings) {
        const newFormat = parseSettingsRow(settings);
        setSmartIdFormat(newFormat);
        originalFormatRef.current = newFormat;
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to fetch asset ID format settings:', error);
    } finally {
      setSettingsLoading(false);
      setHasLoaded(true);
    }
  }, [activeCompany?.id]);

  useEffect(() => {
    if (activeCompany?.id) {
      fetchAssetIdFormatSettings();
    }
  }, [activeCompany?.id, fetchAssetIdFormatSettings]);

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
