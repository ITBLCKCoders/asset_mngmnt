-- =============================================================================
-- Restore Admin-scoped assets (moved into IT tab by overly broad fix scripts)
-- Database: asset_mngmnt
--
-- Cause: fix_cmth / fix_bcgi "fallback" set category_id to first IT category
-- for ANY asset not already under IT dept — including real Admin assets.
--
-- Fix: For each asset, if its asset_types.category_id belongs to an
-- Administration department, restore asset.category_id (and department_id)
-- from the type's home category.
-- =============================================================================

USE asset_mngmnt;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET collation_connection = 'utf8mb4_unicode_ci';

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- ---------------------------------------------------------------------------
-- DIAGNOSTICS
-- ---------------------------------------------------------------------------
SELECT 'Assets currently in IT scope but type belongs to Admin dept' AS report;
SELECT
  c.name AS company_name,
  COUNT(*) AS should_be_admin
FROM assets a
INNER JOIN asset_types at ON a.type_id COLLATE utf8mb4_unicode_ci = at.typeID
  AND (at.deleted_at IS NULL)
INNER JOIN asset_categories ac_type ON at.category_id COLLATE utf8mb4_unicode_ci = ac_type.categoryID
INNER JOIN asset_mngmnt_departments d_type ON ac_type.department_id COLLATE utf8mb4_unicode_ci = d_type.departmentID
INNER JOIN asset_categories ac_cur ON a.category_id COLLATE utf8mb4_unicode_ci = ac_cur.categoryID
INNER JOIN asset_mngmnt_departments d_cur ON ac_cur.department_id COLLATE utf8mb4_unicode_ci = d_cur.departmentID
LEFT JOIN companies c ON c.companyID COLLATE utf8mb4_unicode_ci = a.company_id
WHERE a.deleted_at IS NULL
  AND a.company_id = d_type.company_id
  AND (
    d_type.name LIKE '%Admin%'
    OR d_type.name LIKE '%Administration%'
  )
  AND (
    d_cur.departmentID = d_type.departmentID
    OR (
      (d_cur.name LIKE '%IT%' OR d_cur.name LIKE '%Information Technology%')
      AND d_cur.name NOT LIKE '%Admin%'
    )
  )
GROUP BY c.name;

START TRANSACTION;

-- Restore category + department from asset type when type's category is Admin scope
UPDATE assets a
INNER JOIN asset_types at ON a.type_id COLLATE utf8mb4_unicode_ci = at.typeID
  AND at.deleted_at IS NULL
INNER JOIN asset_categories ac_type ON at.category_id COLLATE utf8mb4_unicode_ci = ac_type.categoryID
INNER JOIN asset_mngmnt_departments d_type ON ac_type.department_id COLLATE utf8mb4_unicode_ci = d_type.departmentID
INNER JOIN asset_categories ac_cur ON a.category_id COLLATE utf8mb4_unicode_ci = ac_cur.categoryID
INNER JOIN asset_mngmnt_departments d_cur ON ac_cur.department_id COLLATE utf8mb4_unicode_ci = d_cur.departmentID
SET
  a.category_id = at.category_id,
  a.department_id = d_type.departmentID,
  a.updated_at = NOW()
WHERE a.deleted_at IS NULL
  AND a.company_id = d_type.company_id
  AND (
    d_type.name LIKE '%Admin%'
    OR d_type.name LIKE '%Administration%'
  )
  AND (
    d_cur.departmentID <> d_type.departmentID
    OR a.category_id <> at.category_id
  );

COMMIT;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

-- ---------------------------------------------------------------------------
-- POST-FIX counts per company / scope
-- ---------------------------------------------------------------------------
SELECT 'IT-visible (category dept IT)' AS report;
SELECT c.name AS company_name, COUNT(*) AS it_count
FROM assets a
INNER JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
INNER JOIN asset_mngmnt_departments d ON ac.department_id COLLATE utf8mb4_unicode_ci = d.departmentID
LEFT JOIN companies c ON c.companyID COLLATE utf8mb4_unicode_ci = a.company_id
WHERE a.deleted_at IS NULL
  AND (d.name LIKE '%IT%' OR d.name LIKE '%Information Technology%')
  AND d.name NOT LIKE '%Admin%'
GROUP BY c.name
ORDER BY c.name;

SELECT 'Admin-visible (category dept Administration)' AS report;
SELECT c.name AS company_name, COUNT(*) AS admin_count
FROM assets a
INNER JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
INNER JOIN asset_mngmnt_departments d ON ac.department_id COLLATE utf8mb4_unicode_ci = d.departmentID
LEFT JOIN companies c ON c.companyID COLLATE utf8mb4_unicode_ci = a.company_id
WHERE a.deleted_at IS NULL
  AND (
    d.name LIKE '%Admin%'
    OR d.name LIKE '%Administration%'
  )
  AND NOT (d.name LIKE '%IT%' AND d.name NOT LIKE '%Admin%')
GROUP BY c.name
ORDER BY c.name;

SELECT 'Done. Refresh app — IT tab should exclude Admin assets again.' AS result;
