-- Add HR scope to intangible_assets type enum
ALTER TABLE `intangible_assets`
MODIFY COLUMN `type` enum('IT scope','Admin scope','HR scope') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'IT scope';

-- Update stored procedures to accept the new enum value
DROP PROCEDURE IF EXISTS `sp_CreateIntangibleAsset`;

DELIMITER $$

CREATE PROCEDURE `sp_CreateIntangibleAsset`(
  IN p_name VARCHAR(255),
  IN p_description TEXT,
  IN p_remarks TEXT,
  IN p_type ENUM('IT scope','Admin scope','HR scope'),
  IN p_status ENUM('available','assigned'),
  IN p_company_id CHAR(36),
  IN p_created_by CHAR(36)
)
BEGIN
  INSERT INTO `intangible_assets` (
    `name`,
    `description`,
    `remarks`,
    `type`,
    `status`,
    `company_id`,
    `created_by`
  ) VALUES (
    p_name,
    p_description,
    p_remarks,
    p_type,
    p_status,
    p_company_id,
    p_created_by
  );

  SELECT LAST_INSERT_ID() as id;
END$$

DROP PROCEDURE IF EXISTS `sp_UpdateIntangibleAsset`$$

CREATE PROCEDURE `sp_UpdateIntangibleAsset`(
  IN p_id CHAR(36),
  IN p_name VARCHAR(255),
  IN p_description TEXT,
  IN p_remarks TEXT,
  IN p_type ENUM('IT scope','Admin scope','HR scope'),
  IN p_status ENUM('available','assigned'),
  IN p_company_id CHAR(36),
  IN p_updated_by CHAR(36),
  IN p_assigned_to CHAR(36),
  IN p_assigned_date DATETIME,
  IN p_assignment_id CHAR(36)
)
BEGIN
  UPDATE `intangible_assets`
  SET 
    `name` = p_name,
    `description` = p_description,
    `remarks` = p_remarks,
    `type` = p_type,
    `status` = p_status,
    `updated_by` = p_updated_by,
    `assigned_to` = p_assigned_to,
    `assigned_date` = p_assigned_date,
    `assignment_id` = p_assignment_id
  WHERE `id` = p_id AND `company_id` = p_company_id;
END$$

DELIMITER ;
