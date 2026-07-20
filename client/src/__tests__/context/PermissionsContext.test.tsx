import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PermissionsProvider, usePermissionsContext } from '@/context/PermissionsContext';
import { api } from '@/lib/api';
import * as useCurrentUserModule from '@/hooks/useCurrentUser';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <PermissionsProvider>{children}</PermissionsProvider>;
}

describe('PermissionsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCurrentUserModule.useCurrentUser as any).mockReturnValue({
      user: null,
      loading: false,
    });
  });

  it('should fetch permissions when user is available', async () => {
    (useCurrentUserModule.useCurrentUser as any).mockReturnValue({
      user: { id: 'user-1', role: { name: 'User' } },
      loading: false,
    });
    (api.get as any).mockResolvedValue({
      permissions: { assets: { view: true, create: false } },
      roleCustodian: { assetType: 'it', managerRole: 'none', managerApprover1: false },
    });

    const { result } = renderHook(() => usePermissionsContext()!, { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).toEqual({ assets: { view: true, create: false } });
    expect(result.current.hasPermission('assets', 'view')).toBe(true);
    expect(result.current.hasPermission('assets', 'create')).toBe(false);
  });

  it('should have Admin bypass in hasPermission', async () => {
    (useCurrentUserModule.useCurrentUser as any).mockReturnValue({
      user: { id: 'admin-1', role: { name: 'Admin' } },
      loading: false,
    });
    (api.get as any).mockResolvedValue({ permissions: {} });

    const { result } = renderHook(() => usePermissionsContext()!, { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasPermission('any', 'any')).toBe(true);
  });

  it('should have Global Admin bypass in hasPermission', async () => {
    (useCurrentUserModule.useCurrentUser as any).mockReturnValue({
      user: { id: 'sa-1', role: { name: 'Global Admin' } },
      loading: false,
    });
    (api.get as any).mockResolvedValue({ permissions: {} });

    const { result } = renderHook(() => usePermissionsContext()!, { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasPermission('anything', 'any-permission')).toBe(true);
  });

  it('should not fetch when user has no id', async () => {
    const { result } = renderHook(() => usePermissionsContext()!, { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.permissions).toEqual({});
  });

  it('should keep loading while current user is loading', () => {
    (useCurrentUserModule.useCurrentUser as any).mockReturnValue({
      user: null,
      loading: true,
    });

    const { result } = renderHook(() => usePermissionsContext()!, { wrapper });

    expect(result.current.loading).toBe(true);
  });

  it('should support refetch function', async () => {
    (useCurrentUserModule.useCurrentUser as any).mockReturnValue({
      user: { id: 'user-1', role: { name: 'User' } },
      loading: false,
    });
    (api.get as any).mockResolvedValue({ permissions: { reports: { view: true } } });

    const { result } = renderHook(() => usePermissionsContext()!, { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).toEqual({ reports: { view: true } });

    (api.get as any).mockResolvedValue({ permissions: { reports: { view: false } } });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.permissions).toEqual({ reports: { view: false } });
    });
  });
});
