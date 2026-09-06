import type { SearchColumnOption } from '@/utils/assetSearchColumns';

export const ALL_FILTER_VALUE = 'all';

export const ACCOUNTABILITY_FILTER_OPTIONS: SearchColumnOption[] = [
  { label: 'All Fields', value: ALL_FILTER_VALUE },
  { label: 'Form Number', value: 'formNumber' },
  { label: 'Employee', value: 'employee' },
  { label: 'Issued By', value: 'issuedBy' },
  { label: 'Asset', value: 'asset' },
  { label: 'Department', value: 'department' },
  { label: 'Company', value: 'company' },
  { label: 'Status', value: 'status' },
];

export const RETURN_FILTER_OPTIONS: SearchColumnOption[] = [
  { label: 'All Fields', value: ALL_FILTER_VALUE },
  { label: 'Form Number', value: 'formNumber' },
  { label: 'Asset', value: 'asset' },
  { label: 'Returner', value: 'returner' },
  { label: 'Issued By', value: 'issuedBy' },
  { label: 'Department', value: 'department' },
  { label: 'Company', value: 'company' },
  { label: 'Notes', value: 'notes' },
];

export const TRANSFER_FILTER_OPTIONS: SearchColumnOption[] = [
  { label: 'All Fields', value: ALL_FILTER_VALUE },
  { label: 'Form Number', value: 'formNumber' },
  { label: 'Asset', value: 'asset' },
  { label: 'From User', value: 'fromUser' },
  { label: 'To User', value: 'toUser' },
  { label: 'Issued By', value: 'issuedBy' },
  { label: 'Department', value: 'department' },
  { label: 'Company', value: 'company' },
];

export const CHECKLIST_FILTER_OPTIONS: SearchColumnOption[] = [
  { label: 'All Fields', value: ALL_FILTER_VALUE },
  { label: 'Form Number', value: 'formNumber' },
  { label: 'Employee', value: 'employee' },
  { label: 'Issued By', value: 'issuedBy' },
  { label: 'Asset', value: 'asset' },
  { label: 'Department', value: 'department' },
  { label: 'Company', value: 'company' },
  { label: 'Type', value: 'type' },
  { label: 'Reviewed / Checked By', value: 'receivedBy' },
];

export const BORROW_FILTER_OPTIONS: SearchColumnOption[] = [
  { label: 'All Fields', value: ALL_FILTER_VALUE },
  { label: 'Form Number', value: 'formNumber' },
  { label: 'Asset', value: 'asset' },
  { label: 'Requester', value: 'requester' },
  { label: 'Issued By', value: 'issuedBy' },
  { label: 'Department', value: 'department' },
  { label: 'Purpose', value: 'purpose' },
];

export const APPROVAL_FILTER_OPTIONS: SearchColumnOption[] = [
  { label: 'All Fields', value: ALL_FILTER_VALUE },
  { label: 'Form Number', value: 'formNumber' },
  { label: 'Asset', value: 'asset' },
  { label: 'Requester / Employee', value: 'requester' },
  { label: 'Issued By', value: 'issuedBy' },
  { label: 'Department', value: 'department' },
];

/**
 * Normalise selected values: if includes 'all' or empty, treat as all.
 * If user checks specific fields, remove 'all'.
 */
export function normaliseSelectedFilters(selected: string[]): string[] {
  if (selected.length === 0) return [ALL_FILTER_VALUE];
  if (selected.includes(ALL_FILTER_VALUE) && selected.length > 1) {
    // If user checked All after specifics, prefer All
    const withoutAll = selected.filter(v => v !== ALL_FILTER_VALUE);
    // If toggle logic already handled, keep as-is. Fallback: All wins
    if (selected[selected.length - 1] === ALL_FILTER_VALUE) return [ALL_FILTER_VALUE];
    return withoutAll;
  }
  return selected;
}
