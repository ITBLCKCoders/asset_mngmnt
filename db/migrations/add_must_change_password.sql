-- Add must_change_password column to users table
-- Migration: add_must_change_password
-- This flag forces users to change their password on next login
-- (set by admin when they change a user's password)

-- Add must_change_password column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'must_change_password'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `must_change_password` tinyint(1) DEFAULT 0 AFTER `lockout_count`',
  'SELECT "Column must_change_password already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the columns were added
DESCRIBE `users`;
