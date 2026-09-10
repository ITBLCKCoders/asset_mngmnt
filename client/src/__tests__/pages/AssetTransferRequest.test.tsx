import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AssetTransferRequest from '@/pages/assets/assetTransferRequest';

const mockUser = vi.hoisted(() => ({
  id: 'u1',
  company_id: 'c1',
  name: 'Test User',
  email: 'test@test.com',
  role_id: 'r2',
  role: { roleID: 'r2', name: 'User' },
  verified: true,
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser',
  contactNumber: '+639123456789',
  position: 'Staff',
  department: 'IT',
  department_id: 'd1',
  employeeId: 'EMP001',
  createdAt: '2024-01-01',
  address: {
    unitNo: '', buildingNo: '', street: '', subdivision: '',
    barangay: '', city: '', province: '', region: '',
  },
}));

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: mockUser, loading: false }),
}));

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({
    permissions: {},
    roleCustodian: null,
    loading: false,
    hasPermission: vi.fn(() => true),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/auth/SmsOtpDialog', () => ({
  default: vi.fn(() => null),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderPage() {
  return render(
    <BrowserRouter>
      <AssetTransferRequest />
    </BrowserRouter>
  );
}

const emptyApiMock = vi.fn().mockImplementation(async (url: string) => {
  if (url.startsWith('/asset-assignments/me')) return { assignments: [] };
  if (url === '/departments') return { departments: [] };
  if (url === '/asset-transfers/user/u1') return { assetTransferForms: [] };
  if (url === '/asset-returns/user/u1') return { assetReturnForms: [] };
  if (url === '/users') return { users: [] };
  if (url === '/intangible-assets') return [];
  return {};
});

describe('AssetTransferRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
  });

  it('should render the page header with title', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Transfer asset')).toBeDefined();
    });
  });

  it('should render the IT Asset and Admin Asset scope tabs', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'IT Asset' })).toBeDefined();
      expect(screen.getByRole('tab', { name: 'Admin Asset' })).toBeDefined();
    });
  });

  it('should render tabs after loading', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('My Transfer Requests')).toBeDefined();
    });
  });

  it('should show shimmer during loading', async () => {
    (api.get as any).mockImplementation(
      () => new Promise(() => {})
    );
    renderPage();
    await waitFor(() => {
      const shimmers = document.querySelectorAll('[style*="background-position"]');
      expect(shimmers.length).toBeGreaterThan(0);
    });
  });

  it('should show empty state when no assignments', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No active asset assignments found')).toBeDefined();
    });
  });

  it('shows Generate Return Form only after transfer approval and before a return is linked', async () => {
    (api.get as any).mockImplementation(async (url: string) => {
      if (url === '/asset-transfers/user/u1') {
        return {
          assetTransferForms: [
            {
              formID: 'tf1',
              form_number: 'TRF-001',
              user_id: 'u1',
              created_at: '2024-06-01T10:00:00.000Z',
              dept_head_signed_at: '2024-06-02T09:00:00.000Z',
              sub_approver_1_signed_at: null,
              return_form_id: null,
              returns: [],
            },
          ],
        };
      }
      return emptyApiMock(url);
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Generate Return Form' })
      ).toBeDefined();
      expect(screen.getByText('Awaiting Return Form')).toBeDefined();
    });
  });

  it('does not show Generate Return Form when the approved transfer already has a linked return', async () => {
    (api.get as any).mockImplementation(async (url: string) => {
      if (url === '/asset-transfers/user/u1') {
        return {
          assetTransferForms: [
            {
              formID: 'tf1',
              form_number: 'TRF-001',
              user_id: 'u1',
              created_at: '2024-06-01T10:00:00.000Z',
              dept_head_signed_at: '2024-06-02T09:00:00.000Z',
              sub_approver_1_signed_at: null,
              return_form_id: 'rf1',
              returns: [],
            },
          ],
        };
      }
      return emptyApiMock(url);
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('TRF-001')).toBeDefined();
    });
    expect(
      screen.queryByRole('button', { name: 'Generate Return Form' })
    ).toBeNull();
  });
});
