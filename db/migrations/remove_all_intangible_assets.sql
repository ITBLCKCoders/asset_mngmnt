-- One-time cleanup: Remove all intangible assets and related data
-- This script permanently deletes:
--   1. Audit log entries for intangible assets
--   2. All intangible asset assignments (via CASCADE from step 3)
--   3. All intangible assets
--
-- WARNING: This is destructive and irreversible. Run only on a backup or if
-- you are certain all intangible asset data should be removed.

SET SQL_SAFE_UPDATES = 0;

-- Step 1: Remove audit log entries referencing intangible assets
DELETE FROM `audit_logs` WHERE `resource_type` = 'intangible_asset';

-- Step 2: Also clean archived audit entries if the archive table exists
DELETE FROM `audit_logs_archive` WHERE `resource_type` = 'intangible_asset';

-- Step 3: Delete all intangible assets (CASCADE removes intangible_asset_assignments)
DELETE FROM `intangible_assets`;

SET SQL_SAFE_UPDATES = 1;
