import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from '@/pages/dashboard/dashboard';
import { api } from '@/lib/api';

const stableDashboardUser = {
  id: 'u1',
  role: { name: 'User' as const },
};

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(() => ({
    user: stableDashboardUser,
    loading: false,
  })),
}));

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: vi.fn(() => ({
    roleCustodian: null,
    hasPermission: vi.fn(() => true),
  })),
}));

vi.mock('@/lib/api', () => ({
  getToken: vi.fn(() => 'mock-token'),
  api: { get: vi.fn() },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn((p: Promise<unknown>) => p),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuditFieldLookups', () => ({
  useAuditFieldLookups: vi.fn(() => ({ lookups: {}, mergedIdLabels: {} })),
}));

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url.includes('/dashboard')) {
      return {
        data: {
          stats: {
            totalAssets: 0,
            activeAssignments: 0,
            availableAssets: 0,
            deployedAssets: 0,
            underMaintenance: 0,
            forDisposal: 0,
            assetReturnsCount: 0,
            pendingReturnCount: 0,
            pendingTransferCount: 0,
            disposedAssets: 0,
            underRepair: 0,
            transferedAssets: 0,
            returnedAssets: 0,
            forMaintenance: 0,
            forRepair: 0,
          },
          assetByType: [],
          movement: { weekly: [], monthly: [] },
          statusDistribution: [],
        },
      };
    }
    if (url.includes('/audit')) {
      return { auditLogs: [] };
    }
    return {};
  });
});

describe('Dashboard', () => {
  it('should render employee dashboard title', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Dashboard' })).toBeInTheDocument();
    });
  });
});
