-- Department head (Manager Approver 1) signature on asset checklists
-- Run on asset_mngmnt database.

ALTER TABLE asset_checklists
  ADD COLUMN dept_head_signed_at TIMESTAMP NULL DEFAULT NULL AFTER employee_digital_signature,
  ADD COLUMN dept_head_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER dept_head_signed_at,
  ADD COLUMN dept_head_digital_signature TEXT NULL DEFAULT NULL AFTER dept_head_signed_by,
  ADD CONSTRAINT fk_asset_checklists_dept_head_signed_by FOREIGN KEY (dept_head_signed_by) REFERENCES users (userID) ON DELETE SET NULL;
