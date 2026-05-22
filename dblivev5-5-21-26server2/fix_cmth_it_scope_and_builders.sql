-- =============================================================================
-- Fix CMTHoldings IT asset count (target ~270) and asset builder visibility
-- Database: asset_mngmnt
--
-- Root cause after cleanup / company transfer:
--   - IT tab filters by asset_categories.department_id (IT dept), NOT assets.company_id
--   - Transferred assets often still have BCGI/other-company category departments
--   - Asset builders are hidden when any item fails IT department scope check
--
-- WARNING: Back up before running. Review diagnostic SELECTs first.
-- =============================================================================

USE asset_mngmnt;

-- Match table collation (utf8mb4_unicode_ci); avoids Error 1267 vs utf8mb4_0900_ai_ci session default
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET collation_connection = 'utf8mb4_unicode_ci';

SET @CMTH_COMPANY := 'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f' COLLATE utf8mb4_unicode_ci;
SET @CMTH_IT_DEPT := '430a3a44-cfd8-11f0-9d93-18c04d003e97' COLLATE utf8mb4_unicode_ci;
SET @BCGI_COMPANY := '21a225aa-cdbc-11f0-acd5-047c16a24f9f' COLLATE utf8mb4_unicode_ci;

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- ---------------------------------------------------------------------------
-- DIAGNOSTICS (run first; expect it_visible_count near 270 after fix)
-- ---------------------------------------------------------------------------
SELECT 'CMTH assets by company_id' AS report;
SELECT a.company_id, c.name AS company_name, COUNT(*) AS cnt
FROM assets a
LEFT JOIN companies c ON c.companyID COLLATE utf8mb4_unicode_ci = a.company_id
WHERE a.deleted_at IS NULL
  AND (a.company_id = @CMTH_COMPANY OR a.asset_code LIKE 'CMTH-%')
GROUP BY a.company_id, c.name;

SELECT 'CMTH-coded assets: IT scope visibility (category dept)' AS report;
SELECT
  SUM(CASE WHEN d.company_id = @CMTH_COMPANY AND d.name LIKE '%IT%' THEN 1 ELSE 0 END) AS it_visible_count,
  SUM(CASE WHEN a.company_id = @CMTH_COMPANY THEN 1 ELSE 0 END) AS at_cmth_company,
  SUM(CASE WHEN a.company_id <> @CMTH_COMPANY OR a.company_id IS NULL THEN 1 ELSE 0 END) AS wrong_company,
  SUM(CASE WHEN a.company_id = @CMTH_COMPANY AND (d.company_id <> @CMTH_COMPANY OR d.name NOT LIKE '%IT%') THEN 1 ELSE 0 END) AS wrong_category_dept,
  COUNT(*) AS total_cmth_coded
FROM assets a
LEFT JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
LEFT JOIN asset_mngmnt_departments d ON ac.department_id COLLATE utf8mb4_unicode_ci = d.departmentID
WHERE a.deleted_at IS NULL
  AND a.asset_code LIKE 'CMTH-%';

SELECT 'Builders: items vs scope' AS report;
SELECT
  ab.builderID,
  ab.name,
  ab.status,
  ab.company_id,
  COUNT(abi.itemID) AS item_count,
  SUM(CASE WHEN d.company_id = @CMTH_COMPANY AND d.name LIKE '%IT%' THEN 1 ELSE 0 END) AS it_scoped_items
FROM asset_builders ab
LEFT JOIN asset_builder_items abi ON abi.builder_id COLLATE utf8mb4_unicode_ci = ab.builderID
LEFT JOIN assets a ON a.assetID COLLATE utf8mb4_unicode_ci = abi.asset_id AND a.deleted_at IS NULL
LEFT JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
LEFT JOIN asset_mngmnt_departments d ON ac.department_id COLLATE utf8mb4_unicode_ci = d.departmentID
WHERE ab.deleted_at IS NULL
  AND ab.company_id = @CMTH_COMPANY
GROUP BY ab.builderID, ab.name, ab.status, ab.company_id
ORDER BY item_count DESC;

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 1) CMTH-coded assets: ensure company_id is CMTHoldings
-- ---------------------------------------------------------------------------
UPDATE assets a
SET
  a.company_id = @CMTH_COMPANY,
  a.updated_at = NOW()
WHERE a.deleted_at IS NULL
  AND a.asset_code LIKE 'CMTH-%'
  AND (a.company_id IS NULL OR a.company_id <> @CMTH_COMPANY);

-- ---------------------------------------------------------------------------
-- 2) Remap categories on CMTH assets that still point at another company's dept
--    Match by category name within CMTH IT Department
-- ---------------------------------------------------------------------------
UPDATE assets a
INNER JOIN asset_categories ac_wrong ON a.category_id COLLATE utf8mb4_unicode_ci = ac_wrong.categoryID
INNER JOIN asset_mngmnt_departments d_wrong ON ac_wrong.department_id COLLATE utf8mb4_unicode_ci = d_wrong.departmentID
INNER JOIN asset_categories ac_fix
  ON ac_fix.name COLLATE utf8mb4_unicode_ci = ac_wrong.name COLLATE utf8mb4_unicode_ci
 AND ac_fix.department_id COLLATE utf8mb4_unicode_ci = @CMTH_IT_DEPT
 AND ac_fix.deleted_at IS NULL
SET
  a.category_id = ac_fix.categoryID,
  a.updated_at = NOW()
WHERE a.deleted_at IS NULL
  AND a.company_id = @CMTH_COMPANY
  AND d_wrong.company_id IS NOT NULL
  AND d_wrong.company_id <> @CMTH_COMPANY
  AND NOT (
    d_wrong.name LIKE '%Admin%'
    OR d_wrong.name LIKE '%Administration%'
  );

-- ---------------------------------------------------------------------------
-- 3) CMTH asset builders: company + Available (items unchanged)
-- ---------------------------------------------------------------------------
UPDATE asset_builders ab
SET
  ab.company_id = @CMTH_COMPANY,
  ab.status = 'Available',
  ab.updated_at = NOW()
WHERE ab.deleted_at IS NULL
  AND ab.company_id = @BCGI_COMPANY
  AND EXISTS (
    SELECT 1
    FROM asset_builder_items abi
    INNER JOIN assets a ON a.assetID COLLATE utf8mb4_unicode_ci = abi.asset_id AND a.deleted_at IS NULL
    WHERE abi.builder_id COLLATE utf8mb4_unicode_ci = ab.builderID
      AND a.asset_code LIKE 'CMTH-%'
  );

UPDATE asset_builders ab
INNER JOIN (SELECT builderID FROM asset_builders WHERE deleted_at IS NULL AND company_id = @CMTH_COMPANY) eligible
  ON eligible.builderID COLLATE utf8mb4_unicode_ci = ab.builderID
SET
  ab.status = 'Available',
  ab.updated_at = NOW()
WHERE ab.status = 'Assigned';

COMMIT;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

-- ---------------------------------------------------------------------------
-- POST-FIX VERIFICATION
-- ---------------------------------------------------------------------------
SELECT 'After fix: IT-visible CMTH-coded assets' AS report;
SELECT COUNT(*) AS it_visible_cmth_assets
FROM assets a
INNER JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
INNER JOIN asset_mngmnt_departments d ON ac.department_id COLLATE utf8mb4_unicode_ci = d.departmentID
WHERE a.deleted_at IS NULL
  AND a.company_id = @CMTH_COMPANY
  AND a.asset_code LIKE 'CMTH-%'
  AND d.company_id = @CMTH_COMPANY
  AND (d.name LIKE '%IT%' OR d.name LIKE '%Information Technology%');

SELECT 'After fix: CMTH builders with items' AS report;
SELECT ab.builderID, ab.name, ab.status, COUNT(abi.itemID) AS items
FROM asset_builders ab
LEFT JOIN asset_builder_items abi ON abi.builder_id COLLATE utf8mb4_unicode_ci = ab.builderID
WHERE ab.deleted_at IS NULL
  AND ab.company_id = @CMTH_COMPANY
GROUP BY ab.builderID, ab.name, ab.status
HAVING items > 0
ORDER BY items DESC;

SELECT 'Done. Refresh Assets page (CMTH + IT tab).' AS result;
