-- Migration: add process_signed_by to asset_return_forms
-- Records which IT/Admin staff user process-signed the return form so the
-- "Processed by" shown on return form cards resolves to the actual processor
-- instead of the user who created the form.
-- Run this on your asset_mngmnt database. Safe to run multiple times (idempotent).

-- Add column only if it does not exist (MySQL 5.7+)
SET @dbname = DATABASE();

SET @add_process_signed_by = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'asset_return_forms' AND COLUMN_NAME = 'process_signed_by'
);
SET @sql = IF(@add_process_signed_by = 0,
  'ALTER TABLE asset_return_forms ADD COLUMN process_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER process_signed_at',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK only if it does not exist
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'asset_return_forms'
  AND CONSTRAINT_NAME = 'fk_asset_return_forms_process_signed_by' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE asset_return_forms ADD CONSTRAINT fk_asset_return_forms_process_signed_by FOREIGN KEY (process_signed_by) REFERENCES users (userID) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
