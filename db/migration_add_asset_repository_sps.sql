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
