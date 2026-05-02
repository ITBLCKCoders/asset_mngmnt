import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Department } from '@/types/assets';
import { api } from '@/lib/api';

export function useDepartments(isActive: boolean, action?: string) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [activeCompany, setActiveCompany] = useState<any>(null);
  const [copyingSettings, setCopyingSettings] = useState(false);
  const hasOpenedAdd = useRef(false);

  useEffect(() => {
    if (isActive) {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive) fetchDepartments();
  }, [isActive]);

  useEffect(() => {
    if (isActive) fetchActiveCompany();
  }, [isActive]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ departments: Department[] }>(
        '/departments'
      );
      setDepartments(response.departments);
    } catch (error: any) {
      console.error('Failed to fetch departments:', error);
      toast.error(error.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveCompany = async () => {
    try {
      const data = await api.get('/companies/active');
      setActiveCompany(data?.data?.[0] || null);
    } catch (error) {
      console.error('Failed to fetch active company:', error);
    }
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
      await fetchDepartments();
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
        setDepartments(prev =>
          prev.map(dept =>
            dept.departmentID === editing.departmentID
              ? response.department
              : dept
          )
        );
        toast.success(response.message);
      } else {
        const response = await api.post<{
          message: string;
          department: Department;
        }>('/departments', form);
        setDepartments(prev => [...prev, response.department]);
        toast.success(response.message);
      }
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
      setDepartments(prev =>
        prev.filter(dept => dept.departmentID !== deleting.departmentID)
      );
      toast.success(response.message);
      return true;
    } catch (error: any) {
      console.error('Failed to delete department:', error);
      toast.error(error.message || 'Failed to delete department');
      return false;
    }
  };

  return {
    departments,
    loading,
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
