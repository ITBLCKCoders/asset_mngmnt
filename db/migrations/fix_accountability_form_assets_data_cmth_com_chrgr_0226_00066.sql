-- Fix: Rebuild assets_data for accountability form 005-108-1021-052026-0001
-- This fixes the PDF generation error by ensuring all assets have proper code fields

USE `asset_mngmnt`;

-- Set variables
SET @form_number = '005-108-1021-052026-0001';

-- Get the form ID
SELECT @form_id := formID FROM accountability_forms WHERE form_number COLLATE utf8mb4_unicode_ci = @form_number COLLATE utf8mb4_unicode_ci LIMIT 1;

-- Rebuild assets_data with correct structure using actual assignments
UPDATE accountability_forms af
SET assets_data = (
  SELECT JSON_OBJECT(
    'assets', (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', a.assetID,
          'code', a.asset_code,
          'name', a.`name`,
          'type', (SELECT `name` FROM asset_types WHERE typeID = a.type_id),
          'brand', (SELECT `name` FROM asset_brands WHERE brandID = a.brand),
          'modelNo', a.model,
          'category', (SELECT `name` FROM asset_categories WHERE categoryID = a.category_id),
          'serialNo', a.serial,
          'department', (SELECT `name` FROM asset_mngmnt_departments WHERE departmentID = a.department_id)
        )
      )
      FROM asset_assignments aa
      JOIN assets a ON aa.asset_id = a.assetID
      WHERE aa.user_id = af.user_id
      AND aa.status = 'Active'
    ),
    'assignment_ids', (
      SELECT JSON_ARRAYAGG(aa.assignmentID)
      FROM asset_assignments aa
      WHERE aa.user_id = af.user_id
      AND aa.status = 'Active'
    )
  )
)
WHERE formID = @form_id;

-- Verify the fix
SELECT 'Assets data rebuilt successfully' AS status;
SELECT CONCAT('Form: ', @form_number) AS form_updated;
SELECT assets_data FROM accountability_forms WHERE formID = @form_id;
