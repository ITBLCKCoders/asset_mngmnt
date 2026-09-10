/**
 * User-facing status for asset transfer forms (My Transfer Requests, etc.).
 * `executed_at` may be missing from older SP payloads; then we infer from transfer records.
 */
export type TransferFormUiStatus =
  | 'pending'
  | 'approved'
  | 'awaiting-return'
  | 'completed'
  | 'declined';

type TransferFormLike = {
  executed_at?: string | null;
  declined_at?: string | null;
  dept_head_signed_at?: string | null;
  sub_approver_1_signed_at?: string | null;
  return_form_id?: string | null;
  returns?: Array<{ return_id?: string | null }>;
};

function hasExecutedTransferRecords(batch: TransferFormLike): boolean {
  const returns = batch.returns;
  if (!Array.isArray(returns) || returns.length === 0) return false;
  return returns.every(
    r =>
      r?.return_id != null && String(r.return_id).trim() !== ''
  );
}

export function getTransferFormUiStatus(
  batch: TransferFormLike
): TransferFormUiStatus {
  if (batch.declined_at) return 'declined';
  if (batch.executed_at || hasExecutedTransferRecords(batch)) {
    return 'completed';
  }
  if (batch.dept_head_signed_at || batch.sub_approver_1_signed_at) {
    // Staged flow: an approved transfer with no linked return is waiting for
    // the requestor to click Generate Return Form. Payloads that do not carry
    // return_form_id (older SP shapes) keep the legacy 'approved' label.
    if (
      'return_form_id' in batch &&
      (batch as TransferFormLike).return_form_id == null
    )
      return 'awaiting-return';
    return 'approved';
  }
  return 'pending';
}

/** Display label: executed transfers show as "Transferred", not "Completed". */
export function formatTransferFormUiStatus(
  status: TransferFormUiStatus
): string {
  if (status === 'declined') return 'Declined';
  if (status === 'completed') return 'Transferred';
  if (status === 'awaiting-return') return 'Awaiting Return Form';
  return status.charAt(0).toUpperCase() + status.slice(1);
}
