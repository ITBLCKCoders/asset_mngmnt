# Add Company Name to Intangible Assets Export Filename

## Context

In `client/src/pages/assets/assets-list/AssetsPage.tsx`, the intangible assets tab has two export handlers:
- `handleIntangibleExportExcel` — saves as `intangible-assets-<date>.xlsx`
- `handleIntangibleExportPdf` — saves as `intangible-assets-<date>.pdf`

The regular asset list export already prefixes its filename with the company name:
```ts
`${activeCompany.name}_asset_list.pdf`
```
(from `useAssetExport.ts`)

The intangible asset export should follow the same convention.

## Goal

Prefix the intangible asset export filename with `activeCompany?.name` when available, following the same `_`-separated convention used by the regular asset export.

## Files to Modify

- `client/src/pages/assets/assets-list/AssetsPage.tsx`

## Changes

### Excel export — `handleIntangibleExportExcel` (approx. line 1146)

Current:
```ts
a.download = `intangible-assets-${now.toISOString().slice(0, 10)}.xlsx`;
```

Replace with:
```ts
const dateStr = now.toISOString().slice(0, 10);
const companyName = activeCompany?.name || '';
const prefix = companyName ? `${companyName}_` : '';
a.download = `${prefix}intangible-assets-${dateStr}.xlsx`;
```

### PDF export — `handleIntangibleExportPdf` (approx. line 1227)

Current:
```ts
doc.save(`intangible-assets-${now.toISOString().slice(0, 10)}.pdf`);
```

Replace with:
```ts
const dateStr = now.toISOString().slice(0, 10);
const companyName = activeCompany?.name || '';
const prefix = companyName ? `${companyName}_` : '';
doc.save(`${prefix}intangible-assets-${dateStr}.pdf`);
```

## Behavior / Edge Cases

| `activeCompany?.name` | Result filename (Excel/PDF) |
|---|---|
| `"Acme Corp"` | `Acme Corp_intangible-assets-2026-07-30.xlsx` / `.pdf` |
| `null` / `undefined` / `""` | `intangible-assets-2026-07-30.xlsx` / `.pdf` |

This mirrors the existing regular asset export fallback in `useAssetExport.ts`, where no company yields `asset_list.<ext>`.

Filename sanitization (spaces, special chars) is intentionally **not** handled here — the regular asset export does not sanitize either, and browser download APIs accept those characters.

## Validation

- Run `npm run build --workspace=client` to confirm the modified functions compile.
- Open Intangible Assets tab, export PDF and Excel, verify filename prefix matches `activeCompany?.name`.
