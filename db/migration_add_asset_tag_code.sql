-- Migration: Add an immutable, stable `tag_code` to assets.
--
-- Purpose: QR codes / barcodes on asset tags encode `tag_code` instead of the
-- mutable `asset_code`. `tag_code` is frozen at the ORIGINAL asset code created
-- for the asset, so re-printing a tag (or re-classifying an asset that changes
-- `asset_code`) never invalidates already-printed tags:
--   - Old printed tags encode the old code == `tag_code` -> still resolve.
--   - New tags encode the same stable `tag_code`           -> same value.
--
-- `tag_code` is set automatically on INSERT (defaults to the generated
-- `asset_code`) and is preserved on every UPDATE (immutable) via triggers.
-- This avoids redefining `sp_create_asset` / `sp_update_asset`, whose exact
-- live bodies differ across historical migration files.

USE `asset_mngmnt`;

-- 1) Add the column (idempotent: skip if it already exists)
SET @tag_col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'asset_mngmnt' AND TABLE_NAME = 'assets' AND COLUMN_NAME = 'tag_code'
);
SET @sql := IF(
  @tag_col_exists = 0,
  'ALTER TABLE `assets` ADD COLUMN `tag_code` VARCHAR(50) NULL AFTER `asset_code`',
  'SELECT ''tag_code column already exists - skipping'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Backfill existing rows: tag_code = current asset_code (frozen original)
--    Disable safe-update mode just for this statement so it runs regardless of
--    the SQL client's setting (the table had no key-constrained filter).
SET SESSION SQL_SAFE_UPDATES = 0;
UPDATE `assets`
SET `tag_code` = `asset_code`
WHERE `tag_code` IS NULL OR `tag_code` = '';
SET SESSION SQL_SAFE_UPDATES = 1;

-- 3) Enforce uniqueness (tag_code is the scannable stable reference)
--    Idempotent: skip if the index already exists.
SET @tag_idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'asset_mngmnt' AND TABLE_NAME = 'assets' AND INDEX_NAME = 'uq_assets_tag_code'
);
SET @sql := IF(
  @tag_idx_exists = 0,
  'ALTER TABLE `assets` ADD UNIQUE INDEX `uq_assets_tag_code` (`tag_code`)',
  'SELECT ''uq_assets_tag_code already exists - skipping'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) Triggers: assign on insert, freeze on update (immutability guarantee)
DROP TRIGGER IF EXISTS `trg_assets_set_tag_code_on_insert`;
DELIMITER ;;
CREATE TRIGGER `trg_assets_set_tag_code_on_insert`
BEFORE INSERT ON `assets`
FOR EACH ROW
BEGIN
    IF NEW.tag_code IS NULL OR NEW.tag_code = '' THEN
        SET NEW.tag_code = NEW.asset_code;
    END IF;
END ;;
DELIMITER ;

DROP TRIGGER IF EXISTS `trg_assets_freeze_tag_code`;
DELIMITER ;;
CREATE TRIGGER `trg_assets_freeze_tag_code`
BEFORE UPDATE ON `assets`
FOR EACH ROW
BEGIN
    -- tag_code is immutable: never allow it to drift from the original code
    SET NEW.tag_code = OLD.tag_code;
END ;;
DELIMITER ;

-- 5) Expose tag_code from the asset list stored procedure.
--    (Redefined from the current/live body with `a.tag_code` added.)
DROP PROCEDURE IF EXISTS `sp_get_assets`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_assets`()
BEGIN
    SELECT
        a.assetID, a.asset_code, a.tag_code, a.name, a.description, a.category_id, a.supplier, a.type_id, a.brand, a.model, a.serial,
        a.image_url, a.purchase_date, a.asset_value, a.salvage_value, a.depreciation_method,
        a.useful_life_years, a.annual_depreciation, a.depreciation_start_date, a.company_id,
        a.location_id, a.location_room_id, a.department_id, a.location_notes, a.warranty_months,
        a.`condition`, a.maintenance_schedule, a.status, a.is_old_unit, a.created_at, a.created_by, a.updated_at, a.updated_by, a.deleted_at, a.deleted_by,
        c.name as category_name,
        t.name as type_name,
        comp.name as company_name,
        comp.logo_url as company_logo_url,
        l.name as location_name,
        l.building as building,
        lr.room_name,
        CASE WHEN d.departmentID IS NOT NULL THEN
            CONCAT('{"departmentID":"', IFNULL(d.departmentID, ''), '","name":"', IFNULL(REPLACE(REPLACE(d.name, '\\', '\\\\'), '"', '\\"'), ''), '","code":"', IFNULL(REPLACE(REPLACE(d.code, '\\', '\\\\'), '"', '\\"'), ''), '","prefix":"', IFNULL(REPLACE(REPLACE(d.prefix, '\\', '\\\\'), '"', '\\"'), ''), '","description":"', IFNULL(REPLACE(REPLACE(d.description, '\\', '\\\\'), '"', '\\"'), ''), '"}')
        ELSE NULL END as department,
        CONCAT(COALESCE(uc.first_name, ''), ' ', COALESCE(uc.last_name, '')) as created_by_name,
        CONCAT(COALESCE(uu.first_name, ''), ' ', COALESCE(uu.last_name, '')) as updated_by_name
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.categoryID AND c.deleted_at IS NULL
    LEFT JOIN asset_types t ON a.type_id = t.typeID AND t.deleted_at IS NULL
    LEFT JOIN companies comp ON a.company_id = comp.companyID AND comp.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_locations l ON a.location_id = l.locationID AND l.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_location_rooms lr ON a.location_room_id = lr.roomID AND lr.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_departments d ON a.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN users uc ON a.created_by = uc.userID
    LEFT JOIN users uu ON a.updated_by = uu.userID
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC;
END ;;
DELIMITER ;