import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Department } from '@/types/assets';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';

export function useDepartments(isActive: boolean, action?: string) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [copyingSettings, setCopyingSettings] = useState(false);
  const hasOpenedAdd = useRef(false);

  const { data: deptData, isLoading } = useApiQuery<{ departments: Department[] }>(
    ['departments'],
    '/departments',
    { enabled: isActive }
  );

  const { data: companyData } = useApiQuery<{ data: any[] }>(
    ['active-company'],
    '/companies/active',
    { enabled: isActive }
  );

  const departments = deptData?.departments ?? [];
  const activeCompany = companyData?.data?.[0] ?? null;

  useEffect(() => {
    if (isActive) {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const fetchDepartments = async () => {
    await queryClient.refetchQueries({ queryKey: ['departments'] });
  };

  const fetchActiveCompany = async () => {
    await queryClient.refetchQueries({ queryKey: ['active-company'] });
  };

  const copyMainCompanySettings = async () => {
    if (!activeCompany) {
      toast.error('No active company selected');
      return;
    }

    try {
      setCopyingSettings(true);
      await api.post('/settings/copy-main-company-departments');
      toast.success(
        'Successfully copied department settings from main company'
      );
      setIsTabLoading(true);
      await queryClient.refetchQueries({ queryKey: ['departments'] });
      setIsTabLoading(false);
    } catch (error: any) {
      console.error('Failed to copy settings:', error);
      toast.error(error.message || 'Failed to copy settings from main company');
    } finally {
      setCopyingSettings(false);
    }
  };

  const handleSave = async (
    form: { name: string; code: string; prefix: string; description: string },
    editing: Department | null
  ) => {
    try {
      setSaving(true);
      if (editing) {
        const response = await api.patch<{
          message: string;
          department: Department;
        }>(`/departments/${editing.departmentID}`, form);
        toast.success(response.message);
      } else {
        const response = await api.post<{
          message: string;
          department: Department;
        }>('/departments', form);
        toast.success(response.message);
      }
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      return true;
    } catch (error: any) {
      console.error('Failed to save department:', error);
      toast.error(error.message || 'Failed to save department');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deleting: Department) => {
    try {
      const response = await api.delete<{ message: string }>(
        `/departments/${deleting.departmentID}`
      );
      toast.success(response.message);
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      return true;
    } catch (error: any) {
      console.error('Failed to delete department:', error);
      toast.error(error.message || 'Failed to delete department');
      return false;
    }
  };

  return {
    departments,
    loading: isLoading,
    saving,
    isTabLoading,
    activeCompany,
    copyingSettings,
    hasOpenedAdd,
    fetchDepartments,
    fetchActiveCompany,
    copyMainCompanySettings,
    handleSave,
    handleDelete,
  };
}
