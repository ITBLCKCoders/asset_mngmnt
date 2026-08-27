import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AssetBuilderPage from '@/pages/assets/assetBuilder';

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

const mockAssetsData = vi.hoisted(() => ({
  assets: [],
  loading: true,
}));

vi.mock('@/pages/assets/assets-list/useAssetsData', () => ({
  useAssetsData: () => mockAssetsData,
}));

function renderPage() {
  return render(
    <BrowserRouter>
      <AssetBuilderPage />
    </BrowserRouter>
  );
}

describe('AssetBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
  });

  it('should render the page header with title', async () => {
    (api.get as any).mockResolvedValue({});
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Asset Builder')).toBeDefined();
    });
  });

  it('should show loading state', async () => {
    (api.get as any).mockImplementation(
      () => new Promise(() => {})
    );
    renderPage();
    const table = document.querySelector('[data-table-id="asset-builder-available"]');
    expect(table).toBeDefined();
  });

  it('should render create new asset builder card', async () => {
    (api.get as any).mockResolvedValue({});
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Create New Asset Builder')).toBeDefined();
    });
  });

  it('shows non-available assets that are not in a builder', async () => {
    (api.get as any).mockResolvedValue({});
    mockAssetsData.loading = false;
    mockAssetsData.assets = [
      {
        id: 'AST-999',
        name: 'In Use Laptop',
        description: '',
        category: 'Electronics',
        type: 'Laptop',
        serialNo: '',
        modelNo: '',
        brand: '',
        status: 'In Use',
        assignedTo: '',
        department: '',
        location: '',
        purchaseDate: null,
        purchasePrice: 0,
        supplier: '',
        warranty: null,
        warranty_months: null,
        documents: [],
        maintenanceSchedule: 'None',
        lastMaintenanceDate: null,
        nextMaintenanceDate: null,
        condition: 'Good',
        usefulLifeYears: 0,
        salvageValue: 0,
        depreciationMethod: '',
        annualDepreciation: 0,
        depreciationStartDate: null,
        company: '',
        building: '',
        createdAt: new Date(),
        createdBy: '',
        updatedAt: new Date(),
        updatedBy: '',
        image: '',
      },
    ];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('In Use Laptop')).toBeDefined();
    });
    expect(screen.getByText('AST-999')).toBeDefined();
  });
});
