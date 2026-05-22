-- =============================================================================
-- Fix Black Coders Group Inc. IT asset count (counter ~88, list may show ~86)
-- Database: asset_mngmnt
--
-- Same issue as CMTH: IT tab filters by asset_categories.department_id (IT dept).
-- Assets at BCGI company_id but CMTH/other category dept are hidden from the list.
--
-- WARNING: Back up before running. Run diagnostics first.
-- =============================================================================

USE asset_mngmnt;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET collation_connection = 'utf8mb4_unicode_ci';

SET @BCGI_COMPANY := '21a225aa-cdbc-11f0-acd5-047c16a24f9f' COLLATE utf8mb4_unicode_ci;
SET @BCGI_IT_DEPT := '998fcb41-0255-11f1-a629-b8cb29c59adf' COLLATE utf8mb4_unicode_ci;
SET @CMTH_COMPANY := 'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f' COLLATE utf8mb4_unicode_ci;

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- ---------------------------------------------------------------------------
-- DIAGNOSTICS
-- ---------------------------------------------------------------------------
SELECT 'BCGI assets by company_id (BCGI-coded)' AS report;
SELECT a.company_id, c.name AS company_name, COUNT(*) AS cnt
FROM assets a
LEFT JOIN companies c ON c.companyID COLLATE utf8mb4_unicode_ci = a.company_id
WHERE a.deleted_at IS NULL
  AND a.asset_code LIKE 'BCGI-%'
GROUP BY a.company_id, c.name;

SELECT 'BCGI IT scope visibility' AS report;
SELECT
  COUNT(*) AS total_bcgi_coded,
  SUM(CASE WHEN a.company_id = @BCGI_COMPANY THEN 1 ELSE 0 END) AS at_bcgi_company,
  SUM(CASE WHEN d.company_id = @BCGI_COMPANY AND (d.name LIKE '%IT%' OR d.name LIKE '%Information Technology%') THEN 1 ELSE 0 END) AS it_visible_count,
  SUM(CASE WHEN a.company_id = @BCGI_COMPANY AND (d.company_id IS NULL OR d.company_id <> @BCGI_COMPANY OR d.name NOT LIKE '%IT%') THEN 1 ELSE 0 END) AS wrong_category_for_it_tab
FROM assets a
LEFT JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
LEFT JOIN asset_mngmnt_departments d ON ac.department_id COLLATE utf8mb4_unicode_ci = d.departmentID
WHERE a.deleted_at IS NULL
  AND a.asset_code LIKE 'BCGI-%';

SELECT 'Likely hidden assets (00086–00088 range)' AS report;
SELECT
  a.asset_code,
  a.name,
  a.company_id,
  c.name AS company_name,
  ac.name AS category_name,
  d.name AS category_dept,
  d.company_id AS category_dept_company
FROM assets a
LEFT JOIN companies c ON c.companyID COLLATE utf8mb4_unicode_ci = a.company_id
LEFT JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
LEFT JOIN asset_mngmnt_departments d ON ac.department_id COLLATE utf8mb4_unicode_ci = d.departmentID
WHERE a.deleted_at IS NULL
  AND a.asset_code LIKE 'BCGI-%'
  AND (
    a.company_id IS NULL
    OR a.company_id <> @BCGI_COMPANY
    OR d.company_id IS NULL
    OR d.company_id <> @BCGI_COMPANY
    OR (d.name NOT LIKE '%IT%' AND d.name NOT LIKE '%Information Technology%')
  )
ORDER BY a.asset_code DESC
LIMIT 20;

SELECT 'Missing sequence numbers (BCGI-COM-STRG-OU, last 5 digits)' AS report;
WITH nums AS (
  SELECT CAST(RIGHT(a.asset_code, 5) AS UNSIGNED) AS seq
  FROM assets a
  WHERE a.deleted_at IS NULL
    AND a.asset_code REGEXP '^BCGI-COM-STRG-OU-[0-9]{5}$'
),
bounds AS (
  SELECT MIN(seq) AS min_seq, MAX(seq) AS max_seq FROM nums
)
SELECT b.max_seq AS counter_high_water,
       (SELECT COUNT(*) FROM nums) AS assets_in_that_format,
       b.max_seq - (SELECT COUNT(*) FROM nums) AS gap_count
FROM bounds b;

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 1) BCGI-coded assets -> BCGI company
-- ---------------------------------------------------------------------------
UPDATE assets a
SET
  a.company_id = @BCGI_COMPANY,
  a.updated_at = NOW()
WHERE a.deleted_at IS NULL
  AND a.asset_code LIKE 'BCGI-%'
  AND (a.company_id IS NULL OR a.company_id <> @BCGI_COMPANY);

-- ---------------------------------------------------------------------------
-- 2) Remap categories to BCGI IT (match category name within BCGI IT dept)
-- ---------------------------------------------------------------------------
UPDATE assets a
INNER JOIN asset_categories ac_wrong ON a.category_id COLLATE utf8mb4_unicode_ci = ac_wrong.categoryID
INNER JOIN asset_mngmnt_departments d_wrong ON ac_wrong.department_id COLLATE utf8mb4_unicode_ci = d_wrong.departmentID
INNER JOIN asset_categories ac_fix
  ON ac_fix.name COLLATE utf8mb4_unicode_ci = ac_wrong.name COLLATE utf8mb4_unicode_ci
 AND ac_fix.department_id COLLATE utf8mb4_unicode_ci = @BCGI_IT_DEPT
 AND ac_fix.deleted_at IS NULL
SET
  a.category_id = ac_fix.categoryID,
  a.updated_at = NOW()
WHERE a.deleted_at IS NULL
  AND a.company_id = @BCGI_COMPANY
  AND d_wrong.company_id IS NOT NULL
  AND d_wrong.company_id <> @BCGI_COMPANY
  AND NOT (
    d_wrong.name LIKE '%Admin%'
    OR d_wrong.name LIKE '%Administration%'
  );

COMMIT;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

-- ---------------------------------------------------------------------------
-- POST-FIX
-- ---------------------------------------------------------------------------
SELECT 'After fix: IT-visible BCGI-coded assets' AS report;
SELECT COUNT(*) AS it_visible_bcgi_assets
FROM assets a
INNER JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
INNER JOIN asset_mngmnt_departments d ON ac.department_id COLLATE utf8mb4_unicode_ci = d.departmentID
WHERE a.deleted_at IS NULL
  AND a.company_id = @BCGI_COMPANY
  AND a.asset_code LIKE 'BCGI-%'
  AND d.company_id = @BCGI_COMPANY
  AND (d.name LIKE '%IT%' OR d.name LIKE '%Information Technology%');

SELECT a.asset_code, a.name
FROM assets a
WHERE a.deleted_at IS NULL
  AND a.asset_code IN ('BCGI-COM-STRG-OU-00086', 'BCGI-COM-STRG-OU-00087', 'BCGI-COM-STRG-OU-00088')
ORDER BY a.asset_code;

SELECT 'Done. Refresh BCGI + IT Asset tab.' AS result;
