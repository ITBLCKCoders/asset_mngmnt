-- Home/origin company for cross-company transfer visibility.
-- originating_company_id is set at creation and not changed on transfer.
-- Assets remain visible and countable for the origin company forever.

ALTER TABLE `assets`
  ADD COLUMN `originating_company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `company_id`,
  ADD KEY `idx_assets_originating_company_id` (`originating_company_id`),
  ADD CONSTRAINT `assets_ibfk_originating_company`
    FOREIGN KEY (`originating_company_id`) REFERENCES `companies` (`companyID`) ON DELETE SET NULL;

ALTER TABLE `asset_builders`
  ADD COLUMN `originating_company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `company_id`,
  ADD KEY `idx_asset_builders_originating_company_id` (`originating_company_id`),
  ADD CONSTRAINT `asset_builders_ibfk_originating_company`
    FOREIGN KEY (`originating_company_id`) REFERENCES `companies` (`companyID`) ON DELETE SET NULL;

-- Default: origin = current owner
UPDATE `assets`
SET `originating_company_id` = `company_id`
WHERE `originating_company_id` IS NULL AND `company_id` IS NOT NULL;

UPDATE `asset_builders`
SET `originating_company_id` = `company_id`
WHERE `originating_company_id` IS NULL AND `company_id` IS NOT NULL;

-- Historical company transfers: restore true origin from earliest audit record
UPDATE `assets` a
INNER JOIN (
  SELECT
    al.resource_id AS asset_id,
    JSON_UNQUOTE(JSON_EXTRACT(al.old_values, '$.company_id')) AS origin_company_id
  FROM audit_logs al
  INNER JOIN (
    SELECT resource_id, MIN(created_at) AS first_at
    FROM audit_logs
    WHERE action = 'Transferred Asset to Company'
      AND resource_type = 'asset'
    GROUP BY resource_id
  ) first_t
    ON first_t.resource_id = al.resource_id
   AND first_t.first_at = al.created_at
  WHERE al.action = 'Transferred Asset to Company'
    AND al.resource_type = 'asset'
    AND JSON_EXTRACT(al.old_values, '$.company_id') IS NOT NULL
) ft ON CAST(a.assetID AS CHAR) = CAST(ft.asset_id AS CHAR)
SET a.originating_company_id = ft.origin_company_id
WHERE a.deleted_at IS NULL
  AND ft.origin_company_id IS NOT NULL
  AND a.company_id IS NOT NULL
  AND a.company_id <> ft.origin_company_id;

UPDATE `asset_builders` ab
INNER JOIN (
  SELECT
    al.resource_id AS builder_id,
    JSON_UNQUOTE(JSON_EXTRACT(al.old_values, '$.company_id')) AS origin_company_id
  FROM audit_logs al
  INNER JOIN (
    SELECT resource_id, MIN(created_at) AS first_at
    FROM audit_logs
    WHERE action = 'Transferred Asset Builder to Company'
      AND resource_type = 'asset_builder'
    GROUP BY resource_id
  ) first_t
    ON first_t.resource_id = al.resource_id
   AND first_t.first_at = al.created_at
  WHERE al.action = 'Transferred Asset Builder to Company'
    AND al.resource_type = 'asset_builder'
    AND JSON_EXTRACT(al.old_values, '$.company_id') IS NOT NULL
) ft ON CAST(ab.builderID AS CHAR) = CAST(ft.builder_id AS CHAR)
SET ab.originating_company_id = ft.origin_company_id
WHERE ab.deleted_at IS NULL
  AND ft.origin_company_id IS NOT NULL
  AND ab.company_id IS NOT NULL
  AND ab.company_id <> ft.origin_company_id;
