-- Migration: Update sp_update_asset to recalculate next_maintenance_date when schedule changes
-- This recalculates the next maintenance date based on the maintenance schedule and creation/purchase date

USE `asset_mngmnt`;

DROP PROCEDURE IF EXISTS `sp_update_asset`;

DELIMITER ;;

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_asset`(
    IN p_asset_id CHAR(36),
    IN p_name VARCHAR(255),
    IN p_description TEXT,
    IN p_category_id CHAR(36),
    IN p_supplier VARCHAR(255),
    IN p_type_id CHAR(36),
    IN p_brand VARCHAR(255),
    IN p_model VARCHAR(255),
    IN p_serial VARCHAR(255),
    IN p_image_url MEDIUMTEXT,
    IN p_purchase_date DATE,
    IN p_asset_value DECIMAL(15,2),
    IN p_salvage_value DECIMAL(15,2),
    IN p_depreciation_method ENUM('straight-line','declining-balance','double-declining','units-of-production'),
    IN p_useful_life_years INT,
    IN p_annual_depreciation DECIMAL(15,2),
    IN p_depreciation_start_date DATE,
    IN p_company_id CHAR(36),
    IN p_location_id CHAR(36),
    IN p_location_room_id CHAR(36),
    IN p_department_id CHAR(36),
    IN p_location_notes TEXT,
    IN p_warranty_months INT,
    IN p_condition ENUM('Excellent','Good','Fair','Poor','Damaged'),
    IN p_maintenance_schedule ENUM('Monthly','Quarterly','Semi-Annual','Annually','As Needed','None'),
    IN p_status ENUM('Available','In Use','Under Maintenance','Retired','Disposed','Lost'),
    IN p_is_old_unit TINYINT(1),
    IN p_updated_by CHAR(36)
)
BEGIN
    DECLARE v_next_maintenance_date DATE DEFAULT NULL;
    DECLARE v_anchor_date DATE DEFAULT NULL;

    -- Get the anchor date for calculation (prefer purchase_date, else created_at)
    SELECT COALESCE(p_purchase_date, created_at) INTO v_anchor_date
    FROM assets
    WHERE assetID = p_asset_id AND deleted_at IS NULL
    LIMIT 1;

    -- Calculate next maintenance date based on schedule and anchor date
    SET v_next_maintenance_date = CASE
        WHEN p_maintenance_schedule = 'Monthly' AND v_anchor_date IS NOT NULL THEN DATE_ADD(v_anchor_date, INTERVAL 1 MONTH)
        WHEN p_maintenance_schedule = 'Quarterly' AND v_anchor_date IS NOT NULL THEN DATE_ADD(v_anchor_date, INTERVAL 3 MONTH)
        WHEN p_maintenance_schedule = 'Semi-Annual' AND v_anchor_date IS NOT NULL THEN DATE_ADD(v_anchor_date, INTERVAL 6 MONTH)
        WHEN p_maintenance_schedule = 'Annually' AND v_anchor_date IS NOT NULL THEN DATE_ADD(v_anchor_date, INTERVAL 12 MONTH)
        ELSE NULL
    END;

    UPDATE assets SET
        name = p_name,
        description = p_description,
        category_id = p_category_id,
        supplier = p_supplier,
        type_id = p_type_id,
        brand = p_brand,
        model = p_model,
        serial = p_serial,
        image_url = p_image_url,
        purchase_date = p_purchase_date,
        asset_value = p_asset_value,
        salvage_value = p_salvage_value,
        depreciation_method = p_depreciation_method,
        useful_life_years = p_useful_life_years,
        annual_depreciation = p_annual_depreciation,
        depreciation_start_date = p_depreciation_start_date,
        company_id = p_company_id,
        location_id = p_location_id,
        location_room_id = p_location_room_id,
        department_id = p_department_id,
        location_notes = p_location_notes,
        warranty_months = p_warranty_months,
        `condition` = p_condition,
        maintenance_schedule = p_maintenance_schedule,
        next_maintenance_date = v_next_maintenance_date,
        status = p_status,
        is_old_unit = p_is_old_unit,
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE assetID = p_asset_id AND deleted_at IS NULL;

    SELECT * FROM assets WHERE assetID = p_asset_id;
END ;;

DELIMITER ;
