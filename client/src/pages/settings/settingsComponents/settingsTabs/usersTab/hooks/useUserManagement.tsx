import { useState, useEffect } from 'react';
import { User, Role, Department, Company } from '@/types/assets';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function useUserManagement(isActive: boolean) {
  const { user: currentUser } = useCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // User form state
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    employee_number: '',
    role_id: null as string | null,
    department_id: null as string | null,
    company_id: null as string | null,
    is_active: true,
  });
  const [initialForm, setInitialForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    employee_number: '',
    role_id: null as string | null,
    department_id: null as string | null,
    company_id: null as string | null,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);

  useEffect(() => {
    if (isActive) {
      const loadData = async () => {
        try {
          setLoading(true);
          // In settings, users and roles should not be filtered by company
          // They are system-wide entities
          const results = await Promise.allSettled([
            api.get<{ users: User[] }>('/users'),
            api.get<{ roles: Role[] }>('/roles'),
            api.get<{ departments: Department[] }>('/departments'),
            api.get<{ companies: Company[] }>('/companies'),
          ]);

          const usersRes =
            results[0].status === 'fulfilled'
              ? results[0].value
              : { users: [] };
          const rolesRes =
            results[1].status === 'fulfilled'
              ? results[1].value
              : { roles: [] };
          const deptsRes =
            results[2].status === 'fulfilled'
              ? results[2].value
              : { departments: [] };
          const compsRes =
            results[3].status === 'fulfilled'
              ? results[3].value
              : { companies: [] };

          const deptsData = deptsRes.departments || [];
          const compsData = compsRes.companies || [];

          setUsers(
            usersRes.users.map(user => ({
              ...user,
              department:
                user.department ||
                deptsData.find(
                  dept => dept.departmentID === user.department_id
                ) ||
                undefined,
              company:
                user.company ||
                compsData.find(comp => comp.id === user.company_id) ||
                undefined,
            }))
          );

          setRoles(rolesRes.roles || []);
          setDepartments(deptsData);
          setCompanies(compsData);
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error('Failed to load data:', error);
            toast.error(error.message || 'Failed to load data');
          } else {
            toast.error('Failed to load data');
          }
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [isActive]);

  const hasChanges = () => {
    return (
      form.email !== initialForm.email ||
      form.first_name !== initialForm.first_name ||
      form.last_name !== initialForm.last_name ||
      form.employee_number !== initialForm.employee_number ||
      form.role_id !== initialForm.role_id ||
      form.department_id !== initialForm.department_id ||
      form.company_id !== initialForm.company_id ||
      form.is_active !== initialForm.is_active
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editing) {
        const response = await api.patch<{ message: string; user: User }>(
          `/users/${editing.userID}`,
          form
        );
        const updatedUser = {
          ...response.user,
          department:
            departments.find(
              dept => dept.departmentID === response.user.department_id
            ) || undefined,
          company:
            companies.find(comp => comp.id === response.user.company_id) ||
            undefined,
          role:
            roles.find(role => role.roleID === response.user.role_id) ||
            undefined,
        };
        setUsers(prev =>
          prev.map(user =>
            user.userID === editing.userID ? updatedUser : user
          )
        );
        toast.success(response.message);
      } else {
        const response = await api.post<{ message: string; user: User }>(
          '/users',
          form
        );
        const newUser = {
          ...response.user,
          department:
            departments.find(
              dept => dept.departmentID === response.user.department_id
            ) || undefined,
          company:
            companies.find(comp => comp.id === response.user.company_id) ||
            undefined,
          role:
            roles.find(role => role.roleID === response.user.role_id) ||
            undefined,
        };
        setUsers(prev => [...prev, newUser]);
        toast.success(response.message);
      }
      setIsOpen(false);
      setEditing(null);
      setForm({
        email: '',
        first_name: '',
        last_name: '',
        employee_number: '',
        role_id: '',
        department_id: '',
        company_id: '',
        is_active: true,
      });
      setShowCancelAlert(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to save user:', error);
        toast.error(error.message || 'Failed to save user');
      } else {
        toast.error('Failed to save user');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete<{ message: string }>(
        `/users/${deleting?.userID}`
      );
      setUsers(prev => prev.filter(user => user.userID !== deleting?.userID));
      toast.success(response.message);
      setDeleting(null);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to delete user:', error);
        toast.error(error.message || 'Failed to delete user');
      } else {
        toast.error('Failed to delete user');
      }
      setDeleting(null);
    }
  };

  const openEdit = (user: User) => {
    setEditing(user);
    const formData = {
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      employee_number: user.employee_number || '',
      role_id: user.role_id || null,
      department_id:
        user.department?.departmentID || user.department_id || null,
      company_id: user.company?.id || user.company_id || null,
      is_active: user.is_active,
    };
    setForm(formData);
    setInitialForm(formData);
    setIsOpen(true);
  };

  const resetForm = () => {
    const emptyForm = {
      email: '',
      first_name: '',
      last_name: '',
      employee_number: '',
      role_id: '',
      department_id: '',
      company_id: '',
      is_active: true,
    };
    setForm(emptyForm);
    setInitialForm(emptyForm);
  };

  return {
    users,
    roles,
    setRoles,
    departments,
    companies,
    loading,
    isOpen,
    setIsOpen,
    editing,
    setEditing,
    form,
    setForm,
    initialForm,
    setInitialForm,
    saving,
    showCancelAlert,
    setShowCancelAlert,
    deleting,
    setDeleting,
    hasChanges,
    handleSave,
    handleDelete,
    openEdit,
    resetForm,
  };
}
