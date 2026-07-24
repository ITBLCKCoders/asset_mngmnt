-- ============================================================================
-- Script: PERMANENTLY DELETE 12 Administration assets for BCGI and renumber
--         the remaining 108 Administration assets from 00001.
-- Database: asset_mngmnt
-- Company: Black Coders Group Inc. (prefix: BCGI, ID: 21a225aa-...)
--
-- Administration Department ID: 998d71c5-0255-11f1-a629-b8cb29c59adf
-- IT Department assets (121) and other departments are NOT affected.
-- ============================================================================

USE asset_mngmnt;

SET collation_connection = 'utf8mb4_unicode_ci';

-- BCGI company UUID
SET @bcgi_id = '21a225aa-cdbc-11f0-acd5-047c16a24f9f' COLLATE utf8mb4_unicode_ci;
-- Administration Department UUID
SET @admin_dept_id = '998d71c5-0255-11f1-a629-b8cb29c59adf' COLLATE utf8mb4_unicode_ci;

-- Collect target assets
DROP TEMPORARY TABLE IF EXISTS tmp_target;
CREATE TEMPORARY TABLE tmp_target AS
SELECT a.assetID, a.asset_code, a.name, a.status
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
WHERE a.company_id = @bcgi_id
  AND a.deleted_at IS NULL
  AND ac.department_id = @admin_dept_id
  AND a.asset_code IN (
    'BCGI-PAN-STRG-OU-00001','BCGI-PAN-STRG-OU-00002','BCGI-PAN-STRG-OU-00003',
    'BCGI-CAC-FLEXI-OU-00004',
    'BCGI-PAN-STRG-OU-00005','BCGI-PAN-STRG-OU-00006','BCGI-PAN-STRG-OU-00007',
    'BCGI-PAN-STRG-OU-00008','BCGI-PAN-STRG-OU-00009','BCGI-PAN-STRG-OU-00010',
    'BCGI-PAN-STRG-OU-00011','BCGI-ADMOFE-RNGBNDR-OU-00012'
  );

-- ============================================================================
-- STEP 1: PREVIEW TARGET ASSETS
-- ============================================================================
SELECT '=== STEP 1: TARGETS TO DELETE ===' AS step;
SELECT * FROM tmp_target ORDER BY asset_code;
SELECT CONCAT(COUNT(*), ' target(s) found') AS result FROM tmp_target;

SELECT 'Missing codes (not found):' AS step;
SELECT ac.code
FROM (
  SELECT 'BCGI-PAN-STRG-OU-00001' AS code UNION ALL SELECT 'BCGI-PAN-STRG-OU-00002'
  UNION ALL SELECT 'BCGI-PAN-STRG-OU-00003' UNION ALL SELECT 'BCGI-CAC-FLEXI-OU-00004'
  UNION ALL SELECT 'BCGI-PAN-STRG-OU-00005' UNION ALL SELECT 'BCGI-PAN-STRG-OU-00006'
  UNION ALL SELECT 'BCGI-PAN-STRG-OU-00007' UNION ALL SELECT 'BCGI-PAN-STRG-OU-00008'
  UNION ALL SELECT 'BCGI-PAN-STRG-OU-00009' UNION ALL SELECT 'BCGI-PAN-STRG-OU-00010'
  UNION ALL SELECT 'BCGI-PAN-STRG-OU-00011' UNION ALL SELECT 'BCGI-ADMOFE-RNGBNDR-OU-00012'
) ac
WHERE ac.code NOT IN (SELECT asset_code FROM tmp_target);

-- ============================================================================
-- STEP 2: CHECK RELATED RECORDS
-- ============================================================================
SELECT '=== STEP 2: RELATED RECORDS ===' AS step;

SELECT 'asset_assignments' AS tbl, COUNT(*) AS cnt FROM asset_assignments WHERE asset_id IN (SELECT assetID FROM tmp_target);
SELECT 'accountability_forms' AS tbl, COUNT(*) AS cnt FROM accountability_forms WHERE asset_id IN (SELECT assetID FROM tmp_target);
SELECT 'asset_documents' AS tbl, COUNT(*) AS cnt FROM asset_documents WHERE asset_id IN (SELECT assetID FROM tmp_target);
SELECT 'asset_builder_items' AS tbl, COUNT(*) AS cnt FROM asset_builder_items WHERE asset_id IN (SELECT assetID FROM tmp_target);
SELECT 'asset_mngmnt_gate_passes' AS tbl, COUNT(*) AS cnt FROM asset_mngmnt_gate_passes WHERE asset_id IN (SELECT assetID FROM tmp_target);


-- ============================================================================
-- STEP 3: REMAINING ADMIN ASSETS (before deletion)
-- ============================================================================
SELECT '=== STEP 3: REMAINING ADMIN ASSETS ===' AS step;

SELECT CONCAT(COUNT(*), ' Admin assets will remain after deletion') AS result
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
WHERE a.company_id = @bcgi_id
  AND a.deleted_at IS NULL
  AND ac.department_id = @admin_dept_id
  AND a.assetID NOT IN (SELECT assetID FROM tmp_target);

-- ============================================================================
-- STEP 4: HARD DELETE (RUN THIS TO APPLY)
-- ============================================================================
SELECT '=== STEP 4: DELETING ===' AS step;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM assets WHERE assetID IN (SELECT assetID FROM tmp_target);

SET FOREIGN_KEY_CHECKS = 1;

SELECT CONCAT(ROW_COUNT(), ' asset(s) permanently deleted') AS result;

-- ============================================================================
-- STEP 5: RENUMBER REMAINING ADMIN ASSETS (108 assets → 00001..00108)
-- ============================================================================
SELECT '=== STEP 5: RENUMBERING ADMIN ASSETS ===' AS step;

-- Materialize new codes into a temp table first, then UPDATE from it.
-- This avoids MySQL re-evaluating ROW_NUMBER() mid-UPDATE.
DROP TEMPORARY TABLE IF EXISTS tmp_renumber;
CREATE TEMPORARY TABLE tmp_renumber AS
SELECT
  a.assetID,
  CONCAT(
    SUBSTRING(a.asset_code, 1, LENGTH(a.asset_code) - 6),
    '-',
    LPAD(ROW_NUMBER() OVER (ORDER BY a.asset_code), 5, '0')
  ) AS new_code
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
WHERE a.company_id = @bcgi_id
  AND a.deleted_at IS NULL
  AND ac.department_id = @admin_dept_id;

-- Preview the renumbering
SELECT 'New codes (first 15):' AS info;
SELECT a.asset_code AS old_code, t.new_code
FROM tmp_renumber t
JOIN assets a ON t.assetID = a.assetID
ORDER BY t.new_code
LIMIT 15;

-- Apply
UPDATE assets a
JOIN tmp_renumber t ON a.assetID = t.assetID
SET a.asset_code = t.new_code,
    a.updated_at = NOW()
WHERE a.company_id = @bcgi_id AND a.deleted_at IS NULL;

SELECT CONCAT(ROW_COUNT(), ' Admin asset(s) renumbered') AS result;

DROP TEMPORARY TABLE IF EXISTS tmp_renumber;

-- ============================================================================
-- STEP 6: UPDATE COUNTERS
-- ============================================================================
SELECT '=== STEP 6: COUNTERS ===' AS step;

SELECT 'Before:' AS info;
SELECT * FROM asset_counters WHERE company_id = @bcgi_id AND department_id = @admin_dept_id;

INSERT INTO asset_counters (company_id, department_id, last_seq)
SELECT @bcgi_id, @admin_dept_id, COALESCE(MAX(CAST(RIGHT(a.asset_code, 5) AS UNSIGNED)), 0)
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
WHERE a.company_id = @bcgi_id AND a.deleted_at IS NULL AND ac.department_id = @admin_dept_id
ON DUPLICATE KEY UPDATE last_seq = GREATEST(last_seq, VALUES(last_seq));

SELECT 'After:' AS info;
SELECT * FROM asset_counters WHERE company_id = @bcgi_id AND department_id = @admin_dept_id;

-- ============================================================================
-- STEP 7: VERIFY
-- ============================================================================
SELECT '=== STEP 7: VERIFICATION ===' AS step;

-- Targets gone?
SELECT CONCAT('ERROR: ', COUNT(*), ' target(s) still exist. Delete failed.') AS result
FROM assets WHERE assetID IN (SELECT assetID FROM tmp_target);

-- Duplicates?
SELECT asset_code, COUNT(*) AS dup
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
WHERE a.company_id = @bcgi_id AND a.deleted_at IS NULL AND ac.department_id = @admin_dept_id
GROUP BY asset_code HAVING COUNT(*) > 1;

-- Sequential check
SELECT
  MIN(CAST(RIGHT(a.asset_code, 5) AS UNSIGNED)) AS min_seq,
  MAX(CAST(RIGHT(a.asset_code, 5) AS UNSIGNED)) AS max_seq,
  COUNT(*) AS total,
  CASE WHEN MAX(CAST(RIGHT(a.asset_code, 5) AS UNSIGNED)) = COUNT(*)
    THEN 'OK: Sequential'
    ELSE 'WARNING: Gaps'
  END AS check_seq
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
WHERE a.company_id = @bcgi_id AND a.deleted_at IS NULL AND ac.department_id = @admin_dept_id;

-- Final counts
SELECT 'Admin assets remaining:' AS label, COUNT(*) AS val
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
WHERE a.company_id = @bcgi_id AND a.deleted_at IS NULL AND ac.department_id = @admin_dept_id;

SELECT 'IT assets (unaffected):' AS label, COUNT(*) AS val
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
WHERE a.company_id = @bcgi_id AND a.deleted_at IS NULL AND ac.department_id = '998fcb41-0255-11f1-a629-b8cb29c59adf';

-- First 15 renumbered
SELECT a.asset_code, a.name, a.status
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
WHERE a.company_id = @bcgi_id AND a.deleted_at IS NULL AND ac.department_id = @admin_dept_id
ORDER BY a.asset_code LIMIT 15;

DROP TEMPORARY TABLE IF EXISTS tmp_target;

SELECT '=== DONE ===' AS step;
