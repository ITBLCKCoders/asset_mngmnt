import { useState, useEffect } from 'react';
import { RiskLevel, FormData } from '../types';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useRiskLevels(options?: { onAfterSave?: () => void }) {
  const { onAfterSave } = options || {};
  const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<RiskLevel | null>(null);
  const [deleting, setDeleting] = useState<RiskLevel | null>(null);
  const [form, setForm] = useState<FormData>({ name: '', color: '' });
  const [initialForm, setInitialForm] = useState<FormData>({
    name: '',
    color: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const fetchRiskLevels = async () => {
    try {
      setLoading(true);
      const data = await api.get('/risk-levels');
      setRiskLevels(data.map((level: any) => ({ ...level, id: level.id })));
    } catch (error: any) {
      console.error('Failed to fetch risk levels:', error);
      toast.error('Failed to load risk levels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskLevels();
  }, []);

  const hasChanges = () => {
    return (
      form.name !== initialForm.name || form.color !== initialForm.color
    );
  };

  const handleSave = async () => {
    if (!(form.name ?? '').trim()) {
      toast.error('Risk level name is required');
      return;
    }

    try {
      setSaving(true);
      const color = form.color ?? '';
      if (editing) {
        await api.patch(`/risk-levels/${editing.id}`, {
          name: form.name,
          color,
        });
        toast.success('Risk level updated successfully');
      } else {
        await api.post('/risk-levels', {
          name: form.name,
          color,
        });
        toast.success('Risk level created successfully');
      }
      setIsOpen(false);
      setEditing(null);
      setForm({ name: '', color: '' });
      setShowCancelAlert(false);
      fetchRiskLevels();
      if (onAfterSave) onAfterSave();
    } catch (error: any) {
      console.error('Failed to save risk level:', error);
      toast.error(error.message || 'Failed to save risk level');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/risk-levels/${deleting!.id}`);
      toast.success('Risk level deleted successfully');
      setDeleting(null);
      fetchRiskLevels();
      if (onAfterSave) onAfterSave();
    } catch (error: any) {
      console.error('Failed to delete risk level:', error);
      toast.error(error.message || 'Failed to delete risk level');
      setDeleting(null);
    }
  };

  const openEdit = (level: RiskLevel) => {
    setEditing(level);
    const formData = {
      name: level.name,
      color: level.color || '',
    };
    setForm(formData);
    setInitialForm(formData);
    setIsOpen(true);
  };

  return {
    riskLevels,
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
    fetchRiskLevels,
    hasChanges,
    handleSave,
    handleDelete,
    openEdit,
  };
}
