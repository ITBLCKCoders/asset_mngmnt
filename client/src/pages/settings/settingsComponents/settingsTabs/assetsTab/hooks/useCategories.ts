import { useState, useEffect } from 'react';
import { Category, FormData } from '../types';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useCategories(options?: { onAfterSave?: () => void }) {
  const { onAfterSave } = options || {};
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [form, setForm] = useState<FormData>({
    name: '',
    prefix: '',
    gl_code: '',
    departmentId: '',
  });
  const [initialForm, setInitialForm] = useState<FormData>({
    name: '',
    prefix: '',
    gl_code: '',
    departmentId: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.get('/categories');
      setCategories(
        data.map((cat: any) => ({ ...cat, id: cat.categoryID || cat.id }))
      );
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const hasChanges = () => {
    return (
      form.name !== initialForm.name ||
      form.prefix !== initialForm.prefix ||
      form.gl_code !== initialForm.gl_code ||
      form.departmentId !== initialForm.departmentId
    );
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (
        !form.name.trim() ||
        !(form.prefix ?? '').trim() ||
        !(form.gl_code ?? '').trim() ||
        !form.departmentId
      ) {
        toast.error('Please fill in all required fields');
        return;
      }

      setSaving(true);
      if (editing) {
        await api.patch(`/categories/${editing.id}`, form);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', form);
        toast.success('Category created successfully');
      }
      setIsOpen(false);
      setEditing(null);
      setForm({ name: '', prefix: '', gl_code: '', departmentId: '' });
      setShowCancelAlert(false);
      fetchCategories();
      if (onAfterSave) onAfterSave();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      toast.error(error.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleting!.id}`);
      toast.success('Category deleted successfully');
      setDeleting(null);
      fetchCategories();
      if (onAfterSave) onAfterSave();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      toast.error(error.message || 'Failed to delete category');
      setDeleting(null);
    }
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    const formData = {
      name: cat.name,
      prefix: cat.prefix,
      gl_code: cat.gl_code,
      departmentId: cat.department_id || '',
    };
    setForm(formData);
    setInitialForm(formData);
    setIsOpen(true);
  };

  return {
    categories,
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
    fetchCategories,
    hasChanges,
    handleSave,
    handleDelete,
    openEdit,
  };
}
