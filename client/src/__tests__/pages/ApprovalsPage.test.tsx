import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import ApprovalsPage from '@/pages/approvals/ApprovalsPage';

vi.mock('@/lib/pdfGenerator', () => ({
  generateAssetReturnPDF: vi.fn(() => new Blob(['pdf'])),
  generateAssetTransferPDF: vi.fn(() => new Blob(['pdf'])),
  generateAssetChecklistPDF: vi.fn(() => new Blob(['pdf'])),
  generateAssetBorrowingPDF: vi.fn(() => new Blob(['pdf'])),
  downloadPDF: vi.fn(),
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

const mockPermissions = vi.hoisted(() => ({
  roleCustodian: null as {
    managerApprover1?: boolean;
    managerApprover2?: boolean;
  } | null,
}));

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({
    permissions: {},
    roleCustodian: mockPermissions.roleCustodian,
    loading: false,
    hasPermission: vi.fn(() => false),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderPage(initialEntry = '/approvals') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ApprovalsPage />
    </MemoryRouter>
  );
}

describe('ApprovalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
    (api.post as any).mockResolvedValue({});
  });

  it('should render the page header title', async () => {
    (api.get as any).mockResolvedValue({});
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Approvals')).toBeDefined();
    });
  });

  it('should load and show For Approval tab', async () => {
    (api.get as any).mockResolvedValue({ assetReturnForms: [], assetTransferForms: [], checklistBatches: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('For Approval')).toBeDefined();
    });
  });

  it('should handle API error', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Approvals')).toBeDefined();
    });
  });

  it('should deep-link to the Receive Approve tab via ?tab=receive', async () => {
    mockPermissions.roleCustodian = { managerApprover2: true };
    (api.get as any).mockResolvedValue({});
    renderPage('/approvals?tab=receive');
    await waitFor(() => {
      const receiveTrigger = screen.getByRole('tab', {
        name: /receive approve/i,
      });
      expect(receiveTrigger.getAttribute('data-state')).toBe('active');
    });
  });

  it('should fall back to For Approval when ?tab=receive is not permitted', async () => {
    mockPermissions.roleCustodian = null;
    (api.get as any).mockResolvedValue({});
    renderPage('/approvals?tab=receive');
    await waitFor(() => {
      const forApprovalTrigger = screen.getByRole('tab', {
        name: /for approval/i,
      });
      expect(forApprovalTrigger.getAttribute('data-state')).toBe('active');
    });
  });

  it('should not show Approve/Receive buttons when viewing from the Approved tab', async () => {
    mockPermissions.roleCustodian = {
      managerApprover1: true,
      managerApprover2: true,
    };
    const approvedReturnBatch = {
      formID: 'f1',
      form_number: 'RET-001',
      return_batch_id: 'rb1',
      created_at: '2026-01-01T00:00:00Z',
      user_id: 'u1',
      process_signed_at: '2026-01-02T00:00:00Z',
      dept_head_signed_at: '2026-01-03T00:00:00Z',
      it_manager_signed_at: null,
      returns: [
        {
          return_id: 'r1',
          form_id: 'f1',
          form_number: 'RET-001',
          return_batch_id: 'rb1',
          assignment_id: 'a1',
          user_id: 'u1',
          return_condition: 'Good',
          return_notes: '',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          assignment: {
            assignmentID: 'a1',
            asset: {
              id: 'ast1',
              code: 'AST-001',
              name: 'Laptop',
              category_id: 'cat1',
              type_id: 'type1',
            },
            user: {
              id: 'u1',
              first_name: 'Test',
              last_name: 'User',
              email: 'test@test.com',
              employeeNumber: 'EMP001',
              position: 'Staff',
            },
            department: { id: 'd1', name: 'IT' },
            location: null,
            assigned_date: '2025-01-01',
            expected_return_date: null,
            actual_return_date: '2026-01-01',
            assignment_notes: null,
            status: 'returned',
            assigned_by: { id: 'u2', first_name: 'Admin', last_name: 'User' },
          },
        },
      ],
    };
    (api.get as any).mockImplementation(async (url: string) => {
      if (url === '/asset-returns/forms/approved-by-me') {
        return { assetReturnForms: [approvedReturnBatch] };
      }
      if (url === '/asset-returns/forms/pending-approvals') {
        return { assetReturnForms: [] };
      }
      if (url === '/asset-returns/forms/receive-pending-approvals') {
        return { assetReturnForms: [] };
      }
      return {
        assetTransferForms: [],
        checklistBatches: [],
        assetBorrowForms: [],
        success: true,
        data: { borrowRequests: [] },
      };
    });
    renderPage();
    const approvedTab = screen.getByRole('tab', { name: /approved/i });
    fireEvent.mouseDown(approvedTab);
    fireEvent.click(approvedTab);
    const viewButton = await screen.findByRole('button', { name: /view/i });
    fireEvent.click(viewButton);
    await screen.findByRole('button', { name: /download pdf/i });
    expect(screen.queryByRole('button', { name: /^approve$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^receive$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^decline$/i })).toBeNull();
  });

  it('should paginate the For Approval tab 6 per page', async () => {
    mockPermissions.roleCustodian = null;
    const makeReturnBatch = (i: number) => ({
      formID: `f${i}`,
      form_number: `RET-${i}`,
      return_batch_id: `rb${i}`,
      created_at: '2026-01-01T00:00:00Z',
      user_id: 'u1',
      returns: [
        {
          return_id: `r${i}`,
          form_id: `f${i}`,
          form_number: `RET-${i}`,
          return_batch_id: `rb${i}`,
          assignment_id: `a${i}`,
          user_id: 'u1',
          return_condition: 'Good',
          return_notes: '',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          assignment: {
            assignmentID: `a${i}`,
            asset: {
              id: `ast${i}`,
              code: `AST-${i}`,
              name: `Laptop ${i}`,
              category_id: 'cat1',
              type_id: 'type1',
            },
            user: {
              id: 'u1',
              first_name: 'Test',
              last_name: 'User',
              email: 'test@test.com',
              employeeNumber: 'EMP001',
              position: 'Staff',
            },
            department: { id: 'd1', name: 'IT' },
            location: null,
            assigned_date: '2025-01-01',
            expected_return_date: null,
            actual_return_date: null,
            assignment_notes: null,
            status: 'returned',
            assigned_by: { id: 'u2', first_name: 'Admin', last_name: 'User' },
          },
        },
      ],
    });
    const assetReturnForms = Array.from({ length: 7 }, (_, i) =>
      makeReturnBatch(i + 1)
    );
    (api.get as any).mockImplementation(async (url: string) => {
      if (url === '/asset-returns/forms/pending-approvals') {
        return { assetReturnForms };
      }
      return {
        assetReturnForms: [],
        assetTransferForms: [],
        checklistBatches: [],
        success: true,
        data: { borrowRequests: [] },
      };
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/^RET-\d+$/)).toHaveLength(6);
    });
    expect(screen.getByText('Page 1 of 2')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/^RET-\d+$/)).toHaveLength(1);
    });
    expect(screen.getByText('Page 2 of 2')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/^RET-\d+$/)).toHaveLength(6);
    });
  });

  it('should keep a manually selected tab active when ?tab= is present and sync the URL', async () => {
    mockPermissions.roleCustodian = { managerApprover2: true };
    (api.get as any).mockResolvedValue({});
    let currentSearch = '';
    function SearchProbe() {
      const location = useLocation();
      currentSearch = location.search;
      return null;
    }
    render(
      <MemoryRouter initialEntries={['/approvals?tab=receive']}>
        <SearchProbe />
        <ApprovalsPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: /receive approve/i }).getAttribute('data-state')
      ).toBe('active');
    });
    const approvedTabTrigger = screen.getByRole('tab', { name: /approved/i });
    fireEvent.mouseDown(approvedTabTrigger);
    fireEvent.click(approvedTabTrigger);
    // Must stay on Approved (no snap-back to the stale ?tab=receive param)
    // and the URL must follow the selection.
    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: /approved/i }).getAttribute('data-state')
      ).toBe('active');
    });
    expect(
      screen.getByRole('tab', { name: /receive approve/i }).getAttribute('data-state')
    ).not.toBe('active');
    expect(currentSearch).toContain('tab=approved');
  });

  it('should follow back-navigation tab changes via the URL', async () => {
    mockPermissions.roleCustodian = { managerApprover2: true };
    (api.get as any).mockResolvedValue({});
    let goBack: () => void = () => {};
    function NavProbe() {
      const navigate = useNavigate();
      goBack = () => navigate(-1);
      return null;
    }
    render(
      <MemoryRouter
        initialEntries={['/approvals?tab=for-approval', '/approvals?tab=approved']}
        initialIndex={1}
      >
        <NavProbe />
        <ApprovalsPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: /approved/i }).getAttribute('data-state')
      ).toBe('active');
    });
    act(() => {
      goBack();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: /for approval/i }).getAttribute('data-state')
      ).toBe('active');
    });
  });
});
