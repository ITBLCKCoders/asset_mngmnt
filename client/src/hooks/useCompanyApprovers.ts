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

export interface DesignatedApprover {
  id: string;
  company_id: string;
  approver_type: 'approver' | 'sub_approver';
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useCompanyApprovers(
  companyId: string | undefined,
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
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [designatedRes, eligibleApproverRes, eligibleSubApproverRes] = await Promise.all([
        api.getCompanyApprovers<{ approvers: DesignatedApprover[] }>(companyId),
        api.getCompanyEligibleApprovers<{ eligible: EligibleApprover[] }>(companyId, approverListType),
        api.getCompanyEligibleApprovers<{ eligible: EligibleApprover[] }>(companyId, 'sub_approver'),
      ]);

      const designatedMap: Record<string, string> = { approver: '', sub_approver: '' };
      designatedRes.approvers?.forEach(a => {
        designatedMap[a.approver_type] = a.user_id;
      });
      setDesignated(designatedMap);
      setEligible({
        approver: eligibleApproverRes.eligible || [],
        sub_approver: eligibleSubApproverRes.eligible || [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch approvers');
    } finally {
      setLoading(false);
    }
  }, [companyId, approverListType]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveApprover = async (approverType: 'approver' | 'sub_approver', userId: string) => {
    if (!companyId) return;
    try {
      await api.setCompanyApprover(companyId, { approverType, userId });
      setDesignated(prev => ({ ...prev, [approverType]: userId }));
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save approver');
      return false;
    }
  };

  const removeApprover = async (approverType: 'approver' | 'sub_approver') => {
    if (!companyId) return;
    try {
      await api.removeCompanyApprover(companyId, approverType);
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