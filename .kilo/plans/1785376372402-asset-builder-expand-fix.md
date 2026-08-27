# Use Asset Company Name for Intangible Export Filename

## Context

In `client/src/pages/assets/assets-list/AssetsPage.tsx`, the intangible asset export handlers (`handleIntangibleExportExcel` and `handleIntangibleExportPdf`) currently use `activeCompany?.name` for the exported filename. The active company is UI context state and may not always reflect the actual company the exported intangible assets belong to.

The database stored procedure `sp_GetAllIntangibleAssets` does not return `company_id` or `company_name` in its SELECT list, so the client-side asset objects lack company identifying fields.

## Goal

Make the export filename derive from the exported assets' company instead of `activeCompany`, by exposing company info from the API.

## Files to Modify

- `server/src/repositories/intangibleAssets.repository.ts` — minor mapping adjustment if needed
- `db/migrations/` — new migration SQL to update `sp_GetAllIntangibleAssets`
- `client/src/pages/assets/assets-list/AssetsPage.tsx` — derive filename from asset data

## Changes

### 1. Database migration

Create `db/migrations/add_company_name_to_intangible_assets_export.sql` with:

```sql
DROP PROCEDURE IF EXISTS `sp_GetAllIntangibleAssets`;

DELIMITER $$

CREATE PROCEDURE `sp_GetAllIntangibleAssets`(
  IN p_company_id CHAR(36)
)
BEGIN
  SELECT
    ia.`id`,
    ia.`name`,
    ia.`description`,
    ia.`remarks`,
    ia.`type`,
    ia.`status`,
    ia.`created_at`,
    ia.`created_by`,
    ia.`updated_at`,
    ia.`updated_by`,
    ia.`company_id`,
    c.`name` AS company_name,
    CONCAT(COALESCE(uc.`first_name`, ''), ' ', COALESCE(uc.`last_name`, '')) AS created_by_name,
    CONCAT(COALESCE(uu.`first_name`, ''), ' ', COALESCE(uu.`last_name`, '')) AS updated_by_name,
    CASE
      WHEN ia.`assigned_to` IS NOT NULL THEN
        JSON_ARRAY(
          JSON_OBJECT(
            'userId', u.`userID`,
            'firstName', u.`first_name`,
            'lastName', u.`last_name`,
            'email', u.`email`,
            'assignedDate', ia.`assigned_date`
          )
        )
      ELSE JSON_ARRAY()
    END AS assignees
  FROM `intangible_assets` ia
  LEFT JOIN `companies` c ON ia.`company_id` = c.`companyID`
  LEFT JOIN `users` u ON ia.`assigned_to` = u.`userID`
  LEFT JOIN `users` uc ON ia.`created_by` = uc.`userID`
  LEFT JOIN `users` uu ON ia.`updated_by` = uu.`userID`
  WHERE ia.`company_id` = p_company_id
  ORDER BY ia.`created_at` DESC;
END$$

DELIMITER ;
```

### 2. Repository

No mandatory change needed: the existing `getAllIntangibleAssets` in `intangibleAssets.repository.ts` maps `...asset` plus overrides, so the new `company_id` and `company_name` columns will pass through automatically from the raw query rows.

### 3. Client filename logic

Replace the current `activeCompany?.name`-based filename with company derived from the exported asset data:

```ts
const deriveIntangibleCompanyName = (assets: any[]): string => {
  if (!Array.isArray(assets) || assets.length === 0) return '';
  const first = assets[0];
  return first?.company_name || first?.company || '';
};
```

Use this in `handleIntangibleExportExcel` and `handleIntangibleExportPdf`:
```ts
const companyName = deriveIntangibleCompanyName(assets);
const prefix = companyName ? `${companyName}_` : '';
a.download = `${prefix}intangible-assets-${dateStr}.xlsx`;
// and
doc.save(`${prefix}intangible-assets-${dateStr}.pdf`);
```

Also update the document title text (PDF centered title and Excel header row) to use the same derived company name instead of `activeCompany?.name`.

## Validation

- Run the intangible assets export and verify the filename uses the company name from the exported assets, not `activeCompany`.
- If multiple companies are somehow present in a single export array, use only the first asset's company name for the filename (homogeneous dataset case).
