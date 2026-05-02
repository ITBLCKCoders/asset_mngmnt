import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface Department {
  id: string;
  name: string;
  code: string;
  prefix?: string;
  description?: string;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      // Add cache busting to ensure fresh data
      const timestamp = new Date().getTime();
      const { departments } = await api.get<{ departments: any[] }>(
        `/departments?t=${timestamp}`
      );
      const mappedDepartments = departments.map((dept: any) => ({
        id: dept.departmentID || dept.id,
        name: dept.name,
        code: dept.code,
        prefix: dept.prefix,
        description: dept.description,
      }));
      setDepartments(mappedDepartments);
    } catch (error: any) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return {
    departments,
    loading,
    fetchDepartments,
  };
}
