-- Backfill dedicated settings tables after the shared settings migration.
-- Safe to run after the previous migration: existing shared columns are retained.

CREATE TABLE IF NOT EXISTS intangible_deactivation_form_settings (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  company_format ENUM('code','prefix','none') NOT NULL DEFAULT 'code',
  department_format ENUM('code','prefix','none') NOT NULL DEFAULT 'code',
  form_code VARCHAR(50) NOT NULL DEFAULT 'IDF',
  include_date TINYINT NOT NULL DEFAULT 1,
  date_format ENUM('MMYYYY','YYYYMMDD') NOT NULL DEFAULT 'MMYYYY',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by CHAR(36) NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by CHAR(36) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_intangible_deactivation_settings_company (company_id),
  CONSTRAINT intangible_deactivation_settings_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (companyID) ON DELETE CASCADE,
  CONSTRAINT intangible_deactivation_settings_created_by_fk
    FOREIGN KEY (created_by) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT intangible_deactivation_settings_updated_by_fk
    FOREIGN KEY (updated_by) REFERENCES users (userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accountability_clearance_form_settings (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  company_format ENUM('code','prefix','none') NOT NULL DEFAULT 'code',
  department_format ENUM('code','prefix','none') NOT NULL DEFAULT 'code',
  form_code VARCHAR(50) NOT NULL DEFAULT 'CLR',
  include_date TINYINT NOT NULL DEFAULT 1,
  date_format ENUM('MMYYYY','YYYYMMDD') NOT NULL DEFAULT 'MMYYYY',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by CHAR(36) NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by CHAR(36) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accountability_clearance_settings_company (company_id),
  CONSTRAINT accountability_clearance_settings_company_fk
    FOREIGN KEY (company_id) REFERENCES companies (companyID) ON DELETE CASCADE,
  CONSTRAINT accountability_clearance_settings_created_by_fk
    FOREIGN KEY (created_by) REFERENCES users (userID) ON DELETE SET NULL,
  CONSTRAINT accountability_clearance_settings_updated_by_fk
    FOREIGN KEY (updated_by) REFERENCES users (userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO intangible_deactivation_form_settings
  (company_id, company_format, department_format, form_code, include_date, date_format)
SELECT
  c.companyID,
  COALESCE(s.company_format, 'code'),
  COALESCE(s.deactivation_department_format, 'code'),
  COALESCE(NULLIF(s.deactivation_form_code, ''), 'IDF'),
  COALESCE(s.deactivation_include_date, 1),
  COALESCE(s.deactivation_date_format, 'MMYYYY')
FROM companies c
LEFT JOIN accountability_form_settings s
  ON s.company_id = c.companyID AND s.deleted_at IS NULL
LEFT JOIN intangible_deactivation_form_settings d
  ON d.company_id = c.companyID
WHERE c.deleted_at IS NULL AND d.id IS NULL;

INSERT INTO accountability_clearance_form_settings
  (company_id, company_format, department_format, form_code, include_date, date_format)
SELECT
  c.companyID,
  COALESCE(s.company_format, 'code'),
  COALESCE(s.clearance_department_format, 'code'),
  COALESCE(NULLIF(s.clearance_form_code, ''), 'CLR'),
  COALESCE(s.clearance_include_date, 1),
  COALESCE(s.clearance_date_format, 'MMYYYY')
FROM companies c
LEFT JOIN accountability_form_settings s
  ON s.company_id = c.companyID AND s.deleted_at IS NULL
LEFT JOIN accountability_clearance_form_settings cl
  ON cl.company_id = c.companyID
WHERE c.deleted_at IS NULL AND cl.id IS NULL;
