-- Migration: unified accountability clearance 4-step approval (owner approver -> IT Asset -> Admin Asset -> HR Receiver)
-- Extends approval_status ENUM and adds per-stage signer columns for clearance forms.

SET @af_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
);

-- Expand approval_status ENUM to include clearance stages
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1 AS skip_no_table',
  'ALTER TABLE `accountability_forms` MODIFY COLUMN `approval_status` ENUM(''pending_admin_copy_signature'',''pending_approval'',''pending_it'',''pending_admin'',''pending_hr'',''approved'') NOT NULL DEFAULT ''approved'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- clearance stage signer columns (nullable, only used when form_origin=''clearance'' and scope=''Unified'')
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms' AND COLUMN_NAME = 'clearance_it_signer_id') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `clearance_it_signer_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `approval_notes`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms' AND COLUMN_NAME = 'clearance_it_signature') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `clearance_it_signature` MEDIUMTEXT DEFAULT NULL AFTER `clearance_it_signer_id`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms' AND COLUMN_NAME = 'clearance_it_signed_at') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `clearance_it_signed_at` DATETIME DEFAULT NULL AFTER `clearance_it_signature`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms' AND COLUMN_NAME = 'clearance_admin_signer_id') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `clearance_admin_signer_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `clearance_it_signed_at`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms' AND COLUMN_NAME = 'clearance_admin_signature') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `clearance_admin_signature` MEDIUMTEXT DEFAULT NULL AFTER `clearance_admin_signer_id`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms' AND COLUMN_NAME = 'clearance_admin_signed_at') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `clearance_admin_signed_at` DATETIME DEFAULT NULL AFTER `clearance_admin_signature`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms' AND COLUMN_NAME = 'clearance_hr_signer_id') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `clearance_hr_signer_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `clearance_admin_signed_at`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms' AND COLUMN_NAME = 'clearance_hr_signature') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `clearance_hr_signature` MEDIUMTEXT DEFAULT NULL AFTER `clearance_hr_signer_id`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms' AND COLUMN_NAME = 'clearance_hr_signed_at') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `clearance_hr_signed_at` DATETIME DEFAULT NULL AFTER `clearance_hr_signature`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Index for clearance stage queries
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms' AND INDEX_NAME = 'idx_accountability_forms_clearance_stage') = 0,
    'ALTER TABLE `accountability_forms` ADD KEY `idx_accountability_forms_clearance_stage` (`approval_status`, `clearance_it_signer_id`, `clearance_admin_signer_id`, `clearance_hr_signer_id`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
