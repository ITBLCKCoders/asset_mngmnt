-- Add Intangible Asset Types and Risk Levels reference data tables + stored procedures.
-- Also seeds the "Intangible Asset Types" and "Risk Levels" modules for admin/global admin roles.
-- Run on asset_mngmnt after deploying the corresponding server routes and client sections.

-- ------------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `intangible_asset_types` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_intangible_asset_types_company` (`company_id`),
  KEY `idx_intangible_asset_types_department` (`department_id`),
  CONSTRAINT `fk_iat_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companyID`) ON DELETE CASCADE,
  CONSTRAINT `fk_iat_department` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `risk_levels` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_risk_levels_company` (`company_id`),
  CONSTRAINT `fk_risk_levels_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companyID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------
-- 2. Intangible Asset Type stored procedures
-- ------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetAllIntangibleAssetTypes`;
DELIMITER $$
CREATE PROCEDURE `sp_GetAllIntangibleAssetTypes`(IN p_company_id CHAR(36))
BEGIN
    SELECT iat.id, iat.company_id, iat.name, iat.prefix, iat.department_id,
           iat.created_at, iat.created_by, iat.updated_at, iat.updated_by,
           CASE WHEN d.departmentID IS NOT NULL THEN
               JSON_OBJECT('id', d.departmentID, 'name', d.name, 'code', d.code)
           ELSE NULL END as department
    FROM intangible_asset_types iat
    LEFT JOIN asset_mngmnt_departments d ON iat.department_id = d.departmentID AND d.deleted_at IS NULL
    WHERE iat.deleted_at IS NULL AND iat.company_id = p_company_id
    ORDER BY iat.created_at DESC;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateIntangibleAssetType`;
DELIMITER $$
CREATE PROCEDURE `sp_CreateIntangibleAssetType`(
    IN p_name VARCHAR(255),
    IN p_prefix VARCHAR(10),
    IN p_department_id CHAR(36),
    IN p_company_id CHAR(36),
    IN p_created_by CHAR(36)
)
BEGIN
    DECLARE new_id CHAR(36);
    SET new_id = UUID();

    INSERT INTO intangible_asset_types (
        id, name, prefix, department_id, company_id, created_by, updated_by
    ) VALUES (
        new_id, p_name, UPPER(NULLIF(TRIM(p_prefix), '')), NULLIF(p_department_id, ''), p_company_id, p_created_by, p_created_by
    );

    SELECT iat.id, iat.company_id, iat.name, iat.prefix, iat.department_id,
           iat.created_at, iat.created_by, iat.updated_at, iat.updated_by,
           CASE WHEN d.departmentID IS NOT NULL THEN
               JSON_OBJECT('id', d.departmentID, 'name', d.name, 'code', d.code)
           ELSE NULL END as department
    FROM intangible_asset_types iat
    LEFT JOIN asset_mngmnt_departments d ON iat.department_id = d.departmentID AND d.deleted_at IS NULL
    WHERE iat.id = new_id;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateIntangibleAssetType`;
DELIMITER $$
CREATE PROCEDURE `sp_UpdateIntangibleAssetType`(
    IN p_id CHAR(36),
    IN p_name VARCHAR(255),
    IN p_prefix VARCHAR(10),
    IN p_department_id CHAR(36),
    IN p_company_id CHAR(36),
    IN p_updated_by CHAR(36)
)
BEGIN
    UPDATE intangible_asset_types SET
        name = p_name,
        prefix = UPPER(NULLIF(TRIM(p_prefix), '')),
        department_id = NULLIF(p_department_id, ''),
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE id = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT iat.id, iat.company_id, iat.name, iat.prefix, iat.department_id,
           iat.created_at, iat.created_by, iat.updated_at, iat.updated_by,
           CASE WHEN d.departmentID IS NOT NULL THEN
               JSON_OBJECT('id', d.departmentID, 'name', d.name, 'code', d.code)
           ELSE NULL END as department
    FROM intangible_asset_types iat
    LEFT JOIN asset_mngmnt_departments d ON iat.department_id = d.departmentID AND d.deleted_at IS NULL
    WHERE iat.id = p_id AND iat.deleted_at IS NULL;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteIntangibleAssetType`;
DELIMITER $$
CREATE PROCEDURE `sp_DeleteIntangibleAssetType`(IN p_id CHAR(36), IN p_company_id CHAR(36), IN p_deleted_by CHAR(36))
BEGIN
    UPDATE intangible_asset_types SET deleted_at = NOW(), deleted_by = p_deleted_by
    WHERE id = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT 'Intangible asset type deleted successfully' AS message;
END$$
DELIMITER ;

-- ------------------------------------------------------------------
-- 3. Risk Level stored procedures
-- ------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetAllRiskLevels`;
DELIMITER $$
CREATE PROCEDURE `sp_GetAllRiskLevels`(IN p_company_id CHAR(36))
BEGIN
    SELECT id, company_id, name, color, created_at, created_by, updated_at, updated_by
    FROM risk_levels
    WHERE deleted_at IS NULL AND company_id = p_company_id
    ORDER BY created_at DESC;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateRiskLevel`;
DELIMITER $$
CREATE PROCEDURE `sp_CreateRiskLevel`(
    IN p_name VARCHAR(255),
    IN p_color VARCHAR(50),
    IN p_company_id CHAR(36),
    IN p_created_by CHAR(36)
)
BEGIN
    DECLARE new_id CHAR(36);
    SET new_id = UUID();

    INSERT INTO risk_levels (
        id, name, color, company_id, created_by, updated_by
    ) VALUES (
        new_id, p_name, NULLIF(TRIM(p_color), ''), p_company_id, p_created_by, p_created_by
    );

    SELECT id, company_id, name, color, created_at, created_by, updated_at, updated_by
    FROM risk_levels WHERE id = new_id;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateRiskLevel`;
DELIMITER $$
CREATE PROCEDURE `sp_UpdateRiskLevel`(
    IN p_id CHAR(36),
    IN p_name VARCHAR(255),
    IN p_color VARCHAR(50),
    IN p_company_id CHAR(36),
    IN p_updated_by CHAR(36)
)
BEGIN
    UPDATE risk_levels SET
        name = p_name,
        color = NULLIF(TRIM(p_color), ''),
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE id = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT id, company_id, name, color, created_at, created_by, updated_at, updated_by
    FROM risk_levels WHERE id = p_id AND deleted_at IS NULL;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteRiskLevel`;
DELIMITER $$
CREATE PROCEDURE `sp_DeleteRiskLevel`(IN p_id CHAR(36), IN p_company_id CHAR(36), IN p_deleted_by CHAR(36))
BEGIN
    UPDATE risk_levels SET deleted_at = NOW(), deleted_by = p_deleted_by
    WHERE id = p_id AND deleted_at IS NULL AND company_id = p_company_id;

    SELECT 'Risk level deleted successfully' AS message;
END$$
DELIMITER ;

-- ------------------------------------------------------------------
-- 4. Seed permissions for admin / global admin roles
-- ------------------------------------------------------------------

INSERT INTO `role_permissions` (`permission_id`, `role_id`, `module_name`, `permission_type`, `granted`, `created_at`, `updated_at`)
SELECT UUID(), r.roleID, m.module_name, p.permission_type, 1, NOW(), NOW()
FROM `asset_mngmnt_roles` r
CROSS JOIN (
  SELECT 'Intangible Asset Types' AS module_name
  UNION ALL SELECT 'Risk Levels'
) m
CROSS JOIN (
  SELECT 'view' AS permission_type
  UNION ALL SELECT 'create'
  UNION ALL SELECT 'edit'
  UNION ALL SELECT 'delete'
) p
WHERE LOWER(r.name) IN ('admin', 'global admin')
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` existing
    WHERE existing.role_id = r.roleID
      AND existing.module_name = m.module_name
      AND existing.permission_type = p.permission_type
  );

INSERT INTO `user_permissions` (`user_id`, `module_name`, `permission_type`, `granted`)
SELECT u.userID, m.module_name, p.permission_type, 1
FROM `users` u
CROSS JOIN (
  SELECT 'Intangible Asset Types' AS module_name
  UNION ALL SELECT 'Risk Levels'
) m
CROSS JOIN (
  SELECT 'view' AS permission_type
  UNION ALL SELECT 'create'
  UNION ALL SELECT 'edit'
  UNION ALL SELECT 'delete'
) p
WHERE EXISTS (
  SELECT 1 FROM `asset_mngmnt_roles` r
  WHERE r.roleID = u.role_id AND LOWER(r.name) IN ('admin', 'global admin') AND r.deleted_at IS NULL
)
  AND NOT EXISTS (
    SELECT 1 FROM `user_permissions` existing
    WHERE existing.user_id = u.userID
      AND existing.module_name = m.module_name
      AND existing.permission_type = p.permission_type
  );

-- ------------------------------------------------------------------
-- 5. Backfill: add department_id column + FK if upgrading from an
--    earlier version of this migration (idempotent).
-- ------------------------------------------------------------------

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'intangible_asset_types'
    AND COLUMN_NAME = 'department_id'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `intangible_asset_types`
     ADD COLUMN `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `prefix`,
     ADD KEY `idx_intangible_asset_types_department` (`department_id`),
     ADD CONSTRAINT `fk_iat_department` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
