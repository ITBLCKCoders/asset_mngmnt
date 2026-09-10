import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import MyAssetsPage from '@/pages/assets/myAssets';

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

vi.mock('@/context/CompanyContext', () => ({
  useCompanyContext: () => ({ activeCompany: { id: 'c1', name: 'Test Company' }, loading: false, companies: [], fetchCompanies: vi.fn(), fetchActiveCompany: vi.fn(), setActiveCompany: vi.fn() }),
}));

function renderPage() {
  return render(
    <BrowserRouter>
      <MyAssetsPage />
    </BrowserRouter>
  );
}

describe('MyAssetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
  });

  it('should render the page header with title', async () => {
    (api.get as any).mockResolvedValue({ assets: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('My Assets')).toBeDefined();
    });
  });

  it('should render the IT Asset and Admin Asset scope tabs', async () => {
    (api.get as any).mockResolvedValue({ assets: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /IT Asset/ })).toBeDefined();
      expect(screen.getByRole('tab', { name: /Admin Asset/ })).toBeDefined();
    });
  });

  it('should render the Intangible scope tab', async () => {
    (api.get as any).mockResolvedValue({ assets: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Intangible/ })).toBeDefined();
    });
  });

  it('should show shimmer during initial loading', async () => {
    (api.get as any).mockImplementation(
      () => new Promise(() => {})
    );
    renderPage();
    await waitFor(() => {
      const shimmers = document.querySelectorAll('[data-slot="shimmer"]');
      expect(shimmers.length).toBeGreaterThan(0);
    });
  });

  it('should show empty state when no assets', async () => {
    (api.get as any).mockResolvedValue({ assets: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No Assets Assigned')).toBeDefined();
    });
  });

  it('should show asset cards after data loads', async () => {
    (api.get as any).mockResolvedValue({
      assets: [{
        asset_code: 'A1',
        name: 'Laptop',
        status: 'In Use',
        category_name: 'Electronics',
        brand: 'Dell',
        serial: 'SN123',
        description: 'Test laptop',
        created_at: '2024-01-01T00:00:00.000Z',
      }],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeDefined();
    });
  });

  it('should handle API error', async () => {
    (api.get as any).mockRejectedValue(new Error('API Error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('My Assets')).toBeInTheDocument();
    });
  });

  it('should show asset count badges on scope tabs after loading', async () => {
    (api.get as any).mockResolvedValue({ assets: [] });
    renderPage();
    await waitFor(() => {
      const itPill = screen.getByRole('tab', { name: /IT Asset/ });
      const adminPill = screen.getByRole('tab', { name: /Admin Asset/ });
      expect(itPill.querySelector('.tab-count')).not.toBeNull();
      expect(adminPill.querySelector('.tab-count')).not.toBeNull();
    });
  });
});
