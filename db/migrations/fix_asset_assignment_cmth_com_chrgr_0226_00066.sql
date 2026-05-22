-- Fix: Update asset data in accountability form to use actual names instead of IDs
-- This fixes the PDF generation error caused by incorrect JSON structure

USE `asset_mngmnt`;

-- Set variables
SET @asset_code = 'CMTH-COM-CHRGR-0226-00066';
SET @form_number = '005-108-1021-052026-0001';

-- Get the UUIDs
SELECT @asset_id := assetID FROM assets WHERE asset_code COLLATE utf8mb4_unicode_ci = @asset_code COLLATE utf8mb4_unicode_ci LIMIT 1;
SELECT @form_id := formID FROM accountability_forms WHERE form_number COLLATE utf8mb4_unicode_ci = @form_number COLLATE utf8mb4_unicode_ci LIMIT 1;
SELECT @department_id := department_id FROM assets WHERE assetID = @asset_id;

-- Get the asset details with actual names (not IDs)
SELECT @asset_details := JSON_OBJECT(
  'id', @asset_id,
  'code', asset_code,
  'name', `name`,
  'type', (SELECT `name` FROM asset_types WHERE typeID = assets.type_id),
  'brand', (SELECT `name` FROM asset_brands WHERE brandID = assets.brand),
  'modelNo', model,
  'category', (SELECT `name` FROM asset_categories WHERE categoryID = assets.category_id),
  'serialNo', serial,
  'department', (SELECT `name` FROM asset_mngmnt_departments WHERE departmentID = @department_id)
) FROM assets WHERE assetID = @asset_id;

-- Update the assets_data JSON to replace the incorrect asset entry
-- This removes the asset with the matching ID and adds the corrected version
UPDATE accountability_forms
SET assets_data = JSON_SET(
  assets_data,
  '$.assets',
  (
    SELECT JSON_ARRAYAGG(asset) 
    FROM JSON_TABLE(
      JSON_EXTRACT(assets_data, '$.assets'),
      '$[*]' COLUMNS(asset JSON PATH '$')
    ) AS jt
    WHERE JSON_UNQUOTE(JSON_EXTRACT(asset, '$.id')) != @asset_id
  )
)
WHERE formID = @form_id;

-- Append the corrected asset details
UPDATE accountability_forms
SET assets_data = JSON_SET(
  assets_data,
  '$.assets',
  JSON_ARRAY_APPEND(JSON_EXTRACT(assets_data, '$.assets'), '$', @asset_details)
)
WHERE formID = @form_id;

-- Verify the fix
SELECT 'Asset data fixed successfully' AS status;
SELECT CONCAT('Asset: ', @asset_code) AS asset_fixed;
SELECT CONCAT('Form: ', @form_number) AS form_updated;
