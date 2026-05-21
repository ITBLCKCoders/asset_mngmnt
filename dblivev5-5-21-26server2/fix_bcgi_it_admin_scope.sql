-- =============================================================================
-- BCGI: split IT (88) vs Admin (56) asset tabs
-- Database: asset_mngmnt
--
-- IT tab filters assets whose category.department_id = IT Department.
-- Admin tab uses Administration Department categories.
--
-- asset_counters confirms: IT dept = 88, Admin dept = 56 (total 144 BCGI assets).
-- Asset codes encode scope in the 2nd segment:
--   FUR, ADMOFE, PAN, CAC  -> Administration (56)
--   COM, ITOFE, etc.       -> IT (88)
--
-- Prior fix scripts often left admin assets on IT categories (e.g. Computer
-- Equipment), so all 144 appeared under the IT tab.
-- =============================================================================

USE asset_mngmnt;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET collation_connection = 'utf8mb4_unicode_ci';

SET @BCGI_COMPANY := '21a225aa-cdbc-11f0-acd5-047c16a24f9f' COLLATE utf8mb4_unicode_ci;
SET @BCGI_IT_DEPT := '998fcb41-0255-11f1-a629-b8cb29c59adf' COLLATE utf8mb4_unicode_ci;
SET @BCGI_ADMIN_DEPT := '998d71c5-0255-11f1-a629-b8cb29c59adf' COLLATE utf8mb4_unicode_ci;

-- BCGI category IDs (company 21a225aa) — from asset_categories
SET @CAT_COM := '242dad80-0d32-11f1-97a8-b8cb29c59adf' COLLATE utf8mb4_unicode_ci;
SET @CAT_ITOFE := '242da24e-0d32-11f1-97a8-b8cb29c59adf' COLLATE utf8mb4_unicode_ci;
SET @CAT_FUR := '242d82ca-0d32-11f1-97a8-b8cb29c59adf' COLLATE utf8mb4_unicode_ci;
SET @CAT_ADMOFE := '242dab3d-0d32-11f1-97a8-b8cb29c59adf' COLLATE utf8mb4_unicode_ci;
SET @CAT_PAN := '242d7eab-0d32-11f1-97a8-b8cb29c59adf' COLLATE utf8mb4_unicode_ci;
SET @CAT_CAC := '242d9f81-0d32-11f1-97a8-b8cb29c59adf' COLLATE utf8mb4_unicode_ci;

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- ---------------------------------------------------------------------------
-- BEFORE
-- ---------------------------------------------------------------------------
SELECT 'Before: BCGI assets visible per scope (by category dept)' AS report;

SELECT 'IT scope' AS scope, COUNT(*) AS cnt
FROM assets a
INNER JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
WHERE a.deleted_at IS NULL
  AND a.company_id = @BCGI_COMPANY
  AND a.asset_code LIKE 'BCGI-%'
  AND ac.department_id COLLATE utf8mb4_unicode_ci = @BCGI_IT_DEPT;

SELECT 'Admin scope' AS scope, COUNT(*) AS cnt
FROM assets a
INNER JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
WHERE a.deleted_at IS NULL
  AND a.company_id = @BCGI_COMPANY
  AND a.asset_code LIKE 'BCGI-%'
  AND ac.department_id COLLATE utf8mb4_unicode_ci = @BCGI_ADMIN_DEPT;

SELECT 'Admin-coded assets still on IT category dept' AS report, COUNT(*) AS cnt
FROM assets a
INNER JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
WHERE a.deleted_at IS NULL
  AND a.company_id = @BCGI_COMPANY
  AND a.asset_code REGEXP '^BCGI-(FUR|ADMOFE|PAN|CAC)-'
  AND ac.department_id COLLATE utf8mb4_unicode_ci = @BCGI_IT_DEPT;

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 1) Administration assets (56): match category by code segment
-- ---------------------------------------------------------------------------
UPDATE assets a
SET
  a.category_id = CASE
    WHEN a.asset_code REGEXP '^BCGI-FUR-' THEN @CAT_FUR
    WHEN a.asset_code REGEXP '^BCGI-ADMOFE-' THEN @CAT_ADMOFE
    WHEN a.asset_code REGEXP '^BCGI-PAN-' THEN @CAT_PAN
    WHEN a.asset_code REGEXP '^BCGI-CAC-' THEN @CAT_CAC
    ELSE a.category_id
  END,
  a.department_id = @BCGI_ADMIN_DEPT,
  a.updated_at = NOW()
WHERE a.deleted_at IS NULL
  AND a.company_id = @BCGI_COMPANY
  AND a.asset_code REGEXP '^BCGI-(FUR|ADMOFE|PAN|CAC)-';

-- ---------------------------------------------------------------------------
-- 2) IT assets (88): COM vs ITOFE from asset code
-- ---------------------------------------------------------------------------
UPDATE assets a
SET
  a.category_id = CASE
    WHEN a.asset_code REGEXP '^BCGI-ITOFE-' THEN @CAT_ITOFE
    WHEN a.asset_code REGEXP '^BCGI-COM-' THEN @CAT_COM
    ELSE @CAT_COM
  END,
  a.department_id = @BCGI_IT_DEPT,
  a.updated_at = NOW()
WHERE a.deleted_at IS NULL
  AND a.company_id = @BCGI_COMPANY
  AND a.asset_code LIKE 'BCGI-%'
  AND a.asset_code NOT REGEXP '^BCGI-(FUR|ADMOFE|PAN|CAC)-';

COMMIT;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

-- ---------------------------------------------------------------------------
-- AFTER
-- ---------------------------------------------------------------------------
SELECT 'After: BCGI IT tab count (expect 88)' AS report;
SELECT COUNT(*) AS it_tab_count
FROM assets a
INNER JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
WHERE a.deleted_at IS NULL
  AND a.company_id = @BCGI_COMPANY
  AND a.asset_code LIKE 'BCGI-%'
  AND ac.department_id COLLATE utf8mb4_unicode_ci = @BCGI_IT_DEPT;

SELECT 'After: BCGI Admin tab count (expect 56)' AS report;
SELECT COUNT(*) AS admin_tab_count
FROM assets a
INNER JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
WHERE a.deleted_at IS NULL
  AND a.company_id = @BCGI_COMPANY
  AND a.asset_code LIKE 'BCGI-%'
  AND ac.department_id COLLATE utf8mb4_unicode_ci = @BCGI_ADMIN_DEPT;

SELECT 'Stragglers: admin code on IT category' AS report, COUNT(*) AS cnt
FROM assets a
INNER JOIN asset_categories ac ON a.category_id COLLATE utf8mb4_unicode_ci = ac.categoryID
WHERE a.deleted_at IS NULL
  AND a.company_id = @BCGI_COMPANY
  AND a.asset_code REGEXP '^BCGI-(FUR|ADMOFE|PAN|CAC)-'
  AND ac.department_id COLLATE utf8mb4_unicode_ci = @BCGI_IT_DEPT;

SELECT 'Done. Hard-refresh BCGI company → IT Asset tab should show 88.' AS result;
