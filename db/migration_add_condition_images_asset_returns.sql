-- Migration: add condition_images column and sp_create_asset_return stored procedure
-- condition_images stores JSON array of Cloudinary URLs for return condition photos

-- 1. Add condition_images column
ALTER TABLE `asset_returns`
ADD COLUMN `condition_images` JSON NULL COMMENT 'Array of Cloudinary URLs for return condition photos' AFTER `form_id`;

-- 2. Create sp_create_asset_return stored procedure
DROP PROCEDURE IF EXISTS `sp_create_asset_return`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_asset_return`(
  IN p_return_id VARCHAR(36),
  IN p_assignment_id VARCHAR(36),
  IN p_user_id VARCHAR(36),
  IN p_return_condition VARCHAR(50),
  IN p_return_notes TEXT,
  IN p_return_location_id VARCHAR(36),
  IN p_return_location_room_id VARCHAR(36),
  IN p_return_department_id VARCHAR(36),
  IN p_return_batch_id VARCHAR(36),
  IN p_form_id VARCHAR(36),
  IN p_condition_images JSON
)
BEGIN
  INSERT INTO asset_returns (
    return_id,
    assignment_id,
    user_id,
    return_condition,
    return_notes,
    return_location_id,
    return_location_room_id,
    return_department_id,
    return_batch_id,
    form_id,
    condition_images
  ) VALUES (
    p_return_id,
    p_assignment_id,
    p_user_id,
    p_return_condition,
    p_return_notes,
    NULLIF(p_return_location_id, ''),
    NULLIF(p_return_location_room_id, ''),
    NULLIF(p_return_department_id, ''),
    NULLIF(p_return_batch_id, ''),
    NULLIF(p_form_id, ''),
    p_condition_images
  );
END ;;
DELIMITER ;
