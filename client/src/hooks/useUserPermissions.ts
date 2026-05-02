import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useCurrentUser } from './useCurrentUser';

/** Role-based custodian info (replaces custodians table). Used for filtering and UI. */
export type RoleCustodian = {
  assetType: string | null;
  managerRole: string;
  managerApprover1: boolean;
  managerApprover2?: boolean;
} | null;

export function useUserPermissions() {
  const { user, loading: userLoading } = useCurrentUser();
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [roleCustodian, setRoleCustodian] = useState<RoleCustodian>(null);
  /** True until /users/:id/permissions finishes (not while waiting on /auth/me). */
  const [permissionsFetchLoading, setPermissionsFetchLoading] =
    useState(true);

  const loadPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissions({});
      setRoleCustodian(null);
      setPermissionsFetchLoading(false);
      return;
    }
    try {
      setPermissionsFetchLoading(true);
      const response = await api.get<{
        permissions: Record<string, Record<string, boolean>>;
        roleCustodian?: {
          assetType: string | null;
          managerRole: string;
          managerApprover1?: boolean;
          managerApprover2?: boolean;
        } | null;
      }>(`/users/${user.id}/permissions`);
      setPermissions(response.permissions ?? {});
      const rc = response.roleCustodian ?? null;
      setRoleCustodian(
        rc
          ? {
              assetType: rc.assetType,
              managerRole: rc.managerRole,
              managerApprover1: rc.managerApprover1 ?? false,
              managerApprover2: rc.managerApprover2 ?? false,
            }
          : null
      );
    } catch (error: any) {
      console.error('Failed to fetch permissions:', error);
      setPermissions({});
      setRoleCustodian(null);
    } finally {
      setPermissionsFetchLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (userLoading) {
      return;
    }
    void loadPermissions();
  }, [user?.id, userLoading, loadPermissions]);

  /** Wait for current user and permission payload so refresh does not redirect early. */
  const loading = userLoading || permissionsFetchLoading;

  const fetchPermissions = loadPermissions;

  const hasPermission = (module: string, permission: string) => {
    const normalizedRoleName = (user?.role?.name ?? '').trim().toLowerCase();

    // For admin users, grant all permissions by default
    if (
      normalizedRoleName === 'admin' ||
      normalizedRoleName === 'super admin'
    ) {
      return true;
    }

    // Backward compatibility: older permission matrices may not include the
    // top-level "Reports" module yet, but they still carry history/audit access.
    if (
      module === 'Reports' &&
      permission === 'view' &&
      permissions.Reports?.view !== true
    ) {
      const reportRelatedModules = [
        'Assignment History',
        'Return History',
        'Transfer History',
        'Maintenance History',
        'Repair History',
        'Borrow History',
        'Asset Request History',
        'Disposal History',
        'Audit Trail',
      ];
      if (
        reportRelatedModules.some(
          reportModule => permissions[reportModule]?.view === true
        )
      ) {
        return true;
      }
    }

    const hasPerm = permissions[module]?.[permission] ?? false;
    return hasPerm;
  };

  return {
    permissions,
    roleCustodian,
    loading,
    hasPermission,
    refetch: fetchPermissions,
  };
}
