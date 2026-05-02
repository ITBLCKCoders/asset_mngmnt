import { useState } from 'react';
import { toast } from 'sonner';
import { Position } from '@/types/assets';
import { api } from '@/lib/api';

export function usePositions(isActive: boolean) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ positions: Position[] }>('/positions');
      setPositions(response.positions);
    } catch (error: any) {
      console.error('Failed to fetch positions:', error);
      toast.error(error.message || 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPositionsByDepartment = async (departmentId: string) => {
    try {
      setLoading(true);
      const response = await api.get<{ positions: Position[] }>(
        `/positions/department/${departmentId}`
      );
      setPositions(response.positions);
    } catch (error: any) {
      console.error('Failed to fetch positions by department:', error);
      toast.error(error.message || 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (
    form: {
      name: string;
      description: string;
      department_id: string;
    },
    editing: Position | null
  ) => {
    try {
      setSaving(true);
      if (editing) {
        const response = await api.patch<{
          message: string;
          position: Position;
        }>(`/positions/${editing.positionID}`, form);
        setPositions(prev =>
          prev.map(pos =>
            pos.positionID === editing.positionID ? response.position : pos
          )
        );
        toast.success(response.message);
      } else {
        const response = await api.post<{
          message: string;
          position: Position;
        }>('/positions', form);
        setPositions(prev => [...prev, response.position]);
        toast.success(response.message);
      }
      return true;
    } catch (error: any) {
      console.error('Failed to save position:', error);
      toast.error(error.message || 'Failed to save position');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deleting: Position) => {
    try {
      setDeleting(true);
      const response = await api.delete<{ message: string }>(
        `/positions/${deleting.positionID}`
      );
      setPositions(prev =>
        prev.filter(pos => pos.positionID !== deleting.positionID)
      );
      toast.success(response.message);
      return true;
    } catch (error: any) {
      console.error('Failed to delete position:', error);
      toast.error(error.message || 'Failed to delete position');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return {
    positions,
    loading,
    saving,
    deleting,
    fetchPositions,
    fetchPositionsByDepartment,
    handleSave,
    handleDelete,
  };
}
