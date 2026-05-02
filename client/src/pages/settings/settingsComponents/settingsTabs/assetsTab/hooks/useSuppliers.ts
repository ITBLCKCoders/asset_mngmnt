import { useState, useEffect } from 'react';
import { Supplier, FormData } from '../types';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormData>({
    name: '',
    categoryId: '',
    contact: '',
    email: '',
  });
  const [initialForm, setInitialForm] = useState<FormData>({
    name: '',
    categoryId: '',
    contact: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/suppliers');
      setSuppliers(
        data.map((supplier: any) => ({
          ...supplier,
          id: supplier.supplierID || supplier.id,
        }))
      );
    } catch (error: any) {
      console.error('Failed to fetch suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const hasChanges = () => {
    return (
      form.name !== initialForm.name ||
      form.categoryId !== initialForm.categoryId ||
      form.contact !== initialForm.contact ||
      form.email !== initialForm.email
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editing) {
        await api.patch(`/suppliers/${editing.id}`, {
          name: form.name,
          categoryId: form.categoryId,
          contact: form.contact || null,
          email: form.email || null,
        });
        toast.success('Supplier updated successfully');
      } else {
        await api.post('/suppliers', {
          name: form.name,
          categoryId: form.categoryId,
          contact: form.contact || null,
          email: form.email || null,
        });
        toast.success('Supplier created successfully');
      }
      setIsOpen(false);
      setEditing(null);
      setForm({ name: '', categoryId: '', contact: '', email: '' });
      setShowCancelAlert(false);
      fetchSuppliers();
    } catch (error: any) {
      console.error('Failed to save supplier:', error);
      toast.error(error.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/suppliers/${deleting!.id}`);
      toast.success('Supplier deleted successfully');
      setDeleting(null);
      fetchSuppliers();
    } catch (error: any) {
      console.error('Failed to delete supplier:', error);
      toast.error(error.message || 'Failed to delete supplier');
      setDeleting(null);
    }
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    const formData = {
      name: supplier.name,
      categoryId: (
        supplier.categoryId ||
        supplier.category_id ||
        ''
      ).toString(),
      contact: supplier.contact || '',
      email: supplier.email || '',
    };
    setForm(formData);
    setInitialForm(formData);
    setIsOpen(true);
  };

  return {
    suppliers,
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
    fetchSuppliers,
    hasChanges,
    handleSave,
    handleDelete,
    openEdit,
  };
}
