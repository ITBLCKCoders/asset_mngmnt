import { useState, useEffect, useRef } from 'react';
import { Role } from '@/types/assets';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ModulePermissionsMap } from '@/components/common/ModulePermissionsMatrix';

export type RoleFormState = {
  name: string;
  description: string;
  asset_type: string;
  manager_role: string;
  hr_accountability_receiver: boolean;
  manager_approver_1: boolean;
  manager_approver_2: boolean;
  manager_approver_3: boolean;
};

const emptyRoleForm: RoleFormState = {
  name: '',
  description: '',
  asset_type: 'none',
  manager_role: 'none',
  hr_accountability_receiver: false,
  manager_approver_1: false,
  manager_approver_2: false,
  manager_approver_3: false,
};

export function useRoleManagement(
  setRoles: (updater: (prev: Role[]) => Role[]) => void
) {
  const [rolesIsOpen, setRolesIsOpen] = useState(false);
  const [rolesEditing, setRolesEditing] = useState<Role | null>(null);
  const [rolesForm, setRolesForm] = useState<RoleFormState>(emptyRoleForm);
  const [rolesInitialForm, setRolesInitialForm] =
    useState<RoleFormState>(emptyRoleForm);
  const [rolesSaving, setRolesSaving] = useState(false);
  const [rolesShowCancelAlert, setRolesShowCancelAlert] = useState(false);
  const [rolesDeleting, setRolesDeleting] = useState<Role | null>(null);
  const [rolesModulePermissions, setRolesModulePermissions] =
    useState<ModulePermissionsMap>({});
  const [rolesModulePermissionsInitial, setRolesModulePermissionsInitial] =
    useState<ModulePermissionsMap>({});
  const rolesPermFetchGen = useRef(0);

  useEffect(() => {
    if (rolesIsOpen && !rolesEditing) {
      setRolesForm(emptyRoleForm);
      setRolesInitialForm(emptyRoleForm);
      setRolesModulePermissions({});
      setRolesModulePermissionsInitial({});
    }
  }, [rolesIsOpen, rolesEditing]);

  useEffect(() => {
    if (!rolesIsOpen || !rolesEditing) return;
    const gen = ++rolesPermFetchGen.current;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ permissions: ModulePermissionsMap }>(
          `/roles/${rolesEditing.roleID}/permissions`
        );
        if (cancelled || gen !== rolesPermFetchGen.current) return;
        setRolesModulePermissions(res.permissions);
        setRolesModulePermissionsInitial(
          JSON.parse(JSON.stringify(res.permissions)) as ModulePermissionsMap
        );
      } catch {
        if (!cancelled && gen === rolesPermFetchGen.current) {
          setRolesModulePermissions({});
          setRolesModulePermissionsInitial({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rolesIsOpen, rolesEditing?.roleID]);

  const modulePermissionsUnchanged = () =>
    JSON.stringify(rolesModulePermissions) ===
    JSON.stringify(rolesModulePermissionsInitial);

  const rolesHasChanges = () => {
    return (
      rolesForm.name !== rolesInitialForm.name ||
      rolesForm.description !== rolesInitialForm.description ||
      rolesForm.asset_type !== rolesInitialForm.asset_type ||
      rolesForm.manager_role !== rolesInitialForm.manager_role ||
      rolesForm.hr_accountability_receiver !==
        rolesInitialForm.hr_accountability_receiver ||
      rolesForm.manager_approver_1 !== rolesInitialForm.manager_approver_1 ||
      rolesForm.manager_approver_2 !== rolesInitialForm.manager_approver_2 ||
      rolesForm.manager_approver_3 !== rolesInitialForm.manager_approver_3 ||
      !modulePermissionsUnchanged()
    );
  };

  const handleRolesSave = async () => {
    try {
      setRolesSaving(true);
      const payload = {
        name: rolesForm.name,
        description: rolesForm.description || undefined,
        asset_type:
          rolesForm.asset_type && rolesForm.asset_type !== 'none'
            ? rolesForm.asset_type
            : undefined,
        manager_role:
          rolesForm.manager_role && rolesForm.manager_role !== 'none'
            ? rolesForm.manager_role
            : undefined,
        hr_accountability_receiver: rolesForm.hr_accountability_receiver,
        manager_approver_1: rolesForm.manager_approver_1,
        manager_approver_2: rolesForm.manager_approver_2,
        manager_approver_3: rolesForm.manager_approver_3,
      };
      let savedRoleId: string;
      if (rolesEditing) {
        const response = await api.put<{ message: string; role: Role }>(
          `/roles/${rolesEditing.roleID}`,
          payload
        );
        savedRoleId = response.role.roleID;
        setRoles(prev =>
          prev.map(role =>
            role.roleID === rolesEditing.roleID ? response.role : role
          )
        );
        toast.success(response.message);
      } else {
        const response = await api.post<{ message: string; role: Role }>(
          '/roles',
          payload
        );
        savedRoleId = response.role.roleID;
        setRoles(prev => [...prev, response.role]);
        toast.success(response.message);
      }
      try {
        await api.put(`/roles/${savedRoleId}/permissions`, {
          permissions: rolesModulePermissions,
        });
      } catch (permErr: unknown) {
        if (permErr instanceof Error) {
          toast.error(
            permErr.message || 'Role saved but default module access failed.'
          );
        } else {
          toast.error('Role saved but default module access failed.');
        }
      }
      setRolesIsOpen(false);
      setRolesEditing(null);
      setRolesForm(emptyRoleForm);
      setRolesInitialForm(emptyRoleForm);
      setRolesModulePermissions({});
      setRolesModulePermissionsInitial({});
      setRolesShowCancelAlert(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to save role');
      } else {
        toast.error('Failed to save role');
      }
    } finally {
      setRolesSaving(false);
    }
  };

  const handleRolesDelete = async () => {
    try {
      const response = await api.delete<{ message: string }>(
        `/roles/${rolesDeleting?.roleID}`
      );
      setRoles(prev =>
        prev.filter(role => role.roleID !== rolesDeleting?.roleID)
      );
      toast.success(response.message);
      setRolesDeleting(null);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to delete role');
      } else {
        toast.error('Failed to delete role');
      }
      setRolesDeleting(null);
    }
  };

  const openRolesEdit = (role: Role) => {
    setRolesEditing(role);
    const formData: RoleFormState = {
      name: role.name,
      description: role.description || '',
      asset_type: role.asset_type ?? 'none',
      manager_role: role.manager_role ?? 'none',
      hr_accountability_receiver: Boolean(role.hr_accountability_receiver),
      manager_approver_1: Boolean(role.manager_approver_1),
      manager_approver_2: Boolean(role.manager_approver_2),
      manager_approver_3: Boolean(role.manager_approver_3),
    };
    setRolesForm(formData);
    setRolesInitialForm(formData);
    setRolesIsOpen(true);
  };

  const resetRolesForm = () => {
    setRolesForm(emptyRoleForm);
    setRolesInitialForm(emptyRoleForm);
    setRolesModulePermissions({});
    setRolesModulePermissionsInitial({});
  };

  return {
    rolesIsOpen,
    setRolesIsOpen,
    rolesEditing,
    setRolesEditing,
    rolesForm,
    setRolesForm,
    rolesInitialForm,
    setRolesInitialForm,
    rolesSaving,
    rolesShowCancelAlert,
    setRolesShowCancelAlert,
    rolesDeleting,
    setRolesDeleting,
    rolesHasChanges,
    handleRolesSave,
    handleRolesDelete,
    openRolesEdit,
    resetRolesForm,
    rolesModulePermissions,
    setRolesModulePermissions,
  };
}
