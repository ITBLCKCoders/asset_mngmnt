-- Add is_parent column to asset_builder_items table
-- This column designates which asset in a builder is the parent asset
-- Only one asset per builder should have is_parent = true

ALTER TABLE asset_builder_items
ADD COLUMN is_parent TINYINT(1) DEFAULT 0 NOT NULL
AFTER asset_id;

-- Add index for performance
CREATE INDEX idx_is_parent ON asset_builder_items(is_parent);
