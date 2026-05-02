-- Migration to make pdf_file_path nullable in asset_returns table
-- This allows asset returns to be created without PDF file paths

-- Disable safe update mode for this session
SET SQL_SAFE_UPDATES = 0;

-- Make pdf_file_path column nullable
ALTER TABLE asset_returns 
MODIFY COLUMN pdf_file_path VARCHAR(500) NULL;

-- Update any existing records that might have empty strings to NULL
UPDATE asset_returns 
SET pdf_file_path = NULL 
WHERE pdf_file_path = '';

-- Add comment to document the change
ALTER TABLE asset_returns 
CHANGE COLUMN pdf_file_path pdf_file_path VARCHAR(500) NULL COMMENT 'Path to PDF file (optional - for legacy compatibility)';

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;
