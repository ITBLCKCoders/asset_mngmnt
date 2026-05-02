-- Migration: Staff (processor) decline with reason + snapshot of processor job title on process
-- Run after migration_transfer_hold_and_decline.sql (or any migration that has asset_return_forms.declined_at)

ALTER TABLE asset_return_forms ADD COLUMN processor_declined_at DATETIME DEFAULT NULL;
ALTER TABLE asset_return_forms ADD COLUMN processor_declined_by CHAR(36) DEFAULT NULL;
ALTER TABLE asset_return_forms ADD COLUMN processor_decline_reason TEXT DEFAULT NULL;
ALTER TABLE asset_return_forms ADD COLUMN process_user_position VARCHAR(255) DEFAULT NULL;

ALTER TABLE asset_return_forms ADD KEY idx_arf_processor_declined_by (processor_declined_by);
ALTER TABLE asset_return_forms ADD CONSTRAINT fk_arf_processor_declined_by
  FOREIGN KEY (processor_declined_by) REFERENCES users (userID) ON DELETE SET NULL ON UPDATE CASCADE;
