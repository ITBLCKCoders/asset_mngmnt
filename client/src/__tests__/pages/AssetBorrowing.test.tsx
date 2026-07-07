import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AssetBorrowing from '@/pages/assets/assetBorrowing';

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

vi.mock('@/lib/pdfGenerator', () => ({
  generateAssetBorrowingPDF: vi.fn(),
  downloadPDF: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderPage() {
  return render(
    <BrowserRouter>
      <AssetBorrowing />
    </BrowserRouter>
  );
}

const emptyApiMock = vi.fn().mockImplementation(async (url: string) => {
  if (url === '/categories') return { categories: [] };
  if (url === '/types') return { types: [] };
  if (url === '/asset-borrow-requests/mine') return { borrowRequests: [] };
  return {};
});

describe('AssetBorrowing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
  });

  it('should render the page header with title', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Asset borrowing')).toBeDefined();
    });
  });

  it('should render borrow assets button', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Borrow assets').length).toBeGreaterThanOrEqual(1);
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

  it('should show empty state when no borrow requests', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No borrow requests yet')).toBeDefined();
    });
  });
});
