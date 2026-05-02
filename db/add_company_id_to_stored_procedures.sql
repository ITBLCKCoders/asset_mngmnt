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
