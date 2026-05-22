-- Home/origin company for cross-company transfer visibility.
-- originating_company_id is set at creation and not changed on transfer.
-- Safe to re-run: skips ALTER steps if column/index/FK already exist.

SET @db = DATABASE();

-- ---------- assets.originating_company_id ----------
SELECT COUNT(*) INTO @assets_col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'assets'
  AND COLUMN_NAME = 'originating_company_id';

SET @sql = IF(
  @assets_col_exists = 0,
  'ALTER TABLE `assets`
     ADD COLUMN `originating_company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `company_id`',
  'SELECT ''SKIP: assets.originating_company_id already exists'' AS migration_note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @assets_idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'assets'
  AND INDEX_NAME = 'idx_assets_originating_company_id';

SET @sql = IF(
  @assets_idx_exists = 0,
  'ALTER TABLE `assets` ADD KEY `idx_assets_originating_company_id` (`originating_company_id`)',
  'SELECT ''SKIP: idx_assets_originating_company_id already exists'' AS migration_note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @assets_fk_exists
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'assets'
  AND CONSTRAINT_NAME = 'assets_ibfk_originating_company'
  AND CONSTRAINT_TYPE = 'FOREIGN KEY';

SET @sql = IF(
  @assets_fk_exists = 0,
  'ALTER TABLE `assets`
     ADD CONSTRAINT `assets_ibfk_originating_company`
     FOREIGN KEY (`originating_company_id`) REFERENCES `companies` (`companyID`) ON DELETE SET NULL',
  'SELECT ''SKIP: assets_ibfk_originating_company already exists'' AS migration_note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- asset_builders.originating_company_id ----------
SELECT COUNT(*) INTO @builders_col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'asset_builders'
  AND COLUMN_NAME = 'originating_company_id';

SET @sql = IF(
  @builders_col_exists = 0,
  'ALTER TABLE `asset_builders`
     ADD COLUMN `originating_company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `company_id`',
  'SELECT ''SKIP: asset_builders.originating_company_id already exists'' AS migration_note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @builders_idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'asset_builders'
  AND INDEX_NAME = 'idx_asset_builders_originating_company_id';

SET @sql = IF(
  @builders_idx_exists = 0,
  'ALTER TABLE `asset_builders` ADD KEY `idx_asset_builders_originating_company_id` (`originating_company_id`)',
  'SELECT ''SKIP: idx_asset_builders_originating_company_id already exists'' AS migration_note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @builders_fk_exists
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'asset_builders'
  AND CONSTRAINT_NAME = 'asset_builders_ibfk_originating_company'
  AND CONSTRAINT_TYPE = 'FOREIGN KEY';

SET @sql = IF(
  @builders_fk_exists = 0,
  'ALTER TABLE `asset_builders`
     ADD CONSTRAINT `asset_builders_ibfk_originating_company`
     FOREIGN KEY (`originating_company_id`) REFERENCES `companies` (`companyID`) ON DELETE SET NULL',
  'SELECT ''SKIP: asset_builders_ibfk_originating_company already exists'' AS migration_note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- Backfill (idempotent) ----------
SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

UPDATE `assets`
SET `originating_company_id` = `company_id`
WHERE `originating_company_id` IS NULL
  AND `company_id` IS NOT NULL;

UPDATE `asset_builders`
SET `originating_company_id` = `company_id`
WHERE `originating_company_id` IS NULL
  AND `company_id` IS NOT NULL;

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
) ft ON a.assetID = ft.asset_id
SET a.originating_company_id = ft.origin_company_id
WHERE a.assetID = ft.asset_id
  AND a.deleted_at IS NULL
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
) ft ON ab.builderID = ft.builder_id
SET ab.originating_company_id = ft.origin_company_id
WHERE ab.builderID = ft.builder_id
  AND ab.deleted_at IS NULL
  AND ft.origin_company_id IS NOT NULL
  AND ab.company_id IS NOT NULL
  AND ab.company_id <> ft.origin_company_id;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

-- Verify
SELECT
  (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL AND company_id IS NOT NULL AND originating_company_id IS NULL) AS assets_missing_origin,
  (SELECT COUNT(*) FROM asset_builders WHERE deleted_at IS NULL AND company_id IS NOT NULL AND originating_company_id IS NULL) AS builders_missing_origin;
