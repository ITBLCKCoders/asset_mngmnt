import { useState, useEffect } from 'react';
import { IntangibleAssetType, FormData } from '../types';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useIntangibleAssetTypes(options?: {
  onAfterSave?: () => void;
}) {
  const { onAfterSave } = options || {};
  const [types, setTypes] = useState<IntangibleAssetType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<IntangibleAssetType | null>(null);
  const [deleting, setDeleting] = useState<IntangibleAssetType | null>(null);
  const [form, setForm] = useState<FormData>({
    name: '',
    prefix: '',
    departmentId: '',
  });
  const [initialForm, setInitialForm] = useState<FormData>({
    name: '',
    prefix: '',
    departmentId: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const data = await api.get('/intangible-asset-types');
      setTypes(data.map((type: any) => ({ ...type, id: type.id })));
    } catch (error: any) {
      console.error('Failed to fetch intangible asset types:', error);
      toast.error('Failed to load intangible asset types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const hasChanges = () => {
    return (
      form.name !== initialForm.name ||
      form.prefix !== initialForm.prefix ||
      form.departmentId !== initialForm.departmentId
    );
  };

  const handleSave = async () => {
    if (!(form.name ?? '').trim()) {
      toast.error('Intangible asset type name is required');
      return;
    }

    if (!form.departmentId) {
      toast.error('Department is required');
      return;
    }

    try {
      setSaving(true);
      const prefix = form.prefix ?? '';
      if (editing) {
        await api.patch(`/intangible-asset-types/${editing.id}`, {
          name: form.name,
          prefix,
          departmentId: form.departmentId,
        });
        toast.success('Intangible asset type updated successfully');
      } else {
        await api.post('/intangible-asset-types', {
          name: form.name,
          prefix,
          departmentId: form.departmentId,
        });
        toast.success('Intangible asset type created successfully');
      }
      setIsOpen(false);
      setEditing(null);
      setForm({ name: '', prefix: '', departmentId: '' });
      setShowCancelAlert(false);
      fetchTypes();
      if (onAfterSave) onAfterSave();
    } catch (error: any) {
      console.error('Failed to save intangible asset type:', error);
      toast.error(error.message || 'Failed to save intangible asset type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/intangible-asset-types/${deleting!.id}`);
      toast.success('Intangible asset type deleted successfully');
      setDeleting(null);
      fetchTypes();
      if (onAfterSave) onAfterSave();
    } catch (error: any) {
      console.error('Failed to delete intangible asset type:', error);
      toast.error(error.message || 'Failed to delete intangible asset type');
      setDeleting(null);
    }
  };

  const openEdit = (type: IntangibleAssetType) => {
    setEditing(type);
    const formData = {
      name: type.name,
      prefix: type.prefix || '',
      departmentId: type.department_id || '',
    };
    setForm(formData);
    setInitialForm(formData);
    setIsOpen(true);
  };

  return {
    types,
    isOpen,
    setIsOpen,
    editing,
    setEditing,
    deleting,
    setDeleting,
    form,
    setForm,
    initialForm,
    setInitialForm,
    loading,
    saving,
    showCancelAlert,
    setShowCancelAlert,
    fetchTypes,
    hasChanges,
    handleSave,
    handleDelete,
    openEdit,
  };
}
