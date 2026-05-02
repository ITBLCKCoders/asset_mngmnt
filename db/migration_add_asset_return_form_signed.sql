-- Migration: add signed_at and signed_by to asset_return_forms for Sign Form
-- Run this on your asset_mngmnt database.

ALTER TABLE asset_return_forms
  ADD COLUMN signed_at DATETIME DEFAULT NULL AFTER updated_at,
  ADD COLUMN signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER signed_at,
  ADD CONSTRAINT fk_asset_return_forms_signed_by FOREIGN KEY (signed_by) REFERENCES users (userID) ON DELETE SET NULL;
