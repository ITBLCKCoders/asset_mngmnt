-- Shared numbering settings for intangible deactivation and accountability clearance forms.
ALTER TABLE accountability_form_settings
  ADD COLUMN deactivation_form_code VARCHAR(50) NULL AFTER admin_asset_code,
  ADD COLUMN deactivation_department_format ENUM('code','prefix','none') NOT NULL DEFAULT 'code' AFTER deactivation_form_code,
  ADD COLUMN deactivation_include_date TINYINT NOT NULL DEFAULT 1 AFTER deactivation_department_format,
  ADD COLUMN deactivation_date_format ENUM('MMYYYY','YYYYMMDD') NOT NULL DEFAULT 'MMYYYY' AFTER deactivation_include_date,
  ADD COLUMN clearance_form_code VARCHAR(50) NULL AFTER deactivation_date_format,
  ADD COLUMN clearance_department_format ENUM('code','prefix','none') NOT NULL DEFAULT 'code' AFTER clearance_form_code,
  ADD COLUMN clearance_include_date TINYINT NOT NULL DEFAULT 1 AFTER clearance_department_format,
  ADD COLUMN clearance_date_format ENUM('MMYYYY','YYYYMMDD') NOT NULL DEFAULT 'MMYYYY' AFTER clearance_include_date;
