-- Migration: add sub_approver_1 and sub_approver_2 signature columns to form tables.
-- Sub Approver 1 = stand-in for Manager Approver 1 (requestor's dept head/manager).
-- Sub Approver 2 = stand-in for Manager Approver 2 (IT/Admin dept head/manager receive step).
--
-- asset_borrow_requests only gets sub_approver_1 (borrow dept-head approval step; no IT/Admin manager receive step).
-- Run this against your asset_mngmnt MySQL database.

-- 1. asset_transfer_forms
ALTER TABLE asset_transfer_forms
  ADD COLUMN sub_approver_1_signed_at DATETIME DEFAULT NULL,
  ADD COLUMN sub_approver_1_digital_signature LONGTEXT DEFAULT NULL,
  ADD COLUMN sub_approver_1_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN sub_approver_2_signed_at DATETIME DEFAULT NULL,
  ADD COLUMN sub_approver_2_digital_signature LONGTEXT DEFAULT NULL,
  ADD COLUMN sub_approver_2_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD CONSTRAINT fk_asset_transfer_forms_sub_approver_1_signed_by FOREIGN KEY (sub_approver_1_signed_by) REFERENCES users (userID) ON DELETE SET NULL,
  ADD CONSTRAINT fk_asset_transfer_forms_sub_approver_2_signed_by FOREIGN KEY (sub_approver_2_signed_by) REFERENCES users (userID) ON DELETE SET NULL;

-- 2. asset_return_forms
ALTER TABLE asset_return_forms
  ADD COLUMN sub_approver_1_signed_at DATETIME DEFAULT NULL,
  ADD COLUMN sub_approver_1_digital_signature LONGTEXT DEFAULT NULL,
  ADD COLUMN sub_approver_1_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN sub_approver_2_signed_at DATETIME DEFAULT NULL,
  ADD COLUMN sub_approver_2_digital_signature LONGTEXT DEFAULT NULL,
  ADD COLUMN sub_approver_2_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD CONSTRAINT fk_asset_return_forms_sub_approver_1_signed_by FOREIGN KEY (sub_approver_1_signed_by) REFERENCES users (userID) ON DELETE SET NULL,
  ADD CONSTRAINT fk_asset_return_forms_sub_approver_2_signed_by FOREIGN KEY (sub_approver_2_signed_by) REFERENCES users (userID) ON DELETE SET NULL;

-- 3. asset_checklists
ALTER TABLE asset_checklists
  ADD COLUMN sub_approver_1_signed_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN sub_approver_1_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN sub_approver_1_digital_signature TEXT NULL DEFAULT NULL,
  ADD COLUMN sub_approver_2_signed_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN sub_approver_2_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN sub_approver_2_digital_signature TEXT NULL DEFAULT NULL,
  ADD CONSTRAINT fk_asset_checklists_sub_approver_1_signed_by FOREIGN KEY (sub_approver_1_signed_by) REFERENCES users (userID) ON DELETE SET NULL,
  ADD CONSTRAINT fk_asset_checklists_sub_approver_2_signed_by FOREIGN KEY (sub_approver_2_signed_by) REFERENCES users (userID) ON DELETE SET NULL;

-- 4. asset_borrow_requests (sub_approver_1 only)
ALTER TABLE asset_borrow_requests
  ADD COLUMN sub_approver_1_signed_at DATETIME DEFAULT NULL,
  ADD COLUMN sub_approver_1_digital_signature TEXT NULL DEFAULT NULL,
  ADD COLUMN sub_approver_1_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD CONSTRAINT fk_asset_borrow_requests_sub_approver_1_signed_by FOREIGN KEY (sub_approver_1_signed_by) REFERENCES users (userID) ON DELETE SET NULL;

-- End of migration_add_sub_approver_signatures_all_forms.sql
