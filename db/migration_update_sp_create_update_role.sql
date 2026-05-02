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
