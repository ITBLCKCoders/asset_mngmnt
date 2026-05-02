-- Fix asset_mngmnt_settings table - change created_by/updated_by from INT to CHAR(36)
-- to match the userID format used elsewhere in the system
-- Migration: fix_settings_user_columns

-- Check and alter created_by column
SET @col_type = (
  SELECT DATA_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'asset_mngmnt_settings'
  AND COLUMN_NAME = 'created_by'
);

SET @sql = IF(@col_type = 'int',
  'ALTER TABLE `asset_mngmnt_settings` MODIFY COLUMN `created_by` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL',
  'SELECT "Column created_by is already non-int" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and alter updated_by column
SET @col_type = (
  SELECT DATA_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'asset_mngmnt_settings'
  AND COLUMN_NAME = 'updated_by'
);

SET @sql = IF(@col_type = 'int',
  'ALTER TABLE `asset_mngmnt_settings` MODIFY COLUMN `updated_by` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL',
  'SELECT "Column updated_by is already non-int" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the column changes
DESCRIBE `asset_mngmnt_settings`;
