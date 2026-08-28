import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AccountabilityFormsPage from '@/pages/forms/AccountabilityFormsPage';

vi.mock('@/pages/assets/accountability/accountabilityForm', () => ({
  AccountabilityFormCard: ({ form }: { form: { id: string } }) => (
    <div data-testid="af-card">{form.id}</div>
  ),
  AccountabilityFormDetail: () => null,
}));

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

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountabilityFormsPage />
    </MemoryRouter>
  );
}

describe('AccountabilityFormsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (mockUser.role as any).asset_type;
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
  });

  const makeForm = (id: string, formNumber: string, categoryDepartment: string) => ({
    id,
    formNumber,
    assets: [{ id: `${id}-asset`, categoryDepartment }],
    assignmentIds: [],
    status: 'Pending',
    created_at: '2024-01-01',
    user: {
      id: 'u1', first_name: 'John', last_name: 'Doe', email: 'j@t.com',
      company: { id: 'c1', name: 'Acme' }, department: { id: 'd1', name: 'IT' },
    },
    department: { id: 'd1', name: 'IT' },
    assignment: { id: `${id}-assignment`, assigned_date: '2024-01-01', assigned_by: null },
  });

  it('should render the page header title', async () => {
    (api.get as any).mockResolvedValue({ forms: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Accountability Forms')).toBeDefined();
    });
  });

  it('should load and display forms', async () => {
    (api.get as any).mockResolvedValue({ forms: [] });
    renderPage();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/accountability-forms');
    });
  });

  it('should handle API error', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Accountability Forms')).toBeDefined();
    });
  });

  it('should sort forms by last 4 digits descending (largest first)', async () => {
    const forms = [
      { id: 'low', formNumber: '005-108-1021-062026-0003', assets: [], assignmentIds: [], status: 'Pending', created_at: '2024-01-01', user: { id: 'u1', first_name: 'John', last_name: 'Doe', email: 'j@t.com', company: { id: 'c1', name: 'Acme' }, department: { id: 'd1', name: 'IT' } }, department: { id: 'd1', name: 'IT' }, assignment: { id: 'a1', assigned_date: '2024-01-01', assigned_by: null } },
      { id: 'mid', formNumber: '005-108-1021-062026-0008', assets: [], assignmentIds: [], status: 'Pending', created_at: '2024-01-02', user: { id: 'u2', first_name: 'Jane', last_name: 'Doe', email: 'j2@t.com', company: { id: 'c1', name: 'Acme' }, department: { id: 'd1', name: 'IT' } }, department: { id: 'd1', name: 'IT' }, assignment: { id: 'a2', assigned_date: '2024-01-02', assigned_by: null } },
      { id: 'high', formNumber: '005-108-1021-062026-0034', assets: [], assignmentIds: [], status: 'Pending', created_at: '2024-01-03', user: { id: 'u3', first_name: 'Jim', last_name: 'Doe', email: 'j3@t.com', company: { id: 'c1', name: 'Acme' }, department: { id: 'd1', name: 'IT' } }, department: { id: 'd1', name: 'IT' }, assignment: { id: 'a3', assigned_date: '2024-01-03', assigned_by: null } },
    ];
    (api.get as any).mockResolvedValue({ forms });
    renderPage();
    await waitFor(() => {
      const cards = screen.getAllByTestId('af-card');
      expect(cards).toHaveLength(3);
      expect(cards[0].textContent).toBe('high');
      expect(cards[1].textContent).toBe('mid');
      expect(cards[2].textContent).toBe('low');
    });
  });

  it('should paginate forms 6 per page', async () => {
    const forms = Array.from({ length: 7 }, (_, i) => ({
      id: `form-${i + 1}`,
      formNumber: `AF-${i + 1}`,
      assets: [],
      assignmentIds: [],
      user: {
        id: `u${i}`,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        company: { id: 'c1', name: 'Acme' },
        department: { id: 'd1', name: 'IT' },
      },
      assignment: {
        id: `a${i}`,
        assigned_date: '2024-01-01',
        assigned_by: null,
      },
      department: { id: 'd1', name: 'IT' },
      status: 'Pending',
      created_at: '2024-01-01',
    }));
    (api.get as any).mockResolvedValue({ forms });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId('af-card')).toHaveLength(6);
    });
    expect(screen.getByText('Page 1 of 2')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getAllByTestId('af-card')).toHaveLength(1);
    });
    expect(screen.getByText('Page 2 of 2')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    await waitFor(() => {
      expect(screen.getAllByTestId('af-card')).toHaveLength(6);
    });
  });

  it('shows IT and Admin toggle buttons for unscoped roles', async () => {
    (api.get as any).mockResolvedValue({ forms: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All Assets' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'IT Assets' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Admin Assets' })).toBeDefined();
    });
  });

  it('hides toggle and shows only IT forms for an IT-scoped role', async () => {
    (mockUser.role as any).asset_type = 'it';
    (api.get as any).mockResolvedValue({
      forms: [makeForm('it-form', 'AF-1', 'IT'), makeForm('admin-form', 'AF-2', 'Admin')],
    });
    renderPage();
    await waitFor(() => {
      const cards = screen.getAllByTestId('af-card');
      expect(cards).toHaveLength(1);
      expect(cards[0].textContent).toBe('it-form');
    });
    expect(screen.queryByRole('button', { name: 'All Assets' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'IT Assets' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Admin Assets' })).toBeNull();
  });

  it('hides toggle and shows only admin forms for an Admin-scoped role', async () => {
    (mockUser.role as any).asset_type = 'admin';
    (api.get as any).mockResolvedValue({
      forms: [makeForm('it-form', 'AF-1', 'IT'), makeForm('admin-form', 'AF-2', 'Admin')],
    });
    renderPage();
    await waitFor(() => {
      const cards = screen.getAllByTestId('af-card');
      expect(cards).toHaveLength(1);
      expect(cards[0].textContent).toBe('admin-form');
    });
    expect(screen.queryByRole('button', { name: 'All Assets' })).toBeNull();
  });
});
