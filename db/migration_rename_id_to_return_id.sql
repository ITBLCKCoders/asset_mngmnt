-- Migration to rename 'id' column to 'return_id' in asset_returns table
-- This ensures the database schema matches the model interface

-- First, add the new return_id column with UUID format
ALTER TABLE asset_returns ADD COLUMN return_id VARCHAR(36) NOT NULL AFTER id;

-- Copy data from id column to return_id column
UPDATE asset_returns SET return_id = id;

-- Drop the old id column
ALTER TABLE asset_returns DROP COLUMN id;

-- Set return_id as the primary key
ALTER TABLE asset_returns ADD PRIMARY KEY (return_id);

-- Update foreign key constraints if needed (though there shouldn't be any referencing asset_returns.id)
-- The foreign keys in other tables should reference return_id now

-- Verify the changes
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'asset_mngmnt' AND TABLE_NAME = 'asset_returns' 
ORDER BY ORDINAL_POSITION;

-- Show table structure
DESCRIBE asset_returns;
