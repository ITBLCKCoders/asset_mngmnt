import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockApiGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

const AdminCopySignerSelect = (
  await import('@/components/common/AdminCopySignerSelect')
).AdminCopySignerSelect;

describe('AdminCopySignerSelect', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it('reports the primary signer when an IT asset is present and notifies both', async () => {
    mockApiGet.mockResolvedValue({
      approvers: {
        approver: {
          user_id: 'approver-1',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
        },
        sub_approver: {
          user_id: 'sub-1',
          first_name: 'John',
          last_name: 'Smith',
          email: 'john@example.com',
        },
      },
    });
    const onChange = vi.fn();
    render(
      <AdminCopySignerSelect
        assets={[{ name: 'Laptop X', type: 'Laptop', category: 'Computer' }]}
        actorUserId="actor-1"
        onChange={onChange}
      />
    );

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith('approver-1', true)
    );
    expect(
      screen.getByText(/Who should sign this accountability form for IT copy/i)
    ).toBeDefined();
    // No dropdown — both signers are shown in an info banner.
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(
      screen.getByText(/will both be notified to sign/i)
    ).toBeDefined();
  });

  it('does not require a signer for non IT/Admin assets', async () => {
    mockApiGet.mockResolvedValue({ approvers: { approver: null, sub_approver: null } });
    const onChange = vi.fn();
    render(
      <AdminCopySignerSelect
        assets={[{ name: 'Office Desk', type: 'Office Equipment', category: 'Office Equipment' }]}
        actorUserId="actor-1"
        onChange={onChange}
      />
    );

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null, false));
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('shows a system-administrator warning when the actor has no designated approvers', async () => {
    mockApiGet.mockResolvedValue({ approvers: { approver: null, sub_approver: null } });
    const onChange = vi.fn();
    render(
      <AdminCopySignerSelect
        assets={[{ name: 'Production Server', type: 'Server' }]}
        actorUserId="actor-1"
        onChange={onChange}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Please contact your system administrator/i)).toBeDefined()
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null, true));
  });
});
