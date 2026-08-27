import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({
    permissions: {},
    roleCustodian: null,
    loading: false,
    hasPermission: vi.fn(() => true),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/auth/SmsOtpDialog', () => ({
  default: vi.fn(() => null),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderPage() {
  return render(
    <BrowserRouter>
      <ReturnRequestsPage />
    </BrowserRouter>
  );
}

describe('ReturnRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue({});
  });

  it('renders the page header title', async () => {
    renderPage();
    expect(screen.getByText('Return Requests')).toBeInTheDocument();
  });

  it('shows content after data loads', async () => {
    renderPage();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('handles API error gracefully', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('shows a View Form button on the processed tab', async () => {
    const processedForm = {
      formID: 'rf-1',
      form_number: 'RF-0001',
      created_at: '2026-01-01T00:00:00Z',
      user_id: 'u1',
      processed_by: 'Processor Name',
      return_type: 'Returned',
      returns: [
        {
          assignment_id: 'a1',
          return_condition: 'Good',
          return_notes: '',
          assignment: {
            assignmentID: 'a1',
            asset: { id: 'ast-1', code: 'AST-001', name: 'Laptop' },
            user: {
              first_name: 'Test',
              last_name: 'User',
              position: 'Staff',
            },
          },
        },
      ],
    };
    vi.mocked(api.get).mockImplementation(
      (async (url: string) => {
        if (String(url).includes('processed-by-me')) {
          return { assetReturnForms: [processedForm] };
        }
        return [];
      }) as any
    );

    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: 'Processed' })
      ).toBeInTheDocument();
    });
    const processedTab = screen.getByRole('tab', { name: 'Processed' });
    fireEvent.mouseDown(processedTab);
    fireEvent.click(processedTab);
    await waitFor(() => {
      expect(screen.getByText('View Form')).toBeInTheDocument();
    });
  });
});