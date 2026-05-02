-- Migration: add it_manager_signed_at, it_manager_digital_signature, it_manager_signed_by to asset_return_forms
-- For IT Manager / IT Department Head approval signature (fourth signature on return form).
-- Run this on your asset_mngmnt database.

ALTER TABLE asset_return_forms
  ADD COLUMN it_manager_signed_at DATETIME DEFAULT NULL AFTER dept_head_signed_by,
  ADD COLUMN it_manager_digital_signature LONGTEXT DEFAULT NULL AFTER it_manager_signed_at,
  ADD COLUMN it_manager_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER it_manager_digital_signature,
  ADD CONSTRAINT fk_asset_return_forms_it_manager_signed_by FOREIGN KEY (it_manager_signed_by) REFERENCES users (userID) ON DELETE SET NULL;
