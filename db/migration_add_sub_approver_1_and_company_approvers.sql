-- Migration: Add sub_approver_1 column and create company_approvers table
-- Run this against your MySQL database.

-- 1. Add sub_approver_1 to asset_mngmnt_roles
ALTER TABLE asset_mngmnt_roles 
ADD COLUMN sub_approver_1 TINYINT NOT NULL DEFAULT 0 AFTER manager_approver_3;

-- 2. Add sub_approver_1 to user_custodian_settings
ALTER TABLE user_custodian_settings 
ADD COLUMN sub_approver_1 TINYINT NOT NULL DEFAULT 0 AFTER manager_approver_3;

-- 3. Create company_approvers table (company-level designated approvers)
CREATE TABLE IF NOT EXISTS company_approvers (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  company_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  approver_type ENUM('approver', 'sub_approver') NOT NULL,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_approver_per_company (company_id, approver_type),
  CONSTRAINT fk_company_approvers_company FOREIGN KEY (company_id) REFERENCES companies(companyID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_company_approvers_user FOREIGN KEY (user_id) REFERENCES users(userID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Indexes for eligibility queries
CREATE INDEX idx_ucs_sub1 ON user_custodian_settings(sub_approver_1);
CREATE INDEX idx_roles_sub1 ON asset_mngmnt_roles(sub_approver_1);

-- 5. Recreate sp_get_users to also return sub_approver_1 (and keep the
--    p_include_inactive param used by the users controller).
--    Keeps ALL custodian approver columns (incl. finance_approver,
--    sub_approver_2, sub_approver_1) so the Users -> Approver Assignment
--    eligibility toggles reflect the stored per-user settings.
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
        IFNULL(uc.sub_approver_2, 0) as sub_approver_2,
        IFNULL(uc.sub_approver_1, 0) as sub_approver_1
    FROM users u
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN companies c ON u.company_id = c.companyID AND c.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
    LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
    WHERE (p_include_inactive = 1 OR u.is_active = 1)
    ORDER BY u.created_at DESC;
END ;;
DELIMITER ;