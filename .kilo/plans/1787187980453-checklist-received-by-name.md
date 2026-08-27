# Plan: Show Creator Name Above Position in Checklist "Received By" Sections

## Goal
Display both the checklist creator's name and the `received_by` position text in every checklist form card's "Received By" section. Currently only the position text is shown.

## Decision
Use the already-available `creator_name` field (joined from the `users` table in repository queries) as the user's name. The checklist creator is the person who set the `received_by` position and is effectively the receiver in the current flow. No database schema changes are required.

## Files to Modify

### 1. `client/src/pages/approvals/ChecklistApprovalCard.tsx`
- In the "Received by" section (around line 137), change from:
  ```tsx
  <p className="text-sm text-gray-600">Received by: {firstChecklist.received_by}</p>
  ```
  to:
  ```tsx
  <p className="font-medium text-sm">{firstChecklist.creator_name || '—'}</p>
  {firstChecklist.received_by && (
    <p className="text-xs text-gray-500">{firstChecklist.received_by}</p>
  )}
  ```

### 2. `client/src/pages/forms/AssetChecklistFormsPage.tsx`
- In the "Received by" section (around line 481), change from:
  ```tsx
  <p className="text-sm text-gray-600">
    Received by: {row.received_by}
  </p>
  ```
  to:
  ```tsx
  <p className="font-medium text-sm">{row.creator_name || '—'}</p>
  {row.received_by && (
    <p className="text-xs text-gray-500">{row.received_by}</p>
  )}
  ```

### 3. `client/src/pages/profile/profileComponents/tabs/documentsTab.tsx`
- In the checklist forms section (around line 4124), change from:
  ```tsx
  <p className="text-sm text-gray-600">
    Received by: {row.received_by}
  </p>
  ```
  to:
  ```tsx
  <p className="font-medium text-sm">{row.creator_name || '—'}</p>
  {row.received_by && (
    <p className="text-xs text-gray-500">{row.received_by}</p>
  )}
  ```

### 4. `client/src/pages/assets/accountability/accountabilityForm.tsx`
- In the checklist "Received By" block (around line 1449), change from:
  ```tsx
  <p className="mt-1 font-medium text-slate-900">
    {checklist.received_by || 'N/A'}
  </p>
  ```
  to:
  ```tsx
  <p className="mt-1 font-medium text-slate-900">
    {checklist.creator_name || '—'}
  </p>
  {checklist.received_by && (
    <p className="text-xs text-gray-500">{checklist.received_by}</p>
  )}
  ```

### 5. `client/src/lib/pdfGenerator/assetChecklistPdf.ts`
- In the PDF header/body (around line 171), update the "Received by" row to include the creator name above the position:
  ```tsx
  // Add a new row or update existing to show both name and position
  [
    { content: 'Received by:', styles: { bold: true } },
    { content: checklistData.received_by || '—' }
  ],
  // Optionally add creator name if available
  ```

## Validation
- Run client tests: `npm run test --workspace=client`
- Manually verify in the UI that checklist cards show the creator's name above the position
- Verify PDF output includes both name and position

## Open Questions
- None — user confirmed to use `creator_name` as the name source.
