import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  clearCurrentUserCache,
  useCurrentUser,
} from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockUseAuth = vi.fn(() => ({
  user: null as unknown,
  isLoading: false,
  isAuthenticated: false,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('useCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockReset();
    clearCurrentUserCache();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  });

  it('should return user null when /auth/me fails', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/roles') return Promise.resolve({ roles: [] });
      if (url === '/departments') return Promise.resolve({ departments: [] });
      if (url === '/auth/me') return Promise.reject(new Error('Unauthorized'));
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('should return loading then user when /auth/me succeeds', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        user: {
          id: 'u1',
          email: 'a@b.co',
          firstName: 'John',
          lastName: 'Doe',
          role_id: 'r1',
          verified: true,
          createdAt: '2024-01-01',
          address: {},
        },
      },
      isLoading: false,
      isAuthenticated: true,
    });

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/roles') return Promise.resolve({ roles: [] });
      if (url === '/departments') return Promise.resolve({ departments: [] });
      if (url === '/auth/me')
        return Promise.resolve({
          user: {
            id: 'u1',
            email: 'a@b.co',
            firstName: 'John',
            lastName: 'Doe',
            role_id: 'r1',
            verified: true,
            createdAt: '2024-01-01',
            address: {},
          },
        });
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('a@b.co');
    expect(result.current.user?.name).toContain('John');
  });

  it('should refetch when a different user logs in', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        user: {
          id: 'user-a',
          email: 'a@b.co',
          firstName: 'Alice',
          lastName: 'One',
          role_id: 'r1',
          verified: true,
          createdAt: '2024-01-01',
          address: {},
        },
      },
      isLoading: false,
      isAuthenticated: true,
    });

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/roles') return Promise.resolve({ roles: [] });
      if (url === '/departments') return Promise.resolve({ departments: [] });
      return Promise.reject(new Error('Unexpected URL'));
    });

    const { result, rerender } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current.user?.id).toBe('user-a');
    });

    mockUseAuth.mockReturnValue({
      user: {
        user: {
          id: 'user-b',
          email: 'b@b.co',
          firstName: 'Bob',
          lastName: 'Two',
          role_id: 'r2',
          verified: true,
          createdAt: '2024-01-01',
          address: {},
        },
      },
      isLoading: false,
      isAuthenticated: true,
    });

    rerender();

    await waitFor(() => {
      expect(result.current.user?.id).toBe('user-b');
      expect(result.current.user?.firstName).toBe('Bob');
    });
  });
});
