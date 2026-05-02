-- Migration to update stored procedures for department_id support in asset categories
-- This updates the sp_CreateCategory, sp_UpdateCategory, and sp_GetAllCategories procedures to handle department_id

-- Drop existing procedures
DROP PROCEDURE IF EXISTS `sp_CreateCategory`;
DROP PROCEDURE IF EXISTS `sp_UpdateCategory`;
DROP PROCEDURE IF EXISTS `sp_GetAllCategories`;

-- Create updated sp_CreateCategory procedure with department_id support
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

-- Create updated sp_UpdateCategory procedure with department_id support
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

-- Create updated sp_GetAllCategories procedure with department information
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