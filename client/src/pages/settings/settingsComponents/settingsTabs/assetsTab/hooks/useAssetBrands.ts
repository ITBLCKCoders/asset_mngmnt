import { useState, useEffect } from 'react';
import { AssetBrand, FormData } from '../types';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useAssetBrands() {
  const [brands, setBrands] = useState<AssetBrand[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<AssetBrand | null>(null);
  const [deleting, setDeleting] = useState<AssetBrand | null>(null);
  const [form, setForm] = useState<FormData>({
    name: '',
    typeId: '',
    prefix: '',
  });
  const [initialForm, setInitialForm] = useState<FormData>({
    name: '',
    typeId: '',
    prefix: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const data = await api.get('/brands');
      setBrands(
        data.map((brand: any) => ({ ...brand, id: brand.brandID || brand.id }))
      );
    } catch (error: any) {
      console.error('Failed to fetch brands:', error);
      toast.error('Failed to load asset brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const hasChanges = () => {
    return (
      form.name !== initialForm.name ||
      form.typeId !== initialForm.typeId ||
      form.prefix !== initialForm.prefix
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editing) {
        await api.patch(`/brands/${editing.id}`, {
          name: form.name,
          typeId: form.typeId,
          prefix: form.prefix ?? '',
        });
        toast.success('Asset brand updated successfully');
      } else {
        await api.post('/brands', {
          name: form.name,
          typeId: form.typeId,
          prefix: form.prefix ?? '',
        });
        toast.success('Asset brand created successfully');
      }
      setIsOpen(false);
      setEditing(null);
      setForm({ name: '', typeId: '', prefix: '' });
      setShowCancelAlert(false);
      fetchBrands();
    } catch (error: any) {
      console.error('Failed to save asset brand:', error);
      toast.error(error.message || 'Failed to save asset brand');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/brands/${deleting!.id}`);
      toast.success('Asset brand deleted successfully');
      setDeleting(null);
      fetchBrands();
    } catch (error: any) {
      console.error('Failed to delete asset brand:', error);
      toast.error(error.message || 'Failed to delete asset brand');
      setDeleting(null);
    }
  };

  const openEdit = (brand: AssetBrand) => {
    setEditing(brand);
    const formData = {
      name: brand.name,
      typeId: (brand.typeId || brand.type_id || '').toString(),
      prefix: brand.prefix || '',
    };
    setForm(formData);
    setInitialForm(formData);
    setIsOpen(true);
  };

  return {
    brands,
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
    fetchBrands,
    hasChanges,
    handleSave,
    handleDelete,
    openEdit,
  };
}
