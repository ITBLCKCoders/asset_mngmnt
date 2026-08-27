import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import BorrowFormsPage from '@/pages/forms/BorrowFormsPage';

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
      <BorrowFormsPage />
    </MemoryRouter>
  );
}

describe('BorrowFormsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
  });

  it('should render the page header title', async () => {
    (api.get as any).mockResolvedValue({ borrowRequests: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Borrow Forms')).toBeDefined();
    });
  });

  it('should load and display borrow forms', async () => {
    (api.get as any).mockImplementation(async (url: string) => {
      if (url === '/asset-borrow-requests') return { borrowRequests: [{ borrow_request_id: 'br1', form_number: 'BF-001', requester_first_name: 'John', requester_last_name: 'Doe', borrow_scope: 'it', items: [] }] };
      if (url === '/companies/active') return { data: [{ id: 'c1', name: 'Company A' }] };
      return {};
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Borrow Forms')).toBeDefined();
    });
  });

  it('should handle API error', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Borrow Forms')).toBeDefined();
    });
  });

  it('should paginate borrow forms 6 per page', async () => {
    const borrowRequests = Array.from({ length: 7 }, (_, i) => ({
      borrow_request_id: `br-${i + 1}`,
      form_number: `BF-${String(i + 1).padStart(3, '0')}`,
      requester_first_name: 'John',
      requester_last_name: 'Doe',
      requester_email: 'j@t.com',
      borrow_scope: 'it',
      created_at: '2024-01-01',
      items: [],
    }));
    (api.get as any).mockImplementation(async (url: string) => {
      if (url === '/asset-borrow-requests') return { borrowRequests };
      if (url === '/companies/active') return { data: [{ id: 'c1', name: 'Company A' }] };
      return {};
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/^BF-\d+$/)).toHaveLength(6);
    });
    expect(screen.getByText('Page 1 of 2')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/^BF-\d+$/)).toHaveLength(1);
    });
    expect(screen.getByText('Page 2 of 2')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/^BF-\d+$/)).toHaveLength(6);
    });
  });
});
