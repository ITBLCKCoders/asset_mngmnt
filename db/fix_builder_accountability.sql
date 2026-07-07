-- ============================================================================
-- FIX SCRIPT: Builder status + Asset accountability
-- Run this in your MySQL client (Workbench, CLI, etc.)
-- ============================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
START TRANSACTION;

-- 1. Fix builder status (was wrongly reset to 'Available')
UPDATE asset_builders
SET status = 'Assigned',
    updated_at = NOW(),
    updated_by = '476e06e6-2f5f-46d0-8292-5fde561a37b4'
WHERE builderID = '65c33d06-53f2-11f1-8cc2-b8cb29c59adf'
  AND deleted_at IS NULL;

-- 2. Create asset assignment for BCGI-COM-STRG-OU-00090
SET @assignment_id = UUID();
SET @asset_id = '129ae3a9-6de5-11f1-8cc2-b8cb29c59adf';
SET @user_id = '476e06e6-2f5f-46d0-8292-5fde561a37b4';
SET @department_id = '998fcb41-0255-11f1-a629-b8cb29c59adf';
SET @location_id = 'ca3a5ae4-0d32-11f1-97a8-b8cb29c59adf';
SET @location_room_id = '3e147580-f4df-11f0-9f53-18c04d003e97';
SET @assigned_by = '476e06e6-2f5f-46d0-8292-5fde561a37b4';

INSERT INTO asset_assignments (
    assignmentID, asset_id, user_id, department_id, location_id,
    location_room_id, assigned_date, assignment_notes, assigned_by, status
) VALUES (
    @assignment_id, @asset_id, @user_id, @department_id, @location_id,
    @location_room_id, NOW(), 'Assigned via asset issuance', @assigned_by, 'Active'
);

UPDATE assets
SET status = 'Assigned',
    updated_by = @assigned_by,
    updated_at = NOW()
WHERE assetID = @asset_id AND deleted_at IS NULL;

-- 3. Append asset + assignment_id to accountability form
SET @new_asset_json = JSON_OBJECT(
    'id', @asset_id,
    'code', 'BCGI-COM-STRG-OU-00090',
    'name', 'Dell Inspiron 3480 SSD',
    'type', 'Storage',
    'brand', 'unknown',
    'modelNo', 'N/A',
    'category', 'Computer Equipment',
    'serialNo', 'S3Y9NB0K519701L',
    'department', 'IT Department'
);

UPDATE accountability_forms
SET assets_data = JSON_ARRAY_APPEND(
    JSON_ARRAY_APPEND(assets_data, '$.assets', @new_asset_json),
    '$.assignment_ids', @assignment_id
),
updated_at = NOW()
WHERE form_number = '002-108-1021-062026-0008'
  AND deleted_at IS NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'BUILDER STATUS' AS `check`, status FROM asset_builders WHERE builderID = '65c33d06-53f2-11f1-8cc2-b8cb29c59adf';
SELECT 'NEW ASSIGNMENT' AS `check`, assignmentID, asset_id, status FROM asset_assignments WHERE assignmentID = @assignment_id;
SELECT 'ASSET STATUS' AS `check`, asset_code, status FROM assets WHERE assetID = @asset_id;
SELECT 'FORM ASSETS COUNT' AS `check`, JSON_LENGTH(assets_data, '$.assets') AS count FROM accountability_forms WHERE form_number = '002-108-1021-062026-0008' AND deleted_at IS NULL;
SELECT 'LAST ASSET TYPE' AS `check`, JSON_TYPE(JSON_EXTRACT(assets_data, CONCAT('$.assets[', JSON_LENGTH(assets_data, '$.assets') - 1, ']'))) AS type FROM accountability_forms WHERE form_number = '002-108-1021-062026-0008' AND deleted_at IS NULL;
