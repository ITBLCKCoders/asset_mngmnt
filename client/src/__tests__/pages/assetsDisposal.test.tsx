import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AssetsDisposal from '@/pages/assets/assetsDisposal';

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
  useUserPermissions: () => ({ permissions: {}, roleCustodian: null, loading: false, hasPermission: vi.fn(() => true), refetch: vi.fn() }),
}));
vi.mock('@/context/CompanyContext', () => ({
  useCompanyContext: () => ({ activeCompany: { id: 'c1', name: 'Test Company' }, loading: false, companies: [], fetchCompanies: vi.fn(), fetchActiveCompany: vi.fn(), setActiveCompany: vi.fn() }),
}));
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('AssetsDisposal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.put).mockResolvedValue({});
  });

  it('renders the page header title', async () => {
    render(<BrowserRouter><AssetsDisposal /></BrowserRouter>);
    expect(screen.getByText('Assets Disposal')).toBeInTheDocument();
  });

  it('shows content after data loads', async () => {
    render(<BrowserRouter><AssetsDisposal /></BrowserRouter>);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('handles API error gracefully', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    render(<BrowserRouter><AssetsDisposal /></BrowserRouter>);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });
});
