-- =============================================================================
-- Migration: renumber accountability form sequences per year
-- -----------------------------------------------------------------------------
-- Problem
--   Accountability form numbers use the format <prefix>-<MMYYYY>-<NNNN> (e.g.
--   `005-108-1021-052026-0001`). The intangible-asset form generator scoped the
--   next-sequence lookup to the exact month, so the last 4 digits restarted at
--   0001 every month. The sequence should continue across all months of a year
--   and only reset when the year changes.
--
-- What this script does
--   1. Detects AFFECTED groups: a (prefix, year) group where the same sequence
--      number exists in more than one month (the monthly-reset symptom).
--   2. Backs up every affected row (including soft-deleted rows, because the
--      sequence lookup and the UNIQUE key both include them) into
--      `accountability_forms_renumber_backup_<YYYYMMDD>`.
--   3. Renumbers each affected group chronologically to 0001..N across the
--      year, keeping each form's original MMYYYY part.
--   4. Only MMYYYY (6-digit) date formats are touched. YYYYMMDD (8-digit) and
--      no-date formats are left untouched.
--
-- Safety
--   Default run is a READ-ONLY preview. Flip the flag below to 1 to apply.
--   Requires MySQL 8 (window functions).
-- =============================================================================

SET @execute_renumber = 1; -- 0 = preview only, 1 = apply the renumber

SELECT IF(@execute_renumber = 1,
  'MODE: APPLY -- form numbers WILL be changed',
  'MODE: PREVIEW ONLY -- no data will be changed. To apply, set @execute_renumber = 1 and re-run this WHOLE script.'
) AS status;

-- -----------------------------------------------------------------------------
-- 1) Parse every MMYYYY accountability form number.
-- -----------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_af_base;
CREATE TEMPORARY TABLE tmp_af_base AS
SELECT
  formID,
  form_number,
  created_at,
  SUBSTRING_INDEX(form_number, '-', -1) AS seq,
  SUBSTRING_INDEX(SUBSTRING_INDEX(form_number, '-', -2), '-', 1) AS mm_yyyy,
  RIGHT(SUBSTRING_INDEX(SUBSTRING_INDEX(form_number, '-', -2), '-', 1), 4) AS yyyy,
  SUBSTRING_INDEX(
    form_number,
    '-',
    LENGTH(form_number) - LENGTH(REPLACE(form_number, '-', '')) - 1
  ) AS prefix
FROM accountability_forms
WHERE form_number REGEXP '^[0-9A-Za-z-]+-[0-9]{6}-[0-9]{4}$';

ALTER TABLE tmp_af_base ADD INDEX idx_af_group (prefix, yyyy);

-- -----------------------------------------------------------------------------
-- 2) Detect affected groups: a sequence number repeated within the same year.
-- -----------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_af_affected;
CREATE TEMPORARY TABLE tmp_af_affected AS
SELECT
  prefix,
  yyyy,
  COUNT(*) AS total_forms,
  COUNT(DISTINCT seq) AS distinct_sequences
FROM tmp_af_base
GROUP BY prefix, yyyy
HAVING COUNT(*) > COUNT(DISTINCT seq);

-- -----------------------------------------------------------------------------
-- 3) Build the renumbering map (chronological order per group).
-- -----------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_af_map;
CREATE TEMPORARY TABLE tmp_af_map AS
SELECT
  b.formID,
  b.prefix,
  b.mm_yyyy,
  ROW_NUMBER() OVER (
    PARTITION BY b.prefix, b.yyyy
    ORDER BY b.created_at, CAST(b.seq AS UNSIGNED), b.formID
  ) AS new_seq
FROM tmp_af_base b
JOIN tmp_af_affected a
  ON a.prefix = b.prefix AND a.yyyy = b.yyyy;

-- -----------------------------------------------------------------------------
-- PREVIEW
-- -----------------------------------------------------------------------------
SELECT 'AFFECTED GROUPS (monthly reset detected)' AS section;
SELECT
  prefix,
  yyyy AS year,
  total_forms,
  distinct_sequences,
  total_forms - distinct_sequences AS duplicate_sequences
FROM tmp_af_affected
ORDER BY prefix, yyyy;

SELECT 'AFFECTED FORMS (current numbers)' AS section;
SELECT
  b.formID,
  b.form_number,
  b.created_at,
  b.mm_yyyy,
  b.seq,
  m.new_seq AS proposed_seq
FROM tmp_af_base b
JOIN tmp_af_map m ON m.formID = b.formID
ORDER BY b.prefix, b.mm_yyyy, CAST(b.seq AS UNSIGNED), b.formID;

SELECT 'TOTALS' AS section;
SELECT
  COUNT(*) AS affected_rows,
  COUNT(DISTINCT prefix, RIGHT(mm_yyyy, 4)) AS affected_groups
FROM tmp_af_map;

-- -----------------------------------------------------------------------------
-- APPLY (only when the flag is 1)
-- -----------------------------------------------------------------------------
SET @backup_table = CONCAT('accountability_forms_renumber_backup_', DATE_FORMAT(NOW(), '%Y%m%d'));

-- Backup: drop any previous backup with today's name, then snapshot affected rows.
SET @drop_sql = IF(
  @execute_renumber = 1,
  CONCAT('DROP TABLE IF EXISTS `', @backup_table, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @backup_sql = IF(
  @execute_renumber = 1,
  CONCAT(
    'CREATE TABLE `', @backup_table, '` ',
    'AS SELECT af.* FROM accountability_forms af ',
    'JOIN tmp_af_map m ON m.formID = af.formID'
  ),
  'SELECT 1'
);
PREPARE stmt FROM @backup_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Phase 1: stage affected rows so the UNIQUE key never collides mid-update.
SET @phase1_sql = IF(
  @execute_renumber = 1,
  'UPDATE accountability_forms af JOIN tmp_af_map m ON m.formID = af.formID SET af.form_number = CONCAT(af.form_number, ''-X'')',
  'SELECT 1'
);
PREPARE stmt FROM @phase1_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Phase 2: apply the final year-continuous sequences.
SET @phase2_sql = IF(
  @execute_renumber = 1,
  'UPDATE accountability_forms af JOIN tmp_af_map m ON m.formID = af.formID SET af.form_number = CONCAT(m.prefix, ''-'', m.mm_yyyy, ''-'', LPAD(m.new_seq, 4, ''0''))',
  'SELECT 1'
);
PREPARE stmt FROM @phase2_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- POST-CHECK (always runs against the live table)
-- -----------------------------------------------------------------------------
SELECT 'REMAINING AFFECTED GROUPS (expect 0 rows after a successful renumber)' AS section;
SELECT
  prefix,
  yyyy AS year,
  COUNT(*) AS total_forms,
  COUNT(DISTINCT seq) AS distinct_sequences
FROM (
  SELECT
    SUBSTRING_INDEX(form_number, '-', -1) AS seq,
    SUBSTRING_INDEX(SUBSTRING_INDEX(form_number, '-', -2), '-', 1) AS mm_yyyy,
    RIGHT(SUBSTRING_INDEX(SUBSTRING_INDEX(form_number, '-', -2), '-', 1), 4) AS yyyy,
    SUBSTRING_INDEX(form_number, '-', LENGTH(form_number) - LENGTH(REPLACE(form_number, '-', '')) - 1) AS prefix
  FROM accountability_forms
  WHERE form_number REGEXP '^[0-9A-Za-z-]+-[0-9]{6}-[0-9]{4}$'
) parsed
GROUP BY prefix, yyyy
HAVING COUNT(*) > COUNT(DISTINCT seq);

SELECT 'RENUMBERED FORMS (new numbers, after apply)' AS section;
SELECT
  af.formID,
  af.form_number,
  m.mm_yyyy,
  m.new_seq
FROM accountability_forms af
JOIN tmp_af_map m ON m.formID = af.formID
ORDER BY m.prefix, m.mm_yyyy, m.new_seq;

SELECT IF(@execute_renumber = 1,
  'DONE -- renumber applied. Check the backup table for the pre-change values.',
  'PREVIEW COMPLETE -- nothing was changed. Set @execute_renumber = 1 and re-run this WHOLE script to apply.'
) AS status;
