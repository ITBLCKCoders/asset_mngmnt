-- Migration: Rename "Super Admin" role to "Global Admin"
-- This aligns the DB role name with the new naming convention.

USE `asset_mngmnt`;

UPDATE `asset_mngmnt_roles`
SET `name` = 'Global Admin',
    `description` = 'Global Administrator with full access to all system features'
WHERE `name` = 'Super Admin'
  AND `deleted_at` IS NULL;

-- Verify the update
SELECT 'Super Admin → Global Admin rename complete' AS result;
