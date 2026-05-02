-- Migration: add processing fields to asset_borrow_requests (form number + staff processing + assigned asset).
-- Run after migration_create_asset_borrow_requests.sql

SET @abr_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
);

-- form_number
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1 AS skip_no_table',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'form_number') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `form_number` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `type_id`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- approved_at
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'approved_at') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `approved_at` datetime DEFAULT NULL AFTER `dept_head_digital_signature`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- approved_by
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'approved_by') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `approved_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `approved_at`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- asset_id
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'asset_id') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `asset_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `approved_by`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- pre_usage_condition
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'pre_usage_condition') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `pre_usage_condition` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `asset_id`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- Helpful index
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND INDEX_NAME = 'idx_abr_staff_pending') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD KEY `idx_abr_staff_pending` (`company_id`, `dept_head_signed_at`, `declined_at`, `approved_at`)',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

