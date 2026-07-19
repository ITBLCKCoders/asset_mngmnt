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
    a.condition,
    a.asset_value,
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
