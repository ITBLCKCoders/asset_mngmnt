-- Add executed_at to asset_transfer_forms (required for return form approval when a linked transfer exists).
-- If you get "Duplicate column name", the column already exists — you're done.
-- Full migration (assignments table + this column): migration_transfer_form_assignments_and_executed_at.sql

ALTER TABLE asset_transfer_forms ADD COLUMN executed_at DATETIME DEFAULT NULL;
