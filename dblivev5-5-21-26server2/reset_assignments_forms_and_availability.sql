-- =============================================================================
-- Reset assignments, forms, and availability (dblivev5-5-21-26server2 schema)
-- Database: asset_mngmnt
--
-- WHAT THIS DOES:
--   - Reverts inter-company transfers (restores original company from audit_logs)
--   - Deletes company-transfer audit records
--   - Removes all asset assignments and related records (accountability, checklist,
--     return, user transfer forms, gate pass)
--   - Sets all non-deleted assets to status 'Available' (clears location only)
--   - Sets all non-deleted asset builders to status 'Available'
--   - Deletes all intangible assets
--
-- WHAT THIS KEEPS:
--   - assets, asset_builders, asset_builder_items, users, companies, settings
--   - Form *settings* tables (accountability_form_settings, etc.)
--
-- WARNING: Destructive. Back up the database before running.
-- =============================================================================

USE asset_mngmnt;

-- Optional: uncomment to require explicit confirmation
-- SELECT 'BACK UP asset_mngmnt BEFORE RUNNING' AS warning;

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 0. Revert inter-company transfers (tracked in audit_logs only)
--     Uses first transfer's old_values as "home" and last transfer's new_values
--     as the destination; only reverts when the asset is still at destination.
-- ---------------------------------------------------------------------------

-- Preview (optional): rows that will be reverted
-- SELECT a.asset_code, a.name, c_from.name AS restore_company, c_to.name AS current_company
-- FROM assets a
-- INNER JOIN (
--   SELECT f.resource_id AS asset_id,
--          JSON_UNQUOTE(JSON_EXTRACT(f.old_values, '$.company_id')) AS restore_company_id,
--          JSON_UNQUOTE(JSON_EXTRACT(l.new_values, '$.company_id')) AS xfer_destination_company_id
--   FROM (
--     SELECT resource_id, old_values, new_values,
--            ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY created_at ASC) AS rn_asc,
--            ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY created_at DESC) AS rn_desc
--     FROM audit_logs
--     WHERE action = 'Transferred Asset to Company' AND resource_type = 'asset' AND deleted_at IS NULL
--   ) f
--   INNER JOIN (
--     SELECT resource_id, new_values,
--            ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY created_at DESC) AS rn_desc
--     FROM audit_logs
--     WHERE action = 'Transferred Asset to Company' AND resource_type = 'asset' AND deleted_at IS NULL
--   ) l ON l.resource_id = f.resource_id AND l.rn_desc = 1
--   WHERE f.rn_asc = 1
-- ) rev ON rev.asset_id = a.assetID
-- LEFT JOIN companies c_from ON c_from.companyID = rev.restore_company_id
-- LEFT JOIN companies c_to ON c_to.companyID = rev.xfer_destination_company_id
-- WHERE a.deleted_at IS NULL AND a.company_id = rev.xfer_destination_company_id;

UPDATE assets a
INNER JOIN (
  SELECT
    f.resource_id AS asset_id,
    JSON_UNQUOTE(JSON_EXTRACT(f.old_values, '$.company_id')) AS restore_company_id,
    JSON_UNQUOTE(JSON_EXTRACT(f.old_values, '$.category_id')) AS restore_category_id,
    JSON_UNQUOTE(JSON_EXTRACT(f.old_values, '$.department_id')) AS restore_department_id,
    JSON_UNQUOTE(JSON_EXTRACT(l.new_values, '$.company_id')) AS xfer_destination_company_id
  FROM (
    SELECT
      resource_id,
      old_values,
      new_values,
      ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY created_at ASC) AS rn_asc
    FROM audit_logs
    WHERE action = 'Transferred Asset to Company'
      AND resource_type = 'asset'
      AND deleted_at IS NULL
  ) f
  INNER JOIN (
    SELECT
      resource_id,
      new_values,
      ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY created_at DESC) AS rn_desc
    FROM audit_logs
    WHERE action = 'Transferred Asset to Company'
      AND resource_type = 'asset'
      AND deleted_at IS NULL
  ) l ON l.resource_id = f.resource_id AND l.rn_desc = 1
  WHERE f.rn_asc = 1
) rev ON rev.asset_id = a.assetID
  AND a.deleted_at IS NULL
  AND a.company_id = rev.xfer_destination_company_id
  AND rev.restore_company_id IS NOT NULL
  AND rev.restore_company_id <> rev.xfer_destination_company_id
SET
  a.company_id = rev.restore_company_id,
  a.department_id = rev.restore_department_id,
  a.updated_at = NOW();

-- Remap category to home company IT dept when revert left a foreign-company category
-- (IT tab filters by category.department_id — wrong category hides assets from list)
UPDATE assets a
INNER JOIN asset_categories ac_wrong ON a.category_id = ac_wrong.categoryID
INNER JOIN asset_mngmnt_departments d_wrong ON ac_wrong.department_id = d_wrong.departmentID
INNER JOIN asset_mngmnt_departments d_it
  ON d_it.company_id = a.company_id
 AND (d_it.name LIKE '%IT%' OR d_it.name LIKE '%Information Technology%')
 AND d_it.deleted_at IS NULL
INNER JOIN asset_categories ac_fix
  ON ac_fix.name = ac_wrong.name
 AND ac_fix.department_id = d_it.departmentID
 AND ac_fix.deleted_at IS NULL
SET
  a.category_id = ac_fix.categoryID,
  a.updated_at = NOW()
WHERE a.deleted_at IS NULL
  AND d_wrong.company_id IS NOT NULL
  AND d_wrong.company_id <> a.company_id;

UPDATE asset_builders ab
INNER JOIN (
  SELECT
    f.resource_id AS builder_id,
    JSON_UNQUOTE(JSON_EXTRACT(f.old_values, '$.company_id')) AS restore_company_id,
    JSON_UNQUOTE(JSON_EXTRACT(l.new_values, '$.company_id')) AS xfer_destination_company_id
  FROM (
    SELECT
      resource_id,
      old_values,
      new_values,
      ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY created_at ASC) AS rn_asc
    FROM audit_logs
    WHERE action = 'Transferred Asset Builder to Company'
      AND resource_type = 'asset_builder'
      AND deleted_at IS NULL
  ) f
  INNER JOIN (
    SELECT
      resource_id,
      new_values,
      ROW_NUMBER() OVER (PARTITION BY resource_id ORDER BY created_at DESC) AS rn_desc
    FROM audit_logs
    WHERE action = 'Transferred Asset Builder to Company'
      AND resource_type = 'asset_builder'
      AND deleted_at IS NULL
  ) l ON l.resource_id = f.resource_id AND l.rn_desc = 1
  WHERE f.rn_asc = 1
) rev ON rev.builder_id = ab.builderID
  AND ab.deleted_at IS NULL
  AND ab.company_id = rev.xfer_destination_company_id
  AND rev.restore_company_id IS NOT NULL
  AND rev.restore_company_id <> rev.xfer_destination_company_id
SET
  ab.company_id = rev.restore_company_id,
  ab.updated_at = NOW();

-- Remove company-transfer history (JOIN on auditID for Workbench safe-update mode)
DELETE al
FROM audit_logs al
INNER JOIN (
  SELECT auditID
  FROM audit_logs
  WHERE action IN ('Transferred Asset to Company', 'Transferred Asset Builder to Company')
    AND deleted_at IS NULL
) xfer ON xfer.auditID = al.auditID;

-- ---------------------------------------------------------------------------
-- 1. Child tables that reference asset_assignments or form tables
-- ---------------------------------------------------------------------------
TRUNCATE TABLE asset_checklists;
TRUNCATE TABLE transfer_form_assignments;
TRUNCATE TABLE asset_transfer;
TRUNCATE TABLE asset_mngmnt_gate_passes;
TRUNCATE TABLE asset_returns;
TRUNCATE TABLE accountability_forms;

-- Transfer / return form headers (after junction/line tables above)
TRUNCATE TABLE asset_transfer_forms;
TRUNCATE TABLE asset_return_forms;

-- All assignment rows (cascades would have cleared some children; truncate is explicit)
TRUNCATE TABLE asset_assignments;

-- Intangible assets (accounts/licenses not tied to physical assets table)
TRUNCATE TABLE intangible_assets;

-- ---------------------------------------------------------------------------
-- 2. Reset physical assets to Available (keeps company/category/dept from step 0)
-- ---------------------------------------------------------------------------
UPDATE assets a
INNER JOIN (SELECT assetID FROM assets WHERE deleted_at IS NULL) eligible
  ON eligible.assetID = a.assetID
SET
  a.status = 'Available',
  a.location_id = NULL,
  a.location_room_id = NULL,
  a.updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 3. Reset asset builders to Available
-- ---------------------------------------------------------------------------
UPDATE asset_builders ab
INNER JOIN (SELECT builderID FROM asset_builders WHERE deleted_at IS NULL) eligible
  ON eligible.builderID = ab.builderID
SET
  ab.status = 'Available',
  ab.updated_at = NOW();

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

COMMIT;

-- ---------------------------------------------------------------------------
-- 4. Verification (should all be 0 except assets/builders Available counts)
-- ---------------------------------------------------------------------------
SELECT 'asset_assignments' AS tbl, COUNT(*) AS row_count FROM asset_assignments
UNION ALL SELECT 'accountability_forms', COUNT(*) FROM accountability_forms
UNION ALL SELECT 'asset_checklists', COUNT(*) FROM asset_checklists
UNION ALL SELECT 'asset_return_forms', COUNT(*) FROM asset_return_forms
UNION ALL SELECT 'asset_returns', COUNT(*) FROM asset_returns
UNION ALL SELECT 'asset_transfer_forms', COUNT(*) FROM asset_transfer_forms
UNION ALL SELECT 'transfer_form_assignments', COUNT(*) FROM transfer_form_assignments
UNION ALL SELECT 'asset_transfer', COUNT(*) FROM asset_transfer
UNION ALL SELECT 'asset_mngmnt_gate_passes', COUNT(*) FROM asset_mngmnt_gate_passes
UNION ALL SELECT 'intangible_assets', COUNT(*) FROM intangible_assets
UNION ALL SELECT 'audit_logs_company_xfer', COUNT(*) FROM audit_logs
  WHERE action IN ('Transferred Asset to Company', 'Transferred Asset Builder to Company')
    AND deleted_at IS NULL;

SELECT a.company_id, c.name AS company_name, COUNT(*) AS asset_count
FROM assets a
LEFT JOIN companies c ON c.companyID = a.company_id
WHERE a.deleted_at IS NULL
GROUP BY a.company_id, c.name
ORDER BY c.name;

SELECT status, COUNT(*) AS cnt
FROM assets
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY status;

SELECT status, COUNT(*) AS cnt
FROM asset_builders
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY status;

SELECT 'Cleanup completed.' AS result;
