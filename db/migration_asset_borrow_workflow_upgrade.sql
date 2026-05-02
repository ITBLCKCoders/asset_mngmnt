-- Borrow workflow upgrade fields (processor decline, wet pdf, return processing, reminder markers)
SET @tbl := 'asset_borrow_requests';

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'processor_remarks'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN processor_remarks text NULL AFTER pre_usage_condition'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'processor_declined_at'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN processor_declined_at datetime NULL AFTER declined_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'processor_decline_reason'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN processor_decline_reason text NULL AFTER processor_declined_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'processor_wet_borrow_pdf_url'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN processor_wet_borrow_pdf_url varchar(1024) NULL AFTER processor_decline_reason'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'returned_at'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN returned_at datetime NULL AFTER approved_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'return_condition'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN return_condition varchar(50) NULL AFTER returned_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'return_remarks'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN return_remarks text NULL AFTER return_condition'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'return_condition_images'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN return_condition_images json NULL AFTER return_remarks'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'due_5m_notified_at'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN due_5m_notified_at datetime NULL AFTER return_condition_images'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'due_notified_at'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN due_notified_at datetime NULL AFTER due_5m_notified_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'pre_usage_condition_images'),
  'SELECT 1',
  'ALTER TABLE asset_borrow_requests ADD COLUMN pre_usage_condition_images json NULL AFTER processor_remarks'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
