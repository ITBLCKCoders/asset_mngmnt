import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useUserApprovers } from '@/hooks/useUserApprovers';

vi.mock('@/lib/api', () => ({
  api: {
    getUserApprovers: vi.fn(),
    getUserEligibleApprovers: vi.fn(),
    setUserApprover: vi.fn(),
    removeUserApprover: vi.fn(),
  },
}));

import { api } from '@/lib/api';

const noDesignated = {
  approvers: { approver: null, sub_approver: null },
};

const noEligible = {
  eligible: { approver: [], sub_approver: [] },
};

describe('useUserApprovers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getUserApprovers as any).mockResolvedValue(noDesignated);
    (api.getUserEligibleApprovers as any).mockResolvedValue(noEligible);
  });

  it('does not fetch when no user is selected', async () => {
    renderHook(() => useUserApprovers(undefined, 'approver'));
    await new Promise(r => setTimeout(r, 0));
    expect(api.getUserApprovers).not.toHaveBeenCalled();
    expect(api.getUserEligibleApprovers).not.toHaveBeenCalled();
  });

  it('requests MA1-eligible approvers when approverListType is "approver"', async () => {
    renderHook(() => useUserApprovers('u1', 'approver'));
    await waitFor(() => {
      expect(api.getUserApprovers).toHaveBeenCalledWith('u1');
    });
    // The user endpoint returns both the approver and sub_approver lists in one call
    expect(api.getUserEligibleApprovers).toHaveBeenCalledTimes(1);
    expect(api.getUserEligibleApprovers).toHaveBeenCalledWith('u1', 'approver');
  });

  it('requests MA3-eligible approvers when approverListType is "ma3"', async () => {
    renderHook(() => useUserApprovers('u1', 'ma3'));
    await waitFor(() => {
      expect(api.getUserEligibleApprovers).toHaveBeenCalledWith('u1', 'ma3');
    });
  });

  it('refetches when the approverListType changes', async () => {
    const { rerender } = renderHook(
      ({ userId, type }) => useUserApprovers(userId, type),
      {
        initialProps: {
          userId: 'u1' as string | undefined,
          type: 'approver' as 'approver' | 'ma3',
        },
      }
    );
    await waitFor(() => {
      expect(api.getUserEligibleApprovers).toHaveBeenCalledWith('u1', 'approver');
    });
    rerender({ userId: 'u1', type: 'ma3' });
    await waitFor(() => {
      expect(api.getUserEligibleApprovers).toHaveBeenCalledWith('u1', 'ma3');
    });
  });

  it('maps the nested eligible response into separate approver/sub_approver lists', async () => {
    (api.getUserEligibleApprovers as any).mockResolvedValue({
      eligible: {
        approver: [
          { userID: 'a1', first_name: 'Ann', last_name: 'A', email: 'a@x.com' },
        ],
        sub_approver: [
          { userID: 's1', first_name: 'Sam', last_name: 'S', email: 's@x.com' },
        ],
      },
    });
    const { result } = renderHook(() => useUserApprovers('u1', 'approver'));
    await waitFor(() => {
      expect(result.current.eligible.approver?.length).toBe(1);
      expect(result.current.eligible.approver?.[0].userID).toBe('a1');
      expect(result.current.eligible.sub_approver?.[0].userID).toBe('s1');
    });
  });

  it('normalizes designated approvers into the approver/sub_approver map', async () => {
    (api.getUserApprovers as any).mockResolvedValue({
      approvers: {
        approver: { user_id: 'a1', first_name: 'Ann', last_name: 'A', email: 'a@x.com' },
        sub_approver: {
          user_id: 's1',
          first_name: 'Sam',
          last_name: 'S',
          email: 's@x.com',
        },
      },
    });
    const { result } = renderHook(() => useUserApprovers('u1', 'approver'));
    await waitFor(() => {
      expect(result.current.designated.approver).toBe('a1');
      expect(result.current.designated.sub_approver).toBe('s1');
    });
  });

  it('saveApprover persists via setUserApprover and updates designated', async () => {
    (api.setUserApprover as any).mockResolvedValue({});
    const { result } = renderHook(() => useUserApprovers('u1', 'approver'));
    await waitFor(() => {
      expect(api.getUserApprovers).toHaveBeenCalled();
    });
    await result.current.saveApprover('approver', 'a2');
    expect(api.setUserApprover).toHaveBeenCalledWith('u1', {
      approverType: 'approver',
      approverUserId: 'a2',
    });
    await waitFor(() => {
      expect(result.current.designated.approver).toBe('a2');
    });
  });
});
