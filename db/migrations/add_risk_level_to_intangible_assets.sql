-- Add risk level support to intangible assets.
-- 1. Widen `type` from ENUM to VARCHAR so it can store company-defined
--    type names from the `intangible_asset_types` reference table.
-- 2. Add `risk_level_id` FK -> risk_levels(id).
-- 3. Update SPs to accept/persist/return risk level.

-- ------------------------------------------------------------------
-- 1. Schema changes
-- ------------------------------------------------------------------

ALTER TABLE `intangible_assets`
  MODIFY COLUMN `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '';

ALTER TABLE `intangible_assets`
  ADD COLUMN `risk_level_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `type`,
  ADD KEY `idx_intangible_assets_risk_level` (`risk_level_id`),
  ADD CONSTRAINT `fk_intangible_assets_risk_level` FOREIGN KEY (`risk_level_id`) REFERENCES `risk_levels` (`id`) ON DELETE SET NULL;

-- ------------------------------------------------------------------
-- 2. Stored procedures
-- ------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_CreateIntangibleAsset`;

DELIMITER $$

CREATE PROCEDURE `sp_CreateIntangibleAsset`(
  IN p_name VARCHAR(255),
  IN p_description TEXT,
  IN p_remarks TEXT,
  IN p_type VARCHAR(255),
  IN p_risk_level_id CHAR(36),
  IN p_status ENUM('available','assigned'),
  IN p_company_id CHAR(36),
  IN p_created_by CHAR(36)
)
BEGIN
  DECLARE new_id CHAR(36);
  SET new_id = UUID();

  INSERT INTO `intangible_assets` (
    `id`,
    `name`,
    `description`,
    `remarks`,
    `type`,
    `risk_level_id`,
    `status`,
    `company_id`,
    `created_by`
  ) VALUES (
    new_id,
    p_name,
    p_description,
    p_remarks,
    p_type,
    NULLIF(p_risk_level_id, ''),
    p_status,
    p_company_id,
    p_created_by
  );

  SELECT new_id as id;
END$$

DROP PROCEDURE IF EXISTS `sp_UpdateIntangibleAsset`$$

CREATE PROCEDURE `sp_UpdateIntangibleAsset`(
  IN p_id CHAR(36),
  IN p_name VARCHAR(255),
  IN p_description TEXT,
  IN p_remarks TEXT,
  IN p_type VARCHAR(255),
  IN p_risk_level_id CHAR(36),
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
    `risk_level_id` = NULLIF(p_risk_level_id, ''),
    `status` = p_status,
    `updated_by` = p_updated_by,
    `updated_at` = NOW()
  WHERE `id` = p_id AND `company_id` = p_company_id;
END$$

DROP PROCEDURE IF EXISTS `sp_GetAllIntangibleAssets`$$

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
    ia.`risk_level_id`,
    ia.`status`,
    ia.`created_at`,
    ia.`created_by`,
    ia.`updated_at`,
    ia.`updated_by`,
    CONCAT(COALESCE(uc.`first_name`, ''), ' ', COALESCE(uc.`last_name`, '')) AS created_by_name,
    CONCAT(COALESCE(uu.`first_name`, ''), ' ', COALESCE(uu.`last_name`, '')) AS updated_by_name,
    CASE
      WHEN ia.`assigned_to` IS NOT NULL THEN
        JSON_ARRAY(
          JSON_OBJECT(
            'userId', u.`userID`,
            'firstName', u.`first_name`,
            'lastName', u.`last_name`,
            'email', u.`email`,
            'assignedDate', ia.`assigned_date`
          )
        )
      ELSE JSON_ARRAY()
    END AS assignees,
    CASE WHEN rl.`id` IS NOT NULL THEN
      JSON_OBJECT('id', rl.`id`, 'name', rl.`name`, 'color', rl.`color`)
    ELSE NULL END AS risk_level
  FROM `intangible_assets` ia
  LEFT JOIN `users` u ON ia.`assigned_to` = u.`userID`
  LEFT JOIN `users` uc ON ia.`created_by` = uc.`userID`
  LEFT JOIN `users` uu ON ia.`updated_by` = uu.`userID`
  LEFT JOIN `risk_levels` rl ON ia.`risk_level_id` = rl.`id` AND rl.`deleted_at` IS NULL
  WHERE ia.`company_id` = p_company_id
  ORDER BY ia.`created_at` DESC;
END$$

DELIMITER ;
