-- Migration: add_audit_hash_columns
-- Version: v1.0.0
-- Description: Add compliance fields and hash columns to audit_logs for audit chain verification
-- Created: 2026-05-18

-- Add status column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'audit_logs'
  AND COLUMN_NAME = 'status'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE audit_logs ADD COLUMN status VARCHAR(20) NULL DEFAULT ''success''',
  'SELECT "Column status already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add severity column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'audit_logs'
  AND COLUMN_NAME = 'severity'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE audit_logs ADD COLUMN severity VARCHAR(20) NULL DEFAULT ''info''',
  'SELECT "Column severity already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add request_id column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'audit_logs'
  AND COLUMN_NAME = 'request_id'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE audit_logs ADD COLUMN request_id VARCHAR(255) NULL',
  'SELECT "Column request_id already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add session_id column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'audit_logs'
  AND COLUMN_NAME = 'session_id'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE audit_logs ADD COLUMN session_id VARCHAR(255) NULL',
  'SELECT "Column session_id already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add http_method column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'audit_logs'
  AND COLUMN_NAME = 'http_method'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE audit_logs ADD COLUMN http_method VARCHAR(10) NULL',
  'SELECT "Column http_method already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add http_endpoint column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'audit_logs'
  AND COLUMN_NAME = 'http_endpoint'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE audit_logs ADD COLUMN http_endpoint VARCHAR(255) NULL',
  'SELECT "Column http_endpoint already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add prev_hash column
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'audit_logs'
  AND COLUMN_NAME = 'prev_hash'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE audit_logs ADD COLUMN prev_hash CHAR(64) NULL',
  'SELECT "Column prev_hash already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add row_hash column
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'audit_logs'
  AND COLUMN_NAME = 'row_hash'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE audit_logs ADD COLUMN row_hash CHAR(64) NULL',
  'SELECT "Column row_hash already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on row_hash for faster lookups
SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'audit_logs'
  AND INDEX_NAME = 'idx_audit_logs_row_hash'
);

SET @sql = IF(@index_exists = 0,
  'ALTER TABLE audit_logs ADD INDEX idx_audit_logs_row_hash (row_hash)',
  'SELECT "Index idx_audit_logs_row_hash already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
