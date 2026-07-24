-- ============================================================================
-- Script: Remove Admin-department assets 00001-00012 for BCGI, renumber rest
-- Database: asset_mngmnt
-- Company: Black Coders Group Inc. (ID: 21a225aa-cdbc-11f0-acd5-047c16a24f9f)
-- Target:  Assets whose category belongs to the Administration department
-- ============================================================================

USE asset_mngmnt;

SET SQL_SAFE_UPDATES = 0;

-- ---------------------------------------------------------------------------
-- STEP 0: Identify target assets (Admin department, seq 00001-00012)
-- ---------------------------------------------------------------------------
SELECT '=== IDENTIFYING TARGET ASSETS ===' AS '';

DROP TEMPORARY TABLE IF EXISTS tmp_target_assets;
CREATE TEMPORARY TABLE tmp_target_assets (
  assetID CHAR(36) NOT NULL PRIMARY KEY
);

INSERT INTO tmp_target_assets (assetID)
SELECT a.assetID
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
WHERE a.company_id = '21a225aa-cdbc-11f0-acd5-047c16a24f9f'
  AND a.deleted_at IS NULL
  AND d.deleted_at IS NULL
  AND (d.name LIKE '%Admin%' OR d.name LIKE '%Administration%')
  AND CAST(RIGHT(a.asset_code, 5) AS UNSIGNED) BETWEEN 1 AND 12;

SELECT 'Preview of assets to be deleted:';
SELECT a.assetID, a.asset_code, a.name, a.status, d.name AS department_name
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.categoryID
JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
JOIN tmp_target_assets t ON a.assetID = t.assetID
ORDER BY a.asset_code;

SELECT CONCAT(COUNT(*), ' assets targeted for deletion') AS '' FROM tmp_target_assets;

-- ---------------------------------------------------------------------------
-- STEP 1: HARD DELETE target assets (disable FK checks, cascade handles rest)
-- ---------------------------------------------------------------------------
SELECT 'Deleting target assets...' AS '';

SET FOREIGN_KEY_CHECKS = 0;

DELETE ad FROM asset_documents ad
JOIN tmp_target_assets t ON ad.asset_id = t.assetID;

DELETE a FROM assets a
JOIN tmp_target_assets t ON a.assetID = t.assetID;

SET FOREIGN_KEY_CHECKS = 1;

SELECT CONCAT(ROW_COUNT(), ' assets deleted') AS '';

-- ---------------------------------------------------------------------------
-- STEP 3: Preview remaining BCGI assets (before renumber)
-- ---------------------------------------------------------------------------
SELECT '=== REMAINING BCGI ASSETS (before renumber) ===' AS '';

SELECT
  a.assetID,
  a.asset_code,
  SUBSTRING(a.asset_code, 1, LENGTH(a.asset_code) - 6) AS code_prefix,
  CAST(RIGHT(a.asset_code, 5) AS UNSIGNED) AS current_seq,
  a.department_id,
  a.name,
  a.status
FROM assets a
WHERE a.company_id = '21a225aa-cdbc-11f0-acd5-047c16a24f9f'
  AND a.deleted_at IS NULL
ORDER BY code_prefix, current_seq;

-- ---------------------------------------------------------------------------
-- STEP 4: Renumber remaining assets per department
-- ---------------------------------------------------------------------------
SELECT 'Renumbering remaining assets...' AS '';

DROP TEMPORARY TABLE IF EXISTS tmp_asset_renumber;
CREATE TEMPORARY TABLE tmp_asset_renumber (
  assetID CHAR(36) NOT NULL PRIMARY KEY,
  old_code VARCHAR(50),
  new_seq INT NOT NULL,
  code_prefix VARCHAR(200) NOT NULL,
  dept_id CHAR(36)
);

SET @prev_dept = '';
SET @seq = 0;

INSERT INTO tmp_asset_renumber (assetID, old_code, new_seq, code_prefix, dept_id)
SELECT
  a.assetID,
  a.asset_code,
  @seq := IF(COALESCE(a.department_id, '') = @prev_dept, @seq + 1, 1) AS new_seq,
  SUBSTRING(a.asset_code, 1, LENGTH(a.asset_code) - 6) AS code_prefix,
  @prev_dept := COALESCE(a.department_id, '')
FROM assets a
WHERE a.company_id = '21a225aa-cdbc-11f0-acd5-047c16a24f9f'
  AND a.deleted_at IS NULL
ORDER BY
  COALESCE(a.department_id, ''),
  CAST(RIGHT(a.asset_code, 5) AS UNSIGNED);

UPDATE assets a
JOIN tmp_asset_renumber t ON a.assetID = t.assetID
SET a.asset_code = CONCAT(t.code_prefix, '-', LPAD(t.new_seq, 5, '0')),
    a.updated_at = NOW(),
    a.updated_by = 'SYSTEM_RENUMBER'
WHERE a.company_id = '21a225aa-cdbc-11f0-acd5-047c16a24f9f'
  AND a.deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- STEP 5: Reset asset_counters to max new_seq per department
-- ---------------------------------------------------------------------------
SELECT 'Resetting asset counters...' AS '';

INSERT INTO asset_counters (company_id, department_id, last_seq)
SELECT
  '21a225aa-cdbc-11f0-acd5-047c16a24f9f',
  t.dept_id,
  MAX(t.new_seq)
FROM tmp_asset_renumber t
GROUP BY t.dept_id
ON DUPLICATE KEY UPDATE last_seq = VALUES(last_seq);

INSERT INTO asset_counters (company_id, department_id, last_seq)
SELECT
  '21a225aa-cdbc-11f0-acd5-047c16a24f9f',
  NULL,
  COALESCE(MAX(new_seq), 0)
FROM tmp_asset_renumber
WHERE dept_id IS NULL
ON DUPLICATE KEY UPDATE last_seq = VALUES(last_seq);

DROP TEMPORARY TABLE IF EXISTS tmp_asset_renumber;
DROP TEMPORARY TABLE IF EXISTS tmp_target_assets;

-- ---------------------------------------------------------------------------
-- STEP 6: Verify results
-- ---------------------------------------------------------------------------
SELECT '=== RENUMBERED BCGI ASSETS ===' AS '';

SELECT assetID, asset_code, name, status, department_id
FROM assets
WHERE company_id = '21a225aa-cdbc-11f0-acd5-047c16a24f9f'
  AND deleted_at IS NULL
ORDER BY asset_code;

SELECT '=== UPDATED ASSET COUNTERS ===' AS '';

SELECT * FROM asset_counters
WHERE company_id = '21a225aa-cdbc-11f0-acd5-047c16a24f9f';

SET SQL_SAFE_UPDATES = 1;

SELECT 'Done. Admin-department BCGI assets 00001-00012 removed, remaining renumbered, counters reset.' AS result;
