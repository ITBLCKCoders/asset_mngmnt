-- Route intangible assets to IT/Admin accountability based on the department
-- linked to their `intangible_asset_types` row, mirroring how tangible assets
-- route by their category's department.
--
-- Exposes `type_department` as JSON { id, name, code } on sp_GetAllIntangibleAssets
-- so both server (form number generation) and client (PDF grouping / scope tabs)
-- can classify an intangible asset as IT or Admin by its type's department.

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
    ia.`risk_level_id`,
    ia.`status`,
    ia.`created_at`,
    ia.`created_by`,
    ia.`updated_at`,
    ia.`updated_by`,
    ia.`company_id`,
    c.`name` AS company_name,
    c.`logo_url` AS company_logo,
    CONCAT(COALESCE(uc.`first_name`, ''), ' ', COALESCE(uc.`last_name`, '')) AS created_by_name,
    CONCAT(COALESCE(uu.`first_name`, ''), ' ', COALESCE(uu.`last_name`, '')) AS updated_by_name,
    (
      SELECT af.`form_number`
      FROM `accountability_forms` af
      WHERE af.`deleted_at` IS NULL
        AND (af.`asset_id` = ia.`id` OR af.`assets_data` LIKE CONCAT('%', ia.`id`, '%'))
      ORDER BY af.`created_at` DESC
      LIMIT 1
    ) AS accountability_form_number,
    COALESCE(
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'formNumber', af.`form_number`,
            'status', af.`status`,
            'userId', af.`user_id`,
            'assignedDate', af.`created_at`
          )
        )
        FROM `accountability_forms` af
        WHERE af.`deleted_at` IS NULL
          AND (af.`asset_id` = ia.`id` OR af.`assets_data` LIKE CONCAT('%', ia.`id`, '%'))
        ORDER BY af.`created_at` DESC
      ),
      JSON_ARRAY()
    ) AS accountability_forms,
    COALESCE(
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'userId', u2.`userID`,
            'firstName', u2.`first_name`,
            'lastName', u2.`last_name`,
            'email', u2.`email`,
            'assignedDate', COALESCE(iaa.`assigned_date`, ia.`assigned_date`),
            'departmentName', COALESCE(d2.`name`, d.`name`)
          )
        )
        FROM `intangible_asset_assignments` iaa
        INNER JOIN `users` u2 ON iaa.`user_id` = u2.`userID`
        LEFT JOIN `asset_mngmnt_departments` d2 ON u2.`department_id` = d2.`departmentID`
        WHERE iaa.`intangible_asset_id` = ia.`id`
          AND iaa.`status` = 'Active'
          AND iaa.`deleted_at` IS NULL
      ),
      (
        CASE
          WHEN ia.`assigned_to` IS NOT NULL THEN
            JSON_ARRAY(
              JSON_OBJECT(
                'userId', u.`userID`,
                'firstName', u.`first_name`,
                'lastName', u.`last_name`,
                'email', u.`email`,
                'assignedDate', ia.`assigned_date`,
                'departmentName', d.`name`
              )
            )
          ELSE JSON_ARRAY()
        END
      ),
      JSON_ARRAY()
    ) AS assignees,
    CASE WHEN rl.`id` IS NOT NULL THEN
      JSON_OBJECT('id', rl.`id`, 'name', rl.`name`, 'color', rl.`color`)
    ELSE NULL END AS risk_level,
    -- NEW: department linked to this intangible asset's type, used to route
    -- the asset to IT or Admin accountability (mirrors category department
    -- routing for tangible assets).
    CASE WHEN td.`departmentID` IS NOT NULL THEN
      JSON_OBJECT('id', td.`departmentID`, 'name', td.`name`, 'code', td.`code`)
    ELSE NULL END AS type_department
  FROM `intangible_assets` ia
  LEFT JOIN `companies` c ON ia.`company_id` = c.`companyID`
  LEFT JOIN `users` u ON ia.`assigned_to` = u.`userID`
  LEFT JOIN `asset_mngmnt_departments` d ON u.`department_id` = d.`departmentID`
  LEFT JOIN `users` uc ON ia.`created_by` = uc.`userID`
  LEFT JOIN `users` uu ON ia.`updated_by` = uu.`userID`
  LEFT JOIN `risk_levels` rl ON ia.`risk_level_id` = rl.`id` AND rl.`deleted_at` IS NULL
  LEFT JOIN `intangible_asset_types` iat
    ON ia.`type` = iat.`name`
    AND iat.`company_id` = ia.`company_id`
    AND iat.`deleted_at` IS NULL
  LEFT JOIN `asset_mngmnt_departments` td
    ON iat.`department_id` = td.`departmentID`
    AND td.`deleted_at` IS NULL
  WHERE ia.`company_id` = p_company_id
  ORDER BY ia.`created_at` DESC;
END$$

DELIMITER ;