-- Add company info to intangible assets export
-- Exposes company_id and company_name from sp_GetAllIntangibleAssets so the client
-- can derive the correct company name for export filenames instead of relying on UI activeCompany state.

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
    ia.`company_id`,
    c.`name` AS company_name,
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
    END AS assignees
  FROM `intangible_assets` ia
  LEFT JOIN `companies` c ON ia.`company_id` = c.`companyID`
  LEFT JOIN `users` u ON ia.`assigned_to` = u.`userID`
  LEFT JOIN `users` uc ON ia.`created_by` = uc.`userID`
  LEFT JOIN `users` uu ON ia.`updated_by` = uu.`userID`
  WHERE ia.`company_id` = p_company_id
  ORDER BY ia.`created_at` DESC;
END$$

DELIMITER ;
