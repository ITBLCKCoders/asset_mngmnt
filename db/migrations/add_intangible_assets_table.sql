-- Create intangible_assets table
CREATE TABLE IF NOT EXISTS `intangible_assets` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('IT scope','Admin scope','HR scope') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'IT scope',
  `status` enum('available','assigned') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_intangible_assets_company_id` (`company_id`),
  KEY `idx_intangible_assets_type` (`type`),
  KEY `idx_intangible_assets_status` (`status`),
  CONSTRAINT `fk_intangible_assets_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companyID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stored procedure to create a single intangible asset
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

-- Stored procedure to get all intangible assets for a company
CREATE PROCEDURE `sp_GetAllIntangibleAssets`(
  IN p_company_id CHAR(36)
)
BEGIN
  SELECT 
    `id`,
    `name`,
    `description`,
    `remarks`,
    `type`,
    `status`,
    `created_at`,
    `created_by`,
    `updated_at`,
    `updated_by`
  FROM `intangible_assets`
  WHERE `company_id` = p_company_id
  ORDER BY `created_at` DESC;
END$$

-- Stored procedure to update an intangible asset
CREATE PROCEDURE `sp_UpdateIntangibleAsset`(
  IN p_id CHAR(36),
  IN p_name VARCHAR(255),
  IN p_description TEXT,
  IN p_remarks TEXT,
  IN p_type ENUM('IT scope','Admin scope','HR scope'),
  IN p_status ENUM('available','assigned'),
  IN p_company_id CHAR(36),
  IN p_updated_by CHAR(36)
)
BEGIN
  UPDATE `intangible_assets`
  SET 
    `name` = p_name,
    `description` = p_description,
    `remarks` = p_remarks,
    `type` = p_type,
    `status` = p_status,
    `updated_by` = p_updated_by
  WHERE `id` = p_id AND `company_id` = p_company_id;
END$$

DELIMITER ;
