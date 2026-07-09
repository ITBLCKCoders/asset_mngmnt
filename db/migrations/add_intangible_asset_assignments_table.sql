-- Multi-assignee support for intangible assets
-- Creates intangible_asset_assignments table, migrates existing data, updates stored procedures

CREATE TABLE IF NOT EXISTS `intangible_asset_assignments` (
  `assignmentID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `intangible_asset_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountability_assignment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Active','Inactive','Returned','Lost','Damaged') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`assignmentID`),
  KEY `idx_iaa_asset` (`intangible_asset_id`),
  KEY `idx_iaa_user` (`user_id`),
  KEY `idx_iaa_asset_user_status` (`intangible_asset_id`, `user_id`, `status`),
  KEY `idx_iaa_department` (`department_id`),
  KEY `idx_iaa_location` (`location_id`),
  KEY `idx_iaa_assigned_by` (`assigned_by`),
  CONSTRAINT `fk_iaa_intangible_asset` FOREIGN KEY (`intangible_asset_id`) REFERENCES `intangible_assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_iaa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE,
  CONSTRAINT `fk_iaa_department` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL,
  CONSTRAINT `fk_iaa_location` FOREIGN KEY (`location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL,
  CONSTRAINT `fk_iaa_location_room` FOREIGN KEY (`location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL,
  CONSTRAINT `fk_iaa_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing single-assignee data
INSERT INTO `intangible_asset_assignments` (
  `assignmentID`,
  `intangible_asset_id`,
  `user_id`,
  `assigned_date`,
  `accountability_assignment_id`,
  `status`
)
SELECT
  UUID(),
  ia.`id`,
  ia.`assigned_to`,
  COALESCE(ia.`assigned_date`, NOW()),
  ia.`assignment_id`,
  'Active'
FROM `intangible_assets` ia
WHERE ia.`assigned_to` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `intangible_asset_assignments` iaa
    WHERE iaa.`intangible_asset_id` = ia.`id`
      AND iaa.`user_id` = ia.`assigned_to`
      AND iaa.`status` = 'Active'
  );

-- Fix orphaned status rows
UPDATE `intangible_assets`
SET `status` = 'available'
WHERE `status` = 'assigned'
  AND `assigned_to` IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM `intangible_asset_assignments` iaa
    WHERE iaa.`intangible_asset_id` = `intangible_assets`.`id`
      AND iaa.`status` = 'Active'
  );

-- Clear legacy assignment columns (data now in assignments table)
UPDATE `intangible_assets`
SET `assigned_to` = NULL, `assigned_date` = NULL, `assignment_id` = NULL
WHERE `assigned_to` IS NOT NULL;

DROP PROCEDURE IF EXISTS `sp_GetAllIntangibleAssets`;
DROP PROCEDURE IF EXISTS `sp_AssignIntangibleAsset`;
DROP PROCEDURE IF EXISTS `sp_UnassignIntangibleAsset`;
DROP PROCEDURE IF EXISTS `sp_UpdateIntangibleAsset`;

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
    CONCAT(COALESCE(uc.`first_name`, ''), ' ', COALESCE(uc.`last_name`, '')) AS created_by_name,
    CONCAT(COALESCE(uu.`first_name`, ''), ' ', COALESCE(uu.`last_name`, '')) AS updated_by_name,
    COALESCE(
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'userId', u2.`userID`,
            'firstName', u2.`first_name`,
            'lastName', u2.`last_name`,
            'email', u2.`email`,
            'assignedDate', iaa.`assigned_date`
          )
        )
        FROM `intangible_asset_assignments` iaa
        INNER JOIN `users` u2 ON iaa.`user_id` = u2.`userID`
        WHERE iaa.`intangible_asset_id` = ia.`id`
          AND iaa.`status` = 'Active'
          AND iaa.`deleted_at` IS NULL
      ),
      JSON_ARRAY()
    ) AS assignees
  FROM `intangible_assets` ia
  LEFT JOIN `users` uc ON ia.`created_by` = uc.`userID`
  LEFT JOIN `users` uu ON ia.`updated_by` = uu.`userID`
  WHERE ia.`company_id` = p_company_id
  ORDER BY ia.`created_at` DESC;
END$$

CREATE PROCEDURE `sp_AssignIntangibleAsset`(
  IN p_id CHAR(36),
  IN p_assigned_to CHAR(36),
  IN p_assignment_id CHAR(36),
  IN p_company_id CHAR(36),
  IN p_assigned_by CHAR(36),
  IN p_department_id CHAR(36),
  IN p_location_id CHAR(36),
  IN p_location_room_id CHAR(36)
)
BEGIN
  DECLARE v_existing INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existing
  FROM `intangible_asset_assignments`
  WHERE `intangible_asset_id` = p_id
    AND `user_id` = p_assigned_to
    AND `status` = 'Active'
    AND `deleted_at` IS NULL;

  IF v_existing = 0 THEN
    INSERT INTO `intangible_asset_assignments` (
      `assignmentID`,
      `intangible_asset_id`,
      `user_id`,
      `department_id`,
      `location_id`,
      `location_room_id`,
      `assigned_date`,
      `assigned_by`,
      `accountability_assignment_id`,
      `status`
    ) VALUES (
      UUID(),
      p_id,
      p_assigned_to,
      p_department_id,
      p_location_id,
      p_location_room_id,
      NOW(),
      p_assigned_by,
      p_assignment_id,
      'Active'
    );

    UPDATE `intangible_assets`
    SET `status` = 'assigned'
    WHERE `id` = p_id AND `company_id` = p_company_id;
  END IF;
END$$

CREATE PROCEDURE `sp_UnassignIntangibleAsset`(
  IN p_id CHAR(36),
  IN p_user_id CHAR(36),
  IN p_company_id CHAR(36)
)
BEGIN
  UPDATE `intangible_asset_assignments`
  SET `status` = 'Returned', `updated_at` = NOW()
  WHERE `intangible_asset_id` = p_id
    AND `user_id` = p_user_id
    AND `status` = 'Active'
    AND `deleted_at` IS NULL;

  UPDATE `intangible_assets` ia
  SET ia.`status` = CASE
    WHEN EXISTS (
      SELECT 1 FROM `intangible_asset_assignments` iaa
      WHERE iaa.`intangible_asset_id` = p_id
        AND iaa.`status` = 'Active'
        AND iaa.`deleted_at` IS NULL
    ) THEN 'assigned'
    ELSE 'available'
  END
  WHERE ia.`id` = p_id AND ia.`company_id` = p_company_id;
END$$

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
