-- Migration to add return location fields to asset_returns table
-- This migration adds fields to track where assets are returned to

-- Add return location fields to asset_returns table
ALTER TABLE `asset_returns` 
ADD COLUMN `return_location_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Location where asset was returned to' AFTER `return_notes`,
ADD COLUMN `return_location_room_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Room/area where asset was returned to' AFTER `return_location_id`,
ADD COLUMN `return_department_id` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Department where asset was returned to' AFTER `return_location_room_id`,
ADD INDEX `idx_asset_returns_return_location_id` (`return_location_id`),
ADD INDEX `idx_asset_returns_return_location_room_id` (`return_location_room_id`),
ADD INDEX `idx_asset_returns_return_department_id` (`return_department_id`),
ADD CONSTRAINT `fk_asset_returns_return_location_id` FOREIGN KEY (`return_location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `fk_asset_returns_return_location_room_id` FOREIGN KEY (`return_location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `fk_asset_returns_return_department_id` FOREIGN KEY (`return_department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Update the model to include the new fields
-- Note: This is a comment for documentation. The actual model update should be done in the TypeScript file.

-- Verify the table structure
DESCRIBE `asset_returns`;