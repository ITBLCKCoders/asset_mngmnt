-- Migration: Add next_maintenance_date column to assets table
-- This column will store the calculated next maintenance date based on the maintenance schedule

USE `asset_mngmnt`;

-- Add next_maintenance_date column to assets table (if not exists)
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'asset_mngmnt'
    AND TABLE_NAME = 'assets'
    AND COLUMN_NAME = 'next_maintenance_date'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `assets` ADD COLUMN `next_maintenance_date` DATE NULL COMMENT ''Calculated next maintenance date based on maintenance schedule and creation/purchase date'' AFTER `maintenance_schedule`',
    'SELECT ''Column next_maintenance_date already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill existing assets: calculate next maintenance date for assets with a maintenance schedule
SET SQL_SAFE_UPDATES = 0;
UPDATE assets a
JOIN (
    SELECT assetID, maintenance_schedule, purchase_date, created_at
    FROM assets
    WHERE maintenance_schedule IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annually')
    AND deleted_at IS NULL
) AS sub ON a.assetID = sub.assetID
SET a.next_maintenance_date = CASE
    WHEN sub.maintenance_schedule = 'Monthly' THEN DATE_ADD(COALESCE(sub.purchase_date, sub.created_at), INTERVAL 1 MONTH)
    WHEN sub.maintenance_schedule = 'Quarterly' THEN DATE_ADD(COALESCE(sub.purchase_date, sub.created_at), INTERVAL 3 MONTH)
    WHEN sub.maintenance_schedule = 'Semi-Annual' THEN DATE_ADD(COALESCE(sub.purchase_date, sub.created_at), INTERVAL 6 MONTH)
    WHEN sub.maintenance_schedule = 'Annually' THEN DATE_ADD(COALESCE(sub.purchase_date, sub.created_at), INTERVAL 12 MONTH)
    ELSE NULL
END;
SET SQL_SAFE_UPDATES = 1;
-- End of add_next_maintenance_date_column.sql

-- Update condition ENUM to include all UI values and old values for backward compatibility
ALTER TABLE assets MODIFY COLUMN `condition` ENUM('New','Excellent','Good','Fair','Poor','Bad','Needs Repair','Obsolete','Damaged') DEFAULT NULL;

-- Update sp_create_asset stored procedure to accept new condition values
DROP PROCEDURE IF EXISTS `sp_create_asset`;

DELIMITER ;;
CREATE PROCEDURE `sp_create_asset`(
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
    DECLARE default_dept_id CHAR(36);
    DECLARE category_name VARCHAR(255) DEFAULT NULL;
    DECLARE category_prefix VARCHAR(10) DEFAULT NULL;
    DECLARE dept_company_id CHAR(36) DEFAULT NULL;

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

    -- Get department_id and name/prefix from category (for IT vs Admin resolution)
    SELECT ac.department_id, ac.name, ac.prefix
    INTO category_dept_id, category_name, category_prefix
    FROM asset_categories ac
    WHERE ac.categoryID = p_category_id AND ac.deleted_at IS NULL
    LIMIT 1;

    -- If category has a department, ensure it belongs to the asset's company (p_company_id)
    IF category_dept_id IS NOT NULL THEN
        SELECT d.company_id INTO dept_company_id
        FROM asset_mngmnt_departments d
        WHERE d.departmentID = category_dept_id AND d.deleted_at IS NULL
        LIMIT 1;
        IF dept_company_id IS NULL OR dept_company_id != p_company_id THEN
            SET category_dept_id = NULL;
        END IF;
    END IF;

    -- If still no department: resolve by category type (IT asset -> IT Department, Admin asset -> Administration Department)
    -- so every company numbers like main company (IT 1,2,3... and Admin 1,2,3...).
    IF category_dept_id IS NULL AND p_category_id IS NOT NULL AND p_company_id IS NOT NULL THEN
        IF (category_prefix = 'ITOFE' OR (category_name IS NOT NULL AND (category_name LIKE '%IT%' OR category_name LIKE '%Information Technology%'))) THEN
            SELECT departmentID INTO category_dept_id
            FROM asset_mngmnt_departments
            WHERE company_id = p_company_id AND deleted_at IS NULL
              AND (name LIKE '%IT%' OR name LIKE '%Information Technology%')
            LIMIT 1;
        ELSEIF (category_prefix = 'ADMOFE' OR (category_name IS NOT NULL AND (category_name LIKE '%Admin%' OR category_name LIKE '%Administration%'))) THEN
            SELECT departmentID INTO category_dept_id
            FROM asset_mngmnt_departments
            WHERE company_id = p_company_id AND deleted_at IS NULL
              AND (name LIKE '%Admin%' OR name LIKE '%Administration%')
            LIMIT 1;
        END IF;
    END IF;

    IF category_dept_id IS NULL THEN
        SET category_dept_id = p_department_id;
    END IF;

    IF category_dept_id IS NULL THEN
        SELECT departmentID INTO default_dept_id
        FROM asset_mngmnt_departments
        WHERE name = 'Default' AND company_id = p_company_id AND deleted_at IS NULL
        LIMIT 1;

        IF default_dept_id IS NULL THEN
            SET default_dept_id = UUID();
            INSERT INTO asset_mngmnt_departments (
                departmentID, name, code, prefix, description, company_id, created_by, updated_by
            ) VALUES (
                default_dept_id, 'Default', 'DEF', 'DEF', 'Default department for assets with no specific department',
                p_company_id, p_created_by, p_updated_by
            );
        END IF;

        SET category_dept_id = default_dept_id;
    END IF;

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
        SET @dept_to_use = COALESCE(category_dept_id, p_department_id);
        IF @dept_to_use IS NOT NULL THEN
            IF settings_department_format = 'code' THEN
                SELECT code INTO department_part FROM asset_mngmnt_departments WHERE departmentID = @dept_to_use;
            ELSE
                SELECT prefix INTO department_part FROM asset_mngmnt_departments WHERE departmentID = @dept_to_use;
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

    SET @counter_dept_id = COALESCE(category_dept_id, p_department_id);

    INSERT INTO asset_counters (company_id, department_id, last_seq)
    VALUES (p_company_id, @counter_dept_id, 1)
    ON DUPLICATE KEY UPDATE last_seq = last_seq + 1;

    SELECT last_seq INTO seq_num
    FROM asset_counters
    WHERE company_id = p_company_id
      AND department_id = @counter_dept_id;

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

-- Update sp_update_asset stored procedure to accept new condition values
DROP PROCEDURE IF EXISTS `sp_update_asset`;

DELIMITER ;;
CREATE PROCEDURE `sp_update_asset`(
    IN p_asset_id CHAR(36),
    IN p_name VARCHAR(255),
    IN p_description TEXT,
    IN p_category_id CHAR(36),
    IN p_supplier VARCHAR(255),
    IN p_type_id CHAR(36),
    IN p_brand VARCHAR(255),
    IN p_model VARCHAR(255),
    IN p_serial VARCHAR(255),
    IN p_image_url TEXT,
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
    IN p_updated_by CHAR(36)
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
-- End of migration_update_condition_enum.sql

-- Migration to create custodians table
-- Version: dbv57
-- Date: 2026-01-18

CREATE TABLE IF NOT EXISTS custodians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    asset_type ENUM('it', 'admin') NOT NULL,
    manager_role ENUM('none', 'itManager', 'adminManager', 'overallManager') NOT NULL DEFAULT 'none',
    access_levels JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(userID) ON DELETE CASCADE,
    UNIQUE KEY unique_user_asset_type (user_id, asset_type)
);

-- Create indexes for faster queries
CREATE INDEX idx_custodians_user_id ON custodians(user_id);
CREATE INDEX idx_custodians_asset_type ON custodians(asset_type);
CREATE INDEX idx_custodians_manager_role ON custodians(manager_role);

-- Add comments to the table and columns
ALTER TABLE custodians COMMENT = 'Table to track custodians and their asset management permissions';
ALTER TABLE custodians MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT 'Foreign key to users table (userID)';
ALTER TABLE custodians MODIFY COLUMN asset_type ENUM('it', 'admin') NOT NULL COMMENT 'Type of asset the custodian manages: IT or Admin';
ALTER TABLE custodians MODIFY COLUMN manager_role ENUM('none', 'itManager', 'adminManager', 'overallManager') NOT NULL DEFAULT 'none' COMMENT 'Manager role: none, IT Asset Manager, Admin Asset Manager, or Overall Asset Manager';
ALTER TABLE custodians MODIFY COLUMN access_levels JSON NOT NULL COMMENT 'JSON object containing access levels: addEdit, assign, return, transfer, disposal';
-- End of migration_create_custodians_table.sql

-- Asset borrow requests (IT/Admin scoped category+type, return date, purpose).
-- After deploy: grant "Asset Borrowing" (view/create) to roles that may submit requests,
-- and "Borrow Request Management" (view) to IT/Admin manager roles via Users → Permissions.

CREATE TABLE IF NOT EXISTS `asset_borrow_requests` (
  `borrow_request_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `borrow_scope` enum('it','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expected_return_at` datetime NOT NULL,
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_dept_head',
  `dept_head_signed_at` datetime DEFAULT NULL,
  `dept_head_signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept_head_digital_signature` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `declined_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`borrow_request_id`),
  KEY `idx_abr_company_status` (`company_id`,`status`),
  KEY `idx_abr_borrow_scope` (`borrow_scope`),
  KEY `idx_abr_dept_pending` (`company_id`, `dept_head_signed_at`, `declined_at`),
  CONSTRAINT `fk_abr_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companyID`) ON DELETE CASCADE,
  CONSTRAINT `fk_abr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE,
  CONSTRAINT `fk_abr_category` FOREIGN KEY (`category_id`) REFERENCES `asset_categories` (`categoryID`),
  CONSTRAINT `fk_abr_type` FOREIGN KEY (`type_id`) REFERENCES `asset_types` (`typeID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- End of migration_create_asset_borrow_requests.sql

-- Migration: create asset_return_forms table (one row per return form) and link asset_returns via form_id
-- Run this on your asset_mngmnt database.

-- 1. Create asset_return_forms table (mirrors accountability_forms concept)
CREATE TABLE IF NOT EXISTS asset_return_forms (
  formID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  form_number VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  department_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  location_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  location_room_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (formID),
  UNIQUE KEY form_number (form_number),
  KEY idx_asset_return_forms_user_id (user_id),
  KEY idx_asset_return_forms_created_at (created_at),
  CONSTRAINT fk_asset_return_forms_user_id FOREIGN KEY (user_id) REFERENCES users (userID) ON DELETE CASCADE,
  CONSTRAINT fk_asset_return_forms_department_id FOREIGN KEY (department_id) REFERENCES asset_mngmnt_departments (departmentID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_return_forms_location_id FOREIGN KEY (location_id) REFERENCES asset_mngmnt_locations (locationID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_return_forms_location_room_id FOREIGN KEY (location_room_id) REFERENCES asset_mngmnt_location_rooms (roomID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_return_forms_created_by FOREIGN KEY (created_by) REFERENCES users (userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add form_id to asset_returns (FK to asset_return_forms)
ALTER TABLE asset_returns
  ADD COLUMN form_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL AFTER return_batch_id,
  ADD INDEX idx_asset_returns_form_id (form_id),
  ADD CONSTRAINT fk_asset_returns_form_id FOREIGN KEY (form_id) REFERENCES asset_return_forms (formID) ON DELETE SET NULL ON UPDATE CASCADE;
-- End of migration_create_asset_return_forms.sql

-- Migration to create asset_returns table
-- This table stores asset return records with PDF file paths

CREATE TABLE IF NOT EXISTS `asset_returns` (
  `return_id` varchar(36) NOT NULL,
  `assignment_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `return_condition` varchar(50) NOT NULL,
  `return_notes` text DEFAULT NULL,
  `pdf_file_path` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`return_id`),
  KEY `idx_asset_returns_assignment_id` (`assignment_id`),
  KEY `idx_asset_returns_user_id` (`user_id`),
  CONSTRAINT `fk_asset_returns_assignment_id` FOREIGN KEY (`assignment_id`) REFERENCES `asset_assignments` (`assignmentID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- End of migration_create_asset_returns_table.sql

-- Migration: create asset_transfer_forms, asset_transfer, asset_transfer_form_settings
-- and stored procedures for asset transfer flow.
-- Run on asset_mngmnt database.

-- 1. Create asset_transfer_form_settings table (mirror of asset_return_form_settings)
CREATE TABLE IF NOT EXISTS asset_transfer_form_settings (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  company_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  company_format ENUM('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'code',
  department_format ENUM('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  it_asset_transfer_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  admin_asset_transfer_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  include_date TINYINT NOT NULL DEFAULT 1,
  date_format ENUM('MMYYYY','YYYYMMDD') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'YYYYMMDD',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (id),
  KEY company_id (company_id),
  CONSTRAINT asset_transfer_form_settings_company_fk FOREIGN KEY (company_id) REFERENCES companies (companyID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create asset_transfer_forms table (one row per transfer form)
CREATE TABLE IF NOT EXISTS asset_transfer_forms (
  formID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  form_number VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  department_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  location_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  location_room_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  new_assigned_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  signed_at DATETIME DEFAULT NULL,
  signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  signed_digital_signature TEXT DEFAULT NULL,
  process_signed_at DATETIME DEFAULT NULL,
  process_digital_signature TEXT DEFAULT NULL,
  transfer_type VARCHAR(100) DEFAULT NULL,
  received_by VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (formID),
  UNIQUE KEY form_number (form_number),
  KEY idx_asset_transfer_forms_user_id (user_id),
  KEY idx_asset_transfer_forms_created_at (created_at),
  CONSTRAINT fk_asset_transfer_forms_user_id FOREIGN KEY (user_id) REFERENCES users (userID) ON DELETE CASCADE,
  CONSTRAINT fk_asset_transfer_forms_department_id FOREIGN KEY (department_id) REFERENCES asset_mngmnt_departments (departmentID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfer_forms_location_id FOREIGN KEY (location_id) REFERENCES asset_mngmnt_locations (locationID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfer_forms_location_room_id FOREIGN KEY (location_room_id) REFERENCES asset_mngmnt_location_rooms (roomID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfer_forms_new_assigned_user_id FOREIGN KEY (new_assigned_user_id) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfer_forms_created_by FOREIGN KEY (created_by) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfer_forms_signed_by FOREIGN KEY (signed_by) REFERENCES users (userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create asset_transfer table (per-asset transfer record)
CREATE TABLE IF NOT EXISTS asset_transfer (
  record_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  form_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  assignment_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  transfer_condition VARCHAR(50) DEFAULT NULL,
  transfer_notes TEXT DEFAULT NULL,
  condition_images JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (record_id),
  KEY idx_asset_transfer_form_id (form_id),
  KEY idx_asset_transfer_assignment_id (assignment_id),
  CONSTRAINT fk_asset_transfer_form_id FOREIGN KEY (form_id) REFERENCES asset_transfer_forms (formID) ON DELETE CASCADE,
  CONSTRAINT fk_asset_transfer_assignment_id FOREIGN KEY (assignment_id) REFERENCES asset_assignments (assignmentID) ON DELETE CASCADE,
  CONSTRAINT fk_asset_transfer_user_id FOREIGN KEY (user_id) REFERENCES users (userID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Stored procedure: sp_create_asset_transfer_form
DROP PROCEDURE IF EXISTS `sp_create_asset_transfer_form`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_asset_transfer_form`(
  IN p_form_id CHAR(36),
  IN p_form_number VARCHAR(50),
  IN p_user_id CHAR(36),
  IN p_department_id CHAR(36),
  IN p_location_id CHAR(36),
  IN p_location_room_id CHAR(36),
  IN p_new_assigned_user_id CHAR(36),
  IN p_created_by CHAR(36),
  IN p_process_signed_at DATETIME,
  IN p_process_digital_signature TEXT,
  IN p_transfer_type VARCHAR(100),
  IN p_received_by VARCHAR(100)
)
BEGIN
  INSERT INTO asset_transfer_forms (
    formID, form_number, user_id, department_id, location_id, location_room_id,
    new_assigned_user_id, created_by, process_signed_at, process_digital_signature,
    transfer_type, received_by
  ) VALUES (
    p_form_id, p_form_number, p_user_id, NULLIF(p_department_id, ''),
    NULLIF(p_location_id, ''), NULLIF(p_location_room_id, ''),
    NULLIF(p_new_assigned_user_id, ''),
    NULLIF(p_created_by, ''),
    p_process_signed_at, p_process_digital_signature,
    NULLIF(p_transfer_type, ''), NULLIF(p_received_by, '')
  );
  SELECT p_form_id AS formID;
END ;;
DELIMITER ;

-- 5. Stored procedure: sp_create_asset_transfer_record
DROP PROCEDURE IF EXISTS `sp_create_asset_transfer_record`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_asset_transfer_record`(
  IN p_record_id CHAR(36),
  IN p_form_id CHAR(36),
  IN p_assignment_id CHAR(36),
  IN p_user_id CHAR(36),
  IN p_transfer_condition VARCHAR(50),
  IN p_transfer_notes TEXT,
  IN p_condition_images JSON
)
BEGIN
  INSERT INTO asset_transfer (
    record_id, form_id, assignment_id, user_id,
    transfer_condition, transfer_notes, condition_images
  ) VALUES (
    p_record_id, p_form_id, p_assignment_id, p_user_id,
    NULLIF(p_transfer_condition, ''), p_transfer_notes, p_condition_images
  );
  SELECT p_record_id AS record_id;
END ;;
DELIMITER ;

-- 6. Stored procedure: sp_sign_asset_transfer_form
DROP PROCEDURE IF EXISTS `sp_sign_asset_transfer_form`;
DELIMITER ;;
CREATE PROCEDURE `sp_sign_asset_transfer_form`(
  IN p_form_id CHAR(36),
  IN p_signed_by CHAR(36),
  IN p_signed_digital_signature TEXT
)
BEGIN
  UPDATE asset_transfer_forms
  SET signed_at = NOW(),
      signed_by = p_signed_by,
      signed_digital_signature = p_signed_digital_signature,
      updated_at = NOW()
  WHERE formID = p_form_id AND deleted_at IS NULL;
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;

-- 7. Stored procedure: sp_get_asset_transfer_forms_by_user
DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_forms_by_user`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_transfer_forms_by_user`(IN p_user_id CHAR(36))
BEGIN
  SELECT
    atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id,
    atf.location_room_id, atf.new_assigned_user_id, atf.created_by, atf.created_at,
    atf.signed_at, atf.signed_by, atf.signed_digital_signature,
    DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
    atf.process_digital_signature, atf.transfer_type, atf.received_by
  FROM asset_transfer_forms atf
  WHERE atf.user_id = p_user_id AND atf.deleted_at IS NULL
  ORDER BY atf.created_at DESC;
END ;;
DELIMITER ;

-- 8. Stored procedure: sp_get_asset_transfer_form_by_id
DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_form_by_id`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_transfer_form_by_id`(IN p_form_id CHAR(36))
BEGIN
  SELECT
    atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id,
    atf.location_room_id, atf.new_assigned_user_id, atf.created_by, atf.created_at,
    atf.signed_at, atf.signed_by, atf.signed_digital_signature,
    DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
    atf.process_digital_signature, atf.transfer_type, atf.received_by
  FROM asset_transfer_forms atf
  WHERE atf.formID = p_form_id AND atf.deleted_at IS NULL
  LIMIT 1;
END ;;
DELIMITER ;

-- 9. Stored procedure: sp_get_asset_transfer_form_settings
DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_form_settings`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_transfer_form_settings`(IN p_company_id CHAR(36))
BEGIN
  SELECT id, company_id, company_format, department_format,
    it_asset_transfer_code, admin_asset_transfer_code,
    include_date, date_format, created_at, updated_at
  FROM asset_transfer_form_settings
  WHERE company_id = p_company_id AND deleted_at IS NULL
  LIMIT 1;
END ;;
DELIMITER ;

-- 10. Stored procedure: sp_upsert_asset_transfer_form_settings
DROP PROCEDURE IF EXISTS `sp_upsert_asset_transfer_form_settings`;
DELIMITER ;;
CREATE PROCEDURE `sp_upsert_asset_transfer_form_settings`(
  IN p_company_id CHAR(36),
  IN p_company_format VARCHAR(20),
  IN p_department_format VARCHAR(20),
  IN p_it_asset_transfer_code VARCHAR(50),
  IN p_admin_asset_transfer_code VARCHAR(50),
  IN p_include_date TINYINT,
  IN p_date_format VARCHAR(20),
  IN p_updated_by CHAR(36)
)
BEGIN
  DECLARE v_id CHAR(36);

  SELECT id INTO v_id FROM asset_transfer_form_settings
  WHERE company_id = p_company_id AND deleted_at IS NULL LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE asset_transfer_form_settings SET
      company_format = p_company_format,
      department_format = p_department_format,
      it_asset_transfer_code = NULLIF(p_it_asset_transfer_code, ''),
      admin_asset_transfer_code = NULLIF(p_admin_asset_transfer_code, ''),
      include_date = p_include_date,
      date_format = p_date_format,
      updated_by = p_updated_by,
      updated_at = NOW()
    WHERE id = v_id;
  ELSE
    INSERT INTO asset_transfer_form_settings (
      company_id, company_format, department_format,
      it_asset_transfer_code, admin_asset_transfer_code,
      include_date, date_format, created_by, updated_by
    ) VALUES (
      p_company_id, p_company_format, p_department_format,
      NULLIF(p_it_asset_transfer_code, ''), NULLIF(p_admin_asset_transfer_code, ''),
      p_include_date, p_date_format, p_updated_by, p_updated_by
    );
  END IF;
END ;;
DELIMITER ;
-- End of migration_create_asset_transfer_forms.sql

-- Migration: create asset_borrow_form_settings table for configurable borrowing form numbering.
-- Run this on your asset_mngmnt database.

CREATE TABLE IF NOT EXISTS asset_borrow_form_settings (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  company_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  company_format ENUM('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'code',
  department_format ENUM('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  it_asset_borrow_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  admin_asset_borrow_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  include_date TINYINT NOT NULL DEFAULT 1,
  date_format ENUM('MMYYYY','YYYYMMDD') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MMYYYY',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (id),
  KEY company_id (company_id),
  KEY created_by (created_by),
  KEY updated_by (updated_by),
  KEY deleted_by (deleted_by),
  CONSTRAINT asset_borrow_form_settings_company_fk FOREIGN KEY (company_id) REFERENCES companies (companyID) ON DELETE CASCADE,
  CONSTRAINT asset_borrow_form_settings_created_by_fk FOREIGN KEY (created_by) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT asset_borrow_form_settings_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT asset_borrow_form_settings_deleted_by_fk FOREIGN KEY (deleted_by) REFERENCES users (userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- End of migration_add_asset_borrow_form_settings.sql

-- Migration: create asset_return_form_settings table for configurable return form numbering.
-- Run this on your asset_mngmnt database.

CREATE TABLE IF NOT EXISTS asset_return_form_settings (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  company_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  company_format ENUM('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'code',
  department_format ENUM('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  it_asset_return_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  admin_asset_return_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  include_date TINYINT NOT NULL DEFAULT 1,
  date_format ENUM('MMYYYY','YYYYMMDD') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MMYYYY',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (id),
  KEY company_id (company_id),
  KEY created_by (created_by),
  KEY updated_by (updated_by),
  KEY deleted_by (deleted_by),
  CONSTRAINT asset_return_form_settings_company_fk FOREIGN KEY (company_id) REFERENCES companies (companyID) ON DELETE CASCADE,
  CONSTRAINT asset_return_form_settings_created_by_fk FOREIGN KEY (created_by) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT asset_return_form_settings_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT asset_return_form_settings_deleted_by_fk FOREIGN KEY (deleted_by) REFERENCES users (userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- End of migration_add_asset_return_form_settings.sql

-- Migration to add department_id column to asset_categories table
-- This adds a foreign key relationship to the departments table

ALTER TABLE `asset_categories` 
ADD COLUMN `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `gl_code`,
ADD KEY `idx_department_id` (`department_id`),
ADD CONSTRAINT `fk_asset_categories_department` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL;

-- Update existing categories to have a default department (optional)
-- You can run this if you want to assign a default department to existing categories
-- UPDATE `asset_categories` SET `department_id` = (SELECT `departmentID` FROM `asset_mngmnt_departments` WHERE `company_id` = `asset_categories`.`company_id` LIMIT 1) WHERE `department_id` IS NULL;
-- End of migration_add_department_to_categories.sql

-- Migration to add 'Disabled' status to accountability forms
-- This allows old accountability forms to be marked as disabled when new forms are created

USE `asset_mngmnt`;

-- Update the status column to include 'Disabled' in the enum
ALTER TABLE accountability_forms 
MODIFY COLUMN `status` enum('Pending','Signed','Completed','Revoked','Disabled') 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending';

-- Verify the change
SELECT COLUMN_TYPE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'asset_mngmnt' 
AND TABLE_NAME = 'accountability_forms' 
AND COLUMN_NAME = 'status';
-- End of migration_add_disabled_status.sql

-- Migration: add custodian/approver fields to asset_mngmnt_roles
-- For role-based permission templates (Add/Edit, Assignment, Return, HR Receiver, Manager Approvers).
-- Run this on your asset_mngmnt database.

ALTER TABLE asset_mngmnt_roles
  ADD COLUMN asset_type VARCHAR(20) DEFAULT NULL COMMENT 'it | admin' AFTER description,
  ADD COLUMN manager_role VARCHAR(30) DEFAULT NULL COMMENT 'none | itManager | adminManager | overallManager' AFTER asset_type,
  ADD COLUMN access_add_edit TINYINT NOT NULL DEFAULT 0 AFTER manager_role,
  ADD COLUMN access_assignment TINYINT NOT NULL DEFAULT 0 AFTER access_add_edit,
  ADD COLUMN access_return TINYINT NOT NULL DEFAULT 0 AFTER access_assignment,
  ADD COLUMN hr_accountability_receiver TINYINT NOT NULL DEFAULT 0 AFTER access_return,
  ADD COLUMN manager_approver_1 TINYINT NOT NULL DEFAULT 0 AFTER hr_accountability_receiver,
  ADD COLUMN manager_approver_2 TINYINT NOT NULL DEFAULT 0 AFTER manager_approver_1,
  ADD COLUMN manager_approver_3 TINYINT NOT NULL DEFAULT 0 AFTER manager_approver_2;
 
-- End of migration_add_role_custodian_fields.sql

-- Migration: Make asset numbering for all companies match main company behavior.
-- IT assets are numbered per company's IT Department (1, 2, 3...).
-- Admin assets are numbered per company's Administration Department (1, 2, 3...).
-- When a category has no department or the category's department belongs to another company,
-- we resolve by category type (IT vs Admin) using the asset's company.

USE `asset_mngmnt`;

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
    DECLARE default_dept_id CHAR(36);
    DECLARE category_name VARCHAR(255) DEFAULT NULL;
    DECLARE category_prefix VARCHAR(10) DEFAULT NULL;
    DECLARE dept_company_id CHAR(36) DEFAULT NULL;

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

    -- Get department_id and name/prefix from category (for IT vs Admin resolution)
    SELECT ac.department_id, ac.name, ac.prefix
    INTO category_dept_id, category_name, category_prefix
    FROM asset_categories ac
    WHERE ac.categoryID = p_category_id AND ac.deleted_at IS NULL
    LIMIT 1;

    -- If category has a department, ensure it belongs to the asset's company (p_company_id)
    IF category_dept_id IS NOT NULL THEN
        SELECT d.company_id INTO dept_company_id
        FROM asset_mngmnt_departments d
        WHERE d.departmentID = category_dept_id AND d.deleted_at IS NULL
        LIMIT 1;
        IF dept_company_id IS NULL OR dept_company_id != p_company_id THEN
            SET category_dept_id = NULL;
        END IF;
    END IF;

    -- If still no department: resolve by category type (IT asset -> IT Department, Admin asset -> Administration Department)
    -- so every company numbers like main company (IT 1,2,3... and Admin 1,2,3...).
    IF category_dept_id IS NULL AND p_category_id IS NOT NULL AND p_company_id IS NOT NULL THEN
        IF (category_prefix = 'ITOFE' OR (category_name IS NOT NULL AND (category_name LIKE '%IT%' OR category_name LIKE '%Information Technology%'))) THEN
            SELECT departmentID INTO category_dept_id
            FROM asset_mngmnt_departments
            WHERE company_id = p_company_id AND deleted_at IS NULL
              AND (name LIKE '%IT%' OR name LIKE '%Information Technology%')
            LIMIT 1;
        ELSEIF (category_prefix = 'ADMOFE' OR (category_name IS NOT NULL AND (category_name LIKE '%Admin%' OR category_name LIKE '%Administration%'))) THEN
            SELECT departmentID INTO category_dept_id
            FROM asset_mngmnt_departments
            WHERE company_id = p_company_id AND deleted_at IS NULL
              AND (name LIKE '%Admin%' OR name LIKE '%Administration%')
            LIMIT 1;
        END IF;
    END IF;

    IF category_dept_id IS NULL THEN
        SET category_dept_id = p_department_id;
    END IF;

    IF category_dept_id IS NULL THEN
        SELECT departmentID INTO default_dept_id
        FROM asset_mngmnt_departments
        WHERE name = 'Default' AND company_id = p_company_id AND deleted_at IS NULL
        LIMIT 1;

        IF default_dept_id IS NULL THEN
            SET default_dept_id = UUID();
            INSERT INTO asset_mngmnt_departments (
                departmentID, name, code, prefix, description, company_id, created_by, updated_by
            ) VALUES (
                default_dept_id, 'Default', 'DEF', 'DEF', 'Default department for assets with no specific department',
                p_company_id, p_created_by, p_updated_by
            );
        END IF;

        SET category_dept_id = default_dept_id;
    END IF;

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
        SET @dept_to_use = COALESCE(category_dept_id, p_department_id);
        IF @dept_to_use IS NOT NULL THEN
            IF settings_department_format = 'code' THEN
                SELECT code INTO department_part FROM asset_mngmnt_departments WHERE departmentID = @dept_to_use;
            ELSE
                SELECT prefix INTO department_part FROM asset_mngmnt_departments WHERE departmentID = @dept_to_use;
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

    SET @counter_dept_id = COALESCE(category_dept_id, p_department_id);

    INSERT INTO asset_counters (company_id, department_id, last_seq)
    VALUES (p_company_id, @counter_dept_id, 1)
    ON DUPLICATE KEY UPDATE last_seq = last_seq + 1;

    SELECT last_seq INTO seq_num
    FROM asset_counters
    WHERE company_id = p_company_id
      AND department_id = @counter_dept_id;

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
-- End of migration_sp_create_asset_it_admin_numbering.sql

-- Migration: Update sp_create_asset to calculate and store next_maintenance_date
-- This calculates the next maintenance date based on the maintenance schedule and creation date

USE `asset_mngmnt`;

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
    DECLARE default_dept_id CHAR(36);
    DECLARE category_name VARCHAR(255) DEFAULT NULL;
    DECLARE category_prefix VARCHAR(10) DEFAULT NULL;
    DECLARE dept_company_id CHAR(36) DEFAULT NULL;
    DECLARE v_next_maintenance_date DATE DEFAULT NULL;

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

    -- Get department_id and name/prefix from category (for IT vs Admin resolution)
    SELECT ac.department_id, ac.name, ac.prefix
    INTO category_dept_id, category_name, category_prefix
    FROM asset_categories ac
    WHERE ac.categoryID = p_category_id AND ac.deleted_at IS NULL
    LIMIT 1;

    -- If category has a department, ensure it belongs to the asset's company (p_company_id)
    IF category_dept_id IS NOT NULL THEN
        SELECT d.company_id INTO dept_company_id
        FROM asset_mngmnt_departments d
        WHERE d.departmentID = category_dept_id AND d.deleted_at IS NULL
        LIMIT 1;
        IF dept_company_id IS NULL OR dept_company_id != p_company_id THEN
            SET category_dept_id = NULL;
        END IF;
    END IF;

    -- If still no department: resolve by category type (IT asset -> IT Department, Admin asset -> Administration Department)
    IF category_dept_id IS NULL AND p_category_id IS NOT NULL AND p_company_id IS NOT NULL THEN
        IF (category_prefix = 'ITOFE' OR (category_name IS NOT NULL AND (category_name LIKE '%IT%' OR category_name LIKE '%Information Technology%'))) THEN
            SELECT departmentID INTO category_dept_id
            FROM asset_mngmnt_departments
            WHERE company_id = p_company_id AND deleted_at IS NULL
              AND (name LIKE '%IT%' OR name LIKE '%Information Technology%')
            LIMIT 1;
        ELSEIF (category_prefix = 'ADMOFE' OR (category_name IS NOT NULL AND (category_name LIKE '%Admin%' OR category_name LIKE '%Administration%'))) THEN
            SELECT departmentID INTO category_dept_id
            FROM asset_mngmnt_departments
            WHERE company_id = p_company_id AND deleted_at IS NULL
              AND (name LIKE '%Admin%' OR name LIKE '%Administration%')
            LIMIT 1;
        END IF;
    END IF;

    IF category_dept_id IS NULL THEN
        SET category_dept_id = p_department_id;
    END IF;

    IF category_dept_id IS NULL THEN
        SELECT departmentID INTO default_dept_id
        FROM asset_mngmnt_departments
        WHERE name = 'Default' AND company_id = p_company_id AND deleted_at IS NULL
        LIMIT 1;

        IF default_dept_id IS NULL THEN
            SET default_dept_id = UUID();
            INSERT INTO asset_mngmnt_departments (
                departmentID, name, code, prefix, description, company_id, created_by, updated_by
            ) VALUES (
                default_dept_id, 'Default', 'DEF', 'DEF', 'Default department for assets with no specific department',
                p_company_id, p_created_by, p_updated_by
            );
        END IF;

        SET category_dept_id = default_dept_id;
    END IF;

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
        SET @dept_to_use = COALESCE(category_dept_id, p_department_id);
        IF @dept_to_use IS NOT NULL THEN
            IF settings_department_format = 'code' THEN
                SELECT code INTO department_part FROM asset_mngmnt_departments WHERE departmentID = @dept_to_use;
            ELSE
                SELECT prefix INTO department_part FROM asset_mngmnt_departments WHERE departmentID = @dept_to_use;
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

    SET @counter_dept_id = COALESCE(category_dept_id, p_department_id);

    INSERT INTO asset_counters (company_id, department_id, last_seq)
    VALUES (p_company_id, @counter_dept_id, 1)
    ON DUPLICATE KEY UPDATE last_seq = last_seq + 1;

    SELECT last_seq INTO seq_num
    FROM asset_counters
    WHERE company_id = p_company_id
      AND department_id = @counter_dept_id;

    SET asset_code = CONCAT_WS('-',
        NULLIF(company_part, ''),
        NULLIF(category_part, ''),
        NULLIF(type_part, ''),
        NULLIF(department_part, ''),
        NULLIF(date_part, ''),
        LPAD(seq_num, 5, '0')
    );

    -- Calculate next maintenance date based on schedule and creation date
    SET v_next_maintenance_date = CASE
        WHEN p_maintenance_schedule = 'Monthly' THEN DATE_ADD(p_created_at, INTERVAL 1 MONTH)
        WHEN p_maintenance_schedule = 'Quarterly' THEN DATE_ADD(p_created_at, INTERVAL 3 MONTH)
        WHEN p_maintenance_schedule = 'Semi-Annual' THEN DATE_ADD(p_created_at, INTERVAL 6 MONTH)
        WHEN p_maintenance_schedule = 'Annually' THEN DATE_ADD(p_created_at, INTERVAL 12 MONTH)
        ELSE NULL
    END;

    INSERT INTO assets (
        assetID, asset_code, name, description, category_id, supplier, type_id, brand, model, serial,
        image_url, purchase_date, asset_value, salvage_value, depreciation_method,
        useful_life_years, annual_depreciation, depreciation_start_date, company_id,
        location_id, location_room_id, department_id, location_notes, warranty_months,
        `condition`, maintenance_schedule, next_maintenance_date, status, is_old_unit, created_by, updated_by, created_at
    ) VALUES (
        new_id, asset_code, p_name, p_description, p_category_id, p_supplier, p_type_id, p_brand, p_model, p_serial,
        p_image_url, p_purchase_date, p_asset_value, p_salvage_value, p_depreciation_method,
        p_useful_life_years, p_annual_depreciation, p_depreciation_start_date, p_company_id,
        p_location_id, p_location_room_id, p_department_id, p_location_notes, p_warranty_months,
        p_condition, p_maintenance_schedule, v_next_maintenance_date, p_status, p_is_old_unit, p_created_by, p_updated_by, p_created_at
    );

    SELECT * FROM assets WHERE assetID = new_id;
END ;;

DELIMITER ;
-- End of migration_sp_create_asset_with_next_maintenance.sql

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
-- End of migration_sp_update_asset_with_next_maintenance.sql

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
-- End of migration_update_sp_create_asset.sql

-- Migration: update sp_create_role and sp_update_role to support extended role columns
-- (asset_type, manager_role, access_add_edit, access_assignment, access_return,
--  hr_accountability_receiver, manager_approver_1, manager_approver_2, manager_approver_3)
-- Run after migration_add_role_custodian_fields.sql

DROP PROCEDURE IF EXISTS `sp_create_role`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_role`(
  IN p_name VARCHAR(255),
  IN p_description TEXT,
  IN p_created_by CHAR(36),
  IN p_asset_type VARCHAR(20),
  IN p_manager_role VARCHAR(30),
  IN p_access_add_edit TINYINT,
  IN p_access_assignment TINYINT,
  IN p_access_return TINYINT,
  IN p_hr_accountability_receiver TINYINT,
  IN p_manager_approver_1 TINYINT,
  IN p_manager_approver_2 TINYINT,
  IN p_manager_approver_3 TINYINT
)
BEGIN
  DECLARE new_id CHAR(36);
  SET new_id = UUID();

  INSERT INTO asset_mngmnt_roles (
    roleID, name, description, created_by, updated_by,
    asset_type, manager_role, access_add_edit, access_assignment, access_return,
    hr_accountability_receiver, manager_approver_1, manager_approver_2, manager_approver_3
  ) VALUES (
    new_id, p_name, p_description, p_created_by, p_created_by,
    p_asset_type, p_manager_role, p_access_add_edit, p_access_assignment, p_access_return,
    p_hr_accountability_receiver, p_manager_approver_1, p_manager_approver_2, p_manager_approver_3
  );

  SELECT new_id as roleID;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_update_role`;
DELIMITER ;;
CREATE PROCEDURE `sp_update_role`(
  IN p_roleID CHAR(36),
  IN p_name VARCHAR(255),
  IN p_description TEXT,
  IN p_updated_by CHAR(36),
  IN p_asset_type VARCHAR(20),
  IN p_manager_role VARCHAR(30),
  IN p_access_add_edit TINYINT,
  IN p_access_assignment TINYINT,
  IN p_access_return TINYINT,
  IN p_hr_accountability_receiver TINYINT,
  IN p_manager_approver_1 TINYINT,
  IN p_manager_approver_2 TINYINT,
  IN p_manager_approver_3 TINYINT
)
BEGIN
  UPDATE asset_mngmnt_roles
  SET
    name = p_name,
    description = p_description,
    updated_by = p_updated_by,
    updated_at = CURRENT_TIMESTAMP,
    asset_type = p_asset_type,
    manager_role = p_manager_role,
    access_add_edit = p_access_add_edit,
    access_assignment = p_access_assignment,
    access_return = p_access_return,
    hr_accountability_receiver = p_hr_accountability_receiver,
    manager_approver_1 = p_manager_approver_1,
    manager_approver_2 = p_manager_approver_2,
    manager_approver_3 = p_manager_approver_3
  WHERE roleID = p_roleID AND deleted_at IS NULL;

  SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;
-- End of migration_update_sp_create_update_role.sql

-- Migration: add stored procedures for AssetRepository
-- sp_get_assets_filtered, sp_get_assets_count_filtered, sp_get_asset_by_code,
-- sp_get_asset_documents, sp_get_assignments_by_asset_id

DROP PROCEDURE IF EXISTS `sp_get_assets_count_filtered`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_assets_count_filtered`(
  IN p_status VARCHAR(20),
  IN p_category_id CHAR(36),
  IN p_department_id CHAR(36),
  IN p_location_id CHAR(36),
  IN p_search VARCHAR(255)
)
BEGIN
  SELECT COUNT(*) AS total
  FROM assets a
  LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
  LEFT JOIN asset_mngmnt_departments d ON a.department_id = d.departmentID
  LEFT JOIN asset_mngmnt_locations l ON a.location_id = l.locationID
  WHERE a.deleted_at IS NULL
    AND (p_status IS NULL OR a.status = p_status)
    AND (p_category_id IS NULL OR a.category_id = p_category_id)
    AND (p_department_id IS NULL OR a.department_id = p_department_id)
    AND (p_location_id IS NULL OR a.location_id = p_location_id)
    AND (p_search IS NULL OR p_search = '' OR
         (a.name LIKE CONCAT('%', p_search, '%') OR
          a.asset_code LIKE CONCAT('%', p_search, '%') OR
          a.serial LIKE CONCAT('%', p_search, '%')));
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_assets_filtered`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_assets_filtered`(
  IN p_status VARCHAR(20),
  IN p_category_id CHAR(36),
  IN p_department_id CHAR(36),
  IN p_location_id CHAR(36),
  IN p_search VARCHAR(255),
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT
    a.*,
    ac.name AS category_name,
    d.name AS department_name,
    l.name AS location_name,
    lr.room_name AS location_room_name,
    c.name AS company_name,
    s.name AS supplier_name,
    at.name AS type_name,
    b.name AS brand_name,
    u.first_name AS assigned_first_name,
    u.last_name AS assigned_last_name,
    u.email AS assigned_email
  FROM assets a
  LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
  LEFT JOIN asset_mngmnt_departments d ON a.department_id = d.departmentID
  LEFT JOIN asset_mngmnt_locations l ON a.location_id = l.locationID
  LEFT JOIN asset_mngmnt_location_rooms lr ON a.location_room_id = lr.roomID
  LEFT JOIN companies c ON a.company_id = c.companyID
  LEFT JOIN suppliers s ON a.supplier = s.supplierID
  LEFT JOIN asset_types at ON a.type_id = at.typeID
  LEFT JOIN brands b ON a.brand = b.brandID
  LEFT JOIN asset_assignments aa ON a.assetID = aa.asset_id AND aa.status = 'Active'
  LEFT JOIN users u ON aa.user_id = u.userID
  WHERE a.deleted_at IS NULL
    AND (p_status IS NULL OR a.status = p_status)
    AND (p_category_id IS NULL OR a.category_id = p_category_id)
    AND (p_department_id IS NULL OR a.department_id = p_department_id)
    AND (p_location_id IS NULL OR a.location_id = p_location_id)
    AND (p_search IS NULL OR p_search = '' OR
         (a.name LIKE CONCAT('%', p_search, '%') OR
          a.asset_code LIKE CONCAT('%', p_search, '%') OR
          a.serial LIKE CONCAT('%', p_search, '%')))
  ORDER BY a.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_asset_by_code`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_by_code`(IN p_asset_code VARCHAR(50))
BEGIN
  SELECT
    a.*,
    ac.name AS category_name,
    d.name AS department_name,
    l.name AS location_name,
    lr.room_name AS location_room_name,
    c.name AS company_name,
    s.name AS supplier_name,
    at.name AS type_name,
    b.name AS brand_name
  FROM assets a
  LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
  LEFT JOIN asset_mngmnt_departments d ON a.department_id = d.departmentID
  LEFT JOIN asset_mngmnt_locations l ON a.location_id = l.locationID
  LEFT JOIN asset_mngmnt_location_rooms lr ON a.location_room_id = lr.roomID
  LEFT JOIN companies c ON a.company_id = c.companyID
  LEFT JOIN suppliers s ON a.supplier = s.supplierID
  LEFT JOIN asset_types at ON a.type_id = at.typeID
  LEFT JOIN brands b ON a.brand = b.brandID
  WHERE a.asset_code = p_asset_code AND a.deleted_at IS NULL;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_asset_documents`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_documents`(IN p_asset_id CHAR(36))
BEGIN
  SELECT documentID, asset_id, file_name, file_url, file_size, file_type, created_at
  FROM asset_documents
  WHERE asset_id = p_asset_id AND deleted_at IS NULL
  ORDER BY created_at DESC;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_assignments_by_asset_id`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_assignments_by_asset_id`(IN p_asset_id CHAR(36))
BEGIN
  SELECT
    aa.*,
    u.first_name,
    u.last_name,
    u.email,
    u.employee_number,
    u.position,
    d.name AS department_name,
    l.name AS location_name,
    lr.room_name
  FROM asset_assignments aa
  LEFT JOIN users u ON aa.user_id = u.userID
  LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID
  LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID
  LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID
  WHERE aa.asset_id = p_asset_id AND aa.deleted_at IS NULL
  ORDER BY aa.assigned_date DESC;
END ;;
DELIMITER ;
-- End of migration_add_asset_repository_sps.sql

-- Migration: add stored procedures for auth (sessions, password reset, user lookup)
-- Run on asset_mngmnt database

DROP PROCEDURE IF EXISTS `sp_get_user_by_email`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_user_by_email`(IN p_email VARCHAR(255))
BEGIN
  SELECT * FROM users WHERE email = p_email LIMIT 1;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_user_by_id`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_user_by_id`(IN p_user_id CHAR(36))
BEGIN
  SELECT userID, email FROM users WHERE userID = p_user_id LIMIT 1;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_session_last_activity`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_session_last_activity`(IN p_user_id CHAR(36))
BEGIN
  SELECT last_activity FROM sessions WHERE userID = p_user_id AND expires > NOW() LIMIT 1;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_delete_sessions_by_user`;
DELIMITER ;;
CREATE PROCEDURE `sp_delete_sessions_by_user`(IN p_user_id CHAR(36))
BEGIN
  DELETE FROM sessions WHERE userID = p_user_id;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_insert_session`;
DELIMITER ;;
CREATE PROCEDURE `sp_insert_session`(
  IN p_session_id VARCHAR(64),
  IN p_user_id CHAR(36),
  IN p_refresh_token VARCHAR(255),
  IN p_ip VARCHAR(45),
  IN p_user_agent TEXT
)
BEGIN
  INSERT INTO sessions (sessionID, userID, refresh_token, ip, user_agent, last_activity, expires)
  VALUES (p_session_id, p_user_id, p_refresh_token, p_ip, p_user_agent, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY));
  SELECT 1 AS success;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_update_session_activity`;
DELIMITER ;;
CREATE PROCEDURE `sp_update_session_activity`(IN p_user_id CHAR(36))
BEGIN
  UPDATE sessions SET last_activity = NOW() WHERE userID = p_user_id AND expires > NOW();
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_session_by_refresh_token`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_session_by_refresh_token`(IN p_refresh_token VARCHAR(255))
BEGIN
  SELECT * FROM sessions WHERE refresh_token = p_refresh_token AND expires > NOW() LIMIT 1;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_delete_session_by_refresh_token`;
DELIMITER ;;
CREATE PROCEDURE `sp_delete_session_by_refresh_token`(IN p_refresh_token VARCHAR(255))
BEGIN
  DELETE FROM sessions WHERE refresh_token = p_refresh_token;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_delete_session_by_id`;
DELIMITER ;;
CREATE PROCEDURE `sp_delete_session_by_id`(IN p_session_id VARCHAR(64))
BEGIN
  DELETE FROM sessions WHERE sessionID = p_session_id;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_delete_password_reset_tokens_by_user`;
DELIMITER ;;
CREATE PROCEDURE `sp_delete_password_reset_tokens_by_user`(IN p_user_id CHAR(36))
BEGIN
  DELETE FROM password_reset_tokens WHERE userID = p_user_id;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_insert_password_reset_token`;
DELIMITER ;;
CREATE PROCEDURE `sp_insert_password_reset_token`(
  IN p_token VARCHAR(10),
  IN p_user_id CHAR(36)
)
BEGIN
  INSERT INTO password_reset_tokens (token, userID, expires)
  VALUES (p_token, p_user_id, DATE_ADD(NOW(), INTERVAL 15 MINUTE));
  SELECT 1 AS success;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_password_reset_token`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_password_reset_token`(IN p_token VARCHAR(10))
BEGIN
  SELECT * FROM password_reset_tokens WHERE token = p_token AND expires > NOW() LIMIT 1;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_extend_password_reset_token`;
DELIMITER ;;
CREATE PROCEDURE `sp_extend_password_reset_token`(IN p_token VARCHAR(10))
BEGIN
  UPDATE password_reset_tokens SET expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE token = p_token;
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_cleanup_expired_auth_data`;
DELIMITER ;;
CREATE PROCEDURE `sp_cleanup_expired_auth_data`()
BEGIN
  DELETE FROM sessions WHERE expires < NOW();
  DELETE FROM sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 5 MINUTE);
  DELETE FROM verification_tokens WHERE expires < NOW();
  DELETE FROM password_reset_tokens WHERE expires < NOW();
  SELECT 1 AS success;
END ;;
DELIMITER ;
-- End of migration_add_auth_sps.sql

-- Migration: add stored procedures for notifications and audit
-- Run on asset_mngmnt database

DROP PROCEDURE IF EXISTS `sp_get_notifications_count`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_notifications_count`(IN p_user_id CHAR(36))
BEGIN
  SELECT COUNT(*) AS count
  FROM notifications
  WHERE user_id = p_user_id AND deleted_at IS NULL;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_notifications`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_notifications`(
  IN p_user_id CHAR(36),
  IN p_status VARCHAR(20),
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT
    notificationID AS id,
    title,
    message AS description,
    type,
    status,
    data,
    created_at AS timestamp
  FROM notifications
  WHERE user_id = p_user_id AND deleted_at IS NULL
    AND (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_mark_notification_read`;
DELIMITER ;;
CREATE PROCEDURE `sp_mark_notification_read`(
  IN p_notification_id CHAR(36),
  IN p_user_id CHAR(36)
)
BEGIN
  UPDATE notifications
  SET status = 'read', updated_at = NOW()
  WHERE notificationID = p_notification_id AND user_id = p_user_id AND deleted_at IS NULL;
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_create_audit_log`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_audit_log`(
  IN p_user_id VARCHAR(36),
  IN p_action VARCHAR(255),
  IN p_resource_type VARCHAR(100),
  IN p_resource_id VARCHAR(255),
  IN p_resource_name VARCHAR(255),
  IN p_details TEXT,
  IN p_old_values TEXT,
  IN p_new_values TEXT,
  IN p_ip_address VARCHAR(45),
  IN p_user_agent TEXT,
  IN p_company_id CHAR(36)
)
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id, resource_name,
    details, old_values, new_values, ip_address, user_agent, company_id
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id, p_resource_name,
    p_details, p_old_values, p_new_values, p_ip_address, p_user_agent, p_company_id
  );
  SELECT LAST_INSERT_ID() AS auditID;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_audit_logs_count`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_audit_logs_count`()
BEGIN
  SELECT COUNT(*) AS total FROM audit_logs WHERE deleted_at IS NULL;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_audit_logs`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_audit_logs`(
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT
    al.auditID,
    al.created_at,
    al.user_id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.resource_name,
    al.details,
    al.old_values,
    al.new_values,
    al.ip_address,
    al.user_agent,
    al.company_id,
    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
    u.email AS user_email
  FROM audit_logs al
  LEFT JOIN users u ON al.user_id = u.userID
  WHERE al.deleted_at IS NULL
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END ;;
DELIMITER ;
-- End of migration_add_notifications_audit_sps.sql

-- Migration: add stored procedures for asset assignments
-- Run on asset_mngmnt database

DROP PROCEDURE IF EXISTS `sp_get_assignments`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_assignments`(
  IN p_asset_code VARCHAR(50),
  IN p_user_id CHAR(36),
  IN p_status VARCHAR(20)
)
BEGIN
  SELECT
    aa.assignmentID,
    aa.asset_id,
    aa.user_id,
    aa.department_id,
    aa.location_id,
    aa.location_room_id,
    aa.assigned_date,
    aa.expected_return_date,
    aa.actual_return_date,
    aa.assignment_notes,
    aa.status,
    aa.assigned_by,
    aa.created_at,
    aa.updated_at,
    a.asset_code,
    a.name AS asset_name,
    a.category_id,
    a.type_id,
    u.first_name,
    u.last_name,
    u.email,
    u.employee_number AS employeeNumber,
    u.position AS position,
    d.name AS department_name,
    l.name AS location_name,
    l.floor_unit,
    l.building,
    lr.room_name,
    ab.first_name AS assigned_by_first_name,
    ab.last_name AS assigned_by_last_name,
    ab.employee_number AS assigned_by_employee_number
  FROM asset_assignments aa
  LEFT JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
  LEFT JOIN users u ON aa.user_id = u.userID
  LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID AND d.deleted_at IS NULL
  LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID AND l.deleted_at IS NULL
  LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID AND lr.deleted_at IS NULL
  LEFT JOIN users ab ON aa.assigned_by = ab.userID
  WHERE aa.deleted_at IS NULL
    AND (p_asset_code IS NULL OR aa.asset_id = (SELECT assetID FROM assets WHERE asset_code = p_asset_code AND deleted_at IS NULL LIMIT 1))
    AND (p_user_id IS NULL OR aa.user_id = p_user_id)
    AND (p_status IS NULL OR aa.status = p_status)
  ORDER BY aa.assigned_date DESC;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_create_assignment`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_assignment`(
  IN p_assignment_id CHAR(36),
  IN p_asset_id CHAR(36),
  IN p_user_id CHAR(36),
  IN p_department_id CHAR(36),
  IN p_location_id CHAR(36),
  IN p_location_room_id CHAR(36),
  IN p_expected_return_date DATETIME,
  IN p_assignment_notes TEXT,
  IN p_assigned_by CHAR(36)
)
BEGIN
  INSERT INTO asset_assignments (
    assignmentID, asset_id, user_id, department_id, location_id,
    location_room_id, expected_return_date, assignment_notes, assigned_by
  ) VALUES (
    p_assignment_id, p_asset_id, p_user_id, p_department_id, p_location_id,
    p_location_room_id, p_expected_return_date, p_assignment_notes, p_assigned_by
  );

  UPDATE assets SET status = 'Assigned', updated_by = p_assigned_by, updated_at = NOW()
  WHERE assetID = p_asset_id AND deleted_at IS NULL;

  SELECT p_assignment_id AS assignmentID;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_set_assignment_inactive`;
DELIMITER ;;
CREATE PROCEDURE `sp_set_assignment_inactive`(
  IN p_assignment_id CHAR(36),
  IN p_notes_append TEXT
)
BEGIN
  UPDATE asset_assignments
  SET status = 'Inactive',
      assignment_notes = CONCAT(IFNULL(assignment_notes, ''), IFNULL(p_notes_append, '')),
      updated_at = NOW()
  WHERE assignmentID = p_assignment_id AND deleted_at IS NULL;

  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_return_assignment`;
DELIMITER ;;
CREATE PROCEDURE `sp_return_assignment`(
  IN p_assignment_id CHAR(36),
  IN p_return_notes TEXT,
  IN p_condition TEXT,
  IN p_updated_by CHAR(36)
)
BEGIN
  DECLARE v_asset_id CHAR(36);

  SELECT asset_id INTO v_asset_id FROM asset_assignments WHERE assignmentID = p_assignment_id AND deleted_at IS NULL LIMIT 1;

  UPDATE asset_assignments
  SET status = 'Returned',
      actual_return_date = NOW(),
      assignment_notes = CONCAT(IFNULL(assignment_notes, ''), '\nReturn notes: ', IFNULL(p_return_notes, ''), IF(p_condition IS NOT NULL AND p_condition != '', CONCAT('\nReturn condition: ', p_condition), '')),
      updated_at = NOW()
  WHERE assignmentID = p_assignment_id AND deleted_at IS NULL;

  IF v_asset_id IS NOT NULL THEN
    UPDATE assets SET status = 'Available', updated_by = p_updated_by, updated_at = NOW()
    WHERE assetID = v_asset_id AND deleted_at IS NULL;
  END IF;

  SELECT 1 AS success;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_mark_assignment_returned`;
DELIMITER ;;
CREATE PROCEDURE `sp_mark_assignment_returned`(
  IN p_assignment_id CHAR(36),
  IN p_return_notes TEXT,
  IN p_return_condition TEXT
)
BEGIN
  UPDATE asset_assignments
  SET status = 'Returned',
      actual_return_date = NOW(),
      assignment_notes = CONCAT(
        IFNULL(assignment_notes, ''),
        '\nReturn notes: ', IFNULL(p_return_notes, ''),
        IF(p_return_condition IS NOT NULL AND p_return_condition != '',
           CONCAT('\nReturn condition: ', p_return_condition), '')
      ),
      updated_at = NOW()
  WHERE assignmentID = p_assignment_id AND deleted_at IS NULL;

  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;
-- End of migration_add_asset_assignment_sps.sql

-- Migration to update stored procedures for department_id support in asset categories
-- This updates the sp_CreateCategory, sp_UpdateCategory, and sp_GetAllCategories procedures to handle department_id

-- Drop existing procedures
DROP PROCEDURE IF EXISTS `sp_CreateCategory`;
DROP PROCEDURE IF EXISTS `sp_UpdateCategory`;
DROP PROCEDURE IF EXISTS `sp_GetAllCategories`;

-- Create updated sp_CreateCategory procedure with department_id support
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CreateCategory`(
    IN p_name VARCHAR(255),
    IN p_prefix VARCHAR(10),
    IN p_gl_code VARCHAR(20),
    IN p_department_id CHAR(36),
    IN p_company_id CHAR(36),
    IN p_created_by CHAR(36)
)
BEGIN
    DECLARE new_id CHAR(36);

    SET new_id = UUID();

    INSERT INTO asset_categories (
        categoryID, name, prefix, gl_code, department_id, company_id, created_by, updated_by
    ) VALUES (
        new_id, p_name, p_prefix, p_gl_code, p_department_id, p_company_id, p_created_by, p_created_by
    );

    SELECT * FROM asset_categories WHERE categoryID = new_id;
END ;;
DELIMITER ;

-- Create updated sp_UpdateCategory procedure with department_id support
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_UpdateCategory`(
    IN p_id CHAR(36),
    IN p_name VARCHAR(255),
    IN p_prefix VARCHAR(10),
    IN p_gl_code VARCHAR(20),
    IN p_department_id CHAR(36),
    IN p_company_id CHAR(36),
    IN p_updated_by CHAR(36)
)
BEGIN
    UPDATE asset_categories SET
        name = p_name,
        prefix = p_prefix,
        gl_code = p_gl_code,
        department_id = p_department_id,
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE categoryID = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT * FROM asset_categories WHERE categoryID = p_id AND deleted_at IS NULL;
END ;;
DELIMITER ;

-- Create updated sp_GetAllCategories procedure with department information
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetAllCategories`(IN p_company_id CHAR(36))
BEGIN
  SELECT
    ac.categoryID,
    ac.name,
    ac.prefix,
    ac.gl_code,
    ac.department_id,
    ac.company_id,
    ac.created_at,
    ac.created_by,
    ac.updated_at,
    ac.updated_by,
    ac.deleted_at,
    ac.deleted_by,
    CASE WHEN d.departmentID IS NOT NULL THEN
        JSON_OBJECT(
            'id', d.departmentID,
            'name', d.name,
            'code', d.code
        )
    ELSE NULL END as department
  FROM asset_categories ac
  LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID AND d.deleted_at IS NULL
  WHERE ac.deleted_at IS NULL AND ac.company_id = p_company_id
  ORDER BY ac.created_at DESC;
END ;;
DELIMITER ;
-- End of migration_update_stored_procedures.sql

CREATE TABLE `user_permissions` (
  `permission_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `module_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_type` enum('view','create','edit','delete') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `granted` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `unique_user_module_permission` (`user_id`,`module_name`,`permission_type`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_user_permissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- End of create_user_permissions.sql

-- Role default module permissions (mirrors user_permissions shape; keyed by role).
-- Run on asset_mngmnt database.

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `permission_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `role_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `module_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_type` enum('view','create','edit','delete') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `granted` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `unique_role_module_permission` (`role_id`,`module_name`,`permission_type`),
  KEY `idx_role_id` (`role_id`),
  CONSTRAINT `fk_role_permissions_role_id` FOREIGN KEY (`role_id`) REFERENCES `asset_mngmnt_roles` (`roleID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- End of migration_role_permissions.sql

-- Migration: per-user custodian/approver settings (new table + stored procedures)
-- Run this against your MySQL database.

-- 1. Create table (user_id must match users.userID: CHAR(36) utf8mb4_unicode_ci for FK compatibility)
CREATE TABLE IF NOT EXISTS `user_custodian_settings` (
  `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `access_add_edit` TINYINT NOT NULL DEFAULT 0,
  `access_assignment` TINYINT NOT NULL DEFAULT 0,
  `access_return` TINYINT NOT NULL DEFAULT 0,
  `hr_accountability_receiver` TINYINT NOT NULL DEFAULT 0,
  `manager_approver_1` TINYINT NOT NULL DEFAULT 0,
  `manager_approver_2` TINYINT NOT NULL DEFAULT 0,
  `manager_approver_3` TINYINT NOT NULL DEFAULT 0,
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_custodian_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Replace sp_get_users to LEFT JOIN user_custodian_settings and return the 7 columns
DROP PROCEDURE IF EXISTS `sp_get_users`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_users`()
BEGIN
    SELECT
        u.userID as id,
        u.email,
        u.first_name,
        u.last_name,
        u.username,
        u.contact_number,
        u.position,
        u.department_id,
        u.company_id,
        u.role_id,
        u.employee_number,
        u.avatar_url,
        u.is_active as is_active,
        u.created_at,
        u.updated_at,
        d.name as department,
        CASE WHEN c.companyID IS NOT NULL THEN
            CONCAT('{"id":"', IFNULL(c.companyID, ''), '","name":"', IFNULL(REPLACE(REPLACE(c.name, '\\', '\\\\'), '"', '\\"'), ''), '","email":"', IFNULL(REPLACE(REPLACE(c.email, '\\', '\\\\'), '"', '\\"'), ''), '","code":"', IFNULL(REPLACE(REPLACE(c.code, '\\', '\\\\'), '"', '\\"'), ''), '","prefix":"', IFNULL(REPLACE(REPLACE(c.prefix, '\\', '\\\\'), '"', '\\"'), ''), '","tax_id":"', IFNULL(REPLACE(REPLACE(c.tax_id, '\\', '\\\\'), '"', '\\"'), ''), '","phone":"', IFNULL(REPLACE(REPLACE(c.phone, '\\', '\\\\'), '"', '\\"'), ''), '","website":"', IFNULL(REPLACE(REPLACE(c.website, '\\', '\\\\'), '"', '\\"'), ''), '","unit_no":"', IFNULL(REPLACE(REPLACE(c.unit_no, '\\', '\\\\'), '"', '\\"'), ''), '","building_street":"', IFNULL(REPLACE(REPLACE(c.building_street, '\\', '\\\\'), '"', '\\"'), ''), '","barangay_name":"', IFNULL(REPLACE(REPLACE(c.barangay_name, '\\', '\\\\'), '"', '\\"'), ''), '","city_name":"', IFNULL(REPLACE(REPLACE(c.city_name, '\\', '\\\\'), '"', '\\"'), ''), '","province_name":"', IFNULL(REPLACE(REPLACE(c.province_name, '\\', '\\\\'), '"', '\\"'), ''), '","region_name":"', IFNULL(REPLACE(REPLACE(c.region_name, '\\', '\\\\'), '"', '\\"'), ''), '","zipcode":"', IFNULL(REPLACE(REPLACE(c.zipcode, '\\', '\\\\'), '"', '\\"'), ''), '","logo_url":"', IFNULL(REPLACE(REPLACE(c.logo_url, '\\', '\\\\'), '"', '\\"'), ''), '","industry":"', IFNULL(REPLACE(REPLACE(c.industry, '\\', '\\\\'), '"', '\\"'), ''), '","size":"', IFNULL(REPLACE(REPLACE(c.size, '\\', '\\\\'), '"', '\\"'), ''), '","is_active":', IFNULL(c.is_active, 0), ',"created_at":"', IFNULL(c.created_at, ''), '","created_by":"', IFNULL(c.created_by, ''), '","updated_at":"', IFNULL(c.updated_at, ''), '","updated_by":"', IFNULL(c.updated_by, ''), '","deleted_at":', IF(c.deleted_at IS NULL, 'null', CONCAT('"', c.deleted_at, '"')), ',"deleted_by":"', IFNULL(c.deleted_by, ''), '"}')
        ELSE NULL END as company,
        CASE WHEN r.roleID IS NOT NULL THEN
            CONCAT('{"roleID":"', IFNULL(r.roleID, ''), '","name":"', IFNULL(REPLACE(REPLACE(r.name, '\\', '\\\\'), '"', '\\"'), ''), '","deleted_by":"', IFNULL(r.deleted_by, ''), '"}')
        ELSE NULL END as role,
        IFNULL(uc.access_add_edit, 0) as access_add_edit,
        IFNULL(uc.access_assignment, 0) as access_assignment,
        IFNULL(uc.access_return, 0) as access_return,
        IFNULL(uc.hr_accountability_receiver, 0) as hr_accountability_receiver,
        IFNULL(uc.manager_approver_1, 0) as manager_approver_1,
        IFNULL(uc.manager_approver_2, 0) as manager_approver_2,
        IFNULL(uc.manager_approver_3, 0) as manager_approver_3
    FROM users u
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN companies c ON u.company_id = c.companyID AND c.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
    LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
    WHERE u.is_active = 1
    ORDER BY u.created_at DESC;
END ;;
DELIMITER ;

-- 3. sp_upsert_user_custodian_settings
DROP PROCEDURE IF EXISTS `sp_upsert_user_custodian_settings`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_upsert_user_custodian_settings`(
    IN p_user_id CHAR(36),
    IN p_access_add_edit TINYINT,
    IN p_access_assignment TINYINT,
    IN p_access_return TINYINT,
    IN p_hr_accountability_receiver TINYINT,
    IN p_manager_approver_1 TINYINT,
    IN p_manager_approver_2 TINYINT,
    IN p_manager_approver_3 TINYINT,
    IN p_finance_approver TINYINT
)
BEGIN
    INSERT INTO user_custodian_settings (
        user_id, access_add_edit, access_assignment, access_return,
        hr_accountability_receiver, manager_approver_1, manager_approver_2, manager_approver_3, finance_approver
    ) VALUES (
        p_user_id, p_access_add_edit, p_access_assignment, p_access_return,
        p_hr_accountability_receiver, p_manager_approver_1, p_manager_approver_2, p_manager_approver_3, p_finance_approver
    )
    ON DUPLICATE KEY UPDATE
        access_add_edit = p_access_add_edit,
        access_assignment = p_access_assignment,
        access_return = p_access_return,
        hr_accountability_receiver = p_hr_accountability_receiver,
        manager_approver_1 = p_manager_approver_1,
        manager_approver_2 = p_manager_approver_2,
        manager_approver_3 = p_manager_approver_3,
        finance_approver = p_finance_approver,
        updated_at = CURRENT_TIMESTAMP;
END ;;
DELIMITER ;

-- 4. sp_get_user_custodian_settings
DROP PROCEDURE IF EXISTS `sp_get_user_custodian_settings`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_custodian_settings`(IN p_user_id CHAR(36))
BEGIN
    SELECT
        access_add_edit, access_assignment, access_return,
        hr_accountability_receiver, manager_approver_1, manager_approver_2, manager_approver_3, finance_approver
    FROM user_custodian_settings
    WHERE user_id = p_user_id
    LIMIT 1;
END ;;
DELIMITER ;
-- End of migration_user_custodian_settings.sql

-- Two-stage borrow workflow: Department Head (Manager Approver 1) first, then IT/Admin staff queue.
-- Run after migration_create_asset_borrow_requests.sql
--
-- Idempotent: safe if columns/index already exist (e.g. table was created from the current
-- migration_create_asset_borrow_requests.sql, or ALTER was partially applied). Error 1060/1061
-- will not occur.

SET @abr_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
);

-- Add each column only when missing (MySQL has no ADD COLUMN IF NOT EXISTS in plain ALTER).
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1 AS skip_no_table',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'dept_head_signed_at') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `dept_head_signed_at` datetime DEFAULT NULL AFTER `status`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'dept_head_signed_by') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `dept_head_signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `dept_head_signed_at`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'dept_head_digital_signature') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `dept_head_digital_signature` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `dept_head_signed_by`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'declined_at') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `declined_at` datetime DEFAULT NULL AFTER `dept_head_digital_signature`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND INDEX_NAME = 'idx_abr_dept_pending') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD KEY `idx_abr_dept_pending` (`company_id`, `dept_head_signed_at`, `declined_at`)',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- Data backfill for legacy `status` values.
-- MySQL Workbench "Safe Updates" (Error 1175) rejects many valid UPDATE shapes (including
-- JOINs) unless the WHERE uses a key in a form it recognizes. These statements use plain
-- filters on `asset_borrow_requests` only, so we temporarily disable safe updates for
-- this session block — same effect as unchecking Preferences → SQL Editor → Safe Updates.

SET @abr_prev_safe := @@SESSION.sql_safe_updates;
SET SESSION sql_safe_updates = 0;

UPDATE `asset_borrow_requests`
SET `status` = 'pending_dept_head'
WHERE `dept_head_signed_at` IS NULL
  AND `declined_at` IS NULL
  AND `status` = 'pending';

UPDATE `asset_borrow_requests`
SET `status` = 'pending_staff'
WHERE `dept_head_signed_at` IS NOT NULL
  AND `declined_at` IS NULL;

UPDATE `asset_borrow_requests`
SET `status` = 'declined'
WHERE `declined_at` IS NOT NULL;

SET SESSION sql_safe_updates = @abr_prev_safe;
-- End of migration_asset_borrow_requests_dept_head.sql

-- Borrow workflow upgrade fields (processor decline, wet pdf, return processing, reminder markers)
SET @tbl := 'asset_borrow_requests';

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'processor_remarks'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN processor_remarks text NULL AFTER pre_usage_condition'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'processor_declined_at'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN processor_declined_at datetime NULL AFTER declined_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'processor_decline_reason'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN processor_decline_reason text NULL AFTER processor_declined_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'processor_wet_borrow_pdf_url'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN processor_wet_borrow_pdf_url varchar(1024) NULL AFTER processor_decline_reason'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'returned_at'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN returned_at datetime NULL AFTER approved_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'return_condition'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN return_condition varchar(50) NULL AFTER returned_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'return_remarks'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN return_remarks text NULL AFTER return_condition'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'return_condition_images'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN return_condition_images json NULL AFTER return_remarks'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'due_5m_notified_at'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN due_5m_notified_at datetime NULL AFTER return_condition_images'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'due_notified_at'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN due_notified_at datetime NULL AFTER due_5m_notified_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'pre_usage_condition_images'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN pre_usage_condition_images json NULL AFTER processor_remarks'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- End of migration_asset_borrow_workflow_upgrade.sql

-- Migration: add processing fields to asset_borrow_requests (form number + staff processing + assigned asset).
-- Run after migration_create_asset_borrow_requests.sql

SET @abr_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
);

-- form_number
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1 AS skip_no_table',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'form_number') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `form_number` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `type_id`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- approved_at
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'approved_at') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `approved_at` datetime DEFAULT NULL AFTER `dept_head_digital_signature`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- approved_by
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'approved_by') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `approved_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `approved_at`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- asset_id
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'asset_id') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `asset_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `approved_by`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- pre_usage_condition
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND COLUMN_NAME = 'pre_usage_condition') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD COLUMN `pre_usage_condition` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `asset_id`',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- Helpful index
SET @sql := IF(
  @abr_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_borrow_requests'
       AND INDEX_NAME = 'idx_abr_staff_pending') = 0,
    'ALTER TABLE `asset_borrow_requests` ADD KEY `idx_abr_staff_pending` (`company_id`, `dept_head_signed_at`, `declined_at`, `approved_at`)',
    'SELECT 1'
  )
);
PREPARE abr_stmt FROM @sql;
EXECUTE abr_stmt;
DEALLOCATE PREPARE abr_stmt;

-- End of migration_add_asset_borrow_requests_processing.sql

-- Simple one-step migration: add dept_head columns to asset_return_forms.
-- Use this if the idempotent migration_add_dept_head_signature_asset_return_forms.sql fails.
-- Run ONCE on your asset_mngmnt database.
--
-- "Duplicate column name 'dept_head_signed_at'" = migration already applied. Do nothing; try approving again.

ALTER TABLE asset_return_forms
  ADD COLUMN dept_head_signed_at DATETIME DEFAULT NULL AFTER received_by,
  ADD COLUMN dept_head_digital_signature LONGTEXT DEFAULT NULL AFTER dept_head_signed_at,
  ADD COLUMN dept_head_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER dept_head_digital_signature;

ALTER TABLE asset_return_forms
  ADD CONSTRAINT fk_asset_return_forms_dept_head_signed_by
  FOREIGN KEY (dept_head_signed_by) REFERENCES users (userID) ON DELETE SET NULL;
-- End of migration_add_dept_head_signature_asset_return_forms_simple.sql

-- Migration: add it_manager_signed_at, it_manager_digital_signature, it_manager_signed_by to asset_return_forms
-- For IT Manager / IT Department Head approval signature (fourth signature on return form).
-- Run this on your asset_mngmnt database.

ALTER TABLE asset_return_forms
  ADD COLUMN it_manager_signed_at DATETIME DEFAULT NULL AFTER dept_head_signed_by,
  ADD COLUMN it_manager_digital_signature LONGTEXT DEFAULT NULL AFTER it_manager_signed_at,
  ADD COLUMN it_manager_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER it_manager_digital_signature,
  ADD CONSTRAINT fk_asset_return_forms_it_manager_signed_by FOREIGN KEY (it_manager_signed_by) REFERENCES users (userID) ON DELETE SET NULL;
-- End of migration_add_it_manager_signature_asset_return_forms.sql

-- Migration: add process_signed_at and process_digital_signature to asset_return_forms
-- For IT staff / process user signature when processing the return.
-- Run this on your asset_mngmnt database.

ALTER TABLE asset_return_forms
  ADD COLUMN process_signed_at DATETIME DEFAULT NULL AFTER signed_by,
  ADD COLUMN process_digital_signature LONGTEXT DEFAULT NULL AFTER process_signed_at;
-- End of migration_add_process_signature_asset_return_forms.sql

-- Migration: add process_signed_by to asset_return_forms
-- Records which IT/Admin staff user process-signed the return form so the
-- "Processed by" shown on return form cards resolves to the actual processor
-- instead of the user who created the form.
-- Run this on your asset_mngmnt database. Safe to run multiple times (idempotent).

SET @dbname = DATABASE();

SET @add_process_signed_by = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'asset_return_forms' AND COLUMN_NAME = 'process_signed_by'
);
SET @sql = IF(@add_process_signed_by = 0,
  'ALTER TABLE asset_return_forms ADD COLUMN process_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER process_signed_at',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'asset_return_forms'
  AND CONSTRAINT_NAME = 'fk_asset_return_forms_process_signed_by' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE asset_return_forms ADD CONSTRAINT fk_asset_return_forms_process_signed_by FOREIGN KEY (process_signed_by) REFERENCES users (userID) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- End of migration_add_process_signed_by_asset_return_forms.sql

-- Migration: add signed_digital_signature to asset_return_forms (returner's signature image for PDF)
-- Run this on your asset_mngmnt database.
-- Allows the returner's signature to show on the PDF when viewed by others (e.g. Approvals, Asset Return Forms page).

ALTER TABLE asset_return_forms
  ADD COLUMN signed_digital_signature LONGTEXT DEFAULT NULL AFTER signed_by;
-- End of migration_add_returner_signature_asset_return_forms.sql

-- Migration: owner absent — return form skips returner digital sign; dept head pending uses owner_absent OR signed_at
-- Run on asset_mngmnt after prior asset_return_forms migrations.

ALTER TABLE asset_return_forms
  ADD COLUMN owner_absent TINYINT(1) NOT NULL DEFAULT 0 AFTER process_user_position;
-- End of migration_add_owner_absent_asset_return_forms.sql

-- Migration: Staff (processor) decline with reason + snapshot of processor job title on process
-- Run after migration_transfer_hold_and_decline.sql (or any migration that has asset_return_forms.declined_at)

ALTER TABLE asset_return_forms ADD COLUMN processor_declined_at DATETIME DEFAULT NULL;
ALTER TABLE asset_return_forms ADD COLUMN processor_declined_by CHAR(36) DEFAULT NULL;
ALTER TABLE asset_return_forms ADD COLUMN processor_decline_reason TEXT DEFAULT NULL;
ALTER TABLE asset_return_forms ADD COLUMN process_user_position VARCHAR(255) DEFAULT NULL;

ALTER TABLE asset_return_forms ADD KEY idx_arf_processor_declined_by (processor_declined_by);
ALTER TABLE asset_return_forms ADD CONSTRAINT fk_arf_processor_declined_by
  FOREIGN KEY (processor_declined_by) REFERENCES users (userID) ON DELETE SET NULL ON UPDATE CASCADE;
-- End of migration_add_processor_decline_and_position_asset_return_forms.sql

-- Migration: add condition_images column and sp_create_asset_return stored procedure
-- condition_images stores JSON array of Cloudinary URLs for return condition photos

-- 1. Add condition_images column
ALTER TABLE `asset_returns`
ADD COLUMN `condition_images` JSON NULL COMMENT 'Array of Cloudinary URLs for return condition photos' AFTER `form_id`;

-- 2. Create sp_create_asset_return stored procedure
DROP PROCEDURE IF EXISTS `sp_create_asset_return`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_asset_return`(
  IN p_return_id VARCHAR(36),
  IN p_assignment_id VARCHAR(36),
  IN p_user_id VARCHAR(36),
  IN p_return_condition VARCHAR(50),
  IN p_return_notes TEXT,
  IN p_return_location_id VARCHAR(36),
  IN p_return_location_room_id VARCHAR(36),
  IN p_return_department_id VARCHAR(36),
  IN p_return_batch_id VARCHAR(36),
  IN p_form_id VARCHAR(36),
  IN p_condition_images JSON
)
BEGIN
  INSERT INTO asset_returns (
    return_id,
    assignment_id,
    user_id,
    return_condition,
    return_notes,
    return_location_id,
    return_location_room_id,
    return_department_id,
    return_batch_id,
    form_id,
    condition_images
  ) VALUES (
    p_return_id,
    p_assignment_id,
    p_user_id,
    p_return_condition,
    p_return_notes,
    NULLIF(p_return_location_id, ''),
    NULLIF(p_return_location_room_id, ''),
    NULLIF(p_return_department_id, ''),
    NULLIF(p_return_batch_id, ''),
    NULLIF(p_form_id, ''),
    p_condition_images
  );
END ;;
DELIMITER ;
-- End of migration_add_condition_images_asset_returns.sql

-- Migration to add return location fields to asset_returns table
-- This migration adds fields to track where assets are returned to

-- Add return location fields to asset_returns table
ALTER TABLE `asset_returns` 
ADD COLUMN `return_location_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Location where asset was returned to' AFTER `return_notes`,
ADD COLUMN `return_location_room_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Room/area where asset was returned to' AFTER `return_location_id`,
ADD COLUMN `return_department_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Department where asset was returned to' AFTER `return_location_room_id`,
ADD INDEX `idx_asset_returns_return_location_id` (`return_location_id`),
ADD INDEX `idx_asset_returns_return_location_room_id` (`return_location_room_id`),
ADD INDEX `idx_asset_returns_return_department_id` (`return_department_id`),
ADD CONSTRAINT `fk_asset_returns_return_location_id` FOREIGN KEY (`return_location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `fk_asset_returns_return_location_room_id` FOREIGN KEY (`return_location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `fk_asset_returns_return_department_id` FOREIGN KEY (`return_department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Update the model to include the new fields
-- Note: This is a comment for documentation. The actual model update should be done in the TypeScript file.

-- Verify the table structure
DESCRIBE `asset_returns`;
-- End of migration_add_return_location_fields.sql

-- Migration: add return_type and received_by to asset_return_forms
-- For Return Type (Returned/Offboarding) and Received By (IT Staff, etc.) selections.

ALTER TABLE asset_return_forms
  ADD COLUMN return_type VARCHAR(50) DEFAULT NULL,
  ADD COLUMN received_by VARCHAR(50) DEFAULT NULL;
-- End of migration_add_return_type_received_by.sql

-- Migration: add return_batch_id to asset_returns for grouping multi-asset returns into one form
-- Run this on your asset_mngmnt database.

ALTER TABLE asset_returns
  ADD COLUMN return_batch_id VARCHAR(36) NULL DEFAULT NULL AFTER return_department_id,
  ADD INDEX idx_asset_returns_return_batch_id (return_batch_id);
-- End of migration_add_return_batch_id.sql

-- Extend accountability form lifecycle for assignee decline (profile documents).
-- Run against the application database.

ALTER TABLE `accountability_forms`
  MODIFY COLUMN `status` ENUM(
    'Pending',
    'Signed',
    'Completed',
    'Revoked',
    'Disabled',
    'Declined'
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending';

ALTER TABLE `accountability_forms`
  ADD COLUMN `decline_reason` TEXT NULL
  AFTER `status`;
-- End of migration_accountability_form_decline.sql

-- Migration: Add dept_head and it_manager approval columns to asset_transfer_forms
-- Same approval flow as asset_return_forms: Dept Head approves, then IT Manager receives.
-- Run after migration_create_asset_transfer_forms.sql
-- Run each ALTER separately; skip if columns already exist.

ALTER TABLE asset_transfer_forms ADD COLUMN dept_head_signed_at DATETIME DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN dept_head_digital_signature TEXT DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN dept_head_signed_by CHAR(36) DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN it_manager_signed_at DATETIME DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN it_manager_digital_signature TEXT DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN it_manager_signed_by CHAR(36) DEFAULT NULL;
-- End of migration_add_transfer_form_approvals.sql

-- Add executed_at to asset_transfer_forms (required for return form approval when a linked transfer exists).
-- If you get "Duplicate column name", the column already exists — you're done.
-- Full migration (assignments table + this column): migration_transfer_form_assignments_and_executed_at.sql

ALTER TABLE asset_transfer_forms ADD COLUMN executed_at DATETIME DEFAULT NULL;
-- End of migration_add_executed_at_asset_transfer_forms.sql

-- Migration: transfer_form_assignments table and executed_at on asset_transfer_forms
-- For transfer-request flow: store which assignments belong to a form before execution;
-- executed_at marks forms that have been executed so they leave the "approved for execution" list.
-- Run after migration_create_asset_transfer_forms.sql and migration_add_transfer_form_approvals.sql

-- 1. Add executed_at to asset_transfer_forms (nullable; set when transfer is executed)
ALTER TABLE asset_transfer_forms ADD COLUMN executed_at DATETIME DEFAULT NULL;

-- 2. Create transfer_form_assignments (form_id, assignment_id) for submit-request flow
CREATE TABLE IF NOT EXISTS transfer_form_assignments (
  form_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  assignment_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (form_id, assignment_id),
  KEY idx_tfa_form_id (form_id),
  KEY idx_tfa_assignment_id (assignment_id),
  CONSTRAINT fk_tfa_form_id FOREIGN KEY (form_id) REFERENCES asset_transfer_forms (formID) ON DELETE CASCADE,
  CONSTRAINT fk_tfa_assignment_id FOREIGN KEY (assignment_id) REFERENCES asset_assignments (assignmentID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- End of migration_transfer_form_assignments_and_executed_at.sql

-- Split Forms "Transfer forms" permission from Assets "Asset Transfer".
-- Run on asset_mngmnt after deploying code that adds module "Transfer Form".
-- Copies existing Asset Transfer grants so behavior matches the previous single module.

INSERT INTO user_permissions (user_id, module_name, permission_type, granted)
SELECT up.user_id, 'Transfer Form', up.permission_type, up.granted
FROM user_permissions up
WHERE up.module_name = 'Asset Transfer'
  AND NOT EXISTS (
    SELECT 1
    FROM user_permissions existing
    WHERE existing.user_id = up.user_id
      AND existing.module_name = 'Transfer Form'
      AND existing.permission_type = up.permission_type
  );

INSERT INTO role_permissions (role_id, module_name, permission_type, granted)
SELECT rp.role_id, 'Transfer Form', rp.permission_type, rp.granted
FROM role_permissions rp
WHERE rp.module_name = 'Asset Transfer'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions existing
    WHERE existing.role_id = rp.role_id
      AND existing.module_name = 'Transfer Form'
      AND existing.permission_type = rp.permission_type
  );
-- End of migration_transfer_form_module.sql

-- Migration: Update sp_get_asset_transfer_form_by_id to return dept_head and it_manager approval columns.
-- Run after migration_add_transfer_form_approvals.sql so asset_transfer_forms has those columns.

DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_form_by_id`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_transfer_form_by_id`(IN p_form_id CHAR(36))
BEGIN
  SELECT
    atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id,
    atf.location_room_id, atf.new_assigned_user_id, atf.created_by, atf.created_at,
    atf.signed_at, atf.signed_by, atf.signed_digital_signature,
    DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
    atf.process_digital_signature, atf.transfer_type, atf.received_by,
    atf.return_form_id,
    DATE_FORMAT(atf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
    atf.dept_head_digital_signature,
    atf.dept_head_signed_by,
    DATE_FORMAT(atf.it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
    atf.it_manager_digital_signature,
    atf.it_manager_signed_by
  FROM asset_transfer_forms atf
  WHERE atf.formID = p_form_id AND atf.deleted_at IS NULL
  LIMIT 1;
END ;;
DELIMITER ;
-- End of migration_transfer_form_sp_return_approval_columns.sql

-- Migration: Transfer hold flow and decline
-- Adds return_form_id link, declined_at/declined_by on transfer and return forms.
-- Run after migration_transfer_form_assignments_and_executed_at.sql

-- 1. Link return form to transfer form (for hold flow: both created together)
ALTER TABLE asset_transfer_forms ADD COLUMN return_form_id CHAR(36) DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD KEY idx_atf_return_form_id (return_form_id);
ALTER TABLE asset_transfer_forms ADD CONSTRAINT fk_atf_return_form_id
  FOREIGN KEY (return_form_id) REFERENCES asset_return_forms (formID) ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Decline state on transfer forms
ALTER TABLE asset_transfer_forms ADD COLUMN declined_at DATETIME DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN declined_by CHAR(36) DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD KEY idx_atf_declined_by (declined_by);
ALTER TABLE asset_transfer_forms ADD CONSTRAINT fk_atf_declined_by FOREIGN KEY (declined_by) REFERENCES users (userID) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Decline state on return forms
ALTER TABLE asset_return_forms ADD COLUMN declined_at DATETIME DEFAULT NULL;
ALTER TABLE asset_return_forms ADD COLUMN declined_by CHAR(36) DEFAULT NULL;
ALTER TABLE asset_return_forms ADD KEY idx_arf_declined_by (declined_by);
ALTER TABLE asset_return_forms ADD CONSTRAINT fk_arf_declined_by FOREIGN KEY (declined_by) REFERENCES users (userID) ON DELETE SET NULL ON UPDATE CASCADE;
-- End of migration_transfer_hold_and_decline.sql

-- Store processor digital signature at create-held (Asset Transfer Confirmation).
-- Used for auto-execute when both dept heads approve; not displayed until then.

ALTER TABLE asset_transfer_forms
  ADD COLUMN processor_pending_signature LONGTEXT DEFAULT NULL,
  ADD COLUMN processor_pending_signed_at DATETIME DEFAULT NULL;
-- End of migration_transfer_processor_pending_signature.sql

-- Store condition, notes, and condition images from Asset Transfer Confirmation (create-held flow)
-- so they appear in Transfer History and can be prefilled when executing.

ALTER TABLE transfer_form_assignments
  ADD COLUMN transfer_condition VARCHAR(50) DEFAULT NULL,
  ADD COLUMN transfer_notes TEXT DEFAULT NULL,
  ADD COLUMN condition_images JSON DEFAULT NULL;
-- End of migration_transfer_form_assignment_condition.sql

-- Migration: add received_copy_201_file_signature to accountability_forms
-- For "Received Copy for 201 File" signature on the 3rd page (HR Copy).
-- Run this on your asset_mngmnt database.

ALTER TABLE accountability_forms
  ADD COLUMN received_copy_201_file_signature MEDIUMTEXT DEFAULT NULL AFTER it_copy_signature;
-- End of migration_add_received_copy_201_file_signature.sql

-- Migration: add received_copy_201_file_signed_at and signed_by
-- For date, time, and signer name on Received Copy for 201 File section.

ALTER TABLE accountability_forms
  ADD COLUMN received_copy_201_file_signed_at DATETIME DEFAULT NULL,
  ADD COLUMN received_copy_201_file_signed_by CHAR(36) DEFAULT NULL AFTER received_copy_201_file_signature;
-- End of migration_add_received_copy_201_file_signed_by.sql

-- Store signer full name directly so it always displays in PDF.
ALTER TABLE accountability_forms
  ADD COLUMN received_copy_201_file_signed_by_name VARCHAR(255) DEFAULT NULL;
-- End of migration_add_received_copy_signed_by_name.sql

-- Migration: store HR-uploaded wet-signed PDF URL for Received Copy (201 file)
ALTER TABLE accountability_forms
  ADD COLUMN received_copy_wet_pdf_url VARCHAR(1024) DEFAULT NULL
  AFTER received_copy_201_file_signed_by_name;
-- End of migration_add_received_copy_wet_pdf_url.sql

-- Migration: store processor-uploaded wet-signed asset return form PDF (local disk marker or legacy URL)
ALTER TABLE asset_return_forms
  ADD COLUMN processor_wet_return_pdf_url VARCHAR(1024) DEFAULT NULL;
-- End of migration_add_processor_wet_return_pdf_url.sql

-- Wet-signed transfer form PDF (processor upload), same pattern as asset_return_forms.processor_wet_return_pdf_url
ALTER TABLE asset_transfer_forms
  ADD COLUMN processor_wet_transfer_pdf_url VARCHAR(1024) DEFAULT NULL;
-- End of migration_add_processor_wet_transfer_pdf_url.sql

-- Migration to add issuer_signature column to accountability_forms table
-- This will separate the issuer signature from the acknowledgments JSON field
-- for better data organization and retrieval

-- Add new column for issuer signature
ALTER TABLE accountability_forms
ADD COLUMN issuer_signature MEDIUMTEXT DEFAULT NULL AFTER acknowledgments;

-- Update the acknowledgments column comment to clarify it's for user signature
ALTER TABLE accountability_forms
MODIFY COLUMN acknowledgments JSON DEFAULT NULL COMMENT 'Contains user signature and other acknowledgment data (NOT issuer signature)';

-- Create index for better performance on issuer signature queries
CREATE INDEX idx_accountability_forms_issuer_signature ON accountability_forms (issuer_signature(255));

-- Update existing forms that have issuer signature in acknowledgments
-- This will migrate any existing issuer signatures from acknowledgments to the new column
UPDATE accountability_forms
SET issuer_signature = JSON_UNQUOTE(JSON_EXTRACT(acknowledgments, '$.issuerSignature'))
WHERE acknowledgments IS NOT NULL 
AND JSON_EXTRACT(acknowledgments, '$.issuerSignature') IS NOT NULL;

-- Remove issuerSignature from acknowledgments to clean up the data
UPDATE accountability_forms
SET acknowledgments = JSON_REMOVE(acknowledgments, '$.issuerSignature')
WHERE acknowledgments IS NOT NULL 
AND JSON_EXTRACT(acknowledgments, '$.issuerSignature') IS NOT NULL;

-- Verify the migration
SELECT 
    COUNT(*) as total_forms,
    COUNT(issuer_signature) as forms_with_issuer_signature,
    COUNT(CASE WHEN acknowledgments IS NOT NULL AND JSON_EXTRACT(acknowledgments, '$.issuerSignature') IS NOT NULL THEN 1 END) as forms_with_issuer_in_acknowledgments
FROM accountability_forms;
-- End of migration_add_issuer_signature_column.sql

-- Migration: Add hr_accountability_receiver to role JSON in sp_get_users and sp_get_user_profile
-- This ensures users with role-level hr_accountability_receiver setting can see the HR Copy tab

DROP PROCEDURE IF EXISTS `sp_get_users`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_users`()
BEGIN
    SELECT
        u.userID as id,
        u.email,
        u.first_name,
        u.last_name,
        u.username,
        u.contact_number,
        u.position,
        u.department_id,
        u.company_id,
        u.role_id,
        u.employee_number,
        u.avatar_url,
        u.is_active as is_active,
        u.created_at,
        u.updated_at,
        d.name as department,
        CASE WHEN c.companyID IS NOT NULL THEN
            CONCAT('{"id":"', IFNULL(c.companyID, ''), '","name":"', IFNULL(REPLACE(REPLACE(c.name, '\\', '\\\\'), '"', '\\"'), ''), '"}')
        ELSE NULL END as company,
        CASE WHEN r.roleID IS NOT NULL THEN
            CONCAT('{"roleID":"', IFNULL(r.roleID, ''), '","name":"', IFNULL(REPLACE(REPLACE(r.name, '\\', '\\\\'), '"', '\\"'), ''), '","deleted_by":"', IFNULL(r.deleted_by, ''), '","hr_accountability_receiver":', IFNULL(r.hr_accountability_receiver, 0), '}')
        ELSE NULL END as role,
        IFNULL(uc.access_add_edit, 0) as access_add_edit,
        IFNULL(uc.access_assignment, 0) as access_assignment,
        IFNULL(uc.access_return, 0) as access_return,
        IFNULL(uc.hr_accountability_receiver, 0) as hr_accountability_receiver,
        IFNULL(uc.manager_approver_1, 0) as manager_approver_1,
        IFNULL(uc.manager_approver_2, 0) as manager_approver_2,
        IFNULL(uc.manager_approver_3, 0) as manager_approver_3
    FROM users u
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN companies c ON u.company_id = c.companyID AND c.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
    LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
    WHERE u.is_active = 1
    ORDER BY u.created_at DESC;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_user_profile`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_profile`(
    IN p_user_id CHAR(36)
)
BEGIN
    SELECT
        u.userID, u.email, u.username, u.first_name, u.middle_name, u.last_name,
        u.contact_number, u.role_id, u.department_id, u.company_id, u.employee_number,
        u.position, u.verified, u.created_at, u.avatar_url, u.digital_signature,
        d.name as department_name,
        c.name as company_name,
        r.name as role_name,
        r.hr_accountability_receiver as role_hr_accountability_receiver,
        IFNULL(uc.hr_accountability_receiver, 0) as user_hr_accountability_receiver
    FROM users u
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN companies c ON u.company_id = c.companyID AND c.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
    LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
    WHERE u.userID = p_user_id;

    SELECT
        unit_no, building_house_no AS buildingNo, street, subdivision,
        barangay, city, province, region
    FROM user_address
    WHERE userID = p_user_id AND is_permanent = 1
    LIMIT 1;
END ;;
DELIMITER ;
-- End of migration_add_hr_accountability_receiver_to_role_json.sql

-- Migration: add stored procedures for notifications and audit
-- Run on asset_mngmnt database

DROP PROCEDURE IF EXISTS `sp_get_notifications_count`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_notifications_count`(IN p_user_id CHAR(36))
BEGIN
  SELECT COUNT(*) AS count
  FROM notifications
  WHERE user_id = p_user_id AND deleted_at IS NULL;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_notifications`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_notifications`(
  IN p_user_id CHAR(36),
  IN p_status VARCHAR(20),
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT
    notificationID AS id,
    title,
    message AS description,
    type,
    status,
    data,
    created_at AS timestamp
  FROM notifications
  WHERE user_id = p_user_id AND deleted_at IS NULL
    AND (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_mark_notification_read`;
DELIMITER ;;
CREATE PROCEDURE `sp_mark_notification_read`(
  IN p_notification_id CHAR(36),
  IN p_user_id CHAR(36)
)
BEGIN
  UPDATE notifications
  SET status = 'read', updated_at = NOW()
  WHERE notificationID = p_notification_id AND user_id = p_user_id AND deleted_at IS NULL;
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_create_audit_log`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_audit_log`(
  IN p_user_id VARCHAR(36),
  IN p_action VARCHAR(255),
  IN p_resource_type VARCHAR(100),
  IN p_resource_id VARCHAR(255),
  IN p_resource_name VARCHAR(255),
  IN p_details TEXT,
  IN p_old_values TEXT,
  IN p_new_values TEXT,
  IN p_ip_address VARCHAR(45),
  IN p_user_agent TEXT,
  IN p_company_id CHAR(36)
)
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id, resource_name,
    details, old_values, new_values, ip_address, user_agent, company_id
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id, p_resource_name,
    p_details, p_old_values, p_new_values, p_ip_address, p_user_agent, p_company_id
  );
  SELECT LAST_INSERT_ID() AS auditID;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_audit_logs_count`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_audit_logs_count`()
BEGIN
  SELECT COUNT(*) AS total FROM audit_logs WHERE deleted_at IS NULL;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_audit_logs`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_audit_logs`(
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT
    al.auditID,
    al.created_at,
    al.user_id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.resource_name,
    al.details,
    al.old_values,
    al.new_values,
    al.ip_address,
    al.user_agent,
    al.company_id,
    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
    u.email AS user_email
  FROM audit_logs al
  LEFT JOIN users u ON al.user_id = u.userID
  WHERE al.deleted_at IS NULL
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END ;;
DELIMITER ;
-- End of migration_add_notifications_audit_sps.sql

-- Migration to update asset_counters table to support department-based sequencing

USE `asset_mngmnt`;

-- 1. Drop existing primary key
ALTER TABLE asset_counters DROP PRIMARY KEY;

-- 2. Add department_id column
ALTER TABLE asset_counters ADD COLUMN department_id CHAR(36) NULL;

-- 3. Create composite primary key on company_id and department_id
ALTER TABLE asset_counters ADD PRIMARY KEY (company_id, department_id);

-- 4. Add foreign key constraint for department_id
ALTER TABLE asset_counters ADD CONSTRAINT asset_counters_ibfk_2 
FOREIGN KEY (department_id) REFERENCES asset_mngmnt_departments(departmentID) 
ON DELETE SET NULL;

-- 5. Move existing data to new structure
-- For existing counters without department_id, we'll keep them as NULL (company-wide)
-- This ensures backward compatibility

-- Verify the changes
SELECT * FROM asset_counters;

-- Check table structure
DESCRIBE asset_counters;
-- End of migration_asset_counters_department.sql

-- One-time data cleanup: form workflows use printed name + timestamp (no stored
-- signature images on forms). Profile canvas signatures (users.digital_signature)
-- are NOT cleared by this script.
-- Safe to re-run: sets listed columns to NULL.
--
-- MySQL Workbench "safe updates" (sql_safe_updates): UPDATE must reference a KEY
-- column in WHERE. Using PRIMARY KEY (formID / borrow_request_id) avoids Error 1175.

UPDATE asset_return_forms SET
  signed_digital_signature = NULL,
  process_digital_signature = NULL,
  dept_head_digital_signature = NULL,
  it_manager_digital_signature = NULL
WHERE deleted_at IS NULL
  AND formID <> '';

UPDATE asset_transfer_forms SET
  signed_digital_signature = NULL,
  process_digital_signature = NULL,
  dept_head_digital_signature = NULL,
  it_manager_digital_signature = NULL,
  processor_pending_signature = NULL
WHERE deleted_at IS NULL
  AND formID <> '';

UPDATE accountability_forms SET
  issuer_signature = NULL,
  it_copy_signature = NULL,
  received_copy_201_file_signature = NULL
WHERE deleted_at IS NULL
  AND formID <> '';

UPDATE accountability_forms SET
  acknowledgments = JSON_REMOVE(CAST(acknowledgments AS JSON), '$.digitalSignature')
WHERE deleted_at IS NULL
  AND formID <> ''
  AND acknowledgments IS NOT NULL
  AND JSON_VALID(acknowledgments)
  AND JSON_CONTAINS_PATH(acknowledgments, 'one', '$.digitalSignature');

UPDATE asset_borrow_requests
SET dept_head_digital_signature = NULL
WHERE borrow_request_id <> '';
-- End of migration_clear_stored_digital_signatures_name_only.sql

-- Remove default value from condition column to prevent automatic 'Good' assignment
ALTER TABLE assets MODIFY COLUMN `condition` ENUM('Excellent','Good','Fair','Poor','Damaged') DEFAULT NULL;

-- Remove default value from maintenance_schedule column to prevent automatic 'None' assignment
ALTER TABLE assets MODIFY COLUMN `maintenance_schedule` ENUM('Monthly','Quarterly','Semi-Annual','Annually','As Needed','None') DEFAULT NULL;
-- End of migration_remove_condition_default.sql

-- Migration to remove pdf_file_path field from asset_returns table
-- This field is no longer needed for the current implementation

-- Remove the pdf_file_path column and its foreign key constraint
ALTER TABLE `asset_returns` 
DROP COLUMN `pdf_file_path`;

-- Verify the table structure after removal
DESCRIBE `asset_returns`;

-- Show the updated table structure
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    COLUMN_DEFAULT,
    EXTRA
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'asset_mngmnt' 
  AND TABLE_NAME = 'asset_returns'
ORDER BY ORDINAL_POSITION;
-- End of migration_remove_pdf_file_path.sql

-- Migration to make pdf_file_path nullable in asset_returns table
-- This allows asset returns to be created without PDF file paths

-- Disable safe update mode for this session
SET SQL_SAFE_UPDATES = 0;

-- Make pdf_file_path column nullable
ALTER TABLE asset_returns 
MODIFY COLUMN pdf_file_path VARCHAR(500) NULL;

-- Update any existing records that might have empty strings to NULL
UPDATE asset_returns 
SET pdf_file_path = NULL 
WHERE pdf_file_path = '';

-- Add comment to document the change
ALTER TABLE asset_returns 
CHANGE COLUMN pdf_file_path pdf_file_path VARCHAR(500) NULL COMMENT 'Path to PDF file (optional - for legacy compatibility)';

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;
-- End of migration_remove_pdf_file_path_not_null.sql

-- Migration to separate assets data from acknowledgments in accountability_forms table
-- This will prevent asset information from being overwritten when forms are signed

USE `asset_mngmnt`;

-- Add new column for assets data
ALTER TABLE accountability_forms 
ADD COLUMN assets_data JSON DEFAULT NULL AFTER acknowledgments;

-- Copy existing asset data from acknowledgments column to the new assets_data column
-- Only for records that have assets in their acknowledgments (builder forms)
UPDATE accountability_forms 
SET assets_data = JSON_EXTRACT(acknowledgments, '$.assets')
WHERE acknowledgments IS NOT NULL 
AND JSON_EXTRACT(acknowledgments, '$.assets') IS NOT NULL;

-- Add comment to document the new structure
ALTER TABLE accountability_forms 
MODIFY COLUMN acknowledgments JSON DEFAULT NULL COMMENT 'Contains signature and other acknowledgment data (NOT assets)',
MODIFY COLUMN assets_data JSON DEFAULT NULL COMMENT 'Contains asset information for accountability forms';

-- Create index for better performance
CREATE INDEX idx_accountability_forms_assets_data ON accountability_forms (assets_data);

-- Verification query to check the migration
SELECT 
    formID,
    form_number,
    status,
    CASE 
        WHEN assets_data IS NOT NULL THEN 'Has assets data'
        ELSE 'No assets data'
    END as assets_status,
    CASE 
        WHEN acknowledgments IS NOT NULL THEN 'Has acknowledgments'
        ELSE 'No acknowledgments'
    END as acknowledgments_status
FROM accountability_forms 
ORDER BY created_at DESC 
LIMIT 10;
-- End of migration_separate_accountability_data.sql

-- Migration to rename 'id' column to 'return_id' in asset_returns table
-- This ensures the database schema matches the model interface

-- First, add the new return_id column with UUID format
ALTER TABLE asset_returns ADD COLUMN return_id VARCHAR(36) NOT NULL AFTER id;

-- Copy data from id column to return_id column
UPDATE asset_returns SET return_id = id;

-- Drop the old id column
ALTER TABLE asset_returns DROP COLUMN id;

-- Set return_id as the primary key
ALTER TABLE asset_returns ADD PRIMARY KEY (return_id);

-- Update foreign key constraints if needed (though there shouldn't be any referencing asset_returns.id)
-- The foreign keys in other tables should reference return_id now

-- Verify the changes
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'asset_mngmnt' AND TABLE_NAME = 'asset_returns' 
ORDER BY ORDINAL_POSITION;

-- Show table structure
DESCRIBE asset_returns;
-- End of migration_rename_id_to_return_id.sql

-- Create positions table
DROP TABLE IF EXISTS `asset_mngmnt_positions`;

CREATE TABLE `asset_mngmnt_positions` (
  `positionID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`positionID`),
  KEY `idx_department_id` (`department_id`),
  CONSTRAINT `fk_positions_department` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- End of asset_mngmnt_positions.sql

-- Create stored procedures for positions management

-- Create position procedure
DROP PROCEDURE IF EXISTS `sp_create_position`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_position`(
  IN p_name VARCHAR(255),
  IN p_description TEXT,
  IN p_department_id CHAR(36),
  IN p_created_by CHAR(36)
)
BEGIN
  INSERT INTO asset_mngmnt_positions (name, description, department_id, created_by, updated_by)
  VALUES (p_name, p_description, p_department_id, p_created_by, p_created_by);
  SELECT LAST_INSERT_ID() as positionID;
END ;;
DELIMITER ;

-- Update position procedure
DROP PROCEDURE IF EXISTS `sp_update_position`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_position`(
  IN p_id CHAR(36),
  IN p_name VARCHAR(255),
  IN p_description TEXT,
  IN p_department_id CHAR(36),
  IN p_updated_by CHAR(36)
)
BEGIN
  UPDATE asset_mngmnt_positions
  SET name = p_name, description = p_description, department_id = p_department_id, updated_by = p_updated_by, updated_at = CURRENT_TIMESTAMP
  WHERE positionID = p_id AND deleted_at IS NULL AND department_id = p_department_id;
  SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;

-- Get positions by department procedure
DROP PROCEDURE IF EXISTS `sp_get_positions_by_department`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_positions_by_department`(IN p_department_id CHAR(36))
BEGIN
  SELECT positionID, name, description, department_id, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by
  FROM asset_mngmnt_positions
  WHERE deleted_at IS NULL AND department_id = p_department_id
  ORDER BY name;
END ;;
DELIMITER ;

-- Get all positions procedure
DROP PROCEDURE IF EXISTS `sp_get_all_positions`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_all_positions`(IN p_company_id CHAR(36))
BEGIN
  SELECT p.positionID, p.name, p.description, p.department_id, p.created_at, p.created_by, p.updated_at, p.updated_by, p.deleted_at, p.deleted_by,
         d.name as department_name, d.code as department_code
  FROM asset_mngmnt_positions p
  JOIN asset_mngmnt_departments d ON p.department_id = d.departmentID
  WHERE p.deleted_at IS NULL AND d.company_id = p_company_id
  ORDER BY d.name, p.name;
END ;;
DELIMITER ;

-- Soft delete position procedure
DROP PROCEDURE IF EXISTS `sp_delete_position`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_position`(
  IN p_id CHAR(36),
  IN p_department_id CHAR(36),
  IN p_deleted_by CHAR(36)
)
BEGIN
  UPDATE asset_mngmnt_positions
  SET deleted_at = CURRENT_TIMESTAMP, deleted_by = p_deleted_by
  WHERE positionID = p_id AND deleted_at IS NULL AND department_id = p_department_id;
  SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;
-- End of asset_mngmnt_positions_routines.sql

-- Compliance audit migration
-- Adds metadata fields, hash-chain fields, and archive table for audit logs.

-- Stored procedure to add column if it doesn't exist
DELIMITER //
DROP PROCEDURE IF EXISTS add_column_if_not_exists //
CREATE PROCEDURE add_column_if_not_exists()
BEGIN
  -- Add status column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN status ENUM('success','failure') NOT NULL DEFAULT 'success' AFTER company_id;
  END IF;

  -- Add severity column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'severity'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN severity ENUM('info','warning','critical') NOT NULL DEFAULT 'info' AFTER status;
  END IF;

  -- Add request_id column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'request_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN request_id VARCHAR(64) NULL AFTER severity;
  END IF;

  -- Add session_id column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN session_id VARCHAR(64) NULL AFTER request_id;
  END IF;

  -- Add http_method column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'http_method'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN http_method VARCHAR(16) NULL AFTER session_id;
  END IF;

  -- Add http_endpoint column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'http_endpoint'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN http_endpoint VARCHAR(255) NULL AFTER http_method;
  END IF;

  -- Add prev_hash column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'prev_hash'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN prev_hash CHAR(64) NULL AFTER http_endpoint;
  END IF;

  -- Add row_hash column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'row_hash'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN row_hash CHAR(64) NULL AFTER prev_hash;
  END IF;
END //
DELIMITER ;

CALL add_column_if_not_exists();
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- Add indexes (IF NOT EXISTS is supported for indexes in MySQL 8.0+)
-- For older versions, we use a similar approach
DELIMITER //
DROP PROCEDURE IF EXISTS add_index_if_not_exists //
CREATE PROCEDURE add_index_if_not_exists()
BEGIN
  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_status'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_status (status);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_severity'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_severity (severity);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_request_id'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_request_id (request_id);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_session_id'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_session_id (session_id);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_company_created'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_company_created (company_id, created_at);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_resource_lookup'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_resource_lookup (resource_type, resource_id);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_row_hash'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_row_hash (row_hash);
  END IF;
END //
DELIMITER ;

CALL add_index_if_not_exists();
DROP PROCEDURE IF EXISTS add_index_if_not_exists;

CREATE TABLE IF NOT EXISTS audit_logs_archive (
  archive_id CHAR(36) NOT NULL DEFAULT (UUID()),
  auditID CHAR(36) NOT NULL,
  user_id CHAR(36) DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id CHAR(36) DEFAULT NULL,
  resource_name VARCHAR(255) DEFAULT NULL,
  details TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT,
  company_id CHAR(36) DEFAULT NULL,
  status ENUM('success','failure') NOT NULL DEFAULT 'success',
  severity ENUM('info','warning','critical') NOT NULL DEFAULT 'info',
  request_id VARCHAR(64) DEFAULT NULL,
  session_id VARCHAR(64) DEFAULT NULL,
  http_method VARCHAR(16) DEFAULT NULL,
  http_endpoint VARCHAR(255) DEFAULT NULL,
  prev_hash CHAR(64) DEFAULT NULL,
  row_hash CHAR(64) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived_by CHAR(36) DEFAULT NULL,
  PRIMARY KEY (archive_id),
  KEY idx_audit_logs_archive_audit_id (auditID),
  KEY idx_audit_logs_archive_company_created (company_id, created_at),
  KEY idx_audit_logs_archive_archived_at (archived_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit retention settings table
CREATE TABLE IF NOT EXISTS audit_retention_settings (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  retention_months INT NOT NULL DEFAULT 36,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_archived_at DATETIME DEFAULT NULL,
  archived_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_audit_retention_company (company_id),
  CONSTRAINT fk_audit_retention_company FOREIGN KEY (company_id) REFERENCES companies (companyID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System-wide audit retention defaults in settings table
INSERT INTO asset_mngmnt_settings (`key`, `value`, `description`, `type`)
VALUES 
  ('audit_retention_default_months', '36', 'Default retention horizon in months for new companies', 'number'),
  ('audit_retention_minimum_months', '12', 'Minimum retention horizon in months (system-wide floor)', 'number')
ON DUPLICATE KEY UPDATE description = VALUES(description), `value` = VALUES(`value`);
-- End of add_audit_compliance_fields.sql

-- Add missing columns to audit_logs table (prev_hash and row_hash already added)
ALTER TABLE audit_logs
ADD COLUMN status VARCHAR(20) NULL DEFAULT 'success',
ADD COLUMN severity VARCHAR(20) NULL DEFAULT 'info',
ADD COLUMN request_id VARCHAR(255) NULL,
ADD COLUMN session_id VARCHAR(255) NULL,
ADD COLUMN http_method VARCHAR(10) NULL,
ADD COLUMN http_endpoint VARCHAR(255) NULL;
-- End of add_audit_hash_columns.sql

-- Add company_id to sp_get_locations and sp_get_departments stored procedures
-- This is needed for frontend filtering by company
-- Updated to handle NULL company_id to return all records

-- Drop and recreate sp_get_locations with company_id in SELECT
DROP PROCEDURE IF EXISTS `sp_get_locations`;

DELIMITER ;;

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_locations`(IN p_company_id CHAR(36))
BEGIN
  SELECT
    l.locationID,
    l.name,
    l.floor_unit,
    l.building,
    l.company_id,
    COALESCE(
      JSON_ARRAYAGG(
        CASE WHEN lr.roomID IS NOT NULL AND lr.deleted_at IS NULL
              THEN JSON_OBJECT('roomID', lr.roomID, 'room_name', lr.room_name)
              ELSE NULL END
      ), JSON_ARRAY()
    ) as room_areas,
    l.department_id,
    d.name as department_name,
    d.code as department_code,
    d.prefix as department_prefix,
    d.description as department_description,
    d.created_at as department_created_at,
    d.created_by as department_created_by,
    d.updated_at as department_updated_at,
    d.updated_by as department_updated_by,
    d.deleted_at as department_deleted_at,
    d.deleted_by as department_deleted_by,
    l.description,
    l.created_at,
    l.created_by,
    l.updated_at,
    l.updated_by,
    l.deleted_at,
    l.deleted_by
  FROM asset_mngmnt_locations l
  LEFT JOIN asset_mngmnt_location_rooms lr ON l.locationID = lr.locationID
  LEFT JOIN asset_mngmnt_departments d ON l.department_id = d.departmentID AND d.deleted_at IS NULL
  WHERE l.deleted_at IS NULL AND (p_company_id IS NULL OR l.company_id = p_company_id)
  GROUP BY l.locationID, l.name, l.floor_unit, l.building, l.company_id, l.description,
           l.created_at, l.created_by, l.updated_at, l.updated_by, l.deleted_at, l.deleted_by,
           l.department_id, d.name, d.code, d.prefix, d.description,
           d.created_at, d.created_by, d.updated_at, d.updated_by, d.deleted_at, d.deleted_by
  ORDER BY l.name;
END ;;

DELIMITER ;

-- Drop and recreate sp_get_departments with company_id in SELECT
DROP PROCEDURE IF EXISTS `sp_get_departments`;

DELIMITER ;;

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_departments`(IN p_company_id CHAR(36))
BEGIN
  SELECT
    d.departmentID,
    d.name,
    d.code,
    d.prefix,
    d.company_id,
    d.description,
    d.created_at,
    d.created_by,
    d.updated_at,
    d.updated_by,
    d.deleted_at,
    d.deleted_by
  FROM asset_mngmnt_departments d
  WHERE d.deleted_at IS NULL AND (p_company_id IS NULL OR d.company_id = p_company_id)
  ORDER BY d.name;
END ;;

DELIMITER ;
-- End of add_company_id_to_stored_procedures.sql

-- Create asset_mngmnt_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS `asset_mngmnt_settings` (
    `settingID` INT NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `type` ENUM('string', 'number', 'boolean') NOT NULL DEFAULT 'string',
    `description` TEXT,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` INT NOT NULL DEFAULT 1,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` INT NOT NULL DEFAULT 1,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`settingID`),
    UNIQUE KEY `uk_settings_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add global MFA setting (enabled by default)
-- This setting controls whether users can add MFA to their accounts
INSERT INTO asset_mngmnt_settings (
    `key`,
    `value`,
    `type`,
    `description`,
    `status`,
    `created_by`,
    `updated_by`
) VALUES (
    'mfa_enabled',
    'true',
    'boolean',
    'Global MFA enable/disable setting. When OFF, users cannot add MFA.',
    'active',
    1,
    1
)
ON DUPLICATE KEY UPDATE
    `value` = VALUES(`value`),
    `updated_at` = NOW(),
    `updated_by` = VALUES(`updated_by`);

-- Verify the setting was added
SELECT * FROM asset_mngmnt_settings WHERE `key` = 'mfa_enabled';
-- End of add_mfa_global_setting.sql

-- Script to cleanup asset assignments and accountability forms, and reset asset statuses
-- Database: asset_mngmnt

USE asset_mngmnt;

-- Disable foreign key checks to allow truncation of tables with relationships
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Truncate asset assignment and related tables
-- This removes all assignment history and active assignments
TRUNCATE TABLE asset_assignments;

-- 2. Truncate accountability forms and related return tables
-- This removes all signed forms and return records
TRUNCATE TABLE accountability_forms;
TRUNCATE TABLE asset_accountability_forms; -- Additional table identified in models
TRUNCATE TABLE asset_returns;
TRUNCATE TABLE asset_return_forms;

-- 3. Reset all asset statuses to Available
-- This makes all assets available for new assignments
UPDATE assets 
SET status = 'Available',
    location_id = NULL,
    location_room_id = NULL,
    department_id = NULL,
    updated_at = NOW(),
    updated_by = 'SYSTEM_CLEANUP'
WHERE deleted_at IS NULL;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Output confirmation
SELECT 'Cleanup completed: Tables truncated and asset statuses reset to Available' AS Result;
-- End of cleanup_assets.sql

-- Clear all audit logs from the database
USE asset_mngmnt;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE audit_logs;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Audit logs cleared successfully' AS message;
-- End of clear_audit_logs.sql

