import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockApiGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'issuer-1' }, loading: false }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const { ConfirmationModal } = await import(
  '@/pages/assets/asset-issuance/components/ConfirmationModal'
);

const baseProps = {
  onOpenChange: vi.fn(),
  selectedAssets: ['AST-001'],
  assets: [{ id: 'AST-001', name: 'Laptop X', serialNo: 'SN1', type: 'Laptop' }],
  departments: [],
  locations: [],
  users: [],
  selectedBuilding: '',
  selectedDepartment: '',
  selectedLocation: '',
  selectedRoom: '',
  selectedUser: '',
  assigning: false,
  onConfirm: vi.fn(),
};

describe('ConfirmationModal copy-signer notice', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it('notifies both approver and sub-approver with no dropdown when both are designated', async () => {
    mockApiGet.mockResolvedValue({
      approvers: {
        approver: { user_id: 'a1', first_name: 'Jane', last_name: 'Doe', email: 'j@x.com' },
        sub_approver: { user_id: 's1', first_name: 'John', last_name: 'Smith', email: 's@x.com' },
      },
    });
    render(<ConfirmationModal {...baseProps} isOpen={true} />);

    await waitFor(() =>
      expect(screen.getByText(/will both be notified to sign/i)).toBeDefined()
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    // Confirm is enabled (sign-as-issuer defaults checked, signer present).
    expect(screen.getByRole('button', { name: /Confirm Assignment/i })).toBeDefined();
    expect(
      (screen.getByRole('button', { name: /Confirm Assignment/i }) as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it('blocks confirm with a system-administrator message when no approver is designated', async () => {
    mockApiGet.mockResolvedValue({
      approvers: { approver: null, sub_approver: null },
    });
    render(<ConfirmationModal {...baseProps} isOpen={true} />);

    await waitFor(() =>
      expect(
        screen.getByText(/Please contact your system administrator/i)
      ).toBeDefined()
    );
    expect(
      (screen.getByRole('button', { name: /Confirm Assignment/i }) as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('issues directly without a copy notice for non IT/Admin assets', async () => {
    mockApiGet.mockResolvedValue({
      approvers: { approver: null, sub_approver: null },
    });
    render(
      <ConfirmationModal
        {...baseProps}
        isOpen={true}
        selectedAssets={['DESK-1']}
        assets={[{ id: 'DESK-1', name: 'Office Desk', serialNo: 'SN2', type: 'Office Equipment' }]}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/do not require an IT\/Admin copy signature/i)).toBeDefined()
    );
    expect(
      (screen.getByRole('button', { name: /Confirm Assignment/i }) as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it('requires an IT copy for intangible-only selections (same as tangible)', async () => {
    mockApiGet.mockResolvedValue({
      approvers: {
        approver: { user_id: 'a1', first_name: 'Jane', last_name: 'Doe', email: 'j@x.com' },
        sub_approver: null,
      },
    });
    render(
      <ConfirmationModal
        {...baseProps}
        isOpen={true}
        selectedAssets={['INT-001']}
        assets={[]}
        intangibleAssets={[{ id: 'INT-001', name: 'MS Office License', type: 'IT scope' }]}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Who should sign this accountability form for IT copy\?/i)).toBeDefined()
    );
    expect(screen.queryByText(/do not require an IT\/Admin copy signature/i)).toBeNull();
    expect(
      (screen.getByRole('button', { name: /Confirm Assignment/i }) as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it('requires an Admin copy for admin-scope intangible selections', async () => {
    mockApiGet.mockResolvedValue({
      approvers: {
        approver: { user_id: 'a1', first_name: 'Jane', last_name: 'Doe', email: 'j@x.com' },
        sub_approver: null,
      },
    });
    render(
      <ConfirmationModal
        {...baseProps}
        isOpen={true}
        selectedAssets={['INT-002']}
        assets={[]}
        intangibleAssets={[{ id: 'INT-002', name: 'Building Lease', type: 'Admin scope' }]}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Who should sign this accountability form for Admin copy\?/i)).toBeDefined()
    );
    expect(screen.queryByText(/do not require an IT\/Admin copy signature/i)).toBeNull();
  });
});
