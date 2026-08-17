-- Migration: transfer_form_intangible_assets table
-- Persist intangible assets selected for a transfer on the transfer form itself
-- so both the employee-request and processor-initiated flows can render them in
-- the execution dialog and the transfer form PDF, and execute them with the form.
-- Mirrors the existing transfer_form_assignments pattern.
-- Run after migration_transfer_form_assignments_and_executed_at.sql.

CREATE TABLE IF NOT EXISTS transfer_form_intangible_assets (
  form_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  intangible_asset_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (form_id, intangible_asset_id),
  KEY idx_tfia_form_id (form_id),
  KEY idx_tfia_intangible_asset_id (intangible_asset_id),
  CONSTRAINT fk_tfia_form_id FOREIGN KEY (form_id) REFERENCES asset_transfer_forms (formID) ON DELETE CASCADE,
  CONSTRAINT fk_tfia_intangible_asset_id FOREIGN KEY (intangible_asset_id) REFERENCES intangible_assets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;