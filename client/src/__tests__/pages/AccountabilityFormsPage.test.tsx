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
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
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
});
