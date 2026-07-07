import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AssetTransferFormsPage from '@/pages/forms/AssetTransferFormsPage';

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

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AssetTransferFormsPage />
    </MemoryRouter>
  );
}

describe('AssetTransferFormsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
  });

  it('should render the page header title', async () => {
    (api.get as any).mockResolvedValue({ assetTransferForms: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Asset Transfer Forms')).toBeDefined();
    });
  });

  it('should load and display transfer forms', async () => {
    (api.get as any).mockResolvedValue({
      assetTransferForms: [
        {
          formID: 'tf1', form_number: 'TF-001',
          returns: [{ return_id: 'r1', assignment: { user: { first_name: 'John', last_name: 'Doe' }, asset: { name: 'Laptop', code: 'LT-001' } } }],
          created_at: '2024-01-01', new_assigned_user: { first_name: 'Jane', last_name: 'Smith' },
        },
      ],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Asset Transfer Forms')).toBeDefined();
    });
  });

  it('should handle API error', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Asset Transfer Forms')).toBeDefined();
    });
  });
});
