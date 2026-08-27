-- Add assignment tracking fields to intangible_assets table
-- This migration adds fields to track which user an intangible asset is assigned to

ALTER TABLE `intangible_assets`
ADD COLUMN `assigned_to` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `updated_by`,
ADD COLUMN `assigned_date` datetime DEFAULT NULL AFTER `assigned_to`,
ADD COLUMN `assignment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `assigned_date`,
ADD INDEX `idx_intangible_assets_assigned_to` (`assigned_to`),
ADD INDEX `idx_intangible_assets_assignment_id` (`assignment_id`),
ADD CONSTRAINT `fk_intangible_assets_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`userID`) ON DELETE SET NULL;

-- Update stored procedure to handle assignment fields
DROP PROCEDURE IF EXISTS `sp_UpdateIntangibleAsset`;

DELIMITER $$

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

-- Create stored procedure to assign an intangible asset to a user
CREATE PROCEDURE `sp_AssignIntangibleAsset`(
  IN p_id CHAR(36),
  IN p_assigned_to CHAR(36),
  IN p_assignment_id CHAR(36),
  IN p_company_id CHAR(36)
)
BEGIN
  UPDATE `intangible_assets`
  SET 
    `status` = 'assigned',
    `assigned_to` = p_assigned_to,
    `assigned_date` = NOW(),
    `assignment_id` = p_assignment_id
  WHERE `id` = p_id AND `company_id` = p_company_id;
END$$

-- Create stored procedure to unassign an intangible asset
CREATE PROCEDURE `sp_UnassignIntangibleAsset`(
  IN p_id CHAR(36),
  IN p_company_id CHAR(36)
)
BEGIN
  UPDATE `intangible_assets`
  SET 
    `status` = 'available',
    `assigned_to` = NULL,
    `assigned_date` = NULL,
    `assignment_id` = NULL
  WHERE `id` = p_id AND `company_id` = p_company_id;
END$$

DELIMITER ;

-- Update stored procedure to get all intangible assets with assigned user information
DROP PROCEDURE IF EXISTS `sp_GetAllIntangibleAssets`;

DELIMITER $$

CREATE PROCEDURE `sp_GetAllIntangibleAssets`(
  IN p_company_id CHAR(36)
)
BEGIN
  SELECT 
    ia.`id`,
    ia.`name`,
    ia.`description`,
    ia.`remarks`,
    ia.`type`,
    ia.`status`,
    ia.`created_at`,
    ia.`created_by`,
    ia.`updated_at`,
    ia.`updated_by`,
    ia.`assigned_to`,
    ia.`assigned_date`,
    ia.`assignment_id`,
    u.`first_name` AS assigned_first_name,
    u.`last_name` AS assigned_last_name,
    u.`email` AS assigned_email,
    CONCAT(COALESCE(uc.first_name, ''), ' ', COALESCE(uc.last_name, '')) AS created_by_name,
    CONCAT(COALESCE(uu.first_name, ''), ' ', COALESCE(uu.last_name, '')) AS updated_by_name
  FROM `intangible_assets` ia
  LEFT JOIN `users` u ON ia.`assigned_to` = u.`userID`
  LEFT JOIN `users` uc ON ia.`created_by` = uc.`userID`
  LEFT JOIN `users` uu ON ia.`updated_by` = uu.`userID`
  WHERE ia.`company_id` = p_company_id
  ORDER BY ia.`created_at` DESC;
END$$

DELIMITER ;
