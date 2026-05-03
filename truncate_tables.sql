-- Script to truncate asset assignment, asset builder, accountability forms, asset builder items, and asset counters tables
-- and update asset status to available
-- Run this script in your MySQL database for the asset_mngmnt schema

USE asset_mngmnt;

-- Disable foreign key checks to allow truncation
SET FOREIGN_KEY_CHECKS = 0;

-- Truncate tables (order matters due to foreign key constraints)
TRUNCATE TABLE accountability_forms;
TRUNCATE TABLE asset_builder_items;
TRUNCATE TABLE asset_assignments;
TRUNCATE TABLE asset_builders;

TRUNCATE TABLE audit_logs;
TRUNCATE TABLE asset_returns;
TRUNCATE TABLE asset_counters;  
TRUNCATE TABLE asset_return_forms;


-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Update all asset statuses to Available
UPDATE assets SET status = 'Available' WHERE status IN ('Assigned', 'In Use');

-- Update all asset builder statuses to Available
UPDATE asset_builders SET status = 'Available' WHERE status = 'Assigned';

-- Optional: Reset auto-increment counters if needed
ALTER TABLE accountability_forms AUTO_INCREMENT = 1;
ALTER TABLE asset_builder_items AUTO_INCREMENT = 1;
ALTER TABLE asset_assignments AUTO_INCREMENT = 1;
ALTER TABLE asset_builders AUTO_INCREMENT = 1;


