-- Migration: Add asset assignment for CMTH-COM-CHRGR-0226-00066 to Maria Teresa Rejano (CMTH-2023-0050)
-- Links the assignment to accountability form 005-108-1021-052026-0001

USE `asset_mngmnt`;

-- Set variables for the IDs we need to find
SET @asset_code = 'CMTH-COM-CHRGR-0226-00066';
SET @user_employee_number = 'CMTH-2023-0050';
SET @form_number = '005-108-1021-052026-0001';

-- Get the UUIDs (using COLLATE to handle collation mismatch)
SELECT @asset_id := assetID FROM assets WHERE asset_code COLLATE utf8mb4_unicode_ci = @asset_code COLLATE utf8mb4_unicode_ci LIMIT 1;
SELECT @user_id := userID FROM users WHERE employee_number COLLATE utf8mb4_unicode_ci = @user_employee_number COLLATE utf8mb4_unicode_ci LIMIT 1;
SELECT @form_id := formID FROM accountability_forms WHERE form_number COLLATE utf8mb4_unicode_ci = @form_number COLLATE utf8mb4_unicode_ci LIMIT 1;

-- Verify we found all the required IDs
SELECT CONCAT('Asset ID: ', COALESCE(@asset_id, 'NOT FOUND')) AS asset_check;
SELECT CONCAT('User ID: ', COALESCE(@user_id, 'NOT FOUND')) AS user_check;
SELECT CONCAT('Form ID: ', COALESCE(@form_id, 'NOT FOUND')) AS form_check;

-- Get user's department from user record
SELECT @department_id := department_id FROM users WHERE userID = @user_id;
-- Location fields are optional, set to NULL
SET @location_id = NULL;
SET @location_room_id = NULL;

-- Generate a new assignment UUID
SET @assignment_id = UUID();

-- Insert the new asset assignment
INSERT INTO asset_assignments (
  assignmentID,
  asset_id,
  user_id,
  department_id,
  location_id,
  location_room_id,
  assigned_date,
  assignment_notes,
  status,
  assigned_by,
  created_at,
  updated_at
) VALUES (
  @assignment_id,
  @asset_id,
  @user_id,
  @department_id,
  @location_id,
  @location_room_id,
  NOW(),
  'Assigned via migration for accountability form',
  'Active',
  @user_id,
  NOW(),
  NOW()
);

-- Get the asset details to add to the accountability form's assets_data JSON
-- Look up actual names from related tables instead of using IDs
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

-- Update the accountability form to link the assignment
-- Only update assignment_id if it's NULL (preserve existing)
-- UPDATE accountability_forms
-- SET assignment_id = @assignment_id
-- WHERE formID = @form_id AND assignment_id IS NULL;

-- Update the assets_data JSON to include the new asset
-- SAFER APPROACH: Use a single UPDATE with conditional logic
UPDATE accountability_forms
SET assets_data = 
  CASE 
    -- If assets_data is NULL, create new structure with the new asset
    WHEN assets_data IS NULL THEN
      JSON_OBJECT('assets', JSON_ARRAY(@asset_details), 'assignment_ids', JSON_ARRAY(@assignment_id))
    -- If assets exists and has assets array, append to it
    WHEN JSON_EXTRACT(assets_data, '$.assets') IS NOT NULL THEN
      JSON_SET(
        JSON_SET(assets_data, '$.assets', JSON_ARRAY_APPEND(JSON_EXTRACT(assets_data, '$.assets'), '$', @asset_details)),
        '$.assignment_ids',
        JSON_ARRAY_APPEND(COALESCE(JSON_EXTRACT(assets_data, '$.assignment_ids'), JSON_ARRAY()), '$', @assignment_id)
      )
    -- If assets_data exists but doesn't have assets array, create it
    ELSE
      JSON_SET(
        JSON_SET(assets_data, '$.assets', JSON_ARRAY(@asset_details)),
        '$.assignment_ids',
        JSON_ARRAY_APPEND(COALESCE(JSON_EXTRACT(assets_data, '$.assignment_ids'), JSON_ARRAY()), '$', @assignment_id)
      )
  END
WHERE formID = @form_id;

-- DO NOT overwrite asset_id - accountability forms can have multiple assets
-- UPDATE accountability_forms
-- SET asset_id = @asset_id
-- WHERE formID = @form_id AND asset_id IS NULL;

-- Verify the migration
SELECT 'Migration completed successfully' AS status;
SELECT CONCAT('New Assignment ID: ', @assignment_id) AS assignment_created;
SELECT CONCAT('Asset: ', @asset_code, ' assigned to User: ', @user_employee_id) AS assignment_details;
SELECT CONCAT('Linked to Accountability Form: ', @form_number) AS form_linked;
