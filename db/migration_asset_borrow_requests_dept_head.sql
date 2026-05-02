-- Two-stage borrow workflow: Department Head (Manager Approver 1) first, then IT/Admin staff queue.
-- Run after migration_create_asset_borrow_requests.sql
--
-- Idempotent: safe if columns/index already exist (e.g. table was created from the current
-- migration_create_asset_borrow_requests.sql, or ALTER was partially applied). Error 1060/1061
-- will not occur.

SET @abr_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
);

-- Add each column only when missing (MySQL has no ADD COLUMN IF NOT EXISTS in plain ALTER).
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1 AS skip_no_table',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'dept_head_signed_at') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `dept_head_signed_at` datetime DEFAULT NULL AFTER `status`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'dept_head_signed_by') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `dept_head_signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `dept_head_signed_at`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'dept_head_digital_signature') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `dept_head_digital_signature` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `dept_head_signed_by`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'declined_at') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `declined_at` datetime DEFAULT NULL AFTER `dept_head_digital_signature`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND INDEX_NAME = 'idx_abr_dept_pending') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD KEY `idx_abr_dept_pending` (`company_id`, `dept_head_signed_at`, `declined_at`)',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- Data backfill for legacy `status` values.
-- MySQL Workbench "Safe Updates" (Error 1175) rejects many valid UPDATE shapes (including
-- JOINs) unless the WHERE uses a key in a form it recognizes. These statements use plain
-- filters on `asset_borrow_requests` only, so we temporarily disable safe updates for
-- this session block — same effect as unchecking Preferences → SQL Editor → Safe Updates.

SET @abr_prev_safe := @@SESSION.sql_safe_updates;
SET SESSION sql_safe_updates = 0;

UPDATE `asset_borrow_requests`
SET `status` = 'pending_dept_head'
WHERE `dept_head_signed_at` IS NULL
  AND `declined_at` IS NULL
  AND `status` = 'pending';

UPDATE `asset_borrow_requests`
SET `status` = 'pending_staff'
WHERE `dept_head_signed_at` IS NOT NULL
  AND `declined_at` IS NULL;

UPDATE `asset_borrow_requests`
SET `status` = 'declined'
WHERE `declined_at` IS NOT NULL;

SET SESSION sql_safe_updates = @abr_prev_safe;
