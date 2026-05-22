-- IT Manager / Manager Approver 2 signature on asset checklists (after dept head approval)

-- Run on asset_mngmnt database.



ALTER TABLE asset_checklists

  ADD COLUMN it_manager_signed_at TIMESTAMP NULL DEFAULT NULL AFTER dept_head_digital_signature,

  ADD COLUMN it_manager_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER it_manager_signed_at,

  ADD COLUMN it_manager_digital_signature TEXT NULL DEFAULT NULL AFTER it_manager_signed_by,

  ADD CONSTRAINT fk_asset_checklists_it_manager_signed_by FOREIGN KEY (it_manager_signed_by) REFERENCES users (userID) ON DELETE SET NULL;


