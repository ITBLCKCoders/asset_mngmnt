import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { api } from '@/lib/api';
import * as useCurrentUserModule from '@/hooks/useCurrentUser';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

describe('useUserPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCurrentUserModule.useCurrentUser as any).mockReturnValue({
      user: { id: 'user-1', role: { name: 'User' } },
      loading: false,
    });
  });

  it('should fetch permissions and return roleCustodian', async () => {
    (api.get as any).mockResolvedValue({
      permissions: { assets: { view: true } },
      roleCustodian: {
        assetType: 'it',
        managerRole: 'none',
        managerApprover1: false,
        managerApprover2: false,
      },
    });

    const { result } = renderHook(() => useUserPermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).toEqual({ assets: { view: true } });
    expect(result.current.roleCustodian).not.toBeNull();
    expect(result.current.roleCustodian?.assetType).toBe('it');
    expect(result.current.hasPermission('assets', 'view')).toBe(true);
  });

  it('should keep loading true while current user is still loading (e.g. after refresh)', () => {
    (useCurrentUserModule.useCurrentUser as any).mockReturnValue({
      user: null,
      loading: true,
    });

    const { result } = renderHook(() => useUserPermissions());

    expect(result.current.loading).toBe(true);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should return true for hasPermission when user is Admin', async () => {
    (useCurrentUserModule.useCurrentUser as any).mockReturnValue({
      user: { id: 'admin-1', role: { name: 'Admin' } },
      loading: false,
    });
    (api.get as any).mockResolvedValue({ permissions: {} });

    const { result } = renderHook(() => useUserPermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasPermission('any', 'any')).toBe(true);
  });
});
