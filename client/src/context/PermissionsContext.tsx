'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
export type RoleCustodian = {
  assetType: string | null;
  managerRole: string;
  managerApprover1: boolean;
  managerApprover2?: boolean;
} | null;

interface PermissionsContextValue {
  permissions: Record<string, Record<string, boolean>>;
  roleCustodian: RoleCustodian;
  loading: boolean;
  hasPermission: (module: string, permission: string) => boolean;
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(
  undefined
);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useCurrentUser();
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [roleCustodian, setRoleCustodian] = useState<RoleCustodian>(null);
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
    } catch (error: unknown) {
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

  const loading = userLoading || permissionsFetchLoading;

  const hasPermission = useCallback(
    (module: string, permission: string) => {
      const normalizedRoleName = (user?.role?.name ?? '').trim().toLowerCase();

      if (
        normalizedRoleName === 'admin' ||
        normalizedRoleName === 'global admin'
      ) {
        return true;
      }

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

      return permissions[module]?.[permission] ?? false;
    },
    [permissions, user?.role?.name]
  );

  const value = useMemo(
    () => ({
      permissions,
      roleCustodian,
      loading,
      hasPermission,
      refetch: loadPermissions,
    }),
    [permissions, roleCustodian, loading, hasPermission, loadPermissions]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  return useContext(PermissionsContext);
}
