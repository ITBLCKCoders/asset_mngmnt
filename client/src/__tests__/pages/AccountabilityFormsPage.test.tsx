import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AccountabilityFormsPage from '@/pages/forms/AccountabilityFormsPage';

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
});
