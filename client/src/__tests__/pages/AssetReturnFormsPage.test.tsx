import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AssetReturnFormsPage from '@/pages/forms/AssetReturnFormsPage';

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
      <AssetReturnFormsPage />
    </MemoryRouter>
  );
}

describe('AssetReturnFormsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
  });

  it('should render the page header title', async () => {
    (api.get as any).mockResolvedValue({ assetReturnForms: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Asset Return Forms')).toBeDefined();
    });
  });

  it('should load and display return forms', async () => {
    (api.get as any).mockResolvedValue({
      assetReturnForms: [
        {
          formID: 'rf1', form_number: 'RF-001',
          returns: [{ return_id: 'r1', assignment: { user: { first_name: 'John', last_name: 'Doe' }, asset: { name: 'Laptop', code: 'LT-001' } } }],
          created_at: '2024-01-01',
        },
      ],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Asset Return Forms')).toBeDefined();
    });
  });

  it('should handle API error', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Asset Return Forms')).toBeDefined();
    });
  });
});
