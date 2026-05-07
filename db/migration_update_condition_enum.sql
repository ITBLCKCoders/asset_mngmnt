-- Update condition ENUM to include all UI values and old values for backward compatibility
-- This fixes the "Data truncated for column 'condition' at row 1" error
ALTER TABLE assets MODIFY COLUMN `condition` ENUM('New','Excellent','Good','Fair','Poor','Bad','Needs Repair','Obsolete','Damaged') DEFAULT NULL;

-- Note: Stored procedures (sp_create_asset, sp_update_asset) need to be updated separately
-- Run the following commands using MySQL command-line client to update them:
-- mysql -u your_user -p your_database < migration_update_condition_enum_stored_procedures.sql
