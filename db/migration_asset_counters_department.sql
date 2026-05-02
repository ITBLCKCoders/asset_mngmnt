-- Migration to update asset_counters table to support department-based sequencing

USE `asset_mngmnt`;

-- 1. Drop existing primary key
ALTER TABLE asset_counters DROP PRIMARY KEY;

-- 2. Add department_id column
ALTER TABLE asset_counters ADD COLUMN department_id CHAR(36) NULL;

-- 3. Create composite primary key on company_id and department_id
ALTER TABLE asset_counters ADD PRIMARY KEY (company_id, department_id);

-- 4. Add foreign key constraint for department_id
ALTER TABLE asset_counters ADD CONSTRAINT asset_counters_ibfk_2 
FOREIGN KEY (department_id) REFERENCES asset_mngmnt_departments(departmentID) 
ON DELETE SET NULL;

-- 5. Move existing data to new structure
-- For existing counters without department_id, we'll keep them as NULL (company-wide)
-- This ensures backward compatibility

-- Verify the changes
SELECT * FROM asset_counters;

-- Check table structure
DESCRIBE asset_counters;
