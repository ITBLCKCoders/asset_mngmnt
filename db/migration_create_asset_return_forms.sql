-- Migration: create asset_return_forms table (one row per return form) and link asset_returns via form_id
-- Run this on your asset_mngmnt database.

-- 1. Create asset_return_forms table (mirrors accountability_forms concept)
CREATE TABLE IF NOT EXISTS asset_return_forms (
  formID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  form_number VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  department_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  location_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  location_room_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (formID),
  UNIQUE KEY form_number (form_number),
  KEY idx_asset_return_forms_user_id (user_id),
  KEY idx_asset_return_forms_created_at (created_at),
  CONSTRAINT fk_asset_return_forms_user_id FOREIGN KEY (user_id) REFERENCES users (userID) ON DELETE CASCADE,
  CONSTRAINT fk_asset_return_forms_department_id FOREIGN KEY (department_id) REFERENCES asset_mngmnt_departments (departmentID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_return_forms_location_id FOREIGN KEY (location_id) REFERENCES asset_mngmnt_locations (locationID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_return_forms_location_room_id FOREIGN KEY (location_room_id) REFERENCES asset_mngmnt_location_rooms (roomID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_return_forms_created_by FOREIGN KEY (created_by) REFERENCES users (userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add form_id to asset_returns (FK to asset_return_forms)
ALTER TABLE asset_returns
  ADD COLUMN form_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL AFTER return_batch_id,
  ADD INDEX idx_asset_returns_form_id (form_id),
  ADD CONSTRAINT fk_asset_returns_form_id FOREIGN KEY (form_id) REFERENCES asset_return_forms (formID) ON DELETE SET NULL ON UPDATE CASCADE;
