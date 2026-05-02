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