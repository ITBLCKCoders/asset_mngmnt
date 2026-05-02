-- Migration to remove pdf_file_path field from asset_returns table
-- This field is no longer needed for the current implementation

-- Remove the pdf_file_path column and its foreign key constraint
ALTER TABLE `asset_returns` 
DROP COLUMN `pdf_file_path`;

-- Verify the table structure after removal
DESCRIBE `asset_returns`;

-- Show the updated table structure
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    COLUMN_DEFAULT,
    EXTRA
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'asset_mngmnt' 
  AND TABLE_NAME = 'asset_returns'
ORDER BY ORDINAL_POSITION;