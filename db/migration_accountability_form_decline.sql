-- Extend accountability form lifecycle for assignee decline (profile documents).
-- Run against the application database.

ALTER TABLE `accountability_forms`
  MODIFY COLUMN `status` ENUM(
    'Pending',
    'Signed',
    'Completed',
    'Revoked',
    'Disabled',
    'Declined'
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending';

ALTER TABLE `accountability_forms`
  ADD COLUMN `decline_reason` TEXT NULL
  AFTER `status`;
