-- Migration: Add next_maintenance_date column to assets table
-- This column will store the calculated next maintenance date based on the maintenance schedule

USE `asset_mngmnt`;

-- Add next_maintenance_date column to assets table (if not exists)
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'asset_mngmnt'
    AND TABLE_NAME = 'assets'
    AND COLUMN_NAME = 'next_maintenance_date'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `assets` ADD COLUMN `next_maintenance_date` DATE NULL COMMENT ''Calculated next maintenance date based on maintenance schedule and creation/purchase date'' AFTER `maintenance_schedule`',
    'SELECT ''Column next_maintenance_date already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill existing assets: calculate next maintenance date for assets with a maintenance schedule
SET SQL_SAFE_UPDATES = 0;
UPDATE assets a
JOIN (
    SELECT assetID, maintenance_schedule, purchase_date, created_at
    FROM assets
    WHERE maintenance_schedule IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annually')
    AND deleted_at IS NULL
) AS sub ON a.assetID = sub.assetID
SET a.next_maintenance_date = CASE
    WHEN sub.maintenance_schedule = 'Monthly' THEN DATE_ADD(COALESCE(sub.purchase_date, sub.created_at), INTERVAL 1 MONTH)
    WHEN sub.maintenance_schedule = 'Quarterly' THEN DATE_ADD(COALESCE(sub.purchase_date, sub.created_at), INTERVAL 3 MONTH)
    WHEN sub.maintenance_schedule = 'Semi-Annual' THEN DATE_ADD(COALESCE(sub.purchase_date, sub.created_at), INTERVAL 6 MONTH)
    WHEN sub.maintenance_schedule = 'Annually' THEN DATE_ADD(COALESCE(sub.purchase_date, sub.created_at), INTERVAL 12 MONTH)
    ELSE NULL
END;
SET SQL_SAFE_UPDATES = 1;
