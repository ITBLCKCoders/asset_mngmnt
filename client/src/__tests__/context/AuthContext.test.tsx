import { render, renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
  setToken: vi.fn(),
}));
vi.mock('@/hooks/useCurrentUser', () => ({ clearCurrentUserCache: vi.fn() }));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading then become authenticated when /auth/me succeeds', async () => {
    (api.get as any).mockResolvedValue({ user: { id: 'u1', email: 'a@b.co' } });

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ user: { id: 'u1', email: 'a@b.co' } });
  });

  it('should be unauthenticated when /auth/me fails', async () => {
    (api.get as any).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should render children without crashing', async () => {
    (api.get as any).mockResolvedValue({ user: null });
    const { getByText } = render(
      <AuthProvider>
        <div>Child Content</div>
      </AuthProvider>
    );
    await waitFor(() => {
      expect(getByText('Child Content')).toBeDefined();
    });
  });
});

describe('useAuth', () => {
  it('should throw when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
  });
});
