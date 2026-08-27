# Fix: Duplicate `companyName` Declaration in AssetsPage.tsx

## Problem
`Identifier 'companyName' has already been declared.` at `client/src/pages/assets/assets-list/AssetsPage.tsx:1162`

`companyName` is declared twice inside the same `handleIntangibleExportExcel` function scope:
- Line 1095: `const companyName = activeCompany?.name || '';` (first declaration)
- Line 1162: `const companyName = activeCompany?.name || '';` (duplicate — causes compile error)

## Root Cause
The second declaration at line 1162 was likely added during a prior edit without removing the original at line 1095. Since both are in the same function scope (`handleIntangibleExportExcel`), TypeScript rejects the duplicate `const`.

## Fix
Remove the duplicate declaration at line 1162. The variable from line 1095 is already in scope and used correctly by the subsequent lines (1163–1164).

### Affected File
- `client/src/pages/assets/assets-list/AssetsPage.tsx`

### Change
Delete line 1162:
```ts
const companyName = activeCompany?.name || '';
```

Lines 1163–1164 will continue to use the `companyName` declared at line 1095.

## Verification
- Run `npm run build` or `npm run test --workspace=client` to confirm the compile error is resolved.
- No other duplicate `companyName` declarations exist in the same function scope (lines 1185 and 1246 are in separate functions: `handleIntangibleExportPdf` and the PDF-related scope, respectively).
