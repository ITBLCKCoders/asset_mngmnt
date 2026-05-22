-- Migration: add_lockout_count
-- Version: v1.0.0
-- Description: Add lockout_count column to users table for progressive lockout tracking
-- Created: 2026-05-18

-- Add lockout_count column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'lockout_count'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `lockout_count` int DEFAULT 0 AFTER `password_last_changed`',
  'SELECT "Column lockout_count already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the column was added
DESCRIBE `users`;
