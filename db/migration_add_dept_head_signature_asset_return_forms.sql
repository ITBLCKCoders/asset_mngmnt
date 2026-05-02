-- Migration: add dept_head_signed_at, dept_head_digital_signature, dept_head_signed_by to asset_return_forms
-- For Returner's Department Head approval signature.
-- Run this on your asset_mngmnt database. Safe to run multiple times (idempotent).

-- Add columns only if they do not exist (MySQL 5.7+)
SET @dbname = DATABASE();

SET @add_dept_head_signed_at = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'asset_return_forms' AND COLUMN_NAME = 'dept_head_signed_at'
);
SET @sql = IF(@add_dept_head_signed_at = 0,
  'ALTER TABLE asset_return_forms ADD COLUMN dept_head_signed_at DATETIME DEFAULT NULL AFTER received_by',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_dept_head_digital_signature = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'asset_return_forms' AND COLUMN_NAME = 'dept_head_digital_signature'
);
SET @sql = IF(@add_dept_head_digital_signature = 0,
  'ALTER TABLE asset_return_forms ADD COLUMN dept_head_digital_signature LONGTEXT DEFAULT NULL AFTER dept_head_signed_at',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_dept_head_signed_by = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'asset_return_forms' AND COLUMN_NAME = 'dept_head_signed_by'
);
SET @sql = IF(@add_dept_head_signed_by = 0,
  'ALTER TABLE asset_return_forms ADD COLUMN dept_head_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER dept_head_digital_signature',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK only if it does not exist
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'asset_return_forms'
  AND CONSTRAINT_NAME = 'fk_asset_return_forms_dept_head_signed_by' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE asset_return_forms ADD CONSTRAINT fk_asset_return_forms_dept_head_signed_by FOREIGN KEY (dept_head_signed_by) REFERENCES users (userID) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
