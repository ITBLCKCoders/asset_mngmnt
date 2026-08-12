-- Migration: add_lockout_ip_and_failed_attempt_reset
-- Description: Add lockout_ip and last_failed_attempt_at columns to users table
-- for IP-aware lockout and time-based reset of failed login attempts.

-- Add lockout_ip column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'lockout_ip'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `lockout_ip` varchar(45) DEFAULT NULL AFTER `lockout_count`',
  'SELECT "Column lockout_ip already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add last_failed_attempt_at column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'last_failed_attempt_at'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `last_failed_attempt_at` datetime DEFAULT NULL AFTER `lockout_ip`',
  'SELECT "Column last_failed_attempt_at already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add failed attempt reset window setting
INSERT INTO asset_mngmnt_settings (`key`, `value`, `type`, `description`, `status`, `created_by`, `updated_by`)
VALUES ('failed_attempt_reset_minutes', '15', 'number', 'Minutes after which failed login attempts are reset (0 = never reset)', 'active', 1, 1)
ON DUPLICATE KEY UPDATE
  `value` = VALUES(`value`),
  `updated_at` = NOW(),
  `updated_by` = VALUES(`updated_by`);

-- Verify the columns were added
DESCRIBE `users`;
