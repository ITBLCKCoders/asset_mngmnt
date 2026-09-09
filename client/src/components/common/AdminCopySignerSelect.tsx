'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Minimal asset shape used to detect whether the IT/Admin copy signature
 * applies. Mirrors the fields available on asset assignments (return /
 * transfer asset rows) plus the richer issuance rows.
 */
export interface AdminCopySignerAsset {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  category?: string;
  department?: string;
  categoryDepartment?: string;
  departmentName?: string;
}

interface ApproverOption {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ApproversResponse {
  approvers?: {
    approver?: ApproverOption | null;
    sub_approver?: ApproverOption | null;
  };
}

interface AdminCopySignerSelectProps {
  assets: AdminCopySignerAsset[];
  /** The acting user (issuer/processor) whose designated approvers are notified. */
  actorUserId: string;
  /**
   * Reports the primary signer user id (approver ?? sub-approver, legacy
   * fallback only — the server notifies BOTH) and whether a signer is
   * required. When a signer is required but none is designated, signerId is
   * null so parents stay blocked.
   */
  onChange: (signerId: string | null, requiresSigner: boolean) => void;
  disabled?: boolean;
}

function detectItAsset(asset: AdminCopySignerAsset): boolean {
  const dept = (
    asset.department ||
    asset.categoryDepartment ||
    asset.departmentName ||
    ''
  ).toLowerCase();
  const t = (asset.type || '').toLowerCase();
  const c = (asset.category || '').toLowerCase();
  const n = (asset.name || '').toLowerCase();
  const code = (asset.id || '').toLowerCase();

  return (
    dept.includes('it') ||
    dept.includes('information technology') ||
    t.includes('it') ||
    c.includes('it') ||
    t.includes('computer') ||
    c.includes('computer') ||
    t.includes('laptop') ||
    c.includes('laptop') ||
    t.includes('server') ||
    c.includes('server') ||
    t.includes('cpu') ||
    c.includes('cpu') ||
    code.includes('cpu') ||
    t.includes('desktop') ||
    c.includes('desktop') ||
    t.includes('hardware') ||
    c.includes('hardware') ||
    t.includes('workstation') ||
    c.includes('workstation') ||
    t.includes('monitor') ||
    c.includes('monitor') ||
    n.includes('cpu') ||
    n.includes('computer') ||
    n.includes('laptop')
  );
}

function detectAdminAsset(asset: AdminCopySignerAsset): boolean {
  const dept = (
    asset.department ||
    asset.categoryDepartment ||
    asset.departmentName ||
    ''
  ).toLowerCase();
  const t = (asset.type || '').toLowerCase();
  const c = (asset.category || '').toLowerCase();

  return (
    dept.includes('admin') ||
    dept.includes('administration') ||
    t.includes('admin') ||
    c.includes('admin') ||
    t.includes('administration') ||
    c.includes('administration')
  );
}

export function AdminCopySignerSelect({
  assets,
  actorUserId,
  onChange,
  disabled = false,
}: AdminCopySignerSelectProps) {
  const [approvers, setApprovers] = useState<{
    approver: ApproverOption | null;
    subApprover: ApproverOption | null;
  }>({ approver: null, subApprover: null });
  const [approversLoading, setApproversLoading] = useState(false);

  // Keep the latest onChange in a ref so the reporting effect stays stable
  // (parents pass inline callbacks that change identity every render).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const hasItAsset = assets.some(detectItAsset);
  const hasAdminAsset = assets.some(detectAdminAsset);
  const hasCopyScope = hasItAsset || hasAdminAsset;
  const copyType: 'IT' | 'Admin' | null = hasItAsset
    ? 'IT'
    : hasAdminAsset
      ? 'Admin'
      : null;

  const dropdownLabel =
    copyType === 'IT'
      ? 'Who should sign this accountability form for IT copy?'
      : copyType === 'Admin'
        ? 'Who should sign this accountability form for Admin copy?'
        : 'Who should sign this accountability form for the copy?';

  useEffect(() => {
    if (disabled) {
      return () => {};
    }
    let cancelled = false;
    setApproversLoading(true);
    const load = async () => {
      try {
        const response = await api.get<ApproversResponse>(
          `/users/${actorUserId}/approvers`
        );
        if (cancelled) return;
        const data = response?.approvers;
        setApprovers({
          approver: data?.approver ?? null,
          subApprover: data?.sub_approver ?? null,
        });
      } catch {
        if (cancelled) return;
        toast.error('Failed to load approver options');
        setApprovers({ approver: null, subApprover: null });
      } finally {
        if (!cancelled) setApproversLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [actorUserId, disabled]);

  // Report the primary signer to the parent whenever the scope or approver
  // options change. Both designated approver and sub-approver are notified
  // server-side (first to sign wins); the primary id is a legacy fallback.
  useEffect(() => {
    if (!hasCopyScope) {
      onChangeRef.current(null, false);
      return;
    }
    onChangeRef.current(
      approvers.approver?.user_id ?? approvers.subApprover?.user_id ?? null,
      true
    );
  }, [hasCopyScope, approvers.approver?.user_id, approvers.subApprover?.user_id]);

  const signerNames: string[] = [];
  if (approvers.approver) {
    signerNames.push(
      `Approver: ${approvers.approver.first_name} ${approvers.approver.last_name}`
    );
  }
  if (approvers.subApprover) {
    signerNames.push(
      `Sub-approver: ${approvers.subApprover.first_name} ${approvers.subApprover.last_name}`
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 space-y-2">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-900">
          {dropdownLabel}
        </label>
        {!hasCopyScope ? (
          <p className="text-xs text-slate-600">
            The assets in this batch do not require an IT/Admin copy signature;
            the accountability form will be issued directly following the
            selected workflow.
          </p>
        ) : approversLoading ? (
          <p className="text-sm text-slate-500">Loading approvers…</p>
        ) : !approvers.approver && !approvers.subApprover ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-600">
              No approver or sub-approver found for your account. Please contact
              your system administrator.
            </p>
          </div>
        ) : signerNames.length > 1 ? (
          <p className="text-xs text-slate-500">
            {signerNames.join(' and ')} will both be notified to sign the{' '}
            {copyType === 'IT'
              ? 'IT'
              : copyType === 'Admin'
                ? 'Admin'
                : ''}{' '}
            copy. Whoever signs first completes this step, and it will be
            removed from the other.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            {signerNames[0]} will be notified to sign the{' '}
            {copyType === 'IT'
              ? 'IT'
              : copyType === 'Admin'
                ? 'Admin'
                : ''}{' '}
            copy.
          </p>
        )}
      </div>
    </div>
  );
}