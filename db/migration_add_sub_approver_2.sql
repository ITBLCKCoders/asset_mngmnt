-- Migration: add sub_approver_2 column to user_custodian_settings and asset_mngmnt_roles
-- sub_approver_1 is the UI label for the existing manager_approver_3 column (kept as-is).
-- Run this against your MySQL database.

-- 1. Add sub_approver_2 to user_custodian_settings
ALTER TABLE user_custodian_settings
  ADD COLUMN `sub_approver_2` TINYINT NOT NULL DEFAULT 0 AFTER manager_approver_3;

-- 2. Add sub_approver_2 to asset_mngmnt_roles
ALTER TABLE asset_mngmnt_roles
  ADD COLUMN `sub_approver_2` TINYINT NOT NULL DEFAULT 0 AFTER manager_approver_3;

-- 3. Drop and recreate sp_upsert_user_custodian_settings with sub_approver_2 param
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
    IN p_finance_approver TINYINT,
    IN p_sub_approver_2 TINYINT
)
BEGIN
    INSERT INTO user_custodian_settings (
        user_id, access_add_edit, access_assignment, access_return,
        hr_accountability_receiver, manager_approver_1, manager_approver_2, manager_approver_3, finance_approver, sub_approver_2
    ) VALUES (
        p_user_id, p_access_add_edit, p_access_assignment, p_access_return,
        p_hr_accountability_receiver, p_manager_approver_1, p_manager_approver_2, p_manager_approver_3, p_finance_approver, p_sub_approver_2
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
        sub_approver_2 = p_sub_approver_2,
        updated_at = CURRENT_TIMESTAMP;
END ;;
DELIMITER ;

-- 4. Drop and recreate sp_get_user_custodian_settings with sub_approver_2
DROP PROCEDURE IF EXISTS `sp_get_user_custodian_settings`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_custodian_settings`(IN p_user_id CHAR(36))
BEGIN
    SELECT
        access_add_edit, access_assignment, access_return,
        hr_accountability_receiver, manager_approver_1, manager_approver_2, manager_approver_3, finance_approver, sub_approver_2
    FROM user_custodian_settings
    WHERE user_id = p_user_id
    LIMIT 1;
END ;;
DELIMITER ;

-- 5. Drop and recreate sp_create_role with sub_approver_2
DROP PROCEDURE IF EXISTS `sp_create_role`;
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
  IN p_manager_approver_3 TINYINT,
  IN p_finance_approver TINYINT,
  IN p_sub_approver_2 TINYINT
)
BEGIN
  DECLARE new_id CHAR(36);
  SET new_id = UUID();

  INSERT INTO asset_mngmnt_roles (
    roleID, name, description, created_by, updated_by,
    asset_type, manager_role, access_add_edit, access_assignment, access_return,
    hr_accountability_receiver, manager_approver_1, manager_approver_2, manager_approver_3, finance_approver, sub_approver_2
  ) VALUES (
    new_id, p_name, p_description, p_created_by, p_created_by,
    p_asset_type, p_manager_role, p_access_add_edit, p_access_assignment, p_access_return,
    p_hr_accountability_receiver, p_manager_approver_1, p_manager_approver_2, p_manager_approver_3, p_finance_approver, p_sub_approver_2
  );

  SELECT new_id as roleID;
END ;;
DELIMITER ;

-- 6. Drop and recreate sp_update_role with sub_approver_2
DROP PROCEDURE IF EXISTS `sp_update_role`;
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
  IN p_manager_approver_3 TINYINT,
  IN p_finance_approver TINYINT,
  IN p_sub_approver_2 TINYINT
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
    manager_approver_3 = p_manager_approver_3,
    finance_approver = p_finance_approver,
    sub_approver_2 = p_sub_approver_2
  WHERE roleID = p_roleID AND deleted_at IS NULL;

  SELECT ROW_COUNT() as affected_rows;
END ;;
DELIMITER ;

-- 7. Drop and recreate sp_get_users with sub_approver_2
DROP PROCEDURE IF EXISTS `sp_get_users`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_users`(
    IN p_include_inactive TINYINT
)
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
            CONCAT('{"roleID":"', IFNULL(r.roleID, ''), '","name":"', IFNULL(REPLACE(REPLACE(r.name, '\\', '\\\\'), '"', '\\"'), ''), '","deleted_by":"', IFNULL(r.deleted_by, ''), '","hr_accountability_receiver":', IFNULL(r.hr_accountability_receiver, 0), '}')
        ELSE NULL END as role,
        IFNULL(uc.access_add_edit, 0) as access_add_edit,
        IFNULL(uc.access_assignment, 0) as access_assignment,
        IFNULL(uc.access_return, 0) as access_return,
        IFNULL(uc.hr_accountability_receiver, 0) as hr_accountability_receiver,
        IFNULL(uc.manager_approver_1, 0) as manager_approver_1,
        IFNULL(uc.manager_approver_2, 0) as manager_approver_2,
        IFNULL(uc.manager_approver_3, 0) as manager_approver_3,
        IFNULL(uc.finance_approver, 0) as finance_approver,
        IFNULL(uc.sub_approver_2, 0) as sub_approver_2
    FROM users u
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN companies c ON u.company_id = c.companyID AND c.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
    LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
    WHERE (p_include_inactive = 1 OR u.is_active = 1)
    ORDER BY u.created_at DESC;
END ;;
DELIMITER ;