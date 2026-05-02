-- Migration to add 'Disabled' status to accountability forms
-- This allows old accountability forms to be marked as disabled when new forms are created

USE `asset_mngmnt`;

-- Update the status column to include 'Disabled' in the enum
ALTER TABLE accountability_forms 
MODIFY COLUMN `status` enum('Pending','Signed','Completed','Revoked','Disabled') 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending';

-- Verify the change
SELECT COLUMN_TYPE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'asset_mngmnt' 
AND TABLE_NAME = 'accountability_forms' 
AND COLUMN_NAME = 'status';