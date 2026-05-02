-- Migration: Add dept_head and it_manager approval columns to asset_transfer_forms
-- Same approval flow as asset_return_forms: Dept Head approves, then IT Manager receives.
-- Run after migration_create_asset_transfer_forms.sql
-- Run each ALTER separately; skip if columns already exist.

ALTER TABLE asset_transfer_forms ADD COLUMN dept_head_signed_at DATETIME DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN dept_head_digital_signature TEXT DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN dept_head_signed_by CHAR(36) DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN it_manager_signed_at DATETIME DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN it_manager_digital_signature TEXT DEFAULT NULL;
ALTER TABLE asset_transfer_forms ADD COLUMN it_manager_signed_by CHAR(36) DEFAULT NULL;
