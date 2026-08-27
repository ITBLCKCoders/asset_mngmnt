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
