import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface EligibleApprover {
  userID: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id?: string | null;
  department_name?: string | null;
}

export interface DesignatedUserApprover {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface UserDesignatedApprovers {
  approver: DesignatedUserApprover | null;
  sub_approver: DesignatedUserApprover | null;
}

/**
 * Per-user designated approvers (user_approvers table).
 *
 * Mirrors the shape of `useCompanyApprovers` so callers can swap without
 * touching the UI: `designated`, `eligible`, `loading`, `error`,
 * `saveApprover`, `removeApprover`, `refresh`.
 */
export function useUserApprovers(
  userId: string | undefined,
  approverListType: 'approver' | 'ma3' = 'approver'
) {
  const [designated, setDesignated] = useState<Record<string, string>>({
    approver: '',
    sub_approver: '',
  });
  const [eligible, setEligible] = useState<Record<string, EligibleApprover[]>>({
    approver: [],
    sub_approver: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [designatedRes, eligibleRes] = await Promise.all([
        api.getUserApprovers<{ approvers: UserDesignatedApprovers }>(userId),
        api.getUserEligibleApprovers<{
          eligible: {
            approver: EligibleApprover[];
            sub_approver: EligibleApprover[];
          };
        }>(userId, approverListType),
      ]);

      setDesignated({
        approver: designatedRes.approvers?.approver?.user_id ?? '',
        sub_approver: designatedRes.approvers?.sub_approver?.user_id ?? '',
      });
      // The user eligible-endpoint returns both lists in one response:
      // { eligible: { approver: [...], sub_approver: [...] } }
      setEligible({
        approver: eligibleRes.eligible?.approver || [],
        sub_approver: eligibleRes.eligible?.sub_approver || [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch approvers');
    } finally {
      setLoading(false);
    }
  }, [userId, approverListType]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveApprover = async (
    approverType: 'approver' | 'sub_approver',
    approverUserId: string
  ) => {
    if (!userId) return false;
    try {
      await api.setUserApprover(userId, { approverType, approverUserId });
      setDesignated(prev => ({ ...prev, [approverType]: approverUserId }));
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save approver');
      return false;
    }
  };

  const removeApprover = async (approverType: 'approver' | 'sub_approver') => {
    if (!userId) return false;
    try {
      await api.removeUserApprover(userId, approverType);
      setDesignated(prev => ({ ...prev, [approverType]: '' }));
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to remove approver');
      return false;
    }
  };

  return {
    designated,
    eligible,
    loading,
    error,
    saveApprover,
    removeApprover,
    refresh: fetchAll,
  };
}