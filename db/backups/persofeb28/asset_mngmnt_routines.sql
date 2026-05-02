CREATE DATABASE  IF NOT EXISTS `asset_mngmnt` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `asset_mngmnt`;
-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: asset_mngmnt
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping events for database 'asset_mngmnt'
--

--
-- Dumping routines for database 'asset_mngmnt'
--
/*!50003 DROP PROCEDURE IF EXISTS `sp_change_password` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_change_password`(
    IN p_user_id CHAR(36),
    IN p_new_password VARCHAR(255)
)
BEGIN
    UPDATE users SET password = p_new_password, updated_at = NOW()
    WHERE userID = p_user_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_cleanup_expired_auth_data` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_cleanup_expired_auth_data`()
BEGIN
  DELETE FROM sessions WHERE expires < NOW();
  DELETE FROM sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 5 MINUTE);
  DELETE FROM verification_tokens WHERE expires < NOW();
  DELETE FROM password_reset_tokens WHERE expires < NOW();
  SELECT 1 AS success;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateBrand` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CreateBrand`(
    IN p_name VARCHAR(255),
    IN p_type_id CHAR(36),
    IN p_prefix VARCHAR(10),
    IN p_company_id CHAR(36),
    IN p_created_by CHAR(36)
)
BEGIN
    DECLARE new_id CHAR(36);

    SET new_id = UUID();

    INSERT INTO asset_brands (
        brandID, name, type_id, prefix, company_id, created_by, updated_by
    ) VALUES (
        new_id, p_name, p_type_id, UPPER(p_prefix), p_company_id, p_created_by, p_created_by
    );

    SELECT * FROM asset_brands WHERE brandID = new_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateCategory` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateCompany` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CreateCompany`(
    IN p_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_code VARCHAR(50),
    IN p_prefix VARCHAR(50),
    IN p_tax_id VARCHAR(100),
    IN p_phone VARCHAR(50),
    IN p_website VARCHAR(255),
    IN p_unit_no VARCHAR(100),
    IN p_building_street TEXT,
    IN p_barangay_name VARCHAR(255),
    IN p_city_name VARCHAR(255),
    IN p_province_name VARCHAR(255),
    IN p_region_name VARCHAR(255),
    IN p_zipcode VARCHAR(20),
    IN p_logo_url VARCHAR(512),
    IN p_industry VARCHAR(100),
    IN p_size VARCHAR(50),
    IN p_created_by CHAR(36)
)
BEGIN
    DECLARE company_cnt INT DEFAULT 0;
    DECLARE new_id CHAR(36);

    SET new_id = UUID();

    SELECT COUNT(*) INTO company_cnt FROM companies;

    INSERT INTO companies (
        companyID, name, email, code, prefix, tax_id, phone, website,
        unit_no, building_street,
        barangay_name, city_name, province_name, region_name, zipcode,
        logo_url, industry, size, is_active, created_by, updated_by
    ) VALUES (
        new_id,
        p_name,
        p_email,
        p_code,
        p_prefix,
        p_tax_id,
        p_phone,
        p_website,
        p_unit_no,
        p_building_street,
        p_barangay_name,
        p_city_name,
        p_province_name,
        p_region_name,
        p_zipcode,
        p_logo_url,
        p_industry,
        p_size,
        IF(company_cnt = 0, TRUE, FALSE),
        p_created_by,
        p_created_by
    );

    SELECT companyID as id, name, email, code, prefix, tax_id, phone, website, unit_no, building_street, barangay_name, city_name, province_name, region_name, zipcode, logo_url, industry, size, is_active, is_main, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by FROM companies WHERE companyID = new_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateSupplier` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CreateSupplier`(
    IN p_name VARCHAR(255),
    IN p_category_id CHAR(36),
    IN p_contact VARCHAR(50),
    IN p_email VARCHAR(255),
    IN p_company_id CHAR(36),
    IN p_created_by CHAR(36)
)
BEGIN
    DECLARE new_id CHAR(36);

    SET new_id = UUID();

    INSERT INTO suppliers (
        supplierID, name, category_id, contact, email, company_id, created_by, updated_by
    ) VALUES (
        new_id, p_name, p_category_id, p_contact, p_email, p_company_id, p_created_by, p_created_by
    );

    SELECT * FROM suppliers WHERE supplierID = new_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateType` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CreateType`(
    IN p_name VARCHAR(255),
    IN p_category_id CHAR(36),
    IN p_prefix VARCHAR(10),
    IN p_company_id CHAR(36),
    IN p_created_by CHAR(36)
)
BEGIN
    DECLARE new_id CHAR(36);

    SET new_id = UUID();

    INSERT INTO asset_types (
        typeID, name, category_id, prefix, company_id, created_by, updated_by
    ) VALUES (
        new_id, p_name, p_category_id, UPPER(p_prefix), p_company_id, p_created_by, p_created_by
    );

    SELECT * FROM asset_types WHERE typeID = new_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_asset` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
    
    -- Ensure department_id is not NULL (use default if necessary)
    IF category_dept_id IS NULL THEN
        SET category_dept_id = p_department_id;
    END IF;
    
    -- If still NULL, use a default department (or create one if it doesn't exist)
    IF category_dept_id IS NULL THEN
        -- Check if default department exists
        SELECT departmentID INTO default_dept_id 
        FROM asset_mngmnt_departments 
        WHERE name = 'Default' AND company_id = p_company_id;
        
        -- Create default department if it doesn't exist
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
        SET @dept_to_use = COALESCE(category_dept_id, p_department_id);
        
        IF @dept_to_use IS NOT NULL THEN
            IF settings_department_format = 'code' THEN
                SELECT code INTO department_part FROM asset_mngmnt_departments WHERE departmentID = @dept_to_use;
            ELSE
                SELECT prefix INTO department_part FROM asset_mngmnt_departments WHERE departmentID = @dept_to_use;
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
    SET @counter_dept_id = COALESCE(category_dept_id, p_department_id);
    
    INSERT INTO asset_counters (company_id, department_id, last_seq) 
    VALUES (p_company_id, @counter_dept_id, 1)
    ON DUPLICATE KEY UPDATE last_seq = last_seq + 1;
    
    SELECT last_seq INTO seq_num 
    FROM asset_counters 
    WHERE company_id = p_company_id 
      AND department_id = @counter_dept_id;

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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_asset_builder` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_asset_builder`(
    IN p_name VARCHAR(255),
    IN p_description TEXT,
    IN p_company_id CHAR(36),
    IN p_created_by CHAR(36),
    IN p_updated_by CHAR(36)
)
BEGIN
    DECLARE new_builder_id CHAR(36);

    -- Generate UUID for the new builder
    SET new_builder_id = UUID();

    -- Insert the new asset builder
    INSERT INTO asset_builders (
        builderID,
        name,
        description,
        status,
        company_id,
        created_by,
        updated_by
    ) VALUES (
        new_builder_id,
        p_name,
        p_description,
        'Available',
        p_company_id,
        p_created_by,
        p_updated_by
    );

    -- Return the created builder
    SELECT
        builderID,
        name,
        description,
        company_id,
        created_at,
        created_by,
        updated_at,
        updated_by
    FROM asset_builders
    WHERE builderID = new_builder_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_asset_document` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_asset_document`(
    IN p_asset_id CHAR(36),
    IN p_file_name VARCHAR(255),
    IN p_file_url MEDIUMTEXT,
    IN p_file_size INT,
    IN p_file_type VARCHAR(100),
    IN p_created_by CHAR(36)
)
BEGIN
    INSERT INTO asset_documents (
        asset_id, file_name, file_url, file_size, file_type, created_by, updated_by
    ) VALUES (
        p_asset_id, p_file_name, p_file_url, p_file_size, p_file_type, p_created_by, p_created_by
    );
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_asset_return` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_asset_return`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_asset_transfer_form` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_asset_transfer_form`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_asset_transfer_record` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_asset_transfer_record`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_asset_with_children` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_asset_with_children`(
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
    IN p_specifications JSON,
    IN p_created_by CHAR(36),
    IN p_updated_by CHAR(36)
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
    DECLARE i INT DEFAULT 0;
    DECLARE spec_count INT;
    DECLARE spec_name VARCHAR(255);
    DECLARE spec_description TEXT;
    DECLARE child_id CHAR(36);
    DECLARE child_code VARCHAR(50);

    START TRANSACTION;

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
    IF settings_department_format != 'none' AND p_department_id IS NOT NULL THEN
        IF settings_department_format = 'code' THEN
            SELECT code INTO department_part FROM asset_mngmnt_departments WHERE departmentID = p_department_id;
        ELSE
            SELECT prefix INTO department_part FROM asset_mngmnt_departments WHERE departmentID = p_department_id;
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

    -- Generate sequential number per company using atomic counter
    INSERT INTO asset_counters (company_id, last_seq) VALUES (p_company_id, 1)
    ON DUPLICATE KEY UPDATE last_seq = last_seq + 1;
    SELECT last_seq INTO seq_num FROM asset_counters WHERE company_id = p_company_id;

    -- Build asset code
    SET asset_code = CONCAT_WS('-',
        NULLIF(company_part, ''),
        NULLIF(category_part, ''),
        NULLIF(type_part, ''),
        NULLIF(department_part, ''),
        NULLIF(date_part, ''),
        LPAD(seq_num, 5, '0')
    );

    -- Insert the main asset
    INSERT INTO assets (
        assetID, asset_code, name, description, category_id, supplier, type_id, brand, model, serial,
        image_url, purchase_date, asset_value, salvage_value, depreciation_method,
        useful_life_years, annual_depreciation, depreciation_start_date, company_id,
        location_id, location_room_id, department_id, location_notes, warranty_months,
        `condition`, maintenance_schedule, status, is_old_unit, created_by, updated_by
    ) VALUES (
        new_id, asset_code, p_name, p_description, p_category_id, p_supplier, p_type_id, p_brand, p_model, p_serial,
        p_image_url, p_purchase_date, p_asset_value, p_salvage_value, p_depreciation_method,
        p_useful_life_years, p_annual_depreciation, p_depreciation_start_date, p_company_id,
        p_location_id, p_location_room_id, p_department_id, p_location_notes, p_warranty_months,
        p_condition, p_maintenance_schedule, p_status, p_is_old_unit, p_created_by, p_updated_by
    );

    -- Insert asset children if provided
    IF p_specifications IS NOT NULL AND JSON_LENGTH(p_specifications) > 0 THEN
        SET spec_count = JSON_LENGTH(p_specifications);
        WHILE i < spec_count DO
            SET child_id = UUID();
            SET spec_name = JSON_UNQUOTE(JSON_EXTRACT(p_specifications, CONCAT('$[', i, '].assetName')));
            SET spec_description = JSON_UNQUOTE(JSON_EXTRACT(p_specifications, CONCAT('$[', i, '].specDescription')));

            -- Generate asset child code based on parent asset code
            SET child_code = CONCAT(asset_code, '-', LPAD(i + 1, 4, '0'));

            INSERT INTO asset_child (
                assetchildID, asset_id, asset_child_code, name, description, created_by, updated_by
            ) VALUES (
                child_id, new_id, child_code, spec_name, spec_description, p_created_by, p_created_by
            );

            SET i = i + 1;
        END WHILE;
    END IF;

    COMMIT;

    SELECT * FROM assets WHERE assetID = new_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_assignment` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_assignment`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_audit_log` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_audit_log`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_department` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_department`(
  IN p_name VARCHAR(255),
  IN p_code VARCHAR(50),
  IN p_prefix VARCHAR(10),
  IN p_description TEXT,
  IN p_company_id CHAR(36),
  IN p_created_by CHAR(36)
)
BEGIN
  INSERT INTO asset_mngmnt_departments (name, code, prefix, description, company_id, created_by, updated_by)
  VALUES (p_name, p_code, p_prefix, p_description, p_company_id, p_created_by, p_created_by);
  SELECT LAST_INSERT_ID() as id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_location` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_location`(
  IN p_name VARCHAR(255),
  IN p_floor_unit VARCHAR(255),
  IN p_building VARCHAR(255),
  IN p_room_areas JSON,
  IN p_department_id CHAR(36),
  IN p_description TEXT,
  IN p_company_id CHAR(36),
  IN p_created_by CHAR(36)
)
BEGIN
  DECLARE new_id CHAR(36);
  DECLARE i INT DEFAULT 0;
  DECLARE room_count INT;
  DECLARE room_name VARCHAR(255);

  SET new_id = UUID();

  INSERT INTO asset_mngmnt_locations (locationID, name, floor_unit, building, department_id, description, company_id, created_by, updated_by)
  VALUES (new_id, p_name, p_floor_unit, p_building, p_department_id, p_description, p_company_id, p_created_by, p_created_by);

  -- Insert rooms if provided
  IF p_room_areas IS NOT NULL AND JSON_LENGTH(p_room_areas) > 0 THEN
    SET room_count = JSON_LENGTH(p_room_areas);
    WHILE i < room_count DO
      SET room_name = JSON_UNQUOTE(JSON_EXTRACT(p_room_areas, CONCAT('$[', i, ']')));
      IF room_name IS NOT NULL AND room_name != '' THEN
        INSERT INTO asset_mngmnt_location_rooms (locationID, room_name, created_by, updated_by)
        VALUES (new_id, room_name, p_created_by, p_created_by);
      END IF;
      SET i = i + 1;
    END WHILE;
  END IF;

  SELECT new_id as locationID;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_position` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_role` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_role`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_user` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_user`(
    IN p_email VARCHAR(255),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_department_id CHAR(36),
    IN p_company_id CHAR(36),
    IN p_role_id CHAR(36),
    IN p_employee_number VARCHAR(20),
    IN p_is_active BOOLEAN,
    IN p_created_by CHAR(36)
)
BEGIN
    DECLARE new_user_id CHAR(36);
    SET new_user_id = UUID();

    INSERT INTO users (
        userID, email, first_name, last_name, department_id, company_id,
        role_id, employee_number, verified, created_at, updated_at
    ) VALUES (
        new_user_id, p_email, p_first_name, p_last_name, p_department_id, p_company_id,
        p_role_id, p_employee_number, NOW(), NOW()
    );
    UPDATE users SET is_active = p_is_active WHERE userID = new_user_id;

    SELECT new_user_id as id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteBrand` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteBrand`(IN p_id CHAR(36), IN p_company_id CHAR(36), IN p_deleted_by CHAR(36))
BEGIN
    DECLARE asset_count INT DEFAULT 0;

    -- Check if assets table exists and has brand references
    SELECT COUNT(*) INTO asset_count FROM assets WHERE brand = p_id;

    IF asset_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete brand with existing assets';
    END IF;

    -- Soft delete: set deleted_at timestamp and deleted_by user
    UPDATE asset_brands SET deleted_at = NOW(), deleted_by = p_deleted_by WHERE brandID = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT 'Brand deleted successfully' AS message;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteCategory` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteCategory`(IN p_id CHAR(36), IN p_company_id CHAR(36), IN p_deleted_by CHAR(36))
BEGIN
    DECLARE asset_count INT DEFAULT 0;
    DECLARE table_exists INT DEFAULT 0;

    -- Check if assets table exists
    SELECT COUNT(*) INTO table_exists
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'assets';

    -- Only check for existing assets if the table exists
    IF table_exists > 0 THEN
        SELECT COUNT(*) INTO asset_count FROM assets WHERE category_id = p_id;

        IF asset_count > 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete category with existing assets';
        END IF;
    END IF;

    -- Soft delete: set deleted_at timestamp and deleted_by user
    UPDATE asset_categories SET deleted_at = NOW(), deleted_by = p_deleted_by WHERE categoryID = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT 'Category deleted successfully' AS message;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteCompany` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteCompany`(IN p_id CHAR(36), IN p_deleted_by CHAR(36))
BEGIN
  DECLARE total_active_cnt INT;
  DECLARE is_last_act INT;

  SELECT COUNT(*) INTO total_active_cnt FROM companies WHERE deleted_at IS NULL;
  SELECT is_active INTO is_last_act FROM companies WHERE companyID = p_id;

  IF total_active_cnt <= 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete the last company';
  END IF;

  -- Soft delete: set deleted_at timestamp and deleted_by user
  UPDATE companies SET deleted_at = NOW(), deleted_by = p_deleted_by WHERE companyID = p_id AND deleted_at IS NULL;

  -- If the deleted row was active, make the first remaining active row active
  IF is_last_act = 1 THEN
    UPDATE companies SET is_active = TRUE WHERE companyID = (SELECT companyID FROM companies WHERE deleted_at IS NULL LIMIT 1);
  END IF;

  SELECT 'Company deleted successfully' AS message;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteSupplier` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteSupplier`(IN p_id CHAR(36), IN p_company_id CHAR(36), IN p_deleted_by CHAR(36))
BEGIN
    DECLARE asset_count INT DEFAULT 0;

    -- Check if assets table exists and has supplier references
    SELECT COUNT(*) INTO asset_count FROM assets WHERE supplier = p_id;

    IF asset_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete supplier with existing assets';
    END IF;

    -- Soft delete: set deleted_at timestamp and deleted_by user
    UPDATE suppliers SET deleted_at = NOW(), deleted_by = p_deleted_by WHERE supplierID = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT 'Supplier deleted successfully' AS message;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_DeleteType` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DeleteType`(IN p_id CHAR(36), IN p_company_id CHAR(36), IN p_deleted_by CHAR(36))
BEGIN
    DECLARE asset_count INT DEFAULT 0;
    DECLARE table_exists INT DEFAULT 0;

    -- Check if assets table exists
    SELECT COUNT(*) INTO table_exists
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'assets';

    -- Only check for existing assets if the table exists
    IF table_exists > 0 THEN
        SELECT COUNT(*) INTO asset_count FROM assets WHERE type_id = p_id;

        IF asset_count > 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete type with existing assets';
        END IF;
    END IF;

    -- Soft delete: set deleted_at timestamp and deleted_by user
    UPDATE asset_types SET deleted_at = NOW(), deleted_by = p_deleted_by WHERE typeID = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT 'Type deleted successfully' AS message;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_asset_builder` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_asset_builder`(
    IN p_builder_id CHAR(36),
    IN p_deleted_by CHAR(36)
)
BEGIN
    -- Soft delete the asset builder
    UPDATE asset_builders
    SET
        deleted_at = NOW(),
        deleted_by = p_deleted_by,
        updated_at = NOW(),
        updated_by = p_deleted_by
    WHERE builderID = p_builder_id
    AND deleted_at IS NULL;

    -- Check if any rows were affected
    IF ROW_COUNT() > 0 THEN
        SELECT 1 as success;
    ELSE
        SELECT 0 as success;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_department` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_department`(
  IN p_id CHAR(36),
  IN p_company_id CHAR(36),
  IN p_deleted_by CHAR(36)
)
BEGIN
  UPDATE asset_mngmnt_departments
  SET deleted_at = CURRENT_TIMESTAMP, deleted_by = p_deleted_by
  WHERE departmentID = p_id AND deleted_at IS NULL AND company_id = p_company_id;
  SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_location` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_location`(
  IN p_id CHAR(36),
  IN p_company_id CHAR(36),
  IN p_deleted_by CHAR(36)
)
BEGIN
  UPDATE asset_mngmnt_locations
  SET deleted_at = CURRENT_TIMESTAMP, deleted_by = p_deleted_by
  WHERE locationID = p_id AND deleted_at IS NULL AND company_id = p_company_id;
  SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_password_reset_tokens_by_user` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_password_reset_tokens_by_user`(IN p_user_id CHAR(36))
BEGIN
  DELETE FROM password_reset_tokens WHERE userID = p_user_id;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_position` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_role` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_role`(
  IN p_roleID CHAR(36),
  IN p_deleted_by CHAR(36)
)
BEGIN
  DECLARE user_count INT DEFAULT 0;

  SELECT COUNT(*) INTO user_count FROM users WHERE role_id = p_roleID;

  IF user_count > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete role with assigned users';
  END IF;

  UPDATE asset_mngmnt_roles
  SET deleted_at = CURRENT_TIMESTAMP, deleted_by = p_deleted_by
  WHERE roleID = p_roleID AND deleted_at IS NULL;
  SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_sessions_by_user` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_sessions_by_user`(IN p_user_id CHAR(36))
BEGIN
  DELETE FROM sessions WHERE userID = p_user_id;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_session_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_session_by_id`(IN p_session_id VARCHAR(64))
BEGIN
  DELETE FROM sessions WHERE sessionID = p_session_id;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_session_by_refresh_token` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_session_by_refresh_token`(IN p_refresh_token VARCHAR(255))
BEGIN
  DELETE FROM sessions WHERE refresh_token = p_refresh_token;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_user` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_user`(IN p_id CHAR(36))
BEGIN
    DELETE FROM users WHERE userID = p_id;
    SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_extend_password_reset_token` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_extend_password_reset_token`(IN p_token VARCHAR(10))
BEGIN
  UPDATE password_reset_tokens SET expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE token = p_token;
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetActiveCompany` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetActiveCompany`()
BEGIN
  SELECT companyID as id, name, email, code, prefix, tax_id, phone, website, unit_no, building_street, barangay_name, city_name, province_name, region_name, zipcode, logo_url, industry, size, is_active, is_main, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by FROM companies WHERE is_active = TRUE AND deleted_at IS NULL LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetAllBrands` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetAllBrands`(IN p_company_id CHAR(36))
BEGIN
    SELECT b.*, t.name as type_name
    FROM asset_brands b
    LEFT JOIN asset_types t ON b.type_id = t.typeID AND t.deleted_at IS NULL
    WHERE b.deleted_at IS NULL AND b.company_id = p_company_id
    ORDER BY b.created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetAllCategories` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetAllCompanies` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetAllCompanies`()
BEGIN
  SELECT companyID as id, name, email, code, prefix, tax_id, phone, website, unit_no, building_street, barangay_name, city_name, province_name, region_name, zipcode, logo_url, industry, size, is_active, is_main, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by FROM companies WHERE deleted_at IS NULL ORDER BY created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetAllSuppliers` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetAllSuppliers`(IN p_company_id CHAR(36))
BEGIN
  SELECT s.*, c.name as category_name
  FROM suppliers s
  LEFT JOIN asset_categories c ON s.category_id = c.categoryID AND c.deleted_at IS NULL
  WHERE s.deleted_at IS NULL AND s.company_id = p_company_id
  ORDER BY s.created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetAllTypes` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetAllTypes`(IN p_company_id CHAR(36))
BEGIN
    SELECT t.*, c.name as category_name
    FROM asset_types t
    LEFT JOIN asset_categories c ON t.category_id = c.categoryID AND c.deleted_at IS NULL
    WHERE t.deleted_at IS NULL AND t.company_id = p_company_id
    ORDER BY t.created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_all_positions` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_assets` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_assets`()
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_assets_count_filtered` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_assets_count_filtered`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_assets_filtered` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_assets_filtered`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_asset_builders` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_asset_builders`(
    IN p_company_id CHAR(36)
)
BEGIN
    SELECT
        ab.builderID,
        ab.name,
        ab.description,
        ab.status,
        ab.company_id,
        ab.created_at,
        ab.created_by,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
        ab.updated_at,
        ab.updated_by
    FROM asset_builders ab
    LEFT JOIN users u ON ab.created_by = u.userID
    WHERE ab.company_id = p_company_id
    AND ab.deleted_at IS NULL
    ORDER BY ab.created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_asset_builder_items` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_asset_builder_items`(
    IN p_builder_id CHAR(36)
)
BEGIN
    SELECT
        abi.itemID,
        abi.builder_id,
        abi.asset_id,
        a.asset_code,
        a.name as asset_name,
        ac.name as category_name,
        at.name as type_name,
        abi.created_at
    FROM asset_builder_items abi
    JOIN assets a ON abi.asset_id = a.assetID
    LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
    LEFT JOIN asset_types at ON a.type_id = at.typeID
    WHERE abi.builder_id = p_builder_id
    ORDER BY abi.created_at;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_asset_by_code` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_asset_by_code`(IN p_asset_code VARCHAR(50))
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_asset_documents` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_asset_documents`(IN p_asset_id CHAR(36))
BEGIN
  SELECT documentID, asset_id, file_name, file_url, file_size, file_type, created_at
  FROM asset_documents
  WHERE asset_id = p_asset_id AND deleted_at IS NULL
  ORDER BY created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_forms_by_user` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_asset_transfer_forms_by_user`(IN p_user_id CHAR(36))
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_form_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_asset_transfer_form_by_id`(IN p_form_id CHAR(36))
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_form_settings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_asset_transfer_form_settings`(IN p_company_id CHAR(36))
BEGIN
  SELECT id, company_id, company_format, department_format,
    it_asset_transfer_code, admin_asset_transfer_code,
    include_date, date_format, created_at, updated_at
  FROM asset_transfer_form_settings
  WHERE company_id = p_company_id AND deleted_at IS NULL
  LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_assignments` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_assignments`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_assignments_by_asset_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_assignments_by_asset_id`(IN p_asset_id CHAR(36))
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_audit_logs` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_audit_logs`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_audit_logs_count` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_audit_logs_count`()
BEGIN
  SELECT COUNT(*) AS total FROM audit_logs WHERE deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_departments` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_departments`(IN p_company_id CHAR(36))
BEGIN
  SELECT departmentID, name, code, prefix, description, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by
  FROM asset_mngmnt_departments
  WHERE deleted_at IS NULL AND company_id = p_company_id
  ORDER BY name;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_locations` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_locations`(IN p_company_id CHAR(36))
BEGIN
  SELECT
    l.locationID,
    l.name,
    l.floor_unit,
    l.building,
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
  WHERE l.deleted_at IS NULL AND l.company_id = p_company_id
  GROUP BY l.locationID, l.name, l.floor_unit, l.building, l.description,
           l.created_at, l.created_by, l.updated_at, l.updated_by, l.deleted_at, l.deleted_by,
           l.department_id, d.name, d.code, d.prefix, d.description,
           d.created_at, d.created_by, d.updated_at, d.updated_by, d.deleted_at, d.deleted_by
  ORDER BY l.name;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_notifications` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_notifications`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_notifications_count` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_notifications_count`(IN p_user_id CHAR(36))
BEGIN
  SELECT COUNT(*) AS count
  FROM notifications
  WHERE user_id = p_user_id AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_password_reset_token` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_password_reset_token`(IN p_token VARCHAR(10))
BEGIN
  SELECT * FROM password_reset_tokens WHERE token = p_token AND expires > NOW() LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_positions_by_department` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_positions_by_department`(IN p_department_id CHAR(36))
BEGIN
  SELECT positionID, name, description, department_id, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by
  FROM asset_mngmnt_positions
  WHERE deleted_at IS NULL AND department_id = p_department_id
  ORDER BY name;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_roles` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_roles`()
BEGIN
  SELECT roleID, name, description, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by
  FROM asset_mngmnt_roles
  WHERE deleted_at IS NULL
  ORDER BY name;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_session_by_refresh_token` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_session_by_refresh_token`(IN p_refresh_token VARCHAR(255))
BEGIN
  SELECT * FROM sessions WHERE refresh_token = p_refresh_token AND expires > NOW() LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_session_last_activity` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_session_last_activity`(IN p_user_id CHAR(36))
BEGIN
  SELECT last_activity FROM sessions WHERE userID = p_user_id AND expires > NOW() LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_unverified_user_by_email` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_unverified_user_by_email`(
    IN p_email VARCHAR(255),
    OUT p_user_id CHAR(36),
    OUT p_exists TINYINT
)
BEGIN
    SELECT userID INTO p_user_id
    FROM users
    WHERE email = p_email AND verified = FALSE
    LIMIT 1;

    SET p_exists = IF(FOUND_ROWS() > 0, 1, 0);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_users` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
        ELSE NULL END as role
    FROM users u
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN companies c ON u.company_id = c.companyID AND c.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
    WHERE u.is_active = 1
    ORDER BY u.created_at DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_user_by_email` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_by_email`(IN p_email VARCHAR(255))
BEGIN
  SELECT * FROM users WHERE email = p_email LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_user_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_by_id`(IN p_user_id CHAR(36))
BEGIN
  SELECT userID, email FROM users WHERE userID = p_user_id LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_user_profile` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
        r.name as role_name
    FROM users u
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN companies c ON u.company_id = c.companyID AND c.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
    WHERE u.userID = p_user_id;

    SELECT
        unit_no, building_house_no AS buildingNo, street, subdivision,
        barangay, city, province, region
    FROM user_address
    WHERE userID = p_user_id AND is_permanent = 1
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_insert_password_reset_token` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_insert_password_reset_token`(
  IN p_token VARCHAR(10),
  IN p_user_id CHAR(36)
)
BEGIN
  INSERT INTO password_reset_tokens (token, userID, expires)
  VALUES (p_token, p_user_id, DATE_ADD(NOW(), INTERVAL 15 MINUTE));
  SELECT 1 AS success;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_insert_session` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_insert_session`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_mark_assignment_returned` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_mark_assignment_returned`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_mark_notification_read` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_mark_notification_read`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_return_assignment` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_return_assignment`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_revoke_all_sessions` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_revoke_all_sessions`(
    IN p_user_id CHAR(36)
)
BEGIN
    DELETE FROM sessions WHERE userID = p_user_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_SetActiveCompany` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_SetActiveCompany`(IN p_id CHAR(36))
BEGIN
  START TRANSACTION;
  UPDATE companies SET is_active = FALSE WHERE is_active = TRUE AND deleted_at IS NULL;
  UPDATE companies SET is_active = TRUE   WHERE companyID = p_id AND deleted_at IS NULL;
  COMMIT;

  SELECT companyID as id, name, email, code, prefix, tax_id, phone, website, unit_no, building_street, barangay_name, city_name, province_name, region_name, zipcode, logo_url, industry, size, is_active, is_main, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by FROM companies WHERE companyID = p_id AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_SetMainCompany` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_SetMainCompany`(IN p_id CHAR(36))
BEGIN
  START TRANSACTION;
  UPDATE companies SET is_main = FALSE WHERE is_main = TRUE AND deleted_at IS NULL;
  UPDATE companies SET is_main = TRUE   WHERE companyID = p_id AND deleted_at IS NULL;
  COMMIT;

  SELECT companyID as id, name, email, code, prefix, tax_id, phone, website, unit_no, building_street, barangay_name, city_name, province_name, region_name, zipcode, logo_url, industry, size, is_active, is_main, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by FROM companies WHERE companyID = p_id AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_set_assignment_inactive` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_set_assignment_inactive`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_sign_asset_transfer_form` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_sign_asset_transfer_form`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateBrand` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_UpdateBrand`(
    IN p_id CHAR(36),
    IN p_name VARCHAR(255),
    IN p_type_id CHAR(36),
    IN p_prefix VARCHAR(10),
    IN p_company_id CHAR(36),
    IN p_updated_by CHAR(36)
)
BEGIN
    UPDATE asset_brands SET
        name = p_name,
        type_id = p_type_id,
        prefix = UPPER(p_prefix),
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE brandID = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT b.*, t.name as type_name
    FROM asset_brands b
    LEFT JOIN asset_types t ON b.type_id = t.typeID AND t.deleted_at IS NULL
    WHERE b.brandID = p_id AND b.deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateCategory` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateCompany` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_UpdateCompany`(
    IN p_id CHAR(36),
    IN p_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_code VARCHAR(50),
    IN p_prefix VARCHAR(50),
    IN p_tax_id VARCHAR(100),
    IN p_phone VARCHAR(50),
    IN p_website VARCHAR(255),
    IN p_unit_no VARCHAR(100),
    IN p_building_street TEXT,
    IN p_barangay_name VARCHAR(255),
    IN p_city_name VARCHAR(255),
    IN p_province_name VARCHAR(255),
    IN p_region_name VARCHAR(255),
    IN p_zipcode VARCHAR(20),
    IN p_logo_url VARCHAR(512),
    IN p_industry VARCHAR(100),
    IN p_size VARCHAR(50),
    IN p_updated_by CHAR(36)
)
BEGIN
    UPDATE companies SET
        name            = p_name,
        email           = p_email,
        code            = p_code,
        prefix          = p_prefix,
        tax_id          = p_tax_id,
        phone           = p_phone,
        website         = p_website,
        unit_no         = p_unit_no,
        building_street = p_building_street,
        barangay_name   = p_barangay_name,
        city_name       = p_city_name,
        province_name   = p_province_name,
        region_name     = p_region_name,
        zipcode         = p_zipcode,
        logo_url        = p_logo_url,
        industry        = p_industry,
        size            = p_size,
        updated_by      = p_updated_by
    WHERE companyID = p_id;

    SELECT companyID as id, name, email, code, prefix, tax_id, phone, website, unit_no, building_street, barangay_name, city_name, province_name, region_name, zipcode, logo_url, industry, size, is_active, is_main, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by FROM companies WHERE companyID = p_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateSupplier` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_UpdateSupplier`(
    IN p_id CHAR(36),
    IN p_name VARCHAR(255),
    IN p_category_id CHAR(36),
    IN p_contact VARCHAR(50),
    IN p_email VARCHAR(255),
    IN p_company_id CHAR(36),
    IN p_updated_by CHAR(36)
)
BEGIN
    UPDATE suppliers SET
        name = p_name,
        category_id = p_category_id,
        contact = p_contact,
        email = p_email,
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE supplierID = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT s.*, c.name as category_name
    FROM suppliers s
    LEFT JOIN asset_categories c ON s.category_id = c.categoryID AND c.deleted_at IS NULL
    WHERE s.supplierID = p_id AND s.deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateType` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_UpdateType`(
    IN p_id CHAR(36),
    IN p_name VARCHAR(255),
    IN p_category_id CHAR(36),
    IN p_prefix VARCHAR(10),
    IN p_company_id CHAR(36),
    IN p_updated_by CHAR(36)
)
BEGIN
    UPDATE asset_types SET
        name = p_name,
        category_id = p_category_id,
        prefix = UPPER(p_prefix),
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE typeID = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT t.*, c.name as category_name
    FROM asset_types t
    LEFT JOIN asset_categories c ON t.category_id = c.categoryID AND c.deleted_at IS NULL
    WHERE t.typeID = p_id AND t.deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_asset` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_asset_builder` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_asset_builder`(
    IN p_builder_id CHAR(36),
    IN p_name VARCHAR(255),
    IN p_description TEXT,
    IN p_status ENUM('Available','Assigned'),
    IN p_updated_by CHAR(36)
)
BEGIN
    -- Update the asset builder
    UPDATE asset_builders
    SET
        name = p_name,
        description = p_description,
        status = COALESCE(p_status, status),
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE builderID = p_builder_id
    AND deleted_at IS NULL;

    -- Check if any rows were affected
    IF ROW_COUNT() > 0 THEN
        SELECT 1 as success;
    ELSE
        SELECT 0 as success;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_asset_code` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_asset_code`(
    IN p_asset_id CHAR(36),
    IN p_category_id CHAR(36),
    IN p_type_id CHAR(36),
    IN p_department_id CHAR(36),
    IN p_updated_by CHAR(36)
)
BEGIN
    DECLARE new_asset_code VARCHAR(50);
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
    DECLARE current_company_id CHAR(36);
    DECLARE current_purchase_date DATE;
    DECLARE current_is_old_unit TINYINT;
    DECLARE current_asset_code VARCHAR(50);
    DECLARE counter_dept_id CHAR(36);
    DECLARE original_seq_num INT DEFAULT 1;

    -- Get current asset details
    SELECT 
        company_id, purchase_date, is_old_unit, department_id, asset_code
    INTO 
        current_company_id, current_purchase_date, current_is_old_unit, p_department_id, current_asset_code
    FROM assets 
    WHERE assetID = p_asset_id;

    -- Extract the original sequential number from the current asset code
    -- The sequential number is the last part after the last hyphen
    SET original_seq_num = CAST(SUBSTRING_INDEX(current_asset_code, '-', -1) AS UNSIGNED);

    -- Get asset ID format settings for the company
    SELECT
        company_format, category_format, type_format, department_format, include_date
    INTO
        settings_company_format, settings_category_format, settings_type_format, settings_department_format, settings_include_date
    FROM asset_id_format_settings
    WHERE company_id = current_company_id AND deleted_at IS NULL
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
            SELECT code INTO company_part FROM companies WHERE companyID = current_company_id;
        ELSE
            SELECT prefix INTO company_part FROM companies WHERE companyID = current_company_id;
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
        SET counter_dept_id = COALESCE(category_dept_id, p_department_id);
        
        IF counter_dept_id IS NOT NULL THEN
            IF settings_department_format = 'code' THEN
                SELECT code INTO department_part FROM asset_mngmnt_departments WHERE departmentID = counter_dept_id;
            ELSE
                SELECT prefix INTO department_part FROM asset_mngmnt_departments WHERE departmentID = counter_dept_id;
            END IF;
        END IF;
    END IF;

    -- Generate date part
    IF settings_include_date = 1 THEN
        IF current_is_old_unit = 1 THEN
            SET date_part = 'OU';
        ELSE
            SET date_part = COALESCE(DATE_FORMAT(current_purchase_date, '%m%y'), 'OU');
        END IF;
    END IF;

    -- Use the original sequential number instead of generating a new one
    SET seq_num = original_seq_num;

    -- Build new asset code with the original sequential number
    SET new_asset_code = CONCAT_WS('-',
        NULLIF(company_part, ''),
        NULLIF(category_part, ''),
        NULLIF(type_part, ''),
        NULLIF(department_part, ''),
        NULLIF(date_part, ''),
        LPAD(seq_num, 5, '0')
    );

    -- Update the asset with new code
    UPDATE assets 
    SET 
        asset_code = new_asset_code,
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE assetID = p_asset_id;

    -- Return the updated asset
    SELECT * FROM assets WHERE assetID = p_asset_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_avatar_url` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_avatar_url`(
    IN p_user_id CHAR(36),
    IN p_avatar_url TEXT
)
BEGIN
    UPDATE users SET avatar_url = p_avatar_url, updated_at = NOW()
    WHERE userID = p_user_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_department` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_department`(
  IN p_id CHAR(36),
  IN p_name VARCHAR(255),
  IN p_code VARCHAR(50),
  IN p_prefix VARCHAR(10),
  IN p_description TEXT,
  IN p_company_id CHAR(36),
  IN p_updated_by CHAR(36)
)
BEGIN
  UPDATE asset_mngmnt_departments
  SET name = p_name, code = p_code, prefix = p_prefix, description = p_description, updated_by = p_updated_by, updated_at = CURRENT_TIMESTAMP
  WHERE departmentID = p_id AND deleted_at IS NULL AND company_id = p_company_id;
  SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_location` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_location`(
  IN p_id CHAR(36),
  IN p_name VARCHAR(255),
  IN p_floor_unit VARCHAR(255),
  IN p_building VARCHAR(255),
  IN p_room_areas JSON,
  IN p_department_id CHAR(36),
  IN p_description TEXT,
  IN p_company_id CHAR(36),
  IN p_updated_by CHAR(36)
)
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE room_count INT;
  DECLARE room_name VARCHAR(255);

  UPDATE asset_mngmnt_locations
  SET name = p_name, floor_unit = p_floor_unit, building = p_building,
      department_id = p_department_id, description = p_description, updated_by = p_updated_by, updated_at = CURRENT_TIMESTAMP
  WHERE locationID = p_id AND deleted_at IS NULL AND company_id = p_company_id;

  -- Soft delete existing rooms
  UPDATE asset_mngmnt_location_rooms
  SET deleted_at = CURRENT_TIMESTAMP, deleted_by = p_updated_by
  WHERE locationID = p_id AND deleted_at IS NULL;

  -- Insert new rooms if provided
  IF p_room_areas IS NOT NULL AND JSON_LENGTH(p_room_areas) > 0 THEN
    SET room_count = JSON_LENGTH(p_room_areas);
    WHILE i < room_count DO
      SET room_name = JSON_UNQUOTE(JSON_EXTRACT(p_room_areas, CONCAT('$[', i, ']')));
      IF room_name IS NOT NULL AND room_name != '' THEN
        INSERT INTO asset_mngmnt_location_rooms (locationID, room_name, created_by, updated_by)
        VALUES (p_id, room_name, p_updated_by, p_updated_by);
      END IF;
      SET i = i + 1;
    END WHILE;
  END IF;

  SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_position` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_role` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_role`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_session_activity` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_session_activity`(IN p_user_id CHAR(36))
BEGIN
  UPDATE sessions SET last_activity = NOW() WHERE userID = p_user_id AND expires > NOW();
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_user` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_user`(
    IN p_id CHAR(36),
    IN p_email VARCHAR(255),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_username VARCHAR(100),
    IN p_contact_number VARCHAR(20),
    IN p_position VARCHAR(100),
    IN p_department_id CHAR(36),
    IN p_company_id CHAR(36),
    IN p_role_id CHAR(36),
    IN p_employee_number VARCHAR(20),
    IN p_is_active BOOLEAN,
    IN p_updated_by CHAR(36)
)
BEGIN
    UPDATE users SET
        email = p_email,
        first_name = p_first_name,
        last_name = p_last_name,
        username = COALESCE(p_username, username),
        contact_number = COALESCE(p_contact_number, contact_number),
        position = COALESCE(p_position, position),
        department_id = p_department_id,
        company_id = p_company_id,
        role_id = COALESCE(p_role_id, role_id),
        employee_number = COALESCE(p_employee_number, employee_number),
        is_active = p_is_active,
        updated_at = NOW()
    WHERE userID = p_id;

    SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_user_profile` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_user_profile`(
    IN p_user_id CHAR(36),
    IN p_first_name VARCHAR(100),
    IN p_middle_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_username VARCHAR(100),
    IN p_contact_number VARCHAR(20),
    IN p_role_id CHAR(36),
    IN p_position VARCHAR(100)
)
BEGIN
    UPDATE users SET
        first_name = p_first_name,
        middle_name = p_middle_name,
        last_name = p_last_name,
        username = p_username,
        contact_number = p_contact_number,
        role_id = COALESCE(p_role_id, role_id),
        position = COALESCE(p_position, position),
        updated_at = NOW()
    WHERE userID = p_user_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_upsert_asset_transfer_form_settings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_upsert_asset_transfer_form_settings`(
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
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_upsert_permanent_address` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_upsert_permanent_address`(
    IN p_user_id CHAR(36),
    IN p_unit_no VARCHAR(50),
    IN p_building_house_no VARCHAR(100),
    IN p_street VARCHAR(255),
    IN p_subdivision VARCHAR(255),
    IN p_barangay VARCHAR(255),
    IN p_city VARCHAR(255),
    IN p_province VARCHAR(255),
    IN p_region VARCHAR(255)
)
BEGIN
    INSERT INTO user_address (
        addressID, userID, unit_no, building_house_no, street, subdivision,
        barangay, city, province, region, is_permanent, created_at, updated_at
    ) VALUES (
        UUID(), p_user_id, p_unit_no, p_building_house_no, p_street, p_subdivision,
        p_barangay, p_city, p_province, p_region, 1, NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE
        unit_no = VALUES(unit_no),
        building_house_no = VALUES(building_house_no),
        street = VALUES(street),
        subdivision = VALUES(subdivision),
        barangay = VALUES(barangay),
        city = VALUES(city),
        province = VALUES(province),
        region = VALUES(region),
        updated_at = NOW();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-28 16:14:46
