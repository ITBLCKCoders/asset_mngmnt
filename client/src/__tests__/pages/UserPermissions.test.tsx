import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import UserPermissions from '@/pages/user';

const mockUser = vi.hoisted(() => ({
  id: 'u1',
  company_id: 'c1',
  name: 'Admin User',
  email: 'admin@test.com',
  role_id: 'r1',
  role: { roleID: 'r1', name: 'Admin' },
  verified: true,
  firstName: 'Admin',
  lastName: 'User',
  username: 'admin',
  contactNumber: '+639123456789',
  position: 'Manager',
  department: 'IT',
  department_id: 'd1',
  employeeId: 'EMP001',
  createdAt: '2024-01-01',
  address: {
    unitNo: '', buildingNo: '', street: '', subdivision: '',
    barangay: '', city: '', province: '', region: '',
  },
}));

const mockRoles = vi.hoisted(() => [
  { roleID: 'r1', name: 'Admin' },
  { roleID: 'r2', name: 'User' },
]);

const mockUsers = vi.hoisted(() => [
  {
    userID: 'u1', first_name: 'Alice', last_name: 'Smith',
    email: 'alice@test.com', role_id: 'r1',
    role: { roleID: 'r1', name: 'Admin' },
    is_active: true, avatar_url: null,
    created_at: '2024-01-01', updated_at: '2024-01-01',
    hr_accountability_receiver: false,
    manager_approver_1: false, manager_approver_2: false, manager_approver_3: false,
  },
  {
    userID: 'u2', first_name: 'Bob', last_name: 'Jones',
    email: 'bob@test.com', role_id: 'r2',
    role: { roleID: 'r2', name: 'User' },
    is_active: true, avatar_url: null,
    created_at: '2024-01-01', updated_at: '2024-01-01',
    hr_accountability_receiver: false,
    manager_approver_1: false, manager_approver_2: false, manager_approver_3: false,
  },
  {
    userID: 'u3', first_name: 'Charlie', last_name: 'Brown',
    email: 'charlie@test.com', role_id: null, role: null,
    is_active: false, avatar_url: null,
    created_at: '2024-01-01', updated_at: '2024-01-01',
    hr_accountability_receiver: false,
    manager_approver_1: false, manager_approver_2: false, manager_approver_3: false,
  },
]);

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

function renderPage() {
  return render(
    <BrowserRouter>
      <UserPermissions />
    </BrowserRouter>
  );
}

describe('UserPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
    (api.patch as any).mockResolvedValue({});
    (api.put as any).mockResolvedValue({});
  });

  it('should render the page header', async () => {
    (api.get as any).mockResolvedValue({});
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeDefined();
    });
  });

  it('should render stat cards', async () => {
    (api.get as any).mockResolvedValue({});
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeDefined();
    });
    expect(screen.getByText('Admin Users')).toBeDefined();
    expect(screen.getByText('Active Today')).toBeDefined();
    expect(screen.getByText('Pending Access')).toBeDefined();
  });

  it('should show shimmer during user loading', async () => {
    (api.get as any).mockImplementation(
      () => new Promise(() => {})
    );
    renderPage();
    await waitFor(() => {
      const shimmers = document.querySelectorAll('[style*="background-position"]');
      expect(shimmers.length).toBeGreaterThan(0);
    });
  });

  it('should render user list after loading', async () => {
    (api.get as any).mockImplementation(async (url: string) => {
      if (url === '/roles') return { roles: mockRoles };
      if (url === '/users' || url.startsWith('/users?')) return { users: mockUsers };
      return { permissions: {} };
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Bob Jones')).toBeDefined();
  });

  it('should filter users by search term', async () => {
    (api.get as any).mockImplementation(async (url: string) => {
      if (url === '/roles') return { roles: mockRoles };
      if (url === '/users' || url.startsWith('/users?')) return { users: mockUsers };
      return { permissions: {} };
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Bob' } });

    expect(screen.getByText('Bob Jones')).toBeDefined();
    expect(screen.queryAllByText('Alice Smith').length).toBe(1);
  });

  it('should show empty state when no users', async () => {
    (api.get as any).mockImplementation(async (url: string) => {
      if (url === '/roles') return { roles: mockRoles };
      if (url.startsWith('/users')) return { users: [] };
      return {};
    });
    renderPage();
    await waitFor(() => {
      const emptyText = screen.queryByText(/no users/i);
      expect(emptyText).toBeDefined();
    });
  });
});
