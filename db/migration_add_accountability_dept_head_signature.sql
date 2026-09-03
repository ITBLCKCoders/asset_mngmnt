-- Migration: add department-head signatory columns to accountability forms
-- Stores the Review/Checked-by-Department-Head signatory (the asset owner's
-- designated approver/sub-approver) stamped at final approval, alongside the
-- generic approval columns. Backwards compatible: all columns nullable, no
-- backfill (legacy rows fall back to approved_by/approved_at at read time).

SET @af_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
);

-- dept_head_signed_by
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'dept_head_signed_by') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `dept_head_signed_by` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `approval_notes`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- dept_head_signed_by_name
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'dept_head_signed_by_name') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `dept_head_signed_by_name` VARCHAR(255) DEFAULT NULL AFTER `dept_head_signed_by`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- dept_head_signature
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'dept_head_signature') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `dept_head_signature` MEDIUMTEXT DEFAULT NULL AFTER `dept_head_signed_by_name`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- dept_head_signed_at
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'dept_head_signed_at') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `dept_head_signed_at` DATETIME DEFAULT NULL AFTER `dept_head_signature`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Index
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND INDEX_NAME = 'idx_accountability_forms_dept_head_signed_by') = 0,
    'ALTER TABLE `accountability_forms` ADD KEY `idx_accountability_forms_dept_head_signed_by` (`dept_head_signed_by`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
