# Fix remaining dark mode badge issues

## Context

Codebase audit found badges (and 2 avatar fallbacks) using light-only Tailwind
colors (e.g. `bg-gray-100 text-gray-800`) with no `dark:` variants. In dark
mode these render as bright light-gray/colored chips — "broken" appearance.

Established project dark-mode badge patterns (already used elsewhere):
- Gray: `bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200`
- Colored (red): `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200`
- Colored w/ border: `... dark:bg-*-900/30 dark:text-*-200 dark:border-*-800`
- Subtle (bg-*-50): `... dark:bg-*-900/20 dark:text-*-200 dark:border-*-800`

## PLAN

- Step 1: Fix gray "Condition" badges → add `dark:bg-gray-800 dark:text-gray-200`
- Step 2: Fix gray badges in IntangibleAssetViewModal (type badge, disabled count, default status)
- Step 3: Fix red badges in profile (profileHeader "Full-time", basicInfoTab "Overall: Excellent")
- Step 4: Fix indigo badge in documentsTab ("IT Manager Received") + 2 small badge-shaped spans in same file
- Step 5: Fix `getActionBadgeClass()` map in recentActivityTable (affects 3 dashboard badge usages)
- Step 6: Fix timeline status pills in ApprovalsPage (green/blue/slate)
- Step 7: Fix 2 avatar fallbacks (NotificationBell read-state, allCompaniesList logo fallback)
- Step 8: Verify with `npm run test --workspace=client` (badge components appear in existing tests)

## FILES TO MODIFY

### Step 1 — Condition badges (add `dark:bg-gray-800 dark:text-gray-200`)
- `client/src/pages/assets/gatePass.tsx:289`
  `<Badge variant="outline" className="bg-gray-100 text-gray-800">` →
  `<Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">`
- `client/src/pages/assets/assetsReturn.tsx:476` (same change)
- `client/src/pages/assets/assetReturnRequest.tsx:554` (same change)
- `client/src/pages/assets/assetsMaintenance.tsx:484`
  `return { status: 'Not Scheduled', color: 'bg-gray-100 text-gray-800' };` →
  `return { status: 'Not Scheduled', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };`

### Step 2 — IntangibleAssetViewModal gray badges
- `client/src/pages/assets/components/IntangibleAssetViewModal.tsx:86` (default status in `getStatusBadgeClass`)
  `return 'bg-gray-100 text-gray-700 border border-gray-200';` →
  `return 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700';`
- `:226` (asset type badge)
  `className="bg-gray-100 text-gray-700"` →
  `className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"`
- `:369` (disabled forms count)
  `className="bg-gray-100 text-gray-600 border border-gray-200"` →
  `className="bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"`

### Step 3 — Profile red badges
- `client/src/pages/profile/profileComponents/profileHeader.tsx:167`
  `className="bg-red-100 px-3 py-1 font-semibold text-red-700 sm:px-4"` →
  `className="bg-red-100 px-3 py-1 font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-200 sm:px-4"`
- `client/src/pages/profile/profileComponents/tabs/basicInfoTab.tsx:715`
  `className="bg-red-100 text-red-700 text-lg px-6 py-2 font-semibold"` →
  `className="bg-red-100 text-red-700 text-lg px-6 py-2 font-semibold dark:bg-red-900/30 dark:text-red-200"`

### Step 4 — documentsTab indigo badge + spans
- `client/src/pages/profile/profileComponents/tabs/documentsTab.tsx:3063`
  `className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">IT Manager Received` →
  `className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:hover:bg-indigo-900/30">IT Manager Received`
  (matches sibling "Dept Head Approved" pattern at :3060)
- `:947` "Stand-in approver" span:
  `bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700` →
  `bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200`
- `:4115` transfers count span:
  `bg-purple-100 text-purple-800 text-sm px-2 py-1 rounded-full` →
  `bg-purple-100 text-purple-800 text-sm px-2 py-1 rounded-full dark:bg-purple-900/30 dark:text-purple-200`

### Step 5 — recentActivityTable action badges (used at :258, :336, :413)
- `client/src/pages/dashboard/components/recentActivityTable.tsx:151-161` — `getActionBadgeClass()`:
  - create/add:   `border-green-200 bg-green-50 text-green-700` → add `dark:border-green-800 dark:bg-green-900/20 dark:text-green-200`
  - update/edit:  `border-blue-200 bg-blue-50 text-blue-700` → add `dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200`
  - delete/remove:`border-red-200 bg-red-50 text-red-700` → add `dark:border-red-800 dark:bg-red-900/20 dark:text-red-200`
  - assign:       `border-purple-200 bg-purple-50 text-purple-700` → add `dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-200`
  - default:      `border-gray-200 bg-gray-50 text-gray-700` → add `dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200`

### Step 6 — ApprovalsPage timeline pills (:2022-2027)
- `client/src/pages/approvals/ApprovalsPage.tsx`
  - done:     `bg-green-100 text-green-700` → add `dark:bg-green-900/30 dark:text-green-200`
  - current:  `bg-blue-100 text-blue-700` → add `dark:bg-blue-900/30 dark:text-blue-200`
  - default:  `bg-slate-100 text-slate-500` → add `dark:bg-slate-800 dark:text-slate-300`

### Step 7 — Avatar fallbacks
- `client/src/components/NotificationBell.tsx:376`
  `'bg-gray-200 text-gray-700'` (read-state avatar) →
  `'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'`
- `client/src/pages/settings/settingsComponents/settingsTabs/generalTab/components/allCompaniesList.tsx:117`
  `isActive ? 'bg-red-100 text-red-700' : 'bg-muted'` →
  `isActive ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200' : 'bg-muted'`

## EXECUTION

(apply edits when leaving plan mode)

## SUMMARY

- 12 badge instances + 2 badge-shaped spans + 2 avatar fallbacks across 10
  files gain missing `dark:` variants following existing project patterns
- No behavioral changes — className-only edits
- Verified against existing dark-mode patterns in the same files/neighbors
