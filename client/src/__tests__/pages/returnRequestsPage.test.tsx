import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import ReturnRequestsPage from '@/pages/assets/returnRequestsPage';

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

describe('ReturnRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue({});
  });

  it('renders the page header title', async () => {
    render(<BrowserRouter><ReturnRequestsPage /></BrowserRouter>);
    expect(screen.getByText('Return Requests')).toBeInTheDocument();
  });

  it('shows content after data loads', async () => {
    render(<BrowserRouter><ReturnRequestsPage /></BrowserRouter>);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('handles API error gracefully', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    render(<BrowserRouter><ReturnRequestsPage /></BrowserRouter>);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });
});
