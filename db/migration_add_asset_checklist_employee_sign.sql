-- Employee signature on asset checklists (profile documents / checklist sign flow)
-- Run on asset_mngmnt database.

ALTER TABLE asset_checklists
  ADD COLUMN employee_signed_at TIMESTAMP NULL DEFAULT NULL AFTER created_by,
  ADD COLUMN employee_digital_signature TEXT NULL DEFAULT NULL AFTER employee_signed_at;
