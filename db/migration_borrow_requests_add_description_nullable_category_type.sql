-- Migration: borrow requests: replace required category/type with free-text description.
-- Keeps existing category_id/type_id nullable for history; new requests use description.

ALTER TABLE `asset_borrow_requests` ADD COLUMN `description` TEXT NULL AFTER `type_id`;

-- Backfill existing rows from joined category/type names so NOT NULL succeeds
-- NOTE: WHERE includes PK (borrow_request_id) to satisfy MySQL safe-update mode (ERROR 1175)
SET SQL_SAFE_UPDATES = 0;
UPDATE `asset_borrow_requests` br
LEFT JOIN `asset_categories` c ON br.category_id = c.categoryID
LEFT JOIN `asset_types` t ON br.type_id = t.typeID
SET br.description = TRIM(CONCAT(COALESCE(c.name, ''), ' ', COALESCE(t.name, '')))
WHERE br.borrow_request_id IS NOT NULL
  AND (br.description IS NULL OR TRIM(br.description) = '');

-- Fallback for rows where joins yielded empty
UPDATE `asset_borrow_requests` SET `description` = 'Borrow request'
WHERE borrow_request_id IS NOT NULL
  AND (description IS NULL OR TRIM(description) = '');

SET SQL_SAFE_UPDATES = 1;

ALTER TABLE `asset_borrow_requests` MODIFY `description` TEXT NOT NULL;
ALTER TABLE `asset_borrow_requests` MODIFY `category_id` char(36) NULL;
ALTER TABLE `asset_borrow_requests` MODIFY `type_id` char(36) NULL;
