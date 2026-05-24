import {
  usePermissionsContext,
  type RoleCustodian,
} from '@/context/PermissionsContext';

export type { RoleCustodian };

export function useUserPermissions() {
  const context = usePermissionsContext();
  if (!context) {
    throw new Error('useUserPermissions must be used within a PermissionsProvider');
  }
  return context;
}
