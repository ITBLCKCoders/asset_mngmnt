-- Update sp_get_assets to include company_logo_url
-- This allows asset tagging page to render each asset's own company logo

DROP PROCEDURE IF EXISTS sp_get_assets;

DELIMITER ;;

CREATE PROCEDURE sp_get_assets()
BEGIN
    SELECT
        a.assetID, a.asset_code, a.name, a.description, a.category_id, a.supplier, a.type_id, a.brand, a.model, a.serial,
        a.image_url, a.purchase_date, a.asset_value, a.salvage_value, a.depreciation_method,
        a.useful_life_years, a.annual_depreciation, a.depreciation_start_date, a.company_id,
        a.location_id, a.location_room_id, a.department_id, a.location_notes, a.warranty_months,
        a.`condition`, a.maintenance_schedule, a.status, a.is_old_unit, a.created_at, a.created_by, a.updated_at, a.updated_by, a.deleted_at, a.deleted_by,
        c.name as category_name,
        t.name as type_name,
        comp.name as company_name,
        comp.logo_url as company_logo_url,
        l.name as location_name,
        l.building as building,
        lr.room_name,
        CASE WHEN d.departmentID IS NOT NULL THEN
            CONCAT('{"departmentID":"', IFNULL(d.departmentID, ''), '","name":"', IFNULL(REPLACE(REPLACE(d.name, '\\', '\\\\'), '"', '\\"'), ''), '","code":"', IFNULL(REPLACE(REPLACE(d.code, '\\', '\\\\'), '"', '\\"'), ''), '","prefix":"', IFNULL(REPLACE(REPLACE(d.prefix, '\\', '\\\\'), '"', '\\"'), ''), '","description":"', IFNULL(REPLACE(REPLACE(d.description, '\\', '\\\\'), '"', '\\"'), ''), '"}')
        ELSE NULL END as department,
        CONCAT(COALESCE(uc.first_name, ''), ' ', COALESCE(uc.last_name, '')) as created_by_name,
        CONCAT(COALESCE(uu.first_name, ''), ' ', COALESCE(uu.last_name, '')) as updated_by_name
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.categoryID AND c.deleted_at IS NULL
    LEFT JOIN asset_types t ON a.type_id = t.typeID AND t.deleted_at IS NULL
    LEFT JOIN companies comp ON a.company_id = comp.companyID AND comp.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_locations l ON a.location_id = l.locationID AND l.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_location_rooms lr ON a.location_room_id = lr.roomID AND lr.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_departments d ON a.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN users uc ON a.created_by = uc.userID
    LEFT JOIN users uu ON a.updated_by = uu.userID
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC;
END ;;

DELIMITER ;
