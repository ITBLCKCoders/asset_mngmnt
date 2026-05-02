-- Migration to separate assets data from acknowledgments in accountability_forms table
-- This will prevent asset information from being overwritten when forms are signed

USE `asset_mngmnt`;

-- Add new column for assets data
ALTER TABLE accountability_forms 
ADD COLUMN assets_data JSON DEFAULT NULL AFTER acknowledgments;

-- Copy existing asset data from acknowledgments column to the new assets_data column
-- Only for records that have assets in their acknowledgments (builder forms)
UPDATE accountability_forms 
SET assets_data = JSON_EXTRACT(acknowledgments, '$.assets')
WHERE acknowledgments IS NOT NULL 
AND JSON_EXTRACT(acknowledgments, '$.assets') IS NOT NULL;

-- Add comment to document the new structure
ALTER TABLE accountability_forms 
MODIFY COLUMN acknowledgments JSON DEFAULT NULL COMMENT 'Contains signature and other acknowledgment data (NOT assets)',
MODIFY COLUMN assets_data JSON DEFAULT NULL COMMENT 'Contains asset information for accountability forms';

-- Create index for better performance
CREATE INDEX idx_accountability_forms_assets_data ON accountability_forms (assets_data);

-- Verification query to check the migration
SELECT 
    formID,
    form_number,
    status,
    CASE 
        WHEN assets_data IS NOT NULL THEN 'Has assets data'
        ELSE 'No assets data'
    END as assets_status,
    CASE 
        WHEN acknowledgments IS NOT NULL THEN 'Has acknowledgments'
        ELSE 'No acknowledgments'
    END as acknowledgments_status
FROM accountability_forms 
ORDER BY created_at DESC 
LIMIT 10;