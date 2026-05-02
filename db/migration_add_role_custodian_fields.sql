-- Migration: add custodian/approver fields to asset_mngmnt_roles
-- For role-based permission templates (Add/Edit, Assignment, Return, HR Receiver, Manager Approvers).
-- Run this on your asset_mngmnt database.

ALTER TABLE asset_mngmnt_roles
  ADD COLUMN asset_type VARCHAR(20) DEFAULT NULL COMMENT 'it | admin' AFTER description,
  ADD COLUMN manager_role VARCHAR(30) DEFAULT NULL COMMENT 'none | itManager | adminManager | overallManager' AFTER asset_type,
  ADD COLUMN access_add_edit TINYINT NOT NULL DEFAULT 0 AFTER manager_role,
  ADD COLUMN access_assignment TINYINT NOT NULL DEFAULT 0 AFTER access_add_edit,
  ADD COLUMN access_return TINYINT NOT NULL DEFAULT 0 AFTER access_assignment,
  ADD COLUMN hr_accountability_receiver TINYINT NOT NULL DEFAULT 0 AFTER access_return,
  ADD COLUMN manager_approver_1 TINYINT NOT NULL DEFAULT 0 AFTER hr_accountability_receiver,
  ADD COLUMN manager_approver_2 TINYINT NOT NULL DEFAULT 0 AFTER manager_approver_1,
  ADD COLUMN manager_approver_3 TINYINT NOT NULL DEFAULT 0 AFTER manager_approver_2;
 