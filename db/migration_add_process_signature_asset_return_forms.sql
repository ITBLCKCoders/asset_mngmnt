-- Migration: add process_signed_at and process_digital_signature to asset_return_forms
-- For IT staff / process user signature when processing the return.
-- Run this on your asset_mngmnt database.

ALTER TABLE asset_return_forms
  ADD COLUMN process_signed_at DATETIME DEFAULT NULL AFTER signed_by,
  ADD COLUMN process_digital_signature LONGTEXT DEFAULT NULL AFTER process_signed_at;
