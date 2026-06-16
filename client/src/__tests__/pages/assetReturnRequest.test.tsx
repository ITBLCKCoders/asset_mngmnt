import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AssetReturnRequest from '@/pages/assets/assetReturnRequest';

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

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/components/auth/SmsOtpDialog', () => ({
  default: vi.fn(() => null),
}));

vi.mock('@/lib/pdfGenerator', () => ({
  generateAssetReturnPDF: vi.fn(),
  downloadPDF: vi.fn(),
}));

const emptyApiMock = vi.fn().mockImplementation(async (url: string) => {
  if (url === '/asset-assignments/me') return { assignments: [] };
  if (url.startsWith('/asset-returns/user/')) return { assetReturns: [], assetReturnForms: [] };
  if (url.startsWith('/asset-transfers/user/')) return { assetTransferForms: [] };
  if (url === '/asset-builders') return { builders: [] };
  if (url === '/intangible-assets') return [];
  return {};
});

function renderPage() {
  return render(
    <BrowserRouter>
      <AssetReturnRequest />
    </BrowserRouter>
  );
}

describe('AssetReturnRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
  });

  it('should render the page header with title', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Return asset')).toBeDefined();
    });
  });

  it('should show shimmer during initial loading', async () => {
    (api.get as any).mockImplementation(
      () => new Promise(() => {})
    );
    renderPage();
    await waitFor(() => {
      const shimmers = document.querySelectorAll('[style*="background-position"]');
      expect(shimmers.length).toBeGreaterThan(0);
    });
  });

  it('should show empty state when no active asset assignments', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No active asset assignments found')).toBeDefined();
    });
  });

  it('should show empty return requests state', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No return requests found')).toBeDefined();
    });
  });
});
