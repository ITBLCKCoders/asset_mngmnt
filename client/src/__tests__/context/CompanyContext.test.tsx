import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CompanyProvider, useCompanyContext } from '@/context/CompanyContext';
import { api } from '@/lib/api';

const mockUseAuth = vi.fn(() => ({ user: null, isAuthenticated: false }));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  getAuthUserIdFromPayload: vi.fn(() => null),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <CompanyProvider>{children}</CompanyProvider>;
}

describe('CompanyContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
    localStorage.clear();
  });

  it('should initialize with empty state when not authenticated', async () => {
    const { result } = renderHook(() => useCompanyContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.companies).toEqual([]);
    expect(result.current.activeCompany).toBeNull();
  });

  it('should fetch companies when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'a@b.co' },
      isAuthenticated: true,
    });
    (api.get as any).mockResolvedValue({ data: [{ id: 'c1', name: 'Company A' }] });

    const { result } = renderHook(() => useCompanyContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should expose fetchCompanies function', async () => {
    (api.get as any).mockResolvedValue({ companies: [{ id: 'c1', name: 'TestCo' }] });

    const { result } = renderHook(() => useCompanyContext(), { wrapper });

    await act(async () => {
      await result.current.fetchCompanies();
    });

    await waitFor(() => {
      expect(result.current.companies).toEqual([{ id: 'c1', name: 'TestCo' }]);
    });
  });

  it('should throw when used outside provider', () => {
    expect(() => renderHook(() => useCompanyContext())).toThrow('useCompanyContext must be used within a CompanyProvider');
  });
});
