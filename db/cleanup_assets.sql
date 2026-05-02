-- Script to cleanup asset assignments and accountability forms, and reset asset statuses
-- Database: asset_mngmnt

USE asset_mngmnt;

-- Disable foreign key checks to allow truncation of tables with relationships
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Truncate asset assignment and related tables
-- This removes all assignment history and active assignments
TRUNCATE TABLE asset_assignments;

-- 2. Truncate accountability forms and related return tables
-- This removes all signed forms and return records
TRUNCATE TABLE accountability_forms;
TRUNCATE TABLE asset_accountability_forms; -- Additional table identified in models
TRUNCATE TABLE asset_returns;
TRUNCATE TABLE asset_return_forms;

-- 3. Reset all asset statuses to Available
-- This makes all assets available for new assignments
UPDATE assets 
SET status = 'Available',
    location_id = NULL,
    location_room_id = NULL,
    department_id = NULL,
    updated_at = NOW(),
    updated_by = 'SYSTEM_CLEANUP'
WHERE deleted_at IS NULL;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Output confirmation
SELECT 'Cleanup completed: Tables truncated and asset statuses reset to Available' AS Result;
