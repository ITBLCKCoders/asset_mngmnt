import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useCompanyApprovers } from '@/hooks/useCompanyApprovers';

vi.mock('@/lib/api', () => ({
  api: {
    getCompanyApprovers: vi.fn(),
    getCompanyEligibleApprovers: vi.fn(),
    setCompanyApprover: vi.fn(),
    removeCompanyApprover: vi.fn(),
  },
}));

import { api } from '@/lib/api';

describe('useCompanyApprovers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getCompanyApprovers as any).mockResolvedValue({ approvers: [] });
    (api.getCompanyEligibleApprovers as any).mockResolvedValue({ eligible: [] });
  });

  it('does not fetch when no company is selected', async () => {
    renderHook(() => useCompanyApprovers(undefined, 'approver'));
    await new Promise(r => setTimeout(r, 0));
    expect(api.getCompanyApprovers).not.toHaveBeenCalled();
    expect(api.getCompanyEligibleApprovers).not.toHaveBeenCalled();
  });

  it('requests MA1-eligible approvers when approverListType is "approver"', async () => {
    renderHook(() => useCompanyApprovers('c1', 'approver'));
    await waitFor(() => {
      expect(api.getCompanyEligibleApprovers).toHaveBeenCalled();
    });
    // Approver list uses MA1 (the approverListType), sub list always Sub1.
    expect(api.getCompanyEligibleApprovers).toHaveBeenCalledWith('c1', 'approver');
    expect(api.getCompanyEligibleApprovers).toHaveBeenCalledWith('c1', 'sub_approver');
  });

  it('requests MA3-eligible approvers when approverListType is "ma3"', async () => {
    renderHook(() => useCompanyApprovers('c1', 'ma3'));
    await waitFor(() => {
      expect(api.getCompanyEligibleApprovers).toHaveBeenCalled();
    });
    expect(api.getCompanyEligibleApprovers).toHaveBeenCalledWith('c1', 'ma3');
    expect(api.getCompanyEligibleApprovers).toHaveBeenCalledWith('c1', 'sub_approver');
  });

  it('refetches when the approverListType changes', async () => {
    const { rerender } = renderHook(
      ({ companyId, type }) => useCompanyApprovers(companyId, type),
      { initialProps: { companyId: 'c1' as string | undefined, type: 'approver' as 'approver' | 'ma3' } }
    );
    await waitFor(() => {
      expect(api.getCompanyEligibleApprovers).toHaveBeenCalledWith('c1', 'approver');
    });
    rerender({ companyId: 'c1', type: 'ma3' });
    await waitFor(() => {
      expect(api.getCompanyEligibleApprovers).toHaveBeenCalledWith('c1', 'ma3');
    });
  });
});