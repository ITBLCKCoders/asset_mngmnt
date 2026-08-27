# Plan: Intangible Asset Detail Modal on Row Click

## Goal
When a user clicks a row in the Intangible Assets tab of the Asset List page, open a modal showing all intangible asset details, assigned-to information, and associated accountability forms with PDF preview.

## Current State
- Intangible Assets tab already exists in `AssetsPage.tsx` with a `DataTable`
- `IntangibleAssetDialog.tsx` handles create/edit only (not detail viewing)
- The table row already contains all intangible asset data from `sp_GetAllIntangibleAssets` (name, description, remarks, type, status, assignees, dates, creator/updater names)
- `GET /api/accountability-forms/asset/:id` exists and uses `LIKE` on `assets_data`, which matches intangible asset UUIDs stored in form JSON
- `AssetViewModal.tsx` and `AssetFormsTab.tsx` provide the pattern for detail views + form listing with PDF preview

## Proposed Changes

### 1. Create `client/src/pages/assets/components/IntangibleAssetViewModal.tsx`
New modal component that displays:
- **Header**: Asset name + status badge
- **Details section**: Name, description, remarks, type, status, date created, date updated, created by, updated by
- **Assigned To section**: List of assignees (name, email, assigned date) or "Not assigned" fallback
- **Accountability Forms section**: Fetched via `GET /api/accountability-forms/asset/:id`; shows form number, status, assigned user, department, created date; each form has a "View PDF" button that generates and previews the PDF

PDF preview pattern:
- Dispatch `openPdfPreview` custom event (same as `AssetFormsTab`)
- Call `GET /api/accountability-forms/:formId` for full form data
- Call `generateAccountabilityFormPDF(fullForm)` to produce blob
- Create object URL and dispatch event

### 2. Modify `client/src/pages/assets/assets-list/AssetsPage.tsx`
- **Fix Edit button propagation**: Add `e.stopPropagation()` to the Edit button in `intangibleAssetColumns` so clicking Edit does not also trigger row-click (matches tangible asset table pattern)
- **Add state**:
  - `selectedIntangibleAsset` (stores the clicked row's `original` data)
  - `isIntangibleViewModalOpen` (boolean)
- **Add handler**:
  - `handleIntangibleRowClick`: sets selected asset and opens modal
- **Wire up DataTable**: Pass `onRowClick={handleIntangibleRowClick}` to the intangible assets `DataTable`
- **Render modal**: Add `<IntangibleAssetViewModal isOpen={...} onClose={...} asset={selectedIntangibleAsset} />` alongside other modals

### 3. Backend
- **No new endpoints required**. The list response already contains all detail fields, and `GET /api/accountability-forms/asset/:id` already supports intangible assets via the `assets_data LIKE` query.

## Files to Modify
- `client/src/pages/assets/components/IntangibleAssetViewModal.tsx` (new)
- `client/src/pages/assets/assets-list/AssetsPage.tsx`

## Validation
- Run `npm run test --workspace=client` for client-side tests
- Run `npm run test:unit --workspace=server` for server-side tests (no changes expected, but verify nothing is broken)
- Manual verification: open Intangible Assets tab, click a row, confirm modal shows details + forms

## Risks & Notes
- The `Edit` button in the intangible table currently does not stop propagation; clicking it will also trigger the new row-click handler. This must be fixed as part of this change.
- The `GET /api/accountability-forms/asset/:id` endpoint uses substring `LIKE` on `assets_data`. UUID collision via substring is practically impossible.
- If an intangible asset has no associated forms, the modal should show an empty state rather than an error.
