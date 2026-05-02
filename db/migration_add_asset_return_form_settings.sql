-- Migration: create asset_return_form_settings table for configurable return form numbering.
-- Run this on your asset_mngmnt database.

CREATE TABLE IF NOT EXISTS asset_return_form_settings (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  company_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  company_format ENUM('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'code',
  department_format ENUM('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  it_asset_return_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  admin_asset_return_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  include_date TINYINT NOT NULL DEFAULT 1,
  date_format ENUM('MMYYYY','YYYYMMDD') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MMYYYY',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (id),
  KEY company_id (company_id),
  KEY created_by (created_by),
  KEY updated_by (updated_by),
  KEY deleted_by (deleted_by),
  CONSTRAINT asset_return_form_settings_company_fk FOREIGN KEY (company_id) REFERENCES companies (companyID) ON DELETE CASCADE,
  CONSTRAINT asset_return_form_settings_created_by_fk FOREIGN KEY (created_by) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT asset_return_form_settings_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT asset_return_form_settings_deleted_by_fk FOREIGN KEY (deleted_by) REFERENCES users (userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
