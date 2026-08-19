-- Fix script for asset builders incorrectly set to 'Available' after edit
-- Run this in your MySQL database to restore correct statuses

-- Step 1: Find affected builders (Available status but have active assignments)
SELECT 
    ab.builderID,
    ab.name,
    ab.status as current_status,
    COUNT(DISTINCT aa.assignmentID) as active_assignments
FROM asset_builders ab
JOIN asset_builder_items abi ON abi.builder_id = ab.builderID
JOIN asset_assignments aa ON aa.asset_id = abi.asset_id
WHERE ab.status = 'Available'
  AND aa.status = 'Active'
  AND aa.deleted_at IS NULL
  AND ab.deleted_at IS NULL
GROUP BY ab.builderID, ab.name, ab.status
HAVING COUNT(DISTINCT aa.assignmentID) > 0;

-- Step 2: Update those builders to 'Assigned' (using JOIN to avoid MySQL 1093 error)
UPDATE asset_builders ab
JOIN (
    SELECT DISTINCT ab2.builderID
    FROM asset_builders ab2
    JOIN asset_builder_items abi ON abi.builder_id = ab2.builderID
    JOIN asset_assignments aa ON aa.asset_id = abi.asset_id
    WHERE ab2.status = 'Available'
      AND aa.status = 'Active'
      AND aa.deleted_at IS NULL
      AND ab2.deleted_at IS NULL
) affected ON affected.builderID = ab.builderID
SET 
    ab.status = 'Assigned',
    ab.updated_at = NOW()
WHERE ab.deleted_at IS NULL;

-- Step 3: Update assets in those builders to 'Assigned' status
UPDATE assets a
JOIN asset_builder_items abi ON abi.asset_id = a.assetID
JOIN asset_builders ab ON ab.builderID = abi.builder_id
SET 
    a.status = 'Assigned',
    a.updated_at = NOW()
WHERE ab.status = 'Assigned'
  AND ab.deleted_at IS NULL
  AND a.deleted_at IS NULL
  AND a.status = 'Available';

-- Step 4: Verify the fix
SELECT 
    ab.builderID,
    ab.name,
    ab.status as builder_status,
    COUNT(DISTINCT a.assetID) as total_assets,
    SUM(CASE WHEN a.status = 'Assigned' THEN 1 ELSE 0 END) as assigned_assets,
    SUM(CASE WHEN a.status = 'Available' THEN 1 ELSE 0 END) as available_assets
FROM asset_builders ab
JOIN asset_builder_items abi ON abi.builder_id = ab.builderID
JOIN assets a ON a.assetID = abi.asset_id
WHERE ab.deleted_at IS NULL
  AND a.deleted_at IS NULL
GROUP BY ab.builderID, ab.name, ab.status
HAVING ab.status = 'Assigned';
