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
