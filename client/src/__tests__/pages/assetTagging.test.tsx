import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AssetsTagging from '@/pages/assets/asset-tagging/assetTagging';

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

vi.mock('@/context/CompanyContext', () => ({
  useCompanyContext: () => ({
    activeCompany: { id: 'c1', name: 'Test Company' },
    loading: false,
    companies: [],
    fetchCompanies: vi.fn(),
    fetchActiveCompany: vi.fn(),
    setActiveCompany: vi.fn(),
  }),
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
      <AssetsTagging />
    </BrowserRouter>
  );
}

describe('AssetsTagging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
  });

  it('should render the page header with title', async () => {
    (api.get as any).mockResolvedValue({ assets: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Assets Tagging')).toBeDefined();
    });
  });

  it('should show loading spinner initially', async () => {
    (api.get as any).mockImplementation(
      () => new Promise(() => {})
    );
    renderPage();
    await waitFor(() => {
      const table = document.querySelector('[data-table-id="asset-tagging"]');
      expect(table).toBeDefined();
    });
  });

  it('should show assets after data loads', async () => {
    (api.get as any).mockResolvedValue({
      assets: [{
        asset_code: 'A1',
        name: 'Laptop',
        status: 'Available',
        category_name: 'Electronics',
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
      const { toast } = require('sonner');
      expect(toast.error).toHaveBeenCalledWith('Failed to load assets');
    });
  });
});
