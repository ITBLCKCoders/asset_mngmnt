import { useState, useEffect } from 'react';
import { AssetType, FormData } from '../types';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useAssetTypes(options?: { onAfterSave?: () => void }) {
  const { onAfterSave } = options || {};
  const [types, setTypes] = useState<AssetType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<AssetType | null>(null);
  const [deleting, setDeleting] = useState<AssetType | null>(null);
  const [form, setForm] = useState<FormData>({
    name: '',
    categoryId: '',
    prefix: '',
  });
  const [initialForm, setInitialForm] = useState<FormData>({
    name: '',
    categoryId: '',
    prefix: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const data = await api.get('/types');
      setTypes(
        data.map((type: any) => ({ ...type, id: type.typeID || type.id }))
      );
    } catch (error: any) {
      console.error('Failed to fetch types:', error);
      toast.error('Failed to load asset types');
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
      form.categoryId !== initialForm.categoryId ||
      form.prefix !== initialForm.prefix
    );
  };

  const handleSave = async () => {
    if (!(form.prefix ?? '').trim()) {
      toast.error('Type prefix is required');
      return;
    }

    try {
      setSaving(true);
      const prefix = form.prefix ?? '';
      if (editing) {
        await api.patch(`/types/${editing.id}`, {
          name: form.name,
          categoryId: form.categoryId,
          prefix,
        });
        toast.success('Asset type updated successfully');
      } else {
        await api.post('/types', {
          name: form.name,
          categoryId: form.categoryId,
          prefix,
        });
        toast.success('Asset type created successfully');
      }
      setIsOpen(false);
      setEditing(null);
      setForm({ name: '', categoryId: '', prefix: '' });
      setShowCancelAlert(false);
      fetchTypes();
      if (onAfterSave) onAfterSave();
    } catch (error: any) {
      console.error('Failed to save asset type:', error);
      toast.error(error.message || 'Failed to save asset type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/types/${deleting!.id}`);
      toast.success('Asset type deleted successfully');
      setDeleting(null);
      fetchTypes();
      if (onAfterSave) onAfterSave();
    } catch (error: any) {
      console.error('Failed to delete asset type:', error);
      toast.error(error.message || 'Failed to delete asset type');
      setDeleting(null);
    }
  };

  const openEdit = (type: AssetType) => {
    setEditing(type);
    const formData = {
      name: type.name,
      categoryId: (type.categoryId || type.category_id || '').toString(),
      prefix: type.prefix || '',
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
