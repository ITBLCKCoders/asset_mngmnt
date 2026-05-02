-- Add password tracking columns to users table for password expiration functionality
-- Migration: add_password_tracking_to_users

-- Add password_last_changed column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'password_last_changed'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `password_last_changed` datetime DEFAULT CURRENT_TIMESTAMP AFTER `lockout_until`',
  'SELECT "Column password_last_changed already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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

-- Update existing users to set password_last_changed to their created_at
-- Temporarily disable safe update mode for this operation
SET SQL_SAFE_UPDATES = 0;
UPDATE `users` SET `password_last_changed` = `created_at` WHERE `userID` IS NOT NULL;
SET SQL_SAFE_UPDATES = 1;

-- Verify the columns were added
DESCRIBE `users`;
