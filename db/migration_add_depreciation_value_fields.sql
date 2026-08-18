-- Migration: Add book value, accumulated depreciation, and depreciation per month
-- to assets.
--
-- Purpose: Track the current net book value (`book_value`), the total
-- depreciation accumulated so far (`accumulated_depreciation`), and the
-- per-month depreciation amount (`monthly_depreciation`) for each asset.
--
-- The columns are nullable DECIMALs (same shape as `annual_depreciation`) so
-- existing rows / old units without financial data stay NULL until entered.
--
-- Note: `sp_get_assets_filtered` and `sp_get_asset_by_code` select `a.*`, so
-- they automatically expose the new columns. `sp_get_assets` lists columns
-- explicitly and is redefined below to include them.

USE `asset_mngmnt`;

-- ============================================================
-- 1) Add columns (idempotent: skip each if it already exists)
-- ============================================================
SET @book_col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'asset_mngmnt' AND TABLE_NAME = 'assets' AND COLUMN_NAME = 'book_value'
);
SET @sql := IF(
  @book_col_exists = 0,
  'ALTER TABLE `assets` ADD COLUMN `book_value` DECIMAL(15,2) NULL AFTER `annual_depreciation`',
  'SELECT ''book_value column already exists - skipping'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @acc_dep_col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'asset_mngmnt' AND TABLE_NAME = 'assets' AND COLUMN_NAME = 'accumulated_depreciation'
);
SET @sql := IF(
  @acc_dep_col_exists = 0,
  'ALTER TABLE `assets` ADD COLUMN `accumulated_depreciation` DECIMAL(15,2) NULL AFTER `book_value`',
  'SELECT ''accumulated_depreciation column already exists - skipping'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @monthly_dep_col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'asset_mngmnt' AND TABLE_NAME = 'assets' AND COLUMN_NAME = 'monthly_depreciation'
);
SET @sql := IF(
  @monthly_dep_col_exists = 0,
  'ALTER TABLE `assets` ADD COLUMN `monthly_depreciation` DECIMAL(15,2) NULL AFTER `accumulated_depreciation`',
  'SELECT ''monthly_depreciation column already exists - skipping'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 2) Backfill existing rows with sensible defaults
-- ============================================================
SET SESSION SQL_SAFE_UPDATES = 0;
UPDATE `assets`
SET `accumulated_depreciation` = 0
WHERE `accumulated_depreciation` IS NULL;

UPDATE `assets`
SET `monthly_depreciation` = ROUND(COALESCE(`annual_depreciation`, 0) / 12, 2)
WHERE `monthly_depreciation` IS NULL;

UPDATE `assets`
SET `book_value` = COALESCE(`asset_value`, 0) - COALESCE(`accumulated_depreciation`, 0)
WHERE `book_value` IS NULL;
SET SESSION SQL_SAFE_UPDATES = 1;

-- ============================================================
-- 3) Redefine sp_create_asset with the three new params
-- ============================================================
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
    IN p_condition ENUM('New','Excellent','Good','Fair','Poor','Bad','Needs Repair','Obsolete','Damaged'),
    IN p_maintenance_schedule ENUM('Monthly','Quarterly','Semi-Annual','Annually','As Needed','None'),
    IN p_status ENUM('Available','In Use','Under Maintenance','Retired','Disposed','Lost'),
    IN p_is_old_unit TINYINT(1),
    IN p_created_by CHAR(36),
    IN p_updated_by CHAR(36),
    IN p_created_at DATETIME,
    IN p_book_value DECIMAL(15,2),
    IN p_accumulated_depreciation DECIMAL(15,2),
    IN p_monthly_depreciation DECIMAL(15,2)
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
    DECLARE dept_to_use CHAR(36);
    DECLARE counter_dept_id CHAR(36);

    IF p_created_at IS NULL THEN
        SET p_created_at = NOW();
    END IF;

    SET new_id = UUID();

    SELECT
        company_format, category_format, type_format, department_format, include_date
    INTO
        settings_company_format, settings_category_format, settings_type_format, settings_department_format, settings_include_date
    FROM asset_id_format_settings
    WHERE company_id = p_company_id AND deleted_at IS NULL
    LIMIT 1;

    IF settings_company_format IS NULL THEN
        SET settings_company_format = 'code';
        SET settings_category_format = 'prefix';
        SET settings_type_format = 'prefix';
        SET settings_department_format = 'none';
        SET settings_include_date = 1;
    END IF;

    SELECT department_id INTO category_dept_id
    FROM asset_categories
    WHERE categoryID = p_category_id;

    IF settings_company_format != 'none' THEN
        IF settings_company_format = 'code' THEN
            SELECT code INTO company_part FROM companies WHERE companyID = p_company_id;
        ELSE
            SELECT prefix INTO company_part FROM companies WHERE companyID = p_company_id;
        END IF;
    END IF;

    IF settings_category_format != 'none' AND p_category_id IS NOT NULL THEN
        IF settings_category_format = 'prefix' THEN
            SELECT prefix INTO category_part FROM asset_categories WHERE categoryID = p_category_id;
        ELSE
            SELECT gl_code INTO category_part FROM asset_categories WHERE categoryID = p_category_id;
        END IF;
    END IF;

    IF settings_type_format != 'none' AND p_type_id IS NOT NULL THEN
        IF settings_type_format = 'prefix' THEN
            SELECT prefix INTO type_part FROM asset_types WHERE typeID = p_type_id;
        ELSE
            SELECT LEFT(typeID, 8) INTO type_part FROM asset_types WHERE typeID = p_type_id;
        END IF;
    END IF;

    IF settings_department_format != 'none' THEN
        SET dept_to_use = COALESCE(category_dept_id, p_department_id);

        IF dept_to_use IS NOT NULL THEN
            IF settings_department_format = 'code' THEN
                SELECT code INTO department_part FROM asset_mngmnt_departments WHERE departmentID = dept_to_use;
            ELSE
                SELECT prefix INTO department_part FROM asset_mngmnt_departments WHERE departmentID = dept_to_use;
            END IF;
        END IF;
    END IF;

    IF settings_include_date = 1 THEN
        IF p_is_old_unit = 1 THEN
            SET date_part = 'OU';
        ELSE
            SET date_part = COALESCE(DATE_FORMAT(p_purchase_date, '%m%y'), 'OU');
        END IF;
    END IF;

    SET counter_dept_id = COALESCE(category_dept_id, p_department_id);

    INSERT INTO asset_counters (company_id, department_id, last_seq)
    VALUES (p_company_id, counter_dept_id, 1)
    ON DUPLICATE KEY UPDATE last_seq = last_seq + 1;

    SELECT last_seq INTO seq_num
    FROM asset_counters
    WHERE company_id = p_company_id
      AND department_id = counter_dept_id;

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
        useful_life_years, annual_depreciation, book_value, accumulated_depreciation,
        monthly_depreciation, depreciation_start_date, company_id,
        location_id, location_room_id, department_id, location_notes, warranty_months,
        `condition`, maintenance_schedule, status, is_old_unit, created_by, updated_by, created_at
    ) VALUES (
        new_id, asset_code, p_name, p_description, p_category_id, p_supplier, p_type_id, p_brand, p_model, p_serial,
        p_image_url, p_purchase_date, p_asset_value, p_salvage_value, p_depreciation_method,
        p_useful_life_years, p_annual_depreciation, p_book_value, p_accumulated_depreciation,
        p_monthly_depreciation, p_depreciation_start_date, p_company_id,
        p_location_id, p_location_room_id, p_department_id, p_location_notes, p_warranty_months,
        p_condition, p_maintenance_schedule, p_status, p_is_old_unit, p_created_by, p_updated_by, p_created_at
    );

    SELECT * FROM assets WHERE assetID = new_id;
END ;;

DELIMITER ;

-- ============================================================
-- 4) Redefine sp_update_asset with the three new params
-- ============================================================
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
    IN p_condition ENUM('New','Excellent','Good','Fair','Poor','Bad','Needs Repair','Obsolete','Damaged'),
    IN p_maintenance_schedule ENUM('Monthly','Quarterly','Semi-Annual','Annually','As Needed','None'),
    IN p_status ENUM('Available','In Use','Under Maintenance','Retired','Disposed','Lost'),
    IN p_is_old_unit TINYINT(1),
    IN p_updated_by CHAR(36),
    IN p_book_value DECIMAL(15,2),
    IN p_accumulated_depreciation DECIMAL(15,2),
    IN p_monthly_depreciation DECIMAL(15,2)
)
BEGIN
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
        book_value = p_book_value,
        accumulated_depreciation = p_accumulated_depreciation,
        monthly_depreciation = p_monthly_depreciation,
        depreciation_start_date = p_depreciation_start_date,
        company_id = p_company_id,
        location_id = p_location_id,
        location_room_id = p_location_room_id,
        department_id = p_department_id,
        location_notes = p_location_notes,
        warranty_months = p_warranty_months,
        `condition` = p_condition,
        maintenance_schedule = p_maintenance_schedule,
        status = p_status,
        is_old_unit = p_is_old_unit,
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE assetID = p_asset_id AND deleted_at IS NULL;

    SELECT * FROM assets WHERE assetID = p_asset_id;
END ;;

DELIMITER ;

-- ============================================================
-- 5) Redefine sp_get_assets to expose the new columns
-- ============================================================
DROP PROCEDURE IF EXISTS `sp_get_assets`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_assets`()
BEGIN
    SELECT
        a.assetID, a.asset_code, a.tag_code, a.name, a.description, a.category_id, a.supplier, a.type_id, a.brand, a.model, a.serial,
        a.image_url, a.purchase_date, a.asset_value, a.salvage_value, a.depreciation_method,
        a.useful_life_years, a.annual_depreciation, a.book_value, a.accumulated_depreciation,
        a.monthly_depreciation, a.depreciation_start_date, a.company_id,
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

SELECT 'Migration applied: book_value, accumulated_depreciation, monthly_depreciation added to assets.' AS result;
