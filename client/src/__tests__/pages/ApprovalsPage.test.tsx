import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import ApprovalsPage from '@/pages/approvals/ApprovalsPage';

const mockUser = vi.hoisted(() => ({
  id: 'u1', company_id: 'c1', name: 'Test User', email: 'test@test.com',
  role_id: 'r2', role: { roleID: 'r2', name: 'User' }, verified: true,
  firstName: 'Test', lastName: 'User', username: 'testuser',
  contactNumber: '+639123456789', position: 'Staff',
  department: 'IT', department_id: 'd1', employeeId: 'EMP001',
  createdAt: '2024-01-01',
  address: { unitNo: '', buildingNo: '', street: '', subdivision: '', barangay: '', city: '', province: '', region: '' },
}));

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: mockUser, loading: false }),
}));

const mockPermissions = vi.hoisted(() => ({
  roleCustodian: null as { managerApprover2?: boolean } | null,
}));

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({
    permissions: {},
    roleCustodian: mockPermissions.roleCustodian,
    loading: false,
    hasPermission: vi.fn(() => false),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderPage(initialEntry = '/approvals') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ApprovalsPage />
    </MemoryRouter>
  );
}

describe('ApprovalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
  });

  it('should render the page header title', async () => {
    (api.get as any).mockResolvedValue({});
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Approvals')).toBeDefined();
    });
  });

  it('should load and show For Approval tab', async () => {
    (api.get as any).mockResolvedValue({ assetReturnForms: [], assetTransferForms: [], checklistBatches: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('For Approval')).toBeDefined();
    });
  });

  it('should handle API error', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Approvals')).toBeDefined();
    });
  });

  it('should deep-link to the Receive Approve tab via ?tab=receive', async () => {
    mockPermissions.roleCustodian = { managerApprover2: true };
    (api.get as any).mockResolvedValue({});
    renderPage('/approvals?tab=receive');
    await waitFor(() => {
      const receiveTrigger = screen.getByRole('tab', {
        name: /receive approve/i,
      });
      expect(receiveTrigger.getAttribute('data-state')).toBe('active');
    });
  });

  it('should fall back to For Approval when ?tab=receive is not permitted', async () => {
    mockPermissions.roleCustodian = null;
    (api.get as any).mockResolvedValue({});
    renderPage('/approvals?tab=receive');
    await waitFor(() => {
      const forApprovalTrigger = screen.getByRole('tab', {
        name: /for approval/i,
      });
      expect(forApprovalTrigger.getAttribute('data-state')).toBe('active');
    });
  });
});
