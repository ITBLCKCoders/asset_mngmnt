-- Simple one-step migration: add dept_head columns to asset_return_forms.
-- Use this if the idempotent migration_add_dept_head_signature_asset_return_forms.sql fails.
-- Run ONCE on your asset_mngmnt database.
--
-- "Duplicate column name 'dept_head_signed_at'" = migration already applied. Do nothing; try approving again.

ALTER TABLE asset_return_forms
  ADD COLUMN dept_head_signed_at DATETIME DEFAULT NULL AFTER received_by,
  ADD COLUMN dept_head_digital_signature LONGTEXT DEFAULT NULL AFTER dept_head_signed_at,
  ADD COLUMN dept_head_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER dept_head_digital_signature;

ALTER TABLE asset_return_forms
  ADD CONSTRAINT fk_asset_return_forms_dept_head_signed_by
  FOREIGN KEY (dept_head_signed_by) REFERENCES users (userID) ON DELETE SET NULL;
