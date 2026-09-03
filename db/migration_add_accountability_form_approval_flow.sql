-- Migration: add accountability form approval flow + IT/Admin copy signer selection
-- Adds columns to support a two-step approval flow:
--   1. IT/Admin copy signature by a designated approver/sub-approver
--   2. Final approval by the asset owner's designated approver/sub-approver
--
-- Existing forms are backfilled to 'approved' status so they keep flowing
-- to the user without going through the new approval step.

SET @af_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
);

-- approval_status
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1 AS skip_no_table',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'approval_status') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `approval_status` ENUM(''pending_admin_copy_signature'',''pending_approval'',''approved'') NOT NULL DEFAULT ''approved'' AFTER `status`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- admin_copy_signer_id
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'admin_copy_signer_id') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `admin_copy_signer_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `approval_status`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- admin_copy_copy_type
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'admin_copy_copy_type') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `admin_copy_copy_type` ENUM(''IT'',''Admin'') DEFAULT NULL AFTER `admin_copy_signer_id`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- admin_copy_signature
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'admin_copy_signature') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `admin_copy_signature` MEDIUMTEXT DEFAULT NULL AFTER `admin_copy_copy_type`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- admin_copy_signed_at
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'admin_copy_signed_at') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `admin_copy_signed_at` DATETIME DEFAULT NULL AFTER `admin_copy_signature`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- approved_by
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'approved_by') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `approved_by` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `admin_copy_signed_at`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- approved_at
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'approved_at') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `approved_at` DATETIME DEFAULT NULL AFTER `approved_by`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- approval_notes
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND COLUMN_NAME = 'approval_notes') = 0,
    'ALTER TABLE `accountability_forms` ADD COLUMN `approval_notes` TEXT DEFAULT NULL AFTER `approved_at`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Indexes
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND INDEX_NAME = 'idx_accountability_forms_approval_status') = 0,
    'ALTER TABLE `accountability_forms` ADD KEY `idx_accountability_forms_approval_status` (`approval_status`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @af_exists = 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accountability_forms'
       AND INDEX_NAME = 'idx_accountability_forms_admin_copy_signer') = 0,
    'ALTER TABLE `accountability_forms` ADD KEY `idx_accountability_forms_admin_copy_signer` (`admin_copy_signer_id`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill: existing forms are treated as auto-approved so the legacy flow
-- keeps working without forcing them through the new approval steps.
SET @sql := IF(
  @af_exists = 0,
  'SELECT 1 AS skip_no_table',
  'UPDATE `accountability_forms`
   SET `approval_status` = ''approved''
   WHERE `deleted_at` IS NULL
     AND (`approval_status` IS NULL OR `approval_status` = '''')'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
