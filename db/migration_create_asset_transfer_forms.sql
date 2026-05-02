-- Migration: create asset_transfer_forms, asset_transfer, asset_transfer_form_settings
-- and stored procedures for asset transfer flow.
-- Run on asset_mngmnt database.

-- 1. Create asset_transfer_form_settings table (mirror of asset_return_form_settings)
CREATE TABLE IF NOT EXISTS asset_transfer_form_settings (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  company_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  company_format ENUM('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'code',
  department_format ENUM('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  it_asset_transfer_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  admin_asset_transfer_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  include_date TINYINT NOT NULL DEFAULT 1,
  date_format ENUM('MMYYYY','YYYYMMDD') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'YYYYMMDD',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (id),
  KEY company_id (company_id),
  CONSTRAINT asset_transfer_form_settings_company_fk FOREIGN KEY (company_id) REFERENCES companies (companyID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create asset_transfer_forms table (one row per transfer form)
CREATE TABLE IF NOT EXISTS asset_transfer_forms (
  formID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  form_number VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  department_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  location_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  location_room_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  new_assigned_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  signed_at DATETIME DEFAULT NULL,
  signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  signed_digital_signature TEXT DEFAULT NULL,
  process_signed_at DATETIME DEFAULT NULL,
  process_digital_signature TEXT DEFAULT NULL,
  transfer_type VARCHAR(100) DEFAULT NULL,
  received_by VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (formID),
  UNIQUE KEY form_number (form_number),
  KEY idx_asset_transfer_forms_user_id (user_id),
  KEY idx_asset_transfer_forms_created_at (created_at),
  CONSTRAINT fk_asset_transfer_forms_user_id FOREIGN KEY (user_id) REFERENCES users (userID) ON DELETE CASCADE,
  CONSTRAINT fk_asset_transfer_forms_department_id FOREIGN KEY (department_id) REFERENCES asset_mngmnt_departments (departmentID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfer_forms_location_id FOREIGN KEY (location_id) REFERENCES asset_mngmnt_locations (locationID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfer_forms_location_room_id FOREIGN KEY (location_room_id) REFERENCES asset_mngmnt_location_rooms (roomID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfer_forms_new_assigned_user_id FOREIGN KEY (new_assigned_user_id) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfer_forms_created_by FOREIGN KEY (created_by) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfer_forms_signed_by FOREIGN KEY (signed_by) REFERENCES users (userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create asset_transfer table (per-asset transfer record)
CREATE TABLE IF NOT EXISTS asset_transfer (
  record_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  form_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  assignment_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  transfer_condition VARCHAR(50) DEFAULT NULL,
  transfer_notes TEXT DEFAULT NULL,
  condition_images JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (record_id),
  KEY idx_asset_transfer_form_id (form_id),
  KEY idx_asset_transfer_assignment_id (assignment_id),
  CONSTRAINT fk_asset_transfer_form_id FOREIGN KEY (form_id) REFERENCES asset_transfer_forms (formID) ON DELETE CASCADE,
  CONSTRAINT fk_asset_transfer_assignment_id FOREIGN KEY (assignment_id) REFERENCES asset_assignments (assignmentID) ON DELETE CASCADE,
  CONSTRAINT fk_asset_transfer_user_id FOREIGN KEY (user_id) REFERENCES users (userID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Stored procedure: sp_create_asset_transfer_form
DROP PROCEDURE IF EXISTS `sp_create_asset_transfer_form`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_asset_transfer_form`(
  IN p_form_id CHAR(36),
  IN p_form_number VARCHAR(50),
  IN p_user_id CHAR(36),
  IN p_department_id CHAR(36),
  IN p_location_id CHAR(36),
  IN p_location_room_id CHAR(36),
  IN p_new_assigned_user_id CHAR(36),
  IN p_created_by CHAR(36),
  IN p_process_signed_at DATETIME,
  IN p_process_digital_signature TEXT,
  IN p_transfer_type VARCHAR(100),
  IN p_received_by VARCHAR(100)
)
BEGIN
  INSERT INTO asset_transfer_forms (
    formID, form_number, user_id, department_id, location_id, location_room_id,
    new_assigned_user_id, created_by, process_signed_at, process_digital_signature,
    transfer_type, received_by
  ) VALUES (
    p_form_id, p_form_number, p_user_id, NULLIF(p_department_id, ''),
    NULLIF(p_location_id, ''), NULLIF(p_location_room_id, ''),
    NULLIF(p_new_assigned_user_id, ''),
    NULLIF(p_created_by, ''),
    p_process_signed_at, p_process_digital_signature,
    NULLIF(p_transfer_type, ''), NULLIF(p_received_by, '')
  );
  SELECT p_form_id AS formID;
END ;;
DELIMITER ;

-- 5. Stored procedure: sp_create_asset_transfer_record
DROP PROCEDURE IF EXISTS `sp_create_asset_transfer_record`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_asset_transfer_record`(
  IN p_record_id CHAR(36),
  IN p_form_id CHAR(36),
  IN p_assignment_id CHAR(36),
  IN p_user_id CHAR(36),
  IN p_transfer_condition VARCHAR(50),
  IN p_transfer_notes TEXT,
  IN p_condition_images JSON
)
BEGIN
  INSERT INTO asset_transfer (
    record_id, form_id, assignment_id, user_id,
    transfer_condition, transfer_notes, condition_images
  ) VALUES (
    p_record_id, p_form_id, p_assignment_id, p_user_id,
    NULLIF(p_transfer_condition, ''), p_transfer_notes, p_condition_images
  );
  SELECT p_record_id AS record_id;
END ;;
DELIMITER ;

-- 6. Stored procedure: sp_sign_asset_transfer_form
DROP PROCEDURE IF EXISTS `sp_sign_asset_transfer_form`;
DELIMITER ;;
CREATE PROCEDURE `sp_sign_asset_transfer_form`(
  IN p_form_id CHAR(36),
  IN p_signed_by CHAR(36),
  IN p_signed_digital_signature TEXT
)
BEGIN
  UPDATE asset_transfer_forms
  SET signed_at = NOW(),
      signed_by = p_signed_by,
      signed_digital_signature = p_signed_digital_signature,
      updated_at = NOW()
  WHERE formID = p_form_id AND deleted_at IS NULL;
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;

-- 7. Stored procedure: sp_get_asset_transfer_forms_by_user
DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_forms_by_user`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_transfer_forms_by_user`(IN p_user_id CHAR(36))
BEGIN
  SELECT
    atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id,
    atf.location_room_id, atf.new_assigned_user_id, atf.created_by, atf.created_at,
    atf.signed_at, atf.signed_by, atf.signed_digital_signature,
    DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
    atf.process_digital_signature, atf.transfer_type, atf.received_by
  FROM asset_transfer_forms atf
  WHERE atf.user_id = p_user_id AND atf.deleted_at IS NULL
  ORDER BY atf.created_at DESC;
END ;;
DELIMITER ;

-- 8. Stored procedure: sp_get_asset_transfer_form_by_id
DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_form_by_id`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_transfer_form_by_id`(IN p_form_id CHAR(36))
BEGIN
  SELECT
    atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id,
    atf.location_room_id, atf.new_assigned_user_id, atf.created_by, atf.created_at,
    atf.signed_at, atf.signed_by, atf.signed_digital_signature,
    DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
    atf.process_digital_signature, atf.transfer_type, atf.received_by
  FROM asset_transfer_forms atf
  WHERE atf.formID = p_form_id AND atf.deleted_at IS NULL
  LIMIT 1;
END ;;
DELIMITER ;

-- 9. Stored procedure: sp_get_asset_transfer_form_settings
DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_form_settings`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_transfer_form_settings`(IN p_company_id CHAR(36))
BEGIN
  SELECT id, company_id, company_format, department_format,
    it_asset_transfer_code, admin_asset_transfer_code,
    include_date, date_format, created_at, updated_at
  FROM asset_transfer_form_settings
  WHERE company_id = p_company_id AND deleted_at IS NULL
  LIMIT 1;
END ;;
DELIMITER ;

-- 10. Stored procedure: sp_upsert_asset_transfer_form_settings
DROP PROCEDURE IF EXISTS `sp_upsert_asset_transfer_form_settings`;
DELIMITER ;;
CREATE PROCEDURE `sp_upsert_asset_transfer_form_settings`(
  IN p_company_id CHAR(36),
  IN p_company_format VARCHAR(20),
  IN p_department_format VARCHAR(20),
  IN p_it_asset_transfer_code VARCHAR(50),
  IN p_admin_asset_transfer_code VARCHAR(50),
  IN p_include_date TINYINT,
  IN p_date_format VARCHAR(20),
  IN p_updated_by CHAR(36)
)
BEGIN
  DECLARE v_id CHAR(36);

  SELECT id INTO v_id FROM asset_transfer_form_settings
  WHERE company_id = p_company_id AND deleted_at IS NULL LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE asset_transfer_form_settings SET
      company_format = p_company_format,
      department_format = p_department_format,
      it_asset_transfer_code = NULLIF(p_it_asset_transfer_code, ''),
      admin_asset_transfer_code = NULLIF(p_admin_asset_transfer_code, ''),
      include_date = p_include_date,
      date_format = p_date_format,
      updated_by = p_updated_by,
      updated_at = NOW()
    WHERE id = v_id;
  ELSE
    INSERT INTO asset_transfer_form_settings (
      company_id, company_format, department_format,
      it_asset_transfer_code, admin_asset_transfer_code,
      include_date, date_format, created_by, updated_by
    ) VALUES (
      p_company_id, p_company_format, p_department_format,
      NULLIF(p_it_asset_transfer_code, ''), NULLIF(p_admin_asset_transfer_code, ''),
      p_include_date, p_date_format, p_updated_by, p_updated_by
    );
  END IF;
END ;;
DELIMITER ;
