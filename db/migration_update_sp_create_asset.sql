-- Migration to update sp_create_asset stored procedure for department-based sequencing

USE `asset_mngmnt`;

-- Drop existing procedure if it exists
DROP PROCEDURE IF EXISTS `sp_create_asset`;

DELIMITER ;;

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_asset`(
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
    IN p_created_by CHAR(36),
    IN p_updated_by CHAR(36),
    IN p_created_at DATETIME
)
BEGIN
    DECLARE new_id CHAR(36);
    DECLARE asset_code VARCHAR(50);
    DECLARE seq_num INT DEFAULT 1;
    DECLARE company_part VARCHAR(50) DEFAULT '';
    DECLARE category_part VARCHAR(50) DEFAULT '';
    DECLARE type_part VARCHAR(50) DEFAULT '';
    DECLARE department_part VARCHAR(50) DEFAULT '';
    DECLARE date_part VARCHAR(10) DEFAULT '';
    DECLARE settings_company_format VARCHAR(10);
    DECLARE settings_category_format VARCHAR(10);
    DECLARE settings_type_format VARCHAR(10);
    DECLARE settings_department_format VARCHAR(10);
    DECLARE settings_include_date TINYINT;
    DECLARE category_dept_id CHAR(36);

    -- If created_at is NULL, use current timestamp
    IF p_created_at IS NULL THEN
        SET p_created_at = NOW();
    END IF;

    SET new_id = UUID();

    -- Get asset ID format settings for the company
    SELECT
        company_format, category_format, type_format, department_format, include_date
    INTO
        settings_company_format, settings_category_format, settings_type_format, settings_department_format, settings_include_date
    FROM asset_id_format_settings
    WHERE company_id = p_company_id AND deleted_at IS NULL
    LIMIT 1;

    -- Set defaults if no settings found
    IF settings_company_format IS NULL THEN
        SET settings_company_format = 'code';
        SET settings_category_format = 'prefix';
        SET settings_type_format = 'prefix';
        SET settings_department_format = 'none';
        SET settings_include_date = 1;
    END IF;

    -- Get department_id from category
    SELECT department_id INTO category_dept_id 
    FROM asset_categories 
    WHERE categoryID = p_category_id;

    -- Generate company part
    IF settings_company_format != 'none' THEN
        IF settings_company_format = 'code' THEN
            SELECT code INTO company_part FROM companies WHERE companyID = p_company_id;
        ELSE
            SELECT prefix INTO company_part FROM companies WHERE companyID = p_company_id;
        END IF;
    END IF;

    -- Generate category part
    IF settings_category_format != 'none' AND p_category_id IS NOT NULL THEN
        IF settings_category_format = 'prefix' THEN
            SELECT prefix INTO category_part FROM asset_categories WHERE categoryID = p_category_id;
        ELSE
            SELECT gl_code INTO category_part FROM asset_categories WHERE categoryID = p_category_id;
        END IF;
    END IF;

    -- Generate type part
    IF settings_type_format != 'none' AND p_type_id IS NOT NULL THEN
        IF settings_type_format = 'prefix' THEN
            SELECT prefix INTO type_part FROM asset_types WHERE typeID = p_type_id;
        ELSE
            -- Fallback to first 8 chars of typeID if no prefix
            SELECT LEFT(typeID, 8) INTO type_part FROM asset_types WHERE typeID = p_type_id;
        END IF;
    END IF;

    -- Generate department part
    IF settings_department_format != 'none' THEN
        -- Use category's department_id if available, otherwise use p_department_id
        DECLARE dept_to_use CHAR(36);
        SET dept_to_use = COALESCE(category_dept_id, p_department_id);
        
        IF dept_to_use IS NOT NULL THEN
            IF settings_department_format = 'code' THEN
                SELECT code INTO department_part FROM asset_mngmnt_departments WHERE departmentID = dept_to_use;
            ELSE
                SELECT prefix INTO department_part FROM asset_mngmnt_departments WHERE departmentID = dept_to_use;
            END IF;
        END IF;
    END IF;

    -- Generate date part
    IF settings_include_date = 1 THEN
        IF p_is_old_unit = 1 THEN
            SET date_part = 'OU';
        ELSE
            SET date_part = COALESCE(DATE_FORMAT(p_purchase_date, '%m%y'), 'OU');
        END IF;
    END IF;

    -- Generate sequential number per company + department using atomic counter
    -- Use category's department_id if available, otherwise use p_department_id
    DECLARE counter_dept_id CHAR(36);
    SET counter_dept_id = COALESCE(category_dept_id, p_department_id);
    
    INSERT INTO asset_counters (company_id, department_id, last_seq) 
    VALUES (p_company_id, counter_dept_id, 1)
    ON DUPLICATE KEY UPDATE last_seq = last_seq + 1;
    
    SELECT last_seq INTO seq_num 
    FROM asset_counters 
    WHERE company_id = p_company_id 
      AND department_id = counter_dept_id;

    -- Build asset code
    SET asset_code = CONCAT_WS('-',
        NULLIF(company_part, ''),
        NULLIF(category_part, ''),
        NULLIF(type_part, ''),
        NULLIF(department_part, ''),
        NULLIF(date_part, ''),
        LPAD(seq_num, 5, '0')
    );

    INSERT INTO assets (
        assetID, asset_code, name, description, category_id, supplier, type_id, brand, model, serial,
        image_url, purchase_date, asset_value, salvage_value, depreciation_method,
        useful_life_years, annual_depreciation, depreciation_start_date, company_id,
        location_id, location_room_id, department_id, location_notes, warranty_months,
        `condition`, maintenance_schedule, status, is_old_unit, created_by, updated_by, created_at
    ) VALUES (
        new_id, asset_code, p_name, p_description, p_category_id, p_supplier, p_type_id, p_brand, p_model, p_serial,
        p_image_url, p_purchase_date, p_asset_value, p_salvage_value, p_depreciation_method,
        p_useful_life_years, p_annual_depreciation, p_depreciation_start_date, p_company_id,
        p_location_id, p_location_room_id, p_department_id, p_location_notes, p_warranty_months,
        p_condition, p_maintenance_schedule, p_status, p_is_old_unit, p_created_by, p_updated_by, p_created_at
    );

    SELECT * FROM assets WHERE assetID = new_id;
END ;;

DELIMITER ;
