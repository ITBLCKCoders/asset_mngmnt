-- Migration: Transfer hold flow and decline
-- Adds return_form_id link, declined_at/declined_by on transfer and return forms.
-- Run after migration_transfer_form_assignments_and_executed_at.sql

-- 1. Link return form to transfer form (for hold flow: both created together)
ALTER TABLE asset_transfer_forms ADD COLUMN return_form_id CHAR(36) DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD KEY idx_atf_return_form_id (return_form_id);
ALTER TABLE asset_transfer_forms ADD CONSTRAINT fk_atf_return_form_id
  FOREIGN KEY (return_form_id) REFERENCES asset_return_forms (formID) ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Decline state on transfer forms
ALTER TABLE asset_transfer_forms ADD COLUMN declined_at DATETIME DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN declined_by CHAR(36) DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD KEY idx_atf_declined_by (declined_by);
ALTER TABLE asset_transfer_forms ADD CONSTRAINT fk_atf_declined_by FOREIGN KEY (declined_by) REFERENCES users (userID) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Decline state on return forms
ALTER TABLE asset_return_forms ADD COLUMN declined_at DATETIME DEFAULT NULL;
ALTER TABLE asset_return_forms ADD COLUMN declined_by CHAR(36) DEFAULT NULL;
ALTER TABLE asset_return_forms ADD KEY idx_arf_declined_by (declined_by);
ALTER TABLE asset_return_forms ADD CONSTRAINT fk_arf_declined_by FOREIGN KEY (declined_by) REFERENCES users (userID) ON DELETE SET NULL ON UPDATE CASCADE;
