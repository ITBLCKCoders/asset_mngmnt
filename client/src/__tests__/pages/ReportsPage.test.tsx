import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import ReportsPage from '@/pages/reports/reportsPage';

vi.mock('jspdf', () => ({
  default: vi.fn(() => ({
    addImage: vi.fn(),
    addPage: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    internal: { pageSize: { getWidth: vi.fn(() => 210), getHeight: vi.fn(() => 297) } },
  })),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

const mockUser = vi.hoisted(() => ({
  id: 'u1',
  company_id: 'c1',
  name: 'Regular User',
  email: 'user@test.com',
  role_id: 'r2',
  role: { roleID: 'r2', name: 'User' },
  verified: true,
  firstName: 'Regular',
  lastName: 'User',
  username: 'regular',
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
    activeCompany: { id: 'c1', name: 'Company A' },
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

function renderPage(initialEntries = ['/reports']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ReportsPage />
    </MemoryRouter>
  );
}

const emptyApiMock = vi.fn().mockImplementation(async (url: string) => {
  if (url === '/companies') return { companies: [] };
  if (url === '/departments') return { departments: [] };
  if (url === '/asset-assignments') return { assignments: [] };
  if (url === '/asset-returns') return { assetReturns: [] };
  if (url === '/asset-transfers/history') return { records: [] };
  if (url === '/asset-borrow-requests') return { borrowRequests: [] };
  if (url === '/asset-borrow-requests/mine') return { borrowRequests: [] };
  if (url === '/asset-requests/all') return { requests: [] };
  if (url === '/asset-requests') return { requests: [] };
  if (url === '/gate-passes') return { gatePasses: [] };
  if (url.startsWith('/reports/maintenance-repair-history')) return { records: [] };
  if (url.startsWith('/reports/finance-reports')) return { data: { register: [], depreciation: [] } };
  if (url.startsWith('/dashboard/scope-category-ids')) return { data: { categoryIds: [] } };
  return {};
});

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
    (api.patch as any).mockResolvedValue({});
    (api.put as any).mockResolvedValue({});
  });

  it('should render the page header', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Reports')).toBeDefined();
    });
  });

  it('should show stat cards after loading', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Assignment History')).toBeDefined();
    });
    expect(screen.getByText('Return History')).toBeDefined();
    expect(screen.getByText('Transfer History')).toBeDefined();
    expect(screen.getByText('Maintenance History')).toBeDefined();
  });

  it('should show stat card values after loading', async () => {
    const mockWithData = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/companies') return { companies: [] };
      if (url === '/departments') return { departments: [] };
      if (url === '/asset-assignments') return {
        assignments: [{
          assignmentID: 1, asset: { name: 'Laptop', code: 'LT-001', category_id: 1 },
          user: { first_name: 'Alice', last_name: 'Smith' },
          assigned_by: 'admin', assigned_date: '2024-06-01',
          status: 'Active', assignment_notes: 'Test',
        }],
      };
      if (url === '/asset-returns') return { assetReturns: [{ return_id: 1, assignment: { asset: { name: 'Monitor', code: 'MN-001', category_id: 2 }, user: { first_name: 'Bob', last_name: 'Jones' } }, processed_by: 'admin', created_at: '2024-06-01', status: 'Processed', return_notes: 'Test' }] };
      if (url === '/asset-transfers/history') return { records: [{ recordId: 1, asset: { name: 'Desk', code: 'DK-001', category_id: 3 }, from: { name: 'Alice' }, to: { name: 'Bob' }, processor: 'admin', transferDate: '2024-06-01', status: 'Done', transferNotes: 'Test' }] };
      if (url === '/asset-borrow-requests') return { borrowRequests: [] };
      if (url === '/asset-borrow-requests/mine') return { borrowRequests: [] };
      if (url === '/asset-requests/all') return { requests: [] };
      if (url === '/asset-requests') return { requests: [] };
      if (url === '/gate-passes') return { gatePasses: [] };
      if (url.startsWith('/reports/maintenance-repair-history')) return { records: [] };
      if (url.startsWith('/reports/finance-reports')) return { data: { register: [], depreciation: [] } };
      if (url.startsWith('/dashboard/scope-category-ids')) return { data: { categoryIds: [] } };
      return {};
    });
    (api.get as any).mockImplementation(mockWithData);
    renderPage();
    await waitFor(() => {
      const cards = screen.getAllByText('In current report scope');
      expect(cards.length).toBe(9);
    });
  });

  it('should show 0 values when no data', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(9);
    });
  });

  it('should render export button', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Export Reports')).toBeDefined();
    });
  });

  it('should render chart sections', async () => {
    (api.get as any).mockImplementation(emptyApiMock);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('History entries by type')).toBeDefined();
    });
    expect(screen.getByText('Monthly transaction trend')).toBeDefined();
  });
});
